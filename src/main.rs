mod config;
mod db;
mod handlers;
mod middleware;
mod models;
mod static_embed;

use axum::{
    routing::{delete, get, post},
    Json, Router,
};
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::{
    config::Config,
    db::init_db,
    handlers::{
        ai_identify_handler, create_ambang_handler, create_observasi_handler,
        create_telemetry_handler, create_user_handler, dashboard_stats_handler,
        delete_ambang_handler, delete_user_handler, get_latest_telemetry_handler,
        list_ambang_handler, list_komoditas_handler, list_observasi_handler,
        list_telemetry_history_handler, list_users_handler, login_handler, me_handler, AppState,
    },
    static_embed::static_handler,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // 1. Inisialisasi Logging Tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "sigap_opt=info,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // 2. Baca Konfigurasi Lingkungan
    let config = Config::from_env();
    tracing::info!("Starting sigap-opt PHT digital agronomy engine on {}:{}", config.host, config.port);

    // 3. Inisialisasi Basis Data LibSQL + 7 PRAGMA Emas
    let db = init_db(&config.database_url).await?;

    let state = Arc::new(AppState {
        db,
        config: config.clone(),
        http_client: reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()?,
    });

    // 4. Daftarkan Rute API PHT
    let api_routes = Router::new()
        .route("/health", get(|| async {
            Json(serde_json::json!({
                "status": "ok",
                "app": "sigap-opt",
                "runtime": "Rust Axum + LibSQL",
                "version": "1.0.0"
            }))
        }))
        // Autentikasi & Pengguna
        .route("/auth/login", post(login_handler))
        .route("/auth/me", get(me_handler))
        .route("/users", get(list_users_handler).post(create_user_handler))
        .route("/users/:id", delete(delete_user_handler))
        // Observasi & Ambang Ekonomi PHT
        .route("/komoditas", get(list_komoditas_handler))
        .route("/observasi", get(list_observasi_handler).post(create_observasi_handler))
        .route("/dashboard/stats", get(dashboard_stats_handler))
        .route("/ambang-ekonomi", get(list_ambang_handler).post(create_ambang_handler))
        .route("/ambang-ekonomi/:id", delete(delete_ambang_handler))
        // Google Gemini Multimodal Vision AI Proxy
        .route("/ai/identify", post(ai_identify_handler))
        // IoT & Sensor Telemetry Gateway
        .route("/iot/telemetry", post(create_telemetry_handler))
        .route("/iot/latest", get(get_latest_telemetry_handler))
        .route("/iot/history", get(list_telemetry_history_handler));

    // 5. Satukan API dan Single Binary Static Embed (rust-embed SPA)
    let app = Router::new()
        .nest("/api", api_routes)
        .fallback(static_handler)
        .layer(CorsLayer::permissive())
        .with_state(state);

    let listener = if config.host == "0.0.0.0" || config.host == "::" || config.host.is_empty() {
        match tokio::net::TcpListener::bind(format!("[::]:{}", config.port)).await {
            Ok(l) => {
                tracing::info!("✅ sigap-opt server listening on dual-stack [::]:{}", config.port);
                l
            }
            Err(e) => {
                tracing::warn!("Failed to bind dual-stack [::]:{}, falling back to IPv4 0.0.0.0:{}: {}", config.port, config.port, e);
                let v4_addr = format!("0.0.0.0:{}", config.port);
                tokio::net::TcpListener::bind(&v4_addr).await?
            }
        }
    } else {
        let bind_addr = if config.host.contains(':') && !config.host.starts_with('[') {
            format!("[{}]:{}", config.host, config.port)
        } else {
            format!("{}:{}", config.host, config.port)
        };
        tracing::info!("✅ sigap-opt server listening on http://{}", bind_addr);
        tokio::net::TcpListener::bind(&bind_addr).await?
    };

    axum::serve(listener, app).await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::middleware::{create_jwt_token, verify_jwt_token};

    #[test]
    fn test_pht_intensity_calculation() {
        let n: i64 = 8;
        let cap_n: i64 = 50;
        let intensity = (n as f64 / cap_n as f64) * 100.0;
        let rounded = (intensity * 10.0).round() / 10.0;
        assert_eq!(rounded, 16.0);
    }

    #[test]
    fn test_jwt_token_flow() {
        let secret = "test-secret-key-123";
        let token = create_jwt_token(secret, "user-01", "petani", "petani").expect("Create token failed");
        let claims = verify_jwt_token(secret, &token).expect("Verify token failed");
        assert_eq!(claims.sub, "user-01");
        assert_eq!(claims.username, "petani");
        assert_eq!(claims.role, "petani");
    }

    #[test]
    fn test_ambang_status_categorization() {
        let waspada = 5.0;
        let bahaya = 10.0;

        let eval = |i: f64| {
            if i >= bahaya {
                "BAHAYA"
            } else if i >= waspada {
                "WASPADA"
            } else {
                "AMAN"
            }
        };

        assert_eq!(eval(2.0), "AMAN");
        assert_eq!(eval(5.0), "WASPADA");
        assert_eq!(eval(8.5), "WASPADA");
        assert_eq!(eval(10.0), "BAHAYA");
        assert_eq!(eval(15.2), "BAHAYA");
    }

    #[tokio::test]
    async fn test_dual_stack_binding() {
        let listener = tokio::net::TcpListener::bind("[::]:0").await;
        if let Ok(l) = listener {
            let local_addr = l.local_addr().unwrap();
            let port = local_addr.port();
            // Test connecting with IPv4 127.0.0.1
            let v4_conn = tokio::net::TcpStream::connect(format!("127.0.0.1:{}", port)).await;
            assert!(v4_conn.is_ok(), "IPv4 connection should succeed on dual-stack");
            // Test connecting with IPv6 ::1
            let v6_conn = tokio::net::TcpStream::connect(format!("[::1]:{}", port)).await;
            assert!(v6_conn.is_ok(), "IPv6 connection should succeed on dual-stack");
        }
    }
}
