import { byteLength } from '@/lib/format';
import { createId } from '@/lib/id';
import { applyScriptHeaders } from '@/lib/scripts';
import { resolveAuth } from '@/lib/inherit';
import { splitQuery } from '@/lib/query';
import { interpolate } from '@/lib/template';
import type { Folder, HttpMethod, KeyValue, RequestRecord, ResponseRecord, SendMode } from '@/types';
import { getFile, type FileMeta } from '@/lib/files';

export type PreparedBody =
  | { type: 'none' }
  | { type: 'text'; text: string; contentType: string }
  | { type: 'form'; fields: Array<{ key: string; value: string }> }
  | { type: 'multipart'; fields: MultipartField[] };

/**
 * A multipart part is either typed text or an attached file. The file case
 * carries the row id rather than the bytes: the bytes live in `lib/files.ts`
 * for the session, and are fetched at the moment the body is built.
 */
export type MultipartField =
  | { key: string; value: string }
  | { key: string; rowId: string; file: FileMeta };

export type PreparedRequest = {
  method: HttpMethod;
  url: string;
  headers: Array<{ key: string; value: string }>;
  body: PreparedBody;
};

const METHODS_WITHOUT_BODY: HttpMethod[] = ['GET', 'HEAD'];

function activeRows(rows: KeyValue[], variables: Record<string, string>) {
  return rows
    .filter((rowItem) => rowItem.enabled && rowItem.key.trim())
    .map((rowItem) => ({ key: interpolate(rowItem.key, variables).trim(), value: interpolate(rowItem.value, variables) }));
}

function encodeBasic(username: string, password: string): string {
  const raw = `${username}:${password}`;
  if (typeof btoa === 'function') {
    // btoa only handles latin1, so widen through UTF-8 first.
    const bytes = new TextEncoder().encode(raw);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }
  return Buffer.from(raw, 'utf8').toString('base64');
}

function defaultContentType(request: RequestRecord): string {
  switch (request.bodyType) {
    case 'json':
    case 'graphql':
      return 'application/json';
    case 'xml':
      return 'application/xml';
    case 'text':
      return 'text/plain';
    default:
      return '';
  }
}

function buildBody(request: RequestRecord, variables: Record<string, string>, hasExplicitContentType: boolean): PreparedBody {
  if (request.bodyType === 'none' || METHODS_WITHOUT_BODY.includes(request.method)) return { type: 'none' };
  if (request.bodyType === 'form') return { type: 'form', fields: activeRows(request.form, variables) };
  if (request.bodyType === 'multipart') {
    return {
      type: 'multipart',
      fields: request.multipart
        .filter((rowItem) => rowItem.enabled && rowItem.key.trim())
        .map<MultipartField>((rowItem) => {
          const key = interpolate(rowItem.key, variables).trim();
          return rowItem.file
            ? { key, rowId: rowItem.id, file: rowItem.file }
            : { key, value: interpolate(rowItem.value, variables) };
        }),
    };
  }
  if (request.bodyType === 'graphql') {
    let parsedVariables: unknown = {};
    const rawVariables = interpolate(request.graphql.variables, variables).trim();
    if (rawVariables) {
      try {
        parsedVariables = JSON.parse(rawVariables);
      } catch {
        throw new Error('GraphQL variables are not valid JSON.');
      }
    }
    return {
      type: 'text',
      text: JSON.stringify({ query: interpolate(request.graphql.query, variables), variables: parsedVariables }),
      contentType: 'application/json',
    };
  }
  const text = interpolate(request.body, variables);
  if (!text.trim()) return { type: 'none' };
  return { type: 'text', text, contentType: hasExplicitContentType ? '' : defaultContentType(request) };
}

export type PrepareOptions = {
  /**
   * The folders the request sits in, nearest first. Only needed when its auth
   * is inherited; without it an inheriting request sends no credentials, which
   * is the right answer for a request that belongs to no folder.
   */
  folders?: Folder[];
  /** Headers a pre-request script added, which win over the request's own. */
  extraHeaders?: Array<{ key: string; value: string }>;
};

/**
 * Resolve a stored request into exactly what should go on the wire: variables
 * interpolated, disabled rows dropped, query params merged into the URL and
 * auth turned into concrete headers or query parameters.
 */
