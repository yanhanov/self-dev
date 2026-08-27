use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use crate::ai::{
    AiClient, CourseOutlineRequest, DailyPlanGenRequest, LessonGenRequest,
};

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
    .bind(&outline.title)
    .bind(&outline.summary)
    .bind(outline.lessons.len() as i32)
    .fetch_one(&mut *tx)
    .await?;

    let mut first_lesson_id: Option<Uuid> = None;

    for (idx, lesson) in outline.lessons.iter().enumerate() {
        let status = if idx == 0 { "generating" } else { "locked" };
        let lesson_id: Uuid = sqlx::query_scalar(
            r#"
            INSERT INTO lessons (course_id, order_index, title, summary, status)
            VALUES ($1, $2, $3, $4, $5::lesson_status)
            RETURNING id
            "#,
        )
        .bind(course_id)
        .bind((idx + 1) as i32)
        .bind(&lesson.title)
        .bind(&lesson.summary)
        .bind(status)
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
    .bind(json!({ "course_id": course_id, "lessons": outline.lessons.len() }))
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
        INSERT INTO lesson_blocks (lesson_id, block_type, content_markdown, order_index)
        VALUES ($1, 'theory', $2, 1), ($1, 'practice', $3, 2)
        "#,
    )
    .bind(lesson_id)
    .bind(&generated.theory_markdown)
    .bind(&generated.practice_markdown)
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

    let next_lesson: Option<String> = sqlx::query_scalar(
        r#"
        SELECT l.title
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

    let plan = ai
        .generate_daily_plan(&DailyPlanGenRequest {
            profession_slug: ctx.profession_slug,
            profession_title: ctx.profession_title,
            level_slug: ctx.level_slug,
            preferred_language: ctx.preferred_language,
            weekly_hours: ctx.weekly_hours as i32,
            completed_lessons: completed,
            next_lesson_title: next_lesson,
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
        sqlx::query(
            r#"
            INSERT INTO daily_tasks (daily_plan_id, order_index, title, description, estimated_minutes)
            VALUES ($1, $2, $3, $4, $5)
            "#,
        )
        .bind(plan_id)
        .bind((idx + 1) as i32)
        .bind(&task.title)
        .bind(&task.description)
        .bind(task.estimated_minutes as i16)
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
    profession_slug: String,
    profession_title: String,
    level_slug: String,
    preferred_language: String,
    weekly_hours: i16,
}
