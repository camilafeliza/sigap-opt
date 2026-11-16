# sigap-opt 🌾

Sistem cerdas pendukung penerapan **Pengendalian Hama Terpadu (PHT)** berbasis **AI Vision (Google Gemini 2.5 Flash)**, kalkulasi intensitas serangan lahan riil, dan pengambilan keputusan presisi berdasarkan ambang ekonomi agronomi lapangan.

---

## 🚀 Fitur Utama

- **Mobile-First & Fixed Bottom Navigation**: Antarmuka responsif ramah jempol lapangan (*thumb-friendly*), terpusat rapi di desktop (`max-w-md`).
- **Minimal Copywriting & Metric-Driven**: Berbasis angka telemetri presisi, status badge, dan ikonografi Phosphor Icons (`phosphor-solid`).
- **Strict Tri-Color Palette**: Oranye (`#F97316`), Ungu (`#7C3AED`), dan Putih/Netral (`#FFFFFF` / `#0F172A`).
- **Dukungan Mode Terang & Mode Gelap**: Transisi instan 1-ketukan di header dan pengaturan preferensi tema yang tersimpan di `localStorage`.
- **Karakter Kartun 3D Acak untuk Profil**: Integrasi pustaka avatar kartun 3D (`@dicebear/core` & `@dicebear/collection`) yang dapat diacak secara acak dan dinamis.
- **Visualisasi SOTA (Chart.js)**:
  - Grafik tren intensitas spline line dengan indikator garis putus-putus batas waspada (5%) dan ambang ekonomi (10%).
  - Grafik batang horizontal OPT terbanyak yang sering terdeteksi.
- **UI Kustom Card Rata Intensitas**: Dilengkapi SVG circular radial progress dial dan skala ambang PHT 3-zona tersegmentasi dengan pin penunjuk dinamis.
- **Alur Observasi Lengkap (8 Tahap PHT)**:
  1. Identitas Lahan & Tanaman (Komoditas, Varietas, Petak, Fase Tumbuh).
  2. Pemotretan Visual OPT Lapangan & Kompresi Citra.
  3. Identifikasi Otomatis AI Multimodal Google Gemini Vision.
  4. Input Sampling Diagonal Kuantitatif Lapangan ($N$ dan $n$).
  5. Kalkulasi Otomatis Persentase Intensitas Serangan ($I\%$).
  6. Komparasi Algoritma Batas Waspada & Ambang Ekonomi.
  7. Rekomendasi PHT Berjenjang (Mekanis, Kultur Teknis, Hayati, Kimia Selektif).
  8. Perekaman Riwayat Observasi Permanen.
- **Role-Based Access Control (RBAC)**:
  - `Petani`: Akses Beranda & Observasi Lapangan.
  - `Superadmin`: Akses Penuh (Beranda, Observasi, Pengguna, Master Ambang Ekonomi).

---

## 🛠️ Tech Stack

- **Frontend**: SolidJS + Vite + TypeScript
- **Komponen**: Ark UI (`@ark-ui/solid`)
- **Ikon**: Phosphor Icons (`phosphor-solid`)
- **Grafik**: Chart.js (`chart.js`)
- **Avatar 3D**: DiceBear Core & Collection (`@dicebear/core`, `@dicebear/collection`)
- **Styling**: Tailwind CSS (Tailwind v3, Dark Mode class, Custom DM Sans & Roboto)
- **Backend API**: Node.js & Rust Axum + LibSQL
- **AI Vision**: Google AI Studio (Gemini 2.5 Flash)

---

## 💻 Cara Menjalankan di Lokal

### 🐳 Opsi 1: Menggunakan Podman Compose (Sangat Direkomendasikan)
Cukup jalankan satu perintah untuk mengompilasi frontend dan menjalankan seluruh sistem:
```bash
# 1. Jalankan aplikasi via Podman Compose
podman compose up -d --build

# Atau jika menggunakan CLI podman-compose:
podman-compose up -d --build

# 2. Buka aplikasi di browser
# http://localhost:8080

# 3. Cek log kontainer
podman compose logs -f

# 4. Hentikan aplikasi
podman compose down
```

---

### 🛠️ Opsi 2: Menjalankan Secara Manual (Node.js & pnpm)

#### 1. Prasyarat
- Node.js (LTS v20+)
- pnpm (`npm install -g pnpm`)

#### 2. Jalankan Backend API
```bash
node scripts/mock-backend.js
# Backend berjalan di http://127.0.0.1:8080
```

#### 3. Jalankan Frontend
```bash
cd frontend
pnpm install
pnpm dev --host 0.0.0.0 --port 3000
# Buka http://localhost:3000 di browser
```

#### 4. Build Produksi
```bash
cd frontend
pnpm build
```

---

## 📄 Lisensi
Proyek ini dilisensikan di bawah lisensi [MIT License](LICENSE) - Hak Cipta © 2026 Camila Feliza.
