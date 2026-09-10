import { describe, expect, it } from 'vitest';
import capabilities from '../../../src-tauri/capabilities/default.json';

/**
 * The desktop scope, guarded from the outside.
 *
 * `http://**` looked like a glob that allowed everything and was not one: the
 * scope is matched with **URLPattern**, where a pattern that names no port
 * means *no port*. So the packaged app could reach `http://example.com` and
 * refused `http://localhost:3000` — every API anyone runs while developing,
 * and every `https://host:8443` besides. It failed with "url not allowed on
 * the configured scope", which reads like a bug in the request rather than in
 * the app that refused it.
 *
 * This cannot evaluate URLPattern — Node does not carry one here — so it does
 * not pretend to. It checks the shape that was wrong: every scope entry names
 * a port and a path explicitly. The semantics were verified separately against
 * `tauri-plugin-http`'s own `parse_url_pattern`: with the port and path
 * wildcards in place, localhost:3000, 192.168.0.10:8080 and api.github.com are
 * all allowed, and without them only default-port URLs were.
 */
type Permission = string | { identifier: string; allow?: Array<{ url: string }> };

const httpScope = (capabilities.permissions as Permission[]).find(
  (permission): permission is { identifier: string; allow?: Array<{ url: string }> } =>
    typeof permission === 'object' && permission.identifier === 'http:default',
);

describe('the desktop HTTP scope', () => {
  it('is declared at all, or the app can reach nothing', () => {
    expect(httpScope?.allow?.length).toBeGreaterThan(0);
  });

  it('names a port on every entry, so a non-default port is not silently refused', () => {
    for (const entry of httpScope?.allow ?? []) {
      expect(entry.url, `${entry.url} has no port wildcard`).toMatch(/:\*/);
    }
  });

  it('names a path on every entry, so the pattern is not only the origin', () => {
    for (const entry of httpScope?.allow ?? []) {
      expect(entry.url, `${entry.url} has no path wildcard`).toMatch(/\/\*$/);
    }
  });

  it('covers both schemes', () => {
    const urls = (httpScope?.allow ?? []).map((entry) => entry.url);
    expect(urls.some((url) => url.startsWith('http://'))).toBe(true);
    expect(urls.some((url) => url.startsWith('https://'))).toBe(true);
  });
});
