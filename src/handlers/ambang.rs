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
    models::{AmbangItem, CreateAmbangPayload},
};

pub async fn list_ambang_handler(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let conn = get_conn(&state.db)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let sql = r#"
        SELECT 
            a.id,
            k.nama as komoditas,
            o.nama_opt as opt,
            a.fase_pertumbuhan as fase,
            a.nilai_waspada_persen,
            a.nilai_ambang_ekonomi_persen,
            a.satuan,
            a.rekomendasi_aman,
            a.rekomendasi_waspada,
            a.rekomendasi_bahaya
        FROM ambang_ekonomi a
        JOIN komoditas k ON a.komoditas_id = k.id
        JOIN opt_katalog o ON a.opt_id = o.id
        ORDER BY a.updated_at DESC
    "#;

    let mut rows = conn
        .query(sql, ())
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut list = Vec::new();
    while let Some(row) = rows.next().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))? {
        list.push(AmbangItem {
            id: row.get(0).unwrap_or_default(),
            komoditas: row.get(1).unwrap_or_default(),
            opt: row.get(2).unwrap_or_default(),
            fase: row.get(3).unwrap_or_default(),
            nilai_waspada_persen: row.get(4).unwrap_or(5.0),
            nilai_ambang_ekonomi_persen: row.get(5).unwrap_or(10.0),
            satuan: row.get(6).unwrap_or_else(|_| "%".to_string()),
            rekomendasi_aman: row.get(7).unwrap_or_default(),
            rekomendasi_waspada: row.get(8).unwrap_or_default(),
            rekomendasi_bahaya: row.get(9).unwrap_or_default(),
        });
    }

    Ok(Json(list))
}

pub async fn create_ambang_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateAmbangPayload>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let conn = get_conn(&state.db)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let id = format!("amb-{}", uuid::Uuid::new_v4());
    let komoditas_nama = payload.komoditas.unwrap_or_else(|| "Padi".to_string());
    let opt_nama = payload.opt.unwrap_or_else(|| "Hama Baru".to_string());
    let fase = payload.fase.unwrap_or_else(|| "Vegetatif".to_string());
    let waspada = payload.nilai_waspada_persen.unwrap_or(5.0);
    let ambang = payload.nilai_ambang_ekonomi_persen.unwrap_or(10.0);
    let satuan = payload.satuan.unwrap_or_else(|| "%".to_string());
    let rek_aman = payload.rekomendasi_aman.unwrap_or_default();
    let rek_waspada = payload.rekomendasi_waspada.unwrap_or_default();
    let rek_bahaya = payload.rekomendasi_bahaya.unwrap_or_default();

    // Cari atau buat komoditas_id
    let mut kom_rows = conn
        .query("SELECT id FROM komoditas WHERE nama = ?1", [komoditas_nama.as_str()])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let komoditas_id = if let Some(row) = kom_rows.next().await.unwrap_or(None) {
        row.get::<String>(0).unwrap_or_default()
    } else {
        let new_k_id = format!("kom-{}", uuid::Uuid::new_v4());
        let _ = conn.execute(
            "INSERT INTO komoditas (id, nama) VALUES (?1, ?2)",
            libsql::params![new_k_id.as_str(), komoditas_nama.as_str()],
        ).await;
        new_k_id
    };

    // Cari atau buat opt_id
    let mut opt_rows = conn
        .query("SELECT id FROM opt_katalog WHERE nama_opt = ?1", [opt_nama.as_str()])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let opt_id = if let Some(row) = opt_rows.next().await.unwrap_or(None) {
        row.get::<String>(0).unwrap_or_default()
    } else {
        let new_o_id = format!("opt-{}", uuid::Uuid::new_v4());
        let _ = conn.execute(
            "INSERT INTO opt_katalog (id, nama_opt, nama_ilmiah, kategori) VALUES (?1, ?2, ?3, ?4)",
            libsql::params![new_o_id.as_str(), opt_nama.as_str(), opt_nama.as_str(), "Hama"],
        ).await;
        new_o_id
    };

    conn.execute(
        r#"
        INSERT INTO ambang_ekonomi (
            id, komoditas_id, opt_id, fase_pertumbuhan,
            nilai_waspada_persen, nilai_ambang_ekonomi_persen, satuan,
            rekomendasi_aman, rekomendasi_waspada, rekomendasi_bahaya
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
        "#,
        libsql::params![
            id.as_str(),
            komoditas_id.as_str(),
            opt_id.as_str(),
            fase.as_str(),
            waspada,
            ambang,
            satuan.as_str(),
            rek_aman.as_str(),
            rek_waspada.as_str(),
            rek_bahaya.as_str(),
        ],
    )
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let result = AmbangItem {
        id,
        komoditas: komoditas_nama,
        opt: opt_nama,
        fase,
        nilai_waspada_persen: waspada,
        nilai_ambang_ekonomi_persen: ambang,
        satuan,
        rekomendasi_aman: rek_aman,
        rekomendasi_waspada: rek_waspada,
        rekomendasi_bahaya: rek_bahaya,
    };

    Ok((StatusCode::CREATED, Json(result)))
}

pub async fn delete_ambang_handler(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let conn = get_conn(&state.db)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    conn.execute("DELETE FROM ambang_ekonomi WHERE id = ?1", [id.as_str()])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(serde_json::json!({ "success": true })))
}
