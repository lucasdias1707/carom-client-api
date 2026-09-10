import { afterEach, describe, expect, it } from 'vitest';
import {
  SendFailure,
  buildUrl,
  chooseTransport,
  failureHint,
  isDesktop,
  isLocalHost,
  prepareRequest,
  reasonOf,
  toErrorResponse,
  toFetchBody,
} from '@/lib/http';
import { toCurl } from '@/lib/curl';
import { createRequest, emptyAuth, row } from '@/lib/factories';
import type { RequestRecord } from '@/types';

function make(overrides: Partial<RequestRecord> = {}): RequestRecord {
  return createRequest({ workspaceId: 'ws', url: 'https://api.test/things', ...overrides });
}

const variables = { baseUrl: 'https://api.test', token: 'secret' };

describe('buildUrl', () => {
  it('appends parameters to an absolute URL', () => {
    expect(buildUrl('https://api.test/x?a=1', [{ key: 'b', value: '2' }])).toBe('https://api.test/x?a=1&b=2');
  });

  it('encodes parameters on a URL it cannot parse', () => {
    expect(buildUrl('{{baseUrl}}/x', [{ key: 'q', value: 'a b' }])).toBe('{{baseUrl}}/x?q=a%20b');
  });

  it('keeps duplicate parameter names', () => {
    expect(buildUrl('https://api.test/x', [
      { key: 'tag', value: 'a' },
      { key: 'tag', value: 'b' },
    ])).toBe('https://api.test/x?tag=a&tag=b');
  });
});

describe('prepareRequest', () => {
  it('interpolates the URL and drops disabled rows', () => {
    const prepared = prepareRequest(
      make({
        url: '{{baseUrl}}/things',
        params: [row('limit', '10'), row('skip', '5', false)],
        headers: [row('Accept', 'application/json'), row('X-Off', 'no', false)],
      }),
      variables,
    );
    expect(prepared.url).toBe('https://api.test/things?limit=10');
    expect(prepared.headers).toEqual([{ key: 'Accept', value: 'application/json' }]);
  });

  it('adds a JSON content type when the user has not set one', () => {
    const prepared = prepareRequest(make({ method: 'POST', bodyType: 'json', body: '{"a":1}' }), variables);
    expect(prepared.headers).toContainEqual({ key: 'Content-Type', value: 'application/json' });
    expect(prepared.body).toEqual({ type: 'text', text: '{"a":1}', contentType: 'application/json' });
  });

  it('respects an explicit content type', () => {
    const prepared = prepareRequest(
      make({ method: 'POST', bodyType: 'json', body: '{}', headers: [row('Content-Type', 'application/vnd.api+json')] }),
      variables,
    );
    const contentTypes = prepared.headers.filter((header) => header.key === 'Content-Type');
    expect(contentTypes).toEqual([{ key: 'Content-Type', value: 'application/vnd.api+json' }]);
  });

  it('never sends a body on GET', () => {
    const prepared = prepareRequest(make({ method: 'GET', bodyType: 'json', body: '{"a":1}' }), variables);
    expect(prepared.body).toEqual({ type: 'none' });
  });

  it('turns bearer auth into a header and interpolates the token', () => {
    const prepared = prepareRequest(
      make({ auth: { ...emptyAuth(), type: 'bearer', token: '{{token}}' } }),
      variables,
    );
    expect(prepared.headers).toContainEqual({ key: 'Authorization', value: 'Bearer secret' });
  });

  it('base64 encodes basic auth', () => {
    const prepared = prepareRequest(
      make({ auth: { ...emptyAuth(), type: 'basic', username: 'ada', password: 'pw' } }),
      variables,
    );
    expect(prepared.headers).toContainEqual({ key: 'Authorization', value: `Basic ${btoa('ada:pw')}` });
  });

  it('can put an API key in the query string', () => {
    const prepared = prepareRequest(
      make({ auth: { ...emptyAuth(), type: 'apikey', apiKeyName: 'api_key', apiKeyValue: 'k1', apiKeyIn: 'query' } }),
      variables,
    );
    expect(prepared.url).toBe('https://api.test/things?api_key=k1');
    expect(prepared.headers).toEqual([]);
  });

  it('builds a form body from enabled fields only', () => {
    const prepared = prepareRequest(
      make({ method: 'POST', bodyType: 'form', form: [row('a', '1'), row('b', '2', false)] }),
      variables,
    );
    expect(prepared.body).toEqual({ type: 'form', fields: [{ key: 'a', value: '1' }] });
  });

  it('wraps a GraphQL query and its variables', () => {
    const prepared = prepareRequest(
      make({ method: 'POST', bodyType: 'graphql', graphql: { query: 'query { me }', variables: '{"id":1}' } }),
      variables,
    );
    expect(prepared.body).toEqual({
      type: 'text',
      text: JSON.stringify({ query: 'query { me }', variables: { id: 1 } }),
      contentType: 'application/json',
    });
  });

  it('rejects GraphQL variables that are not JSON', () => {
    expect(() =>
      prepareRequest(make({ method: 'POST', bodyType: 'graphql', graphql: { query: '{}', variables: 'nope' } }), variables),
    ).toThrow(/not valid JSON/);
  });
});

