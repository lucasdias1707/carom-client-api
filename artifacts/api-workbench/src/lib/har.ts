import { createFolder, createRequest, row } from '@/lib/factories';
import type { ParsedImport } from '@/lib/postman';
import type { Folder, HttpMethod, KeyValue, RequestRecord } from '@/types';

/**
 * Read a HAR — the network log a browser's devtools exports.
 *
 * This is the format for "reproduce what that page just did": no API
 * description exists, but the traffic does. A HAR is a recording rather than a
 * collection, so the import is shaped to match — one folder per page, requests
 * named by what they hit, and the noise a page makes filtered out by default.
 *
 * A HAR of a logged-in session contains cookies and Authorization headers
 * verbatim. They come across because dropping them would produce requests that
 * cannot run, but that is worth knowing before sharing what you imported.
 */

type Entry = Record<string, unknown>;

function asObject(value: unknown): Entry {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Entry) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value);
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

function methodOf(value: unknown): HttpMethod {
  const upper = text(value).toUpperCase() as HttpMethod;
  return METHODS.includes(upper) ? upper : 'GET';
}

/**
 * Headers a browser writes for itself.
 *
 * They describe the browser, not the request someone meant to make, and
 * sending them back is at best noise. The `:authority`-style pseudo-headers are
 * HTTP/2 framing and are not headers at all.
 */
const BROWSER_HEADERS = new Set([
  'accept-encoding',
  'connection',
  'content-length',
  'host',
  'sec-ch-ua',
  'sec-ch-ua-mobile',
  'sec-ch-ua-platform',
  'sec-fetch-dest',
  'sec-fetch-mode',
  'sec-fetch-site',
  'sec-fetch-user',
  'upgrade-insecure-requests',
]);

function headerRows(list: unknown): KeyValue[] {
  return asArray(list)
    .map(asObject)
    .filter((item) => {
      const name = text(item.name).toLowerCase();
      return name && !name.startsWith(':') && !BROWSER_HEADERS.has(name);
    })
    .map((item) => row(text(item.name), text(item.value)));
}

/** `https://api.test/v2/orders?x=1` → `/v2/orders`, for a readable name. */
export function nameFor(method: string, url: string): string {
  try {
    const path = new URL(url).pathname;
    return `${method} ${path === '/' ? '/' : path.replace(/\/$/, '')}`;
  } catch {
    return `${method} ${url.split('?')[0]}`;
  }
}

/** The URL without its query, since the query lives in the params table. */
function withoutQuery(url: string): string {
  const cut = url.indexOf('?');
  return cut === -1 ? url : url.slice(0, cut);
}

function bodyOf(request: Entry): Partial<RequestRecord> {
  const post = asObject(request.postData);
  const mime = text(post.mimeType).toLowerCase();
  const body = text(post.text);
  if (!mime && !body) return { bodyType: 'none' };
  if (mime.includes('json')) return { bodyType: 'json', body };
  if (mime.includes('xml')) return { bodyType: 'xml', body };
  if (mime.includes('x-www-form-urlencoded')) {
    const fields = asArray(post.params)
      .map(asObject)
      .map((param) => row(text(param.name), decodeURIComponent(text(param.value).replace(/\+/g, ' '))));
    return { bodyType: 'form', form: fields };
  }
  if (mime.includes('multipart')) {
    // A HAR records the *encoded* parts; the files themselves are not in it.
    const parts = asArray(post.params)
      .map(asObject)
      .map((param) => {
        const fileName = text(param.fileName);
        return row(text(param.name), fileName ? `(attach ${fileName})` : text(param.value));
      });
    return { bodyType: 'multipart', multipart: parts };
  }
  return { bodyType: 'text', body };
}

/** What a page fetches for itself, rather than what it asks an API for. */
function isNoise(url: string, mimeType: string): boolean {
  if (/\.(png|jpe?g|gif|svg|webp|ico|woff2?|ttf|otf|css|js|mjs|map)(\?|$)/i.test(url)) return true;
  return /^(image|font|text\/css|text\/javascript|application\/javascript)/i.test(mimeType);
}

export function importHar(payload: unknown, workspaceId: string, startIndex = 0): ParsedImport {
  const log = asObject(asObject(payload).log);
  const entries = asArray(log.entries).map(asObject);
  const pages = asArray(log.pages).map(asObject);
  const name = text(pages[0]?.title) || text(asObject(log.creator).name) || 'HAR import';

  const folders: Folder[] = [];
  const root = createFolder(workspaceId, name, null, startIndex);
  folders.push(root);

  const byPage = new Map<string, Folder>();
  const folderFor = (pageRef: string): Folder => {
    if (!pageRef || pages.length < 2) return root;
    const existing = byPage.get(pageRef);
    if (existing) return existing;
    const page = pages.find((item) => text(item.id) === pageRef);
    const folder = createFolder(workspaceId, text(page?.title) || pageRef, root.id, byPage.size);
    byPage.set(pageRef, folder);
    folders.push(folder);
    return folder;
  };

  const requests: RequestRecord[] = [];
  entries.forEach((entry) => {
    const request = asObject(entry.request);
    const url = text(request.url);
    if (!url) return;
    if (isNoise(url, text(asObject(asObject(entry.response).content).mimeType))) return;

    const method = methodOf(request.method);
    requests.push(
      createRequest({
        workspaceId,
        folderId: folderFor(text(entry.pageref)).id,
        name: nameFor(method, url),
        method,
        url: withoutQuery(url),
        params: asArray(request.queryString)
          .map(asObject)
          .map((param) => row(text(param.name), text(param.value))),
        headers: headerRows(request.headers),
        sortIndex: requests.length,
        ...bodyOf(request),
      }),
    );
  });

  return { name, folders, requests, environment: null, variables: [] };
}

export function looksLikeHar(payload: unknown): boolean {
  const log = asObject(asObject(payload).log);
  return Array.isArray(log.entries) && typeof log.version !== 'undefined';
}
