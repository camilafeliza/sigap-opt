import { Show, createSignal } from 'solid-js';
import { useLocation, useNavigate } from '@solidjs/router';
import { useAuth } from '../../services/auth';
import { useTheme } from '../../services/theme';
import { useAvatar } from '../../services/avatar';
import { toast } from '../../services/toast';
import { DialogModal } from '../ui/Dialog';
import { Avatar } from '../ui/Avatar';
import {
  SignOut as SignOutIcon,
  Sun as SunIcon,
  Moon as MoonIcon,
  CheckCircle as CheckCircleIcon,
  ShieldCheck as ShieldCheckIcon,
  Shuffle as ShuffleIcon,
} from 'phosphor-solid';

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const { isDark, setTheme } = useTheme();
  const { randomize } = useAvatar();
  const [settingsOpen, setSettingsOpen] = createSignal(false);

  const isLoginPage = () => location.pathname === '/login';

  const handleLogout = () => {
    auth.logout();
    setSettingsOpen(false);
    toast.info('Sesi Anda telah berakhir');
    navigate('/login', { replace: true });
  };

  const displayName = () => {
    const user = auth.currentUser();
    return user?.full_name || user?.username || 'Pengguna';
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
            title="Buka Pengaturan Profil"
          >
            <Avatar size="md" showIndicator={true} />
            <span class="font-display font-bold text-sm text-slate-800 dark:text-slate-100 tracking-tight truncate max-w-[200px] group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              {displayName()}
            </span>
          </button>

          {/* Badge Peran Pengguna (Clean Functional Status Pill) */}
          <span class="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/40 font-['DM_Sans']">
            {auth.currentUser()?.role === 'superadmin' ? 'Super Admin' : 'Petani'}
          </span>
        </div>
      </header>

      {/* Ark UI Modal Pengaturan (Terintegrasi Penuh - Menjaga Strict 5 Routes SSOT) */}
      <DialogModal
        open={settingsOpen()}
        onOpenChange={setSettingsOpen}
        title="Pengaturan"
      >
        <div class="space-y-4">
          {/* 1. Pemilihan Mode Terang / Gelap */}
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

          {/* 2. Profil Pengguna & Avatar */}
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <Avatar size="lg" />
              <div>
                <p class="font-display font-bold text-xs text-slate-900 dark:text-slate-100">
                  {displayName()}
                </p>
                <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-display font-bold uppercase bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                  <ShieldCheckIcon size={10} weight="bold" />
                  {auth.role()}
                </span>
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

          {/* 3. Tombol Selesai & Tutup */}
          <div class="pt-1 flex gap-2">
            <button
              type="button"
              onClick={handleLogout}
              class="w-1/2 py-2.5 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-display font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <SignOutIcon size={16} weight="bold" />
              <span>Keluar Sesi</span>
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              class="w-1/2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-display font-bold text-xs shadow-sm transition-colors"
            >
              Selesai
            </button>
          </div>
        </div>
      </DialogModal>
    </Show>
  );
}
