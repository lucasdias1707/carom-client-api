/*
  Checks the built site (run `node site/build.mjs` first). It looks for the
  mistakes a static site makes silently: a link to a page that is not there, an
  anchor that lost its heading, an image nobody described, markup left open, and
  words that must never reach a public page.

  Links are followed as a browser would from where the page is served, so a link
  that only works from the site root fails here, not on GitHub.
*/
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), 'dist');
const PAGES = ['', 'guide/', 'pt-BR/', 'pt-BR/guide/', 'es/', 'es/guide/'];
const LANG = { '': 'en', 'guide/': 'en', 'pt-BR/': 'pt-BR', 'pt-BR/guide/': 'pt-BR', 'es/': 'es', 'es/guide/': 'es' };
const VOID = new Set(['meta', 'link', 'img', 'br', 'hr', 'input', 'source', 'path', 'circle', 'rect', 'stop']);
const HOSTS = new Set(['github.com', 'lucasdias1707.github.io']);
const FORBIDDEN = [
  // The word the repository owner keeps out of everything (see CLAUDE.md); spelled in two halves so this file does not carry it.
  [new RegExp('rep' + 'lit', 'i'), 'a word the repository keeps out of every file'],
  [/claude\.ai\/code/i, 'a Claude session link'],
  [/session_[A-Za-z0-9]{12,}/, 'a session id'],
];

const problems = [];
const fail = (page, message) => problems.push(`${page || '/'}: ${message}`);

async function exists(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

const pages = new Map();
for (const page of PAGES) {
  const file = join(DIST, page, 'index.html');
  if (!(await exists(file))) {
    fail(page, 'not built');
    continue;
  }
  pages.set(page, await readFile(file, 'utf8'));
}

for (const [page, html] of pages) {
  /* Structure */
  const stack = [];
  for (const match of html.matchAll(/<(\/?)([a-zA-Z][\w-]*)\b[^>]*?(\/?)>/g)) {
    const [, closing, name, selfClosed] = match;
    const tag = name.toLowerCase();
    if (VOID.has(tag) || selfClosed) continue;
    if (!closing) stack.push(tag);
    else if (stack.pop() !== tag) fail(page, `</${tag}> does not match what was open`);
  }
  if (stack.length) fail(page, `left open: ${stack.join(', ')}`);

  if (!html.startsWith('<!doctype html>')) fail(page, 'no doctype');
  if (!new RegExp(`<html lang="${LANG[page]}"`).test(html)) fail(page, `<html lang> is not ${LANG[page]}`);
  if ((html.match(/<h1[ >]/g) || []).length !== 1) fail(page, 'needs exactly one <h1>');
  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
  if (description.length < 50 || description.length > 200) fail(page, `description is ${description.length} characters`);
  if (!/<title>[^<]{10,}<\/title>/.test(html)) fail(page, 'missing or short <title>');
  for (const locale of ['en', 'pt-BR', 'es', 'x-default']) {
    if (!html.includes(`hreflang="${locale}"`)) fail(page, `no hreflang ${locale}`);
  }

  /* Ids */
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  for (const id of ids) if (ids.indexOf(id) !== ids.lastIndexOf(id)) fail(page, `duplicate id “${id}”`);

  /* Images */
  for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\salt="/.test(tag)) fail(page, `image without alt: ${tag.slice(0, 80)}`);
    if (!/\swidth="/.test(tag) || !/\sheight="/.test(tag)) fail(page, `image without size: ${tag.slice(0, 80)}`);
  }

  /* Links and files, as served from where the page lives */
  for (const [, attribute, value] of html.matchAll(/\s(href|src)="([^"]*)"/g)) {
    if (/^(mailto:|data:|javascript:)/.test(value)) continue;
    if (/^https?:\/\//.test(value)) {
      const host = new URL(value).hostname;
      if (attribute === 'src' || !HOSTS.has(host)) fail(page, `unexpected external ${attribute}: ${value}`);
      continue;
    }
    const [path, hash] = value.split('#');
    const target = path ? posix.normalize(posix.join(page, path)) : page;
    const asDirectory = target === '.' || target === '' ? '' : target;
    let file = join(DIST, asDirectory);
    let targetPage = asDirectory.endsWith('/') || asDirectory === '' ? asDirectory : null;
    if (targetPage === null && !(await exists(file))) {
      // `guide` without a slash: a directory the server would redirect.
      file = join(DIST, asDirectory, 'index.html');
      targetPage = asDirectory + '/';
    } else if (targetPage !== null) {
      file = join(DIST, targetPage, 'index.html');
    }
    if (!(await exists(file))) {
      fail(page, `${attribute} points nowhere: ${value}`);
      continue;
    }
    if (hash && (targetPage ?? null) !== null) {
      const html2 = pages.get(targetPage) ?? (await readFile(file, 'utf8'));
      if (!new RegExp(`\\sid="${hash.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(html2)) {
        fail(page, `anchor #${hash} is not on ${targetPage || '/'}`);
      }
    }
  }

  /* Words that must never ship */
  for (const [pattern, what] of FORBIDDEN) if (pattern.test(html)) fail(page, `contains ${what}`);
}

/* Everything shipped, not only the pages */
async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}
let bytes = 0;
for await (const file of walk(DIST)) {
  const size = (await stat(file)).size;
  bytes += size;
  if (/\.(html|css|js|xml|txt|svg)$/.test(file)) {
    const text = await readFile(file, 'utf8');
    for (const [pattern, what] of FORBIDDEN) if (pattern.test(text)) fail(file.slice(DIST.length), `contains ${what}`);
  }
  if (/\.(webp|png)$/.test(file) && size > 400 * 1024) fail(file.slice(DIST.length), `image is ${Math.round(size / 1024)} KB`);
}

const sitemap = await readFile(join(DIST, 'sitemap.xml'), 'utf8');
if ((sitemap.match(/<loc>/g) || []).length !== PAGES.length) fail('sitemap.xml', `expected ${PAGES.length} URLs`);

if (problems.length) {
  console.error(`${problems.length} problem${problems.length === 1 ? '' : 's'} in the site:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`Site OK: ${pages.size} pages, ${(bytes / 1024 / 1024).toFixed(1)} MB`);
