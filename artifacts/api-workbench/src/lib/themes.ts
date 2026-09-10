import { createId } from '@/lib/id';
import type { Settings } from '@/types';

/**
 * Colour palettes and font themes.
 *
 * The app's colours have always come from a set of custom properties in
 * `index.css`, and every component — the app's own and shadcn's, whose
 * `--primary` and `--accent` point at these — reads them rather than naming a
 * colour. So a palette is nothing but a different set of values for the same
 * names, applied to the root element; nothing else has to know.
 *
 * That is also why the JSON and XML colours are not listed here: they are
 * their own setting, edited in the same screen, and a palette that quietly
 * rewrote them would throw away a choice someone made on purpose.
 */

export type PaletteTokens = {
  '--bg-app': string;
  '--bg-sidebar': string;
  '--bg-surface': string;
  '--bg-raised': string;
  '--bg-input': string;
  '--bg-hover': string;
  '--bg-active': string;
  '--bg-overlay': string;
  '--bg-code': string;
  '--border': string;
  '--border-strong': string;
  '--text': string;
  '--text-strong': string;
  '--text-dim': string;
  '--text-faint': string;
  '--accent': string;
  '--accent-hover': string;
  '--accent-fg': string;
  '--accent-soft': string;
};

export type Palette = {
  id: string;
  name: string;
  /** A one-line description, and what the dropdown shows under the name. */
  note: string;
  dark: PaletteTokens | null;
  light: PaletteTokens | null;
};

/** The default: whatever `index.css` already says, so it overrides nothing. */
export const DEFAULT_PALETTE = 'carom';

