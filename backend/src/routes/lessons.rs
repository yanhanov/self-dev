use axum::{
    extract::{Path, State},
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::jobs::generate_lesson_content;
use crate::models::{
    CompleteLessonResponse, LessonBlock, LessonDetail, QuizAnswerInput, QuizAnswerResult,
    QuizQuestion, QuizQuestionPublic,
};
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct CompleteLessonRequest {
    pub answers: Vec<QuizAnswerInput>,
}

pub async fn get_lesson(
    State(state): State<AppState>,
    Path(lesson_id): Path<Uuid>,
) -> AppResult<Json<LessonDetail>> {
    let lesson = sqlx::query_as::<_, LessonRow>(
        r#"
        SELECT id, course_id, order_index, title, summary, status::text AS status
        FROM lessons
        WHERE id = $1
        "#,
    )
    .bind(lesson_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    if lesson.status == "locked" || lesson.status == "generating" {
        // Try to generate if locked and previous completed
        let user_id: Option<Uuid> = sqlx::query_scalar(
            r#"
            SELECT c.user_id FROM courses c WHERE c.id = $1
            "#,
        )
        .bind(lesson.course_id)
        .fetch_optional(&state.pool)
        .await?;

        if let Some(user_id) = user_id {
            if lesson.status == "locked" {
                let pool = state.pool.clone();
                let ai = state.ai.clone();
                tokio::spawn(async move {
                    let _ = generate_lesson_content(&pool, &ai, user_id, lesson_id).await;
                });
            }
        }
    }

    let blocks = sqlx::query_as::<_, LessonBlock>(
        r#"
        SELECT id, lesson_id, block_type::text AS block_type, content_markdown, order_index
        FROM lesson_blocks
        WHERE lesson_id = $1
        ORDER BY order_index
        "#,
    )
    .bind(lesson_id)
    .fetch_all(&state.pool)
    .await?;

    let quiz_rows = sqlx::query_as::<_, QuizQuestion>(
        r#"
        SELECT id, lesson_id, order_index, question, options, correct_index, explanation
        FROM quiz_questions
        WHERE lesson_id = $1
        ORDER BY order_index
        "#,
    )
    .bind(lesson_id)
    .fetch_all(&state.pool)
    .await?;

    let quiz = quiz_rows
        .into_iter()
        .map(|q| QuizQuestionPublic {
            id: q.id,
            order_index: q.order_index,
            question: q.question,
            options: q.options,
        })
        .collect();

    if lesson.status == "ready" {
        let _ = sqlx::query(
            r#"
            UPDATE lessons SET status = 'in_progress', updated_at = now()
            WHERE id = $1 AND status = 'ready'
            "#,
        )
        .bind(lesson_id)
        .execute(&state.pool)
        .await;
    }

    Ok(Json(LessonDetail {
        id: lesson.id,
        course_id: lesson.course_id,
        order_index: lesson.order_index,
        title: lesson.title,
        summary: lesson.summary,
        status: lesson.status,
        blocks,
        quiz,
    }))
}

#[derive(sqlx::FromRow)]
struct LessonRow {
    id: Uuid,
    course_id: Uuid,
    order_index: i32,
    title: String,
    summary: String,
    status: String,
}

pub async fn complete_lesson(
    State(state): State<AppState>,
    Path(lesson_id): Path<Uuid>,
    Json(body): Json<CompleteLessonRequest>,
) -> AppResult<Json<CompleteLessonResponse>> {
    let lesson = sqlx::query_as::<_, LessonRow>(
        r#"
        SELECT id, course_id, order_index, title, summary, status::text AS status
        FROM lessons WHERE id = $1
        "#,
    )
    .bind(lesson_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    let user_id: Uuid = sqlx::query_scalar("SELECT user_id FROM courses WHERE id = $1")
        .bind(lesson.course_id)
        .fetch_one(&state.pool)
        .await?;

    let questions = sqlx::query_as::<_, QuizQuestion>(
        r#"
        SELECT id, lesson_id, order_index, question, options, correct_index, explanation
        FROM quiz_questions WHERE lesson_id = $1
        "#,
    )
    .bind(lesson_id)
    .fetch_all(&state.pool)
    .await?;

    let mut results = Vec::new();
    let mut score = 0;

    for answer in &body.answers {
        let q = questions
            .iter()
            .find(|q| q.id == answer.question_id)
            .ok_or_else(|| AppError::BadRequest("unknown question_id".into()))?;

        let is_correct = answer.selected_index == q.correct_index;
        if is_correct {
            score += 1;
        }

        sqlx::query(
            r#"
            INSERT INTO user_quiz_answers (user_id, question_id, selected_index, is_correct)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id, question_id) DO UPDATE SET
                selected_index = EXCLUDED.selected_index,
                is_correct = EXCLUDED.is_correct,
                answered_at = now()
            "#,
        )
        .bind(user_id)
        .bind(answer.question_id)
        .bind(answer.selected_index)
        .bind(is_correct)
        .execute(&state.pool)
        .await?;

        results.push(QuizAnswerResult {
            question_id: q.id,
            selected_index: answer.selected_index,
            correct_index: q.correct_index,
            is_correct,
            explanation: q.explanation.clone(),
        });
    }

    sqlx::query(
        r#"
        UPDATE lessons SET status = 'completed', updated_at = now() WHERE id = $1
        "#,
    )
    .bind(lesson_id)
    .execute(&state.pool)
    .await?;

    // Unlock / generate next lesson
    let next_id: Option<Uuid> = sqlx::query_scalar(
        r#"
        SELECT id FROM lessons
        WHERE course_id = $1 AND order_index = $2
        "#,
    )
    .bind(lesson.course_id)
    .bind(lesson.order_index + 1)
    .fetch_optional(&state.pool)
    .await?;

    if let Some(next_id) = next_id {
        let pool = state.pool.clone();
        let ai = state.ai.clone();
        tokio::spawn(async move {
            let _ = generate_lesson_content(&pool, &ai, user_id, next_id).await;
        });
    }

    Ok(Json(CompleteLessonResponse {
        lesson_id,
        status: "completed".into(),
        results,
        score,
        total: questions.len() as i32,
    }))
}
