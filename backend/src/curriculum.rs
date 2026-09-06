use serde::Serialize;
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, Clone, sqlx::FromRow, Serialize)]
pub struct ModulePlan {
    pub id: Uuid,
    pub slug: String,
    pub title: String,
    pub summary: String,
    pub skill_id: Uuid,
    pub skill_slug: String,
    pub skill_title: String,
    pub order_index: i32,
    pub skip_threshold: f64,
    pub intensive_threshold: f64,
    pub estimated_minutes: i32,
    pub user_score: Option<f64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct PlannedLesson {
    pub module: ModulePlan,
    pub intensity: &'static str,
    pub include: bool,
}

/// Build gap-based lesson plan from authored modules + user_skills.
pub async fn plan_modules_for_user(
    pool: &PgPool,
    user_id: Uuid,
    profession_id: Uuid,
) -> anyhow::Result<Vec<PlannedLesson>> {
    let modules = sqlx::query_as::<_, ModulePlan>(
        r#"
        SELECT
            cm.id,
            cm.slug,
            cm.title,
            cm.summary,
            cm.skill_id,
            s.slug AS skill_slug,
            s.title AS skill_title,
            cm.order_index,
            cm.skip_threshold::float8 AS skip_threshold,
            cm.intensive_threshold::float8 AS intensive_threshold,
            cm.estimated_minutes,
            us.score::float8 AS user_score
        FROM curriculum_modules cm
        JOIN skills s ON s.id = cm.skill_id
        LEFT JOIN user_skills us ON us.skill_id = cm.skill_id AND us.user_id = $1
        WHERE cm.profession_id = $2
        ORDER BY cm.order_index
        "#,
    )
    .bind(user_id)
    .bind(profession_id)
    .fetch_all(pool)
    .await?;

    let mut planned = Vec::new();
    for m in modules {
        let score = m.user_score.unwrap_or(0.0);
        // Capstone (skip_threshold > 100) always included
        let include = score < m.skip_threshold;
        let intensity = if !include {
            "skip"
        } else if score < m.intensive_threshold {
            "intensive"
        } else if score >= m.skip_threshold - 15.0 {
            "light"
        } else {
            "practice"
        };
        planned.push(PlannedLesson {
            module: m,
            intensity,
            include,
        });
    }
    Ok(planned)
}

pub async fn upsert_user_skill(
    pool: &PgPool,
    user_id: Uuid,
    skill_id: Uuid,
    score: f64,
    confidence: f64,
    source: &str,
) -> anyhow::Result<()> {
    sqlx::query(
        r#"
        INSERT INTO user_skills (user_id, skill_id, score, confidence, source, updated_at)
        VALUES ($1, $2, $3, $4, $5::skill_score_source, now())
        ON CONFLICT (user_id, skill_id) DO UPDATE SET
            score = EXCLUDED.score,
            confidence = GREATEST(user_skills.confidence, EXCLUDED.confidence),
            source = EXCLUDED.source,
            updated_at = now()
        "#,
    )
    .bind(user_id)
    .bind(skill_id)
    .bind(score)
    .bind(confidence)
    .bind(source)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn bump_user_skill(
    pool: &PgPool,
    user_id: Uuid,
    skill_id: Uuid,
    delta: f64,
    source: &str,
    detail: serde_json::Value,
) -> anyhow::Result<()> {
    sqlx::query(
        r#"
        INSERT INTO user_skills (user_id, skill_id, score, confidence, source, updated_at)
        VALUES ($1, $2, LEAST(100, GREATEST(0, $3)), 0.6, $4::skill_score_source, now())
        ON CONFLICT (user_id, skill_id) DO UPDATE SET
            score = LEAST(100, GREATEST(0, user_skills.score + $3)),
            confidence = LEAST(1, user_skills.confidence + 0.05),
            source = EXCLUDED.source,
            updated_at = now()
        "#,
    )
    .bind(user_id)
    .bind(skill_id)
    .bind(delta)
    .bind(source)
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO user_skill_events (user_id, skill_id, event_type, delta, detail)
        VALUES ($1, $2, $3, $4, $5)
        "#,
    )
    .bind(user_id)
    .bind(skill_id)
    .bind(source)
    .bind(delta)
    .bind(detail)
    .execute(pool)
    .await?;
    Ok(())
}

#[derive(Debug, Serialize)]
pub struct ReadinessReport {
    pub overall: f64,
    pub technical: f64,
    pub projects: f64,
    pub consistency: f64,
    pub gaps: Vec<ReadinessGap>,
}

#[derive(Debug, Serialize, Clone)]
pub struct ReadinessGap {
    pub skill_slug: String,
    pub skill_title: String,
    pub score: f64,
    pub hint: String,
}

pub async fn compute_readiness(pool: &PgPool, user_id: Uuid) -> anyhow::Result<ReadinessReport> {
    let skills: Vec<(String, String, f64)> = sqlx::query_as(
        r#"
        SELECT s.slug, s.title, COALESCE(us.score, 0)::float8
        FROM profession_skills ps
        JOIN user_profiles up ON up.profession_id = ps.profession_id
        JOIN skills s ON s.id = ps.skill_id
        LEFT JOIN user_skills us ON us.skill_id = s.id AND us.user_id = up.user_id
        WHERE up.user_id = $1
        ORDER BY ps.order_index
        "#,
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    let technical = if skills.is_empty() {
        0.0
    } else {
        skills.iter().map(|(_, _, s)| *s).sum::<f64>() / skills.len() as f64
    };

    let project_score: Option<f64> = sqlx::query_scalar(
        r#"
        SELECT COALESCE(AVG(overall_score), 0)::float8
        FROM user_projects
        WHERE user_id = $1 AND status = 'scored'
        "#,
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;
    let projects = project_score.unwrap_or(0.0);

    let missions_done: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*) FROM user_missions
        WHERE user_id = $1 AND status = 'completed'
        "#,
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;
    let consistency = (missions_done as f64 * 15.0).min(100.0);

    let overall = technical * 0.5 + projects * 0.3 + consistency * 0.2;

    let mut gaps: Vec<ReadinessGap> = skills
        .into_iter()
        .filter(|(_, _, s)| *s < 70.0)
        .map(|(slug, title, score)| ReadinessGap {
            hint: format!("Подтяните {title} — сейчас {score:.0}%"),
            skill_slug: slug,
            skill_title: title,
            score,
        })
        .collect();
    gaps.sort_by(|a, b| a.score.partial_cmp(&b.score).unwrap_or(std::cmp::Ordering::Equal));
    gaps.truncate(3);

    Ok(ReadinessReport {
        overall,
        technical,
        projects,
        consistency,
        gaps,
    })
}
