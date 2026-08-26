use axum::{extract::State, Json};
use serde_json::{json, Value};
use sqlx::PgPool;

pub async fn health(State(pool): State<PgPool>) -> Json<Value> {
    let db_ok = sqlx::query_scalar::<_, i32>("SELECT 1")
        .fetch_one(&pool)
        .await
        .is_ok();

    Json(json!({
        "status": if db_ok { "ok" } else { "degraded" },
        "database": db_ok
    }))
}
