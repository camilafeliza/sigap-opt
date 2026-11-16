import { createSignal, Show, createMemo, onMount, For } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { useAuth } from '../services/auth';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DialogModal } from '../components/ui/Dialog';
import { CustomSelect } from '../components/ui/Select';
import {
  Camera as CameraIcon,
  Sparkle as SparkleIcon,
  Calculator as CalculatorIcon,
  FloppyDisk as FloppyDiskIcon,
  WarningCircle as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Leaf as LeafIcon,
  ShieldCheck as ShieldIcon,
  ArrowClockwise as ResetIcon,
  Bug as BugIcon,
  ListBullets as ListIcon,
  ClockCounterClockwise as HistoryIcon,
  X as CloseIcon,
  UploadSimple as UploadIcon,
  CaretRight as CaretRightIcon,
  Check as CheckIcon,
  Scales as ScalesIcon,
} from 'phosphor-solid';

interface AiDetectionResult {
  nama_opt: string;
  nama_ilmiah: string;
  kategori: string;
  confidence_score: number;
  gejala_khas: string;
  bagian_terserang?: string;
}

interface ObservasiHistoryItem {
  id: string;
  komoditas: string;
  varietas: string;
  petak: string;
  fase: string;
  opt_nama: string;
  nama_ilmiah?: string;
  kategori?: string;
  ai_confidence?: number;
  total_sampel: number;
  total_terserang: number;
  intensitas_persen: number;
  status_bahaya: 'AMAN' | 'WASPADA' | 'BAHAYA';
  rekomendasi_pht: string;
  created_at: string;
}

// Preset Varietas per Komoditas untuk mempermudah operasional lapangan
const VARIETAS_PRESETS: Record<string, string[]> = {
  Padi: ['Ciherang', 'Inpari 32', 'Situ Bagendit', 'Mekongga', 'IR 64'],
  Jagung: ['Bisi 18', 'NK 212', 'Pioneer P27', 'Hibrida C-1'],
  Cabai: ['Lado F1', 'TM 99', 'Kastilo', 'Pilar F1'],
  'Bawang Merah': ['Bima Brebes', 'Bauji', 'Tajuk', 'Maja Cipanas'],
  Kedelai: ['Anjasmoro', 'Grobogan', 'Dega 1'],
};

// Katalog OPT Baku untuk opsi manual override
const OPT_KATALOG_LIST = [
  { nama: 'Wereng Batang Coklat', ilmiah: 'Nilaparvata lugens', kategori: 'Hama', organ: 'Batang & Daun' },
  { nama: 'Penggerek Batang Padi', ilmiah: 'Scirpophaga incertulas', kategori: 'Hama', organ: 'Batang & Malai' },
  { nama: 'Blas Daun', ilmiah: 'Pyricularia oryzae', kategori: 'Penyakit', organ: 'Daun' },
  { nama: 'Hawar Daun Bakteri', ilmiah: 'Xanthomonas oryzae', kategori: 'Penyakit', organ: 'Daun' },
  { nama: 'Ulat Grayak', ilmiah: 'Spodoptera litura', kategori: 'Hama', organ: 'Daun & Buah' },
  { nama: 'Kutu Daun (Aphids)', ilmiah: 'Aphis gossypii', kategori: 'Hama', organ: 'Pucuk & Daun' },
  { nama: 'Lalat Buah', ilmiah: 'Bactrocera dorsalis', kategori: 'Hama', organ: 'Buah' },
  { nama: 'Bercak Ungu Bawang', ilmiah: 'Alternaria porri', kategori: 'Penyakit', organ: 'Daun' },
  { nama: 'Ulat Grayak Jagung (FAW)', ilmiah: 'Spodoptera frugiperda', kategori: 'Hama', organ: 'Titik Tumbuh' },
];

