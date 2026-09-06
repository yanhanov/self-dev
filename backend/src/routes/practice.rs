use axum::{
    extract::{Path, State},
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::curriculum::bump_user_skill;
use crate::error::{AppError, AppResult};
use crate::state::AppState;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct ChallengeOut {
    pub id: Uuid,
    pub slug: String,
    pub title: String,
    pub prompt: String,
    pub difficulty: i16,
    pub starter_sql: String,
    pub sort_ignore: bool,
    pub hints: Value,
    pub dataset_slug: String,
    pub dataset_title: String,
    pub setup_sql: String,
    pub skill_slug: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct GradeRequest {
    pub submitted_sql: String,
    pub result_rows: Value,
    pub user_mission_id: Option<Uuid>,
}

fn normalize_rows(rows: &Value, sort_ignore: bool) -> Vec<String> {
    let mut items: Vec<String> = match rows {
        Value::Array(arr) => arr
            .iter()
            .map(|v| {
                // Stable stringify of object with sorted keys
                match v {
                    Value::Object(map) => {
                        let mut keys: Vec<_> = map.keys().cloned().collect();
                        keys.sort();
                        let pairs: Vec<String> = keys
                            .into_iter()
                            .map(|k| {
                                let val = &map[&k];
                                let normalized = match val {
                                    Value::Number(n) => {
                                        if let Some(f) = n.as_f64() {
                                            format!("{f:.4}")
                                        } else {
                                            n.to_string()
                                        }
                                    }
                                    other => other.to_string(),
                                };
                                format!("{k}:{normalized}")
                            })
                            .collect();
                        pairs.join("|")
                    }
                    other => other.to_string(),
                }
            })
            .collect(),
        _ => vec![rows.to_string()],
    };
    if sort_ignore {
        items.sort();
    }
    items
}

fn results_match(expected: &Value, actual: &Value, sort_ignore: bool) -> bool {
    normalize_rows(expected, sort_ignore) == normalize_rows(actual, sort_ignore)
}

pub async fn get_challenge(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> AppResult<Json<ChallengeOut>> {
    let row = sqlx::query_as::<_, ChallengeOut>(
        r#"
        SELECT
            c.id, c.slug, c.title, c.prompt, c.difficulty, c.starter_sql,
            c.sort_ignore, c.hints,
            d.slug AS dataset_slug, d.title AS dataset_title, d.setup_sql,
            s.slug AS skill_slug
        FROM practice_challenges c
        JOIN practice_datasets d ON d.id = c.dataset_id
        LEFT JOIN skills s ON s.id = c.skill_id
        WHERE c.slug = $1
        "#,
    )
    .bind(&slug)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;
    Ok(Json(row))
}

pub async fn grade(
    State(state): State<AppState>,
    Path((user_id, challenge_id)): Path<(Uuid, Uuid)>,
    Json(body): Json<GradeRequest>,
) -> AppResult<Json<Value>> {
    let challenge = sqlx::query_as::<_, ChallengeGrade>(
        r#"
        SELECT c.id, c.skill_id, c.expected_result, c.sort_ignore, c.solution_sql, c.title,
               d.setup_sql
        FROM practice_challenges c
        JOIN practice_datasets d ON d.id = c.dataset_id
        WHERE c.id = $1
        "#,
    )
    .bind(challenge_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    let result_rows = execute_sqlite(&challenge.setup_sql, &body.submitted_sql).map_err(|e| {
        AppError::BadRequest(format!("SQL execution error: {e}"))
    })?;

    let is_correct = results_match(
        &challenge.expected_result,
        &result_rows,
        challenge.sort_ignore,
    );

    let feedback = if is_correct {
        format!("Верно! Challenge «{}» пройден.", challenge.title)
    } else {
        let sql_l = body.submitted_sql.to_lowercase();
        let mut hints = Vec::new();
        if !sql_l.contains("join") && challenge.solution_sql.to_lowercase().contains("join") {
            hints.push("Похоже, не хватает JOIN.");
        }
        if challenge.solution_sql.to_lowercase().contains("left join")
            && sql_l.contains("inner join")
        {
            hints.push("Ты используешь INNER JOIN — для этой задачи нужен LEFT JOIN, иначе пропадут строки без совпадений.");
        }
        if challenge.solution_sql.to_lowercase().contains("left join")
            && sql_l.contains("join")
            && !sql_l.contains("left")
        {
            hints.push("Проверь тип JOIN: INNER отбрасывает клиентов без заказов.");
        }
        if !sql_l.contains("group by") && challenge.solution_sql.to_lowercase().contains("group by")
        {
            hints.push("Нужна агрегация с GROUP BY.");
        }
        if !sql_l.contains("paid") && challenge.solution_sql.to_lowercase().contains("paid") {
            hints.push("Не забудь отфильтровать status = 'paid'.");
        }
        if hints.is_empty() {
            hints.push("Результат не совпал с ожидаемым. Проверь фильтры, JOIN и сортировку.");
        }
        hints.join(" ")
    };

    sqlx::query(
        r#"
        INSERT INTO practice_attempts (user_id, challenge_id, submitted_sql, result_rows, is_correct, feedback)
        VALUES ($1, $2, $3, $4, $5, $6)
        "#,
    )
    .bind(user_id)
    .bind(challenge_id)
    .bind(&body.submitted_sql)
    .bind(&result_rows)
    .bind(is_correct)
    .bind(&feedback)
    .execute(&state.pool)
    .await?;

    if let Some(skill_id) = challenge.skill_id {
        if is_correct {
            bump_user_skill(
                &state.pool,
                user_id,
                skill_id,
                5.0,
                "mission",
                json!({"challenge_id": challenge_id, "correct": true}),
            )
            .await
            .map_err(AppError::Other)?;
        } else {
            sqlx::query(
                r#"
                INSERT INTO user_skill_events (user_id, skill_id, event_type, delta, detail)
                VALUES ($1, $2, 'mistake', -2, $3)
                "#,
            )
            .bind(user_id)
            .bind(skill_id)
            .bind(json!({"challenge_id": challenge_id, "feedback": feedback}))
            .execute(&state.pool)
            .await?;
        }
    }

    if let Some(um_id) = body.user_mission_id {
        if is_correct {
            sqlx::query(
                r#"
                UPDATE user_missions
                SET challenge_passed = true, current_phase = 'feedback'
                WHERE id = $1 AND user_id = $2
                "#,
            )
            .bind(um_id)
            .bind(user_id)
            .execute(&state.pool)
            .await?;
        }
    }

    Ok(Json(json!({
        "is_correct": is_correct,
        "feedback": feedback,
        "result_rows": result_rows,
    })))
}

fn execute_sqlite(setup_sql: &str, query: &str) -> anyhow::Result<Value> {
    let conn = rusqlite::Connection::open_in_memory()?;
    conn.execute_batch(setup_sql)?;
    let mut stmt = conn.prepare(query)?;
    let column_names: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();
    let rows = stmt.query_map([], |row| {
        let mut map = serde_json::Map::new();
        for (i, name) in column_names.iter().enumerate() {
            let val: rusqlite::types::Value = row.get(i)?;
            let json_val = match val {
                rusqlite::types::Value::Null => Value::Null,
                rusqlite::types::Value::Integer(i) => json!(i),
                rusqlite::types::Value::Real(f) => json!(f),
                rusqlite::types::Value::Text(s) => json!(s),
                rusqlite::types::Value::Blob(_) => json!("<blob>"),
            };
            map.insert(name.clone(), json_val);
        }
        Ok(Value::Object(map))
    })?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r?);
    }
    Ok(Value::Array(out))
}

#[derive(sqlx::FromRow)]
struct ChallengeGrade {
    id: Uuid,
    skill_id: Option<Uuid>,
    expected_result: Value,
    sort_ignore: bool,
    solution_sql: String,
    title: String,
    setup_sql: String,
}