export function prepareRequest(
  request: RequestRecord,
  variables: Record<string, string>,
  options: PrepareOptions = {},
): PreparedRequest {
  const headers = applyScriptHeaders(activeRows(request.headers, variables), options.extraHeaders ?? []);
  const params = activeRows(request.params, variables);
  // An inheriting request takes the nearest folder's choice; one that picked
  // its own keeps it, whatever the folder says.
  const auth = resolveAuth(request.auth, options.folders ?? []).auth;

  if (auth.type === 'bearer' && auth.token.trim()) {
    headers.push({ key: 'Authorization', value: `Bearer ${interpolate(auth.token, variables).trim()}` });
  } else if (auth.type === 'basic' && (auth.username || auth.password)) {
    const encoded = encodeBasic(interpolate(auth.username, variables), interpolate(auth.password, variables));
    headers.push({ key: 'Authorization', value: `Basic ${encoded}` });
  } else if (auth.type === 'apikey' && auth.apiKeyName.trim()) {
    const key = interpolate(auth.apiKeyName, variables).trim();
    const value = interpolate(auth.apiKeyValue, variables);
    if (auth.apiKeyIn === 'header') headers.push({ key, value });
    else params.push({ key, value });
  }

  const hasExplicitContentType = headers.some((header) => header.key.toLowerCase() === 'content-type');
  const body = buildBody(request, variables, hasExplicitContentType);
  if (body.type === 'text' && body.contentType && !hasExplicitContentType) {
    headers.push({ key: 'Content-Type', value: body.contentType });
  }

  // The URL keeps the query someone typed into it, and the Params table
  // mirrors it. Appending the table to that URL would send every mirrored
  // parameter twice, so the address goes out without its query and the table
  // supplies the whole query instead.
  //
  // A parameter the table has never heard of is still sent: the mirror is
  // debounced and Send can beat it, and dropping what was just typed would be
  // worse than sending it. The test is the key, not the whole pair — once the
  // table has a row for `page`, that row is the one that counts, whether it
  // was edited, unticked, or left alone.
  const { base, params: fromUrl } = splitQuery(interpolate(request.url, variables));
  const tableKeys = new Set(
    request.params.map((param) => interpolate(param.key, variables).trim()).filter(Boolean),
  );
  for (const param of fromUrl) {
    if (!tableKeys.has(param.key)) params.push(param);
  }

  return { method: request.method, url: buildUrl(base, params), headers, body };
}

