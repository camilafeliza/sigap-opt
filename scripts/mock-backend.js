import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = process.env.PORT || 8080;
const HOST = process.env.APP_HOST || '0.0.0.0';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res, pathname) {
  const candidates = [
    path.resolve('frontend/dist'),
    path.resolve('../frontend/dist'),
    path.resolve('/app/frontend/dist'),
  ];
  const distDir = candidates.find(d => fs.existsSync(d));
  if (!distDir) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Frontend dist not found. Please run pnpm build first.');
    return;
  }

  let filePath = path.join(distDir, pathname === '/' ? 'index.html' : pathname);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html');
  }

  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath);
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
}

const ambangData = [
  {
    id: 'ambang-01',
    komoditas: 'Padi',
    opt: 'Wereng Batang Coklat (Nilaparvata lugens)',
    fase: 'Vegetatif',
    nilai_waspada_persen: 5.0,
    nilai_ambang_ekonomi_persen: 10.0,
    satuan: '%',
    rekomendasi_aman: 'Pemantauan rutin dan pelestarian musuh alami (laba-laba serigala, kumbang Paederus).',
    rekomendasi_waspada: 'Pengeringan sawah berkala, pemasangan perangkap lampu, aplikasi biopestisida Beauveria bassiana.',
    rekomendasi_bahaya: 'Aplikasi insektisida kimia selektif berbahan aktif pimetrozin atau buprofezin dengan prinsip tepat dosis.',
  },
  {
    id: 'ambang-02',
    komoditas: 'Padi',
    opt: 'Penggerek Batang Padi (Scirpophaga incertulas)',
    fase: 'Vegetatif',
    nilai_waspada_persen: 3.0,
    nilai_ambang_ekonomi_persen: 6.0,
    satuan: '%',
    rekomendasi_aman: 'Pengamatan kelompok telur dan sanitasi jerami sisa panen.',
    rekomendasi_waspada: 'Pelepasan parasitoid telur Trichogramma japonicum.',
    rekomendasi_bahaya: 'Aplikasi insektisida sistemik berbutir pada zona perakaran.',
  },
];

