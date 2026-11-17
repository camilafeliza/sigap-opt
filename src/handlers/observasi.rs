use axum::{
    extract::State,
    http::{header::AUTHORIZATION, HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use std::sync::Arc;
use crate::{
    db::get_conn,
    handlers::auth::AppState,
    models::{
        AdminMacroStats, CreateObservasiPayload, DashboardStatsResponse, ObservasiItem, OptStat,
        TrendPoint,
    },
};

pub async fn list_observasi_handler(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let conn = get_conn(&state.db)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let sql = r#"
        SELECT 
            o.id,
            k.nama as komoditas,
            COALESCE(k.varietas, '') as varietas,
            COALESCE(o.catatan_lapangan, '') as petak,
            o.fase_pertumbuhan as fase,
            COALESCE(o.ai_nama_opt, COALESCE(op.nama_opt, '')) as opt_nama,
            op.nama_ilmiah,
            op.kategori,
            o.ai_confidence,
            o.total_sampel,
            o.total_terserang,
            o.intensitas_serangan_persen,
            o.status_bahaya,
            o.rekomendasi_pht,
            o.created_at
        FROM observasi o
        LEFT JOIN komoditas k ON o.komoditas_id = k.id
        LEFT JOIN opt_katalog op ON o.opt_id = op.id
        ORDER BY o.created_at DESC
    "#;

    let mut rows = conn
        .query(sql, ())
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut list = Vec::new();
    while let Some(row) = rows.next().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))? {
        list.push(ObservasiItem {
            id: row.get(0).unwrap_or_default(),
            komoditas: row.get(1).unwrap_or_default(),
            varietas: row.get(2).unwrap_or_default(),
            petak: row.get(3).unwrap_or_default(),
            fase: row.get(4).unwrap_or_default(),
            opt_nama: row.get(5).unwrap_or_default(),
            nama_ilmiah: row.get(6).ok(),
            kategori: row.get(7).ok(),
            ai_confidence: row.get(8).ok(),
            total_sampel: row.get(9).unwrap_or(50),
            total_terserang: row.get(10).unwrap_or(0),
            intensitas_persen: row.get(11).unwrap_or(0.0),
            status_bahaya: row.get(12).unwrap_or_else(|_| "AMAN".to_string()),
            rekomendasi_pht: row.get(13).unwrap_or_default(),
            created_at: row.get(14).unwrap_or_default(),
        });
    }

    Ok(Json(list))
}

