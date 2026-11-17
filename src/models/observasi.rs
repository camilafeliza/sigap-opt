use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ObservasiItem {
    pub id: String,
    pub komoditas: String,
    pub varietas: String,
    pub petak: String,
    pub fase: String,
    pub opt_nama: String,
    pub nama_ilmiah: Option<String>,
    pub kategori: Option<String>,
    pub ai_confidence: Option<f64>,
    pub total_sampel: i64,
    pub total_terserang: i64,
    pub intensitas_persen: f64,
    pub status_bahaya: String,
    pub rekomendasi_pht: String,
    pub created_at: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CreateObservasiPayload {
    pub komoditas: Option<String>,
    pub varietas: Option<String>,
    pub petak: Option<String>,
    pub fase: Option<String>,
    pub opt_nama: Option<String>,
    pub nama_ilmiah: Option<String>,
    pub total_sampel: Option<i64>,
    pub total_terserang: Option<i64>,
    pub intensitas_persen: Option<f64>,
    pub status_bahaya: Option<String>,
    pub rekomendasi_pht: Option<String>,
    pub catatan_lapangan: Option<String>,
    pub foto_path: Option<String>,
    pub ai_confidence: Option<f64>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TrendPoint {
    pub label: String,
    pub intensity: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OptStat {
    pub name: String,
    pub count: i64,
    pub scientific_name: String,
    #[serde(default)]
    pub percentage: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminMacroStats {
    pub total_users: i64,
    pub total_petak: i64,
    pub total_observasi: i64,
    pub avg_ai_confidence: f64,
    pub total_ai_detections: i64,
    pub unconfigured_opt_count: i64,
    pub unconfigured_opt_list: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardStatsResponse {
    pub trend: Vec<TrendPoint>,
    pub opt_ranking: Vec<OptStat>,
    #[serde(default)]
    pub admin_macro: Option<AdminMacroStats>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AiIdentifyPayload {
    pub image: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AiIdentifyResponse {
    pub nama_opt: String,
    pub nama_ilmiah: String,
    pub kategori: String,
    pub bagian_terserang: String,
    pub confidence_score: f64,
    pub gejala_khas: String,
    #[serde(default)]
    pub komoditas: Option<String>,
    #[serde(default)]
    pub varietas: Option<String>,
}
