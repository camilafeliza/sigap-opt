use libsql::{Builder, Connection, Database};
use std::path::Path;
use std::sync::Arc;

pub type DbPool = Arc<Database>;

pub async fn init_db(database_url: &str) -> Result<DbPool, Box<dyn std::error::Error + Send + Sync>> {
    let clean_path = database_url
        .trim_start_matches("file:")
        .trim_start_matches("sqlite:");

    if clean_path != ":memory:" {
        if let Some(parent) = Path::new(clean_path).parent() {
            if !parent.as_os_str().is_empty() {
                let _ = std::fs::create_dir_all(parent);
            }
        }
    }

    let db = Builder::new_local(clean_path).build().await?;
    let conn = db.connect()?;

    // 7 PRAGMA Emas LibSQL (GEMINI.md SSOT & NATAMAYA Architecture)
    conn.execute("PRAGMA foreign_keys = ON;", ()).await?;
    let _ = conn.execute("PRAGMA journal_mode = WAL;", ()).await;
    let _ = conn.execute("PRAGMA synchronous = NORMAL;", ()).await;
    let _ = conn.execute("PRAGMA busy_timeout = 5000;", ()).await;
    let _ = conn.execute("PRAGMA journal_size_limit = 67108864;", ()).await;
    let _ = conn.execute("PRAGMA wal_autocheckpoint = 1000;", ()).await;
    let _ = conn.execute("PRAGMA cache_size = -1000;", ()).await;

    // Inisialisasi skema DDL jika tabel users belum ada
    let migration_sql = include_str!("../migrations/0001_initial_pht.sql");
    for statement in migration_sql.split(';') {
        let trimmed = statement.trim();
        if !trimmed.is_empty() {
            if let Err(e) = conn.execute(trimmed, ()).await {
                tracing::debug!("Migration statement warning (already applied or skip): {e}");
            }
        }
    }

    // Auto-migrate kolom sensor ke tabel observasi jika belum ada
    let _ = conn.execute("ALTER TABLE observasi ADD COLUMN sumber_input TEXT DEFAULT 'kamera'", ()).await;
    let _ = conn.execute("ALTER TABLE observasi ADD COLUMN sensor_device_id TEXT", ()).await;
    let _ = conn.execute("ALTER TABLE observasi ADD COLUMN sensor_suhu REAL", ()).await;
    let _ = conn.execute("ALTER TABLE observasi ADD COLUMN sensor_kelembaban REAL", ()).await;
    let _ = conn.execute("ALTER TABLE observasi ADD COLUMN sensor_pir_motion INTEGER DEFAULT 0", ()).await;

    // Pastikan tabel sensor_telemetry terisi minimal 1 data awal jika kosong
    let mut check_count = conn.query("SELECT COUNT(*) FROM sensor_telemetry", ()).await?;
    let count: i64 = if let Some(row) = check_count.next().await? {
        row.get(0).unwrap_or(0)
    } else {
        0
    };

    if count == 0 {
        let sample_photo = include_str!("contoh-hama.b64");
        let _ = conn.execute(
            "INSERT INTO sensor_telemetry (id, device_id, petak, komoditas, suhu, kelembaban, pir_motion, foto_url) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            libsql::params![
                "tel-init-01",
                "ESP32-CAM-01",
                "Blok A - Petak 1",
                "Cabai",
                29.4,
                78.0,
                1,
                sample_photo.trim().to_string()
            ],
        ).await;
    }

    tracing::info!("LibSQL Database initialized successfully at: {clean_path}");
    Ok(Arc::new(db))
}

pub fn get_conn(pool: &DbPool) -> Result<Connection, Box<dyn std::error::Error + Send + Sync>> {
    Ok(pool.connect()?)
}