/** Merge query parameters into a URL without losing ones already written by hand. */
export function buildUrl(rawUrl: string, params: Array<{ key: string; value: string }>): string {
  const url = rawUrl.trim();
  if (params.length === 0) return url;
  try {
    const parsed = new URL(url);
    for (const param of params) parsed.searchParams.append(param.key, param.value);
    return parsed.toString();
  } catch {
    // Relative or still-templated URL: fall back to plain string concatenation.
    const query = params
      .map((param) => `${encodeURIComponent(param.key)}=${encodeURIComponent(param.value)}`)
      .join('&');
    if (!query) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${query}`;
  }
}

export function toFetchBody(body: PreparedBody): BodyInit | undefined {
  switch (body.type) {
    case 'none':
      return undefined;
    case 'text':
      return body.text;
    case 'form': {
      const search = new URLSearchParams();
      for (const field of body.fields) search.append(field.key, field.value);
      return search;
    }
    case 'multipart': {
      const form = new FormData();
      for (const field of body.fields) {
        if (!('file' in field)) {
          form.append(field.key, field.value);
          continue;
        }
        const attached = getFile(field.rowId);
        // The metadata survived a reload; the bytes did not. Better to say so
        // than to send the field empty and let the server puzzle over it.
        if (!attached) {
          throw new Error(
            `The file for "${field.key}" (${field.file.name}) is no longer loaded. Attach it again — files are kept for the session, not saved with the workspace.`,
          );
        }
        form.append(field.key, attached, field.file.name);
      }
      return form;
    }
  }
}

export type SendResult = Omit<ResponseRecord, 'requestId'>;

/**
 * True when running inside the Tauri shell.
 *
 * There, requests are issued from Rust instead of the webview: no CORS, no
 * preflight, and private hosts like `localhost:3000` are reachable — the same
 * freedom a native client has, without the companion server.
 */
export function isDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** Tauri's fetch, loaded lazily so web builds never pull the plugin in. */
async function desktopFetch(): Promise<typeof fetch> {
  const module = await import('@tauri-apps/plugin-http');
  return module.fetch as unknown as typeof fetch;
}

export type SendConfig = {
  mode: SendMode;
  timeoutMs: number;
  followRedirects: boolean;
  proxyBaseUrl: string;
  proxyAvailable: boolean;
  signal?: AbortSignal;
};

function headersToRows(headers: Headers): KeyValue[] {
  const rows: KeyValue[] = [];
  headers.forEach((value, key) => rows.push({ id: createId('rh'), key, value, enabled: true }));
  return rows.sort((left, right) => left.key.localeCompare(right.key));
}

async function sendDirect(
  prepared: PreparedRequest,
  config: SendConfig,
  transport: { fetch: typeof fetch; via: 'browser' | 'desktop' } = { fetch, via: 'browser' },
): Promise<SendResult> {
  const headers = new Headers();
  for (const header of prepared.headers) {
    // multipart boundaries must be generated by fetch, so never forward ours.
    if (prepared.body.type === 'multipart' && header.key.toLowerCase() === 'content-type') continue;
    headers.append(header.key, header.value);
  }
  const started = performance.now();
  // Pulled out of the object before being called: `window.fetch` invoked as a
  // method of anything other than `window` throws "Illegal invocation", so
  // `transport.fetch(...)` fails in a browser while working on the desktop,
  // where the plugin's fetch is a plain function.
  const send = transport.fetch;
  const response = await send(prepared.url, {
    method: prepared.method,
    headers,
    body: toFetchBody(prepared.body),
    signal: config.signal,
    redirect: config.followRedirects ? 'follow' : 'manual',
  });
  const text = await response.text();
  return {
    id: createId('res'),
    url: prepared.url,
    method: prepared.method,
    status: response.status,
    statusText: response.statusText || httpStatusText(response.status),
    headers: headersToRows(response.headers),
    body: text,
    truncated: false,
    size: byteLength(text),
    durationMs: Math.round(performance.now() - started),
    sentAt: new Date().toISOString(),
    via: transport.via,
  };
}

type ProxyResponse = {
  status: number;
  statusText: string;
  headers: Array<{ key: string; value: string }>;
  body: string;
  truncated: boolean;
  size: number;
  durationMs: number;
  finalUrl: string;
};

async function sendViaProxy(prepared: PreparedRequest, config: SendConfig): Promise<SendResult> {
  const started = performance.now();
  const response = await fetch(`${config.proxyBaseUrl}/proxy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: config.signal,
    body: JSON.stringify({
      method: prepared.method,
      url: prepared.url,
      headers: prepared.headers,
      body: prepared.body,
      timeoutMs: config.timeoutMs,
      followRedirects: config.followRedirects,
    }),
  });

  const payload = (await response.json()) as ProxyResponse | { error: { message: string } };
  if (!response.ok || 'error' in payload) {
    const message = 'error' in payload ? payload.error.message : `Proxy returned ${response.status}`;
    throw new ProxyError(message);
  }

  return {
    id: createId('res'),
    url: payload.finalUrl || prepared.url,
    method: prepared.method,
    status: payload.status,
    statusText: payload.statusText || httpStatusText(payload.status),
    headers: payload.headers.map((header) => ({ id: createId('rh'), key: header.key, value: header.value, enabled: true })),
    body: payload.body,
    truncated: payload.truncated,
    size: payload.size,
    durationMs: payload.durationMs || Math.round(performance.now() - started),
    sentAt: new Date().toISOString(),
    via: 'proxy',
  };
}

/** Raised when the proxy itself fails, as opposed to the upstream endpoint. */
export class ProxyError extends Error {}

/**
 * A send that failed, carrying the transport it failed on.
 *
 * Which one was used is known here and nowhere else — the fallback from the
 * proxy to the browser happens inside `sendRequest` — and the failure record
 * used to guess "browser" for all of them, so a desktop request that could not
 * connect was labelled as if a browser had blocked it.
 */
export class SendFailure extends Error {
  constructor(
    message: string,
    readonly via: SendResult['via'],
  ) {
    super(message);
    this.name = 'SendFailure';
  }
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/** Cancellation is not a failure, and a failure is not re-wrapped twice. */
function asFailure(error: unknown, via: SendResult['via']): unknown {
  if (isAbort(error) || error instanceof SendFailure) return error;
  return new SendFailure(reasonOf(error), via);
}

export type Transport = 'desktop' | 'proxy' | 'browser';

/**
 * Pick how a request should leave the app.
 *
 * `auto` prefers the desktop shell, which has no CORS restriction at all and
 * reaches private hosts; then the companion server, which sidesteps CORS for a
 * browser; and finally the browser itself. An explicit mode is always honoured,
 * so the desktop build can still be pointed at the other two for comparison.
 */
export function chooseTransport(
  mode: SendMode,
  context: { desktop: boolean; proxyAvailable: boolean },
): Transport {
  if (mode === 'browser') return 'browser';
  if (mode === 'proxy') return 'proxy';
  if (context.desktop) return 'desktop';
  return context.proxyAvailable ? 'proxy' : 'browser';
}

/**
 * Send a prepared request over the best transport available. A failing proxy
 * falls back to the browser, unless the proxy was asked for by name.
 */
export async function sendRequest(prepared: PreparedRequest, config: SendConfig): Promise<SendResult> {
  const transport = chooseTransport(config.mode, {
    desktop: isDesktop(),
    proxyAvailable: config.proxyAvailable,
  });

  try {
    if (transport === 'desktop') {
      return await sendDirect(prepared, config, { fetch: await desktopFetch(), via: 'desktop' });
    }
    if (transport === 'browser') return await sendDirect(prepared, config);

    try {
      return await sendViaProxy(prepared, config);
    } catch (error) {
      if (config.mode === 'proxy' || isAbort(error)) throw error;
      // The proxy was a preference, not an instruction; the browser is the
      // fallback, and it is the browser that failed if this throws.
      try {
        return await sendDirect(prepared, config);
      } catch (fallback) {
        throw asFailure(fallback, 'browser');
      }
    }
  } catch (error) {
    throw asFailure(error, transport);
  }
}

/**
 * What actually went wrong, in the caller's words wherever there are any.
 *
 * The desktop plugin rejects with a **string** from Rust — "error sending
 * request for url (...): tcp connect error: Connection refused" — and reading
 * only `Error.message` threw exactly that away, leaving the one line that says
 * nothing. Every shape a reject can arrive in is unwrapped here instead.
 */
export function reasonOf(error: unknown): string {
  if (typeof error === 'string' && error.trim()) return error.trim();
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message.trim();
  }
  return 'The request could not be completed.';
}

