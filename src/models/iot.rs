use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SensorTelemetry {
    pub id: String,
    pub device_id: String,
    pub petak: String,
    pub komoditas: String,
    pub suhu: f64,
    pub kelembaban: f64,
    pub pir_motion: bool,
    pub foto_url: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTelemetryPayload {
    pub device_id: String,
    pub petak: Option<String>,
    pub komoditas: Option<String>,
    pub suhu: Option<f64>,
    pub kelembaban: Option<f64>,
    pub pir_motion: Option<bool>,
    pub foto_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IotDevice {
    pub id: String,
    pub device_id: String,
    pub nama_perangkat: String,
    pub petak: String,
    pub komoditas: String,
    pub camera_model: String,
    pub sensor_model: String,
    pub pir_pin: i64,
    pub status: String, // "online" | "offline"
    pub last_ping: Option<String>,
    pub has_telemetry: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DevicePingPayload {
    pub device_id: String,
    pub nama_perangkat: Option<String>,
    pub petak: Option<String>,
    pub komoditas: Option<String>,
    pub camera_model: Option<String>,
    pub sensor_model: Option<String>,
    pub pir_pin: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeviceScanResponse {
    pub devices: Vec<IotDevice>,
    pub total_online: usize,
    pub message: String,
}
