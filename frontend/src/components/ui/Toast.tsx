import { For, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import {
  CheckCircle,
  WarningOctagon,
  Warning,
  Info,
  X as XIcon,
} from 'phosphor-solid';
import { useToasts, toast, ToastItem } from '../../services/toast';

export function ToastContainer() {
  const toasts = useToasts();

  return (
    <Portal>
      <div
        class="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm flex flex-col gap-2.5 pointer-events-none"
        aria-live="polite"
      >
        <For each={toasts()}>
          {(item) => <ToastCard item={item} onDismiss={() => toast.dismiss(item.id)} />}
        </For>
      </div>
    </Portal>
  );
}

interface ToastCardProps {
  item: ToastItem;
  onDismiss: () => void;
}

function ToastCard(props: ToastCardProps) {
  const getIcon = () => {
    switch (props.item.type) {
      case 'success':
        return <CheckCircle size={22} weight="fill" class="text-emerald-500 shrink-0" />;
      case 'error':
        return <WarningOctagon size={22} weight="fill" class="text-orange-600 dark:text-orange-500 shrink-0" />;
      case 'warning':
        return <Warning size={22} weight="fill" class="text-amber-500 shrink-0" />;
      case 'info':
      default:
        return <Info size={22} weight="fill" class="text-violet-600 dark:text-violet-400 shrink-0" />;
    }
  };

  const getBorderColor = () => {
    switch (props.item.type) {
      case 'success':
        return 'border-emerald-500/30 dark:border-emerald-500/20';
      case 'error':
        return 'border-orange-500/40 dark:border-orange-500/30';
      case 'warning':
        return 'border-amber-500/30 dark:border-amber-500/20';
      case 'info':
      default:
        return 'border-violet-500/30 dark:border-violet-500/20';
    }
  };

  return (
    <div
      class={`pointer-events-auto flex items-start gap-3 p-3.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border shadow-xl transition-all duration-200 animate-in fade-in slide-in-from-top-3 ${getBorderColor()}`}
      role="alert"
    >
      <div class="mt-0.5">{getIcon()}</div>

      <div class="flex-1 min-w-0 pr-1">
        <h4 class="font-display font-bold text-xs text-slate-900 dark:text-slate-100 leading-snug">
          {props.item.title}
        </h4>
        <Show when={props.item.description}>
          <p class="font-data text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            {props.item.description}
          </p>
        </Show>
      </div>

      <button
        type="button"
        onClick={props.onDismiss}
        class="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Tutup"
      >
        <XIcon size={14} weight="bold" />
      </button>
    </div>
  );
}
