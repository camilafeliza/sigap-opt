import { JSX, splitProps } from 'solid-js';

interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered';
}

export function Card(props: CardProps) {
  const [local, rest] = splitProps(props, ['class', 'children', 'variant']);

  const baseStyles = 'bg-white dark:bg-slate-900 rounded-2xl transition-all duration-200 text-slate-900 dark:text-slate-100';
  const variants = {
    default: 'border border-slate-100 dark:border-slate-800 shadow-sm',
    elevated: 'border border-slate-100/80 dark:border-slate-800 shadow-xl shadow-purple-900/5',
    bordered: 'border-2 border-slate-200 dark:border-slate-800 shadow-none',
  };

  const selectedVariant = variants[local.variant || 'elevated'];

  return (
    <div class={`${baseStyles} ${selectedVariant} ${local.class || ''}`} {...rest}>
      {local.children}
    </div>
  );
}

export function CardHeader(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <div class={`p-6 pb-3 ${local.class || ''}`} {...rest}>
      {local.children}
    </div>
  );
}

export function CardContent(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <div class={`p-6 pt-2 ${local.class || ''}`} {...rest}>
      {local.children}
    </div>
  );
}