describe('chooseTransport', () => {
  const web = { desktop: false, proxyAvailable: false };
  const webWithProxy = { desktop: false, proxyAvailable: true };
  const desktop = { desktop: true, proxyAvailable: false };

  it('prefers the desktop shell in auto mode, since it has no CORS limit at all', () => {
    expect(chooseTransport('auto', desktop)).toBe('desktop');
    expect(chooseTransport('auto', { desktop: true, proxyAvailable: true })).toBe('desktop');
  });

  it('falls back to the companion server on the web when it is up', () => {
    expect(chooseTransport('auto', webWithProxy)).toBe('proxy');
  });

  it('uses the browser when nothing else is available', () => {
    expect(chooseTransport('auto', web)).toBe('browser');
  });

  it('honours an explicit choice even on the desktop', () => {
    expect(chooseTransport('browser', desktop)).toBe('browser');
    expect(chooseTransport('proxy', desktop)).toBe('proxy');
  });

  it('honours an explicit proxy choice even when the health check failed', () => {
    // The user asked for it by name; failing loudly beats silently going direct.
    expect(chooseTransport('proxy', web)).toBe('proxy');
  });
});

describe('isDesktop', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'window');
  });

  it('is false in a plain browser or in node', () => {
    expect(isDesktop()).toBe(false);
    Object.defineProperty(globalThis, 'window', { value: {}, configurable: true });
    expect(isDesktop()).toBe(false);
  });

  it('is true once the Tauri shell has injected its bridge', () => {
    Object.defineProperty(globalThis, 'window', { value: { __TAURI_INTERNALS__: {} }, configurable: true });
    expect(isDesktop()).toBe(true);
  });
});

describe('multipart with files', () => {
  const withFile = () =>
    make({
      method: 'POST',
      bodyType: 'multipart',
      multipart: [
        { id: 'r1', key: 'note', value: 'hello', enabled: true },
        { id: 'r2', key: 'doc', value: '', enabled: true, file: { name: 'a.pdf', type: 'application/pdf', size: 9 } },
        { id: 'r3', key: 'off', value: 'x', enabled: false },
      ],
    });

  it('carries the row id through, so the bytes can be found when the body is built', () => {
    expect(prepareRequest(withFile(), {}).body).toEqual({
      type: 'multipart',
      fields: [
        { key: 'note', value: 'hello' },
        { key: 'doc', rowId: 'r2', file: { name: 'a.pdf', type: 'application/pdf', size: 9 } },
      ],
    });
  });

  it('refuses to send a file whose bytes are gone rather than sending the field empty', () => {
    // Metadata is persisted, bytes are not: this is what a reload leaves
    // behind, and it has to be said out loud instead of posting an empty part.
    expect(() => toFetchBody(prepareRequest(withFile(), {}).body)).toThrow(/no longer loaded/);
  });

  it('writes a file part the way curl writes one', () => {
    expect(toCurl(prepareRequest(withFile(), {}))).toContain('doc=@a.pdf');
  });
});

describe('a failed send', () => {
  const prepared = { method: 'GET' as const, url: 'http://localhost:3000/hotel/cnpj-exists', headers: [], body: { type: 'none' } as const };

  it('keeps the reason when the reject is a string, which is how Rust sends it', () => {
    // The desktop plugin rejects with a plain string; reading only
    // `Error.message` threw the only useful sentence away.
    expect(reasonOf('tcp connect error: Connection refused (os error 61)')).toMatch(/Connection refused/);
    expect(reasonOf(new Error('Failed to fetch'))).toBe('Failed to fetch');
    expect(reasonOf({ message: 'boom' })).toBe('boom');
    expect(reasonOf(undefined)).toMatch(/could not be completed/);
  });

  it('records the transport it actually failed on', () => {
    const failure = toErrorResponse(prepared, new SendFailure('nope', 'desktop'), 5);
    expect(failure.via).toBe('desktop');
    expect(failure.error).toMatch(/^nope/);
  });

  it('says browser for something that never left the app', () => {
    // An empty URL or a script throwing is not a transport failure.
    const failure = toErrorResponse(prepared, new Error('Enter a URL before sending.'), 0);
    expect(failure.via).toBe('browser');
    expect(failure.error).toBe('Enter a URL before sending.');
  });

  it('names both possibilities from a browser, because they look identical there', () => {
    const failure = toErrorResponse(prepared, new SendFailure('Failed to fetch', 'browser'), 5);
    expect(failure.error).toMatch(/CORS/);
    expect(failure.error).toMatch(/companion server/);
  });

  it('rules CORS out when the request was sent natively, rather than blaming it', () => {
    const hint = failureHint('http://localhost:3000/x', 'desktop');
    expect(hint).toMatch(/CORS is not involved/);
    // The loopback mismatch is the real suspect there, and it is nameable.
    expect(hint).toMatch(/127\.0\.0\.1/);
    expect(failureHint('https://api.github.com/x', 'desktop')).toBeNull();
  });

  it('knows a host that only exists on this machine or network', () => {
    expect(isLocalHost('http://localhost:3000/x')).toBe(true);
    expect(isLocalHost('http://127.0.0.1:8080')).toBe(true);
    expect(isLocalHost('http://192.168.1.20/api')).toBe(true);
    expect(isLocalHost('http://172.16.4.1/api')).toBe(true);
    expect(isLocalHost('https://api.github.com')).toBe(false);
    expect(isLocalHost('not a url')).toBe(false);
  });
});
