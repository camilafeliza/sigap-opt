import { createSignal, createEffect } from 'solid-js';

export type ThemeMode = 'light' | 'dark';

const THEME_KEY = 'sigap_opt_theme';

function getInitialTheme(): ThemeMode {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const [currentTheme, setCurrentTheme] = createSignal<ThemeMode>(getInitialTheme());

// Sync DOM class on theme change
createEffect(() => {
  const t = currentTheme();
  const root = document.documentElement;
  if (t === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  localStorage.setItem(THEME_KEY, t);
});

export function useTheme() {
  const isDark = () => currentTheme() === 'dark';

  const setTheme = (mode: ThemeMode) => {
    setCurrentTheme(mode);
  };

  const toggleTheme = () => {
    setCurrentTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return {
    theme: currentTheme,
    isDark,
    setTheme,
    toggleTheme,
  };
}
