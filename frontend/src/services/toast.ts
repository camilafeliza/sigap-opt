import { createSignal } from 'solid-js';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  description?: string;
  duration?: number; // default: 3500ms
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration: number;
}

const [toasts, setToasts] = createSignal<ToastItem[]>([]);

export function useToasts() {
  return toasts;
}

export const toast = {
  show(title: string, type: ToastType = 'info', options?: ToastOptions) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const duration = options?.duration ?? 3500;

    const newToast: ToastItem = {
      id,
      type,
      title,
      description: options?.description,
      duration,
    };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        toast.dismiss(id);
      }, duration);
    }

    return id;
  },

  success(title: string, options?: ToastOptions) {
    return toast.show(title, 'success', options);
  },

  error(title: string, options?: ToastOptions) {
    return toast.show(title, 'error', options);
  },

  warning(title: string, options?: ToastOptions) {
    return toast.show(title, 'warning', options);
  },

  info(title: string, options?: ToastOptions) {
    return toast.show(title, 'info', options);
  },

  dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  },

  clear() {
    setToasts([]);
  },
};
