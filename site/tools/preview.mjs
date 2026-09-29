/*
  Serves site/dist the way GitHub Pages will: under /carom-client-api/, with
  directory URLs resolving to index.html. Serving it from `/` would hide the one
  class of bug that only shows up in production — a link that assumed the root.

    node site/build.mjs && node site/tools/preview.mjs   →  http://localhost:4173/carom-client-api/
*/
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const BASE = '/carom-client-api/';
const PORT = Number(process.env.PORT || 4173);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain',
};

createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (!url.pathname.startsWith(BASE)) {
    response.writeHead(302, { location: BASE }).end();
    return;
  }
  let file = normalize(join(DIST, decodeURIComponent(url.pathname.slice(BASE.length))));
  if (!file.startsWith(DIST)) return response.writeHead(403).end();
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    response.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}${BASE}`));
