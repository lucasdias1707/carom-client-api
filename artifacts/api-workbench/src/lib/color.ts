/**
 * Colour arithmetic.
 *
 * Kept apart from `themes.ts` so the palette generator and the palette itself
 * can both use it without importing each other.
 */

export type Hsl = { h: number; s: number; l: number };

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

/** The three channels of a `#rgb` or `#rrggbb`, or null for anything else. */
export function channels(value: string): [number, number, number] | null {
  const hex = expandHex(value);
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return null;
  return [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16)) as [number, number, number];
}

function toHex(channel: number): string {
  return Math.round(Math.min(255, Math.max(0, channel))).toString(16).padStart(2, '0');
}

/**
 * `amount` of `over` mixed into `base`, as a hex.
 *
 * A hex rather than a `color-mix()` because the result has to go back into an
 * `<input type="color">`, which understands one notation and only one.
 * Anything that is not a plain hex — a palette token that is already a
 * `color-mix`, say — comes back untouched rather than mangled.
 */
export function mixHex(base: string, over: string, amount: number): string {
  const left = channels(base);
  const right = channels(over);
  if (!left || !right) return base;
  const at = Math.min(1, Math.max(0, amount));
  return `#${left.map((value, index) => toHex(value + (right[index] - value) * at)).join('')}`;
}

/** `#rrggbb` from HSL, with h in degrees and s/l in 0..1. */
export function hslToHex({ h, s, l }: Hsl): string {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const hue = (((h % 360) + 360) % 360) / 60;
  const second = chroma * (1 - Math.abs((hue % 2) - 1));
  const [red, green, blue] =
    hue < 1 ? [chroma, second, 0]
    : hue < 2 ? [second, chroma, 0]
    : hue < 3 ? [0, chroma, second]
    : hue < 4 ? [0, second, chroma]
    : hue < 5 ? [second, 0, chroma]
    : [chroma, 0, second];
  const min = l - chroma / 2;
  return `#${toHex((red + min) * 255)}${toHex((green + min) * 255)}${toHex((blue + min) * 255)}`;
}

/** Relative luminance, per WCAG. */
export function luminance(hex: string): number {
  const rgb = channels(hex) ?? [0, 0, 0];
  const linear = rgb.map((value) => {
    const unit = value / 255;
    return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

/** Contrast ratio between two colours, 1 to 21. */
export function contrast(left: string, right: string): number {
  const a = luminance(left);
  const b = luminance(right);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
