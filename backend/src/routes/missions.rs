use axum::{
    extract::{Path, State},
    Json,
};
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::curriculum::bump_user_skill;
use crate::error::{AppError, AppResult};
use crate::state::AppState;

#[derive(Debug, Serialize, sqlx::FromRow)]
struct MissionRow {
    id: Uuid,
    slug: String,
    title: String,
    goal: String,
    estimated_minutes: i16,
    concept_markdown: String,
    guided_markdown: String,
    skill_slug: String,
    skill_title: String,
    challenge_id: Option<Uuid>,
    order_index: i32,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct UserMissionRow {
    id: Uuid,
    mission_id: Uuid,
    plan_date: NaiveDate,
    status: String,
    current_phase: String,
    challenge_passed: bool,
    ai_feedback: String,
    title: String,
    goal: String,
    estimated_minutes: i16,
    concept_markdown: String,
    guided_markdown: String,
    skill_slug: String,
    skill_title: String,
    challenge_id: Option<Uuid>,
    challenge_slug: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AdvanceRequest {
    pub phase: Option<String>,
    pub challenge_passed: Option<bool>,
    pub ai_feedback: Option<String>,
    pub complete: Option<bool>,
}

pub async fn today_mission(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    let today = chrono::Utc::now().date_naive();

    let profile = sqlx::query_as::<_, (String, bool)>(
        r#"
        SELECT COALESCE(p.slug, ''), COALESCE(up.assessment_completed, false)
        FROM user_profiles up
        LEFT JOIN professions p ON p.id = up.profession_id
        WHERE up.user_id = $1
        "#,
    )
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    if profile.0 == "data_analyst" && !profile.1 {
        return Ok(Json(json!({
            "mission": null,
            "needs_assessment": true,
            "message": "Сначала пройдите assessment — миссии строятся по skill graph"
        })));
    }

    // Return existing mission for today if any
    if let Some(existing) = fetch_user_mission(&state.pool, user_id, today).await? {
        return Ok(Json(json!({ "mission": existing, "created": false })));
    }

    // Pick next incomplete authored mission by skill gaps / order
    let next = sqlx::query_as::<_, MissionRow>(
        r#"
        SELECT
            m.id, m.slug, m.title, m.goal, m.estimated_minutes,
            m.concept_markdown, m.guided_markdown,
            s.slug AS skill_slug, s.title AS skill_title,
            m.challenge_id, m.order_index
        FROM missions m
        JOIN skills s ON s.id = m.skill_id
        JOIN user_profiles up ON up.profession_id = m.profession_id
        WHERE up.user_id = $1
          AND NOT EXISTS (
            SELECT 1 FROM user_missions um
            WHERE um.user_id = $1 AND um.mission_id = m.id AND um.status = 'completed'
          )
        ORDER BY
          COALESCE((SELECT score FROM user_skills us WHERE us.user_id = $1 AND us.skill_id = m.skill_id), 0) ASC,
          m.order_index ASC
        LIMIT 1
        "#,
    )
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await?;

    let Some(mission) = next else {
        return Ok(Json(json!({
            "mission": null,
            "message": "Все миссии пройдены — время для portfolio project"
        })));
    };

    // Adaptation rule: if 2+ recent mistakes on this skill, prefer this mission (already ordered by low score)
    let mistake_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*) FROM user_skill_events
        WHERE user_id = $1 AND skill_id = (SELECT skill_id FROM missions WHERE id = $2)
          AND event_type = 'mistake'
          AND created_at > now() - interval '14 days'
        "#,
    )
    .bind(user_id)
    .bind(mission.id)
    .fetch_one(&state.pool)
    .await?;

    let um_id: Uuid = sqlx::query_scalar(
        r#"
        INSERT INTO user_missions (user_id, mission_id, plan_date, status, current_phase, started_at)
        VALUES ($1, $2, $3, 'in_progress', 'concept', now())
        ON CONFLICT (user_id, mission_id, plan_date) DO UPDATE SET status = user_missions.status
        RETURNING id
        "#,
    )
    .bind(user_id)
    .bind(mission.id)
    .bind(today)
    .fetch_one(&state.pool)
    .await?;

    let existing = fetch_user_mission_by_id(&state.pool, um_id).await?.ok_or(AppError::NotFound)?;

    Ok(Json(json!({
        "mission": existing,
        "created": true,
        "adaptation": if mistake_count >= 2 {
            json!({"focus_skill": mission.skill_slug, "reason": "Повторные ошибки — закрепляем этот навык"})
        } else {
            Value::Null
        }
    })))
}

pub async fn get_mission(
    State(state): State<AppState>,
    Path((user_id, user_mission_id)): Path<(Uuid, Uuid)>,
) -> AppResult<Json<UserMissionRow>> {
    let row = fetch_user_mission_by_id(&state.pool, user_mission_id)
        .await?
        .ok_or(AppError::NotFound)?;
    if row_user_id(&state.pool, user_mission_id).await? != Some(user_id) {
        return Err(AppError::NotFound);
    }
    Ok(Json(row))
}

