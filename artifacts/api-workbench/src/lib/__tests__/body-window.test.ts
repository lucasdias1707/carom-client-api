import { describe, expect, it } from 'vitest';
import { FIRST_WINDOW, NEXT_WINDOW, windowOf } from '@/lib/body-window';

describe('windowOf', () => {
  it('hands back a body that fits, untouched', () => {
    expect(windowOf('short', 100)).toBe('short');
    expect(windowOf('x'.repeat(100), 100)).toHaveLength(100);
  });

  it('cuts a minified body, which has no line to end on, exactly where asked', () => {
    const body = JSON.stringify(Array.from({ length: 5000 }, (_, id) => ({ id })));
    expect(body).not.toContain('\n');
    expect(windowOf(body, 1000)).toBe(body.slice(0, 1000));
  });

  it('ends a formatted body on a line break when one is close, rather than mid-line', () => {
    const body = `${'a'.repeat(95)}\n${'b'.repeat(50)}\n${'c'.repeat(50)}`;
    // 100 falls inside the second line, whose break is 46 characters on: the cut moves there.
    expect(windowOf(body, 100)).toBe(`${'a'.repeat(95)}\n${'b'.repeat(50)}`);
  });

  it('does not go looking far for a line break', () => {
    const body = `${'a'.repeat(1000)}\n${'b'.repeat(1000)}`;
    expect(windowOf(body, 500)).toHaveLength(500);
  });

  it('never ends between the two halves of a surrogate pair', () => {
    // 😀 is two code units; cutting after the first would draw a replacement character.
    const body = `${'a'.repeat(9)}😀${'b'.repeat(20)}`;
    expect(windowOf(body, 10)).toBe('a'.repeat(9));
    expect(windowOf(body, 11)).toBe(`${'a'.repeat(9)}😀`);
  });

  it('is cheap enough to ask for on every render of a body this size', () => {
    const body = 'x'.repeat(30_000_000);
    const started = performance.now();
    windowOf(body, FIRST_WINDOW);
    expect(performance.now() - started).toBeLessThan(50);
  });

  it('keeps the first window small enough to draw at once and the step well past it', () => {
    expect(FIRST_WINDOW).toBeLessThanOrEqual(1_000_000);
    expect(NEXT_WINDOW).toBeGreaterThan(FIRST_WINDOW);
  });
});
