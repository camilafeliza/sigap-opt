-- 0001_initial_pht.sql
-- Skema Basis Data LibSQL / SQLite (GEMINI.md SSOT)

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('petani', 'superadmin')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS komoditas (
    id TEXT PRIMARY KEY,
    nama TEXT NOT NULL,
    varietas TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS opt_katalog (
    id TEXT PRIMARY KEY,
    nama_opt TEXT NOT NULL,
    nama_ilmiah TEXT NOT NULL,
    kategori TEXT NOT NULL CHECK(kategori IN ('Hama', 'Penyakit')),
    deskripsi TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ambang_ekonomi (
    id TEXT PRIMARY KEY,
    komoditas_id TEXT NOT NULL REFERENCES komoditas(id) ON DELETE CASCADE,
    opt_id TEXT NOT NULL REFERENCES opt_katalog(id) ON DELETE CASCADE,
    fase_pertumbuhan TEXT NOT NULL CHECK(fase_pertumbuhan IN ('Vegetatif', 'Generatif', 'Semua Fase')),
    nilai_waspada_persen REAL NOT NULL,
    nilai_ambang_ekonomi_persen REAL NOT NULL,
    satuan TEXT DEFAULT '%',
    rekomendasi_aman TEXT NOT NULL,
    rekomendasi_waspada TEXT NOT NULL,
    rekomendasi_bahaya TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS observasi (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    komoditas_id TEXT NOT NULL REFERENCES komoditas(id) ON DELETE RESTRICT,
    opt_id TEXT REFERENCES opt_katalog(id) ON DELETE SET NULL,
    fase_pertumbuhan TEXT NOT NULL,
    foto_path TEXT NOT NULL,
    ai_nama_opt TEXT,
    ai_confidence REAL,
    ai_raw_json TEXT,
    total_sampel INTEGER NOT NULL,
    total_terserang INTEGER NOT NULL,
    intensitas_serangan_persen REAL NOT NULL,
    status_bahaya TEXT NOT NULL CHECK(status_bahaya IN ('AMAN', 'WASPADA', 'BAHAYA')),
    rekomendasi_pht TEXT NOT NULL,
    catatan_lapangan TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_observasi_user ON observasi(user_id);
CREATE INDEX IF NOT EXISTS idx_observasi_created ON observasi(created_at);
CREATE INDEX IF NOT EXISTS idx_ambang_lookup ON ambang_ekonomi(komoditas_id, opt_id, fase_pertumbuhan);

CREATE TABLE IF NOT EXISTS sensor_telemetry (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    petak TEXT NOT NULL,
    komoditas TEXT NOT NULL,
    suhu REAL NOT NULL,
    kelembaban REAL NOT NULL,
    pir_motion INTEGER NOT NULL DEFAULT 0,
    foto_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_telemetry_created ON sensor_telemetry(created_at);

-- Seed Data Awal
INSERT OR IGNORE INTO users (id, username, password_hash, full_name, role) VALUES
('usr-admin-01', 'admin', '$argon2id$v=19$m=19456,t=2,p=1$c2lnYXAtb3B0LXNhbHQ$PjQk1L/NfKzQ1aH1Xk0yqJv3q1M', 'Super Administrator', 'superadmin'),
('usr-petani-01', 'petani', '$argon2id$v=19$m=19456,t=2,p=1$c2lnYXAtb3B0LXNhbHQ$PjQk1L/NfKzQ1aH1Xk0yqJv3q1M', 'Pak Tani Santoso', 'petani');

INSERT OR IGNORE INTO komoditas (id, nama, varietas) VALUES
('kom-01', 'Padi', 'Ciherang, Inpari 32, Situ Bagendit'),
('kom-02', 'Jagung', 'Bisi 18, NK 212, Pioneer P27'),
('kom-03', 'Cabai', 'TM 99, Lado F1, Kastilo'),
('kom-04', 'Bawang Merah', 'Bima Brebes, Bauji, Tajuk');

INSERT OR IGNORE INTO opt_katalog (id, nama_opt, nama_ilmiah, kategori, deskripsi) VALUES
('opt-01', 'Wereng Batang Coklat', 'Nilaparvata lugens', 'Hama', 'Hama penusuk-pengisap batang padi penyebab gejala hopperburn dan vektor virus kerdil hampa.'),
('opt-02', 'Penggerek Batang Padi', 'Scirpophaga incertulas', 'Hama', 'Larva menggerek batang menyebabkan sundep pada fase vegetatif dan beluk pada fase generatif.'),
('opt-03', 'Blas Daun', 'Pyricularia oryzae', 'Penyakit', 'Cendawan penyebab bercak belah ketupat pada daun dan busuk leher malai padi.'),
('opt-04', 'Ulat Grayak', 'Spodoptera litura', 'Hama', 'Ulat pemakan daun rakus pada tanaman hortikultura dan palawija.'),
('opt-05', 'Kutu Daun (Aphids)', 'Aphis gossypii', 'Hama', 'Pengisap cairan daun muda dan pucuk, menyebabkan daun mengeriting dan berembun jelaga.'),
('opt-06', 'Walang Sangit', 'Leptocorisa acuta', 'Hama', 'Hama pengisap cairan bulir padi muda pada fase masak susu yang menyebabkan gabah hampa atau berbintik coklat/hitam.');

INSERT OR IGNORE INTO ambang_ekonomi (id, komoditas_id, opt_id, fase_pertumbuhan, nilai_waspada_persen, nilai_ambang_ekonomi_persen, satuan, rekomendasi_aman, rekomendasi_waspada, rekomendasi_bahaya) VALUES
('amb-01', 'kom-01', 'opt-01', 'Vegetatif', 5.0, 10.0, '%',
 'Pemantauan rutin mingguan dan pelestarian musuh alami laba-laba serigala.',
 'Pengeringan sawah berselang (intermittent), pemasangan lampu perangkap, aplikasi biopestisida Beauveria bassiana.',
 'Intervensi darurat: Insektisida kimia selektif berbahan aktif pimetrozin atau buprofezin dengan prinsip tepat dosis.'),
('amb-02', 'kom-01', 'opt-02', 'Vegetatif', 3.0, 6.0, '%',
 'Sanitasi jerami sisa panen dan monitoring kelompok telur.',
 'Pelepasan parasitoid telur Trichogramma japonicum.',
 'Aplikasi insektisida sistemik berbutir (karbofuran) pada zona perakaran secara selektif.'),
('amb-03', 'kom-04', 'opt-04', 'Vegetatif', 5.0, 10.0, '%',
 'Sanitasi gulma inang dan rotasi tanaman non-inang.',
 'Pemasangan perangkap feromonoid seks dan aplikasi biopestisida ekstrak nimba (azadirachtin).',
 'Aplikasi insektisida selektif emamektin benzoat atau klorantraniliprol sesuai ambang.'),
('amb-04', 'kom-01', 'opt-06', 'Generatif', 5.0, 10.0, '%',
 'Sanitasi gulma inang rumput teki/jajagoan di pematang dan monitoring populasi berkala saat fase masak susu.',
 'Pemasangan perangkap bangkai kepiting/keong mas di pematang dan aplikasi agens hayati Beauveria bassiana.',
 'Intervensi darurat: Insektisida kontak selektif berbahan aktif BPMC/Fenobukarb atau Deltametrin diaplikasikan pagi hari tepat sasaran.'),
('amb-05', 'kom-01', 'opt-06', 'Semua Fase', 5.0, 10.0, '%',
 'Sanitasi gulma inang rumput teki/jajagoan di pematang dan monitoring populasi berkala.',
 'Pemasangan perangkap bangkai kepiting/keong mas di pematang dan aplikasi agens hayati Beauveria bassiana.',
 'Intervensi darurat: Insektisida kontak selektif berbahan aktif BPMC/Fenobukarb atau Deltametrin diaplikasikan pagi hari tepat sasaran.');
