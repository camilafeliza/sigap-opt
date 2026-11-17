import { createSignal, createMemo, Show, For } from 'solid-js';
import type { ObservasiItem } from '../../pages/Dashboard';
import {
  Compass,
  MapPin,
  WarningCircle,
  ShieldCheck,
  Warning,
  Eye,
  Crosshair,
} from 'phosphor-solid';

interface GeospatialOutbreakMapProps {
  observations: ObservasiItem[];
  onSelect?: (obs: ObservasiItem) => void;
}

interface MapSectorPoint {
  id: string;
  name: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  observation?: ObservasiItem;
  status: 'BAHAYA' | 'WASPADA' | 'AMAN' | 'KOSONG';
  intensity: number;
  pestName: string;
}

export function GeospatialOutbreakMap(props: GeospatialOutbreakMapProps) {
  const [selectedPointId, setSelectedPointId] = createSignal<string | null>(null);
  const [filterHotspotsOnly, setFilterHotspotsOnly] = createSignal(false);

  // Pemetaan petak lapangan ke titik koordinat geospasial sektor pertanian
  const sectorPoints = createMemo<MapSectorPoint[]>(() => {
    const list = props.observations;

    // Koordinat dasar sektor wilayah pertanian
    const defaultSectors: { [key: string]: { x: number; y: number } } = {
      'petak barat': { x: 26, y: 58 },
      'petak timur': { x: 74, y: 44 },
      'petak a1': { x: 50, y: 28 },
      'petak a2': { x: 62, y: 24 },
      'petak selatan': { x: 45, y: 76 },
      'petak utara': { x: 38, y: 22 },
      'petak tengah': { x: 50, y: 50 },
    };

    // Kelompokkan observasi terbaru per petak
    const latestByPetak = new Map<string, ObservasiItem>();
    for (const obs of list) {
      const key = (obs.petak || 'Petak Utama').trim().toLowerCase();
      if (!latestByPetak.has(key)) {
        latestByPetak.set(key, obs);
      }
    }

    const points: MapSectorPoint[] = [];

    // Jika ada observasi riil, petakan
    let idx = 0;
    latestByPetak.forEach((obs, key) => {
      let coords = defaultSectors[key];
      if (!coords) {
        // Fallback grid koordinat teratur jika nama petak baru
        const pseudoAngles = [35, 68, 82, 18, 52, 40];
        const pseudoY = [35, 65, 48, 72, 38, 56];
        coords = {
          x: pseudoAngles[idx % pseudoAngles.length],
          y: pseudoY[idx % pseudoY.length],
        };
      }

      points.push({
        id: obs.id,
        name: obs.petak || 'Petak Tanpa Nama',
        x: coords.x,
        y: coords.y,
        observation: obs,
        status: obs.status_bahaya,
        intensity: obs.intensitas_persen,
        pestName: obs.opt_nama,
      });
      idx++;
    });

    // Jika database kosong, beri titik referensi sektor wilayah
    if (points.length === 0) {
      points.push(
        { id: 's-1', name: 'Sektor Barat', x: 28, y: 56, status: 'AMAN', intensity: 0, pestName: 'Nihil' },
        { id: 's-2', name: 'Sektor Timur', x: 72, y: 42, status: 'AMAN', intensity: 0, pestName: 'Nihil' },
        { id: 's-3', name: 'Sektor Utara', x: 50, y: 28, status: 'AMAN', intensity: 0, pestName: 'Nihil' }
      );
    }

    return points;
  });

  // Hotspot berstatus bahaya
  const dangerHotspots = createMemo(() =>
    sectorPoints().filter((p) => p.status === 'BAHAYA')
  );

  // Deteksi koridor ancaman ledakan hama (outbreak)
  const outbreakCorridor = createMemo(() => {
    const danger = dangerHotspots();
    if (danger.length >= 2) {
      // Ada minimal 2 petak bahaya yang berpotensi menjadi klaster ledakan
      return {
        detected: true,
        source: danger[0],
        target: danger[1],
        pest: danger[0].pestName,
      };
    }
    return { detected: false, source: null, target: null, pest: '' };
  });

  // Titik yang sedang aktif dipilih
  const activePoint = createMemo(() => {
    const id = selectedPointId();
    if (!id && dangerHotspots().length > 0) {
      return dangerHotspots()[0];
    }
    return sectorPoints().find((p) => p.id === id) || sectorPoints()[0] || null;
  });

  const visiblePoints = createMemo(() => {
    if (filterHotspotsOnly()) {
      return sectorPoints().filter((p) => p.status === 'BAHAYA');
    }
    return sectorPoints();
  });

  return (
    <div class="space-y-3">
      {/* Peta Geospasial Container */}
      <div class="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-inner select-none">
        {/* Background Grid Topografi Pertanian */}
        <svg class="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid-topo" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#7C3AED" stroke-width="0.75" stroke-dasharray="2 3" />
            </pattern>
            {/* Kontur Lahan Sawah */}
            <radialGradient id="field-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#7C3AED" stop-opacity="0.15" />
              <stop offset="100%" stop-color="#0F172A" stop-opacity="0" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#field-glow)" />
          <rect width="100%" height="100%" fill="url(#grid-topo)" />
          {/* Garis Pembagi Sektor Administratif Wilayah */}
          <line x1="50%" y1="0%" x2="50%" y2="100%" stroke="#475569" stroke-width="0.75" stroke-dasharray="4 4" />
          <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="#475569" stroke-width="0.75" stroke-dasharray="4 4" />
        </svg>

        {/* Kontur Visual Area Wilayah Sawah */}
        <div class="absolute inset-0 pointer-events-none">
          <div class="absolute top-4 left-4 text-[10px] font-display font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <Compass size={14} weight="bold" class="text-violet-400" />
            <span>Peta Wilayah</span>
          </div>

          <div class="absolute top-4 right-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterHotspotsOnly(!filterHotspotsOnly())}
              class={`px-2 py-1 rounded-lg text-[10px] font-display font-bold uppercase transition-all flex items-center gap-1 border pointer-events-auto ${
                filterHotspotsOnly()
                  ? 'bg-orange-600 text-white border-orange-500 shadow-xs'
                  : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <WarningCircle size={12} weight="fill" class={filterHotspotsOnly() ? 'text-white' : 'text-orange-400'} />
              <span>{filterHotspotsOnly() ? 'Bahaya' : 'Semua'}</span>
            </button>
          </div>
        </div>

        {/* Garis Vektor Koridor Penyebaran Ledakan Hama (Outbreak Vectors) */}
        <Show when={outbreakCorridor().detected && outbreakCorridor().source && outbreakCorridor().target}>
          <svg class="absolute inset-0 w-full h-full pointer-events-none z-10">
            <defs>
              <linearGradient id="corridor-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#EA580C" stop-opacity="0.8" />
                <stop offset="50%" stop-color="#F97316" stop-opacity="0.9" />
                <stop offset="100%" stop-color="#EA580C" stop-opacity="0.8" />
              </linearGradient>
            </defs>
            <line
              x1={`${outbreakCorridor().source!.x}%`}
              y1={`${outbreakCorridor().source!.y}%`}
              x2={`${outbreakCorridor().target!.x}%`}
              y2={`${outbreakCorridor().target!.y}%`}
              stroke="url(#corridor-gradient)"
              stroke-width="2.5"
              stroke-dasharray="6 4"
              class="animate-pulse"
            />
          </svg>
        </Show>

        {/* Titik-Titik Petak Lahan (Hotspot Pins) */}
        <For each={visiblePoints()}>
          {(point) => {
            const isDanger = point.status === 'BAHAYA';
            const isWaspada = point.status === 'WASPADA';
            const isSelected = activePoint()?.id === point.id;

            return (
              <div
                class="absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                style={{
                  left: `${point.x}%`,
                  top: `${point.y}%`,
                }}
                onClick={() => {
                  setSelectedPointId(point.id);
                  if (point.observation && props.onSelect) {
                    props.onSelect(point.observation);
                  }
                }}
              >
                {/* Gelombang Denyut Alarm Outbreak untuk Titik BAHAYA */}
                <Show when={isDanger}>
                  <div class="absolute -inset-2.5 rounded-full bg-orange-600/30 animate-ping pointer-events-none" />
                  <div class="absolute -inset-1.5 rounded-full bg-orange-500/40 animate-pulse pointer-events-none" />
                </Show>

                {/* Pin Lingkaran Geospasial */}
                <div
                  class={`relative w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90 shadow-lg ${
                    isDanger
                      ? 'bg-gradient-to-br from-orange-500 to-orange-700 text-white ring-2 ring-orange-300 dark:ring-orange-800'
                      : isWaspada
                      ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white ring-2 ring-amber-300 dark:ring-amber-800'
                      : 'bg-gradient-to-br from-violet-600 to-purple-800 text-white ring-2 ring-purple-400 dark:ring-purple-900'
                  } ${isSelected ? 'scale-125 z-30 shadow-orange-600/50' : 'group-hover:scale-110'}`}
                >
                  <Show
                    when={isDanger}
                    fallback={
                      <Show when={isWaspada} fallback={<ShieldCheck size={16} weight="fill" />}>
                        <Warning size={16} weight="fill" />
                      </Show>
                    }
                  >
                    <WarningCircle size={18} weight="fill" class="animate-bounce" />
                  </Show>
                </div>

                {/* Label Mikro Petak & Persentase */}
                <div
                  class={`absolute top-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-md text-[10px] font-display font-black tracking-tight border shadow-md transition-opacity pointer-events-none ${
                    isDanger
                      ? 'bg-orange-950/90 text-orange-200 border-orange-700'
                      : isWaspada
                      ? 'bg-slate-900/90 text-amber-300 border-slate-700'
                      : 'bg-slate-900/90 text-purple-200 border-slate-700'
                  }`}
                >
                  <span>{point.name}</span>
                  <span class="ml-1 text-[9px] font-bold opacity-90">({point.intensity}%)</span>
                </div>
              </div>
            );
          }}
        </For>

        {/* Legend Sederhana di Pojok Kiri Bawah */}
        <div class="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-xs border border-slate-800 rounded-xl px-2.5 py-1.5 flex items-center gap-3 text-[10px] font-display font-bold text-slate-300">
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-xs shadow-orange-500 animate-pulse" />
            <span>Bahaya (&gt;10%)</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Waspada (5-10%)</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-violet-600" />
            <span>Aman (&lt;5%)</span>
          </div>
        </div>
      </div>

      {/* Kartu Telemetri Sektor yang Sedang Dipilih */}
      <Show when={activePoint()}>
        {(pt) => (
          <div
            class={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
              pt().status === 'BAHAYA'
                ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-300 dark:border-orange-800'
                : pt().status === 'WASPADA'
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div class="flex items-center gap-3 min-w-0">
              <div
                class={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white ${
                  pt().status === 'BAHAYA'
                    ? 'bg-orange-600 shadow-xs shadow-orange-600/30'
                    : pt().status === 'WASPADA'
                    ? 'bg-amber-500'
                    : 'bg-violet-600'
                }`}
              >
                <Crosshair size={22} weight="bold" />
              </div>
              <div class="space-y-0.5 min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="font-display text-xs font-black text-slate-900 dark:text-slate-100">
                    {pt().name}
                  </span>
                  <span
                    class={`font-display text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                      pt().status === 'BAHAYA'
                        ? 'bg-orange-600 text-white'
                        : pt().status === 'WASPADA'
                        ? 'bg-amber-600 text-white'
                        : 'bg-violet-600 text-white'
                    }`}
                  >
                    {pt().status}
                  </span>
                </div>
                <div class="font-display text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate">
                  {pt().pestName} · {pt().intensity}%
                </div>
              </div>
            </div>

            <Show when={pt().observation}>
              {(obs) => (
                <button
                  type="button"
                  onClick={() => props.onSelect && props.onSelect(obs())}
                  class="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-display text-[11px] font-bold shrink-0 flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <Eye size={14} weight="bold" />
                  <span>Detail</span>
                </button>
              )}
            </Show>
          </div>
        )}
      </Show>
    </div>
  );
}
