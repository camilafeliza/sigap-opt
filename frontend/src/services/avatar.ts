import { createSignal, createMemo, createEffect } from 'solid-js';
import { createAvatar } from '@dicebear/core';
import {
  bottts,
  adventurer,
  funEmoji,
  miniavs,
  bigSmile,
  toonHead,
} from '@dicebear/collection';
import { useAuth } from './auth';

export const CARTOON_3D_STYLES = [
  { id: 'bottts', name: 'Robot 3D', style: bottts },
  { id: 'adventurer', name: 'Petualang 3D', style: adventurer },
  { id: 'funEmoji', name: 'Emoji 3D', style: funEmoji },
  { id: 'miniavs', name: 'Mini 3D', style: miniavs },
  { id: 'bigSmile', name: 'Karakter Ceria', style: bigSmile },
  { id: 'toonHead', name: 'Kepala Kartun', style: toonHead },
] as const;

export type CartoonStyleId = (typeof CARTOON_3D_STYLES)[number]['id'];

export function getUserAvatarKey(baseKey: string, userId?: string | null): string {
  if (userId) {
    return `sigap_user_${userId}_avatar_${baseKey}`;
  }
  return `sigap_guest_avatar_${baseKey}`;
}

const auth = useAuth();

function getInitialUserSeed(userId?: string | null, username?: string): string {
  const key = getUserAvatarKey('seed', userId);
  const saved = localStorage.getItem(key);
  if (saved && saved.trim()) return saved;
  // Deterministic seed based on username or role
  if (username) return `sigap_${username}`;
  return 'sigap_guest';
}

function getInitialUserStyle(userId?: string | null, role?: string): CartoonStyleId {
  const key = getUserAvatarKey('style', userId);
  const saved = localStorage.getItem(key) as CartoonStyleId;
  const match = CARTOON_3D_STYLES.find((s) => s.id === saved);
  if (match) return match.id;
  // Superadmin defaults to 'bottts', petani to 'adventurer'
  return role === 'superadmin' ? 'bottts' : 'adventurer';
}

const [currentSeed, setCurrentSeed] = createSignal<string>(
  getInitialUserSeed(auth.currentUser()?.id, auth.currentUser()?.username)
);
const [currentStyle, setCurrentStyle] = createSignal<CartoonStyleId>(
  getInitialUserStyle(auth.currentUser()?.id, auth.currentUser()?.role)
);

// Reactive lifecycle: Rehydrate avatar whenever active user session changes
createEffect(() => {
  const user = auth.currentUser();
  const userId = user?.id;
  const username = user?.username;
  const role = user?.role;

  // Clean legacy unscoped keys if present
  try {
    localStorage.removeItem('sigap_avatar_seed');
    localStorage.removeItem('sigap_avatar_style');
  } catch (_) {}

  const seed = getInitialUserSeed(userId, username);
  const style = getInitialUserStyle(userId, role);

  setCurrentSeed(seed);
  setCurrentStyle(style);
});

export function useAvatar() {
  const avatarUri = createMemo(() => {
    const sId = currentStyle();
    const styleObj = CARTOON_3D_STYLES.find((s) => s.id === sId) || CARTOON_3D_STYLES[0];
    const seed = currentSeed();

    try {
      const avatar = createAvatar(styleObj.style as any, {
        seed,
        radius: 50,
      });
      return avatar.toDataUri();
    } catch {
      // Fallback
      return `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(seed)}`;
    }
  });

  const randomize = () => {
    const userId = auth.currentUser()?.id;
    const newSeed = 'pht_' + Math.random().toString(36).substring(2, 9);
    const randomStyle =
      CARTOON_3D_STYLES[Math.floor(Math.random() * CARTOON_3D_STYLES.length)].id;

    setCurrentSeed(newSeed);
    setCurrentStyle(randomStyle);

    localStorage.setItem(getUserAvatarKey('seed', userId), newSeed);
    localStorage.setItem(getUserAvatarKey('style', userId), randomStyle);
  };

  const setStyle = (styleId: CartoonStyleId) => {
    const userId = auth.currentUser()?.id;
    setCurrentStyle(styleId);
    localStorage.setItem(getUserAvatarKey('style', userId), styleId);
  };

  const setSeed = (seed: string) => {
    const userId = auth.currentUser()?.id;
    setCurrentSeed(seed);
    localStorage.setItem(getUserAvatarKey('seed', userId), seed);
  };

  return {
    seed: currentSeed,
    style: currentStyle,
    avatarUri,
    randomize,
    setStyle,
    setSeed,
  };
}