pub async fn create_observasi_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(payload): Json<CreateObservasiPayload>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let conn = get_conn(&state.db)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Extract user_id from JWT token if present
    let token_user_id = headers
        .get(AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .and_then(|auth_str| {
            let token = auth_str.strip_prefix("Bearer ")?.trim();
            crate::middleware::verify_jwt_token(&state.config.jwt_secret, token).ok()
        })
        .map(|claims| claims.sub);

    let id = format!("obs-{}", uuid::Uuid::new_v4());
    let komoditas_nama = payload.komoditas.unwrap_or_else(|| "Padi".to_string());
    let varietas = payload.varietas.unwrap_or_default();
    let petak = payload.petak.unwrap_or_default();
    let fase = payload.fase.unwrap_or_else(|| "Vegetatif".to_string());
    let opt_nama = payload.opt_nama.unwrap_or_default();
    let nama_ilmiah = payload.nama_ilmiah.unwrap_or_default();

    let n = payload.total_terserang.unwrap_or(0);
    let cap_n = payload.total_sampel.unwrap_or(50).max(1);

    // Kalkulasi matematis baku PHT (GEMINI.md SSOT Bab 7 & 13)
    let intensitas = payload.intensitas_persen.unwrap_or_else(|| {
        let raw = (n as f64 / cap_n as f64) * 100.0;
        (raw * 10.0).round() / 10.0
    });

    // Cari ambang batas dinamis dari basis data LibSQL dengan pencocokan konteks presisi:
    // Prioritas 1: Komoditas + Nama OPT + Fase Pertumbuhan (Vegetatif / Generatif)
    let mut ambang_res = None;
    let opt_clean = opt_nama.trim();
    let kom_clean = komoditas_nama.trim();

    // Query 1: Exact Komoditas + Exact/Fuzzy OPT + Fase yang cocok (atau 'Semua Fase')
    let q1 = conn
        .query(
            r#"
            SELECT a.nilai_waspada_persen, a.nilai_ambang_ekonomi_persen,
                   a.rekomendasi_aman, a.rekomendasi_waspada, a.rekomendasi_bahaya
            FROM ambang_ekonomi a
            JOIN komoditas k ON a.komoditas_id = k.id
            JOIN opt_katalog o ON a.opt_id = o.id
            WHERE (LOWER(k.nama) = LOWER(?1) OR ?1 LIKE '%' || k.nama || '%' OR k.nama LIKE '%' || ?1 || '%')
              AND (LOWER(o.nama_opt) = LOWER(?2) OR ?2 LIKE '%' || o.nama_opt || '%' OR o.nama_opt LIKE '%' || ?2 || '%')
              AND (a.fase_pertumbuhan = ?3 OR a.fase_pertumbuhan = 'Semua Fase')
            ORDER BY CASE WHEN a.fase_pertumbuhan = ?3 THEN 1 ELSE 2 END
            LIMIT 1
            "#,
            [kom_clean, opt_clean, fase.as_str()],
        )
        .await
        .ok();

    if let Some(mut rows) = q1 {
        if let Ok(Some(row)) = rows.next().await {
            ambang_res = Some((
                row.get::<f64>(0).unwrap_or(5.0),
                row.get::<f64>(1).unwrap_or(10.0),
                row.get::<String>(2).unwrap_or_default(),
                row.get::<String>(3).unwrap_or_default(),
                row.get::<String>(4).unwrap_or_default(),
            ));
        }
    }

    let (waspada, ambang, rek_aman, rek_waspada, rek_bahaya) = ambang_res.unwrap_or((
        5.0,
        10.0,
        "Kondisi tanaman aman (< 5%). Lakukan pemantauan berkala dan sanitasi lahan. Parameter spesifik belum dikonfigurasi di master data.".to_string(),
        "Intensitas serangan memasuki status waspada umum (5%-10%). Bersihkan gulma inang dan pasang perangkap. Parameter spesifik belum dikonfigurasi di master data.".to_string(),
        "Intensitas serangan melewati ambang toleransi umum (10%). Segera lakukan tindakan mekanis/hayati darurat. Parameter spesifik belum dikonfigurasi di master data.".to_string(),
    ));

    let (status, rekomendasi) = if intensitas >= ambang {
        ("BAHAYA", rek_bahaya)
    } else if intensitas >= waspada {
        ("WASPADA", rek_waspada)
    } else {
        ("AMAN", rek_aman)
    };

    // Ambil komoditas_id yang cocok berdasarkan nama komoditas yang diinput pengguna/AI
    let k_row = conn
        .query(
            "SELECT id FROM komoditas WHERE LOWER(nama) = LOWER(?1) OR ?1 LIKE '%' || nama || '%' LIMIT 1",
            [komoditas_nama.as_str()],
        )
        .await
        .ok();
    let komoditas_id = if let Some(mut rows) = k_row {
        if let Ok(Some(r)) = rows.next().await {
            r.get::<String>(0).unwrap_or_else(|_| "kom-01".to_string())
        } else {
            let new_k_id = format!("kom-{}", &uuid::Uuid::new_v4().to_string()[..8]);
            let _ = conn
                .execute(
                    "INSERT OR IGNORE INTO komoditas (id, nama, varietas) VALUES (?1, ?2, ?3)",
                    libsql::params![new_k_id.as_str(), komoditas_nama.as_str(), varietas.as_str()],
                )
                .await;
            new_k_id
        }
    } else {
        "kom-01".to_string()
    };

    // Ambil atau buat opt_id di opt_katalog jika nama OPT terisi
    let opt_id = if !opt_nama.trim().is_empty() {
        let opt_clean = opt_nama.trim();
        let o_row = conn
            .query(
                "SELECT id FROM opt_katalog WHERE LOWER(nama_opt) = LOWER(?1) OR ?1 LIKE '%' || nama_opt || '%' LIMIT 1",
                [opt_clean],
            )
            .await
            .ok();

        if let Some(mut rows) = o_row {
            if let Ok(Some(r)) = rows.next().await {
                r.get::<String>(0).ok()
            } else {
                let new_o_id = format!("opt-{}", &uuid::Uuid::new_v4().to_string()[..8]);
                let _ = conn
                    .execute(
                        "INSERT OR IGNORE INTO opt_katalog (id, nama_opt, nama_ilmiah, kategori) VALUES (?1, ?2, ?3, ?4)",
                        libsql::params![new_o_id.as_str(), opt_clean, nama_ilmiah.as_str(), "Hama"],
                    )
                    .await;
                Some(new_o_id)
            }
        } else {
            None
        }
    } else {
        None
    };

    let user_id = if let Some(uid) = token_user_id {
        uid
    } else {
        let u_row = conn.query("SELECT id FROM users LIMIT 1", ()).await.ok();
        if let Some(mut rows) = u_row {
            if let Ok(Some(r)) = rows.next().await {
                r.get::<String>(0).unwrap_or_else(|_| "usr-petani-01".to_string())
            } else {
                "usr-petani-01".to_string()
            }
        } else {
            "usr-petani-01".to_string()
        }
    };

    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        r#"
        INSERT INTO observasi (
            id, user_id, komoditas_id, opt_id, fase_pertumbuhan, foto_path,
            ai_nama_opt, ai_confidence, ai_raw_json,
            total_sampel, total_terserang, intensitas_serangan_persen,
            status_bahaya, rekomendasi_pht, catatan_lapangan, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)
        "#,
        libsql::params![
            id.as_str(),
            user_id.as_str(),
            komoditas_id.as_str(),
            opt_id.as_deref(),
            fase.as_str(),
            payload.foto_path.as_deref().unwrap_or(""),
            opt_nama.as_str(),
            payload.ai_confidence.unwrap_or(0.0),
            "{}",
            cap_n,
            n,
            intensitas,
            status,
            rekomendasi.as_str(),
            petak.as_str(),
            now.as_str(),
        ],
    )
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Gagal menyimpan observasi: {e}")))?;

    let record = ObservasiItem {
        id,
        komoditas: komoditas_nama,
        varietas,
        petak,
        fase,
        opt_nama,
        nama_ilmiah: if nama_ilmiah.is_empty() { None } else { Some(nama_ilmiah) },
        kategori: Some("Hama".to_string()),
        ai_confidence: payload.ai_confidence,
        total_sampel: cap_n,
        total_terserang: n,
        intensitas_persen: intensitas,
        status_bahaya: status.to_string(),
        rekomendasi_pht: rekomendasi,
        created_at: now,
    };

    Ok((StatusCode::CREATED, Json(record)))
}