/** True for a host that only exists on this machine or this network. */
export function isLocalHost(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      /^127\./.test(hostname) ||
      hostname === '::1' ||
      hostname === '[::1]' ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
    );
  } catch {
    return false;
  }
}

/**
 * The sentence after the reason: why *this* transport tends to fail this way.
 *
 * A browser's `fetch` reports a blocked request and a refused connection
 * identically — a bare TypeError with no status — so the app cannot tell them
 * apart and should not pretend to. What it can do is name both, and say which
 * of the two ways out applies.
 */
/**
 * A refusal by the app's own permission scope, before anything was sent.
 *
 * Worth telling apart from a network failure: it is not the endpoint, the port
 * or the address, and the advice for those sends someone looking in exactly
 * the wrong place — which is what happened when a missing port wildcard made
 * the desktop scope refuse every `localhost:3000`.
 */
export function isScopeRefusal(reason: string): boolean {
  return /not allowed on the configured scope/i.test(reason);
}

export function failureHint(url: string, via: SendResult['via'], reason = ''): string | null {
  if (isScopeRefusal(reason)) {
    return 'Refused by this app before it was sent, not by the network: the desktop build allows a scheme, host, port and path it was built with. Nothing about the endpoint would change this — please report the URL.';
  }
  if (via === 'desktop') {
    return isLocalHost(url)
      ? 'Sent natively, so CORS is not involved: either nothing is listening on that port, or it is listening on the other loopback address — try 127.0.0.1 in place of localhost, or the reverse.'
      : null;
  }
  if (via === 'browser') {
    return isLocalHost(url)
      ? 'Sent from the browser, where this reads the same whether the server refused the connection or the browser blocked it for CORS. The desktop app sends natively and has neither problem; the companion server is the way out in a tab.'
      : 'Sent from the browser, so a missing CORS header on the endpoint looks exactly like an unreachable host. The desktop app sends natively; the companion server does the same for a tab.';
  }
  return null;
}

export function toErrorResponse(prepared: PreparedRequest, error: unknown, durationMs: number): SendResult {
  // A failure that reached here through `sendRequest` knows its own transport;
  // anything else (a script throwing, an empty URL) never left the app.
  const via: SendResult['via'] = error instanceof SendFailure ? error.via : 'browser';
  const reason = reasonOf(error);
  const hint = error instanceof SendFailure ? failureHint(prepared.url, via, reason) : null;
  const message = hint ? `${reason}\n\n${hint}` : reason;
  return {
    id: createId('res'),
    url: prepared.url,
    method: prepared.method,
    status: 0,
    statusText: 'Failed',
    headers: [],
    body: '',
    truncated: false,
    size: 0,
    durationMs,
    sentAt: new Date().toISOString(),
    via,
    error: message,
  };
}

const STATUS_TEXT: Record<number, string> = {
  200: 'OK', 201: 'Created', 202: 'Accepted', 204: 'No Content',
  301: 'Moved Permanently', 302: 'Found', 304: 'Not Modified', 307: 'Temporary Redirect', 308: 'Permanent Redirect',
  400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 405: 'Method Not Allowed',
  409: 'Conflict', 422: 'Unprocessable Entity', 429: 'Too Many Requests',
  500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable', 504: 'Gateway Timeout',
};

export function httpStatusText(status: number): string {
  return STATUS_TEXT[status] ?? '';
}
