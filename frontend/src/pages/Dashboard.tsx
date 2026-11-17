import { createSignal, onMount, Show, For, createMemo } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { useAuth } from '../services/auth';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { DialogModal } from '../components/ui/Dialog';
import { IntensityTrendChart, TrendPoint } from '../components/charts/IntensityTrendChart';
import { OptDistributionChart, OptStat } from '../components/charts/OptDistributionChart';
import { GeospatialOutbreakMap } from '../components/dashboard/GeospatialOutbreakMap';
import { PrintReportModal } from '../components/dashboard/PrintReportModal';
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
  Users,
  Globe,
  SlidersHorizontal,
  Printer,
  Sparkle,
  WarningOctagon,
  Compass,
  MapPin,
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

export interface AdminMacroStats {
  totalUsers: number;
  totalPetak: number;
  totalObservasi: number;
  avgAiConfidence: number;
  totalAiDetections: number;
  unconfiguredOptCount: number;
  unconfiguredOptList: string[];
}

export default function Dashboard() {
  const auth = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = createSignal(true);
  const [observasiList, setObservasiList] = createSignal<ObservasiItem[]>([]);
  const [trendData, setTrendData] = createSignal<TrendPoint[]>([]);
  const [optRanking, setOptRanking] = createSignal<OptStat[]>([]);
  const [adminMacro, setAdminMacro] = createSignal<AdminMacroStats | null>(null);
  const [filterStatus, setFilterStatus] = createSignal<'SEMUA' | 'BAHAYA' | 'WASPADA' | 'AMAN'>('SEMUA');
  const [selectedObs, setSelectedObs] = createSignal<ObservasiItem | null>(null);
  const [printModalOpen, setPrintModalOpen] = createSignal(false);

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

        const ranking: OptStat[] = stats.optRanking || [];
        const total = ranking.reduce((acc, cur) => acc + cur.count, 0);
        const mapped = ranking.map((r) => ({
          ...r,
          percentage: total > 0 ? Math.round((r.count / total) * 1000) / 10 : 0,
        }));
        setOptRanking(mapped);

        if (stats.adminMacro) {
          setAdminMacro(stats.adminMacro);
        }
      }
    } catch {
      setTrendData([]);
      setOptRanking([]);
    } finally {
      setLoading(false);
    }
  });

  const bahayaList = createMemo(() =>
    observasiList().filter((item) => item.status_bahaya === 'BAHAYA')
  );

  const waspadaList = createMemo(() =>
    observasiList().filter((item) => item.status_bahaya === 'WASPADA')
  );

  const filteredObservations = createMemo(() => {
    const s = filterStatus();
    if (s === 'SEMUA') return observasiList();
    return observasiList().filter((item) => item.status_bahaya === s);
  });

  const rataIntensitas = createMemo(() => {
    const list = observasiList();
    if (!list.length) return '0.0';
    const sum = list.reduce((acc, cur) => acc + cur.intensitas_persen, 0);
    return (sum / list.length).toFixed(1);
  });

  const totalTanamanSampel = createMemo(() => {
    return observasiList().reduce((acc, cur) => acc + cur.total_sampel, 0);
  });

  const totalTanamanTerserang = createMemo(() => {
    return observasiList().reduce((acc, cur) => acc + cur.total_terserang, 0);
  });

  const totalOptCases = createMemo(() => {
    return optRanking().reduce((acc, cur) => acc + cur.count, 0);
  });

  const topOpt = createMemo(() => {
    const list = optRanking();
    if (!list.length) return null;
    return list[0];
  });

  const trendStatus = createMemo(() => {
    const points = trendData();
    if (points.length < 2) return { text: 'Stabil', type: 'neutral' };
    const latest = points[points.length - 1].intensity;
    const prev = points[points.length - 2].intensity;
    if (latest > prev) return { text: 'Naik', type: 'up' };
    if (latest < prev) return { text: 'Turun', type: 'down' };
    return { text: 'Stabil', type: 'neutral' };
  });

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
    a.download = `rekap-pht-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div class="p-4 space-y-4">
      <Show
        when={auth.isSuperAdmin()}
        fallback={
          /* =========================================================================
             DASBOR PETANI (MINIMAL COPYWRITING & TEKS RINGKAS)
             ========================================================================= */
          <div class="space-y-4">
            {/* Status Lahan / Peringatan Dini */}
            <Show
              when={bahayaList().length > 0}
              fallback={
                <div class="p-3 rounded-2xl bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/40 dark:to-slate-900 border border-violet-200 dark:border-purple-900/60 shadow-xs flex items-center justify-between">
                  <div class="flex items-center gap-2.5">
                    <ShieldCheck size={20} weight="fill" class="text-violet-600 dark:text-purple-400 shrink-0" />
                    <span class="font-display text-xs font-bold text-slate-800 dark:text-slate-100 uppercase">
                      Lahan Terkendali
                    </span>
                  </div>
                  <span class="font-display text-[10px] font-bold px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-violet-700 dark:text-purple-300 border border-violet-200 dark:border-purple-800">
                    &lt;10%
                  </span>
                </div>
              }
            >
              <div class="p-3.5 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border-2 border-orange-500 shadow-md space-y-2.5">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <WarningCircle size={20} weight="fill" class="text-orange-600 shrink-0" />
                    <span class="font-display text-xs font-bold text-orange-950 dark:text-orange-200 uppercase">
                      Bahaya: {bahayaList().length} Petak
                    </span>
                  </div>
                  <span class="font-display text-[9px] font-bold px-2 py-0.5 rounded bg-orange-600 text-white uppercase">
                    &gt;10%
                  </span>
                </div>

                <div class="space-y-1.5">
                  <For each={bahayaList()}>
                    {(item) => (
                      <div class="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-orange-300 dark:border-orange-800 flex items-center justify-between gap-2 shadow-xs">
                        <div class="min-w-0">
                          <div class="font-display text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {item.petak || 'Petak'} · {item.komoditas}
                          </div>
                          <div class="font-display text-[11px] text-orange-600 dark:text-orange-400 font-medium truncate">
                            {item.opt_nama}
                          </div>
                        </div>

                        <div class="flex items-center gap-2 shrink-0">
                          <span class="font-display text-sm font-black text-orange-600">
                            {item.intensitas_persen}%
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedObs(item)}
                            class="px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-display text-[11px] font-bold transition-all shadow-xs"
                          >
                            Tindakan
                          </button>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            {/* 4 Metrik Lapangan */}
            <div class="grid grid-cols-2 gap-2.5">
              <div
                class={`p-3 rounded-2xl flex flex-col justify-between text-white shadow-sm ${
                  bahayaList().length > 0
                    ? 'bg-gradient-to-br from-orange-500 to-orange-700'
                    : waspadaList().length > 0
                    ? 'bg-gradient-to-br from-amber-500 to-amber-700'
                    : 'bg-gradient-to-br from-violet-600 to-purple-800'
                }`}
              >
                <div class="flex items-center justify-between opacity-90 mb-1">
                  <span class="font-display text-[10px] font-bold uppercase tracking-wider">
                    STATUS
                  </span>
                  <Show
                    when={bahayaList().length > 0}
                    fallback={<ShieldCheck size={14} weight="fill" />}
                  >
                    <ShieldWarning size={14} weight="fill" />
                  </Show>
                </div>
                <div class="font-display text-xl font-black leading-none">
                  {bahayaList().length > 0 ? 'BAHAYA' : waspadaList().length > 0 ? 'WASPADA' : 'AMAN'}
                </div>
                <div class="mt-2.5 pt-1.5 border-t border-white/20 flex items-center justify-between text-[10px] font-bold">
                  <span>{bahayaList().length > 0 ? `${bahayaList().length} Bahaya` : 'Terkendali'}</span>
                  <span>{observasiList().length} Petak</span>
                </div>
              </div>

              <Card variant="elevated" class="p-3 flex flex-col justify-between bg-white dark:bg-slate-900">
                <div class="flex items-center justify-between text-slate-500 mb-1">
                  <span class="font-display text-[10px] font-bold uppercase tracking-wider">
                    INTENSITAS
                  </span>
                  <TrendUp size={14} weight="bold" class="text-orange-500" />
                </div>
                <div class="flex items-baseline gap-0.5">
                  <span class="font-display text-2xl font-black text-slate-900 dark:text-slate-100 leading-none">
                    {rataIntensitas()}
                  </span>
                  <span class="font-display text-xs font-bold text-orange-500">%</span>
                </div>
                <div class="mt-2.5 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Batas</span>
                  <span class="font-bold text-orange-600">10%</span>
                </div>
              </Card>

              <Card variant="elevated" class="p-3 flex flex-col justify-between bg-white dark:bg-slate-900">
                <div class="flex items-center justify-between text-slate-500 mb-1">
                  <span class="font-display text-[10px] font-bold uppercase tracking-wider">
                    SAMPEL
                  </span>
                  <Leaf size={14} weight="bold" class="text-violet-600" />
                </div>
                <div class="font-display text-2xl font-black text-slate-900 dark:text-slate-100 leading-none">
                  {totalTanamanSampel()}
                </div>
                <div class="mt-2.5 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Terserang</span>
                  <span class="font-bold text-orange-600">{totalTanamanTerserang()}</span>
                </div>
              </Card>

              <Card variant="elevated" class="p-3 flex flex-col justify-between bg-white dark:bg-slate-900">
                <div class="flex items-center justify-between text-slate-500 mb-1">
                  <span class="font-display text-[10px] font-bold uppercase tracking-wider">
                    DOMINAN
                  </span>
                  <Bug size={14} weight="duotone" class="text-orange-500" />
                </div>
                <div class="font-display text-xs font-black text-slate-900 dark:text-slate-100 truncate leading-snug">
                  {topOpt()?.name || '-'}
                </div>
                <div class="mt-2.5 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Proporsi</span>
                  <span class="font-bold text-violet-700 dark:text-purple-400">
                    {topOpt()?.percentage || 0}%
                  </span>
                </div>
              </Card>
            </div>

            {/* Tren 7 Hari */}
            <Card variant="default" class="p-3.5 space-y-2.5">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                  <TrendUp size={16} weight="bold" class="text-violet-600" />
                  <span class="font-display text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Tren 7 Hari
                  </span>
                </div>

                <span class="font-display text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 uppercase">
                  {trendStatus().text}
                </span>
              </div>

              <IntensityTrendChart
                data={trendData()}
                thresholdWaspada={5.0}
                thresholdEkonomi={10.0}
              />
            </Card>

            {/* Spesies OPT */}
            <Card variant="default" class="p-3.5 space-y-2.5">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                  <Bug size={16} weight="duotone" class="text-orange-500" />
                  <span class="font-display text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Spesies OPT
                  </span>
                </div>
                <span class="font-display text-[10px] font-bold text-slate-400">
                  {totalOptCases()} Kasus
                </span>
              </div>

              <OptDistributionChart data={optRanking()} />

              <div class="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                <For each={optRanking()}>
                  {(item, idx) => (
                    <div class="space-y-0.5">
                      <div class="flex items-center justify-between text-xs">
                        <span class="font-display font-bold text-slate-800 dark:text-slate-200 truncate">
                          {item.name}
                        </span>
                        <div class="flex items-center gap-1.5">
                          <span class="font-data text-[10px] text-slate-400">{item.count}</span>
                          <span class="font-display text-[10px] font-bold text-slate-700 dark:text-slate-300">
                            {item.percentage}%
                          </span>
                        </div>
                      </div>
                      <div class="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          class={`h-full rounded-full ${idx() === 0 ? 'bg-orange-500' : 'bg-violet-600'}`}
                          style={{ width: `${Math.min(item.percentage || 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Card>

            {/* Riwayat Lahan */}
            <div id="riwayat-section" class="space-y-2.5 pt-1">
              <div class="flex items-center gap-1.5">
                <Leaf size={16} weight="duotone" class="text-violet-600" />
                <span class="font-display text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  Riwayat Lahan
                </span>
              </div>

              {/* Filter Status */}
              <div class="flex items-center gap-1 overflow-x-auto pb-0.5 text-xs">
                {(['SEMUA', 'BAHAYA', 'WASPADA', 'AMAN'] as const).map((st) => (
                  <button
                    type="button"
                    onClick={() => setFilterStatus(st)}
                    class={`font-display text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                      filterStatus() === st
                        ? 'bg-slate-900 dark:bg-violet-600 text-white'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* List Cards */}
              <div class="space-y-1.5">
                <For
                  each={filteredObservations()}
                  fallback={
                    <div class="p-6 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                      Nihil
                    </div>
                  }
                >
                  {(obs) => (
                    <div
                      onClick={() => setSelectedObs(obs)}
                      class="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-violet-300 transition-all cursor-pointer space-y-1.5"
                    >
                      <div class="flex items-center justify-between">
                        <div>
                          <div class="font-display font-bold text-xs text-slate-900 dark:text-slate-100">
                            {obs.petak || 'Petak'} · {obs.komoditas} ({obs.fase})
                          </div>
                          <div class="font-data text-[11px] text-slate-500">
                            {obs.opt_nama} · {obs.total_terserang}/{obs.total_sampel}
                          </div>
                        </div>

                        <div class="flex items-center gap-2">
                          <div class="text-right">
                            <div class="font-display font-bold text-xs text-slate-900 dark:text-slate-100">
                              {obs.intensitas_persen}%
                            </div>
                            <span
                              class={`font-display text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                obs.status_bahaya === 'BAHAYA'
                                  ? 'bg-orange-100 text-orange-700'
                                  : obs.status_bahaya === 'WASPADA'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-purple-100 text-purple-700'
                              }`}
                            >
                              {obs.status_bahaya}
                            </span>
                          </div>
                          <CaretRight size={14} weight="bold" class="text-slate-300" />
                        </div>
                      </div>

                      <div class="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          class={`h-full rounded-full ${
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

            {/* Tombol Observasi Baru (Naked Brief, Functional) */}
            <div class="pt-1 pb-3">
              <button
                type="button"
                onClick={() => navigate('/observasi')}
                class="w-full p-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:translate-y-0.5 text-white shadow-lg shadow-orange-600/20 transition-all flex items-center justify-between border border-orange-400/40"
              >
                <div class="flex items-center gap-2.5">
                  <Camera size={22} weight="fill" />
                  <span class="font-display text-sm font-bold uppercase tracking-wider">
                    Observasi Baru
                  </span>
                </div>
                <ArrowRight size={18} weight="bold" />
              </button>
            </div>
          </div>
        }
      >
        {/* =========================================================================
           DASBOR SUPERADMIN (MINIMAL COPYWRITING & TEKS RINGKAS)
           ========================================================================= */}
        <div class="space-y-4">
          {/* Header Pengawasan Makro (Zero-Description Header) */}
          <div class="p-3.5 rounded-2xl bg-slate-900 text-white shadow-md border border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <Globe size={22} weight="duotone" class="text-violet-400" />
              <span class="font-display text-xs font-bold tracking-wider uppercase">
                Pengawasan Regional
              </span>
            </div>

            <button
              type="button"
              onClick={() => setPrintModalOpen(true)}
              class="px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 active:scale-95 text-white font-display text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Printer size={15} weight="bold" />
              <span>Cetak</span>
            </button>
          </div>

          {/* Peta Sebaran Geospasial */}
          <Card variant="default" class="p-3.5 space-y-2.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <Compass size={16} weight="bold" class="text-orange-500" />
                <span class="font-display text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  Peta Sebaran
                </span>
              </div>

              <span class="font-display text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300">
                {bahayaList().length} Bahaya
              </span>
            </div>

            <GeospatialOutbreakMap
              observations={observasiList()}
              onSelect={(obs) => setSelectedObs(obs)}
            />
          </Card>

          {/* 4 Metrik Global */}
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Card variant="elevated" class="p-3 flex flex-col justify-between bg-white dark:bg-slate-900">
              <div class="flex items-center justify-between text-slate-500 mb-1">
                <span class="font-display text-[10px] font-bold uppercase tracking-wider">PENGGUNA</span>
                <Users size={14} weight="bold" class="text-violet-600" />
              </div>
              <div class="font-display text-xl font-black text-slate-900 dark:text-slate-100 leading-none">
                {adminMacro()?.totalUsers ?? 4}
              </div>
              <div class="mt-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                Akun
              </div>
            </Card>

            <Card variant="elevated" class="p-3 flex flex-col justify-between bg-white dark:bg-slate-900">
              <div class="flex items-center justify-between text-slate-500 mb-1">
                <span class="font-display text-[10px] font-bold uppercase tracking-wider">PETAK</span>
                <MapPin size={14} weight="bold" class="text-purple-600" />
              </div>
              <div class="font-display text-xl font-black text-slate-900 dark:text-slate-100 leading-none">
                {adminMacro()?.totalPetak ?? 3}
              </div>
              <div class="mt-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                {observasiList().length} Data
              </div>
            </Card>

            <Card variant="elevated" class="p-3 flex flex-col justify-between bg-white dark:bg-slate-900">
              <div class="flex items-center justify-between text-slate-500 mb-1">
                <span class="font-display text-[10px] font-bold uppercase tracking-wider">RATA-RATA</span>
                <TrendUp size={14} weight="bold" class="text-orange-600" />
              </div>
              <div class="flex items-baseline gap-0.5">
                <span class="font-display text-xl font-black text-slate-900 dark:text-slate-100 leading-none">
                  {rataIntensitas()}
                </span>
                <span class="font-display text-xs font-bold text-orange-500">%</span>
              </div>
              <div class="mt-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-orange-600 font-bold">
                {bahayaList().length} Bahaya
              </div>
            </Card>

            <Card variant="elevated" class="p-3 flex flex-col justify-between bg-white dark:bg-slate-900">
              <div class="flex items-center justify-between text-slate-500 mb-1">
                <span class="font-display text-[10px] font-bold uppercase tracking-wider">DOMINAN</span>
                <Bug size={14} weight="duotone" class="text-orange-500" />
              </div>
              <div class="font-display text-xs font-black text-slate-900 dark:text-slate-100 truncate leading-snug">
                {topOpt()?.name || '-'}
              </div>
              <div class="mt-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-violet-700 dark:text-purple-400 font-bold">
                {topOpt()?.percentage || 0}%
              </div>
            </Card>
          </div>

          {/* Panel AI & Master Data */}
          <div class="grid grid-cols-2 gap-2.5">
            <Card variant="default" class="p-3 space-y-1.5 bg-white dark:bg-slate-900">
              <div class="flex items-center justify-between">
                <span class="font-display text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  AKURASI AI
                </span>
                <Sparkle size={14} weight="fill" class="text-violet-600" />
              </div>
              <div class="font-display text-xl font-black text-violet-700 dark:text-purple-400 leading-none">
                {adminMacro()?.avgAiConfidence ?? 94.0}%
              </div>
              <div class="pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                {adminMacro()?.totalAiDetections ?? 2} Deteksi
              </div>
            </Card>

            <Show
              when={(adminMacro()?.unconfiguredOptCount ?? 0) > 0}
              fallback={
                <Card variant="default" class="p-3 space-y-1.5 bg-white dark:bg-slate-900">
                  <div class="flex items-center justify-between">
                    <span class="font-display text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      MASTER DATA
                    </span>
                    <ShieldCheck size={14} weight="fill" class="text-violet-600" />
                  </div>
                  <div class="font-display text-sm font-bold text-violet-700 dark:text-purple-400 leading-none">
                    Lengkap
                  </div>
                  <div class="pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                    100% Terverifikasi
                  </div>
                </Card>
              }
            >
              <div class="p-3 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-500 space-y-1.5">
                <div class="flex items-center justify-between">
                  <span class="font-display text-[10px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-300">
                    MASTER DATA
                  </span>
                  <WarningOctagon size={14} weight="fill" class="text-orange-600" />
                </div>
                <div class="font-display text-xs font-bold text-orange-900 dark:text-orange-200">
                  {(adminMacro()?.unconfiguredOptList || []).length} OPT Baru
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/ambang-ekonomi')}
                  class="w-full py-1 rounded bg-orange-600 text-white font-display text-[10px] font-bold"
                >
                  Atur Ambang
                </button>
              </div>
            </Show>
          </div>

          {/* Tren Regional */}
          <Card variant="default" class="p-3.5 space-y-2.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <TrendUp size={16} weight="bold" class="text-violet-600" />
                <span class="font-display text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  Tren Regional
                </span>
              </div>
              <span class="font-display text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 uppercase">
                {trendStatus().text}
              </span>
            </div>

            <IntensityTrendChart
              data={trendData()}
              thresholdWaspada={5.0}
              thresholdEkonomi={10.0}
            />
          </Card>

          {/* Sebaran OPT */}
          <Card variant="default" class="p-3.5 space-y-2.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <Bug size={16} weight="duotone" class="text-orange-500" />
                <span class="font-display text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  Sebaran OPT
                </span>
              </div>
              <span class="font-display text-[10px] font-bold text-slate-400">
                {totalOptCases()} Kasus
              </span>
            </div>

            <OptDistributionChart data={optRanking()} />

            <div class="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
              <For each={optRanking()}>
                {(item, idx) => (
                  <div class="space-y-0.5">
                    <div class="flex items-center justify-between text-xs">
                      <span class="font-display font-bold text-slate-800 dark:text-slate-200 truncate">
                        {item.name}
                      </span>
                      <div class="flex items-center gap-1.5">
                        <span class="font-data text-[10px] text-slate-400">{item.count}</span>
                        <span class="font-display text-[10px] font-bold text-slate-700 dark:text-slate-300">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                    <div class="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        class={`h-full rounded-full ${idx() === 0 ? 'bg-orange-500' : 'bg-violet-600'}`}
                        style={{ width: `${Math.min(item.percentage || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Card>

          {/* Pintasan Manajemen (Zero AI-Slop) */}
          <div class="space-y-2 pt-1">
            <span class="font-display text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Manajemen
            </span>

            <div class="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => navigate('/users')}
                class="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-violet-400 text-center shadow-xs transition-all flex flex-col items-center justify-center gap-1 active:scale-95"
              >
                <Users size={18} weight="bold" class="text-violet-600" />
                <span class="font-display text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  Pengguna
                </span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/ambang-ekonomi')}
                class="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-orange-400 text-center shadow-xs transition-all flex flex-col items-center justify-center gap-1 active:scale-95"
              >
                <SlidersHorizontal size={18} weight="bold" class="text-orange-500" />
                <span class="font-display text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  Ambang
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPrintModalOpen(true)}
                class="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-400 text-center shadow-xs transition-all flex flex-col items-center justify-center gap-1 active:scale-95"
              >
                <Printer size={18} weight="bold" class="text-purple-600" />
                <span class="font-display text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  Laporan
                </span>
              </button>
            </div>
          </div>

          {/* Data Wilayah */}
          <div id="riwayat-section" class="space-y-2 pt-1">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <Leaf size={16} weight="duotone" class="text-violet-600" />
                <span class="font-display text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  Data Wilayah
                </span>
              </div>

              <button
                type="button"
                onClick={exportCsv}
                title="CSV"
                class="p-1 rounded bg-violet-50 dark:bg-purple-950/50 text-violet-700 dark:text-purple-300"
              >
                <FileArrowDown size={15} weight="bold" />
              </button>
            </div>

            {/* Filter Status */}
            <div class="flex items-center gap-1 overflow-x-auto pb-0.5 text-xs">
              {(['SEMUA', 'BAHAYA', 'WASPADA', 'AMAN'] as const).map((st) => (
                <button
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  class={`font-display text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                    filterStatus() === st
                      ? 'bg-slate-900 dark:bg-violet-600 text-white'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* List */}
            <div class="space-y-1.5">
              <For
                each={filteredObservations()}
                fallback={
                  <div class="p-6 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                    Nihil
                  </div>
                }
              >
                {(obs) => (
                  <div
                    onClick={() => setSelectedObs(obs)}
                    class="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-violet-300 transition-all cursor-pointer space-y-1.5"
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <div class="font-display font-bold text-xs text-slate-900 dark:text-slate-100">
                          {obs.petak || 'Petak'} · {obs.komoditas} ({obs.fase})
                        </div>
                        <div class="font-data text-[11px] text-slate-500">
                          {obs.opt_nama} · {obs.total_terserang}/{obs.total_sampel}
                        </div>
                      </div>

                      <div class="flex items-center gap-2">
                        <div class="text-right">
                          <div class="font-display font-bold text-xs text-slate-900 dark:text-slate-100">
                            {obs.intensitas_persen}%
                          </div>
                          <span
                            class={`font-display text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              obs.status_bahaya === 'BAHAYA'
                                ? 'bg-orange-100 text-orange-700'
                                : obs.status_bahaya === 'WASPADA'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {obs.status_bahaya}
                          </span>
                        </div>
                        <CaretRight size={14} weight="bold" class="text-slate-300" />
                      </div>
                    </div>

                    <div class="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        class={`h-full rounded-full ${
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
        </div>
      </Show>

      {/* Dialog Detail Diagnostik PHT */}
      <DialogModal
        open={!!selectedObs()}
        onOpenChange={(open) => {
          if (!open) setSelectedObs(null);
        }}
        title={`${selectedObs()?.petak ?? 'Petak'} · ${selectedObs()?.komoditas ?? ''}`}
        description={`${selectedObs()?.fase ?? ''}`}
      >
        <Show when={selectedObs()}>
          {(item) => (
            <div class="space-y-3">
              <div class="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-center">
                <div>
                  <span class="font-display text-[10px] text-slate-400 block uppercase">SAMPEL</span>
                  <span class="font-display text-sm font-bold text-slate-800 dark:text-slate-100">
                    {item().total_sampel}
                  </span>
                </div>
                <div>
                  <span class="font-display text-[10px] text-slate-400 block uppercase">TERSERANG</span>
                  <span class="font-display text-sm font-bold text-orange-600">
                    {item().total_terserang}
                  </span>
                </div>
                <div>
                  <span class="font-display text-[10px] text-slate-400 block uppercase">INTENSITAS</span>
                  <span class="font-display text-sm font-bold text-violet-700 dark:text-purple-400">
                    {item().intensitas_persen}%
                  </span>
                </div>
              </div>

              <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                <span class="font-display text-xs text-slate-500">Status:</span>
                <span
                  class={`font-display text-xs font-bold px-2 py-0.5 rounded uppercase ${
                    item().status_bahaya === 'BAHAYA'
                      ? 'bg-orange-600 text-white'
                      : item().status_bahaya === 'WASPADA'
                      ? 'bg-amber-600 text-white'
                      : 'bg-violet-600 text-white'
                  }`}
                >
                  {item().status_bahaya}
                </span>
              </div>

              <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-0.5">
                <span class="font-display text-[10px] text-slate-400 uppercase tracking-wider block">
                  OPT
                </span>
                <div class="font-display text-xs font-bold text-slate-800 dark:text-slate-100">
                  {item().opt_nama}
                </div>
                <Show when={item().nama_ilmiah}>
                  <div class="font-data text-[11px] text-slate-500 italic">
                    {item().nama_ilmiah}
                  </div>
                </Show>
              </div>

              <div class="p-3 rounded-xl bg-violet-50 dark:bg-purple-950/40 border border-violet-100 dark:border-purple-900/40 space-y-1">
                <span class="font-display text-[10px] font-bold text-violet-900 dark:text-purple-200 uppercase tracking-wider block">
                  Rekomendasi
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

      {/* Dialog Cetak Rekapitulasi */}
      <PrintReportModal
        open={printModalOpen()}
        onClose={() => setPrintModalOpen(false)}
        observations={observasiList()}
        totalUsers={adminMacro()?.totalUsers ?? 4}
        totalPetak={adminMacro()?.totalPetak ?? 3}
        avgAiConfidence={adminMacro()?.avgAiConfidence ?? 94.0}
        unconfiguredCount={adminMacro()?.unconfiguredOptCount ?? 0}
        onExportCsv={exportCsv}
      />
    </div>
  );
}
