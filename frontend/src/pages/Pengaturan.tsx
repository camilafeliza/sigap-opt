import { Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { useAuth } from '../services/auth';
import { useTheme } from '../services/theme';
import { useAvatar } from '../services/avatar';
import { Avatar } from '../components/ui/Avatar';
import {
  Sun as SunIcon,
  Moon as MoonIcon,
  CheckCircle as CheckCircleIcon,
  Gear as GearIcon,
  ShieldCheck as ShieldCheckIcon,
  User as UserIcon,
  SignOut as SignOutIcon,
  Palette as PaletteIcon,
  Info as InfoIcon,
  Shuffle as ShuffleIcon,
} from 'phosphor-solid';

export default function Pengaturan() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme, isDark } = useTheme();
  const { randomize } = useAvatar();

  const handleLogout = () => {
    auth.logout();
    navigate('/login', { replace: true });
  };

  const displayName = () => {
    const user = auth.currentUser();
    return user?.full_name || user?.username || 'Pengguna';
  };

  const initials = () => {
    const name = displayName();
    return name
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div class="px-4 py-4 space-y-4">
      {/* Header Bar */}
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center">
            <GearIcon size={20} weight="bold" />
          </div>
          <div>
            <h1 class="font-display font-black text-lg text-slate-900 dark:text-slate-100">
              Pengaturan
            </h1>
            <p class="font-data text-xs text-slate-500 dark:text-slate-400">
              Preferensi antarmuka & sistem
            </p>
          </div>
        </div>
      </div>

      {/* 1. Pengaturan Mode Tema Tampilan */}
      <div class="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div class="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <PaletteIcon size={18} class="text-violet-600 dark:text-purple-400" weight="bold" />
          <span class="font-display font-bold text-sm text-slate-800 dark:text-slate-200">
            Tema Tampilan
          </span>
        </div>

        <div class="grid grid-cols-2 gap-3 pt-1">
          {/* Opsi Terang */}
          <button
            type="button"
            onClick={() => setTheme('light')}
            class={`relative flex flex-col items-center p-3.5 rounded-2xl border-2 transition-all text-left ${
              !isDark()
                ? 'border-violet-600 bg-purple-50/50 shadow-sm ring-2 ring-purple-100'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-2 shadow-sm">
              <SunIcon size={22} weight="bold" />
            </div>
            <span class="font-display font-bold text-xs text-slate-800 dark:text-slate-200">
              Mode Terang
            </span>
            <span class="font-data text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Siang Lapangan
            </span>

            <Show when={!isDark()}>
              <div class="absolute top-2 right-2 text-violet-600">
                <CheckCircleIcon size={18} weight="fill" />
              </div>
            </Show>
          </button>

          {/* Opsi Gelap */}
          <button
            type="button"
            onClick={() => setTheme('dark')}
            class={`relative flex flex-col items-center p-3.5 rounded-2xl border-2 transition-all text-left ${
              isDark()
                ? 'border-violet-500 bg-purple-950/40 shadow-sm ring-2 ring-purple-900/60'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div class="w-10 h-10 rounded-xl bg-purple-900/60 text-purple-300 flex items-center justify-center mb-2 shadow-sm">
              <MoonIcon size={22} weight="bold" />
            </div>
            <span class="font-display font-bold text-xs text-slate-800 dark:text-slate-200">
              Mode Gelap
            </span>
            <span class="font-data text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Kontras Malam
            </span>

            <Show when={isDark()}>
              <div class="absolute top-2 right-2 text-violet-400">
                <CheckCircleIcon size={18} weight="fill" />
              </div>
            </Show>
          </button>
        </div>
      </div>

      {/* 2. Standar Palet Warna PHT (SSOT) */}
      <div class="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2.5">
        <span class="font-display font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Palet PHT Standar
        </span>
        <div class="grid grid-cols-3 gap-2 pt-1">
          <div class="flex items-center gap-2 p-2 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200/60 dark:border-orange-900/40">
            <span class="w-3.5 h-3.5 rounded-full bg-orange-500 flex-shrink-0 shadow-sm"></span>
            <div class="truncate">
              <p class="font-display font-bold text-[11px] text-orange-900 dark:text-orange-200 leading-tight">
                Oranye
              </p>
              <p class="font-data text-[9px] text-orange-700/80 dark:text-orange-400">Aksi / Bahaya</p>
            </div>
          </div>

          <div class="flex items-center gap-2 p-2 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/40">
            <span class="w-3.5 h-3.5 rounded-full bg-purple-600 flex-shrink-0 shadow-sm"></span>
            <div class="truncate">
              <p class="font-display font-bold text-[11px] text-purple-900 dark:text-purple-200 leading-tight">
                Ungu
              </p>
              <p class="font-data text-[9px] text-purple-700/80 dark:text-purple-400">Brand / Aman</p>
            </div>
          </div>

          <div class="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <span class="w-3.5 h-3.5 rounded-full bg-white border border-slate-300 flex-shrink-0 shadow-sm"></span>
            <div class="truncate">
              <p class="font-display font-bold text-[11px] text-slate-900 dark:text-slate-200 leading-tight">
                Putih
              </p>
              <p class="font-data text-[9px] text-slate-600 dark:text-slate-400">Permukaan</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Profil Pengguna & RBAC */}
      <div class="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div class="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <UserIcon size={18} class="text-violet-600 dark:text-purple-400" weight="bold" />
          <span class="font-display font-bold text-sm text-slate-800 dark:text-slate-200">
            Akun Lapangan
          </span>
        </div>

        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <Avatar size="lg" />
            <div>
              <p class="font-display font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight">
                {displayName()}
              </p>
              <p class="font-data text-xs text-slate-500 dark:text-slate-400">
                @{auth.currentUser()?.username || 'user'}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              onClick={randomize}
              title="Acak Karakter 3D"
              class="font-display text-xs font-bold text-violet-700 dark:text-purple-300 hover:text-violet-900 dark:hover:text-purple-200 bg-violet-50 dark:bg-purple-950/50 hover:bg-violet-100 dark:hover:bg-purple-900/60 px-2.5 py-1.5 rounded-xl border border-purple-200/60 dark:border-purple-800/60 flex items-center gap-1.5 active:scale-95 transition-all shadow-xs"
            >
              <ShuffleIcon size={14} weight="bold" />
              <span>Acak 3D</span>
            </button>

            <span
              class={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-display font-bold uppercase ${
                auth.isSuperAdmin()
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
              }`}
            >
              <ShieldCheckIcon size={14} weight="bold" />
              {auth.currentUser()?.role || 'petani'}
            </span>
          </div>
        </div>

        <div class="pt-2">
          <button
            type="button"
            onClick={handleLogout}
            class="w-full py-2.5 px-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/60 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-display font-bold text-xs flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/50 active:scale-95 transition-all"
          >
            <SignOutIcon size={16} weight="bold" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </div>

      {/* 4. Telemetri & Info Sistem */}
      <div class="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
        <div class="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <InfoIcon size={18} class="text-violet-600 dark:text-purple-400" weight="bold" />
          <span class="font-display font-bold text-sm text-slate-800 dark:text-slate-200">
            Sistem
          </span>
        </div>

        <div class="space-y-1.5 font-data text-xs">
          <div class="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
            <span class="text-slate-500 dark:text-slate-400">Aplikasi</span>
            <span class="font-display font-bold text-slate-800 dark:text-slate-200">sigap-opt v1.0</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
            <span class="text-slate-500 dark:text-slate-400">Arsitektur</span>
            <span class="font-display font-bold text-slate-800 dark:text-slate-200">Single Binary Axum</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
            <span class="text-slate-500 dark:text-slate-400">Database</span>
            <span class="font-display font-bold text-slate-800 dark:text-slate-200">LibSQL Embedded</span>
          </div>
          <div class="flex justify-between py-1">
            <span class="text-slate-500 dark:text-slate-400">Vision Engine</span>
            <span class="font-display font-bold text-purple-700 dark:text-purple-300">Gemini 2.5 Flash</span>
          </div>
        </div>
      </div>
    </div>
  );
}
