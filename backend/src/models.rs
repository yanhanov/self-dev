use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::Serialize;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, FromRow)]
pub struct Goal {
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
pub struct Resource {
    pub id: Uuid,
    pub title: String,
    pub url: String,
    pub resource_type: String,
    pub language: String,
    pub is_free: bool,
    pub estimated_hours: Option<Decimal>,
    pub difficulty: Option<i16>,
    pub source_name: Option<String>,
    pub summary: String,
}

#[derive(Debug, Serialize, FromRow)]
pub struct LearningPath {
    pub id: Uuid,
    pub goal_id: Uuid,
    pub skill_level_id: Uuid,
    pub title: String,
    pub description: String,
    pub goal_slug: String,
    pub goal_title: String,
    pub level_slug: String,
    pub level_title: String,
}

#[derive(Debug, Serialize, FromRow)]
pub struct LearningPathStep {
    pub id: Uuid,
    pub path_id: Uuid,
    pub order_index: i32,
    pub title: String,
    pub skill_id: Option<Uuid>,
    pub skill_title: Option<String>,
    pub resource_id: Option<Uuid>,
    pub resource: Option<ResourceSummary>,
    pub project_brief: Option<String>,
    pub estimated_days: Option<i16>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct ResourceSummary {
    pub id: Uuid,
    pub title: String,
    pub url: String,
    pub resource_type: String,
    pub source_name: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct UserProfile {
    pub user_id: Uuid,
    pub goal_id: Uuid,
    pub skill_level_id: Uuid,
    pub weekly_hours: Option<i16>,
    pub preferred_language: String,
}
