use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use std::sync::Arc;
use crate::{
    db::get_conn,
    handlers::auth::AppState,
    models::{CreateTelemetryPayload, SensorTelemetry},
};

pub async fn get_latest_telemetry_handler(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let conn = get_conn(&state.db)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let sql = r#"
        SELECT id, device_id, petak, komoditas, suhu, kelembaban, pir_motion, foto_url, created_at
        FROM sensor_telemetry
        ORDER BY created_at DESC
        LIMIT 1
    "#;

    let mut rows = conn
        .query(sql, ())
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if let Some(row) = rows.next().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))? {
        let item = SensorTelemetry {
            id: row.get(0).unwrap_or_default(),
            device_id: row.get(1).unwrap_or_default(),
            petak: row.get(2).unwrap_or_default(),
            komoditas: row.get(3).unwrap_or_default(),
            suhu: row.get(4).unwrap_or(28.5),
            kelembaban: row.get(5).unwrap_or(75.0),
            pir_motion: row.get::<i64>(6).unwrap_or(0) == 1,
            foto_url: row.get(7).ok(),
            created_at: row.get(8).unwrap_or_default(),
        };
        Ok(Json(Some(item)))
    } else {
        Ok(Json(None))
    }
}

pub async fn list_telemetry_history_handler(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let conn = get_conn(&state.db)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let sql = r#"
        SELECT id, device_id, petak, komoditas, suhu, kelembaban, pir_motion, foto_url, created_at
        FROM sensor_telemetry
        ORDER BY created_at DESC
        LIMIT 10
    "#;

    let mut rows = conn
        .query(sql, ())
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut list = Vec::new();
    while let Some(row) = rows.next().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))? {
        list.push(SensorTelemetry {
            id: row.get(0).unwrap_or_default(),
            device_id: row.get(1).unwrap_or_default(),
            petak: row.get(2).unwrap_or_default(),
            komoditas: row.get(3).unwrap_or_default(),
            suhu: row.get(4).unwrap_or(28.5),
            kelembaban: row.get(5).unwrap_or(75.0),
            pir_motion: row.get::<i64>(6).unwrap_or(0) == 1,
            foto_url: row.get(7).ok(),
            created_at: row.get(8).unwrap_or_default(),
        });
    }

    Ok(Json(list))
}

pub async fn create_telemetry_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateTelemetryPayload>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let conn = get_conn(&state.db)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let id = format!("tel-{}", uuid::Uuid::new_v4());
    let device_id = payload.device_id;
    let petak = payload.petak.unwrap_or_else(|| "Blok A - Petak 1".to_string());
    let komoditas = payload.komoditas.unwrap_or_else(|| "Cabai".to_string());
    let suhu = payload.suhu.unwrap_or(29.0);
    let kelembaban = payload.kelembaban.unwrap_or(78.0);
    let pir_motion: i64 = if payload.pir_motion.unwrap_or(false) { 1 } else { 0 };
    let foto_url = payload.foto_url;

    let insert_sql = r#"
        INSERT INTO sensor_telemetry (id, device_id, petak, komoditas, suhu, kelembaban, pir_motion, foto_url)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
    "#;

    conn.execute(
        insert_sql,
        libsql::params![
            id.clone(),
            device_id.clone(),
            petak.clone(),
            komoditas.clone(),
            suhu,
            kelembaban,
            pir_motion,
            foto_url.clone()
        ],
    )
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let record = SensorTelemetry {
        id,
        device_id,
        petak,
        komoditas,
        suhu,
        kelembaban,
        pir_motion: pir_motion == 1,
        foto_url,
        created_at: chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
    };

    Ok(Json(record))
}
