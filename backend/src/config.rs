#[derive(Clone)]
pub struct Config {
    pub database_url: String,
    pub port: u16,
    pub ai_service_url: String,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        Ok(Self {
            database_url: std::env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgres://selfdev:selfdev@localhost:5432/selfdev".into()),
            port: std::env::var("PORT")
                .unwrap_or_else(|_| "3000".into())
                .parse()?,
            ai_service_url: std::env::var("AI_SERVICE_URL")
                .unwrap_or_else(|_| "http://localhost:3001".into()),
        })
    }
}
