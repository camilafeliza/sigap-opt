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
