import { describe, expect, it } from 'vitest';
import { AA_CONTRAST, contrast, hslToHex, luminance, randomPalette } from '@/lib/palette-random';
import { EDITABLE_TOKENS } from '@/lib/themes';

/** A deterministic stand-in for Math.random, so a failure can be reproduced. */
function seeded(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

describe('colour arithmetic', () => {
  it('converts the corners of the HSL space', () => {
    expect(hslToHex({ h: 0, s: 0, l: 0 })).toBe('#000000');
    expect(hslToHex({ h: 0, s: 0, l: 1 })).toBe('#ffffff');
    expect(hslToHex({ h: 0, s: 1, l: 0.5 })).toBe('#ff0000');
    expect(hslToHex({ h: 120, s: 1, l: 0.5 })).toBe('#00ff00');
    expect(hslToHex({ h: 240, s: 1, l: 0.5 })).toBe('#0000ff');
  });

  it('agrees with the WCAG reference points', () => {
    expect(luminance('#ffffff')).toBeCloseTo(1, 5);
    expect(luminance('#000000')).toBeCloseTo(0, 5);
    expect(contrast('#ffffff', '#000000')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#777777')).toBeCloseTo(1, 5);
  });
});

describe('randomPalette', () => {
  const draws = Array.from({ length: 200 }, (_, index) => randomPalette(seeded(index + 1)));

  it('always produces text you can read on the background', () => {
    for (const palette of draws) {
      for (const mode of ['dark', 'light'] as const) {
        const tokens = palette[mode]!;
        expect(contrast(tokens['--text'], tokens['--bg-app'])).toBeGreaterThanOrEqual(AA_CONTRAST);
        expect(contrast(tokens['--text-strong'], tokens['--bg-app'])).toBeGreaterThanOrEqual(AA_CONTRAST);
      }
    }
  });

  it('always produces an accent that stands out, and a label you can read on it', () => {
    for (const palette of draws) {
      for (const mode of ['dark', 'light'] as const) {
        const tokens = palette[mode]!;
        expect(contrast(tokens['--accent'], tokens['--bg-app'])).toBeGreaterThanOrEqual(3);
        expect(contrast(tokens['--accent-fg'], tokens['--accent'])).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('keeps dark dark and light light', () => {
    for (const palette of draws) {
      expect(luminance(palette.dark!['--bg-app'])).toBeLessThan(0.1);
      expect(luminance(palette.light!['--bg-app'])).toBeGreaterThan(0.6);
    }
  });

  it('fills in every token, both halves, with nothing left as a placeholder', () => {
    const palette = randomPalette(seeded(7));
    for (const mode of ['dark', 'light'] as const) {
      const tokens = palette[mode]!;
      for (const { token } of EDITABLE_TOKENS) expect(tokens[token]).toMatch(/^#[0-9a-f]{6}$|^color-mix/);
      for (const token of ['--bg-hover', '--bg-active', '--bg-overlay', '--accent-soft'] as const) {
        expect(tokens[token]).toContain('color-mix');
      }
    }
  });

  it('gives each draw its own id, so saving two does not overwrite one', () => {
    expect(new Set(draws.map((palette) => palette.id)).size).toBe(draws.length);
  });
});
