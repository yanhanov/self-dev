use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::jobs::run_course_outline_job;
use crate::models::User;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct CreateUserRequest {
    pub email: String,
    pub name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct OnboardRequest {
    pub profession_slug: String,
    pub level_slug: String,
    pub weekly_hours: Option<i16>,
    pub preferred_language: Option<String>,
}

pub async fn create_user(
    State(state): State<AppState>,
    Json(body): Json<CreateUserRequest>,
) -> AppResult<Json<User>> {
    let user = sqlx::query_as::<_, User>(
        r#"
        INSERT INTO users (email, name)
        VALUES ($1, COALESCE($2, ''))
        ON CONFLICT (email) DO UPDATE SET name = COALESCE(EXCLUDED.name, users.name)
        RETURNING id, email, name, created_at
        "#,
    )
    .bind(&body.email)
    .bind(&body.name)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(user))
}

pub async fn onboard(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
    Json(body): Json<OnboardRequest>,
) -> AppResult<(StatusCode, Json<serde_json::Value>)> {
    let user_exists: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)")
        .bind(user_id)
        .fetch_one(&state.pool)
        .await?;

    if !user_exists {
        return Err(AppError::NotFound);
    }

    let profession_id: Option<Uuid> =
        sqlx::query_scalar("SELECT id FROM professions WHERE slug = $1")
            .bind(&body.profession_slug)
            .fetch_optional(&state.pool)
            .await?;
    let profession_id = profession_id.ok_or_else(|| {
        AppError::BadRequest(format!("unknown profession: {}", body.profession_slug))
    })?;

    let level_id: Option<Uuid> =
        sqlx::query_scalar("SELECT id FROM skill_levels WHERE slug = $1")
            .bind(&body.level_slug)
            .fetch_optional(&state.pool)
            .await?;
    let level_id =
        level_id.ok_or_else(|| AppError::BadRequest(format!("unknown level: {}", body.level_slug)))?;

    sqlx::query(
        r#"
        INSERT INTO user_profiles (
            user_id, profession_id, skill_level_id, weekly_hours,
            preferred_language, generation_status, assessment_completed, updated_at
        )
        VALUES ($1, $2, $3, $4, COALESCE($5, 'ru'), $6, false, now())
        ON CONFLICT (user_id) DO UPDATE SET
            profession_id = EXCLUDED.profession_id,
            skill_level_id = EXCLUDED.skill_level_id,
            weekly_hours = EXCLUDED.weekly_hours,
            preferred_language = EXCLUDED.preferred_language,
            generation_status = EXCLUDED.generation_status,
            assessment_completed = false,
            updated_at = now()
        "#,
    )
    .bind(user_id)
    .bind(profession_id)
    .bind(level_id)
    .bind(body.weekly_hours)
    .bind(&body.preferred_language)
    .bind(if body.profession_slug == "data_analyst" {
        "pending"
    } else {
        "pending"
    })
    .execute(&state.pool)
    .await?;

    // Data Analyst: assessment first, then course. Other professions: generate now.
    if body.profession_slug == "data_analyst" {
        return Ok((
            StatusCode::ACCEPTED,
            Json(json!({
                "status": "accepted",
                "next": "assessment",
                "assessment_slug": "da_baseline",
                "generation_status": "pending"
            })),
        ));
    }

    let job_id: Uuid = sqlx::query_scalar(
        r#"
        INSERT INTO generation_jobs (user_id, job_type, status, payload)
        VALUES ($1, 'course_outline', 'queued', $2)
        RETURNING id
        "#,
    )
    .bind(user_id)
    .bind(json!({
        "profession_slug": body.profession_slug,
        "level_slug": body.level_slug,
    }))
    .fetch_one(&state.pool)
    .await?;

    let pool = state.pool.clone();
    let ai = state.ai.clone();
    tokio::spawn(async move {
        run_course_outline_job(pool, ai, user_id, job_id).await;
    });

    Ok((
        StatusCode::ACCEPTED,
        Json(json!({
            "status": "accepted",
            "job_id": job_id,
            "next": "course",
            "generation_status": "pending"
        })),
    ))
}
