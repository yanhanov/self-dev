mod courses;
mod health;
mod lessons;
mod professions;
mod today;
mod tutor;
mod users;

use axum::{
    routing::{get, post, put},
    Router,
};

use crate::state::AppState;

pub fn api_router() -> Router<AppState> {
    Router::new()
        .route("/health", get(health::health))
        .route("/api/professions", get(professions::list_professions))
        .route("/api/skill-levels", get(professions::list_skill_levels))
        .route("/api/users", post(users::create_user))
        .route("/api/users/{id}/onboard", post(users::onboard))
        .route("/api/users/{id}/course", get(courses::get_course))
        .route("/api/lessons/{id}", get(lessons::get_lesson))
        .route("/api/lessons/{id}/complete", post(lessons::complete_lesson))
        .route("/api/users/{id}/today", get(today::get_today))
        .route(
            "/api/users/{id}/today/tasks/{task_id}/done",
            put(today::complete_task),
        )
        .route("/api/users/{id}/tutor/chat", post(tutor::chat))
        .route("/api/users/{id}/tutor/history", get(tutor::history))
}
