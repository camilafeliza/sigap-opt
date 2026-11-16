import { createSignal, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { useAuth } from '../services/auth';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import logoImg from '../assets/sigap-opt.png';
import {
  User as UserIcon,
  LockKey as LockIcon,
  Eye as EyeIcon,
  EyeSlash as EyeSlashIcon,
  SignIn as SignInIcon,
  WarningCircle as WarningIcon,
} from 'phosphor-solid';

export default function Login() {
  const navigate = useNavigate();
  const auth = useAuth();

  const [username, setUsername] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [showPassword, setShowPassword] = createSignal(false);
  const [loading, setLoading] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setErrorMessage(null);

    const u = username().trim();
    const p = password().trim();

    if (!u || !p) {
      setErrorMessage('Isi semua data');
      return;
    }

    setLoading(true);
    try {
      await auth.login(u, p);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Gagal masuk');
      }
    } finally {
      setLoading(false);
    }
  };

  // Quick preset for field testing (Minimalistic pills)
  const setDemoRole = (role: 'petani' | 'admin') => {
    if (role === 'petani') {
      setUsername('petani');
      setPassword('petani123');
    } else {
      setUsername('admin');
      setPassword('admin123');
    }
    setErrorMessage(null);
  };

  return (
    <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 transition-colors">
      {/* Mobile-first centered container (max-w-sm: 384px) */}
      <div class="w-full max-w-sm">
        {/* App Brand Header */}
        <div class="flex flex-col items-center mb-6">
          <div class="w-full max-w-[270px] p-3 rounded-2xl bg-white dark:bg-white shadow-sm border border-slate-200/80 dark:border-slate-300 flex items-center justify-center">
            <img
              src="/sigapopt.png"
              alt="SIGAP OPT"
              class="w-full h-auto max-h-16 object-contain"
            />
          </div>
        </div>

        {/* Clean Login Card */}
        <Card variant="elevated" class="p-6">
          <form onSubmit={handleSubmit} class="space-y-4">
            {/* Error Message */}
            <Show when={errorMessage()}>
              <div class="font-display flex items-center gap-2 p-3 text-xs font-semibold text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 rounded-xl animate-shake">
                <WarningIcon size={18} weight="fill" class="shrink-0 text-orange-500" />
                <span>{errorMessage()}</span>
              </div>
            </Show>

            {/* Input Username */}
            <div class="space-y-1.5">
              <label for="username" class="font-display block text-xs font-bold text-slate-600 dark:text-slate-400 tracking-wider">
                PENGGUNA
              </label>
              <div class="relative flex items-center">
                <div class="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none">
                  <UserIcon size={20} weight="regular" />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username()}
                  onInput={(e) => setUsername(e.currentTarget.value)}
                  placeholder="ID Petani / Admin"
                  autocomplete="username"
                  class="font-data w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-600/20 transition-all min-h-[48px]"
                  required
                />
              </div>
            </div>

            {/* Input Password */}
            <div class="space-y-1.5">
              <label for="password" class="font-display block text-xs font-bold text-slate-600 dark:text-slate-400 tracking-wider">
                KATA SANDI
              </label>
              <div class="relative flex items-center">
                <div class="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none">
                  <LockIcon size={20} weight="regular" />
                </div>
                <input
                  id="password"
                  type={showPassword() ? 'text' : 'password'}
                  value={password()}
                  onInput={(e) => setPassword(e.currentTarget.value)}
                  placeholder="••••••••"
                  autocomplete="current-password"
                  class="font-data w-full pl-11 pr-11 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-600/20 transition-all min-h-[48px]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword())}
                  class="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  <Show when={showPassword()} fallback={<EyeIcon size={20} weight="regular" />}>
                    <EyeSlashIcon size={20} weight="regular" />
                  </Show>
                </button>
              </div>
            </div>

            {/* Primary Action Button (Oranye CTA) */}
            <div class="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading()}
                class="shadow-brand-orange"
              >
                <SignInIcon size={22} weight="bold" />
                <span>Masuk</span>
              </Button>
            </div>
          </form>

          {/* Quick Field Access Presets (Super Clean Micro-Pills) */}
          <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span class="font-display text-[11px] font-bold text-slate-400 dark:text-slate-500">DEMO ROLE:</span>
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setDemoRole('petani')}
                class="font-display px-2.5 py-1 text-[11px] font-bold rounded-lg bg-violet-50 dark:bg-purple-950/60 text-violet-700 dark:text-purple-300 hover:bg-violet-100 dark:hover:bg-purple-900/60 transition-colors"
              >
                Petani
              </button>
              <button
                type="button"
                onClick={() => setDemoRole('admin')}
                class="font-display px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Admin
              </button>
            </div>
          </div>
        </Card>

        {/* Minimal Footer Stamp */}
        <p class="font-display text-center text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-6">
          v1.0 &middot; PHT Berbasis Ambang Ekonomi
        </p>
      </div>
    </div>
  );
}
