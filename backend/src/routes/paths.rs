use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::models::{LearningPath, LearningPathStep, ResourceSummary};

#[derive(Debug, Deserialize)]
pub struct PathQuery {
    pub goal: Option<String>,
    pub level: Option<String>,
}

#[derive(sqlx::FromRow)]
struct StepRow {
    id: Uuid,
    path_id: Uuid,
    order_index: i32,
    title: String,
    skill_id: Option<Uuid>,
    skill_title: Option<String>,
    resource_id: Option<Uuid>,
    r_title: Option<String>,
    r_url: Option<String>,
    r_type: Option<String>,
    r_source: Option<String>,
    project_brief: Option<String>,
    estimated_days: Option<i16>,
}

pub async fn list_paths(
    State(pool): State<PgPool>,
    Query(query): Query<PathQuery>,
) -> AppResult<Json<Vec<LearningPath>>> {
    let rows = match (&query.goal, &query.level) {
        (Some(goal), Some(level)) => {
            sqlx::query_as::<_, LearningPath>(
                r#"
                SELECT
                    lp.id, lp.goal_id, lp.skill_level_id, lp.title, lp.description,
                    g.slug AS goal_slug, g.title AS goal_title,
                    sl.slug AS level_slug, sl.title AS level_title
                FROM learning_paths lp
                JOIN goals g ON g.id = lp.goal_id
                JOIN skill_levels sl ON sl.id = lp.skill_level_id
                WHERE g.slug = $1 AND sl.slug = $2
                ORDER BY g.title, sl.order_index
                "#,
            )
            .bind(goal)
            .bind(level)
            .fetch_all(&pool)
            .await?
        }
        _ => {
            sqlx::query_as::<_, LearningPath>(
                r#"
                SELECT
                    lp.id, lp.goal_id, lp.skill_level_id, lp.title, lp.description,
                    g.slug AS goal_slug, g.title AS goal_title,
                    sl.slug AS level_slug, sl.title AS level_title
                FROM learning_paths lp
                JOIN goals g ON g.id = lp.goal_id
                JOIN skill_levels sl ON sl.id = lp.skill_level_id
                ORDER BY g.title, sl.order_index
                "#,
            )
            .fetch_all(&pool)
            .await?
        }
    };

    Ok(Json(rows))
}

pub async fn list_path_steps(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Vec<LearningPathStep>>> {
    let path_exists: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM learning_paths WHERE id = $1)")
        .bind(id)
        .fetch_one(&pool)
        .await?;

    if !path_exists {
        return Err(AppError::NotFound);
    }

    let rows = sqlx::query_as::<_, StepRow>(
        r#"
        SELECT
            s.id, s.path_id, s.order_index, s.title,
            s.skill_id, sk.title AS skill_title,
            s.resource_id,
            r.title AS r_title,
            r.url AS r_url,
            r.resource_type::text AS r_type,
            r.source_name AS r_source,
            s.project_brief, s.estimated_days
        FROM learning_path_steps s
        LEFT JOIN skills sk ON sk.id = s.skill_id
        LEFT JOIN resources r ON r.id = s.resource_id
        WHERE s.path_id = $1
        ORDER BY s.order_index
        "#,
    )
    .bind(id)
    .fetch_all(&pool)
    .await?;

    let steps = rows
        .into_iter()
        .map(|row| {
            let resource = row.resource_id.map(|rid| ResourceSummary {
                id: rid,
                title: row.r_title.clone().unwrap_or_default(),
                url: row.r_url.clone().unwrap_or_default(),
                resource_type: row.r_type.clone().unwrap_or_default(),
                source_name: row.r_source.clone(),
            });

            LearningPathStep {
                id: row.id,
                path_id: row.path_id,
                order_index: row.order_index,
                title: row.title,
                skill_id: row.skill_id,
                skill_title: row.skill_title,
                resource_id: row.resource_id,
                resource,
                project_brief: row.project_brief,
                estimated_days: row.estimated_days,
            }
        })
        .collect();

    Ok(Json(steps))
}
