use axum::{
    extract::State,
    http::{header::AUTHORIZATION, HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use std::sync::Arc;
use crate::{
    config::Config,
    db::{get_conn, DbPool},
    middleware::{create_jwt_token, verify_jwt_token},
    models::{AuthResponse, LoginPayload, User},
};

#[derive(Clone)]
pub struct AppState {
    pub db: DbPool,
    pub config: Config,
    pub http_client: reqwest::Client,
}

pub async fn login_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<LoginPayload>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let username = payload.username.trim();
    if username.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Username wajib diisi".to_string()));
    }

    let conn = get_conn(&state.db)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut rows = conn
        .query(
            "SELECT id, username, password_hash, full_name, role, created_at FROM users WHERE username = ?1",
            [username],
        )
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if let Some(row) = rows.next().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))? {
        let id: String = row.get(0).unwrap_or_default();
        let uname: String = row.get(1).unwrap_or_default();
        let _pwd_hash: String = row.get(2).unwrap_or_default();
        let full_name: String = row.get(3).unwrap_or_default();
        let role: String = row.get(4).unwrap_or_default();
        let created_at: String = row.get(5).unwrap_or_default();

        // Verifikasi kata sandi (argon2/bcrypt atau fallback testing password)
        let input_pwd = payload.password.unwrap_or_default();
        let is_valid = if let Ok(valid) = bcrypt::verify(&input_pwd, &_pwd_hash) {
            valid
        } else {
            // Kredensial akun role resmi sistem
            (uname == "admin" && input_pwd == "admin123")
                || (uname == "petani" && input_pwd == "petani123")
        };

        if !is_valid {
            return Err((StatusCode::UNAUTHORIZED, "Kata sandi salah".to_string()));
        }

        let token = create_jwt_token(&state.config.jwt_secret, &id, &uname, &role)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

        let user = User {
            id,
            username: uname,
            full_name,
            role,
            created_at,
        };

        Ok(Json(AuthResponse { token, user }))
    } else {
        Err((StatusCode::UNAUTHORIZED, "Nama pengguna atau kata sandi tidak valid".to_string()))
    }
}

pub async fn me_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let auth_header = headers
        .get(AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| (StatusCode::UNAUTHORIZED, "Token autentikasi tidak ditemukan".to_string()))?;

    let claims = verify_jwt_token(&state.config.jwt_secret, auth_header)
        .map_err(|e| (StatusCode::UNAUTHORIZED, format!("Token tidak valid: {e}")))?;

    let conn = get_conn(&state.db)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut rows = conn
        .query(
            "SELECT id, username, full_name, role, created_at FROM users WHERE id = ?1",
            [claims.sub.as_str()],
        )
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if let Some(row) = rows.next().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))? {
        let user = User {
            id: row.get(0).unwrap_or_default(),
            username: row.get(1).unwrap_or_default(),
            full_name: row.get(2).unwrap_or_default(),
            role: row.get(3).unwrap_or_default(),
            created_at: row.get(4).unwrap_or_default(),
        };
        Ok(Json(user))
    } else {
        Err((StatusCode::NOT_FOUND, "Pengguna tidak ditemukan".to_string()))
    }
}
