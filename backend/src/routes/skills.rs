use axum::{
    extract::{Path, State},
    Json,
};
use serde::Serialize;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::curriculum::{self, compute_readiness};
use crate::error::{AppError, AppResult};
use crate::state::AppState;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct UserSkillOut {
    pub skill_id: Uuid,
    pub slug: String,
    pub title: String,
    pub category: String,
    pub score: f64,
    pub confidence: f64,
    pub source: String,
    pub order_index: i32,
}

pub async fn list_skills(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    let skills = sqlx::query_as::<_, UserSkillOut>(
        r#"
        SELECT
            s.id AS skill_id,
            s.slug,
            s.title,
            s.category,
            COALESCE(us.score, 0)::float8 AS score,
            COALESCE(us.confidence, 0)::float8 AS confidence,
            COALESCE(us.source::text, 'assessment') AS source,
            ps.order_index
        FROM user_profiles up
        JOIN profession_skills ps ON ps.profession_id = up.profession_id
        JOIN skills s ON s.id = ps.skill_id
        LEFT JOIN user_skills us ON us.user_id = up.user_id AND us.skill_id = s.id
        WHERE up.user_id = $1
        ORDER BY ps.order_index
        "#,
    )
    .bind(user_id)
    .fetch_all(&state.pool)
    .await?;

    let readiness = compute_readiness(&state.pool, user_id)
        .await
        .map_err(AppError::Other)?;

    Ok(Json(json!({
        "skills": skills,
        "readiness": readiness,
    })))
}

pub async fn roadmap(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    let profession_id: Option<Uuid> =
        sqlx::query_scalar("SELECT profession_id FROM user_profiles WHERE user_id = $1")
            .bind(user_id)
            .fetch_optional(&state.pool)
            .await?
            .flatten();
    let profession_id = profession_id.ok_or(AppError::NotFound)?;

    let planned = curriculum::plan_modules_for_user(&state.pool, user_id, profession_id)
        .await
        .map_err(AppError::Other)?;

    Ok(Json(json!({
        "modules": planned.iter().map(|p| json!({
            "id": p.module.id,
            "slug": p.module.slug,
            "title": p.module.title,
            "summary": p.module.summary,
            "skill_slug": p.module.skill_slug,
            "skill_title": p.module.skill_title,
            "order_index": p.module.order_index,
            "user_score": p.module.user_score,
            "intensity": p.intensity,
            "include": p.include,
            "estimated_minutes": p.module.estimated_minutes,
            "why": if p.include {
                format!(
                    "Скор по {} = {:.0}% → режим {}",
                    p.module.skill_title,
                    p.module.user_score.unwrap_or(0.0),
                    p.intensity
                )
            } else {
                format!(
                    "Скор по {} = {:.0}% — модуль можно пропустить",
                    p.module.skill_title,
                    p.module.user_score.unwrap_or(0.0)
                )
            }
        })).collect::<Vec<_>>()
    })))
}
