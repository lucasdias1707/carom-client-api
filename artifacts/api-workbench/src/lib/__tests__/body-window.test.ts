import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE, FIRST_WINDOW, NEXT_WINDOW, chunksOf, estimateLines, windowOf } from '@/lib/body-window';

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

describe('chunksOf', () => {
  it('gives back exactly the text, in order, whatever it is cut at', () => {
    const formatted = JSON.stringify(Array.from({ length: 4000 }, (_, id) => ({ id, name: `n${id}` })), null, 2);
    const minified = JSON.stringify(Array.from({ length: 4000 }, (_, id) => ({ id, name: `n${id}` })));
    for (const text of [formatted, minified, '', 'x', '😀'.repeat(5000)]) {
      expect(chunksOf(text, 1000).join('')).toBe(text);
    }
  });

  it('cuts a minified body at the size, and a formatted one on a line break', () => {
    const minified = 'x'.repeat(2500);
    expect(chunksOf(minified, 1000).map((chunk) => chunk.length)).toEqual([1000, 1000, 500]);

    const formatted = Array.from({ length: 200 }, (_, line) => `line ${line}`).join('\n');
    const chunks = chunksOf(formatted, 100);
    // Every block but the last ends on a break, so none starts mid-line.
    for (const chunk of chunks.slice(0, -1)) expect(chunk.endsWith('\n')).toBe(true);
  });

  it('never splits a surrogate pair between two blocks', () => {
    const chunks = chunksOf(`${'a'.repeat(9)}😀${'b'.repeat(30)}`, 10);
    expect(chunks[0]).toBe('a'.repeat(9));
    for (const chunk of chunks) expect(chunk).not.toMatch(/[\ud800-\udbff]$/);
  });

  it('turns a 27 MB body into a few hundred blocks, fast', () => {
    const body = 'x'.repeat(27_000_000);
    const started = performance.now();
    const chunks = chunksOf(body);
    expect(chunks).toHaveLength(Math.ceil(27_000_000 / CHUNK_SIZE));
    expect(performance.now() - started).toBeLessThan(200);
  });
});

describe('estimateLines', () => {
  it('counts the lines of a formatted block, with or without a final break', () => {
    expect(estimateLines('a\nb\nc', 80, true)).toBe(3);
    expect(estimateLines('a\nb\nc\n', 80, true)).toBe(3);
    expect(estimateLines('', 80, true)).toBe(1);
  });

  it('reckons a minified block by how many lines its width would wrap it to', () => {
    expect(estimateLines('x'.repeat(1000), 100, true)).toBe(10);
    expect(estimateLines('x'.repeat(1000), 100, false)).toBe(1);
  });

  it('survives a pane too narrow to measure', () => {
    expect(estimateLines('x'.repeat(10), 0, true)).toBeGreaterThan(0);
  });
});
