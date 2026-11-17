use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use std::sync::Arc;
use crate::{
    handlers::auth::AppState,
    models::{AiIdentifyPayload, AiIdentifyResponse},
};

pub async fn ai_identify_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<AiIdentifyPayload>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // 1. Cek apakah GEMINI_API_KEY tersedia
    if let Some(ref api_key) = state.config.gemini_api_key {
        if let Some(ref img_base64_raw) = payload.image {
            let clean_base64 = if let Some(pos) = img_base64_raw.find(',') {
                &img_base64_raw[pos + 1..]
            } else {
                img_base64_raw.as_str()
            };

            let mime_type = if img_base64_raw.starts_with("data:image/png") {
                "image/png"
            } else if img_base64_raw.starts_with("data:image/webp") {
                "image/webp"
            } else {
                "image/jpeg"
            };

            let gemini_url = format!(
                "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
                state.config.gemini_model, api_key
            );

            let prompt_text = r#"
            Anda adalah pakar Pengendalian Hama Terpadu (PHT) agronomi presisi.
            Analisis foto tanaman ini dan identifikasi:
            1. Organisme pengganggu tumbuhan (OPT), baik berupa hama serangga maupun gejala penyakit cendawan/bakteri/virus.
            2. Jenis komoditas tanaman inang (misal: "Padi", "Jagung", "Cabai", "Bawang Merah", "Kedelai", dsb).
            3. Nama varietas tanaman jika dapat diidentifikasi dari morfologi atau varietas unggul lazim untuk komoditas tersebut (misal: "Ciherang", "Inpari 32", "Bisi 18", "TM 99", "Bima Brebes", dsb).

            KEMBALIKAN HANYA STRING JSON MURNI TANPA BLOK MARKDOWN ```json:
            {
              "nama_opt": "Nama OPT dalam Bahasa Indonesia",
              "nama_ilmiah": "Nama ilmiah latin",
              "kategori": "Hama" atau "Penyakit",
              "bagian_terserang": "Daun" atau "Batang" atau "Akar" atau "Malai",
              "confidence_score": 0.94,
              "gejala_khas": "Deskripsi ringkas gejala khas serangan di lapangan",
              "komoditas": "Padi" atau "Jagung" atau "Cabai" atau "Bawang Merah" atau "Kedelai",
              "varietas": "Nama varietas tanaman (misal: Ciherang, Inpari 32, TM 99, Bisi 18)"
            }
            "#;

            let req_body = serde_json::json!({
                "contents": [{
                    "parts": [
                        { "text": prompt_text },
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": clean_base64
                            }
                        }
                    ]
                }],
                "generationConfig": {
                    "temperature": 0.2,
                    "maxOutputTokens": 2048
                }
            });

            if let Ok(res) = state.http_client.post(&gemini_url).json(&req_body).send().await {
                if res.status().is_success() {
                    if let Ok(json_val) = res.json::<serde_json::Value>().await {
                        let combined_text: String = json_val["candidates"][0]["content"]["parts"]
                            .as_array()
                            .map(|parts| {
                                parts
                                    .iter()
                                    .filter_map(|p| p["text"].as_str())
                                    .collect::<Vec<_>>()
                                    .join("")
                            })
                            .unwrap_or_default();

                        if !combined_text.is_empty() {
                            let sanitized = combined_text
                                .trim()
                                .trim_start_matches("```json")
                                .trim_start_matches("```")
                                .trim_end_matches("```")
                                .trim();

                            if let Ok(parsed) = serde_json::from_str::<AiIdentifyResponse>(sanitized) {
                                return Ok(Json(parsed));
                            }
                        }
                    }
                }
            }
        }
    }

    // 2. Jika analisis AI gagal atau tidak dapat diparse, jangan berhalusinasi atau memberikan data dummy
    Err((
        StatusCode::BAD_GATEWAY,
        "Identifikasi AI tidak berhasil mengenali OPT dari citra tersebut. Silakan ambil foto ulang yang lebih fokus atau pilih jenis OPT secara manual dari katalog.".to_string(),
    ))
}
