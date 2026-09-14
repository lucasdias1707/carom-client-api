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

/**
 * The same problem one layer down.
 *
 * `.tsx` is where most of it was, but not all: the updater built its own
 * English sentences in a hook, and the badge built more in a lib, and both
 * stayed monolingual through a translation pass that covered every screen.
 * Those are fixed. What is left is a known list, below — request and import
 * failures, which are the messages someone sees on a bad day and the worst
 * ones to meet in a language you do not read.
 *
 * The list is here so it can only shrink. A new English sentence in a `.ts`
 * file fails this test; removing one from the list when it is translated is
 * the only edit that should ever be made to it.
 */
const KNOWN_UNTRANSLATED = new Set([
  // lib/http.ts — why a request could not be sent, or did not come back.
  'GraphQL variables are not valid JSON.',
  'The request could not be completed.',
  'Refused by this app before it was sent, not by the network: the desktop build allows a scheme, host, port and path it was built with. Nothing about the endpoint would change this — please report the URL.',
  'Sent natively, so CORS is not involved: either nothing is listening on that port, or it is listening on the other loopback address — try 127.0.0.1 in place of localhost, or the reverse.',
  'Sent from the browser, where this reads the same whether the server refused the connection or the browser blocked it for CORS. The desktop app sends natively and has neither problem; the companion server is the way out in a tab.',
  'Sent from the browser, so a missing CORS header on the endpoint looks exactly like an unreachable host. The desktop app sends natively; the companion server does the same for a tab.',
  // lib/import-formats.ts, lib/postman.ts, lib/carom.ts — why a file would not open.
  'That is not a Carom export.',
  'That file is not valid JSON. Carom, Postman, Insomnia v4, OpenAPI and HAR files all are.',
  'This file is not a Postman collection or environment export.',
  'That is an Insomnia v5 export, which is YAML. Export again choosing “Insomnia v4 (JSON)”, and this will read it.',
  'That JSON is not a format this understands. It reads its own exports, Postman collections and environments, Insomnia v4 exports, OpenAPI or Swagger descriptions, and HAR logs.',
  'That file is not valid JSON. Export from Postman with “Collection v2.1”.',
  // hooks/use-update-check.ts
  'No further detail was given.',
]);

/**
 * A `.ts` string that reads like a sentence someone would see.
 *
 * Starts with a capital, four words or more, at least one lowercase word. That
 * is narrow enough to leave ids, keys, class names and header names alone
 * while catching the prose, and it is the same shape rule the JSX sweep uses.
 */
function looksLikeSentence(text: string): boolean {
  if (!/^[A-Z]/.test(text)) return false;
  const words = text.trim().split(/\s+/);
  return words.length >= 4 && words.some((word) => /^[a-z]{2,}$/.test(word));
}

describe('the modules behind the screens', () => {
  /** Data, not copy: fixtures and word lists are supposed to be literal. */
  const DATA = ['/locales/', '/__tests__/', '/faker/', 'lib/dynamic.ts', 'lib/seed.ts'];

  function sentences(): string[] {
    const found: string[] = [];
    for (const file of globSync('src/**/*.ts', { cwd: ROOT })) {
      if (DATA.some((part) => file.includes(part))) continue;
      const source = code(readFileSync(path.join(ROOT, file), 'utf8'));
      for (const match of source.matchAll(/(['"`])((?:[^\\\n]|\\.)*?)\1/g)) {
        const text = match[2];
        // A template literal with a hole in it is a built sentence, and this
        // cannot say what it reads as. Those are in the list by hand.
        if (text.includes('${')) continue;
        if (!looksLikeSentence(text) || KNOWN_UNTRANSLATED.has(text)) continue;
        const line = source.slice(0, match.index).split('\n').length;
        found.push(`${file}:${line} ${text}`);
      }
    }
    return found;
  }

  it('adds no new English of its own', () => {
    expect(sentences()).toEqual([]);
  });

  it('has a list that only shrinks', () => {
    // Every entry has to still be somewhere, or it is stale and hiding the
    // next one that takes the same wording.
    const all = globSync('src/**/*.ts', { cwd: ROOT })
      .map((file) => readFileSync(path.join(ROOT, file), 'utf8'))
      .join('\n');
    for (const known of KNOWN_UNTRANSLATED) {
      expect(all.includes(known), `${known} is no longer anywhere; take it off the list`).toBe(true);
    }
  });
});
