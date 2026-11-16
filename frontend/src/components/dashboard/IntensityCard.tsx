import { createMemo, Show } from 'solid-js';
import { Card } from '../ui/Card';
import { Gauge as GaugeIcon, TrendUp as TrendUpIcon, Warning as WarningIcon } from 'phosphor-solid';

interface IntensityCardProps {
  intensity: number;
  petakCount: number;
  thresholdWaspada?: number;
  thresholdBahaya?: number;
}

export function IntensityCard(props: IntensityCardProps) {
  const waspada = () => props.thresholdWaspada ?? 5.0;
  const bahaya = () => props.thresholdBahaya ?? 10.0;

  // Level status based on agronomic thresholds
  const statusLevel = createMemo(() => {
    const val = props.intensity;
    if (val >= bahaya()) return 'BAHAYA';
    if (val >= waspada()) return 'WASPADA';
    return 'AMAN';
  });

  // Color tokens based on strictly Tri-Color PHT rules
  const themeColors = createMemo(() => {
    const st = statusLevel();
    if (st === 'BAHAYA') {
      return {
        stroke: '#EA580C', // Orange 600
        glow: 'rgba(234, 88, 12, 0.25)',
        text: 'text-orange-600 dark:text-orange-400',
        bg: 'bg-orange-50 dark:bg-orange-950/40',
        border: 'border-orange-500/40',
        badge: 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300',
      };
    }
    if (st === 'WASPADA') {
      return {
        stroke: '#F97316', // Orange 500
        glow: 'rgba(249, 115, 22, 0.2)',
        text: 'text-orange-500 dark:text-orange-400',
        bg: 'bg-orange-50/60 dark:bg-orange-950/30',
        border: 'border-orange-400/30',
        badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
      };
    }
    return {
      stroke: '#7C3AED', // Violet 600
      glow: 'rgba(124, 58, 237, 0.2)',
      text: 'text-violet-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/40',
      border: 'border-purple-500/30',
      badge: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
    };
  });

  // SVG Radial Gauge Calculation (Radius = 18, Circumference ~ 113.1)
  const maxScale = 20.0;
  const radius = 18;
  const circumference = 2 * Math.PI * radius; // ~113.097

  const strokeDashoffset = createMemo(() => {
    const clamped = Math.min(Math.max(props.intensity, 0), maxScale);
    const progress = clamped / maxScale;
    return circumference * (1 - progress);
  });

  // Marker percentage position on 0-20 scale (clamped between 4% and 96%)
  const markerPos = createMemo(() => {
    const p = (props.intensity / maxScale) * 100;
    return Math.min(Math.max(p, 4), 96);
  });

  return (
    <Card
      variant="elevated"
      class={`p-3.5 relative overflow-hidden bg-white dark:bg-slate-900 border transition-all duration-300 ${
        statusLevel() === 'BAHAYA'
          ? 'border-orange-400/80 dark:border-orange-500/60 shadow-lg shadow-orange-500/10'
          : 'border-slate-100 dark:border-slate-800'
      }`}
    >
      {/* Top Header: Label & Mini Gauge Icon */}
      <div class="flex items-center justify-between mb-2">
        <span class="font-display text-[10px] font-black text-slate-500 dark:text-slate-400 tracking-wider">
          RATA INTENSITAS
        </span>
        <div class={`w-6 h-6 rounded-lg ${themeColors().bg} ${themeColors().text} flex items-center justify-center transition-colors`}>
          <GaugeIcon size={14} weight="bold" />
        </div>
      </div>

      {/* Main Metric Section: Value + Radial SVG Dial */}
      <div class="flex items-center justify-between gap-1">
        <div>
          <div class="flex items-baseline">
            <span class="font-display text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">
              {props.intensity.toFixed(1)}
            </span>
            <span class="font-display text-xs font-extrabold text-orange-500 dark:text-orange-400 ml-0.5">
              %
            </span>
          </div>

          <div class="mt-1 flex items-center gap-1.5">
            <span class={`font-display text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${themeColors().badge}`}>
              {statusLevel()}
            </span>
            <span class="font-display text-[10px] font-bold text-slate-400 dark:text-slate-500">
              {props.petakCount} Petak
            </span>
          </div>
        </div>

        {/* Custom Mini Circular Radial Gauge */}
        <div class="relative w-11 h-11 flex-shrink-0 flex items-center justify-center">
          <svg class="w-full h-full -rotate-90 transform" viewBox="0 0 44 44">
            {/* Background Track */}
            <circle
              cx="22"
              cy="22"
              r={radius}
              stroke="currentColor"
              stroke-width="3.5"
              fill="transparent"
              class="text-slate-100 dark:text-slate-800"
            />
            {/* Threshold Tick at 10% (Midpoint) */}
            <circle
              cx="22"
              cy="22"
              r={radius}
              stroke="currentColor"
              stroke-width="4.5"
              stroke-dasharray="1.5 111.6"
              stroke-dashoffset={circumference * 0.5}
              fill="transparent"
              class="text-orange-300 dark:text-orange-600/70"
            />
            {/* Active Foreground Arc */}
            <circle
              cx="22"
              cy="22"
              r={radius}
              stroke={themeColors().stroke}
              stroke-width="3.5"
              stroke-linecap="round"
              stroke-dasharray={circumference}
              stroke-dashoffset={strokeDashoffset()}
              fill="transparent"
              class="transition-all duration-500 ease-out"
            />
          </svg>

          {/* Center Icon Indicator */}
          <div class={`absolute inset-0 flex items-center justify-center ${themeColors().text}`}>
            <Show
              when={statusLevel() === 'BAHAYA'}
              fallback={<TrendUpIcon size={12} weight="bold" />}
            >
              <WarningIcon size={12} weight="fill" />
            </Show>
          </div>
        </div>
      </div>

      {/* Segmented Micro Threshold Track (0 - 5% - 10%+) */}
      <div class="mt-2.5 pt-2 border-t border-slate-100/80 dark:border-slate-800/80">
        <div class="relative h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
          {/* Segment 1: Aman (0-5%) */}
          <div class="w-1/4 h-full bg-violet-400/40 dark:bg-purple-500/30" />
          {/* Segment 2: Waspada (5-10%) */}
          <div class="w-1/4 h-full bg-amber-400/50 dark:bg-amber-500/40" />
          {/* Segment 3: Bahaya (>10%) */}
          <div class="w-2/4 h-full bg-orange-500/50 dark:bg-orange-600/50" />
        </div>

        {/* Dynamic Glowing Pin Indicator */}
        <div class="relative w-full h-1">
          <div
            class="absolute -top-1 w-2 h-2 rounded-full ring-1 ring-white dark:ring-slate-900 shadow-sm transition-all duration-300 transform -translate-x-1"
            style={{
              left: `${markerPos()}%`,
              'background-color': themeColors().stroke,
            }}
          />
        </div>
      </div>
    </Card>
  );
}
