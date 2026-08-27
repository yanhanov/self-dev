use axum::{extract::State, Json};

use crate::error::AppResult;
use crate::models::{Profession, SkillLevel};
use crate::state::AppState;

pub async fn list_professions(State(state): State<AppState>) -> AppResult<Json<Vec<Profession>>> {
    let rows = sqlx::query_as::<_, Profession>(
        "SELECT id, slug, title, description FROM professions ORDER BY title",
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(rows))
}

pub async fn list_skill_levels(State(state): State<AppState>) -> AppResult<Json<Vec<SkillLevel>>> {
    let rows = sqlx::query_as::<_, SkillLevel>(
        "SELECT id, slug, title, order_index, description FROM skill_levels ORDER BY order_index",
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(rows))
}
