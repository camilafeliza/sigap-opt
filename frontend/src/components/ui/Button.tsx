import { JSX, splitProps } from 'solid-js';

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
}

export function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, [
    'variant',
    'size',
    'fullWidth',
    'loading',
    'class',
    'children',
    'disabled',
  ]);

  const baseStyles =
    'relative inline-flex items-center justify-center font-display font-bold tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none rounded-xl';

  const variants = {
    // Oranye: Call to Action utama (GEMINI.md)
    primary:
      'bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white shadow-lg shadow-orange-500/25 focus:ring-orange-400',
    // Ungu: Identitas Brand (GEMINI.md)
    secondary:
      'bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white shadow-lg shadow-purple-600/20 focus:ring-purple-400',
    outline:
      'border-2 border-slate-200 dark:border-slate-700 hover:border-violet-600 dark:hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 text-slate-700 dark:text-slate-200 bg-transparent focus:ring-violet-400',
    ghost:
      'text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 bg-transparent focus:ring-violet-400',
    danger:
      'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-lg shadow-rose-600/25 focus:ring-rose-400',
  };

  const sizes = {
    sm: 'text-xs px-3 py-2 gap-1.5 min-h-[36px]',
    md: 'text-sm px-4 py-2.5 gap-2 min-h-[44px]', // 44px min for thumb-friendly mobile
    lg: 'text-base px-6 py-3.5 gap-2.5 min-h-[52px]',
  };

  const v = variants[local.variant || 'primary'];
  const s = sizes[local.size || 'md'];
  const w = local.fullWidth ? 'w-full' : '';

  return (
    <button
      class={`${baseStyles} ${v} ${s} ${w} ${local.class || ''}`}
      disabled={local.disabled || local.loading}
      {...rest}
    >
      {local.loading ? (
        <span class="inline-flex items-center gap-2">
          <svg class="animate-spin h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>Memproses...</span>
        </span>
      ) : (
        local.children
      )}
    </button>
  );
}