const observasiLogs = [
  {
    id: 'obs-01',
    komoditas: 'Padi Ciherang',
    varietas: 'Ciherang',
    petak: 'Petak A1',
    fase: 'Vegetatif',
    opt_nama: 'Wereng Batang Coklat',
    nama_ilmiah: 'Nilaparvata lugens',
    kategori: 'Hama',
    ai_confidence: 0.94,
    total_sampel: 50,
    total_terserang: 6,
    intensitas_persen: 12.0,
    status_bahaya: 'BAHAYA',
    rekomendasi_pht: 'Intervensi darurat: Aplikasi insektisida kimia selektif berbahan aktif pimetrozin/buprofezin.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'obs-02',
    komoditas: 'Padi Inpari 32',
    varietas: 'Inpari 32',
    petak: 'Petak B2',
    fase: 'Generatif',
    opt_nama: 'Penggerek Batang Padi',
    nama_ilmiah: 'Scirpophaga incertulas',
    kategori: 'Hama',
    ai_confidence: 0.91,
    total_sampel: 50,
    total_terserang: 4,
    intensitas_persen: 8.0,
    status_bahaya: 'BAHAYA',
    rekomendasi_pht: 'Pelepasan parasitoid Trichogramma dan pemotongan malai hampa.',
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'obs-03',
    komoditas: 'Bawang Merah',
    varietas: 'Bima Brebes',
    petak: 'Petak D1',
    fase: 'Vegetatif',
    opt_nama: 'Ulat Grayak',
    nama_ilmiah: 'Spodoptera litura',
    kategori: 'Hama',
    ai_confidence: 0.88,
    total_sampel: 40,
    total_terserang: 2,
    intensitas_persen: 5.0,
    status_bahaya: 'WASPADA',
    rekomendasi_pht: 'Pemasangan perangkap feromonoid seks dan aplikasi biopestisida ekstrak mimba.',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'obs-04',
    komoditas: 'Padi Ciherang',
    varietas: 'Ciherang',
    petak: 'Petak A2',
    fase: 'Vegetatif',
    opt_nama: 'Blas Daun',
    nama_ilmiah: 'Pyricularia oryzae',
    kategori: 'Penyakit',
    ai_confidence: 0.95,
    total_sampel: 50,
    total_terserang: 1,
    intensitas_persen: 2.0,
    status_bahaya: 'AMAN',
    rekomendasi_pht: 'Pengurangan pupuk nitrogen berlebih, jaga aerasi air sawah, dan monitoring rutin.',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'obs-05',
    komoditas: 'Cabai Merah',
    varietas: 'TM 99',
    petak: 'Petak C1',
    fase: 'Vegetatif',
    opt_nama: 'Kutu Daun (Aphids)',
    nama_ilmiah: 'Aphis gossypii',
    kategori: 'Hama',
    ai_confidence: 0.89,
    total_sampel: 30,
    total_terserang: 1,
    intensitas_persen: 3.3,
    status_bahaya: 'AMAN',
    rekomendasi_pht: 'Pelestarian musuh alami predator kumbang Coccinellidae dan penyemprotan air sabun lembut.',
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
];

const trendStats = [
  { label: 'Sen', intensity: 2.5 },
  { label: 'Sel', intensity: 3.8 },
  { label: 'Rab', intensity: 4.2 },
  { label: 'Kam', intensity: 5.5 },
  { label: 'Jum', intensity: 7.9 },
  { label: 'Sab', intensity: 11.4 },
  { label: 'Min', intensity: 6.8 },
];

const optStats = [
  { name: 'Wereng Batang Coklat', count: 18, scientificName: 'Nilaparvata lugens' },
  { name: 'Penggerek Batang Padi', count: 9, scientificName: 'Scirpophaga incertulas' },
  { name: 'Blas Daun', count: 5, scientificName: 'Pyricularia oryzae' },
  { name: 'Ulat Grayak', count: 3, scientificName: 'Spodoptera litura' },
];

const usersList = [
  { id: 'usr-admin-01', username: 'admin', full_name: 'Super Administrator', role: 'superadmin', created_at: new Date(Date.now() - 86400000 * 30).toISOString() },
  { id: 'usr-petani-01', username: 'petani', full_name: 'Pak Tani Santoso', role: 'petani', created_at: new Date(Date.now() - 86400000 * 20).toISOString() },
  { id: 'usr-petani-02', username: 'budi_padi', full_name: 'Budi Raharjo', role: 'petani', created_at: new Date(Date.now() - 86400000 * 10).toISOString() },
  { id: 'usr-petani-03', username: 'siti_horti', full_name: 'Siti Aminah', role: 'petani', created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
];

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    let parsedBody = {};
    if (body) {
      try { parsedBody = JSON.parse(body); } catch (_) {}
    }

    if (pathname === '/api/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', app: 'sigap-opt', version: '1.0' }));
    } else if (pathname === '/api/auth/login' && req.method === 'POST') {
      const { username } = parsedBody;
      const isAdmin = username === 'admin';
      const role = isAdmin ? 'superadmin' : 'petani';
      const user = {
        id: isAdmin ? 'usr-admin-01' : 'usr-petani-01',
        username: username || 'petani',
        full_name: isAdmin ? 'Super Administrator' : 'Petani Lapangan',
        role,
        created_at: new Date().toISOString(),
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        token: `jwt-${role}-${Date.now()}`,
        user,
      }));
    } else if (pathname === '/api/ai/identify' && req.method === 'POST') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        nama_opt: 'Wereng Batang Coklat',
        nama_ilmiah: 'Nilaparvata lugens',
        kategori: 'Hama',
        bagian_terserang: 'Batang',
        confidence_score: 0.94,
        gejala_khas: 'Batang tanaman mengering dan berwarna kecokelatan (hopperburn)',
      }));
    } else if (pathname === '/api/ambang-ekonomi' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(ambangData));
    } else if (pathname === '/api/observasi' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(observasiLogs));
    } else if (pathname === '/api/dashboard/stats' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        trend: trendStats,
        optRanking: optStats,
      }));
    } else if (pathname === '/api/observasi' && req.method === 'POST') {
      const {
        komoditas,
        fase,
        opt_nama,
        total_sampel,
        total_terserang,
      } = parsedBody;

      const N = Number(total_sampel) || 50;
      const n = Number(total_terserang) || 0;
      const intensitas = Number(((n / N) * 100).toFixed(2));

      let status = 'AMAN';
      let rekomendasi = 'Pemantauan rutin dan pelestarian agens hayati / musuh alami.';

      if (intensitas >= 10.0) {
        status = 'BAHAYA';
        rekomendasi = 'Intervensi darurat: Insektisida kimia selektif sesuai prinsip bijaksana PHT.';
      } else if (intensitas >= 5.0) {
        status = 'WASPADA';
        rekomendasi = 'Pengendalian mekanis, perbaikan tata air, dan aplikasi biopestisida.';
      }

      const newRecord = {
        id: `obs-${Date.now()}`,
        komoditas: komoditas || 'Padi Ciherang',
        varietas: 'Ciherang',
        petak: 'Petak Baru',
        fase: fase || 'Vegetatif',
        opt_nama: opt_nama || 'Wereng Batang Coklat',
        nama_ilmiah: 'Nilaparvata lugens',
        kategori: 'Hama',
        ai_confidence: 0.94,
        total_sampel: N,
        total_terserang: n,
        intensitas_persen: intensitas,
        status_bahaya: status,
        rekomendasi_pht: rekomendasi,
        created_at: new Date().toISOString(),
      };

      observasiLogs.unshift(newRecord);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(newRecord));
    } else if (pathname === '/api/users' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(usersList));
    } else if (pathname === '/api/users' && req.method === 'POST') {
      const newUser = {
        id: `usr-${Date.now()}`,
        username: parsedBody.username || 'petani_baru',
        full_name: parsedBody.full_name || 'Petani Anggota',
        role: parsedBody.role || 'petani',
        created_at: new Date().toISOString(),
      };
      usersList.push(newUser);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(newUser));
    } else if (pathname.startsWith('/api/users/') && req.method === 'DELETE') {
      const id = pathname.replace('/api/users/', '');
      const idx = usersList.findIndex(u => u.id === id);
      if (idx !== -1) usersList.splice(idx, 1);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } else if (pathname === '/api/ambang-ekonomi' && req.method === 'POST') {
      const newAmbang = {
        id: `ambang-${Date.now()}`,
        komoditas: parsedBody.komoditas || 'Padi',
        opt: parsedBody.opt || 'Hama Baru',
        fase: parsedBody.fase || 'Vegetatif',
        nilai_waspada_persen: Number(parsedBody.nilai_waspada_persen) || 5.0,
        nilai_ambang_ekonomi_persen: Number(parsedBody.nilai_ambang_ekonomi_persen) || 10.0,
        satuan: '%',
        rekomendasi_aman: parsedBody.rekomendasi_aman || 'Pemantauan rutin dan sanitasi gulma.',
        rekomendasi_waspada: parsedBody.rekomendasi_waspada || 'Pengendalian mekanis dan pelepasan musuh alami.',
        rekomendasi_bahaya: parsedBody.rekomendasi_bahaya || 'Intervensi kimia selektif berpedoman PHT.',
      };
      ambangData.unshift(newAmbang);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(newAmbang));
    } else if (pathname.startsWith('/api/')) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
    } else {
      serveStatic(req, res, pathname);
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[sigap-opt] Application server running on http://${HOST}:${PORT}`);
});
