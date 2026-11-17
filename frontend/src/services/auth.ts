import { createSignal } from 'solid-js';
import type { User, UserRole, AuthResponse } from '../types';

const TOKEN_KEY = 'sigap_opt_jwt';
const USER_KEY = 'sigap_opt_user';

// Reactive auth state
const [currentUser, setCurrentUser] = createSignal<User | null>(loadInitialUser());
const [token, setToken] = createSignal<string | null>(localStorage.getItem(TOKEN_KEY));

function loadInitialUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const isAuthenticated = () => !!token() && !!currentUser();
  const role = (): UserRole | null => currentUser()?.role ?? null;
  const isSuperAdmin = () => role() === 'superadmin';
  const isPetani = () => role() === 'petani';

  const setAuthSession = (auth: AuthResponse) => {
    localStorage.setItem(TOKEN_KEY, auth.token);
    localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
    setToken(auth.token);
    setCurrentUser(auth.user);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setCurrentUser(null);
  };

  const login = async (username: string, password: string): Promise<AuthResponse> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Kredensial tidak valid');
    }

    const data: AuthResponse = await res.json();
    setAuthSession(data);
    return data;
  };

  return {
    currentUser,
    token,
    isAuthenticated,
    role,
    isSuperAdmin,
    isPetani,
    login,
    logout,
  };
}
