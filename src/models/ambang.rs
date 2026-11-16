use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AmbangItem {
    pub id: String,
    pub komoditas: String,
    pub opt: String,
    pub fase: String,
    pub nilai_waspada_persen: f64,
    pub nilai_ambang_ekonomi_persen: f64,
    pub satuan: String,
    pub rekomendasi_aman: String,
    pub rekomendasi_waspada: String,
    pub rekomendasi_bahaya: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CreateAmbangPayload {
    pub komoditas: Option<String>,
    pub opt: Option<String>,
    pub fase: Option<String>,
    pub nilai_waspada_persen: Option<f64>,
    pub nilai_ambang_ekonomi_persen: Option<f64>,
    pub satuan: Option<String>,
    pub rekomendasi_aman: Option<String>,
    pub rekomendasi_waspada: Option<String>,
    pub rekomendasi_bahaya: Option<String>,
}
