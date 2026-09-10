import { useEffect } from 'react';
import { fontById, paletteById } from '@/lib/themes';
import type { Settings, ThemeName } from '@/types';

/**
 * Apply the theme to `<html>`.
 *
 * Three things land on the root element and nowhere else: the `data-theme`
 * attribute the stylesheet switches on, the palette's tokens as inline custom
 * properties, and the font theme. Inline properties beat the `:root` rules, so
 * a palette needs no stylesheet of its own — and the default palette sets
 * nothing at all, which is what makes it the default rather than a copy.
 */
export function useTheme(settings: Pick<Settings, 'theme' | 'palette' | 'fontTheme' | 'fontThemes'>): void {
  const { theme, palette: paletteId, fontTheme: fontId } = settings;
  const custom = settings.fontThemes;

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const palette = paletteById(paletteId);
    const font = fontById({ fontThemes: custom }, fontId);

    // Anything this hook set last time, so switching back to Carom does not
    // leave half of Midnight behind.
    const clear = () => {
      for (const name of [...Object.keys(palette.dark ?? {}), ...Object.keys(palette.light ?? {})]) {
        root.style.removeProperty(name);
      }
    };

    const apply = () => {
      const resolved: ThemeName = theme === 'system' ? (media.matches ? 'light' : 'dark') : theme;
      root.dataset.theme = resolved;
      root.style.colorScheme = resolved;

      clear();
      const tokens = resolved === 'light' ? palette.light : palette.dark;
      if (tokens) {
        for (const [name, value] of Object.entries(tokens)) root.style.setProperty(name, value);
      }

      root.style.setProperty('--font-sans', font.sans);
      root.style.setProperty('--font-mono', font.mono);
      // A zoom rather than a font size: every measurement in this app is in
      // pixels, so scaling only the type would leave 13px text in a 28px row.
      root.style.setProperty('zoom', font.scale === 1 ? '' : String(font.scale));
    };

    apply();
    if (theme !== 'system') return clear;
    media.addEventListener('change', apply);
    return () => {
      media.removeEventListener('change', apply);
      clear();
    };
  }, [theme, paletteId, fontId, custom]);
}
