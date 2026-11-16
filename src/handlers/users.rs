use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use std::sync::Arc;
use crate::{
    db::get_conn,
    handlers::auth::AppState,
    models::{CreateUserPayload, User},
};

pub async fn list_users_handler(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let conn = get_conn(&state.db)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut rows = conn
        .query(
            "SELECT id, username, full_name, role, created_at FROM users ORDER BY created_at DESC",
            (),
        )
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut list = Vec::new();
    while let Some(row) = rows.next().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))? {
        list.push(User {
            id: row.get(0).unwrap_or_default(),
            username: row.get(1).unwrap_or_default(),
            full_name: row.get(2).unwrap_or_default(),
            role: row.get(3).unwrap_or_default(),
            created_at: row.get(4).unwrap_or_default(),
        });
    }

    Ok(Json(list))
}

pub async fn create_user_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateUserPayload>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let username = payload.username.trim().to_string();
    if username.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Username wajib diisi".to_string()));
    }

    let conn = get_conn(&state.db)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let id = format!("usr-{}", uuid::Uuid::new_v4());
    let full_name = payload.full_name.trim().to_string();
    let role = payload.role.unwrap_or_else(|| "petani".to_string());
    let raw_pwd = payload.password.unwrap_or_else(|| "petani123".to_string());
    let pwd_hash = bcrypt::hash(&raw_pwd, bcrypt::DEFAULT_COST)
        .unwrap_or_else(|_| "hash_fallback".to_string());
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO users (id, username, password_hash, full_name, role, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        libsql::params![
            id.as_str(),
            username.as_str(),
            pwd_hash.as_str(),
            full_name.as_str(),
            role.as_str(),
            now.as_str()
        ],
    )
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Gagal membuat user: {e}")))?;

    let user = User {
        id,
        username,
        full_name,
        role,
        created_at: now,
    };

    Ok((StatusCode::CREATED, Json(user)))
}

pub async fn delete_user_handler(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let conn = get_conn(&state.db)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    conn.execute("DELETE FROM users WHERE id = ?1", [id.as_str()])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(serde_json::json!({ "success": true })))
}
