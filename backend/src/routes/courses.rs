use axum::{
    extract::{Path, State},
    Json,
};
use serde::Serialize;
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::jobs::generate_lesson_content;
use crate::models::LessonSummary;
use crate::state::AppState;

#[derive(Debug, Serialize)]
pub struct CourseResponse {
    pub id: Option<Uuid>,
    pub user_id: Uuid,
    pub title: String,
    pub summary: String,
    pub total_lessons: i32,
    pub generation_status: String,
    pub profession_slug: String,
    pub profession_title: String,
    pub level_slug: String,
    pub level_title: String,
    pub lessons: Vec<LessonSummary>,
}

pub async fn get_course(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
) -> AppResult<Json<CourseResponse>> {
    let profile = sqlx::query_as::<_, ProfileRow>(
        r#"
        SELECT
            up.user_id,
            COALESCE(up.generation_status::text, 'pending') AS generation_status,
            COALESCE(p.slug, '') AS profession_slug,
            COALESCE(p.title, '') AS profession_title,
            sl.slug AS level_slug,
            sl.title AS level_title
        FROM user_profiles up
        LEFT JOIN professions p ON p.id = up.profession_id
        JOIN skill_levels sl ON sl.id = up.skill_level_id
        WHERE up.user_id = $1
        "#,
    )
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    let course = sqlx::query_as::<_, CourseRow>(
        r#"
        SELECT
            c.id, c.user_id, c.title, c.summary, c.total_lessons,
            p.slug AS profession_slug, p.title AS profession_title,
            sl.slug AS level_slug, sl.title AS level_title
        FROM courses c
        JOIN professions p ON p.id = c.profession_id
        JOIN skill_levels sl ON sl.id = c.skill_level_id
        WHERE c.user_id = $1
        "#,
    )
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await?;

    let Some(course) = course else {
        return Ok(Json(CourseResponse {
            id: None,
            user_id,
            title: "Генерация курса…".into(),
            summary: "AI создаёт персональную программу обучения".into(),
            total_lessons: 0,
            generation_status: profile.generation_status,
            profession_slug: profile.profession_slug,
            profession_title: profile.profession_title,
            level_slug: profile.level_slug,
            level_title: profile.level_title,
            lessons: vec![],
        }));
    };

    let lessons = sqlx::query_as::<_, LessonSummary>(
        r#"
        SELECT id, course_id, order_index, title, summary, status::text AS status
        FROM lessons
        WHERE course_id = $1
        ORDER BY order_index
        "#,
    )
    .bind(course.id)
    .fetch_all(&state.pool)
    .await?;

    if let Some(next) = lessons
        .iter()
        .find(|l| l.status == "locked")
        .filter(|next| {
            lessons
                .iter()
                .filter(|l| l.order_index < next.order_index)
                .all(|l| l.status == "completed")
        })
    {
        let pool = state.pool.clone();
        let ai = state.ai.clone();
        let lesson_id = next.id;
        tokio::spawn(async move {
            let _ = generate_lesson_content(&pool, &ai, user_id, lesson_id).await;
        });
    }

    Ok(Json(CourseResponse {
        id: Some(course.id),
        user_id: course.user_id,
        title: course.title,
        summary: course.summary,
        total_lessons: course.total_lessons,
        generation_status: profile.generation_status,
        profession_slug: course.profession_slug,
        profession_title: course.profession_title,
        level_slug: course.level_slug,
        level_title: course.level_title,
        lessons,
    }))
}

#[derive(sqlx::FromRow)]
struct ProfileRow {
    #[allow(dead_code)]
    user_id: Uuid,
    generation_status: String,
    profession_slug: String,
    profession_title: String,
    level_slug: String,
    level_title: String,
}

#[derive(sqlx::FromRow)]
struct CourseRow {
    id: Uuid,
    user_id: Uuid,
    title: String,
    summary: String,
    total_lessons: i32,
    profession_slug: String,
    profession_title: String,
    level_slug: String,
    level_title: String,
}