pub async fn advance(
    State(state): State<AppState>,
    Path((user_id, user_mission_id)): Path<(Uuid, Uuid)>,
    Json(body): Json<AdvanceRequest>,
) -> AppResult<Json<Value>> {
    let owner = row_user_id(&state.pool, user_mission_id).await?;
    if owner != Some(user_id) {
        return Err(AppError::NotFound);
    }

    if body.complete.unwrap_or(false) {
        let skill_id: Uuid = sqlx::query_scalar(
            r#"
            SELECT m.skill_id FROM user_missions um
            JOIN missions m ON m.id = um.mission_id
            WHERE um.id = $1
            "#,
        )
        .bind(user_mission_id)
        .fetch_one(&state.pool)
        .await?;

        sqlx::query(
            r#"
            UPDATE user_missions
            SET status = 'completed',
                current_phase = 'feedback',
                challenge_passed = COALESCE($2, challenge_passed),
                ai_feedback = COALESCE($3, ai_feedback),
                completed_at = now()
            WHERE id = $1
            "#,
        )
        .bind(user_mission_id)
        .bind(body.challenge_passed)
        .bind(&body.ai_feedback)
        .execute(&state.pool)
        .await?;

        let delta = if body.challenge_passed.unwrap_or(false) {
            8.0
        } else {
            3.0
        };
        bump_user_skill(
            &state.pool,
            user_id,
            skill_id,
            delta,
            "mission",
            json!({"user_mission_id": user_mission_id}),
        )
        .await
        .map_err(AppError::Other)?;

        return Ok(Json(json!({ "status": "completed", "skill_delta": delta })));
    }

    if let Some(phase) = &body.phase {
        sqlx::query(
            r#"
            UPDATE user_missions
            SET current_phase = $2::mission_phase,
                challenge_passed = COALESCE($3, challenge_passed),
                ai_feedback = COALESCE($4, ai_feedback)
            WHERE id = $1
            "#,
        )
        .bind(user_mission_id)
        .bind(phase)
        .bind(body.challenge_passed)
        .bind(&body.ai_feedback)
        .execute(&state.pool)
        .await?;
    }

    let row = fetch_user_mission_by_id(&state.pool, user_mission_id)
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(Json(json!({ "mission": row })))
}

async fn row_user_id(pool: &sqlx::PgPool, user_mission_id: Uuid) -> AppResult<Option<Uuid>> {
    Ok(sqlx::query_scalar("SELECT user_id FROM user_missions WHERE id = $1")
        .bind(user_mission_id)
        .fetch_optional(pool)
        .await?)
}

async fn fetch_user_mission(
    pool: &sqlx::PgPool,
    user_id: Uuid,
    day: NaiveDate,
) -> AppResult<Option<UserMissionRow>> {
    Ok(sqlx::query_as::<_, UserMissionRow>(
        r#"
        SELECT
            um.id, um.mission_id, um.plan_date, um.status::text AS status,
            um.current_phase::text AS current_phase, um.challenge_passed, um.ai_feedback,
            m.title, m.goal, m.estimated_minutes, m.concept_markdown, m.guided_markdown,
            s.slug AS skill_slug, s.title AS skill_title,
            m.challenge_id, pc.slug AS challenge_slug
        FROM user_missions um
        JOIN missions m ON m.id = um.mission_id
        JOIN skills s ON s.id = m.skill_id
        LEFT JOIN practice_challenges pc ON pc.id = m.challenge_id
        WHERE um.user_id = $1 AND um.plan_date = $2
          AND um.status != 'completed'
        ORDER BY um.started_at DESC NULLS LAST
        LIMIT 1
        "#,
    )
    .bind(user_id)
    .bind(day)
    .fetch_optional(pool)
    .await?)
}

async fn fetch_user_mission_by_id(
    pool: &sqlx::PgPool,
    id: Uuid,
) -> AppResult<Option<UserMissionRow>> {
    Ok(sqlx::query_as::<_, UserMissionRow>(
        r#"
        SELECT
            um.id, um.mission_id, um.plan_date, um.status::text AS status,
            um.current_phase::text AS current_phase, um.challenge_passed, um.ai_feedback,
            m.title, m.goal, m.estimated_minutes, m.concept_markdown, m.guided_markdown,
            s.slug AS skill_slug, s.title AS skill_title,
            m.challenge_id, pc.slug AS challenge_slug
        FROM user_missions um
        JOIN missions m ON m.id = um.mission_id
        JOIN skills s ON s.id = m.skill_id
        LEFT JOIN practice_challenges pc ON pc.id = m.challenge_id
        WHERE um.id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await?)
}
