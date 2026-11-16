import { Show, createSignal } from 'solid-js';
import { useLocation, useNavigate } from '@solidjs/router';
import { useAuth } from '../../services/auth';
import { useTheme } from '../../services/theme';
import { useAvatar } from '../../services/avatar';
import { DialogModal } from '../ui/Dialog';
import { Avatar } from '../ui/Avatar';
import {
  SignOut as SignOutIcon,
  Sun as SunIcon,
  Moon as MoonIcon,
  Gear as GearIcon,
  CheckCircle as CheckCircleIcon,
  ShieldCheck as ShieldCheckIcon,
  Shuffle as ShuffleIcon,
} from 'phosphor-solid';

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const { isDark, toggleTheme, setTheme } = useTheme();
  const { randomize } = useAvatar();
  const [settingsOpen, setSettingsOpen] = createSignal(false);

  const isLoginPage = () => location.pathname === '/login';

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
    <Show when={!isLoginPage() && auth.isAuthenticated()}>
      <header class="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 flex justify-center transition-colors">
        <div class="w-full max-w-md px-4 py-2.5 flex items-center justify-between">
          {/* Profile Picture 3D Kartun & Nama Pengguna */}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            class="flex items-center gap-2.5 text-left group focus:outline-none"
            title="Buka Pengaturan"
          >
            <Avatar size="md" showIndicator={true} />
            <span class="font-display font-bold text-sm text-slate-800 dark:text-slate-100 tracking-tight truncate max-w-[180px] group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              {displayName()}
            </span>
          </button>

          {/* Quick Actions: Toggle Tema, Pengaturan, & Logout */}
          <div class="flex items-center gap-1">
            {/* Quick Toggle Mode Terang/Gelap (1-Tap Switch) */}
            <button
              type="button"
              onClick={toggleTheme}
              title={isDark() ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
              class="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-all"
            >
              <Show
                when={isDark()}
                fallback={<MoonIcon size={19} weight="bold" />}
              >
                <SunIcon size={19} weight="bold" class="text-amber-400 animate-spin-slow" />
              </Show>
            </button>

            {/* Tombol Pengaturan Modal/Halaman */}
            <button
              type="button"
              onClick={() => navigate('/pengaturan')}
              title="Pengaturan"
              class={`p-2 rounded-xl transition-all active:scale-90 ${
                location.pathname === '/pengaturan'
                  ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60'
                  : 'text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40'
              }`}
            >
              <GearIcon size={19} weight={location.pathname === '/pengaturan' ? 'fill' : 'bold'} />
            </button>

            {/* Tombol Keluar */}
            <button
              type="button"
              onClick={handleLogout}
              title="Keluar"
              class="p-2 rounded-xl text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40 active:scale-95 transition-all"
            >
              <SignOutIcon size={19} weight="bold" />
            </button>
          </div>
        </div>
      </header>

      {/* Ark UI Modal Pengaturan Cepat */}
      <DialogModal
        open={settingsOpen()}
        onOpenChange={setSettingsOpen}
        title="Pengaturan Cepat"
        description="Pilihan tema & status sesi"
      >
        <div class="space-y-4">
          {/* Pemilihan Mode Terang / Gelap */}
          <div>
            <span class="font-display font-bold text-xs text-slate-700 dark:text-slate-300 block mb-2">
              Mode Tampilan
            </span>
            <div class="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setTheme('light')}
                class={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all ${
                  !isDark()
                    ? 'border-violet-600 bg-purple-50/60 ring-2 ring-purple-100 text-slate-900'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-300'
                }`}
              >
                <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                  <SunIcon size={18} weight="bold" />
                </div>
                <div class="text-left flex-1">
                  <p class="font-display font-bold text-xs">Terang</p>
                  <p class="font-data text-[10px] text-slate-400">Siang</p>
                </div>
                <Show when={!isDark()}>
                  <CheckCircleIcon size={16} weight="fill" class="text-violet-600" />
                </Show>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                class={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all ${
                  isDark()
                    ? 'border-violet-500 bg-purple-950/50 ring-2 ring-purple-900 text-white'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-300'
                }`}
              >
                <div class="w-8 h-8 rounded-lg bg-purple-900/60 text-purple-300 flex items-center justify-center">
                  <MoonIcon size={18} weight="bold" />
                </div>
                <div class="text-left flex-1">
                  <p class="font-display font-bold text-xs">Gelap</p>
                  <p class="font-data text-[10px] text-slate-400">Malam</p>
                </div>
                <Show when={isDark()}>
                  <CheckCircleIcon size={16} weight="fill" class="text-violet-400" />
                </Show>
              </button>
            </div>
          </div>

          {/* Avatar Karakter 3D & Tombol Acak */}
          <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <Avatar size="lg" />
              <div>
                <p class="font-display font-bold text-xs text-slate-900 dark:text-slate-100">
                  {displayName()}
                </p>
                <p class="font-data text-[10px] text-slate-400">
                  Karakter 3D
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={randomize}
              class="font-display text-xs font-bold px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-95 text-white flex items-center gap-1.5 shadow-sm transition-all"
            >
              <ShuffleIcon size={14} weight="bold" />
              <span>Acak</span>
            </button>
          </div>

          {/* Navigasi Lengkap ke Pengaturan */}
          <div class="pt-1 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setSettingsOpen(false);
                navigate('/pengaturan');
              }}
              class="font-display font-bold text-xs text-purple-600 dark:text-purple-400 hover:underline"
            >
              Pengaturan Lengkap &rarr;
            </button>
          </div>
        </div>
      </DialogModal>
    </Show>
  );
}