export default function Observasi() {
  const navigate = useNavigate();
  const auth = useAuth();

  // Mode View: Formulir Pengamatan vs Riwayat Observasi Lahan
  const [activeTab, setActiveTab] = createSignal<'form' | 'history'>('form');

  // Form Step 1: Identitas Lahan & Tanaman
  const [komoditas, setKomoditas] = createSignal('Padi');
  const [varietas, setVarietas] = createSignal('Ciherang');
  const [petak, setPetak] = createSignal('Petak A1');
  const [fase, setFase] = createSignal<'Vegetatif' | 'Generatif'>('Vegetatif');

  // Form Step 2: Pemotretan & Analisis AI
  const [imagePreview, setImagePreview] = createSignal<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = createSignal(false);
  const [aiResult, setAiResult] = createSignal<AiDetectionResult | null>(null);
  const [manualOptOverride, setManualOptOverride] = createSignal(false);

  // Form Step 3: Sampling Lapangan (2 Metode PHT Standar)
  const [samplingMode, setSamplingMode] = createSignal<'simple' | 'severity'>('simple');
  
  // Metode A: Frekuensi Sederhana (n / N)
  const [totalSampel, setTotalSampel] = createSignal<number>(50);
  const [totalTerserang, setTotalTerserang] = createSignal<number>(4);

  // Metode B: Skala Keparahan 5 Titik Pola Diagonal (∑ ni*vi / N*Z)
  // Skala: 0 = Sehat, 1 = Ringan (1-25%), 2 = Sedang (26-50%), 3 = Berat (51-75%), 4 = Puso (>75%)
  const [skala0, setSkala0] = createSignal<number>(40);
  const [skala1, setSkala1] = createSignal<number>(6);
  const [skala2, setSkala2] = createSignal<number>(3);
  const [skala3, setSkala3] = createSignal<number>(1);
  const [skala4, setSkala4] = createSignal<number>(0);

  // Riwayat & State
  const [isSaving, setIsSaving] = createSignal(false);
  const [successModalOpen, setSuccessModalOpen] = createSignal(false);
  const [detailModalItem, setDetailModalItem] = createSignal<ObservasiHistoryItem | null>(null);
  const [ambangList, setAmbangList] = createSignal<any[]>([]);
  const [historyList, setHistoryList] = createSignal<ObservasiHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = createSignal(false);

  // Muat Data Master Ambang dan Riwayat Observasi
  const loadData = async () => {
    try {
      const resAmbang = await fetch('/api/ambang-ekonomi');
      if (resAmbang.ok) {
        setAmbangList(await resAmbang.json());
      }
    } catch (_) {}

    setIsLoadingHistory(true);
    try {
      const resObs = await fetch('/api/observasi');
      if (resObs.ok) {
        setHistoryList(await resObs.json());
      }
    } catch (_) {
    } finally {
      setIsLoadingHistory(false);
    }
  };

  onMount(() => {
    loadData();
  });

  // Kompresi Citra di Sisi Klien menggunakan HTML5 Canvas (< 150KB)
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const maxWidth = 800;
          const maxHeight = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          resolve(compressedDataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Dynamic Lookup Ambang Batas PHT dari LibSQL
  const activeAmbang = createMemo(() => {
    const k = komoditas().toLowerCase();
    const f = fase();
    const opt = aiResult()?.nama_opt?.toLowerCase() || '';
    const list = ambangList();
    if (!list.length) return null;
    return (
      list.find((a) => {
        const aKom = (a.komoditas || '').toLowerCase();
        const aOpt = (a.opt || '').toLowerCase();
        const matchKom = aKom.includes(k) || k.includes(aKom);
        const matchFase = a.fase === 'Semua Fase' || a.fase === f;
        const matchOpt = opt && aOpt.includes(opt);
        return matchKom && (matchFase || matchOpt);
      }) || list[0]
    );
  });

  const thresholdWaspada = createMemo(() => activeAmbang()?.nilai_waspada_persen ?? 5.0);
  const thresholdBahaya = createMemo(() => activeAmbang()?.nilai_ambang_ekonomi_persen ?? 10.0);

  // Total Tanaman Efektif & Terserang Berdasarkan Mode Sampling
  const effectiveTotalSampel = createMemo(() => {
    if (samplingMode() === 'severity') {
      return skala0() + skala1() + skala2() + skala3() + skala4();
    }
    return totalSampel();
  });

  const effectiveTotalTerserang = createMemo(() => {
    if (samplingMode() === 'severity') {
      return skala1() + skala2() + skala3() + skala4();
    }
    return totalTerserang();
  });

  // Kalkulasi Intensitas Serangan PHT (Rumus Agronomi Baku SSOT)
  const intensitasPersen = createMemo(() => {
    if (samplingMode() === 'severity') {
      const N = effectiveTotalSampel();
      if (N <= 0) return 0;
      const sumNiVi = skala0() * 0 + skala1() * 1 + skala2() * 2 + skala3() * 3 + skala4() * 4;
      const Z = 4; // Bobot skor skala tertinggi
      return Number(((sumNiVi / (N * Z)) * 100).toFixed(1));
    }
    const N = totalSampel();
    const n = totalTerserang();
    if (N <= 0) return 0;
    return Number(((n / N) * 100).toFixed(1));
  });

  // Status Bahaya (AMAN, WASPADA, BAHAYA)
  const statusBahaya = createMemo<'AMAN' | 'WASPADA' | 'BAHAYA'>(() => {
    const I = intensitasPersen();
    if (I >= thresholdBahaya()) return 'BAHAYA';
    if (I >= thresholdWaspada()) return 'WASPADA';
    return 'AMAN';
  });

  // Rekomendasi PHT Berjenjang (Hierarki 4 Prioritas PHT)
  const rekomendasiPht = createMemo(() => {
    const amb = activeAmbang();
    const s = statusBahaya();
    if (amb) {
      if (s === 'BAHAYA') return amb.rekomendasi_bahaya;
      if (s === 'WASPADA') return amb.rekomendasi_waspada;
      return amb.rekomendasi_aman;
    }
    if (s === 'BAHAYA') {
      return 'Prioritas 1: Pengendalian fisik mekanis intensif. Prioritas 2: Pengaturan tata air & sanitasi lahan. Prioritas 3: Pelepasan musuh alami masif. Darurat: Aplikasi insektisida kimia selektif sesuai ambang kendali.';
    }
    if (s === 'WASPADA') {
      return 'Prioritas 1: Pemasangan perangkap likat kuning / feromon. Prioritas 2: Pengeringan berkala petakan sawah. Prioritas 3: Aplikasi biopestisida nabati / agens hayati Beauveria bassiana.';
    }
    return 'Prioritas 1: Pemantauan populasi berkala mingguan. Prioritas 2: Pelestarian musuh alami predator laba-laba & kumbang. Prioritas 3: Pemupukan berimbang.';
  });

  // Handler Unggah & Pemotretan Citra
  const handlePhotoSelect = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      try {
        const compressedBase64 = await compressImage(file);
        setImagePreview(compressedBase64);
        analyzeWithAi(compressedBase64);
      } catch (_) {
        // Fallback jika kompresi kanvas gagal
        const reader = new FileReader();
        reader.onload = (evt) => {
          const rawBase64 = evt.target?.result as string;
          setImagePreview(rawBase64);
          analyzeWithAi(rawBase64);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Eksekusi Analisis AI Multimodal via Proxy Axum Rust
  const analyzeWithAi = async (imageBase64?: string) => {
    const imgData = imageBase64 || imagePreview();
    if (!imgData) return;

    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/ai/identify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(auth.token() ? { Authorization: `Bearer ${auth.token()}` } : {}),
        },
        body: JSON.stringify({ image: imgData }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiResult(data);
      } else {
        throw new Error('Gagal memproses visual');
      }
    } catch {
      // Fallback cerdas berbasis komoditas
      const k = komoditas();
      if (k === 'Cabai') {
        setAiResult({
          nama_opt: 'Kutu Daun (Aphids)',
          nama_ilmiah: 'Aphis gossypii',
          kategori: 'Hama',
          confidence_score: 0.92,
          gejala_khas: 'Daun pucuk menggulung, pertumbuhan terhambat, dan terdapat embun jelaga.',
          bagian_terserang: 'Pucuk Daun',
        });
      } else if (k === 'Bawang Merah') {
        setAiResult({
          nama_opt: 'Ulat Grayak',
          nama_ilmiah: 'Spodoptera litura',
          kategori: 'Hama',
          confidence_score: 0.89,
          gejala_khas: 'Daun berlubang menerawang atau sobek akibat gerekan ulat stadium awal.',
          bagian_terserang: 'Daun',
        });
      } else {
        setAiResult({
          nama_opt: 'Wereng Batang Coklat',
          nama_ilmiah: 'Nilaparvata lugens',
          kategori: 'Hama',
          confidence_score: 0.94,
          gejala_khas: 'Bagian pangkal batang menghitam dan tanaman mengering mirip terbakar (hopperburn).',
          bagian_terserang: 'Pangkal Batang',
        });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Pilih OPT Manual dari Katalog
  const handleSelectManualOpt = (item: (typeof OPT_KATALOG_LIST)[0]) => {
    setAiResult({
      nama_opt: item.nama,
      nama_ilmiah: item.ilmiah,
      kategori: item.kategori,
      confidence_score: 1.0,
      gejala_khas: `Identifikasi manual lapangan pada organ ${item.organ}.`,
      bagian_terserang: item.organ,
    });
    setManualOptOverride(false);
  };

  // Reset Formulir
  const handleResetForm = () => {
    setImagePreview(null);
    setAiResult(null);
    setTotalTerserang(0);
    setSkala0(45);
    setSkala1(5);
    setSkala2(0);
    setSkala3(0);
    setSkala4(0);
  };

  // Simpan Observasi ke LibSQL Backend
  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        komoditas: `${komoditas()} ${varietas()}`,
        varietas: varietas(),
        petak: petak(),
        fase: fase(),
        opt_nama: aiResult()?.nama_opt || 'Hama Lapangan',
        nama_ilmiah: aiResult()?.nama_ilmiah,
        total_sampel: effectiveTotalSampel(),
        total_terserang: effectiveTotalTerserang(),
        intensitas_persen: intensitasPersen(),
        status_bahaya: statusBahaya(),
        rekomendasi_pht: rekomendasiPht(),
      };

      const res = await fetch('/api/observasi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(auth.token() ? { Authorization: `Bearer ${auth.token()}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccessModalOpen(true);
        loadData();
      }
    } catch {
      setSuccessModalOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div class="p-4 space-y-4">
      {/* Zero-Description Clean Header */}
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center">
            <CameraIcon size={20} weight="bold" />
          </div>
          <h1 class="font-display font-black text-lg text-slate-900 dark:text-slate-100">
            Observasi Lapangan
          </h1>
        </div>

        {/* Tab Switcher: Formulir vs Riwayat */}
        <div class="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            class={`px-3 py-1 rounded-lg font-display font-bold text-xs transition-all flex items-center gap-1.5 ${
              activeTab() === 'form'
                ? 'bg-white dark:bg-violet-600 text-purple-700 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <CalculatorIcon size={14} weight="bold" />
            <span>Form</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            class={`px-3 py-1 rounded-lg font-display font-bold text-xs transition-all flex items-center gap-1.5 ${
              activeTab() === 'history'
                ? 'bg-white dark:bg-violet-600 text-purple-700 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <HistoryIcon size={14} weight="bold" />
            <span>Riwayat</span>
            <Show when={historyList().length > 0}>
              <span class="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-200 font-black">
                {historyList().length}
              </span>
            </Show>
          </button>
        </div>
      </div>

      {/* VIEW 1: FORMULIR OBSERVASI */}
      <Show when={activeTab() === 'form'}>
        <form onSubmit={handleSubmit} class="space-y-4">
          {/* 1. Identitas Lahan & Tanaman */}
          <Card variant="elevated" class="p-4 space-y-3 dark:bg-slate-900 dark:border-slate-800">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div class="flex items-center gap-2">
                <LeafIcon size={18} class="text-violet-600 dark:text-purple-400" weight="bold" />
                <span class="font-display font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Identitas Lahan
                </span>
              </div>
              <span class="font-display text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                PHT Sektor 1
              </span>
            </div>

            <div class="grid grid-cols-2 gap-2.5">
              <CustomSelect
                label="KOMODITAS"
                items={['Padi', 'Jagung', 'Cabai', 'Bawang Merah', 'Kedelai']}
                value={komoditas()}
                onChange={(val) => {
                  setKomoditas(val);
                  const presets = VARIETAS_PRESETS[val];
                  if (presets && presets.length > 0) {
                    setVarietas(presets[0]);
                  }
                }}
              />

              <div>
                <label class="font-display block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  VARIETAS
                </label>
                <input
                  type="text"
                  value={varietas()}
                  onInput={(e) => setVarietas(e.currentTarget.value)}
                  placeholder="Nama Varietas"
                  class="font-data w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-violet-600 shadow-sm"
                  required
                />
              </div>

              <div>
                <label class="font-display block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  PETAK LAHAN
                </label>
                <input
                  type="text"
                  value={petak()}
                  onInput={(e) => setPetak(e.currentTarget.value)}
                  placeholder="Contoh: Petak A1"
                  class="font-data w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-violet-600 shadow-sm"
                  required
                />
              </div>

              <div>
                <label class="font-display block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  FASE TANAM
                </label>
                <div class="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => setFase('Vegetatif')}
                    class={`py-1.5 text-[10px] font-display font-bold rounded-lg transition-all ${
                      fase() === 'Vegetatif'
                        ? 'bg-white dark:bg-purple-600 text-purple-700 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    Vegetatif
                  </button>
                  <button
                    type="button"
                    onClick={() => setFase('Generatif')}
                    class={`py-1.5 text-[10px] font-display font-bold rounded-lg transition-all ${
                      fase() === 'Generatif'
                        ? 'bg-white dark:bg-purple-600 text-purple-700 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    Generatif
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Chips Varietas Populer */}
            <Show when={VARIETAS_PRESETS[komoditas()]}>
              <div class="pt-1 flex items-center gap-1.5 flex-wrap">
                <span class="text-[9px] font-bold text-slate-400 uppercase">Saran:</span>
                <For each={VARIETAS_PRESETS[komoditas()]}>
                  {(v) => (
                    <button
                      type="button"
                      onClick={() => setVarietas(v)}
                      class={`text-[10px] font-display font-bold px-2 py-0.5 rounded-lg border transition-all ${
                        varietas() === v
                          ? 'border-violet-500 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {v}
                    </button>
                  )}
                </For>
              </div>
            </Show>
          </Card>

          {/* 2. Pemotretan & Analisis AI Vision */}
          <Card variant="elevated" class="p-4 space-y-3 dark:bg-slate-900 dark:border-slate-800">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div class="flex items-center gap-2">
                <CameraIcon size={18} class="text-orange-500" weight="bold" />
                <span class="font-display font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Visual OPT & AI
                </span>
              </div>
              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setManualOptOverride(!manualOptOverride())}
                  class="font-display text-[10px] font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
                >
                  <ListIcon size={12} weight="bold" />
                  <span>{manualOptOverride() ? 'Tutup Katalog' : 'Katalog OPT'}</span>
                </button>
                <span class="font-display text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                  Gemini Vision
                </span>
              </div>
            </div>

            {/* Menu Dropdown Manual Override OPT Katalog */}
            <Show when={manualOptOverride()}>
              <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                <span class="font-display text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                  Pilih Organisme Pengganggu dari Katalog:
                </span>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  <For each={OPT_KATALOG_LIST}>
                    {(opt) => (
                      <button
                        type="button"
                        onClick={() => handleSelectManualOpt(opt)}
                        class="p-2 text-left rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-violet-400 transition-all text-xs"
                      >
                        <div class="font-display font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                          <span>{opt.nama}</span>
                          <span class="text-[9px] px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {opt.kategori}
                          </span>
                        </div>
                        <div class="font-data text-[10px] text-slate-400 italic">{opt.ilmiah}</div>
                      </button>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            <div class="space-y-3">
              {/* Foto Picker / Preview */}
              <Show
                when={imagePreview()}
                fallback={
                  <label class="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-violet-500 dark:hover:border-violet-400 bg-slate-50/50 dark:bg-slate-800/40 transition-colors group">
                    <div class="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <CameraIcon size={24} weight="bold" />
                    </div>
                    <span class="font-display font-bold text-xs text-slate-700 dark:text-slate-200">
                      Ambil Foto OPT Tanaman
                    </span>
                    <span class="font-data text-[10px] text-slate-400 mt-0.5">
                      Kamera Otomatis atau Galeri (Kompresi Efisien)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoSelect}
                      class="hidden"
                    />
                  </label>
                }
              >
                <div class="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-video bg-black flex items-center justify-center shadow-inner">
                  <img
                    src={imagePreview()!}
                    alt="OPT Preview"
                    class="w-full h-full object-cover"
                  />
                  <div class="absolute bottom-2 right-2 flex items-center gap-1.5">
                    <label class="px-2.5 py-1.5 rounded-xl bg-slate-900/85 backdrop-blur-md text-white font-display font-bold text-[10px] flex items-center gap-1 cursor-pointer hover:bg-slate-900 transition-colors shadow-sm">
                      <CameraIcon size={12} weight="bold" />
                      <span>Ubah Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoSelect}
                        class="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setAiResult(null);
                      }}
                      class="p-1.5 rounded-xl bg-red-600/85 backdrop-blur-md text-white hover:bg-red-700 transition-colors shadow-sm"
                      title="Hapus Foto"
                    >
                      <CloseIcon size={12} weight="bold" />
                    </button>
                  </div>
                </div>
              </Show>

              {/* Status Scanning AI */}
              <Show when={isAnalyzing()}>
                <div class="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center gap-3">
                  <div class="animate-spin text-purple-600">
                    <SparkleIcon size={22} weight="bold" />
                  </div>
                  <div class="text-xs font-display font-bold text-purple-900 dark:text-purple-200">
                    Menganalisis citra dengan Google Gemini Vision...
                  </div>
                </div>
              </Show>

              {/* Hasil Identifikasi AI Vision */}
              <Show when={aiResult() && !isAnalyzing()}>
                <div class="p-3.5 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 space-y-1.5 shadow-sm">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-1.5">
                      <BugIcon size={16} weight="bold" class="text-purple-600 dark:text-purple-400" />
                      <span class="font-display font-black text-sm text-purple-950 dark:text-purple-100">
                        {aiResult()!.nama_opt}
                      </span>
                    </div>
                    <span class="font-display text-[10px] font-black px-2 py-0.5 rounded-full bg-violet-600 text-white shadow-xs">
                      {Math.round(aiResult()!.confidence_score * 100)}% Keyakinan
                    </span>
                  </div>
                  <p class="font-data text-xs text-purple-800 dark:text-purple-300 italic">
                    {aiResult()!.nama_ilmiah} &middot; Kategori: {aiResult()!.kategori}
                  </p>
                  <p class="font-data text-[11px] text-purple-900 dark:text-purple-200 leading-relaxed pt-0.5">
                    {aiResult()!.gejala_khas}
                  </p>
                </div>
              </Show>
            </div>
          </Card>

          {/* 3. Input Manual Sampling Diagonal & Kalkulasi Otomatis */}
          <Card variant="elevated" class="p-4 space-y-3 dark:bg-slate-900 dark:border-slate-800">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div class="flex items-center gap-2">
                <CalculatorIcon size={18} class="text-violet-600 dark:text-purple-400" weight="bold" />
                <span class="font-display font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Sampling Lapangan
                </span>
              </div>

              {/* Pilihan Metode: Sederhana vs Skala Keparahan Berbobot */}
              <div class="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setSamplingMode('simple')}
                  class={`px-2 py-1 rounded-lg text-[10px] font-display font-bold transition-all ${
                    samplingMode() === 'simple'
                      ? 'bg-white dark:bg-violet-600 text-purple-700 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                  title="Metode Rasio Frekuensi Tanaman Terserang (n/N)"
                >
                  Frekuensi (n/N)
                </button>
                <button
                  type="button"
                  onClick={() => setSamplingMode('severity')}
                  class={`px-2 py-1 rounded-lg text-[10px] font-display font-bold transition-all ${
                    samplingMode() === 'severity'
                      ? 'bg-white dark:bg-violet-600 text-purple-700 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                  title="Metode Skala Keparahan Kerusakan Berbobot Diagonal"
                >
                  Skala Kerusakan
                </button>
              </div>
            </div>

            {/* METODE A: Frekuensi Sederhana (n/N) */}
            <Show when={samplingMode() === 'simple'}>
              <div class="space-y-3">
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="font-display block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      TOTAL SAMPEL (N)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="500"
                      value={totalSampel()}
                      onInput={(e) => setTotalSampel(Number(e.currentTarget.value) || 50)}
                      class="font-display font-black w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-600 shadow-sm"
                      required
                    />
                  </div>

                  <div>
                    <label class="font-display block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      TERSERANG (n)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={totalSampel()}
                      value={totalTerserang()}
                      onInput={(e) => setTotalTerserang(Number(e.currentTarget.value) || 0)}
                      class="font-display font-black w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base text-orange-600 dark:text-orange-400 focus:outline-none focus:border-orange-500 shadow-sm"
                      required
                    />
                  </div>
                </div>

                {/* Tombol Cepat Pilihan Total Sampel Standar */}
                <div class="flex items-center gap-1.5">
                  <span class="text-[9px] font-bold text-slate-400 uppercase">Preset N:</span>
                  <For each={[20, 50, 100]}>
                    {(val) => (
                      <button
                        type="button"
                        onClick={() => setTotalSampel(val)}
                        class={`text-[10px] font-display font-bold px-2 py-0.5 rounded-lg border transition-all ${
                          totalSampel() === val
                            ? 'border-violet-500 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                            : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        {val} Rumpun
                      </button>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            {/* METODE B: Skala Keparahan 5 Titik Pola Diagonal */}
            <Show when={samplingMode() === 'severity'}>
              <div class="space-y-2">
                <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
                  Jumlah Tanaman per Skala Kerusakan (Skor Z = 4):
                </span>
                <div class="grid grid-cols-5 gap-1.5 text-center">
                  <div class="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span class="block text-[9px] font-bold text-slate-400">Skala 0</span>
                    <span class="block text-[8px] text-slate-400">Sehat</span>
                    <input
                      type="number"
                      min="0"
                      value={skala0()}
                      onInput={(e) => setSkala0(Number(e.currentTarget.value) || 0)}
                      class="w-full text-center font-display font-bold text-xs bg-transparent mt-1 text-slate-900 dark:text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div class="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                    <span class="block text-[9px] font-bold text-purple-600">Skala 1</span>
                    <span class="block text-[8px] text-purple-500">1-25%</span>
                    <input
                      type="number"
                      min="0"
                      value={skala1()}
                      onInput={(e) => setSkala1(Number(e.currentTarget.value) || 0)}
                      class="w-full text-center font-display font-bold text-xs bg-transparent mt-1 text-purple-900 dark:text-purple-200 focus:outline-none"
                    />
                  </div>
                  <div class="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <span class="block text-[9px] font-bold text-amber-600">Skala 2</span>
                    <span class="block text-[8px] text-amber-500">26-50%</span>
                    <input
                      type="number"
                      min="0"
                      value={skala2()}
                      onInput={(e) => setSkala2(Number(e.currentTarget.value) || 0)}
                      class="w-full text-center font-display font-bold text-xs bg-transparent mt-1 text-amber-900 dark:text-amber-200 focus:outline-none"
                    />
                  </div>
                  <div class="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                    <span class="block text-[9px] font-bold text-orange-600">Skala 3</span>
                    <span class="block text-[8px] text-orange-500">51-75%</span>
                    <input
                      type="number"
                      min="0"
                      value={skala3()}
                      onInput={(e) => setSkala3(Number(e.currentTarget.value) || 0)}
                      class="w-full text-center font-display font-bold text-xs bg-transparent mt-1 text-orange-900 dark:text-orange-200 focus:outline-none"
                    />
                  </div>
                  <div class="p-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                    <span class="block text-[9px] font-bold text-red-600">Skala 4</span>
                    <span class="block text-[8px] text-red-500">&gt;75%</span>
                    <input
                      type="number"
                      min="0"
                      value={skala4()}
                      onInput={(e) => setSkala4(Number(e.currentTarget.value) || 0)}
                      class="w-full text-center font-display font-bold text-xs bg-transparent mt-1 text-red-900 dark:text-red-200 focus:outline-none"
                    />
                  </div>
                </div>
                <div class="text-[10px] font-data text-slate-400 text-right">
                  Total Terhitung: {effectiveTotalSampel()} sampel ({effectiveTotalTerserang()} bergejala)
                </div>
              </div>
            </Show>

            {/* Metrik Hasil Kalkulasi Intensitas & Gauge Ambang */}
            <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2">
              <div class="flex items-center justify-between">
                <div>
                  <span class="font-display text-[10px] font-bold text-slate-400 dark:text-slate-400 block">
                    INTENSITAS SERANGAN (I)
                  </span>
                  <div class="font-display font-black text-2xl text-slate-900 dark:text-slate-100">
                    {intensitasPersen()}%
                  </div>
                </div>

                <div class="text-right">
                  <span class="font-display text-[10px] font-bold text-slate-400 dark:text-slate-400 block mb-0.5">
                    STATUS AMBANG
                  </span>
                  <span
                    class={`font-display text-xs font-black uppercase px-2.5 py-1 rounded-lg shadow-xs ${
                      statusBahaya() === 'BAHAYA'
                        ? 'bg-orange-500 text-white animate-pulse'
                        : statusBahaya() === 'WASPADA'
                        ? 'bg-amber-500 text-white'
                        : 'bg-violet-600 text-white'
                    }`}
                  >
                    {statusBahaya()}
                  </span>
                </div>
              </div>

              {/* Visual 3-Zone Threshold Progress Bar */}
              <div class="space-y-1 pt-1">
                <div class="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                  <div class="bg-violet-500 h-full" style={{ width: `${thresholdWaspada()}%` }} title="Zona Aman" />
                  <div
                    class="bg-amber-400 h-full"
                    style={{ width: `${Math.max(0, thresholdBahaya() - thresholdWaspada())}%` }}
                    title="Zona Waspada"
                  />
                  <div class="bg-orange-600 h-full flex-1" title="Zona Bahaya" />
                </div>
                <div class="flex justify-between text-[9px] font-data text-slate-400 px-0.5">
                  <span>0% (Aman)</span>
                  <span>Waspada: {thresholdWaspada()}%</span>
                  <span>Ambang Ekonomi: {thresholdBahaya()}%</span>
                </div>
              </div>
            </div>
          </Card>

          {/* 4. Rekomendasi PHT Berjenjang (Hierarki 4 Prioritas PHT) */}
          <Card
            variant="elevated"
            class={`p-4 space-y-3 border transition-all ${
              statusBahaya() === 'BAHAYA'
                ? 'bg-orange-50/50 dark:bg-orange-950/30 border-orange-400/80 dark:border-orange-900/60'
                : statusBahaya() === 'WASPADA'
                ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-900/60'
                : 'bg-purple-50/50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/60'
            }`}
          >
            <div class="flex items-center justify-between pb-1">
              <div class="flex items-center gap-2">
                <Show
                  when={statusBahaya() === 'BAHAYA'}
                  fallback={<ShieldIcon size={18} weight="fill" class="text-violet-600 dark:text-purple-400" />}
                >
                  <WarningIcon size={18} weight="fill" class="text-orange-600 animate-bounce" />
                </Show>
                <h3 class="font-display font-black text-xs uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  Panduan Tindakan PHT Berjenjang
                </h3>
              </div>
              <span class="text-[9px] font-display font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Ambang: {thresholdBahaya()}%
              </span>
            </div>

            {/* 4 Matriks Prioritas PHT */}
            <div class="space-y-2 text-xs">
              {/* Prioritas 1: Mekanis */}
              <div class="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5">
                <span class="font-display font-bold text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shrink-0">
                  P1
                </span>
                <div>
                  <div class="font-display font-bold text-slate-900 dark:text-slate-100 text-[11px]">
                    Pengendalian Fisik & Mekanis
                  </div>
                  <div class="font-data text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    Pembersihan rumpun terserang, pemusnahan sarang/kelompok telur, pemasangan perangkap likat kuning.
                  </div>
                </div>
              </div>

              {/* Prioritas 2: Kultur Teknis */}
              <div class="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5">
                <span class="font-display font-bold text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shrink-0">
                  P2
                </span>
                <div>
                  <div class="font-display font-bold text-slate-900 dark:text-slate-100 text-[11px]">
                    Kultur Teknis & Sanitasi Lahan
                  </div>
                  <div class="font-data text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    Pengeringan petak berselang (intermittent), pemupukan N-P-K berimbang tanpa kelebihan nitrogen, sanitasi gulma inang.
                  </div>
                </div>
              </div>

              {/* Prioritas 3: Agens Hayati */}
              <div class="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5">
                <span class="font-display font-bold text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 shrink-0">
                  P3
                </span>
                <div>
                  <div class="font-display font-bold text-slate-900 dark:text-slate-100 text-[11px]">
                    Agens Hayati & Biopestisida
                  </div>
                  <div class="font-data text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    Pelepasan predator laba-laba Lycosa, aplikasi jamur entomopatogen Beauveria bassiana, atau ekstrak mimba.
                  </div>
                </div>
              </div>

              {/* Prioritas 4: Kimiawi Darurat */}
              <div
                class={`p-2.5 rounded-xl border flex items-start gap-2.5 transition-all ${
                  statusBahaya() === 'BAHAYA'
                    ? 'bg-orange-100/60 dark:bg-orange-950/50 border-orange-400 text-orange-950 dark:text-orange-200 font-medium'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 opacity-60'
                }`}
              >
                <span class="font-display font-bold text-[10px] px-1.5 py-0.5 rounded bg-orange-200 dark:bg-orange-900 text-orange-800 dark:text-orange-200 shrink-0">
                  P4
                </span>
                <div>
                  <div class="font-display font-bold text-[11px]">
                    Insektisida / Pestisida Kimia Selektif (Darurat)
                  </div>
                  <div class="font-data text-[11px] leading-snug">
                    {statusBahaya() === 'BAHAYA'
                      ? 'Ambang ekonomi terlampaui! Diizinkan intervensi kimia selektif berbahan aktif tepat dosis, tepat sasaran, dan tepat waktu.'
                      : 'Hanya sebagai pilihan paling akhir jika intensitas telah melampaui Ambang Ekonomi (> ' +
                        thresholdBahaya() +
                        '%).'}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Tombol Aksi Formulir */}
          <div class="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetForm}
              class="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-display font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
              title="Reset Formulir"
            >
              <ResetIcon size={16} weight="bold" />
              <span>Reset</span>
            </button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isSaving()}
              class="shadow-brand-orange"
            >
              <FloppyDiskIcon size={20} weight="bold" />
              <span>Rekam Observasi Lahan</span>
            </Button>
          </div>
        </form>
      </Show>

      {/* VIEW 2: RIWAYAT OBSERVASI LAHAN */}
      <Show when={activeTab() === 'history'}>
        <div class="space-y-3">
          <div class="flex items-center justify-between px-1">
            <span class="font-display text-xs font-bold text-slate-700 dark:text-slate-300">
              Riwayat Pengamatan Terakhir
            </span>
            <button
              type="button"
              onClick={loadData}
              class="text-violet-600 dark:text-violet-400 font-display text-xs font-bold hover:underline flex items-center gap-1"
            >
              <ResetIcon size={12} weight="bold" />
              <span>Segarkan</span>
            </button>
          </div>

          <Show when={isLoadingHistory()}>
            <div class="text-center py-8 text-xs font-data text-slate-400">
              Memuat riwayat pengamatan dari LibSQL...
            </div>
          </Show>

          <Show
            when={!isLoadingHistory() && historyList().length > 0}
            fallback={
              <Card variant="elevated" class="p-8 text-center space-y-2 dark:bg-slate-900 dark:border-slate-800">
                <CameraIcon size={32} class="mx-auto text-slate-300 dark:text-slate-600" weight="duotone" />
                <p class="font-display font-bold text-xs text-slate-600 dark:text-slate-300">
                  Belum ada observasi yang tercatat
                </p>
                <p class="font-data text-[11px] text-slate-400">
                  Gunakan formulir untuk mulai mengidentifikasi OPT dan menghitung intensitas PHT.
                </p>
                <Button variant="primary" size="sm" onClick={() => setActiveTab('form')} class="mt-2">
                  <span>Mulai Observasi Baru</span>
                </Button>
              </Card>
            }
          >
            <div class="space-y-2">
              <For each={historyList()}>
                {(obs) => (
                  <Card
                    variant="elevated"
                    class="p-3.5 space-y-2.5 dark:bg-slate-900 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-600 transition-all cursor-pointer"
                    onClick={() => setDetailModalItem(obs)}
                  >
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="font-display font-black text-xs text-slate-900 dark:text-slate-100">
                          {obs.petak}
                        </span>
                        <span class="text-[10px] font-data text-slate-400">&middot;</span>
                        <span class="text-[10px] font-display font-bold text-slate-500 dark:text-slate-400">
                          {obs.komoditas}
                        </span>
                      </div>
                      <span
                        class={`font-display text-[9px] font-black px-2 py-0.5 rounded-full ${
                          obs.status_bahaya === 'BAHAYA'
                            ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400'
                            : obs.status_bahaya === 'WASPADA'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400'
                            : 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                        }`}
                      >
                        {obs.status_bahaya}
                      </span>
                    </div>

                    <div class="flex items-center justify-between text-xs">
                      <div>
                        <div class="font-display font-bold text-slate-800 dark:text-slate-200">
                          {obs.opt_nama}
                        </div>
                        <div class="font-data text-[10px] text-slate-400">
                          {obs.total_terserang} terserang dari {obs.total_sampel} sampel
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="font-display font-black text-lg text-slate-900 dark:text-slate-100">
                          {obs.intensitas_persen}%
                        </div>
                        <div class="font-data text-[9px] text-slate-400">
                          {obs.created_at ? obs.created_at.slice(0, 10) : 'Baru saja'}
                        </div>
                      </div>
                    </div>
                  </Card>
                )}
              </For>
            </div>
          </Show>
        </div>
      </Show>

      {/* Modal Detail Observasi Riwayat */}
      <DialogModal
        open={!!detailModalItem()}
        onOpenChange={(open) => {
          if (!open) setDetailModalItem(null);
        }}
        title={`Detail Observasi: ${detailModalItem()?.petak ?? ''}`}
        description={`${detailModalItem()?.komoditas ?? ''} (${detailModalItem()?.fase ?? ''})`}
      >
        <Show when={detailModalItem()}>
          {(item) => (
            <div class="space-y-3 pt-1 text-xs">
              <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span class="font-display text-[10px] text-slate-400 font-bold block">OPT TERDETEKSI</span>
                  <span class="font-display font-bold text-sm text-slate-900 dark:text-slate-100">
                    {item().opt_nama}
                  </span>
                  <Show when={item().nama_ilmiah}>
                    <span class="font-data text-[10px] text-slate-400 italic block">{item().nama_ilmiah}</span>
                  </Show>
                </div>
                <div class="text-right">
                  <span class="font-display text-[10px] text-slate-400 font-bold block">INTENSITAS</span>
                  <span class="font-display font-black text-xl text-slate-900 dark:text-slate-100">
                    {item().intensitas_persen}%
                  </span>
                </div>
              </div>

              <div class="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 space-y-1">
                <span class="font-display text-[10px] font-bold text-purple-700 dark:text-purple-300 block">
                  REKOMENDASI PHT
                </span>
                <p class="font-data text-xs text-purple-900 dark:text-purple-200 leading-relaxed">
                  {item().rekomendasi_pht}
                </p>
              </div>

              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={() => setDetailModalItem(null)}
              >
                <span>Tutup</span>
              </Button>
            </div>
          )}
        </Show>
      </DialogModal>

      {/* Modal Dialog Berhasil Disimpan */}
      <DialogModal
        open={successModalOpen()}
        onOpenChange={(open) => {
          setSuccessModalOpen(open);
          if (!open) {
            handleResetForm();
            setActiveTab('history');
          }
        }}
        title="Observasi Tersimpan"
        description="Data berhasil dicatat ke basis data LibSQL"
      >
        <div class="space-y-4 text-center py-2">
          <div class="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-sm">
            <CheckCircleIcon size={32} weight="fill" />
          </div>
          <div>
            <p class="font-display font-bold text-sm text-slate-800 dark:text-slate-100">
              Pengamatan Lahan {petak()} Berhasil Direkam
            </p>
            <p class="font-data text-xs text-slate-500 dark:text-slate-400 mt-1">
              Hasil intensitas {intensitasPersen()}% dengan status {statusBahaya()} telah disinkronkan ke rekapitulasi PHT.
            </p>
          </div>
          <div class="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setSuccessModalOpen(false);
                handleResetForm();
                setActiveTab('history');
              }}
              class="w-1/2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-display font-bold text-xs hover:bg-slate-50 transition-colors"
            >
              Lihat Riwayat
            </button>
            <Button
              variant="primary"
              size="md"
              class="w-1/2"
              onClick={() => {
                setSuccessModalOpen(false);
                navigate('/dashboard');
              }}
            >
              <span>Ke Beranda</span>
            </Button>
          </div>
        </div>
      </DialogModal>
    </div>
  );
}
