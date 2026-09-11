import type { MessageKey } from '@/locales/en';
import { expandHex, mixHex } from '@/lib/color';
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
  /**
   * Never translated. Carom, Midnight, Ember, Forest and Paper are proper
   * names: a palette that renames itself per language is one you can no longer
   * point a colleague at, and one you made carries the name you typed.
   */
name: string;
  /**
   * For a built-in whose name describes it rather than naming it. Absent on
   * one you made, whose `name` is what you typed.
   */
  nameKey?: MessageKey;
  /** What the dropdown shows under the name, for a palette you made. */
  note?: string;
  /**
   * The same line for a built-in, which — unlike its name — is a description,
   * and so describes itself in whatever language is on screen.
   */
  noteKey?: MessageKey;
  dark: PaletteTokens | null;
  light: PaletteTokens | null;
};

/** The default: whatever `index.css` already says, so it overrides nothing. */
export const DEFAULT_PALETTE = 'carom';

export const PALETTES: Palette[] = [
  { id: DEFAULT_PALETTE, name: 'Carom', noteKey: 'palette.note.carom', dark: null, light: null },
  {
    id: 'midnight',
    name: 'Midnight',
    noteKey: 'palette.note.midnight',
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
    noteKey: 'palette.note.ember',
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
    noteKey: 'palette.note.forest',
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
    noteKey: 'palette.note.paper',
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

/**
 * The id the generated palette always carries while it is being judged.
 *
 * Fixed on purpose: shuffling again overwrites the same record rather than
 * adding another. Sorting through ten of them used to leave ten palettes saved
 * for good, nine of which you had already rejected.
 */
export const DRAFT_PALETTE = 'draft';

/**
 * A palette on trial: generated, applied to the whole app so you can look at
 * it, and kept only if you press Save.
 *
 * `from` is the palette that was selected when the shuffling started, so
 * Discard has somewhere to go back to.
 */
export type DraftPalette = Palette & { from?: string };

/**
 * Built-ins first, then whatever was saved here — same shape as the fonts.
 *
 * The draft is deliberately absent: this is the list of palettes you can
 * *choose*, and a draft is the one being decided about rather than an option
 * alongside the others.
 */
export function allPalettes(settings: Pick<Settings, 'palettes'>): Palette[] {
  return [...PALETTES, ...(settings.palettes ?? [])];
}

export function paletteById(
  settings: Pick<Settings, 'palettes' | 'draftPalette'>,
  id: string | undefined,
): Palette {
  // The draft resolves even though it is not in the list, which is what lets
  // `useTheme` paint the whole app with something that was never saved.
  if (id && settings.draftPalette?.id === id) return settings.draftPalette;
  return allPalettes(settings).find((palette) => palette.id === id) ?? PALETTES[0];
}

export function isBuiltInPalette(id: string): boolean {
  return PALETTES.some((palette) => palette.id === id);
}

/**
 * The tokens a colour picker can edit, in the groups the editor shows.
 *
 * Four of the nineteen are missing, and cannot be added: `--bg-hover`,
 * `--bg-active`, `--bg-overlay` and `--accent-soft` are translucent, and
 * `<input type="color">` has no alpha to give them. They are *derived* instead
 * — see `withDerived` — which is the fix for the complaint that changing a
 * palette only changed part of the screen: they used to be copied from
 * whatever palette was duplicated and then never move again, so every hover,
 * every selected row and every dialog backdrop kept the old colours while the
 * rest of the app changed around them.
 */
export type TokenGroup = {
  /** Stable, and what the test ids are built from, so a translation cannot move them. */
  id: string;
  title: MessageKey;
  /** Why these belong together, in one line. */
  note: MessageKey;
  tokens: Array<{ token: keyof PaletteTokens; label: MessageKey }>;
};

export const TOKEN_GROUPS: TokenGroup[] = [
  {
    id: 'accent',
    title: 'tokens.accent.title',
    note: 'tokens.accent.note',
    tokens: [
      { token: '--accent', label: 'tokens.accent' },
      { token: '--accent-hover', label: 'tokens.accentHover' },
      { token: '--accent-fg', label: 'tokens.accentFg' },
    ],
  },
  {
    id: 'backgrounds',
    title: 'tokens.backgrounds.title',
    note: 'tokens.backgrounds.note',
    tokens: [
      { token: '--bg-app', label: 'tokens.bgApp' },
      { token: '--bg-sidebar', label: 'tokens.bgSidebar' },
      { token: '--bg-surface', label: 'tokens.bgSurface' },
      { token: '--bg-raised', label: 'tokens.bgRaised' },
      { token: '--bg-input', label: 'tokens.bgInput' },
      { token: '--bg-code', label: 'tokens.bgCode' },
    ],
  },
  {
    id: 'text',
    title: 'tokens.text.title',
    note: 'tokens.text.note',
    tokens: [
      { token: '--text', label: 'tokens.text' },
      { token: '--text-strong', label: 'tokens.textStrong' },
      { token: '--text-dim', label: 'tokens.textDim' },
      { token: '--text-faint', label: 'tokens.textFaint' },
    ],
  },
  {
    id: 'lines',
    title: 'tokens.lines.title',
    note: 'tokens.lines.note',
    tokens: [
      { token: '--border', label: 'tokens.border' },
      { token: '--border-strong', label: 'tokens.borderStrong' },
    ],
  },
];

export const EDITABLE_TOKENS: Array<{ token: keyof PaletteTokens; label: MessageKey }> = TOKEN_GROUPS.flatMap(
  (group) => group.tokens,
);

/** The accent at the transparency the app uses for its soft wash. */
export function softAccent(accent: string): string {
  return `color-mix(in srgb, ${accent} 16%, transparent)`;
}

/**
 * A lighter accent in the dark, a darker one in the light — the direction that
 * reads as "raised" against each background.
 */
export function accentHover(accent: string, mode: 'dark' | 'light'): string {
  // A hex, not a `color-mix()`: this token is one a colour picker offers, and
  // `<input type="color">` accepts hexes and nothing else. Deriving it into a
  // notation the picker cannot show would have replaced one silent failure
  // with another.
  return mode === 'dark' ? mixHex(accent, '#ffffff', 0.16) : mixHex(accent, '#000000', 0.14);
}

/**
 * The four translucent tokens, worked out from the solid ones.
 *
 * A hover wash is the text colour at a few per cent, because that is what
 * "slightly lighter than the surface" means on a dark theme and "slightly
 * darker" on a light one — the same rule, in both directions, without the
 * palette having to say which it is. The dialog backdrop is the app background
 * pushed towards black, so a dimmed workspace still looks like this workspace.
 */
export function derivedTokens(tokens: PaletteTokens, mode: 'dark' | 'light'): Partial<PaletteTokens> {
  const ink = tokens['--text'];
  const scrim =
    mode === 'dark'
      ? `color-mix(in srgb, ${tokens['--bg-app']} 42%, #000000)`
      : `color-mix(in srgb, ${tokens['--bg-app']} 22%, #12161f)`;
  return {
    '--bg-hover': `color-mix(in srgb, ${ink} 7%, transparent)`,
    '--bg-active': `color-mix(in srgb, ${ink} 12%, transparent)`,
    '--bg-overlay': `color-mix(in srgb, ${scrim} ${mode === 'dark' ? 68 : 38}%, transparent)`,
    '--accent-soft': softAccent(tokens['--accent']),
  };
}

/** A palette half with its derived tokens brought back in line. */
export function withDerived(tokens: PaletteTokens, mode: 'dark' | 'light'): PaletteTokens {
  return { ...tokens, ...derivedTokens(tokens, mode) };
}

/** Re-exported so the places that read a palette need only one import. */
export { expandHex } from '@/lib/color';

/**
 * The tokens the *stylesheet* defines for a mode, whatever is applied on top.
 *
 * The default palette defines nothing of its own — that is what keeps it in
 * step with the stylesheet — so previewing or duplicating it has to ask the
 * browser what the stylesheet says. Reading the *other* mode means flipping
 * the attribute, reading, and flipping back: `getComputedStyle` forces the
 * recalculation synchronously and no frame is painted in between, so nothing
 * flashes.
 */
export function readTokens(mode: 'dark' | 'light'): PaletteTokens {
  const root = document.documentElement;
  const before = root.dataset.theme;

  /*
    The palette in force sits on the root as inline custom properties, and
    inline beats the stylesheet — so reading with them still in place hands
    back whatever is applied rather than what the app ships with. That is how
    the Carom swatch came to take on the colours of whichever palette had been
    chosen instead of showing its own. They are lifted for the read and put
    straight back; no frame is painted in between, so nothing flashes.

    The callers that duplicate a palette were never wrong, because you can
    only duplicate the selected one and selecting Carom clears the overrides.
    This makes the function mean what its name says either way.
  */
  const applied = TOKEN_NAMES.map((name) => [name, root.style.getPropertyValue(name)] as const);
  for (const [name] of applied) root.style.removeProperty(name);

  root.dataset.theme = mode;
  const style = getComputedStyle(root);
  const tokens = {} as PaletteTokens;
  for (const name of TOKEN_NAMES) tokens[name] = expandHex(style.getPropertyValue(name));

  if (before === undefined) delete root.dataset.theme;
  else root.dataset.theme = before;
  for (const [name, value] of applied) if (value) root.style.setProperty(name, value);
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
export function duplicatePalette(
  palette: Palette,
  mode: 'dark' | 'light',
  /**
   * The name and note the copy is created with, already in the reader's
   * language. They are written into the palette rather than looked up later:
   * from here on they are yours, and a later change of language should not
   * rewrite something you can rename yourself.
   */
  labels: { name: string; note: string },
): Palette {
  const other = mode === 'dark' ? 'light' : 'dark';
  return {
    id: createId('pal'),
    name: labels.name,
    note: labels.note,
    // Derived on the way in as well as on every edit: a copy whose hover wash
    // still belonged to the palette it was copied from was half of why editing
    // colours felt like it only worked in places.
    [mode]: withDerived(palette[mode] ?? readTokens(mode), mode),
    [other]: withDerived(palette[other] ?? readTokens(other), other),
  } as Palette;
}

/**
 * A font theme: two families and a scale.
 *
 * The scale multiplies the type ladder — every `--fs-*` token in the
 * stylesheet — and nothing else. Rows grow along with it, because a row that
 * stayed at 28px would clip 17px text, but the sidebar, the gaps and the
 * window do not: someone asking for bigger text is asking for bigger text.
 */
export type FontTheme = {
  id: string;
  name: string;
  /**
   * For a built-in whose name describes it rather than naming it. Absent on
   * one you made, whose `name` is the words you typed.
   */
  nameKey?: MessageKey;
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
    // Unlike Carom, this name is a description rather than a proper noun, so
    // it is the one built-in font theme that reads in the reader's language.
    name: 'System, larger',
    nameKey: 'font.systemLarge',
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
export function duplicateFont(theme: FontTheme, name: string): FontTheme {
  // `nameKey` is deliberately dropped: the copy is yours, and its name is the
  // words it was created with rather than something that moves with the
  // language later.
  return { ...theme, id: createId('font'), name, nameKey: undefined };
}

export const FONT_SCALES = [0.9, 0.95, 1, 1.05, 1.1, 1.2, 1.3];
