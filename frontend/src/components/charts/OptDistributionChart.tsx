import { onMount, onCleanup, createEffect, Show } from 'solid-js';
import {
  Chart,
  BarController,
  BarElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  ChartConfiguration,
} from 'chart.js';

Chart.register(BarController, BarElement, LinearScale, CategoryScale, Tooltip);

export interface OptStat {
  name: string;
  count: number;
  scientificName: string;
  percentage?: number;
}

interface OptDistributionChartProps {
  data: OptStat[];
}

export function OptDistributionChart(props: OptDistributionChartProps) {
  let canvasRef: HTMLCanvasElement | undefined;
  let chartInstance: Chart | null = null;

  const initChart = () => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;

    const labels = props.data.map((d) => d.name);
    const counts = props.data.map((d) => d.count);

    // Color gradient / highlight for top item (Orange for highest, Purple for others)
    const backgroundColors = props.data.map((_, i) =>
      i === 0 ? '#F97316' : '#7C3AED'
    );

    const isDark = document.documentElement.classList.contains('dark');

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            data: counts,
            backgroundColor: backgroundColors,
            borderRadius: 6,
            barThickness: 16,
          },
        ],
      },
      options: {
        indexAxis: 'y', // Horizontal bars for mobile readability
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(15, 23, 42, 0.92)',
            titleFont: { family: 'DM Sans', size: 11, weight: 'bold' },
            bodyFont: { family: 'Roboto', size: 10 },
            padding: 8,
            cornerRadius: 8,
            callbacks: {
              label: (context) => {
                const count = context.parsed.x;
                const total = props.data.reduce((acc, cur) => acc + cur.count, 0);
                const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
                return ` ${count} Kasus (${pct}%)`;
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: {
              color: isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.5)',
            },
            ticks: {
              font: { family: 'Roboto', size: 10 },
              color: isDark ? '#94A3B8' : '#64748B',
              stepSize: 5,
            },
          },
          y: {
            grid: {
              display: false,
            },
            ticks: {
              font: { family: 'DM Sans', size: 11, weight: 'bold' },
              color: isDark ? '#E2E8F0' : '#334155',
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
    if (chartInstance && props.data) {
      chartInstance.data.labels = props.data.map((d) => d.name);
      chartInstance.data.datasets[0].data = props.data.map((d) => d.count);
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
    <div class="w-full h-36 relative flex items-center justify-center">
      <Show when={props.data && props.data.length > 0} fallback={
        <p class="font-display text-xs font-bold text-slate-400 dark:text-slate-500">
          Belum ada data serangan OPT
        </p>
      }>
        <canvas ref={canvasRef} />
      </Show>
    </div>
  );
}
