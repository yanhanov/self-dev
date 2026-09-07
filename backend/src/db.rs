use sqlx::PgPool;

pub async fn connect(database_url: &str) -> anyhow::Result<PgPool> {
    let pool = PgPool::connect(database_url).await?;
    Ok(pool)
}

pub async fn run_migrations(pool: &PgPool) -> anyhow::Result<()> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS _migrations (
            name TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        "#,
    )
    .execute(pool)
    .await?;

    let migrations = [
        "001_initial_schema.sql",
        "002_seed_data.sql",
        "003_ai_learning.sql",
        "004_knowledge_base.sql",
        "005_knowledge_seed.sql",
        "006_data_analyst_foundation.sql",
        "007_assessment_and_skills.sql",
        "008_missions_and_practice.sql",
        "009_projects_and_readiness.sql",
        "010_data_analyst_knowledge.sql",
    ];

    for name in migrations {
        let applied: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM _migrations WHERE name = $1)")
            .bind(name)
            .fetch_one(pool)
            .await?;

        if applied {
            tracing::debug!("migration already applied: {name}");
            continue;
        }

        let sql = std::fs::read_to_string(format!("migrations/{name}"))?;
        tracing::info!("applying migration: {name}");

        let mut tx = pool.begin().await?;
        sqlx::raw_sql(&sql).execute(&mut *tx).await?;
        sqlx::query("INSERT INTO _migrations (name) VALUES ($1)")
            .bind(name)
            .execute(&mut *tx)
            .await?;
        tx.commit().await?;
    }

    Ok(())
}
