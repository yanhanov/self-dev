mod assessment;
mod courses;
mod health;
mod lessons;
mod missions;
mod practice;
mod professions;
mod projects;
mod skills;
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
        // Assessment
        .route(
            "/api/professions/{slug}/assessment",
            get(assessment::get_for_profession),
        )
        .route("/api/users/{id}/assessment/start", post(assessment::start))
        .route(
            "/api/users/{id}/assessment/{attempt_id}/submit",
            post(assessment::submit),
        )
        // Skills / roadmap / readiness
        .route("/api/users/{id}/skills", get(skills::list_skills))
        .route("/api/users/{id}/roadmap", get(skills::roadmap))
        .route("/api/users/{id}/readiness", get(projects::readiness))
        // Missions
        .route("/api/users/{id}/missions/today", get(missions::today_mission))
        .route(
            "/api/users/{id}/missions/{user_mission_id}",
            get(missions::get_mission),
        )
        .route(
            "/api/users/{id}/missions/{user_mission_id}/advance",
            post(missions::advance),
        )
        // SQL practice
        .route("/api/practice/challenges/{slug}", get(practice::get_challenge))
        .route(
            "/api/users/{id}/practice/{challenge_id}/grade",
            post(practice::grade),
        )
        // Portfolio
        .route("/api/projects/{slug}", get(projects::get_project))
        .route("/api/users/{id}/project", get(projects::get_user_project))
        .route(
            "/api/users/{id}/project/{user_project_id}/submit",
            post(projects::submit),
        )
}
