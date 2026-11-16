import { createSignal, createMemo } from 'solid-js';
import { createAvatar } from '@dicebear/core';
import {
  bottts,
  adventurer,
  funEmoji,
  miniavs,
  bigSmile,
  toonHead,
} from '@dicebear/collection';

export const CARTOON_3D_STYLES = [
  { id: 'bottts', name: 'Robot 3D', style: bottts },
  { id: 'adventurer', name: 'Petualang 3D', style: adventurer },
  { id: 'funEmoji', name: 'Emoji 3D', style: funEmoji },
  { id: 'miniavs', name: 'Mini 3D', style: miniavs },
  { id: 'bigSmile', name: 'Karakter Ceria', style: bigSmile },
  { id: 'toonHead', name: 'Kepala Kartun', style: toonHead },
] as const;

export type CartoonStyleId = (typeof CARTOON_3D_STYLES)[number]['id'];

const SEED_STORAGE_KEY = 'sigap_avatar_seed';
const STYLE_STORAGE_KEY = 'sigap_avatar_style';

function getInitialSeed(): string {
  const saved = localStorage.getItem(SEED_STORAGE_KEY);
  if (saved && saved.trim()) return saved;
  return 'sigap_' + Math.random().toString(36).substring(2, 8);
}

function getInitialStyle(): CartoonStyleId {
  const saved = localStorage.getItem(STYLE_STORAGE_KEY) as CartoonStyleId;
  const match = CARTOON_3D_STYLES.find((s) => s.id === saved);
  return match ? match.id : 'bottts';
}

const [currentSeed, setCurrentSeed] = createSignal<string>(getInitialSeed());
const [currentStyle, setCurrentStyle] = createSignal<CartoonStyleId>(getInitialStyle());

export function useAvatar() {
  const avatarUri = createMemo(() => {
    const sId = currentStyle();
    const styleObj = CARTOON_3D_STYLES.find((s) => s.id === sId) || CARTOON_3D_STYLES[0];
    const seed = currentSeed();

    try {
      const avatar = createAvatar(styleObj.style, {
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
    // Generate new random seed
    const newSeed = 'pht_' + Math.random().toString(36).substring(2, 9);
    // Pick a random 3D cartoon style from the library
    const randomStyle =
      CARTOON_3D_STYLES[Math.floor(Math.random() * CARTOON_3D_STYLES.length)].id;

    setCurrentSeed(newSeed);
    setCurrentStyle(randomStyle);

    localStorage.setItem(SEED_STORAGE_KEY, newSeed);
    localStorage.setItem(STYLE_STORAGE_KEY, randomStyle);
  };

  const setStyle = (styleId: CartoonStyleId) => {
    setCurrentStyle(styleId);
    localStorage.setItem(STYLE_STORAGE_KEY, styleId);
  };

  const setSeed = (seed: string) => {
    setCurrentSeed(seed);
    localStorage.setItem(SEED_STORAGE_KEY, seed);
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