pub async fn dashboard_stats_handler(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let conn = get_conn(&state.db)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 1. Agregasi kasus OPT riil langsung dari LibSQL
    let opt_sql = r#"
        SELECT 
            COALESCE(o.ai_nama_opt, COALESCE(op.nama_opt, '')) as name,
            COALESCE(op.nama_ilmiah, '') as scientific,
            COUNT(*) as cnt
        FROM observasi o
        LEFT JOIN opt_katalog op ON o.opt_id = op.id
        WHERE name != ''
        GROUP BY name
        ORDER BY cnt DESC
        LIMIT 5
    "#;

    let mut opt_ranking = Vec::new();
    if let Ok(mut rows) = conn.query(opt_sql, ()).await {
        while let Ok(Some(row)) = rows.next().await {
            let name: String = row.get(0).unwrap_or_default();
            let mut scientific: String = row.get(1).unwrap_or_default();
            let count: i64 = row.get(2).unwrap_or(0);
            if scientific.is_empty() {
                scientific = if name.contains("Wereng") {
                    "Nilaparvata lugens".to_string()
                } else if name.contains("Penggerek") {
                    "Scirpophaga incertulas".to_string()
                } else if name.contains("Blas") {
                    "Pyricularia oryzae".to_string()
                } else if name.contains("Ulat Grayak") {
                    "Spodoptera litura".to_string()
                } else {
                    String::new()
                };
            }
            opt_ranking.push(OptStat {
                name,
                count,
                scientific_name: scientific,
                percentage: 0.0,
            });
        }
    }

    let total_cases: i64 = opt_ranking.iter().map(|o| o.count).sum();
    let opt_ranking: Vec<OptStat> = opt_ranking
        .into_iter()
        .map(|mut o| {
            if total_cases > 0 {
                o.percentage = ((o.count as f64 / total_cases as f64) * 1000.0).round() / 10.0;
            }
            o
        })
        .collect();

    // 2. Tren intensitas riil 7 hari terakhir berdasarkan data observasi riil
    let now = chrono::Utc::now();
    let mut trend = Vec::new();
    let days_label = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

    let trend_sql = r#"
        SELECT 
            strftime('%Y-%m-%d', created_at) as obs_date,
            AVG(intensitas_serangan_persen) as avg_intensity
        FROM observasi
        WHERE created_at >= datetime('now', '-7 days')
        GROUP BY obs_date
    "#;

    let mut date_map = std::collections::HashMap::new();
    if let Ok(mut rows) = conn.query(trend_sql, ()).await {
        while let Ok(Some(row)) = rows.next().await {
            if let (Ok(d), Ok(val)) = (row.get::<String>(0), row.get::<f64>(1)) {
                date_map.insert(d, val);
            }
        }
    }

    for i in (0..7).rev() {
        let target_date = now - chrono::Duration::days(i);
        let date_str = target_date.format("%Y-%m-%d").to_string();
        let weekday_num = target_date.format("%w").to_string().parse::<usize>().unwrap_or(0);
        let label = days_label[weekday_num % 7].to_string();
        let intensity = date_map.get(&date_str).copied().unwrap_or(0.0);
        let rounded = (intensity * 10.0).round() / 10.0;
        trend.push(TrendPoint { label, intensity: rounded });
    }

    // 3. Metrik Akumulasi Global & Audit Data Master untuk Superadmin
    let mut total_users: i64 = 0;
    if let Ok(mut r) = conn.query("SELECT COUNT(*) FROM users", ()).await {
        if let Ok(Some(row)) = r.next().await {
            total_users = row.get(0).unwrap_or(0);
        }
    }

    let mut total_petak: i64 = 0;
    if let Ok(mut r) = conn
        .query(
            "SELECT COUNT(DISTINCT catatan_lapangan) FROM observasi WHERE catatan_lapangan != ''",
            (),
        )
        .await
    {
        if let Ok(Some(row)) = r.next().await {
            total_petak = row.get(0).unwrap_or(0);
        }
    }

    let mut total_observasi: i64 = 0;
    if let Ok(mut r) = conn.query("SELECT COUNT(*) FROM observasi", ()).await {
        if let Ok(Some(row)) = r.next().await {
            total_observasi = row.get(0).unwrap_or(0);
        }
    }

    let mut avg_ai_confidence: f64 = 0.0;
    let mut total_ai_detections: i64 = 0;
    if let Ok(mut r) = conn
        .query(
            "SELECT AVG(ai_confidence), COUNT(*) FROM observasi WHERE ai_confidence > 0",
            (),
        )
        .await
    {
        if let Ok(Some(row)) = r.next().await {
            avg_ai_confidence = row.get::<f64>(0).unwrap_or(0.0);
            total_ai_detections = row.get::<i64>(1).unwrap_or(0);
        }
    }
    avg_ai_confidence = (avg_ai_confidence * 1000.0).round() / 10.0; // Persentase misal 94.0

    // Deteksi OPT lapangan yang belum dikonfigurasi di tabel ambang_ekonomi
    let unconfigured_sql = r#"
        SELECT DISTINCT o.ai_nama_opt
        FROM observasi o
        WHERE o.ai_nama_opt != ''
          AND o.ai_nama_opt NOT IN (
            SELECT DISTINCT ok.nama_opt
            FROM ambang_ekonomi ae
            JOIN opt_katalog ok ON ae.opt_id = ok.id
          )
    "#;

    let mut unconfigured_opt_list = Vec::new();
    if let Ok(mut r) = conn.query(unconfigured_sql, ()).await {
        while let Ok(Some(row)) = r.next().await {
            if let Ok(name) = row.get::<String>(0) {
                if !name.trim().is_empty() {
                    unconfigured_opt_list.push(name);
                }
            }
        }
    }
    let unconfigured_opt_count = unconfigured_opt_list.len() as i64;

    let admin_macro = Some(AdminMacroStats {
        total_users,
        total_petak,
        total_observasi,
        avg_ai_confidence,
        total_ai_detections,
        unconfigured_opt_count,
        unconfigured_opt_list,
    });

    Ok(Json(DashboardStatsResponse {
        trend,
        opt_ranking,
        admin_macro,
    }))
}
