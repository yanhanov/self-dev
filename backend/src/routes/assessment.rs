use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use uuid::Uuid;

use crate::curriculum::{self, upsert_user_skill};
use crate::error::{AppError, AppResult};
use crate::jobs::run_course_outline_job;
use crate::state::AppState;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct AssessmentOut {
    pub id: Uuid,
    pub slug: String,
    pub title: String,
    pub description: String,
    pub estimated_minutes: i16,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct AssessmentItemOut {
    pub id: Uuid,
    pub order_index: i32,
    pub item_type: String,
    pub prompt: String,
    pub options: Value,
    pub skill_slug: String,
    pub skill_title: String,
}

#[derive(Debug, Deserialize)]
pub struct StartAssessmentRequest {
    pub assessment_slug: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SubmitAnswer {
    pub item_id: Uuid,
    pub selected_index: Option<i32>,
    pub answer_text: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SubmitAssessmentRequest {
    pub answers: Vec<SubmitAnswer>,
}

pub async fn get_for_profession(
    State(state): State<AppState>,
    Path(profession_slug): Path<String>,
) -> AppResult<Json<Value>> {
    let assessment = sqlx::query_as::<_, AssessmentOut>(
        r#"
        SELECT a.id, a.slug, a.title, a.description, a.estimated_minutes
        FROM assessments a
        JOIN professions p ON p.id = a.profession_id
        WHERE p.slug = $1
        ORDER BY a.created_at
        LIMIT 1
        "#,
    )
    .bind(&profession_slug)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    let items = sqlx::query_as::<_, AssessmentItemOut>(
        r#"
        SELECT
            i.id,
            i.order_index,
            i.item_type::text AS item_type,
            i.prompt,
            i.options,
            s.slug AS skill_slug,
            s.title AS skill_title
        FROM assessment_items i
        JOIN skills s ON s.id = i.skill_id
        WHERE i.assessment_id = $1
        ORDER BY i.order_index
        "#,
    )
    .bind(assessment.id)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(json!({
        "assessment": assessment,
        "items": items,
    })))
}

pub async fn start(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
    Json(body): Json<StartAssessmentRequest>,
) -> AppResult<(StatusCode, Json<Value>)> {
    let slug = body
        .assessment_slug
        .unwrap_or_else(|| "da_baseline".to_string());

    let assessment_id: Uuid = sqlx::query_scalar("SELECT id FROM assessments WHERE slug = $1")
        .bind(&slug)
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(|| AppError::BadRequest(format!("unknown assessment: {slug}")))?;

    let attempt_id: Uuid = sqlx::query_scalar(
        r#"
        INSERT INTO user_assessment_attempts (user_id, assessment_id, status)
        VALUES ($1, $2, 'in_progress')
        RETURNING id
        "#,
    )
    .bind(user_id)
    .bind(assessment_id)
    .fetch_one(&state.pool)
    .await?;

    Ok((
        StatusCode::CREATED,
        Json(json!({
            "attempt_id": attempt_id,
            "assessment_id": assessment_id,
            "status": "in_progress"
        })),
    ))
}

pub async fn submit(
    State(state): State<AppState>,
    Path((user_id, attempt_id)): Path<(Uuid, Uuid)>,
    Json(body): Json<SubmitAssessmentRequest>,
) -> AppResult<Json<Value>> {
    let attempt = sqlx::query_as::<_, AttemptRow>(
        r#"
        SELECT id, user_id, assessment_id, status
        FROM user_assessment_attempts
        WHERE id = $1 AND user_id = $2
        "#,
    )
    .bind(attempt_id)
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    if attempt.status == "scored" || attempt.status == "submitted" {
        return Err(AppError::BadRequest("assessment already submitted".into()));
    }

    let items = sqlx::query_as::<_, ItemKey>(
        r#"
        SELECT id, skill_id, correct_index, weight::float8 AS weight
        FROM assessment_items
        WHERE assessment_id = $1
        "#,
    )
    .bind(attempt.assessment_id)
    .fetch_all(&state.pool)
    .await?;

    let item_map: HashMap<Uuid, &ItemKey> = items.iter().map(|i| (i.id, i)).collect();

    let mut skill_correct: HashMap<Uuid, (f64, f64)> = HashMap::new();
    let mut answers_out = Vec::new();

    for ans in &body.answers {
        let Some(item) = item_map.get(&ans.item_id) else {
            continue;
        };
        let is_correct = match ans.selected_index {
            Some(idx) => item.correct_index == Some(idx),
            None => false,
        };
        let entry = skill_correct.entry(item.skill_id).or_insert((0.0, 0.0));
        entry.1 += item.weight;
        if is_correct {
            entry.0 += item.weight;
        }

        sqlx::query(
            r#"
            INSERT INTO user_assessment_answers (attempt_id, item_id, selected_index, answer_text, is_correct)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (attempt_id, item_id) DO UPDATE SET
                selected_index = EXCLUDED.selected_index,
                answer_text = EXCLUDED.answer_text,
                is_correct = EXCLUDED.is_correct,
                answered_at = now()
            "#,
        )
        .bind(attempt_id)
        .bind(ans.item_id)
        .bind(ans.selected_index)
        .bind(&ans.answer_text)
        .bind(is_correct)
        .execute(&state.pool)
        .await?;

        answers_out.push(json!({
            "item_id": ans.item_id,
            "is_correct": is_correct,
        }));
    }

    let mut skill_scores = serde_json::Map::new();
    let mut scores_list = Vec::new();

    for (skill_id, (correct, total)) in &skill_correct {
        let pct = if *total > 0.0 {
            (correct / total) * 100.0
        } else {
            0.0
        };
        let slug: String = sqlx::query_scalar("SELECT slug FROM skills WHERE id = $1")
            .bind(skill_id)
            .fetch_one(&state.pool)
            .await?;
        skill_scores.insert(slug.clone(), json!(pct));
        scores_list.push(pct);
        upsert_user_skill(&state.pool, user_id, *skill_id, pct, 0.7, "assessment").await?;
    }

    // Ensure all profession skills exist even if unanswered
    let missing: Vec<(Uuid,)> = sqlx::query_as(
        r#"
        SELECT ps.skill_id
        FROM assessments a
        JOIN profession_skills ps ON ps.profession_id = a.profession_id
        WHERE a.id = $1
          AND NOT EXISTS (
            SELECT 1 FROM user_skills us
            WHERE us.user_id = $2 AND us.skill_id = ps.skill_id
          )
        "#,
    )
    .bind(attempt.assessment_id)
    .bind(user_id)
    .fetch_all(&state.pool)
    .await?;
    for (skill_id,) in missing {
        upsert_user_skill(&state.pool, user_id, skill_id, 0.0, 0.4, "assessment").await?;
    }

    let overall = if scores_list.is_empty() {
        0.0
    } else {
        scores_list.iter().sum::<f64>() / scores_list.len() as f64
    };

    sqlx::query(
        r#"
        UPDATE user_assessment_attempts
        SET status = 'scored',
            submitted_at = now(),
            skill_scores = $2,
            overall_score = $3
        WHERE id = $1
        "#,
    )
    .bind(attempt_id)
    .bind(Value::Object(skill_scores.clone()))
    .bind(overall)
    .execute(&state.pool)
    .await?;

    sqlx::query(
        r#"
        UPDATE user_profiles
        SET assessment_completed = true, updated_at = now()
        WHERE user_id = $1
        "#,
    )
    .bind(user_id)
    .execute(&state.pool)
    .await?;

    // Kick off personalized course after assessment
    let job_id: Uuid = sqlx::query_scalar(
        r#"
        INSERT INTO generation_jobs (user_id, job_type, status, payload)
        VALUES ($1, 'course_outline', 'queued', '{"source":"assessment"}'::jsonb)
        RETURNING id
        "#,
    )
    .bind(user_id)
    .fetch_one(&state.pool)
    .await?;

    sqlx::query(
        r#"
        UPDATE user_profiles
        SET generation_status = 'pending', updated_at = now()
        WHERE user_id = $1
        "#,
    )
    .bind(user_id)
    .execute(&state.pool)
    .await?;

    let pool = state.pool.clone();
    let ai = state.ai.clone();
    tokio::spawn(async move {
        run_course_outline_job(pool, ai, user_id, job_id).await;
    });

    let skills = curriculum::plan_modules_for_user(
        &state.pool,
        user_id,
        sqlx::query_scalar(
            "SELECT profession_id FROM user_profiles WHERE user_id = $1",
        )
        .bind(user_id)
        .fetch_one(&state.pool)
        .await?
        .ok_or(AppError::NotFound)?,
    )
    .await
    .map_err(AppError::Other)?;

    Ok(Json(json!({
        "attempt_id": attempt_id,
        "status": "scored",
        "overall_score": overall,
        "skill_scores": Value::Object(skill_scores),
        "answers": answers_out,
        "roadmap_preview": skills.iter().filter(|p| p.include).map(|p| json!({
            "title": p.module.title,
            "skill": p.module.skill_title,
            "intensity": p.intensity,
            "score": p.module.user_score,
        })).collect::<Vec<_>>(),
        "job_id": job_id,
    })))
}

#[derive(sqlx::FromRow)]
struct AttemptRow {
    id: Uuid,
    #[allow(dead_code)]
    user_id: Uuid,
    assessment_id: Uuid,
    status: String,
}

#[derive(sqlx::FromRow)]
struct ItemKey {
    id: Uuid,
    skill_id: Uuid,
    correct_index: Option<i32>,
    weight: f64,
}
