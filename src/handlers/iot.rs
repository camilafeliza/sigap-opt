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
    models::{CreateTelemetryPayload, DevicePingPayload, DeviceScanResponse, IotDevice, SensorTelemetry},
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

    // Otomatis sinkronkan status perangkat di tabel iot_devices
    let dev_rec_id = format!("dev-{}", &device_id);
    let dev_nama = format!("Stasiun Perangkap {}", &device_id);
    let dev_upsert = r#"
        INSERT INTO iot_devices (id, device_id, nama_perangkat, petak, komoditas, status, last_ping)
        VALUES (?1, ?2, ?3, ?4, ?5, 'online', CURRENT_TIMESTAMP)
        ON CONFLICT(device_id) DO UPDATE SET
            petak = excluded.petak,
            komoditas = excluded.komoditas,
            status = 'online',
            last_ping = CURRENT_TIMESTAMP
    "#;
    let _ = conn.execute(
        dev_upsert,
        libsql::params![
            dev_rec_id.as_str(),
            device_id.as_str(),
            dev_nama.as_str(),
            petak.as_str(),
            komoditas.as_str(),
        ],
    ).await;

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

pub async fn list_devices_handler(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let conn = get_conn(&state.db)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let sql = r#"
        SELECT 
            d.id, d.device_id, d.nama_perangkat, 
            COALESCE(d.petak, 'Blok A - Petak 1'), 
            COALESCE(d.komoditas, 'Cabai'),
            COALESCE(d.camera_model, 'OV2640'),
            COALESCE(d.sensor_model, 'DHT22 / SHT30'),
            COALESCE(d.pir_pin, 13),
            COALESCE(d.last_ping, d.created_at) as last_ping,
            (SELECT COUNT(*) FROM sensor_telemetry t WHERE t.device_id = d.device_id AND t.foto_url IS NOT NULL) as photo_count
        FROM iot_devices d
        ORDER BY d.last_ping DESC
    "#;

    let mut rows = conn
        .query(sql, ())
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut list = Vec::new();
    while let Some(row) = rows.next().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))? {
        let photo_count: i64 = row.get(9).unwrap_or(0);
        list.push(IotDevice {
            id: row.get(0).unwrap_or_default(),
            device_id: row.get(1).unwrap_or_default(),
            nama_perangkat: row.get(2).unwrap_or_default(),
            petak: row.get(3).unwrap_or_default(),
            komoditas: row.get(4).unwrap_or_default(),
            camera_model: row.get(5).unwrap_or_default(),
            sensor_model: row.get(6).unwrap_or_default(),
            pir_pin: row.get(7).unwrap_or(13),
            status: "online".to_string(),
            last_ping: row.get(8).ok(),
            has_telemetry: photo_count > 0,
        });
    }

    Ok(Json(list))
}

pub async fn ping_device_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<DevicePingPayload>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let conn = get_conn(&state.db)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let device_id = payload.device_id;
    let nama_perangkat = payload.nama_perangkat.unwrap_or_else(|| format!("Stasiun Perangkap {}", &device_id));
    let petak = payload.petak.unwrap_or_else(|| "Blok A - Petak 1".to_string());
    let komoditas = payload.komoditas.unwrap_or_else(|| "Cabai".to_string());
    let camera_model = payload.camera_model.unwrap_or_else(|| "OV2640".to_string());
    let sensor_model = payload.sensor_model.unwrap_or_else(|| "DHT22 / SHT30".to_string());
    let pir_pin = payload.pir_pin.unwrap_or(13);

    let dev_rec_id = format!("dev-{}", &device_id);
    let dev_upsert = r#"
        INSERT INTO iot_devices (id, device_id, nama_perangkat, petak, komoditas, camera_model, sensor_model, pir_pin, status, last_ping)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'online', CURRENT_TIMESTAMP)
        ON CONFLICT(device_id) DO UPDATE SET
            nama_perangkat = excluded.nama_perangkat,
            petak = excluded.petak,
            komoditas = excluded.komoditas,
            camera_model = excluded.camera_model,
            sensor_model = excluded.sensor_model,
            pir_pin = excluded.pir_pin,
            status = 'online',
            last_ping = CURRENT_TIMESTAMP
    "#;

    conn.execute(
        dev_upsert,
        libsql::params![
            dev_rec_id.as_str(),
            device_id.as_str(),
            nama_perangkat.as_str(),
            petak.as_str(),
            komoditas.as_str(),
            camera_model.as_str(),
            sensor_model.as_str(),
            pir_pin,
        ],
    )
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let now_str = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let dev = IotDevice {
        id: dev_rec_id,
        device_id,
        nama_perangkat,
        petak,
        komoditas,
        camera_model,
        sensor_model,
        pir_pin,
        status: "online".to_string(),
        last_ping: Some(now_str),
        has_telemetry: false,
    };

    Ok(Json(dev))
}

pub async fn scan_devices_handler(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let conn = get_conn(&state.db)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let sql = r#"
        SELECT 
            d.id, d.device_id, d.nama_perangkat, 
            COALESCE(d.petak, 'Blok A - Petak 1'), 
            COALESCE(d.komoditas, 'Cabai'),
            COALESCE(d.camera_model, 'OV2640'),
            COALESCE(d.sensor_model, 'DHT22 / SHT30'),
            COALESCE(d.pir_pin, 13),
            COALESCE(d.last_ping, d.created_at) as last_ping,
            (SELECT COUNT(*) FROM sensor_telemetry t WHERE t.device_id = d.device_id AND t.foto_url IS NOT NULL) as photo_count
        FROM iot_devices d
        ORDER BY d.last_ping DESC
    "#;

    let mut rows = conn
        .query(sql, ())
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut list = Vec::new();
    while let Some(row) = rows.next().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))? {
        let photo_count: i64 = row.get(9).unwrap_or(0);
        list.push(IotDevice {
            id: row.get(0).unwrap_or_default(),
            device_id: row.get(1).unwrap_or_default(),
            nama_perangkat: row.get(2).unwrap_or_default(),
            petak: row.get(3).unwrap_or_default(),
            komoditas: row.get(4).unwrap_or_default(),
            camera_model: row.get(5).unwrap_or_default(),
            sensor_model: row.get(6).unwrap_or_default(),
            pir_pin: row.get(7).unwrap_or(13),
            status: "online".to_string(),
            last_ping: row.get(8).ok(),
            has_telemetry: photo_count > 0,
        });
    }

    let total = list.len();
    let msg = if total > 0 {
        format!("{total} perangkat ESP32-CAM & Sensor terdeteksi di jaringan.")
    } else {
        "Tidak ada modul ESP32-CAM aktif yang terdeteksi. Silakan nyalakan perangkat atau hubungkan ke jaringan.".to_string()
    };

    Ok(Json(DeviceScanResponse {
        devices: list,
        total_online: total,
        message: msg,
    }))
}
