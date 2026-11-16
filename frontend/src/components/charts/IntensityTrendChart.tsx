import { onMount, onCleanup, createEffect } from 'solid-js';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
  Legend,
  ChartConfiguration,
} from 'chart.js';

// Register Chart.js modular components
Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
  Legend
);

export interface TrendPoint {
  label: string;
  intensity: number;
}

interface IntensityTrendChartProps {
  data: TrendPoint[];
  thresholdWaspada?: number;
  thresholdEkonomi?: number;
}

export function IntensityTrendChart(props: IntensityTrendChartProps) {
  let canvasRef: HTMLCanvasElement | undefined;
  let chartInstance: Chart | null = null;

  const initChart = () => {
    if (!canvasRef) return;

    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;

    // Create gorgeous purple gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, 'rgba(124, 58, 237, 0.35)'); // Violet 600
    gradient.addColorStop(0.7, 'rgba(124, 58, 237, 0.08)');
    gradient.addColorStop(1, 'rgba(124, 58, 237, 0.0)');

    const waspadaVal = props.thresholdWaspada ?? 5.0;
    const ekonomiVal = props.thresholdEkonomi ?? 10.0;

    const labels = props.data.map((d) => d.label);
    const intensities = props.data.map((d) => d.intensity);
    const waspadaLine = props.data.map(() => waspadaVal);
    const ekonomiLine = props.data.map(() => ekonomiVal);

    const isDark = document.documentElement.classList.contains('dark');

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [
          // 1. Intensitas Serangan Aktual
          {
            label: 'Intensitas (%)',
            data: intensities,
            borderColor: '#7C3AED',
            backgroundColor: gradient,
            borderWidth: 2.5,
            fill: true,
            tension: 0.38,
            pointBackgroundColor: isDark ? '#0F172A' : '#FFFFFF',
            pointBorderColor: '#7C3AED',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          // 2. Garis Ambang Ekonomi (Dashed Orange)
          {
            label: 'Ambang (10%)',
            data: ekonomiLine,
            borderColor: '#EA580C',
            borderWidth: 1.5,
            borderDash: [5, 4],
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 0,
          },
          // 3. Garis Batas Waspada (Dotted Orange/Amber)
          {
            label: 'Waspada (5%)',
            data: waspadaLine,
            borderColor: '#F97316',
            borderWidth: 1.2,
            borderDash: [2, 3],
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 8,
              boxHeight: 8,
              usePointStyle: true,
              pointStyle: 'circle',
              font: {
                family: 'DM Sans, sans-serif',
                size: 10,
                weight: 'bold',
              },
              color: isDark ? '#94A3B8' : '#64748B',
            },
          },
          tooltip: {
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(15, 23, 42, 0.92)',
            titleFont: { family: 'DM Sans', size: 11, weight: 'bold' },
            bodyFont: { family: 'Roboto', size: 11 },
            padding: 10,
            cornerRadius: 10,
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                return ` ${label}: ${context.parsed.y}%`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              font: { family: 'DM Sans', size: 10, weight: 'bold' },
              color: isDark ? '#94A3B8' : '#64748B',
            },
          },
          y: {
            beginAtZero: true,
            suggestedMax: 15,
            grid: {
              color: isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.6)',
            },
            ticks: {
              font: { family: 'Roboto', size: 10 },
              color: isDark ? '#94A3B8' : '#64748B',
              callback: (val) => `${val}%`,
            },
          },
        },
      },
    };

    chartInstance = new Chart(ctx, config);
  };

  onMount(() => {
    initChart();
  });

  createEffect(() => {
    // React to props.data changes
    if (chartInstance && props.data) {
      chartInstance.data.labels = props.data.map((d) => d.label);
      chartInstance.data.datasets[0].data = props.data.map((d) => d.intensity);
      chartInstance.data.datasets[1].data = props.data.map(() => props.thresholdEkonomi ?? 10.0);
      chartInstance.data.datasets[2].data = props.data.map(() => props.thresholdWaspada ?? 5.0);
      chartInstance.update('none');
    }
  });

  onCleanup(() => {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
  });

  return (
    <div class="w-full h-48 relative">
      <canvas ref={canvasRef} />
    </div>
  );
}
