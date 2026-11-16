import { createSignal, onMount, Show, For } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { useAuth } from '../services/auth';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { DialogModal } from '../components/ui/Dialog';
import { IntensityTrendChart, TrendPoint } from '../components/charts/IntensityTrendChart';
import { OptDistributionChart, OptStat } from '../components/charts/OptDistributionChart';
import { IntensityCard } from '../components/dashboard/IntensityCard';
import {
  ChartLineUp,
  ShieldCheck,
  Leaf,
  WarningCircle,
  Camera,
  SlidersHorizontal,
  Bug,
  TrendUp,
  CaretRight,
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
        setTrendData(stats.trend);
        setOptRanking(stats.optRanking);
      }
    } catch {
      // Fallback data
      setTrendData([
        { label: 'Sen', intensity: 2.5 },
        { label: 'Sel', intensity: 3.8 },
        { label: 'Rab', intensity: 4.2 },
        { label: 'Kam', intensity: 5.5 },
        { label: 'Jum', intensity: 7.9 },
        { label: 'Sab', intensity: 11.4 },
        { label: 'Min', intensity: 6.8 },
      ]);
      setOptRanking([
        { name: 'Wereng Batang Coklat', count: 18, scientificName: 'Nilaparvata lugens' },
        { name: 'Penggerek Batang Padi', count: 9, scientificName: 'Scirpophaga incertulas' },
        { name: 'Blas Daun', count: 5, scientificName: 'Pyricularia oryzae' },
      ]);
    } finally {
      setLoading(false);
    }
  });

  const bahayaList = () =>
    observasiList().filter((item) => item.status_bahaya === 'BAHAYA');

  const filteredObservations = () => {
    const s = filterStatus();
    if (s === 'SEMUA') return observasiList();
    return observasiList().filter((item) => item.status_bahaya === s);
  };

  const rataIntensitas = () => {
    const list = observasiList();
    if (!list.length) return '0.0';
    const sum = list.reduce((acc, cur) => acc + cur.intensitas_persen, 0);
    return (sum / list.length).toFixed(1);
  };

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
      {/* 1. Peringatan Status Bahaya Terlampaui (Ambang Ekonomi) */}
      <Show when={bahayaList().length > 0}>
        <div class="p-3.5 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border-2 border-orange-500 shadow-brand-orange flex items-start gap-3">
          <WarningCircle size={24} weight="fill" class="text-orange-600 shrink-0 mt-0.5" />
          <div class="space-y-1.5 flex-1">
            <span class="font-display text-xs font-black text-orange-950 dark:text-orange-200 tracking-wider">
              PERINGATAN BAHAYA
            </span>
            <div class="pt-0.5 flex flex-wrap gap-1.5">
              <For each={bahayaList()}>
                {(item) => (
                  <button
                    type="button"
                    onClick={() => setSelectedObs(item)}
                    class="font-display text-[11px] font-bold px-2 py-1 bg-white dark:bg-slate-900 text-orange-700 dark:text-orange-400 rounded-lg border border-orange-300 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <span>{item.petak} ({item.intensitas_persen}%)</span>
                    <CaretRight size={12} weight="bold" />
                  </button>
                )}
              </For>
            </div>
          </div>
        </div>
      </Show>

      {/* 2. Top Metrik Cards */}
      <div class="grid grid-cols-2 gap-3">
        {/* Status PHT Card */}
        <Card
          variant="elevated"
          class="p-3.5 flex flex-col justify-between bg-gradient-to-br from-violet-600 to-purple-800 text-white shadow-lg shadow-purple-900/10"
        >
          <div>
            <div class="flex items-center justify-between opacity-90 mb-2">
              <span class="font-display text-[10px] font-black tracking-wider uppercase text-purple-200">
                STATUS PHT
              </span>
              <div class="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
                <ShieldCheck size={14} weight="fill" />
              </div>
            </div>
            <div class="font-display text-2xl font-black tracking-tight leading-none">
              {bahayaList().length > 0 ? 'WASPADA' : 'AMAN'}
            </div>
          </div>

          <div class="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between">
            <span class="font-display text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-white/20 text-white">
              {bahayaList().length > 0 ? `${bahayaList().length} BAHAYA` : 'TERKENDALI'}
            </span>
            <span class="font-display text-[10px] font-bold text-purple-200">
              {observasiList().length} Petak
            </span>
          </div>
        </Card>

        {/* UI Kustom: IntensityCard */}
        <IntensityCard
          intensity={parseFloat(rataIntensitas()) || 0}
          petakCount={observasiList().length}
          thresholdWaspada={5.0}
          thresholdBahaya={10.0}
        />
      </div>

      {/* 3. Pusat Kendali - Quick Action Buttons */}
      <div class="grid grid-cols-2 gap-2 pt-0.5">
        <Button
          variant="primary"
          size="md"
          onClick={() => navigate('/observasi')}
          class="shadow-brand-orange"
        >
          <Camera size={18} weight="bold" />
          <span>Observasi</span>
        </Button>

        <Show
          when={auth.isSuperAdmin()}
          fallback={
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                const el = document.getElementById('riwayat-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <Leaf size={18} weight="bold" />
              <span>Petak</span>
            </Button>
          }
        >
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate('/ambang-ekonomi')}
          >
            <SlidersHorizontal size={18} weight="bold" />
            <span>Ambang</span>
          </Button>
        </Show>
      </div>

      {/* 4. SOTA Grafik Visualisasi: Tren Intensitas vs Ambang Ekonomi */}
      <Card variant="default" class="p-4 space-y-3">
        <div class="flex items-center gap-2">
          <div class="p-1.5 rounded-lg bg-violet-50 dark:bg-purple-950/50 text-violet-700 dark:text-purple-300">
            <TrendUp size={18} weight="bold" />
          </div>
          <h2 class="font-display text-xs font-black text-slate-800 dark:text-slate-100 tracking-wider">
            TREN INTENSITAS
          </h2>
        </div>

        {/* State-of-the-art interactive canvas chart */}
        <IntensityTrendChart
          data={trendData()}
          thresholdWaspada={5.0}
          thresholdEkonomi={10.0}
        />
      </Card>

      {/* 5. SOTA Grafik Visualisasi: Organisme Pengganggu Terbanyak */}
      <Card variant="default" class="p-4 space-y-3">
        <div class="flex items-center gap-2">
          <div class="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
            <Bug size={18} weight="duotone" />
          </div>
          <h2 class="font-display text-xs font-black text-slate-800 dark:text-slate-100 tracking-wider">
            OPT TERBANYAK
          </h2>
        </div>

        {/* Horizontal bar chart */}
        <OptDistributionChart data={optRanking()} />
      </Card>

      {/* 6. Rekapitulasi Riwayat Pengamatan Lapangan */}
      <div id="riwayat-section" class="space-y-3 pt-1">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Leaf size={18} weight="duotone" class="text-violet-600 dark:text-purple-400" />
            <h2 class="font-display text-xs font-black text-slate-800 dark:text-slate-100 tracking-wider">
              RIWAYAT PENGAMATAN
            </h2>
          </div>

          <Show when={auth.isSuperAdmin()}>
            <button
              type="button"
              onClick={exportCsv}
              title="Ekspor"
              class="p-1.5 rounded-lg text-violet-700 dark:text-purple-300 hover:text-violet-900 bg-violet-50 dark:bg-purple-950/50 hover:bg-violet-100 dark:hover:bg-purple-900/50 transition-colors"
            >
              <FileArrowDown size={16} weight="bold" />
            </button>
          </Show>
        </div>

        {/* Filter Pills */}
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

        {/* Observation Cards List */}
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
                class="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-500 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
              >
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="font-display font-bold text-xs text-slate-900 dark:text-slate-100">
                      {obs.petak} &middot; {obs.komoditas}
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
            )}
          </For>
        </div>
      </div>

      {/* 7. Ark UI Dialog Modal: Detail Diagnostik Observasi & Rekomendasi PHT */}
      <DialogModal
        open={!!selectedObs()}
        onOpenChange={(open) => {
          if (!open) setSelectedObs(null);
        }}
        title={`Detail PHT: ${selectedObs()?.petak ?? ''}`}
        description={`${selectedObs()?.komoditas ?? ''} (${selectedObs()?.fase ?? ''})`}
      >
        <Show when={selectedObs()}>
          {(item) => (
            <div class="space-y-4">
              {/* Telemetri Hasil Kalkulasi */}
              <div class="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/80 text-center">
                <div>
                  <span class="font-display text-[10px] font-bold text-slate-400">TOTAL SAMPEL</span>
                  <div class="font-display text-base font-black text-slate-800 dark:text-slate-100">{item().total_sampel}</div>
                </div>
                <div>
                  <span class="font-display text-[10px] font-bold text-slate-400">TERSERANG</span>
                  <div class="font-display text-base font-black text-orange-600 dark:text-orange-400">{item().total_terserang}</div>
                </div>
                <div>
                  <span class="font-display text-[10px] font-bold text-slate-400">INTENSITAS</span>
                  <div class="font-display text-base font-black text-violet-700 dark:text-purple-400">{item().intensitas_persen}%</div>
                </div>
              </div>

              {/* Status Ambang */}
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

              {/* Taksonomi & Identifikasi AI */}
              <div class="space-y-1.5 p-3 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/80 shadow-xs">
                <span class="font-display text-[10px] font-bold text-slate-400 tracking-wider">
                  IDENTIFIKASI AI VISION
                </span>
                <div class="font-display text-sm font-black text-slate-800 dark:text-slate-100">{item().opt_nama}</div>
                <div class="font-data text-xs text-slate-500 dark:text-slate-400 italic">
                  {item().nama_ilmiah ?? 'Spesies Lapangan'} &middot; Akurasi AI {((item().ai_confidence ?? 0.94) * 100).toFixed(0)}%
                </div>
              </div>

              {/* Panduan Rekomendasi PHT Berjenjang */}
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
