use axum::{
    extract::{Path, State},
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::curriculum::{bump_user_skill, compute_readiness};
use crate::error::{AppError, AppResult};
use crate::state::AppState;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct ProjectOut {
    pub id: Uuid,
    pub slug: String,
    pub title: String,
    pub brief_markdown: String,
    pub rubric_markdown: String,
    pub challenge_slug: Option<String>,
    pub challenge_id: Option<Uuid>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct UserProjectOut {
    pub id: Uuid,
    pub project_id: Uuid,
    pub status: String,
    pub sql_submission: Option<String>,
    pub reasoning_text: Option<String>,
    pub sql_score: Option<f64>,
    pub reasoning_score: Option<f64>,
    pub overall_score: Option<f64>,
    pub ai_feedback: String,
    pub title: String,
    pub slug: String,
    pub brief_markdown: String,
    pub challenge_slug: Option<String>,
    pub challenge_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct SubmitProjectRequest {
    pub sql_submission: String,
    pub reasoning_text: String,
    pub sql_correct: Option<bool>,
}

pub async fn get_project(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> AppResult<Json<ProjectOut>> {
    let row = sqlx::query_as::<_, ProjectOut>(
        r#"
        SELECT
            p.id, p.slug, p.title, p.brief_markdown, p.rubric_markdown,
            c.slug AS challenge_slug, p.challenge_id
        FROM portfolio_projects p
        LEFT JOIN practice_challenges c ON c.id = p.challenge_id
        WHERE p.slug = $1
        "#,
    )
    .bind(&slug)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;
    Ok(Json(row))
}

pub async fn get_user_project(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    // Ensure a user_projects row exists for the DA capstone
    let project = sqlx::query_as::<_, ProjectOut>(
        r#"
        SELECT
            p.id, p.slug, p.title, p.brief_markdown, p.rubric_markdown,
            c.slug AS challenge_slug, p.challenge_id
        FROM portfolio_projects p
        LEFT JOIN practice_challenges c ON c.id = p.challenge_id
        JOIN user_profiles up ON up.profession_id = p.profession_id
        WHERE up.user_id = $1
        ORDER BY p.created_at
        LIMIT 1
        "#,
    )
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await?;

    let Some(project) = project else {
        return Ok(Json(json!({ "project": null })));
    };

    // Unlock when at least 2 missions completed OR assessment done
    let missions_done: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM user_missions WHERE user_id = $1 AND status = 'completed'",
    )
    .bind(user_id)
    .fetch_one(&state.pool)
    .await?;

    let status = if missions_done >= 2 {
        "available"
    } else {
        "locked"
    };

    sqlx::query(
        r#"
        INSERT INTO user_projects (user_id, project_id, status)
        VALUES ($1, $2, $3::project_status)
        ON CONFLICT (user_id, project_id) DO UPDATE SET
            status = CASE
                WHEN user_projects.status IN ('submitted', 'scored') THEN user_projects.status
                WHEN EXCLUDED.status = 'available' THEN 'available'::project_status
                ELSE user_projects.status
            END
        "#,
    )
    .bind(user_id)
    .bind(project.id)
    .bind(status)
    .execute(&state.pool)
    .await?;

    let up = sqlx::query_as::<_, UserProjectOut>(
        r#"
        SELECT
            up.id, up.project_id, up.status::text AS status,
            up.sql_submission, up.reasoning_text,
            up.sql_score::float8 AS sql_score,
            up.reasoning_score::float8 AS reasoning_score,
            up.overall_score::float8 AS overall_score,
            up.ai_feedback,
            p.title, p.slug, p.brief_markdown,
            c.slug AS challenge_slug, p.challenge_id
        FROM user_projects up
        JOIN portfolio_projects p ON p.id = up.project_id
        LEFT JOIN practice_challenges c ON c.id = p.challenge_id
        WHERE up.user_id = $1 AND up.project_id = $2
        "#,
    )
    .bind(user_id)
    .bind(project.id)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(json!({ "project": up, "missions_completed": missions_done })))
}

pub async fn submit(
    State(state): State<AppState>,
    Path((user_id, user_project_id)): Path<(Uuid, Uuid)>,
    Json(body): Json<SubmitProjectRequest>,
) -> AppResult<Json<Value>> {
    let owned: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM user_projects WHERE id = $1 AND user_id = $2)",
    )
    .bind(user_project_id)
    .bind(user_id)
    .fetch_one(&state.pool)
    .await?;
    if !owned {
        return Err(AppError::NotFound);
    }

    let sql_correct = body.sql_correct.unwrap_or(false);
    let sql_score = if sql_correct { 60.0 } else { 20.0 };

    // Simple rubric for reasoning length / keywords
    let text = body.reasoning_text.to_lowercase();
    let mut reasoning_score: f64 = 10.0;
    if body.reasoning_text.split_whitespace().count() >= 40 {
        reasoning_score += 10.0;
    }
    for kw in ["причин", "рекоменд", "сегмент", "драйвер", "выручк", "product", "paid"] {
        if text.contains(kw) {
            reasoning_score += 4.0;
        }
    }
    reasoning_score = reasoning_score.min(40.0_f64);
    let overall = sql_score + reasoning_score;

    let feedback = if sql_correct {
        format!(
            "SQL часть зачтена ({sql_score:.0}/60). Business reasoning: {reasoning_score:.0}/40. Итого {overall:.0}/100."
        )
    } else {
        format!(
            "SQL пока неверный ({sql_score:.0}/60) — перепроверьте JOIN и фильтр paid. Reasoning: {reasoning_score:.0}/40. Итого {overall:.0}/100."
        )
    };

    sqlx::query(
        r#"
        UPDATE user_projects
        SET status = 'scored',
            sql_submission = $2,
            reasoning_text = $3,
            sql_score = $4,
            reasoning_score = $5,
            overall_score = $6,
            ai_feedback = $7,
            skills_earned = '["sql","business-thinking","visualization"]'::jsonb,
            submitted_at = now(),
            scored_at = now()
        WHERE id = $1
        "#,
    )
    .bind(user_project_id)
    .bind(&body.sql_submission)
    .bind(&body.reasoning_text)
    .bind(sql_score)
    .bind(reasoning_score)
    .bind(overall)
    .bind(&feedback)
    .execute(&state.pool)
    .await?;

    // Bump related skills
    for slug in ["sql", "business-thinking", "visualization"] {
        let skill_id: Option<Uuid> = sqlx::query_scalar("SELECT id FROM skills WHERE slug = $1")
            .bind(slug)
            .fetch_optional(&state.pool)
            .await?;
        if let Some(sid) = skill_id {
            let delta = if sql_correct { 10.0 } else { 4.0 };
            bump_user_skill(
                &state.pool,
                user_id,
                sid,
                delta,
                "project",
                json!({"user_project_id": user_project_id}),
            )
            .await
            .map_err(AppError::Other)?;
        }
    }

    let readiness = compute_readiness(&state.pool, user_id)
        .await
        .map_err(AppError::Other)?;

    sqlx::query(
        r#"
        INSERT INTO readiness_snapshots (user_id, overall, technical, projects, consistency, gaps)
        VALUES ($1, $2, $3, $4, $5, $6)
        "#,
    )
    .bind(user_id)
    .bind(readiness.overall)
    .bind(readiness.technical)
    .bind(readiness.projects)
    .bind(readiness.consistency)
    .bind(json!(readiness.gaps))
    .execute(&state.pool)
    .await?;

    sqlx::query(
        "UPDATE user_profiles SET readiness_score = $2, updated_at = now() WHERE user_id = $1",
    )
    .bind(user_id)
    .bind(readiness.overall)
    .execute(&state.pool)
    .await?;

    Ok(Json(json!({
        "status": "scored",
        "sql_score": sql_score,
        "reasoning_score": reasoning_score,
        "overall_score": overall,
        "feedback": feedback,
        "readiness": readiness,
    })))
}

pub async fn readiness(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    let report = compute_readiness(&state.pool, user_id)
        .await
        .map_err(AppError::Other)?;
    Ok(Json(json!(report)))
}
