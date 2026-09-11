import { row } from '@/lib/factories';
import type { KeyValue } from '@/types';

/**
 * Mirroring a URL's query string into the Params table.
 *
 * Query parameters belong in Params, not Headers: they travel in the URL
 * itself, while a header is a separate field of the request.
 *
 * The query stays in the URL, where it was typed, and is copied into the
 * table. Sending therefore has to ignore the URL's own query and take the
 * table's rows instead, or every parameter would go out twice — see
 * `prepareRequest`.
 */

export type SplitUrl = {
  /** The URL without its query string, fragment still attached. */
  base: string;
  params: Array<{ key: string; value: string }>;
};

/**
 * Split a URL into the address and the query parameters written into it.
 *
 * Deliberately hand-rolled rather than `new URL()`: the URL here is usually
 * still templated (`{{baseUrl}}/users`), which `URL` refuses to parse at all.
 */
export function splitQuery(url: string): SplitUrl {
  const start = url.indexOf('?');
  if (start === -1) return { base: url, params: [] };

  // A fragment is not part of the query, and it belongs back on the address.
  const hash = url.indexOf('#', start);
  const query = hash === -1 ? url.slice(start + 1) : url.slice(start + 1, hash);
  const base = url.slice(0, start) + (hash === -1 ? '' : url.slice(hash));

  const params: Array<{ key: string; value: string }> = [];
  for (const [key, value] of new URLSearchParams(query)) {
    // `?&&` and friends parse to nothing; a key with no value is still a
    // parameter, so only a missing key is dropped.
    if (key) params.push({ key, value });
  }

  return { base, params };
}

/**
 * Bring the table in line with the URL's query string.
 *
 * Three things can happen to a parameter written into the URL, in this order:
 *
 * 1. A mirrored row already says exactly that — reuse it, so unticking one
 *    survives the next keystroke in the URL.
 * 2. A row someone typed carries the same key. The parameter is already in the
 *    table, so the URL takes that row over and updates its value rather than
 *    adding a second row with the same name — `prepareRequest` sends the table,
 *    and two rows named `cnpj` went out as `?cnpj=1&cnpj=2`.
 * 3. Nothing matches — mirror it as a new row.
 *
 * What comes back is the rows nobody claimed, in the order they were typed,
 * followed by the query in the order the URL writes it. Mirrored rows the URL
 * no longer mentions are simply gone, which is what makes editing the URL work:
 * `?page=2` becoming `?page=3` must not leave both, and send both.
 */
export function syncUrlParams(
  existing: KeyValue[],
  urlParams: Array<{ key: string; value: string }>,
): KeyValue[] {
  const claimed = new Set<string>();
  const free = (item: KeyValue) => !claimed.has(item.id);

  const mirrored = urlParams.map((param) => {
    const same = existing.find(
      (item) => item.source === 'url' && free(item) && item.key === param.key && item.value === param.value,
    );
    if (same) {
      claimed.add(same.id);
      return same;
    }

    const named = existing.find((item) => free(item) && item.key === param.key);
    if (named) {
      claimed.add(named.id);
      // Taking a row over means marking it as the URL's: its value comes from
      // there now, and the next pass has to recognise it as one of its own.
      return { ...named, value: param.value, source: 'url' as const };
    }

    return { ...row(param.key, param.value), source: 'url' as const };
  });

  const kept = existing.filter((item) => item.source !== 'url' && free(item));
  return [...kept, ...mirrored];
}

/**
 * Characters that would change what the query means if they went in raw.
 *
 * Deliberately a short list. `encodeURIComponent` would be correct for a URL
 * about to be sent and wrong here: this text goes back into the field you type
 * in, where `{{baseUrl}}` has to stay readable and become a variable chip.
 * `%7B%7BbaseUrl%7D%7D` is neither. So only what `URLSearchParams` would read
 * back as something else is escaped — and `=` only in a key, because a value
 * may contain one: the split is on the first.
 */
function escapeForQuery(text: string, inKey: boolean): string {
  return text.replace(inKey ? /[%&#+=]/g : /[%&#+]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/**
 * Write the table back into the URL's query string.
 *
 * The other direction of `syncUrlParams`, and the half that was missing: with
 * only URL → table, editing a row was undone half a second later by the mirror
 * reading a URL that still said the old thing. Now whichever one you touch is
 * the one that writes.
 *
 * Only rows that are ticked and have a key go in — the rest still exist in the
 * table, they just have nothing to say in a URL. Unticking one therefore takes
 * it out of the address and ticking it puts it back, which keeps what you are
 * looking at equal to what would be sent.
 *
 * The address and the fragment are left exactly as they were; only what sits
 * between `?` and `#` is rewritten.
 */
export function writeUrlParams(url: string, params: KeyValue[]): string {
  // Same reading as `splitQuery`: a `#` counts as the fragment from where the
  // query starts, so the two cannot disagree about what the address is.
  const start = url.indexOf('?');
  const hash = start === -1 ? url.indexOf('#') : url.indexOf('#', start);
  const address = start === -1 ? (hash === -1 ? url : url.slice(0, hash)) : url.slice(0, start);
  const fragment = hash === -1 ? '' : url.slice(hash);

  const query = params
    .filter((item) => item.enabled && item.key.trim())
    .map((item) => `${escapeForQuery(item.key, true)}=${escapeForQuery(item.value, false)}`)
    .join('&');

  return query ? `${address}?${query}${fragment}` : `${address}${fragment}`;
}

/**
 * True when the table already reflects the URL's query, so the mirror can skip
 * dispatching and leave the request untouched.
 *
 * Asking `syncUrlParams` rather than re-deriving the rule: the two cannot drift
 * apart, and a rule that drifts here is an effect that dispatches on every tick
 * for as long as the request is open.
 */
export function paramsMatchUrl(
  existing: KeyValue[],
  urlParams: Array<{ key: string; value: string }>,
): boolean {
  const next = syncUrlParams(existing, urlParams);
  return next.length === existing.length && next.every((item, index) => item === existing[index]);
}
