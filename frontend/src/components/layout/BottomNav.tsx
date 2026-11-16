import { Show } from 'solid-js';
import { useLocation, useNavigate } from '@solidjs/router';
import { useAuth } from '../../services/auth';
import {
  House as HouseIcon,
  Camera as CameraIcon,
  Users as UsersIcon,
  SlidersHorizontal as SlidersIcon,
} from 'phosphor-solid';

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();

  // Hide on login page
  const isLoginPage = () => location.pathname === '/login';

  const isActive = (path: string) => location.pathname === path;

  return (
    <Show when={!isLoginPage() && auth.isAuthenticated()}>
      <nav class="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-safe pointer-events-none">
        {/* Mobile centered container max-w-md */}
        <div class="w-full max-w-md px-4 pb-3 pointer-events-auto">
          <div class="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-purple-950/10 rounded-2xl px-3 py-2 flex items-center justify-around">
            {/* 1. Dashboard (All Roles) */}
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              class={`flex flex-col items-center justify-center w-14 py-1 transition-all rounded-xl ${
                isActive('/dashboard')
                  ? 'text-violet-700 dark:text-purple-400 font-bold'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <HouseIcon size={22} weight={isActive('/dashboard') ? 'fill' : 'regular'} />
              <span class="font-display text-[10px] mt-0.5 tracking-tight font-bold">Beranda</span>
            </button>

            {/* 2. Elevated Center Action: Observasi Cepat (All Roles) */}
            <button
              type="button"
              onClick={() => navigate('/observasi')}
              class="relative -top-4 flex flex-col items-center group focus:outline-none"
            >
              <div
                class={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform active:scale-95 ${
                  isActive('/observasi')
                    ? 'bg-orange-600 shadow-orange-600/30 ring-4 ring-orange-200 dark:ring-orange-950'
                    : 'bg-orange-500 shadow-orange-500/25 group-hover:bg-orange-600'
                }`}
              >
                <CameraIcon size={28} weight="bold" />
              </div>
              <span class="font-display text-[10px] font-bold text-slate-700 dark:text-slate-200 mt-1">Observasi</span>
            </button>

            {/* 3. Users (Super Admin Only) */}
            <Show when={auth.isSuperAdmin()}>
              <button
                type="button"
                onClick={() => navigate('/users')}
                class={`flex flex-col items-center justify-center w-14 py-1 transition-all rounded-xl ${
                  isActive('/users')
                    ? 'text-violet-700 dark:text-purple-400 font-bold'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <UsersIcon size={22} weight={isActive('/users') ? 'fill' : 'regular'} />
                <span class="font-display text-[10px] mt-0.5 tracking-tight font-bold">Pengguna</span>
              </button>
            </Show>

            {/* 4. Ambang Ekonomi (Super Admin Only) */}
            <Show when={auth.isSuperAdmin()}>
              <button
                type="button"
                onClick={() => navigate('/ambang-ekonomi')}
                class={`flex flex-col items-center justify-center w-14 py-1 transition-all rounded-xl ${
                  isActive('/ambang-ekonomi')
                    ? 'text-violet-700 dark:text-purple-400 font-bold'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <SlidersIcon size={22} weight={isActive('/ambang-ekonomi') ? 'fill' : 'regular'} />
                <span class="font-display text-[10px] mt-0.5 tracking-tight font-bold">Ambang</span>
              </button>
            </Show>
          </div>
        </div>
      </nav>
    </Show>
  );
}
