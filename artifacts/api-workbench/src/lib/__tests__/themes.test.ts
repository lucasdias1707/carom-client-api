import { describe, expect, it } from 'vitest';
import {
  BUILT_IN_FONTS,
  DEFAULT_FONT,
  DEFAULT_PALETTE,
  PALETTES,
  duplicateFont,
  fontById,
  fontThemes,
  isBuiltInFont,
  paletteById,
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
    expect(paletteById('deleted-in-a-later-version').id).toBe(DEFAULT_PALETTE);
    expect(paletteById(undefined).id).toBe(DEFAULT_PALETTE);
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
