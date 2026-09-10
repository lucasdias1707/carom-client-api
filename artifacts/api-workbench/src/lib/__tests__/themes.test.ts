import { describe, expect, it } from 'vitest';
import { luminance } from '@/lib/color';
import {
  BUILT_IN_FONTS,
  DEFAULT_FONT,
  DEFAULT_PALETTE,
  EDITABLE_TOKENS,
  PALETTES,
  accentHover,
  allPalettes,
  derivedTokens,
  expandHex,
  isBuiltInPalette,
  softAccent,
  duplicateFont,
  fontById,
  fontThemes,
  isBuiltInFont,
  paletteById,
  withDerived,
  type PaletteTokens,
} from '@/lib/themes';

describe('palettes', () => {
  it('leaves the default without tokens, so it overrides nothing', () => {
    // That is what makes it the default rather than a copy of the stylesheet
    // that would then have to be kept in step with it.
    const carom = paletteById(DEFAULT_PALETTE);
    expect(carom.dark).toBeNull();
    expect(carom.light).toBeNull();
  });

  it('gives every other palette both halves, with the same token names', () => {
    const names = Object.keys(PALETTES[1].dark ?? {}).sort();
    expect(names.length).toBeGreaterThan(10);
    for (const palette of PALETTES.slice(1)) {
      expect(Object.keys(palette.dark ?? {}).sort()).toEqual(names);
      expect(Object.keys(palette.light ?? {}).sort()).toEqual(names);
    }
  });

  it('falls back to the default rather than to nothing', () => {
    expect(paletteById({}, 'deleted-in-a-later-version').id).toBe(DEFAULT_PALETTE);
    expect(paletteById({}, undefined).id).toBe(DEFAULT_PALETTE);
  });

  it('lists a saved palette after the built-ins, and finds it', () => {
    const mine = { id: 'p1', name: 'Mine', note: 'Yours', dark: null, light: null };
    expect(allPalettes({ palettes: [mine] }).at(-1)?.id).toBe('p1');
    expect(paletteById({ palettes: [mine] }, 'p1').name).toBe('Mine');
    expect(isBuiltInPalette('p1')).toBe(false);
    expect(isBuiltInPalette(DEFAULT_PALETTE)).toBe(true);
  });

  it('derives the soft wash from the accent, so a selected row follows it', () => {
    expect(softAccent('#ff0000')).toBe('color-mix(in srgb, #ff0000 16%, transparent)');
  });

  it('offers a picker only for the tokens a picker can express', () => {
    // The translucent ones have alpha and `<input type="color">` has none;
    // silently dropping it would turn every hover into a solid block.
    const editable = EDITABLE_TOKENS.map((entry) => entry.token);
    expect(editable).not.toContain('--bg-hover');
    expect(editable).not.toContain('--bg-active');
    expect(editable).not.toContain('--bg-overlay');
    expect(editable).not.toContain('--accent-soft');
    expect(editable).toContain('--accent');
    for (const token of editable) {
      expect(PALETTES[1].dark?.[token]).toMatch(/^#/);
    }
  });
});

describe('derived tokens', () => {
  const solid = {
    ...(PALETTES[1].dark as PaletteTokens),
    '--bg-app': '#101010',
    '--text': '#eeeeee',
    '--accent': '#ff0000',
  };

  it('works the see-through tokens out of the solid ones', () => {
    const derived = derivedTokens(solid, 'dark');
    expect(derived['--bg-hover']).toContain('#eeeeee');
    expect(derived['--bg-active']).toContain('#eeeeee');
    expect(derived['--bg-overlay']).toContain('#101010');
    expect(derived['--accent-soft']).toContain('#ff0000');
  });

  it('moves them when the colours they come from move', () => {
    // The bug this exists for: they used to be copied once and then stay put,
    // so a new background left every hover and every backdrop behind.
    const before = withDerived(solid, 'dark');
    const after = withDerived({ ...solid, '--text': '#00ff00', '--bg-app': '#202020' }, 'dark');
    expect(after['--bg-hover']).not.toBe(before['--bg-hover']);
    expect(after['--bg-overlay']).not.toBe(before['--bg-overlay']);
  });

  it('keeps the solid tokens exactly as they were', () => {
    const result = withDerived(solid, 'dark');
    expect(result['--accent']).toBe('#ff0000');
    expect(result['--bg-app']).toBe('#101010');
  });

  it('gives the accent a hover a picker can still show', () => {
    // A `color-mix()` here would be a colour the editor cannot display, which
    // is how this token became unusable in the first place.
    expect(accentHover('#5b83f5', 'dark')).toMatch(/^#[0-9a-f]{6}$/);
    expect(accentHover('#5b83f5', 'light')).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('lightens in the dark and darkens in the light', () => {
    expect(luminance(accentHover('#5b83f5', 'dark'))).toBeGreaterThan(luminance('#5b83f5'));
    expect(luminance(accentHover('#5b83f5', 'light'))).toBeLessThan(luminance('#5b83f5'));
  });
});

describe('font themes', () => {
  it('lists the built-ins ahead of what someone saved', () => {
    const mine = { id: 'f1', name: 'Mine', sans: 'X', mono: 'Y', scale: 1 };
    expect(fontThemes({ fontThemes: [mine] }).map((theme) => theme.id)).toEqual([
      ...BUILT_IN_FONTS.map((theme) => theme.id),
      'f1',
    ]);
  });

  it('does not store the built-ins, and still finds them', () => {
    expect(fontById({}, 'system-large').name).toBe('System, larger');
    expect(fontById({}, undefined).id).toBe(DEFAULT_FONT);
    expect(fontById({}, 'gone').id).toBe(DEFAULT_FONT);
  });

  it('copies under a new id, so editing the copy cannot touch the original', () => {
    const copy = duplicateFont(BUILT_IN_FONTS[1]);
    expect(copy.id).not.toBe(BUILT_IN_FONTS[1].id);
    expect(copy.sans).toBe(BUILT_IN_FONTS[1].sans);
    expect(copy.name).toMatch(/copy$/);
    expect(isBuiltInFont(copy.id)).toBe(false);
    expect(isBuiltInFont(DEFAULT_FONT)).toBe(true);
  });

  it('ships one example that differs in every field there is to edit', () => {
    const [base, example] = BUILT_IN_FONTS;
    expect(example.sans).not.toBe(base.sans);
    expect(example.mono).not.toBe(base.mono);
    expect(example.scale).not.toBe(base.scale);
  });
});

describe('expandHex', () => {
  it('expands the short form a colour input refuses', () => {
    // The minifier turns `#ffffff` into `#fff` in the stylesheet, and reading
    // a computed custom property hands back that text verbatim.
    expect(expandHex('#fff')).toBe('#ffffff');
    expect(expandHex(' #0a0 ')).toBe('#00aa00');
  });

  it('leaves anything it does not recognise alone', () => {
    expect(expandHex('#1b1e24')).toBe('#1b1e24');
    expect(expandHex('rgba(255, 255, 255, 0.09)')).toBe('rgba(255, 255, 255, 0.09)');
  });
});
