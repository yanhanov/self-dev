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
    /// Optional — for Data Analyst, skills come from assessment, not self-report.
    pub level_slug: Option<String>,
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

    let level_slug = body
        .level_slug
        .as_deref()
        .filter(|s| !s.is_empty())
        .unwrap_or("complete_beginner");

    let level_id: Option<Uuid> =
        sqlx::query_scalar("SELECT id FROM skill_levels WHERE slug = $1")
            .bind(level_slug)
            .fetch_optional(&state.pool)
            .await?;
    let level_id =
        level_id.ok_or_else(|| AppError::BadRequest(format!("unknown level: {level_slug}")))?;

    let previous_profession_id: Option<Uuid> =
        sqlx::query_scalar("SELECT profession_id FROM user_profiles WHERE user_id = $1")
            .bind(user_id)
            .fetch_optional(&state.pool)
            .await?
            .flatten();
    let profession_changed = previous_profession_id != Some(profession_id);

    sqlx::query(
        r#"
        INSERT INTO user_profiles (
            user_id, profession_id, skill_level_id, weekly_hours,
            preferred_language, generation_status, assessment_completed, updated_at
        )
        VALUES (
            $1, $2, $3, $4, COALESCE($5, 'ru'),
            'pending'::generation_status, false, now()
        )
        ON CONFLICT (user_id) DO UPDATE SET
            profession_id = EXCLUDED.profession_id,
            skill_level_id = EXCLUDED.skill_level_id,
            weekly_hours = EXCLUDED.weekly_hours,
            preferred_language = EXCLUDED.preferred_language,
            generation_status = CASE
                WHEN user_profiles.profession_id IS NOT DISTINCT FROM EXCLUDED.profession_id
                THEN user_profiles.generation_status
                ELSE 'pending'::generation_status
            END,
            assessment_completed = CASE
                WHEN user_profiles.profession_id IS NOT DISTINCT FROM EXCLUDED.profession_id
                THEN user_profiles.assessment_completed
                ELSE false
            END,
            updated_at = now()
        "#,
    )
    .bind(user_id)
    .bind(profession_id)
    .bind(level_id)
    .bind(body.weekly_hours)
    .bind(&body.preferred_language)
    .execute(&state.pool)
    .await?;

    // Data Analyst MVP loop: assessment → skill graph → roadmap (no self-level).
    if body.profession_slug == "data_analyst" {
        let assessment_done: bool = sqlx::query_scalar(
            "SELECT COALESCE(assessment_completed, false) FROM user_profiles WHERE user_id = $1",
        )
        .bind(user_id)
        .fetch_one(&state.pool)
        .await?;

        if assessment_done {
            return Ok((
                StatusCode::ACCEPTED,
                Json(json!({
                    "status": "accepted",
                    "next": "today",
                    "generation_status": "ready"
                })),
            ));
        }

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
        "level_slug": level_slug,
    }))
    .fetch_one(&state.pool)
    .await?;

    let has_course: bool =
        sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM courses WHERE user_id = $1)")
            .bind(user_id)
            .fetch_one(&state.pool)
            .await?;

    // Regenerate when first onboard, profession changed, or course missing
    if profession_changed || !has_course {
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
    }

    Ok((
        StatusCode::ACCEPTED,
        Json(json!({
            "status": "accepted",
            "job_id": job_id,
            "next": "course",
            "generation_status": if profession_changed || !has_course {
                "pending"
            } else {
                "ready"
            }
        })),
    ))
}
