import { createSignal, onMount, Show, For, createMemo } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { useAuth } from '../services/auth';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { DialogModal } from '../components/ui/Dialog';
import { IntensityTrendChart, TrendPoint } from '../components/charts/IntensityTrendChart';
import { OptDistributionChart, OptStat } from '../components/charts/OptDistributionChart';
import {
  WarningCircle,
  ShieldCheck,
  ShieldWarning,
  Bug,
  TrendUp,
  TrendDown,
  Minus,
  Camera,
  ArrowRight,
  CaretRight,
  Leaf,
  FileArrowDown,
  Info,
  CheckCircle,
} from 'phosphor-solid';

export interface ObservasiItem {
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

export default function Dashboard() {
  const auth = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = createSignal(true);
  const [observasiList, setObservasiList] = createSignal<ObservasiItem[]>([]);
  const [trendData, setTrendData] = createSignal<TrendPoint[]>([]);
  const [optRanking, setOptRanking] = createSignal<OptStat[]>([]);
  const [filterStatus, setFilterStatus] = createSignal<'SEMUA' | 'BAHAYA' | 'WASPADA' | 'AMAN'>('SEMUA');
  const [selectedObs, setSelectedObs] = createSignal<ObservasiItem | null>(null);

  onMount(async () => {
    try {
      const [resObs, resStats] = await Promise.all([
        fetch('/api/observasi'),
        fetch('/api/dashboard/stats'),
      ]);

      if (resObs.ok) {
        const data = await resObs.json();
        setObservasiList(data);
      }

      if (resStats.ok) {
        const stats = await resStats.json();
        setTrendData(stats.trend || []);
        
        // Pastikan persentase terhitung dengan presisi
        const ranking: OptStat[] = stats.optRanking || [];
        const total = ranking.reduce((acc, cur) => acc + cur.count, 0);
        const mapped = ranking.map((r) => ({
          ...r,
          percentage: total > 0 ? Math.round((r.count / total) * 1000) / 10 : 0,
        }));
        setOptRanking(mapped);
      }
    } catch {
      setTrendData([]);
      setOptRanking([]);
    } finally {
      setLoading(false);
    }
  });

  // Petak berstatus BAHAYA (melewati ambang ekonomi)
  const bahayaList = createMemo(() =>
    observasiList().filter((item) => item.status_bahaya === 'BAHAYA')
  );

  // Petak berstatus WASPADA
  const waspadaList = createMemo(() =>
    observasiList().filter((item) => item.status_bahaya === 'WASPADA')
  );

  // Filter daftar observasi
  const filteredObservations = createMemo(() => {
    const s = filterStatus();
    if (s === 'SEMUA') return observasiList();
    return observasiList().filter((item) => item.status_bahaya === s);
  });

  // Rata-rata intensitas kerusakan lapangan
  const rataIntensitas = createMemo(() => {
    const list = observasiList();
    if (!list.length) return '0.0';
    const sum = list.reduce((acc, cur) => acc + cur.intensitas_persen, 0);
    return (sum / list.length).toFixed(1);
  });

  // Total tanaman sampel yang diamati
  const totalTanamanSampel = createMemo(() => {
    return observasiList().reduce((acc, cur) => acc + cur.total_sampel, 0);
  });

  // Total tanaman terserang
  const totalTanamanTerserang = createMemo(() => {
    return observasiList().reduce((acc, cur) => acc + cur.total_terserang, 0);
  });

  // Total kasus OPT terdeteksi
  const totalOptCases = createMemo(() => {
    return optRanking().reduce((acc, cur) => acc + cur.count, 0);
  });

  // OPT dominan
  const topOpt = createMemo(() => {
    const list = optRanking();
    if (!list.length) return null;
    return list[0];
  });

  // Analisis arah pergerakan tren mingguan (Naik / Turun / Stabil)
  const trendStatus = createMemo(() => {
    const points = trendData();
    if (points.length < 2) return { text: 'Stabil', type: 'neutral' };
    const latest = points[points.length - 1].intensity;
    const prev = points[points.length - 2].intensity;
    if (latest > prev) return { text: 'Meningkat', type: 'up' };
    if (latest < prev) return { text: 'Menurun', type: 'down' };
    return { text: 'Stabil', type: 'neutral' };
  });

  // Ekspor CSV khusus Super Admin
  const exportCsv = () => {
    const headers = 'ID,Petak,Komoditas,Fase,OPT,Sampel,Terserang,Intensitas(%),Status,Tanggal\n';
    const rows = observasiList()
      .map(
        (o) =>
          `"${o.id}","${o.petak}","${o.komoditas}","${o.fase}","${o.opt_nama}",${o.total_sampel},${o.total_terserang},${o.intensitas_persen},"${o.status_bahaya}","${o.created_at}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekapitulasi-pht-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div class="p-4 space-y-4">
      {/* =========================================================================
          1. SISTEM PERINGATAN DINI: NOTIFIKASI PRIORITAS DI BAGIAN PALING ATAS
          Menyorot petak spesifik yang tingkat serangannya melewati ambang ekonomi
      ========================================================================= */}
      <Show
        when={bahayaList().length > 0}
        fallback={
          <div class="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/40 dark:to-slate-900 border border-violet-200 dark:border-purple-900/60 shadow-xs flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-violet-100 dark:bg-purple-900/50 flex items-center justify-center shrink-0 text-violet-700 dark:text-purple-300">
                <ShieldCheck size={22} weight="fill" />
              </div>
              <div>
                <span class="font-display text-xs font-black text-slate-800 dark:text-slate-100 tracking-wide block uppercase">
                  Status Lahan Terkendali
                </span>
                <span class="font-data text-[11px] text-slate-500 dark:text-slate-400 block">
                  Seluruh petak berada di bawah ambang ekonomi (10%).
                </span>
              </div>
            </div>
            <span class="font-display text-[10px] font-black px-2 py-1 rounded-lg bg-white dark:bg-slate-800 text-violet-700 dark:text-purple-300 border border-violet-200 dark:border-purple-800 shadow-xs uppercase">
              Aman
            </span>
          </div>
        }
      >
        <div class="p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border-2 border-orange-500 shadow-lg shadow-orange-500/10 space-y-3">
          {/* Header Peringatan Dini */}
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white shrink-0 shadow-xs animate-pulse">
                <WarningCircle size={22} weight="fill" />
              </div>
              <div>
                <span class="font-display text-xs font-black text-orange-950 dark:text-orange-200 tracking-wider block">
                  PERINGATAN DINI PHT
                </span>
                <span class="font-data text-[11px] text-orange-700 dark:text-orange-300 block font-medium">
                  {bahayaList().length} petak lahan melewati batas toleransi ambang ekonomi
                </span>
              </div>
            </div>
            <span class="font-display text-[9px] font-black px-2 py-0.5 rounded-full bg-orange-600 text-white uppercase tracking-wider">
              BAHAYA
            </span>
          </div>

          {/* Kartu Petak Spesifik yang Butuh Tindakan Hari Ini */}
          <div class="space-y-2 pt-1">
            <For each={bahayaList()}>
              {(item) => (
                <div class="p-3 rounded-xl bg-white dark:bg-slate-900 border border-orange-300 dark:border-orange-800 flex items-center justify-between gap-2 shadow-xs">
                  <div class="space-y-0.5 min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="font-display text-xs font-black text-slate-900 dark:text-slate-100">
                        {item.petak || 'Petak Lapangan'}
                      </span>
                      <span class="font-data text-[10px] text-slate-400">
                        · {item.komoditas} ({item.fase})
                      </span>
                    </div>
                    <div class="font-display text-[11px] font-bold text-orange-600 dark:text-orange-400 truncate">
                      {item.opt_nama}
                    </div>
                  </div>

                  <div class="flex items-center gap-2 shrink-0">
                    <div class="text-right">
                      <div class="font-display text-sm font-black text-orange-600 leading-tight">
                        {item.intensitas_persen}%
                      </div>
                      <span class="font-data text-[9px] text-slate-400 block">
                        Ambang 10%
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedObs(item)}
                      class="px-2.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-display text-[11px] font-bold transition-all shadow-xs flex items-center gap-1"
                    >
                      <span>Tindakan</span>
                      <CaretRight size={12} weight="bold" />
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* =========================================================================
          2. METRIK RINGKASAN HARIAN
          Menampilkan metrik harian kondisi kesehatan lahan secara visual
      ========================================================================= */}
      <div class="grid grid-cols-2 gap-3">
        {/* Metrik 1: Status PHT */}
        <div
          class={`p-3.5 rounded-2xl flex flex-col justify-between text-white shadow-md transition-all ${
            bahayaList().length > 0
              ? 'bg-gradient-to-br from-orange-500 to-orange-700 shadow-orange-500/10'
              : waspadaList().length > 0
              ? 'bg-gradient-to-br from-amber-500 to-amber-700 shadow-amber-500/10'
              : 'bg-gradient-to-br from-violet-600 to-purple-800 shadow-purple-900/10'
          }`}
        >
          <div>
            <div class="flex items-center justify-between opacity-90 mb-1.5">
              <span class="font-display text-[10px] font-black tracking-wider uppercase text-purple-100">
                STATUS KESEHATAN
              </span>
              <div class="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                <Show
                  when={bahayaList().length > 0}
                  fallback={<ShieldCheck size={14} weight="fill" />}
                >
                  <ShieldWarning size={14} weight="fill" />
                </Show>
              </div>
            </div>
            <div class="font-display text-xl font-black tracking-tight leading-none">
              {bahayaList().length > 0 ? 'BAHAYA' : waspadaList().length > 0 ? 'WASPADA' : 'AMAN'}
            </div>
          </div>

          <div class="mt-3 pt-2 border-t border-white/20 flex items-center justify-between text-[10px] font-bold">
            <span class="uppercase">
              {bahayaList().length > 0
                ? `${bahayaList().length} Kritis`
                : 'Terkendali'}
            </span>
            <span class="opacity-90">{observasiList().length} Petak</span>
          </div>
        </div>

        {/* Metrik 2: Rata Intensitas Kerusakan */}
        <Card variant="elevated" class="p-3.5 flex flex-col justify-between bg-white dark:bg-slate-900">
          <div>
            <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
              <span class="font-display text-[10px] font-black tracking-wider uppercase">
                RATA KERUSAKAN
              </span>
              <div class="w-6 h-6 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center">
                <TrendUp size={14} weight="bold" />
              </div>
            </div>
            <div class="flex items-baseline gap-1">
              <span class="font-display text-2xl font-black text-slate-900 dark:text-slate-100 leading-none">
                {rataIntensitas()}
              </span>
              <span class="font-display text-xs font-bold text-orange-500">%</span>
            </div>
          </div>

          <div class="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
            <span class="font-data text-slate-400">Batas Toleransi</span>
            <span class="font-display font-bold text-orange-600">10.0%</span>
          </div>
        </Card>

        {/* Metrik 3: Total Sampel Lapangan */}
        <Card variant="elevated" class="p-3.5 flex flex-col justify-between bg-white dark:bg-slate-900">
          <div>
            <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
              <span class="font-display text-[10px] font-black tracking-wider uppercase">
                TOTAL SAMPEL
              </span>
              <div class="w-6 h-6 rounded-lg bg-violet-50 dark:bg-purple-950/40 text-violet-600 flex items-center justify-center">
                <Leaf size={14} weight="bold" />
              </div>
            </div>
            <div class="font-display text-2xl font-black text-slate-900 dark:text-slate-100 leading-none">
              {totalTanamanSampel()}
            </div>
          </div>

          <div class="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
            <span class="font-data text-slate-400">Terserang</span>
            <span class="font-display font-bold text-orange-600">
              {totalTanamanTerserang()} Tanaman
            </span>
          </div>
        </Card>

        {/* Metrik 4: OPT Terbanyak / Dominan */}
        <Card variant="elevated" class="p-3.5 flex flex-col justify-between bg-white dark:bg-slate-900">
          <div>
            <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
              <span class="font-display text-[10px] font-black tracking-wider uppercase">
                HAMA DOMINAN
              </span>
              <div class="w-6 h-6 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-500 flex items-center justify-center">
                <Bug size={14} weight="duotone" />
              </div>
            </div>
            <div class="font-display text-sm font-black text-slate-900 dark:text-slate-100 truncate leading-snug">
              {topOpt()?.name || '-'}
            </div>
          </div>

          <div class="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
            <span class="font-data text-slate-400">Dominansi</span>
            <span class="font-display font-bold text-violet-700 dark:text-purple-400">
              {topOpt()?.percentage || 0}%
            </span>
          </div>
        </Card>
      </div>

      {/* =========================================================================
          3. GRAFIK TREN INTENSITAS KERUSAKAN
          Menampilkan pergerakan naik-turunnya intensitas kerusakan dari waktu ke waktu
      ========================================================================= */}
      <Card variant="default" class="p-4 space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="p-1.5 rounded-lg bg-violet-50 dark:bg-purple-950/50 text-violet-700 dark:text-purple-300">
              <TrendUp size={18} weight="bold" />
            </div>
            <div>
              <h2 class="font-display text-xs font-black text-slate-800 dark:text-slate-100 tracking-wider">
                TREN SERANGAN 7 HARI
              </h2>
            </div>
          </div>

          {/* Indikator Arah Tren */}
          <div
            class={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-display font-black uppercase ${
              trendStatus().type === 'up'
                ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800'
                : trendStatus().type === 'down'
                ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800'
                : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
            }`}
          >
            <Show when={trendStatus().type === 'up'}>
              <TrendUp size={12} weight="bold" />
            </Show>
            <Show when={trendStatus().type === 'down'}>
              <TrendDown size={12} weight="bold" />
            </Show>
            <Show when={trendStatus().type === 'neutral'}>
              <Minus size={12} weight="bold" />
            </Show>
            <span>{trendStatus().text}</span>
          </div>
        </div>

        {/* Visualisasi Tren Garis Chart.js */}
        <IntensityTrendChart
          data={trendData()}
          thresholdWaspada={5.0}
          thresholdEkonomi={10.0}
        />
      </Card>

      {/* =========================================================================
          4. PERSENTASE JENIS ORGANISME PENGGANGGU TERBANYAK
          Menampilkan persentase jenis OPT yang paling sering terdeteksi di lahan
      ========================================================================= */}
      <Card variant="default" class="p-4 space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
              <Bug size={18} weight="duotone" />
            </div>
            <h2 class="font-display text-xs font-black text-slate-800 dark:text-slate-100 tracking-wider">
              PERSENTASE SPESIES OPT
            </h2>
          </div>

          <span class="font-display text-[10px] font-bold text-slate-400">
            {totalOptCases()} Kasus Terdeteksi
          </span>
        </div>

        {/* Horizontal Bar Chart */}
        <OptDistributionChart data={optRanking()} />

        {/* Visual Rincian Persentase Spesies */}
        <div class="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <For each={optRanking()}>
            {(item, idx) => (
              <div class="space-y-1">
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2 min-w-0">
                    <span
                      class={`w-2 h-2 rounded-full shrink-0 ${
                        idx() === 0 ? 'bg-orange-500' : 'bg-violet-600'
                      }`}
                    />
                    <span class="font-display font-bold text-slate-800 dark:text-slate-200 truncate">
                      {item.name}
                    </span>
                    <Show when={item.scientificName}>
                      <span class="font-data text-[10px] text-slate-400 italic hidden sm:inline">
                        ({item.scientificName})
                      </span>
                    </Show>
                  </div>

                  <div class="flex items-center gap-2 shrink-0">
                    <span class="font-data text-[10px] text-slate-400">
                      {item.count} Kasus
                    </span>
                    <span
                      class={`font-display text-[11px] font-black px-1.5 py-0.5 rounded ${
                        idx() === 0
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                      }`}
                    >
                      {item.percentage}%
                    </span>
                  </div>
                </div>

                {/* Visual Bar Proportion */}
                <div class="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    class={`h-full rounded-full transition-all duration-500 ${
                      idx() === 0 ? 'bg-orange-500' : 'bg-violet-600'
                    }`}
                    style={{ width: `${Math.min(item.percentage || 0, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </For>
        </div>
      </Card>

      {/* =========================================================================
          5. KONDISI PETAK & RIWAYAT PENGAMATAN LAHAN
          Rangkuman kondisi riil seluruh lahan garapan petani
      ========================================================================= */}
      <div id="riwayat-section" class="space-y-3 pt-1">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Leaf size={18} weight="duotone" class="text-violet-600 dark:text-purple-400" />
            <h2 class="font-display text-xs font-black text-slate-800 dark:text-slate-100 tracking-wider">
              KONDISI PETAK LAHAN
            </h2>
          </div>

          <Show when={auth.isSuperAdmin()}>
            <button
              type="button"
              onClick={exportCsv}
              title="Ekspor Rekapitulasi CSV"
              class="p-1.5 rounded-lg text-violet-700 dark:text-purple-300 hover:text-violet-900 bg-violet-50 dark:bg-purple-950/50 hover:bg-violet-100 dark:hover:bg-purple-900/50 transition-colors"
            >
              <FileArrowDown size={16} weight="bold" />
            </button>
          </Show>
        </div>

        {/* Filter Status Pills */}
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {(['SEMUA', 'BAHAYA', 'WASPADA', 'AMAN'] as const).map((st) => (
            <button
              type="button"
              onClick={() => setFilterStatus(st)}
              class={`font-display text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                filterStatus() === st
                  ? 'bg-slate-900 dark:bg-violet-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Daftar Kartu Riwayat Lahan */}
        <div class="space-y-2">
          <For
            each={filteredObservations()}
            fallback={
              <div class="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                <Info size={28} weight="duotone" class="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p class="font-data text-xs text-slate-400">Tidak ada data observasi</p>
              </div>
            }
          >
            {(obs) => (
              <div
                onClick={() => setSelectedObs(obs)}
                class="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-500 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-2.5"
              >
                <div class="flex items-center justify-between">
                  <div class="space-y-0.5">
                    <div class="flex items-center gap-1.5">
                      <span class="font-display font-bold text-xs text-slate-900 dark:text-slate-100">
                        {obs.petak || 'Petak Tanpa Nama'} · {obs.komoditas}
                      </span>
                      <span class="font-data text-[10px] text-slate-400">
                        ({obs.fase})
                      </span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="font-display text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {obs.opt_nama}
                      </span>
                      <span class="font-data text-[10px] text-slate-400">
                        Sampel: {obs.total_terserang}/{obs.total_sampel}
                      </span>
                    </div>
                  </div>

                  <div class="flex items-center gap-2.5">
                    <div class="text-right">
                      <div class="font-display font-black text-sm text-slate-900 dark:text-slate-100">
                        {obs.intensitas_persen}%
                      </div>
                      <span
                        class={`font-display text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
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
                    <CaretRight size={16} weight="bold" class="text-slate-300 dark:text-slate-600" />
                  </div>
                </div>

                {/* Visual Bar Tingkat Kerusakan Lahan */}
                <div class="relative w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    class={`h-full rounded-full transition-all duration-300 ${
                      obs.status_bahaya === 'BAHAYA'
                        ? 'bg-orange-600'
                        : obs.status_bahaya === 'WASPADA'
                        ? 'bg-amber-500'
                        : 'bg-purple-600'
                    }`}
                    style={{ width: `${Math.min(obs.intensitas_persen, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </For>
        </div>
      </div>

      {/* =========================================================================
          6. TOMBOL NAVIGASI CEPAT MENCOLOK DI AKHIR HALAMAN
          Menunjang kepraktisan petani di lapangan untuk langsung memulai observasi baru
      ========================================================================= */}
      <div class="pt-2 pb-4">
        <button
          type="button"
          onClick={() => navigate('/observasi')}
          class="w-full group p-4 rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 active:translate-y-0.5 text-white shadow-xl shadow-orange-600/20 transition-all flex items-center justify-between border border-orange-400/40 relative overflow-hidden"
        >
          {/* Subtle background glow circle */}
          <div class="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-110 transition-transform duration-300" />

          <div class="flex items-center gap-3.5 relative z-10">
            <div class="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-inner group-hover:rotate-6 transition-transform">
              <Camera size={26} weight="fill" class="text-white" />
            </div>
            <div class="text-left space-y-0.5">
              <span class="font-display text-sm font-black tracking-wide block uppercase text-white drop-shadow-xs">
                Mulai Observasi Lahan Baru
              </span>
              <span class="font-data text-[11px] text-orange-100 font-medium block">
                Ambil foto OPT & hitung ambang serangan petak
              </span>
            </div>
          </div>

          <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 group-hover:translate-x-1 transition-transform relative z-10">
            <ArrowRight size={18} weight="bold" class="text-white" />
          </div>
        </button>
      </div>

      {/* =========================================================================
          7. ARK UI DIALOG MODAL: DETAIL DIAGNOSTIK & REKOMENDASI PHT
      ========================================================================= */}
      <DialogModal
        open={!!selectedObs()}
        onOpenChange={(open) => {
          if (!open) setSelectedObs(null);
        }}
        title={`Detail PHT: ${selectedObs()?.petak ?? 'Petak Lapangan'}`}
        description={`${selectedObs()?.komoditas ?? ''} (${selectedObs()?.fase ?? ''})`}
      >
        <Show when={selectedObs()}>
          {(item) => (
            <div class="space-y-4">
              {/* Telemetri Hasil Kalkulasi Lapangan */}
              <div class="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/80 text-center">
                <div>
                  <span class="font-display text-[10px] font-bold text-slate-400">TOTAL SAMPEL</span>
                  <div class="font-display text-base font-black text-slate-800 dark:text-slate-100">
                    {item().total_sampel}
                  </div>
                </div>
                <div>
                  <span class="font-display text-[10px] font-bold text-slate-400">TERSERANG</span>
                  <div class="font-display text-base font-black text-orange-600 dark:text-orange-400">
                    {item().total_terserang}
                  </div>
                </div>
                <div>
                  <span class="font-display text-[10px] font-bold text-slate-400">INTENSITAS</span>
                  <div class="font-display text-base font-black text-violet-700 dark:text-purple-400">
                    {item().intensitas_persen}%
                  </div>
                </div>
              </div>

              {/* Status Evaluasi Ambang Ekonomi */}
              <div
                class={`p-3 rounded-2xl flex items-center justify-between ${
                  item().status_bahaya === 'BAHAYA'
                    ? 'bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-200'
                    : item().status_bahaya === 'WASPADA'
                    ? 'bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                    : 'bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200'
                }`}
              >
                <div class="flex items-center gap-2">
                  <Show
                    when={item().status_bahaya === 'BAHAYA'}
                    fallback={<CheckCircle size={20} weight="fill" class="text-purple-600" />}
                  >
                    <WarningCircle size={20} weight="fill" class="text-orange-600" />
                  </Show>
                  <span class="font-display text-xs font-bold">Status Evaluasi PHT:</span>
                </div>
                <span class="font-display text-xs font-black uppercase px-2 py-0.5 rounded bg-white dark:bg-slate-900 shadow-xs">
                  {item().status_bahaya}
                </span>
              </div>

              {/* Taksonomi & Identifikasi Spesies */}
              <div class="space-y-1.5 p-3 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/80 shadow-xs">
                <span class="font-display text-[10px] font-bold text-slate-400 tracking-wider">
                  IDENTIFIKASI OPT TERDETEKSI
                </span>
                <div class="font-display text-sm font-black text-slate-800 dark:text-slate-100">
                  {item().opt_nama}
                </div>
                <div class="font-data text-xs text-slate-500 dark:text-slate-400 italic">
                  {item().nama_ilmiah ?? 'Spesies Lapangan'} · Akurasi AI {((item().ai_confidence ?? 0.94) * 100).toFixed(0)}%
                </div>
              </div>

              {/* Panduan Rekomendasi Tindakan PHT */}
              <div class="space-y-2 p-3.5 rounded-2xl bg-violet-50 dark:bg-purple-950/50 border border-violet-100 dark:border-purple-900/60">
                <span class="font-display text-[10px] font-black text-violet-900 dark:text-purple-200 tracking-wider">
                  PANDUAN TINDAKAN PHT
                </span>
                <p class="font-data text-xs text-violet-950 dark:text-purple-100 leading-relaxed font-medium">
                  {item().rekomendasi_pht}
                </p>
              </div>

              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={() => setSelectedObs(null)}
              >
                <span>Tutup</span>
              </Button>
            </div>
          )}
        </Show>
      </DialogModal>
    </div>
  );
}
