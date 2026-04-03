'use client';

import { useState, useEffect, useCallback } from 'react';

export type FontType = 'sans' | 'serif' | 'mono' | 'google';

export interface FontOption {
  id: string;
  name: string;
  value: string;
  type: FontType;
}

export const DEFAULT_FONTS: FontOption[] = [
  {
    id: 'sans',
    name: 'Sans',
    value: 'var(--font-jakarta), system-ui, -apple-system, sans-serif',
    type: 'sans',
  },
  {
    id: 'serif',
    name: 'Serif',
    value: "Georgia, 'Times New Roman', Times, serif",
    type: 'serif',
  },
  {
    id: 'mono',
    name: 'Mono',
    value: "'Courier New', Courier, 'Lucida Console', monospace",
    type: 'mono',
  },
];

const STORAGE_KEY = 'app-font';

interface StoredFont {
  activeFont: FontOption;
  googleFont: FontOption | null;
}

export function loadGoogleFont(fontName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`link[data-gfont="${fontName}"]`)) {
      resolve();
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@300;400;500;600&display=swap`;
    link.setAttribute('data-gfont', fontName);
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to load font: ${fontName}`));
    document.head.appendChild(link);
  });
}

function readStorage(): StoredFont {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StoredFont;
  } catch { /* ignore */ }
  return { activeFont: DEFAULT_FONTS[0], googleFont: null };
}

export function useFont() {
  const [activeFont, setActiveFontState] = useState<FontOption>(DEFAULT_FONTS[0]);
  const [googleFont, setGoogleFontState] = useState<FontOption | null>(null);

  useEffect(() => {
    const { activeFont: saved, googleFont: savedGoogle } = readStorage();
    const apply = async () => {
      if (saved.type === 'google') {
        try {
          await loadGoogleFont(saved.name);
        } catch {
          return;
        }
      }
      document.documentElement.style.setProperty('--font-app', saved.value);
      setActiveFontState(saved);
      setGoogleFontState(savedGoogle ?? null);
    };
    apply();
  }, []);

  const setFont = useCallback(
    async (font: FontOption) => {
      if (font.type === 'google') {
        await loadGoogleFont(font.name);
      }
      document.documentElement.style.setProperty('--font-app', font.value);
      const newGoogleFont = font.type === 'google' ? font : googleFont;
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ activeFont: font, googleFont: newGoogleFont })
      );
      setActiveFontState(font);
      if (font.type === 'google') setGoogleFontState(font);
    },
    [googleFont]
  );

  return { activeFont, googleFont, setFont };
}
