import { createSignal, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { useAuth } from '../services/auth';
import { Button } from '../components/ui/Button';
import { toast } from '../services/toast';
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
      toast.success('Berhasil masuk ke sistem');
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal masuk';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="flex-1 min-h-screen bg-white dark:bg-slate-900 flex flex-col justify-center items-center p-6 transition-colors">
      {/* Mobile-first centered container (max-w-sm: 384px) */}
      <div class="w-full max-w-sm space-y-6">
        {/* App Brand Logo - Naked Logo (Tanpa Elemen Pembungkus Kotak/Border) */}
        <div class="flex justify-center">
          <img
            src="/sigapopt.png"
            alt="SIGAP OPT"
            class="w-auto h-16 max-w-[260px] object-contain"
          />
        </div>

        {/* Naked Login Form (Tanpa Elemen Pembungkus Card) */}
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
      </div>
    </div>
  );
}