export const PALETTES: Palette[] = [
  { id: DEFAULT_PALETTE, name: 'Carom', note: 'The blue one this app ships with', dark: null, light: null },
  {
    id: 'midnight',
    name: 'Midnight',
    note: 'Cooler, deeper, with an indigo accent',
    dark: {
      '--bg-app': '#0f1117',
      '--bg-sidebar': '#12141c',
      '--bg-surface': '#171a23',
      '--bg-raised': '#1d212c',
      '--bg-input': '#191d26',
      '--bg-hover': 'rgba(150, 170, 255, 0.07)',
      '--bg-active': 'rgba(150, 170, 255, 0.12)',
      '--bg-overlay': 'rgba(5, 6, 12, 0.7)',
      '--bg-code': '#12151d',
      '--border': '#242936',
      '--border-strong': '#333a4c',
      '--text': '#d7dbe8',
      '--text-strong': '#f0f2f9',
      '--text-dim': '#868ea3',
      '--text-faint': '#5c6377',
      '--accent': '#7c6cf0',
      '--accent-hover': '#8f81f5',
      '--accent-fg': '#ffffff',
      '--accent-soft': 'rgba(124, 108, 240, 0.18)',
    },
    light: {
      '--bg-app': '#eceef5',
      '--bg-sidebar': '#f3f4f9',
      '--bg-surface': '#ffffff',
      '--bg-raised': '#f0f1f8',
      '--bg-input': '#ffffff',
      '--bg-hover': 'rgba(60, 60, 130, 0.05)',
      '--bg-active': 'rgba(60, 60, 130, 0.1)',
      '--bg-overlay': 'rgba(24, 26, 48, 0.35)',
      '--bg-code': '#f6f7fc',
      '--border': '#dcdeeb',
      '--border-strong': '#c1c5db',
      '--text': '#252838',
      '--text-strong': '#0f1120',
      '--text-dim': '#61667f',
      '--text-faint': '#8b90a8',
      '--accent': '#5546cf',
      '--accent-hover': '#4638b6',
      '--accent-fg': '#ffffff',
      '--accent-soft': 'rgba(85, 70, 207, 0.12)',
    },
  },
  {
    id: 'ember',
    name: 'Ember',
    note: 'Warm greys, amber accent',
    dark: {
      '--bg-app': '#17150f',
      '--bg-sidebar': '#1a1811',
      '--bg-surface': '#201d15',
      '--bg-raised': '#28241a',
      '--bg-input': '#231f17',
      '--bg-hover': 'rgba(255, 226, 180, 0.06)',
      '--bg-active': 'rgba(255, 226, 180, 0.1)',
      '--bg-overlay': 'rgba(12, 10, 6, 0.68)',
      '--bg-code': '#1a1811',
      '--border': '#312c20',
      '--border-strong': '#453d2c',
      '--text': '#e6dfd1',
      '--text-strong': '#faf5eb',
      '--text-dim': '#9b9283',
      '--text-faint': '#6d665a',
      '--accent': '#e0913f',
      '--accent-hover': '#eda254',
      '--accent-fg': '#1a1105',
      '--accent-soft': 'rgba(224, 145, 63, 0.18)',
    },
    light: {
      '--bg-app': '#f4f0e8',
      '--bg-sidebar': '#faf7f0',
      '--bg-surface': '#ffffff',
      '--bg-raised': '#f6f2ea',
      '--bg-input': '#ffffff',
      '--bg-hover': 'rgba(70, 50, 20, 0.05)',
      '--bg-active': 'rgba(70, 50, 20, 0.09)',
      '--bg-overlay': 'rgba(40, 32, 20, 0.32)',
      '--bg-code': '#faf7f1',
      '--border': '#e3ddd0',
      '--border-strong': '#cbc2b0',
      '--text': '#332d22',
      '--text-strong': '#1b1710',
      '--text-dim': '#6d6455',
      '--text-faint': '#968c7b',
      '--accent': '#b3641a',
      '--accent-hover': '#985316',
      '--accent-fg': '#ffffff',
      '--accent-soft': 'rgba(179, 100, 26, 0.13)',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    note: 'Green accent, quieter contrast',
    dark: {
      '--bg-app': '#101613',
      '--bg-sidebar': '#131a16',
      '--bg-surface': '#18201b',
      '--bg-raised': '#1e2822',
      '--bg-input': '#1a231d',
      '--bg-hover': 'rgba(180, 255, 210, 0.06)',
      '--bg-active': 'rgba(180, 255, 210, 0.1)',
      '--bg-overlay': 'rgba(6, 12, 9, 0.68)',
      '--bg-code': '#131a16',
      '--border': '#243029',
      '--border-strong': '#33443a',
      '--text': '#d6e0d9',
      '--text-strong': '#eef5f0',
      '--text-dim': '#87958c',
      '--text-faint': '#5d6a62',
      '--accent': '#48a86f',
      '--accent-hover': '#57bc7f',
      '--accent-fg': '#04160b',
      '--accent-soft': 'rgba(72, 168, 111, 0.17)',
    },
    light: {
      '--bg-app': '#eaf0ec',
      '--bg-sidebar': '#f2f6f3',
      '--bg-surface': '#ffffff',
      '--bg-raised': '#eff4f0',
      '--bg-input': '#ffffff',
      '--bg-hover': 'rgba(20, 60, 40, 0.05)',
      '--bg-active': 'rgba(20, 60, 40, 0.09)',
      '--bg-overlay': 'rgba(18, 38, 28, 0.33)',
      '--bg-code': '#f4f8f5',
      '--border': '#d9e2dc',
      '--border-strong': '#bcc9c1',
      '--text': '#22302a',
      '--text-strong': '#0d1a14',
      '--text-dim': '#5c6b63',
      '--text-faint': '#87958c',
      '--accent': '#207d4c',
      '--accent-hover': '#1a6a40',
      '--accent-fg': '#ffffff',
      '--accent-soft': 'rgba(32, 125, 76, 0.12)',
    },
  },
  {
    id: 'paper',
    name: 'Paper',
    note: 'Nearly monochrome, for reading',
    dark: {
      '--bg-app': '#151515',
      '--bg-sidebar': '#181818',
      '--bg-surface': '#1d1d1d',
      '--bg-raised': '#242424',
      '--bg-input': '#202020',
      '--bg-hover': 'rgba(255, 255, 255, 0.05)',
      '--bg-active': 'rgba(255, 255, 255, 0.09)',
      '--bg-overlay': 'rgba(0, 0, 0, 0.66)',
      '--bg-code': '#181818',
      '--border': '#2c2c2c',
      '--border-strong': '#3d3d3d',
      '--text': '#dedede',
      '--text-strong': '#f6f6f6',
      '--text-dim': '#8e8e8e',
      '--text-faint': '#646464',
      '--accent': '#c8c8c8',
      '--accent-hover': '#dcdcdc',
      '--accent-fg': '#141414',
      '--accent-soft': 'rgba(200, 200, 200, 0.14)',
    },
    light: {
      '--bg-app': '#f2f1ee',
      '--bg-sidebar': '#f7f6f3',
      '--bg-surface': '#fffffd',
      '--bg-raised': '#f3f2ef',
      '--bg-input': '#fffffd',
      '--bg-hover': 'rgba(0, 0, 0, 0.045)',
      '--bg-active': 'rgba(0, 0, 0, 0.085)',
      '--bg-overlay': 'rgba(30, 30, 28, 0.32)',
      '--bg-code': '#f7f6f3',
      '--border': '#e0dfdb',
      '--border-strong': '#c6c5c0',
      '--text': '#2b2a27',
      '--text-strong': '#131311',
      '--text-dim': '#66655f',
      '--text-faint': '#918f88',
      '--accent': '#3f3e3a',
      '--accent-hover': '#2b2a27',
      '--accent-fg': '#fffffd',
      '--accent-soft': 'rgba(63, 62, 58, 0.1)',
    },
  },
];

/** Built-ins first, then whatever was saved here — same shape as the fonts. */
export function allPalettes(settings: Pick<Settings, 'palettes'>): Palette[] {
  return [...PALETTES, ...(settings.palettes ?? [])];
}

export function paletteById(settings: Pick<Settings, 'palettes'>, id: string | undefined): Palette {
  return allPalettes(settings).find((palette) => palette.id === id) ?? PALETTES[0];
}

export function isBuiltInPalette(id: string): boolean {
  return PALETTES.some((palette) => palette.id === id);
}

/**
 * The tokens a colour picker can edit.
 *
 * Four of the nineteen are deliberately missing: `--bg-hover`, `--bg-active`
 * and `--bg-overlay` are translucent, and `<input type="color">` has no alpha
 * to give them — a picker that silently drops the transparency would turn
 * every hover into a solid block. They ride along from the palette that was
 * duplicated. `--accent-soft` is missing for the same reason and then handed
 * back: it is the accent at 16%, so it is derived whenever the accent changes.
 */
export const EDITABLE_TOKENS: Array<{ token: keyof PaletteTokens; label: string }> = [
  { token: '--accent', label: 'Accent' },
  { token: '--accent-hover', label: 'Accent, hovered' },
  { token: '--accent-fg', label: 'Text on the accent' },
  { token: '--bg-app', label: 'App background' },
  { token: '--bg-sidebar', label: 'Sidebar' },
  { token: '--bg-surface', label: 'Dialogs' },
  { token: '--bg-raised', label: 'Raised panels' },
  { token: '--bg-input', label: 'Inputs' },
  { token: '--bg-code', label: 'Code blocks' },
  { token: '--border', label: 'Borders' },
  { token: '--border-strong', label: 'Borders, stronger' },
  { token: '--text', label: 'Text' },
  { token: '--text-strong', label: 'Text, strong' },
  { token: '--text-dim', label: 'Text, dim' },
  { token: '--text-faint', label: 'Text, faint' },
];

/** The accent at the transparency the app uses for its soft wash. */
export function softAccent(accent: string): string {
  return `color-mix(in srgb, ${accent} 16%, transparent)`;
}

/**
 * `#fff` as `#ffffff`, and anything else left alone.
 *
 * The minifier shortens `#ffffff` in the stylesheet, and `getComputedStyle`
 * hands back the declared text rather than a normalised colour — so reading
 * the built-in light palette produced three-digit hexes, which
 * `<input type="color">` refuses outright with a console warning and an empty
 * swatch. Expanding them at the point of reading keeps stored palettes uniform.
 */
export function expandHex(value: string): string {
  const short = value.trim().match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  return short ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}` : value.trim();
}

/**
 * The tokens actually in force for a mode, read off the document.
 *
 * The default palette defines nothing of its own — that is what keeps it in
 * step with the stylesheet — so duplicating it has to ask the browser what the
 * stylesheet says. Reading the *other* mode means flipping the attribute,
 * reading, and flipping back: `getComputedStyle` forces the recalculation
 * synchronously and no frame is painted in between, so nothing flashes.
 */
export function readTokens(mode: 'dark' | 'light'): PaletteTokens {
  const root = document.documentElement;
  const before = root.dataset.theme;
  root.dataset.theme = mode;
  const style = getComputedStyle(root);
  const tokens = {} as PaletteTokens;
  for (const name of TOKEN_NAMES) tokens[name] = expandHex(style.getPropertyValue(name));
  if (before === undefined) delete root.dataset.theme;
  else root.dataset.theme = before;
  return tokens;
}

const TOKEN_NAMES: Array<keyof PaletteTokens> = [
  '--bg-app', '--bg-sidebar', '--bg-surface', '--bg-raised', '--bg-input',
  '--bg-hover', '--bg-active', '--bg-overlay', '--bg-code',
  '--border', '--border-strong',
  '--text', '--text-strong', '--text-dim', '--text-faint',
  '--accent', '--accent-hover', '--accent-fg', '--accent-soft',
];

/**
 * A copy of a palette, with both halves filled in.
 *
 * A palette that only had the half you were looking at would break the moment
 * you switched to light, so the half you are not editing is taken from the
 * source — or read from the stylesheet when the source is the default, which
 * carries no tokens of its own.
 */
export function duplicatePalette(palette: Palette, mode: 'dark' | 'light'): Palette {
  const other = mode === 'dark' ? 'light' : 'dark';
  return {
    id: createId('pal'),
    name: `${palette.name} copy`,
    note: 'Yours',
    [mode]: palette[mode] ?? readTokens(mode),
    [other]: palette[other] ?? readTokens(other),
  } as Palette;
}

/**
 * A font theme: two families and a scale.
 *
 * The scale is applied as a zoom on the root element rather than as a font
 * size, and that is deliberate. Every measurement in this app is in pixels —
 * row heights, the sidebar, the gaps — so raising only the type would leave
 * 13px text in a 28px row. Someone who says the text is too small means the
 * interface is too small.
 */
export type FontTheme = {
  id: string;
  name: string;
  sans: string;
  mono: string;
  /** 1 is what the app was drawn at. */
  scale: number;
};

export const DEFAULT_FONT = 'carom';

export const BUILT_IN_FONTS: FontTheme[] = [
  {
    id: DEFAULT_FONT,
    name: 'Carom',
    sans: "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', ui-monospace, 'SFMono-Regular', 'Menlo', monospace",
    scale: 1,
  },
  {
    // The example to copy: it changes all three things a font theme can
    // change, so duplicating it shows what each field does.
    id: 'system-large',
    name: 'System, larger',
    sans: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    mono: "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace",
    scale: 1.1,
  },
];

/** Built-ins first, then whatever was saved here. */
export function fontThemes(settings: Pick<Settings, 'fontThemes'>): FontTheme[] {
  return [...BUILT_IN_FONTS, ...(settings.fontThemes ?? [])];
}

export function fontById(settings: Pick<Settings, 'fontThemes'>, id: string | undefined): FontTheme {
  return fontThemes(settings).find((theme) => theme.id === id) ?? BUILT_IN_FONTS[0];
}

export function isBuiltInFont(id: string): boolean {
  return BUILT_IN_FONTS.some((theme) => theme.id === id);
}

/** A copy under a new id, which is how a new one is always made. */
export function duplicateFont(theme: FontTheme): FontTheme {
  return { ...theme, id: createId('font'), name: `${theme.name} copy` };
}

export const FONT_SCALES = [0.9, 0.95, 1, 1.05, 1.1, 1.2, 1.3];
