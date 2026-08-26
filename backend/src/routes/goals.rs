use axum::{extract::State, Json};
use sqlx::PgPool;

use crate::error::AppResult;
use crate::models::{Goal, SkillLevel};

pub async fn list_goals(State(pool): State<PgPool>) -> AppResult<Json<Vec<Goal>>> {
    let rows = sqlx::query_as::<_, Goal>(
        "SELECT id, slug, title, description FROM goals ORDER BY title",
    )
    .fetch_all(&pool)
    .await?;

    Ok(Json(rows))
}

pub async fn list_skill_levels(State(pool): State<PgPool>) -> AppResult<Json<Vec<SkillLevel>>> {
    let rows = sqlx::query_as::<_, SkillLevel>(
        "SELECT id, slug, title, order_index, description FROM skill_levels ORDER BY order_index",
    )
    .fetch_all(&pool)
    .await?;

    Ok(Json(rows))
}
