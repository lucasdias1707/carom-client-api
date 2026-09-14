import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Nothing on screen may be written in a component.
 *
 * The typed catalogue already guarantees that a key added to English exists in
 * the other two languages. It cannot guarantee the step before that: a
 * sentence typed straight into JSX has no key, so it is not missing from
 * anything, and it reads as English in every language forever. Three separate
 * passes over this app left some behind, and each time they were found by
 * someone reading the screen.
 *
 * So the check is the same sweep, run automatically: strip the comments, then
 * look at what is left between the tags and in the props that end up visible.
 */

const ROOT = path.resolve(__dirname, '../../..');

/** Props whose string value is read by a person, not by the machine. */
const TEXT_PROPS = /\b(placeholder|heading|aria-label|ariaLabel|alt|title|label|description)\s*=\s*(?:"([^"]+)"|'([^']+)')/g;

/** JSX text: whatever sits between a `>` and the next `<`. */
const JSX_TEXT = />([^<>{}]+)</g;

/**
 * What may stay in English, from `locales/README.md`: header names, the format
 * and tool names, and the app's own proper nouns. A palette that renames
 * itself per language is a palette you can no longer point a colleague at.
 */
const ALLOWED = new Set([
  'Authorization: Bearer',
  'Content-Type',
  'X-Api-Key',
  'Carom',
]);

/** Strip comments, so prose in a doc block is not mistaken for a string. */
function code(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (_match, before: string) => before);
}

/**
 * Prose is two or more words with at least one lowercase word among them.
 *
 * That one rule is what separates "Read from the request" from
 * `Authorization: Bearer` and `console.log` without needing a list of
 * exceptions for either. A header name has no lowercase word; an identifier
 * has no space.
 */
function looksLikeProse(text: string): boolean {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (ALLOWED.has(trimmed)) return false;
  /*
    A `>` also closes a generic, so `useState<Thing>(null); const …` arrives
    here looking like a text node. Nothing anyone reads on screen contains a
    semicolon, an equals sign or a backtick, and every one of those false
    positives does.
  */
  if (/[;=`]/.test(trimmed)) return false;
  // The other shape a `>` starts by accident: the `> limit ? (` of a ternary
  // that picks between two elements.
  if (/\?\s*\($/.test(trimmed)) return false;
  const words = trimmed.split(' ');
  if (words.length < 2) return false;
  return words.some((word) => /^[a-z]{2,}$/.test(word));
}

function findings(): string[] {
  const found: string[] = [];
  for (const file of globSync('src/**/*.tsx', { cwd: ROOT })) {
    // The UI primitives are vendored shadcn, and hold no copy of their own.
    if (file.includes('/ui/')) continue;
    const source = code(readFileSync(path.join(ROOT, file), 'utf8'));
    const lineOf = (index: number) => source.slice(0, index).split('\n').length;

    for (const match of source.matchAll(JSX_TEXT)) {
      const text = match[1];
      if (looksLikeProse(text)) found.push(`${file}:${lineOf(match.index)} ${text.trim()}`);
    }
    for (const match of source.matchAll(TEXT_PROPS)) {
      const text = match[2] ?? match[3];
      if (looksLikeProse(text)) found.push(`${file}:${lineOf(match.index)} ${match[1]}="${text}"`);
    }
  }
  return found;
}

describe('every visible string comes from the catalogue', () => {
  it('finds no English written into a component', () => {
    expect(findings()).toEqual([]);
  });

  it('would catch one if it were there', () => {
    // The rule itself, checked on the shapes it has to tell apart — otherwise
    // a test that passes proves only that the regex matched nothing.
    expect(looksLikeProse('Read from the request')).toBe(true);
    expect(looksLikeProse('Surprise me')).toBe(true);
    expect(looksLikeProse('Authorization: Bearer')).toBe(false);
    expect(looksLikeProse('console.log')).toBe(false);
    expect(looksLikeProse('X-Api-Key')).toBe(false);
    expect(looksLikeProse('GET')).toBe(false);
  });
});
