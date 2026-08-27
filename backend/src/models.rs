use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, FromRow)]
pub struct Profession {
    pub id: Uuid,
    pub slug: String,
    pub title: String,
    pub description: String,
}

#[derive(Debug, Serialize, FromRow)]
pub struct SkillLevel {
    pub id: Uuid,
    pub slug: String,
    pub title: String,
    pub order_index: i32,
    pub description: String,
}

#[derive(Debug, Serialize, FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub created_at: DateTime<Utc>,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, FromRow)]
pub struct UserProfile {
    pub user_id: Uuid,
    pub profession_id: Option<Uuid>,
    pub skill_level_id: Uuid,
    pub weekly_hours: Option<i16>,
    pub preferred_language: String,
    pub generation_status: String,
}

#[derive(Debug, Serialize, FromRow)]
pub struct LessonSummary {
    pub id: Uuid,
    pub course_id: Uuid,
    pub order_index: i32,
    pub title: String,
    pub summary: String,
    pub status: String,
}

#[derive(Debug, Serialize, FromRow)]
pub struct LessonBlock {
    pub id: Uuid,
    pub lesson_id: Uuid,
    pub block_type: String,
    pub content_markdown: String,
    pub order_index: i32,
}

#[derive(Debug, Serialize, FromRow)]
pub struct QuizQuestion {
    pub id: Uuid,
    pub lesson_id: Uuid,
    pub order_index: i32,
    pub question: String,
    pub options: serde_json::Value,
    pub correct_index: i32,
    pub explanation: String,
}

#[derive(Debug, Serialize)]
pub struct LessonDetail {
    pub id: Uuid,
    pub course_id: Uuid,
    pub order_index: i32,
    pub title: String,
    pub summary: String,
    pub status: String,
    pub blocks: Vec<LessonBlock>,
    pub quiz: Vec<QuizQuestionPublic>,
}

#[derive(Debug, Serialize)]
pub struct QuizQuestionPublic {
    pub id: Uuid,
    pub order_index: i32,
    pub question: String,
    pub options: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct QuizAnswerInput {
    pub question_id: Uuid,
    pub selected_index: i32,
}

#[derive(Debug, Serialize)]
pub struct QuizAnswerResult {
    pub question_id: Uuid,
    pub selected_index: i32,
    pub correct_index: i32,
    pub is_correct: bool,
    pub explanation: String,
}

#[derive(Debug, Serialize)]
pub struct CompleteLessonResponse {
    pub lesson_id: Uuid,
    pub status: String,
    pub results: Vec<QuizAnswerResult>,
    pub score: i32,
    pub total: i32,
}

#[derive(Debug, Serialize, FromRow)]
pub struct DailyPlan {
    pub id: Uuid,
    pub user_id: Uuid,
    pub plan_date: NaiveDate,
    pub summary: String,
}

#[derive(Debug, Serialize, FromRow)]
pub struct DailyTask {
    pub id: Uuid,
    pub daily_plan_id: Uuid,
    pub order_index: i32,
    pub title: String,
    pub description: String,
    pub estimated_minutes: Option<i16>,
    pub status: String,
    pub lesson_id: Option<Uuid>,
}

#[derive(Debug, Serialize)]
pub struct TodayResponse {
    pub plan: DailyPlan,
    pub tasks: Vec<DailyTask>,
}
