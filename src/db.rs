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

    // Auto-migrate tabel iot_devices untuk discovery hardware sebelum digunakan
    let _ = conn.execute(
        r#"
        CREATE TABLE IF NOT EXISTS iot_devices (
            id TEXT PRIMARY KEY,
            device_id TEXT UNIQUE NOT NULL,
            nama_perangkat TEXT NOT NULL,
            petak TEXT,
            komoditas TEXT,
            camera_model TEXT DEFAULT 'OV2640',
            sensor_model TEXT DEFAULT 'DHT22 / SHT30',
            pir_pin INTEGER DEFAULT 13,
            status TEXT NOT NULL DEFAULT 'offline',
            ip_address TEXT,
            last_ping DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        "#,
        (),
    ).await;

    // Bersihkan data dummy (hanya data riil dari modul hardware yang dicatat)
    let _ = conn.execute("DELETE FROM sensor_telemetry WHERE id = 'tel-init-01'", ()).await;

    tracing::info!("LibSQL Database initialized successfully at: {clean_path}");
    Ok(Arc::new(db))
}

pub fn get_conn(pool: &DbPool) -> Result<Connection, Box<dyn std::error::Error + Send + Sync>> {
    Ok(pool.connect()?)
}
