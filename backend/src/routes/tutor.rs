use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::ai::{TutorGenRequest, VerifiedContextItem};
use crate::error::{AppError, AppResult};
use crate::knowledge::{self, TUTOR_RANK_THRESHOLD};
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct ChatRequest {
    pub message: String,
    pub lesson_id: Option<Uuid>,
}

#[derive(Debug, Serialize)]
pub struct CitationOut {
    pub chunk_id: Uuid,
    pub source_title: String,
    pub url: String,
    pub excerpt: String,
}

#[derive(Debug, Serialize)]
pub struct ChatResponse {
    pub answer: String,
    pub citations: Vec<CitationOut>,
    pub confidence: f32,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct ChatMessageOut {
    pub id: Uuid,
    pub role: String,
    pub content: String,
    pub citations: serde_json::Value,
    pub lesson_id: Option<Uuid>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct HistoryQuery {
    pub limit: Option<i64>,
    pub lesson_id: Option<Uuid>,
}

pub async fn chat(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
    Json(body): Json<ChatRequest>,
) -> AppResult<Json<ChatResponse>> {
    let message = body.message.trim().to_string();
    if message.is_empty() {
        return Err(AppError::BadRequest("message is required".into()));
    }

    let profile = sqlx::query_as::<_, ProfileRow>(
        r#"
        SELECT
            up.profession_id,
            COALESCE(up.preferred_language, 'ru') AS preferred_language,
            COALESCE(up.weekly_hours, 10::smallint) AS weekly_hours,
            p.title AS profession_title
        FROM user_profiles up
        LEFT JOIN professions p ON p.id = up.profession_id
        WHERE up.user_id = $1
        "#,
    )
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    let lesson_title: String = if let Some(lesson_id) = body.lesson_id {
        sqlx::query_scalar(
            r#"
            SELECT l.title
            FROM lessons l
            JOIN courses c ON c.id = l.course_id
            WHERE l.id = $1 AND c.user_id = $2
            "#,
        )
        .bind(lesson_id)
        .bind(user_id)
        .fetch_optional(&state.pool)
        .await?
        .unwrap_or_default()
    } else {
        String::new()
    };

    // Learner model summary for mentor
    let skills: Vec<(String, f64)> = sqlx::query_as(
        r#"
        SELECT s.title, COALESCE(us.score, 0)::float8
        FROM profession_skills ps
        JOIN user_profiles up ON up.profession_id = ps.profession_id
        JOIN skills s ON s.id = ps.skill_id
        LEFT JOIN user_skills us ON us.user_id = up.user_id AND us.skill_id = s.id
        WHERE up.user_id = $1
        ORDER BY ps.order_index
        "#,
    )
    .bind(user_id)
    .fetch_all(&state.pool)
    .await?;

    let mistakes: Vec<(String, String)> = sqlx::query_as(
        r#"
        SELECT s.title, COALESCE(e.detail->>'feedback', e.event_type)
        FROM user_skill_events e
        JOIN skills s ON s.id = e.skill_id
        WHERE e.user_id = $1 AND e.event_type = 'mistake'
        ORDER BY e.created_at DESC
        LIMIT 5
        "#,
    )
    .bind(user_id)
    .fetch_all(&state.pool)
    .await?;

    let recent_missions: Vec<String> = sqlx::query_scalar(
        r#"
        SELECT m.title FROM user_missions um
        JOIN missions m ON m.id = um.mission_id
        WHERE um.user_id = $1
        ORDER BY um.completed_at DESC NULLS LAST, um.started_at DESC
        LIMIT 3
        "#,
    )
    .bind(user_id)
    .fetch_all(&state.pool)
    .await?;

    let skill_line = skills
        .iter()
        .map(|(t, s)| format!("{t}:{s:.0}%"))
        .collect::<Vec<_>>()
        .join(", ");
    let mistake_line = if mistakes.is_empty() {
        "none".into()
    } else {
        mistakes
            .iter()
            .map(|(t, d)| format!("{t}: {d}"))
            .collect::<Vec<_>>()
            .join("; ")
    };
    let learner_context = format!(
        "Goal: {}\nWeekly hours: {}\nSkills: {}\nRecent mistakes: {}\nRecent missions: {}",
        profile.profession_title.as_deref().unwrap_or("n/a"),
        profile.weekly_hours,
        skill_line,
        mistake_line,
        recent_missions.join("; ")
    );

    // Search the user message first. Russian lesson titles pollute english FTS.
    let mut chunks = knowledge::retrieve_for_query(
        &state.pool,
        profile.profession_id,
        &message,
        5,
    )
    .await?;

    if chunks.is_empty() && !lesson_title.is_empty() {
        chunks = knowledge::retrieve_for_query(
            &state.pool,
            profile.profession_id,
            &format!("{message} {lesson_title}"),
            5,
        )
        .await?;
    }

    let best_rank = chunks.first().map(|c| c.rank).unwrap_or(0.0);

    // Persist user message
    sqlx::query(
        r#"
        INSERT INTO chat_messages (user_id, lesson_id, role, content, citations)
        VALUES ($1, $2, 'user', $3, '[]'::jsonb)
        "#,
    )
    .bind(user_id)
    .bind(body.lesson_id)
    .bind(&message)
    .execute(&state.pool)
    .await?;

    if chunks.is_empty() || best_rank < TUTOR_RANK_THRESHOLD {
        let answer = if profile.preferred_language.starts_with("ru") {
            "В базе знаний нет проверенной информации по этому вопросу. Попробуйте спросить про SQL, JOIN, Excel, статистику, pandas, графики или бизнес-метрики (для Data Analyst), либо HTML/CSS/React/UX для других направлений."
                .to_string()
        } else {
            "I don't have verified information on that in the knowledge base. Try SQL, joins, Excel, statistics, pandas, charts, or business metrics for Data Analyst — or HTML/CSS/React/UX for other tracks."
                .to_string()
        };

        sqlx::query(
            r#"
            INSERT INTO chat_messages (user_id, lesson_id, role, content, citations)
            VALUES ($1, $2, 'assistant', $3, '[]'::jsonb)
            "#,
        )
        .bind(user_id)
        .bind(body.lesson_id)
        .bind(&answer)
        .execute(&state.pool)
        .await?;

        return Ok(Json(ChatResponse {
            answer,
            citations: vec![],
            confidence: 0.0,
        }));
    }

    let verified_context: Vec<VerifiedContextItem> = chunks
        .iter()
        .enumerate()
        .map(|(i, c)| VerifiedContextItem {
            ref_index: (i + 1) as i32,
            chunk_id: c.id.to_string(),
            source_name: c.source_name.clone(),
            source_url: c.source_url.clone(),
            document_title: c.document_title.clone(),
            title: c.title.clone(),
            content: c.content_text.clone(),
        })
        .collect();

    let generated = state
        .ai
        .generate_tutor_answer(&TutorGenRequest {
            preferred_language: profile.preferred_language.clone(),
            message: message.clone(),
            lesson_title: lesson_title.clone(),
            verified_context,
            learner_context: Some(learner_context),
        })
        .await
        .map_err(AppError::Other)?;

    let citations: Vec<CitationOut> = if generated.citations.is_empty() {
        knowledge::citations_from_chunks(&chunks)
            .into_iter()
            .map(|c| CitationOut {
                chunk_id: c.chunk_id,
                source_title: c.source_title,
                url: c.url,
                excerpt: c.excerpt,
            })
            .collect()
    } else {
        generated
            .citations
            .iter()
            .filter_map(|r| {
                let idx = (r.ref_index as usize).saturating_sub(1);
                chunks.get(idx).map(|c| {
                    let mut excerpt = r.excerpt.clone();
                    if excerpt.is_empty() {
                        excerpt = c.content_text.chars().take(180).collect();
                    }
                    CitationOut {
                        chunk_id: c.id,
                        source_title: format!("{} — {}", c.source_name, c.document_title),
                        url: c.source_url.clone(),
                        excerpt,
                    }
                })
            })
            .collect()
    };

    let citations_json = serde_json::to_value(&citations).unwrap_or(serde_json::json!([]));

    sqlx::query(
        r#"
        INSERT INTO chat_messages (user_id, lesson_id, role, content, citations)
        VALUES ($1, $2, 'assistant', $3, $4)
        "#,
    )
    .bind(user_id)
    .bind(body.lesson_id)
    .bind(&generated.answer)
    .bind(&citations_json)
    .execute(&state.pool)
    .await?;

    Ok(Json(ChatResponse {
        answer: generated.answer,
        citations,
        confidence: best_rank.min(1.0),
    }))
}

pub async fn history(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
    Query(q): Query<HistoryQuery>,
) -> AppResult<Json<Vec<ChatMessageOut>>> {
    let limit = q.limit.unwrap_or(20).clamp(1, 100);

    let rows = if let Some(lesson_id) = q.lesson_id {
        sqlx::query_as::<_, ChatMessageOut>(
            r#"
            SELECT id, role, content, citations, lesson_id, created_at
            FROM chat_messages
            WHERE user_id = $1 AND lesson_id = $2
            ORDER BY created_at DESC
            LIMIT $3
            "#,
        )
        .bind(user_id)
        .bind(lesson_id)
        .bind(limit)
        .fetch_all(&state.pool)
        .await?
    } else {
        sqlx::query_as::<_, ChatMessageOut>(
            r#"
            SELECT id, role, content, citations, lesson_id, created_at
            FROM chat_messages
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
        .bind(user_id)
        .bind(limit)
        .fetch_all(&state.pool)
        .await?
    };

    Ok(Json(rows))
}

#[derive(sqlx::FromRow)]
struct ProfileRow {
    profession_id: Option<Uuid>,
    preferred_language: String,
    weekly_hours: i16,
    profession_title: Option<String>,
}
