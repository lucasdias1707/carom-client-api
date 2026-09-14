import { row } from '@/lib/factories';
import type { KeyValue } from '@/types';

/**
 * Turning something you selected into a variable.
 *
 * The gesture is the one Postman has: select a value, right-click, and either
 * put it into a variable that already exists or make a new one. What makes it
 * worth having is the pair of things it does at once — the value is written to
 * the environment *and* the text you selected becomes `{{name}}`, so the
 * request is left parameterised rather than merely copied.
 *
 * The parts here are the ones that can be wrong without a browser to notice:
 * what counts as a selection, what a new variable should be called, and what
 * writing one does to a list of rows.
 */

/** Longer than any value worth putting in a variable; past this it is a paste. */
const MAX_SELECTION = 2048;

/**
 * Whether a selection is worth offering to capture.
 *
 * Whitespace-only is what you get from a stray drag, and a selection spanning
 * half the response body is not a variable. Both would put an entry in the
 * menu that cannot lead anywhere good.
 */
export function usableSelection(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_SELECTION;
}

/**
 * A name to offer for a new variable, from the value it will hold.
 *
 * A guess, and a starting point for typing rather than a decision — it goes
 * into a field the reader can edit. It reads the value the way someone naming
 * it would: a URL is its host, a bearer token is a token, and anything else is
 * its first couple of words in camelCase.
 */
export function suggestVariableName(text: string): string {
  const value = text.trim();

  // A URL is almost always going to be called after its host.
  const url = /^https?:\/\/([^/:\s]+)/i.exec(value);
  if (url) {
    const host = url[1].replace(/^www\./i, '');
    const label = host.split('.')[0];
    return camel(label) || 'baseUrl';
  }

  // Anything long and unbroken is an identifier of some kind: a token, a key,
  // a uuid. There is nothing in the value itself worth naming it after.
  if (!/\s/.test(value) && value.length > 24) return 'token';

  const words = value
    .replace(/[^\p{L}\p{N}\s_-]+/gu, ' ')
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 3);
  return words.length === 0 ? 'value' : camel(words.join(' '));
}

function camel(text: string): string {
  const parts = text
    .replace(/[^\p{L}\p{N}\s_-]+/gu, ' ')
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean);
  if (parts.length === 0) return '';
  const [first, ...rest] = parts;
  return (
    first.toLowerCase() + rest.map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase()).join('')
  );
}

/**
 * Write `name = value` into a list of variable rows.
 *
 * An existing row is updated rather than duplicated, matched on the trimmed
 * name because that is what the interpolator matches on: two rows called
 * `token` and `token ` look identical on screen and only one of them is ever
 * read. A disabled row is re-enabled — you just asked for this value to be
 * used, and silently writing it into a row that is switched off would look
 * like nothing happened.
 */
export function assignVariable(rows: KeyValue[], name: string, value: string): KeyValue[] {
  const wanted = name.trim();
  if (!wanted) return rows;

  let found = false;
  const updated = rows.map((item) => {
    if (found || item.key.trim() !== wanted) return item;
    found = true;
    return { ...item, value, enabled: true };
  });
  return found ? updated : [...rows, row(wanted, value)];
}

/** What the menu offers, given what is defined where it would write. */
export function assignableNames(rows: KeyValue[]): string[] {
  const seen = new Set<string>();
  for (const item of rows) {
    const key = item.key.trim();
    if (key) seen.add(key);
  }
  return [...seen];
}
