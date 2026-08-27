use axum::{
    extract::{Path, State},
    Json,
};
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::jobs::ensure_daily_plan;
use crate::models::{DailyPlan, DailyTask, TodayResponse};
use crate::state::AppState;

pub async fn get_today(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
) -> AppResult<Json<TodayResponse>> {
    let profile_exists: bool =
        sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM user_profiles WHERE user_id = $1 AND profession_id IS NOT NULL)")
            .bind(user_id)
            .fetch_one(&state.pool)
            .await?;

    if !profile_exists {
        return Err(AppError::NotFound);
    }

    let (plan_id, _) = ensure_daily_plan(&state.pool, &state.ai, user_id)
        .await
        .map_err(AppError::Other)?;

    let plan = sqlx::query_as::<_, DailyPlan>(
        r#"
        SELECT id, user_id, plan_date, summary
        FROM daily_plans WHERE id = $1
        "#,
    )
    .bind(plan_id)
    .fetch_one(&state.pool)
    .await?;

    let tasks = sqlx::query_as::<_, DailyTask>(
        r#"
        SELECT id, daily_plan_id, order_index, title, description,
               estimated_minutes, status::text AS status, lesson_id
        FROM daily_tasks
        WHERE daily_plan_id = $1
        ORDER BY order_index
        "#,
    )
    .bind(plan_id)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(TodayResponse { plan, tasks }))
}

pub async fn complete_task(
    State(state): State<AppState>,
    Path((user_id, task_id)): Path<(Uuid, Uuid)>,
) -> AppResult<Json<DailyTask>> {
    let belongs: bool = sqlx::query_scalar(
        r#"
        SELECT EXISTS(
            SELECT 1 FROM daily_tasks t
            JOIN daily_plans p ON p.id = t.daily_plan_id
            WHERE t.id = $1 AND p.user_id = $2
        )
        "#,
    )
    .bind(task_id)
    .bind(user_id)
    .fetch_one(&state.pool)
    .await?;

    if !belongs {
        return Err(AppError::NotFound);
    }

    let task = sqlx::query_as::<_, DailyTask>(
        r#"
        UPDATE daily_tasks
        SET status = 'done'
        WHERE id = $1
        RETURNING id, daily_plan_id, order_index, title, description,
                  estimated_minutes, status::text AS status, lesson_id
        "#,
    )
    .bind(task_id)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(task))
}
