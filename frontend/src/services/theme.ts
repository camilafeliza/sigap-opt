import { createSignal, createEffect } from 'solid-js';
import { useAuth } from './auth';

export type ThemeMode = 'light' | 'dark';

export function getUserStorageKey(baseKey: string, userId?: string | null): string {
  if (userId) {
    return `sigap_user_${userId}_${baseKey}`;
  }
  return `sigap_guest_${baseKey}`;
}

const auth = useAuth();

function getThemeForUser(userId?: string | null): ThemeMode {
  // Check user-scoped key first
  const userKey = getUserStorageKey('theme', userId);
  const saved = localStorage.getItem(userKey);
  if (saved === 'dark' || saved === 'light') return saved;

  // Clean legacy unscoped key if present
  try {
    localStorage.removeItem('sigap_opt_theme');
  } catch (_) {}

  // Default to OS preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const [currentTheme, setCurrentTheme] = createSignal<ThemeMode>(
  getThemeForUser(auth.currentUser()?.id)
);

function applyThemeToDom(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

// Initial application
applyThemeToDom(currentTheme());

// Re-sync and isolate theme whenever active user session changes
createEffect(() => {
  const user = auth.currentUser();
  const userId = user?.id;
  const targetTheme = getThemeForUser(userId);
  setCurrentTheme(targetTheme);
  applyThemeToDom(targetTheme);
});

export function useTheme() {
  const isDark = () => currentTheme() === 'dark';

  const setTheme = (mode: ThemeMode) => {
    setCurrentTheme(mode);
    applyThemeToDom(mode);
    const userId = auth.currentUser()?.id;
    localStorage.setItem(getUserStorageKey('theme', userId), mode);
  };

  const toggleTheme = () => {
    const nextMode: ThemeMode = currentTheme() === 'dark' ? 'light' : 'dark';
    setTheme(nextMode);
  };

  return {
    theme: currentTheme,
    isDark,
    setTheme,
    toggleTheme,
  };
}
