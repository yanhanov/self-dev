mod goals;
mod health;
mod paths;
mod users;

use axum::{routing::get, Router};
use sqlx::PgPool;

pub fn api_router() -> Router<PgPool> {
    Router::new()
        .route("/health", get(health::health))
        .route("/api/goals", get(goals::list_goals))
        .route("/api/skill-levels", get(goals::list_skill_levels))
        .route("/api/paths", get(paths::list_paths))
        .route("/api/paths/{id}/steps", get(paths::list_path_steps))
        .route("/api/users", axum::routing::post(users::create_user))
        .route("/api/users/{id}/profile", axum::routing::put(users::upsert_profile))
}
