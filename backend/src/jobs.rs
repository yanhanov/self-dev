use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use crate::ai::{
    AiClient, CourseOutlineRequest, DailyPlanGenRequest, LessonGenRequest,
    VerifiedContextItem,
};
use crate::curriculum::{self, PlannedLesson};
use crate::knowledge::{self, MIN_LESSON_CHUNKS};

pub async fn run_course_outline_job(
    pool: PgPool,
    ai: AiClient,
    user_id: Uuid,
    job_id: Uuid,
) {
    if let Err(err) = generate_course_outline_inner(&pool, &ai, user_id, job_id).await {
        tracing::error!("course outline job {job_id} failed: {err:#}");
        let _ = sqlx::query(
            r#"
            UPDATE generation_jobs
            SET status = 'failed', error = $2, updated_at = now()
            WHERE id = $1
            "#,
        )
        .bind(job_id)
        .bind(err.to_string())
        .execute(&pool)
        .await;

        let _ = sqlx::query(
            r#"
            UPDATE user_profiles
            SET generation_status = 'failed', updated_at = now()
            WHERE user_id = $1
            "#,
        )
        .bind(user_id)
        .execute(&pool)
        .await;
    }
}

async fn generate_course_outline_inner(
    pool: &PgPool,
    ai: &AiClient,
    user_id: Uuid,
    job_id: Uuid,
) -> anyhow::Result<()> {
    sqlx::query(
        r#"
        UPDATE generation_jobs SET status = 'running', updated_at = now() WHERE id = $1
        "#,
    )
    .bind(job_id)
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        UPDATE user_profiles
        SET generation_status = 'generating', updated_at = now()
        WHERE user_id = $1
        "#,
    )
    .bind(user_id)
    .execute(pool)
    .await?;

    let ctx = sqlx::query_as::<_, ContextRow>(
        r#"
        SELECT
            p.slug AS profession_slug,
            p.title AS profession_title,
            p.id AS profession_id,
            sl.slug AS level_slug,
            sl.title AS level_title,
            sl.description AS level_description,
            sl.id AS skill_level_id,
            COALESCE(up.preferred_language, 'ru') AS preferred_language,
            COALESCE(up.weekly_hours, 10::smallint) AS weekly_hours
        FROM user_profiles up
        JOIN professions p ON p.id = up.profession_id
        JOIN skill_levels sl ON sl.id = up.skill_level_id
        WHERE up.user_id = $1
        "#,
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    // Data Analyst: authored gap-based modules. Others: AI outline.
    let (title, summary, lesson_specs): (String, String, Vec<LessonSpec>) =
        if ctx.profession_slug == "data_analyst" {
            let planned = curriculum::plan_modules_for_user(pool, user_id, ctx.profession_id).await?;
            let included: Vec<&PlannedLesson> = planned.iter().filter(|p| p.include).collect();
            let title = "Data Analyst: путь под ваши gaps".to_string();
            let summary = format!(
                "Персональный roadmap: {} модулей (пропущено {} сильных зон). ~{} ч/нед.",
                included.len(),
                planned.len().saturating_sub(included.len()),
                ctx.weekly_hours
            );
            let specs = included
                .into_iter()
                .map(|p| LessonSpec {
                    title: p.module.title.clone(),
                    summary: format!("{} · режим {}", p.module.summary, p.intensity),
                    skill_id: Some(p.module.skill_id),
                    module_id: Some(p.module.id),
                    intensity: Some(p.intensity.to_string()),
                })
                .collect();
            (title, summary, specs)
        } else {
            let outline = ai
                .generate_course_outline(&CourseOutlineRequest {
                    profession_slug: ctx.profession_slug.clone(),
                    profession_title: ctx.profession_title.clone(),
                    level_slug: ctx.level_slug.clone(),
                    level_title: ctx.level_title.clone(),
                    level_description: ctx.level_description.clone(),
                    preferred_language: ctx.preferred_language.clone(),
                    weekly_hours: ctx.weekly_hours as i32,
                })
                .await?;
            let specs = outline
                .lessons
                .into_iter()
                .map(|l| LessonSpec {
                    title: l.title,
                    summary: l.summary,
                    skill_id: None,
                    module_id: None,
                    intensity: None,
                })
                .collect();
            (outline.title, outline.summary, specs)
        };

    let mut tx = pool.begin().await?;

    sqlx::query("DELETE FROM courses WHERE user_id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

    let course_id: Uuid = sqlx::query_scalar(
        r#"
        INSERT INTO courses (user_id, profession_id, skill_level_id, title, summary, total_lessons)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
        "#,
    )
    .bind(user_id)
    .bind(ctx.profession_id)
    .bind(ctx.skill_level_id)
    .bind(&title)
    .bind(&summary)
    .bind(lesson_specs.len() as i32)
    .fetch_one(&mut *tx)
    .await?;

    let mut first_lesson_id: Option<Uuid> = None;

    for (idx, lesson) in lesson_specs.iter().enumerate() {
        let status = if idx == 0 { "generating" } else { "locked" };
        let lesson_id: Uuid = sqlx::query_scalar(
            r#"
            INSERT INTO lessons (
                course_id, order_index, title, summary, status,
                skill_id, module_id, intensity
            )
            VALUES (
                $1, $2, $3, $4, $5::lesson_status,
                $6, $7, $8::module_intensity
            )
            RETURNING id
            "#,
        )
        .bind(course_id)
        .bind((idx + 1) as i32)
        .bind(&lesson.title)
        .bind(&lesson.summary)
        .bind(status)
        .bind(lesson.skill_id)
        .bind(lesson.module_id)
        .bind(lesson.intensity.as_deref())
        .fetch_one(&mut *tx)
        .await?;

        if idx == 0 {
            first_lesson_id = Some(lesson_id);
        }
    }

    sqlx::query(
        r#"
        UPDATE generation_jobs
        SET status = 'done', result = $2, updated_at = now()
        WHERE id = $1
        "#,
    )
    .bind(job_id)
    .bind(json!({ "course_id": course_id, "lessons": lesson_specs.len() }))
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        r#"
        UPDATE user_profiles
        SET generation_status = 'ready', updated_at = now()
        WHERE user_id = $1
        "#,
    )
    .bind(user_id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    if let Some(lesson_id) = first_lesson_id {
        let pool2 = pool.clone();
        let ai2 = ai.clone();
        tokio::spawn(async move {
            if let Err(err) = generate_lesson_content(&pool2, &ai2, user_id, lesson_id).await {
                tracing::error!("first lesson generation failed: {err:#}");
            }
        });
    }

    Ok(())
}

struct LessonSpec {
    title: String,
    summary: String,
    skill_id: Option<Uuid>,
    module_id: Option<Uuid>,
    intensity: Option<String>,
}

#[derive(sqlx::FromRow)]
struct ContextRow {
    profession_slug: String,
    profession_title: String,
    profession_id: Uuid,
    level_slug: String,
    level_title: String,
    level_description: String,
    skill_level_id: Uuid,
    preferred_language: String,
    weekly_hours: i16,
}

pub async fn generate_lesson_content(
    pool: &PgPool,
    ai: &AiClient,
    user_id: Uuid,
    lesson_id: Uuid,
) -> anyhow::Result<()> {
    sqlx::query(
        r#"
        UPDATE lessons SET status = 'generating', updated_at = now() WHERE id = $1
        "#,
    )
    .bind(lesson_id)
    .execute(pool)
    .await?;

    let job_id: Uuid = sqlx::query_scalar(
        r#"
        INSERT INTO generation_jobs (user_id, job_type, status, lesson_id, payload)
        VALUES ($1, 'lesson', 'running', $2, '{}'::jsonb)
        RETURNING id
        "#,
    )
    .bind(user_id)
    .bind(lesson_id)
    .fetch_one(pool)
    .await?;

    let row = sqlx::query_as::<_, LessonCtx>(
        r#"
        SELECT
            l.id AS lesson_id,
            l.title AS lesson_title,
            l.summary AS lesson_summary,
            c.title AS course_title,
            c.profession_id,
            p.slug AS profession_slug,
            p.title AS profession_title,
            sl.slug AS level_slug,
            sl.title AS level_title,
            COALESCE(up.preferred_language, 'ru') AS preferred_language
        FROM lessons l
        JOIN courses c ON c.id = l.course_id
        JOIN professions p ON p.id = c.profession_id
        JOIN skill_levels sl ON sl.id = c.skill_level_id
        JOIN user_profiles up ON up.user_id = c.user_id
        WHERE l.id = $1 AND c.user_id = $2
        "#,
    )
    .bind(lesson_id)
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    let chunks = knowledge::retrieve_for_lesson(
        pool,
        row.profession_id,
        &row.lesson_title,
        &row.lesson_summary,
        8,
    )
    .await?;

    if chunks.len() < MIN_LESSON_CHUNKS {
        let err_msg = "Недостаточно материала в базе знаний для генерации урока";
        sqlx::query(
            r#"
            UPDATE generation_jobs
            SET status = 'failed', error = $2, updated_at = now()
            WHERE id = $1
            "#,
        )
        .bind(job_id)
        .bind(err_msg)
        .execute(pool)
        .await?;
        sqlx::query(
            r#"
            UPDATE lessons SET status = 'locked', updated_at = now() WHERE id = $1
            "#,
        )
        .bind(lesson_id)
        .execute(pool)
        .await?;
        anyhow::bail!("{err_msg}");
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

    let generated = match ai
        .generate_lesson(&LessonGenRequest {
            profession_slug: row.profession_slug,
            profession_title: row.profession_title,
            level_slug: row.level_slug,
            level_title: row.level_title,
            preferred_language: row.preferred_language,
            lesson_title: row.lesson_title,
            lesson_summary: row.lesson_summary,
            course_title: row.course_title,
            verified_context: verified_context.clone(),
        })
        .await
    {
        Ok(v) => v,
        Err(err) => {
            sqlx::query(
                r#"
                UPDATE generation_jobs
                SET status = 'failed', error = $2, updated_at = now()
                WHERE id = $1
                "#,
            )
            .bind(job_id)
            .bind(err.to_string())
            .execute(pool)
            .await?;
            sqlx::query(
                r#"
                UPDATE lessons SET status = 'locked', updated_at = now() WHERE id = $1
                "#,
            )
            .bind(lesson_id)
            .execute(pool)
            .await?;
            return Err(err);
        }
    };

    // Build source_refs JSON from AI refs mapped back to chunks, or all retrieved chunks
    let source_refs = if generated.source_refs.is_empty() {
        serde_json::to_value(knowledge::citations_from_chunks(&chunks))?
    } else {
        let mapped: Vec<_> = generated
            .source_refs
            .iter()
            .filter_map(|r| {
                let idx = (r.ref_index as usize).saturating_sub(1);
                chunks.get(idx).map(|c| {
                    let mut cite = c.to_source_ref();
                    if !r.excerpt.is_empty() {
                        cite.excerpt = r.excerpt.clone();
                    }
                    cite
                })
            })
            .collect();
        if mapped.is_empty() {
            serde_json::to_value(knowledge::citations_from_chunks(&chunks))?
        } else {
            serde_json::to_value(mapped)?
        }
    };

    let mut tx = pool.begin().await?;

    sqlx::query("DELETE FROM lesson_blocks WHERE lesson_id = $1")
        .bind(lesson_id)
        .execute(&mut *tx)
        .await?;
    sqlx::query("DELETE FROM quiz_questions WHERE lesson_id = $1")
        .bind(lesson_id)
        .execute(&mut *tx)
        .await?;

    sqlx::query(
        r#"
        INSERT INTO lesson_blocks (lesson_id, block_type, content_markdown, order_index, source_refs)
        VALUES
            ($1, 'theory', $2, 1, $4),
            ($1, 'practice', $3, 2, '[]'::jsonb)
        "#,
    )
    .bind(lesson_id)
    .bind(&generated.theory_markdown)
    .bind(&generated.practice_markdown)
    .bind(&source_refs)
    .execute(&mut *tx)
    .await?;

    for (idx, q) in generated.quiz.iter().enumerate() {
        let options = serde_json::to_value(&q.options)?;
        sqlx::query(
            r#"
            INSERT INTO quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
            VALUES ($1, $2, $3, $4, $5, $6)
            "#,
        )
        .bind(lesson_id)
        .bind((idx + 1) as i32)
        .bind(&q.question)
        .bind(options)
        .bind(q.correct_index)
        .bind(&q.explanation)
        .execute(&mut *tx)
        .await?;
    }

    sqlx::query(
        r#"
        UPDATE lessons SET status = 'ready', updated_at = now() WHERE id = $1
        "#,
    )
    .bind(lesson_id)
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        r#"
        UPDATE generation_jobs
        SET status = 'done', updated_at = now()
        WHERE id = $1
        "#,
    )
    .bind(job_id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok(())
}

#[derive(sqlx::FromRow)]
struct LessonCtx {
    #[allow(dead_code)]
    lesson_id: Uuid,
    lesson_title: String,
    lesson_summary: String,
    course_title: String,
    profession_id: Uuid,
    profession_slug: String,
    profession_title: String,
    level_slug: String,
    level_title: String,
    preferred_language: String,
}

pub async fn ensure_daily_plan(
    pool: &PgPool,
    ai: &AiClient,
    user_id: Uuid,
) -> anyhow::Result<(Uuid, String)> {
    if let Some(existing) = sqlx::query_as::<_, ExistingPlan>(
        r#"
        SELECT id, summary FROM daily_plans
        WHERE user_id = $1 AND plan_date = CURRENT_DATE
        "#,
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    {
        return Ok((existing.id, existing.summary));
    }

    let ctx = sqlx::query_as::<_, DailyCtx>(
        r#"
        SELECT
            p.id AS profession_id,
            p.slug AS profession_slug,
            p.title AS profession_title,
            sl.slug AS level_slug,
            COALESCE(up.preferred_language, 'ru') AS preferred_language,
            COALESCE(up.weekly_hours, 10::smallint) AS weekly_hours
        FROM user_profiles up
        JOIN professions p ON p.id = up.profession_id
        JOIN skill_levels sl ON sl.id = up.skill_level_id
        WHERE up.user_id = $1
        "#,
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    let completed: Vec<String> = sqlx::query_scalar(
        r#"
        SELECT l.title
        FROM lessons l
        JOIN courses c ON c.id = l.course_id
        WHERE c.user_id = $1 AND l.status = 'completed'
        ORDER BY l.order_index
        "#,
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    let next_lesson_row = sqlx::query_as::<_, NextLessonRow>(
        r#"
        SELECT l.id, l.title
        FROM lessons l
        JOIN courses c ON c.id = l.course_id
        WHERE c.user_id = $1 AND l.status IN ('ready', 'generating', 'in_progress', 'locked')
        ORDER BY l.order_index
        LIMIT 1
        "#,
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?;

    let next_lesson_title = next_lesson_row.as_ref().map(|r| r.title.clone());
    let next_lesson_id = next_lesson_row.as_ref().map(|r| r.id);

    let plan_chunks = knowledge::retrieve_for_lesson(
        pool,
        ctx.profession_id,
        next_lesson_title.as_deref().unwrap_or("daily practice"),
        "",
        5,
    )
    .await
    .unwrap_or_default();

    let verified_context: Vec<VerifiedContextItem> = plan_chunks
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

    let plan = ai
        .generate_daily_plan(&DailyPlanGenRequest {
            profession_slug: ctx.profession_slug,
            profession_title: ctx.profession_title,
            level_slug: ctx.level_slug,
            preferred_language: ctx.preferred_language,
            weekly_hours: ctx.weekly_hours as i32,
            completed_lessons: completed,
            next_lesson_title: next_lesson_title.clone(),
            verified_context,
        })
        .await?;

    let mut tx = pool.begin().await?;
    let plan_id: Uuid = sqlx::query_scalar(
        r#"
        INSERT INTO daily_plans (user_id, plan_date, summary)
        VALUES ($1, CURRENT_DATE, $2)
        RETURNING id
        "#,
    )
    .bind(user_id)
    .bind(&plan.summary)
    .fetch_one(&mut *tx)
    .await?;

    for (idx, task) in plan.tasks.iter().enumerate() {
        let lesson_id = if idx == 0 { next_lesson_id } else { None };
        sqlx::query(
            r#"
            INSERT INTO daily_tasks (daily_plan_id, order_index, title, description, estimated_minutes, lesson_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            "#,
        )
        .bind(plan_id)
        .bind((idx + 1) as i32)
        .bind(&task.title)
        .bind(&task.description)
        .bind(task.estimated_minutes as i16)
        .bind(lesson_id)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    Ok((plan_id, plan.summary))
}

#[derive(sqlx::FromRow)]
struct ExistingPlan {
    id: Uuid,
    summary: String,
}

#[derive(sqlx::FromRow)]
struct DailyCtx {
    profession_id: Uuid,
    profession_slug: String,
    profession_title: String,
    level_slug: String,
    preferred_language: String,
    weekly_hours: i16,
}

#[derive(sqlx::FromRow)]
struct NextLessonRow {
    id: Uuid,
    title: String,
}
