use axum::{
    extract::{Path, State},
    Json,
};
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::models::{User, UserProfile};

#[derive(Debug, Deserialize)]
pub struct CreateUserRequest {
    pub email: String,
    pub name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpsertProfileRequest {
    pub goal_slug: String,
    pub level_slug: String,
    pub weekly_hours: Option<i16>,
    pub preferred_language: Option<String>,
}

pub async fn create_user(
    State(pool): State<PgPool>,
    Json(body): Json<CreateUserRequest>,
) -> AppResult<Json<User>> {
    let user = sqlx::query_as::<_, User>(
        r#"
        INSERT INTO users (email, name)
        VALUES ($1, COALESCE($2, ''))
        RETURNING id, email, name, created_at
        "#,
    )
    .bind(&body.email)
    .bind(&body.name)
    .fetch_one(&pool)
    .await?;

    Ok(Json(user))
}

pub async fn upsert_profile(
    State(pool): State<PgPool>,
    Path(user_id): Path<Uuid>,
    Json(body): Json<UpsertProfileRequest>,
) -> AppResult<Json<UserProfile>> {
    let user_exists: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)")
        .bind(user_id)
        .fetch_one(&pool)
        .await?;

    if !user_exists {
        return Err(AppError::NotFound);
    }

    let goal_id: Option<Uuid> =
        sqlx::query_scalar("SELECT id FROM goals WHERE slug = $1")
            .bind(&body.goal_slug)
            .fetch_optional(&pool)
            .await?;

    let goal_id = goal_id.ok_or(AppError::NotFound)?;

    let level_id: Option<Uuid> =
        sqlx::query_scalar("SELECT id FROM skill_levels WHERE slug = $1")
            .bind(&body.level_slug)
            .fetch_optional(&pool)
            .await?;

    let level_id = level_id.ok_or(AppError::NotFound)?;

    let profile = sqlx::query_as::<_, UserProfile>(
        r#"
        INSERT INTO user_profiles (user_id, goal_id, skill_level_id, weekly_hours, preferred_language, updated_at)
        VALUES ($1, $2, $3, $4, COALESCE($5, 'ru'), now())
        ON CONFLICT (user_id) DO UPDATE SET
            goal_id = EXCLUDED.goal_id,
            skill_level_id = EXCLUDED.skill_level_id,
            weekly_hours = EXCLUDED.weekly_hours,
            preferred_language = EXCLUDED.preferred_language,
            updated_at = now()
        RETURNING user_id, goal_id, skill_level_id, weekly_hours, preferred_language
        "#,
    )
    .bind(user_id)
    .bind(goal_id)
    .bind(level_id)
    .bind(body.weekly_hours)
    .bind(&body.preferred_language)
    .fetch_one(&pool)
    .await?;

    Ok(Json(profile))
}
