import { contrast, hslToHex } from '@/lib/color';
import { createId } from '@/lib/id';
import { accentHover, withDerived, type Palette, type PaletteTokens } from '@/lib/themes';

/**
 * Palettes worth keeping, generated.
 *
 * The point is not randomness — random colours are almost always unusable —
 * but a shuffle that stays inside what a working interface needs: one hue for
 * the accent, backgrounds on a ramp tinted very slightly towards it so the app
 * still reads as one surface rather than a stack of grey boxes, and text that
 * is actually legible on them. Legibility is checked rather than hoped for:
 * every generated pair clears WCAG AA for body text.
 */

export { contrast, hslToHex, luminance } from '@/lib/color';
export type { Hsl } from '@/lib/color';

/** WCAG AA for normal text; the strong text aims higher on its own. */
export const AA_CONTRAST = 4.5;

/**
 * Lightness that clears `target` contrast against a background, walking away
 * from it a step at a time.
 *
 * Solving it exactly would mean inverting the luminance curve through the hue;
 * stepping is a couple of dozen cheap operations and cannot produce a colour
 * that fails, which is the property that matters.
 */
function legible(hue: number, saturation: number, from: number, background: string, target: number, direction: 1 | -1): string {
  let lightness = from;
  for (let step = 0; step < 40; step += 1) {
    const hex = hslToHex({ h: hue, s: saturation, l: lightness });
    if (contrast(hex, background) >= target) return hex;
    lightness = Math.min(0.98, Math.max(0.02, lightness + direction * 0.02));
  }
  return hslToHex({ h: hue, s: saturation, l: direction === 1 ? 0.98 : 0.02 });
}

/** One half of a generated palette. */
function half(hue: number, mode: 'dark' | 'light', random: () => number): PaletteTokens {
  const dark = mode === 'dark';
  // A trace of the accent's hue in the greys, which is what stops a generated
  // palette from looking like the default one with a different button.
  const tint = 0.05 + random() * 0.06;
  const base = dark ? 0.07 + random() * 0.03 : 0.93 - random() * 0.03;
  const step = dark ? 1 : -1;
  const grey = (offset: number, saturation = tint) =>
    hslToHex({ h: hue, s: saturation, l: Math.min(0.98, Math.max(0.03, base + step * offset)) });

  const app = grey(0);
  const accentSaturation = 0.5 + random() * 0.32;
  const accent = legible(hue, accentSaturation, dark ? 0.62 : 0.46, app, 3, dark ? 1 : -1);
  const text = legible(hue, 0.08, dark ? 0.85 : 0.2, app, AA_CONTRAST, dark ? 1 : -1);

  return withDerived(
    {
      '--bg-app': app,
      '--bg-sidebar': grey(0.012),
      '--bg-surface': grey(0.042),
      '--bg-raised': grey(0.062),
      '--bg-input': grey(0.03),
      '--bg-code': grey(0.008),
      '--border': grey(0.09, tint * 0.9),
      '--border-strong': grey(0.15, tint * 0.9),
      '--text': text,
      '--text-strong': hslToHex({ h: hue, s: 0.06, l: dark ? 0.96 : 0.08 }),
      '--text-dim': legible(hue, 0.07, dark ? 0.6 : 0.44, app, 3.2, dark ? 1 : -1),
      '--text-faint': legible(hue, 0.07, dark ? 0.44 : 0.58, app, 2.2, dark ? 1 : -1),
      '--accent': accent,
      '--accent-hover': accentHover(accent, mode),
      // White or black on the accent, whichever can actually be read on it.
      '--accent-fg': contrast(accent, '#ffffff') >= contrast(accent, '#111111') ? '#ffffff' : '#111111',
      // Filled in by `withDerived`; the shape needs them present.
      '--bg-hover': 'transparent',
      '--bg-active': 'transparent',
      '--bg-overlay': 'transparent',
      '--accent-soft': 'transparent',
    },
    mode,
  );
}

/** Names, so a generated palette is something you can find again in the list. */
const ADJECTIVES = ['Quiet', 'Deep', 'Soft', 'Bright', 'Faded', 'Dense', 'Clear', 'Low', 'Warm', 'Cool'];
const NOUNS = ['harbour', 'orchard', 'signal', 'meridian', 'lantern', 'thicket', 'current', 'ledger', 'drift', 'alloy'];

/**
 * A whole palette, both halves on the same hue.
 *
 * `random` is injectable so the tests can pin it; nothing else passes one.
 */
export function randomPalette(random: () => number = Math.random): Palette {
  const hue = Math.floor(random() * 360);
  const name = `${ADJECTIVES[Math.floor(random() * ADJECTIVES.length)]} ${NOUNS[Math.floor(random() * NOUNS.length)]}`;
  return {
    id: createId('pal'),
    name,
    note: 'Generated',
    dark: half(hue, 'dark', random),
    light: half(hue, 'light', random),
  };
}
