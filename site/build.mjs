/*
  Builds the site into site/dist. No dependencies: it is a few templates and a
  loop, and a site with a build that needs installing is a site whose deploy
  breaks the day a package does.

    node site/build.mjs            build
    SITE_URL=https://… node …      absolute URLs (canonical, social cards) for a different host
*/
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOCALES, loadFacts } from './lib/facts.mjs';
import { guidePage, homePage, SITE_URL } from './lib/pages.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, 'dist');

/** The same keys, the same array lengths, all the way down — or say where not. */
function sameShape(a, b, path, problems) {
  if (Array.isArray(a) !== Array.isArray(b) || typeof a !== typeof b) {
    problems.push(`${path}: different kind of value`);
  } else if (Array.isArray(a)) {
    if (a.length !== b.length) problems.push(`${path}: ${a.length} items against ${b.length}`);
    for (let i = 0; i < Math.min(a.length, b.length); i++) sameShape(a[i], b[i], `${path}[${i}]`, problems);
  } else if (a && typeof a === 'object') {
    for (const key of Object.keys(a)) {
      if (!(key in b)) problems.push(`${path}.${key}: missing`);
      else sameShape(a[key], b[key], `${path}.${key}`, problems);
    }
    for (const key of Object.keys(b)) if (!(key in a)) problems.push(`${path}.${key}: extra`);
  }
}

const contents = {};
for (const locale of LOCALES) contents[locale] = (await import(`./content/${locale}.mjs`)).default;

const problems = [];
for (const locale of LOCALES.slice(1)) sameShape(contents.en, contents[locale], locale, problems);
if (problems.length) {
  console.error(`The languages do not line up:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}

const facts = await loadFacts();

await rm(DIST, { recursive: true, force: true });
await mkdir(join(DIST, 'assets'), { recursive: true });
await cp(join(ROOT, 'assets'), join(DIST, 'assets'), { recursive: true });
await cp(join(ROOT, 'src', 'style.css'), join(DIST, 'assets', 'style.css'));
await cp(join(ROOT, 'src', 'site.js'), join(DIST, 'assets', 'site.js'));

const urls = [];
for (const locale of LOCALES) {
  const c = contents[locale];
  const base = locale === 'en' ? '' : `${locale}/`;
  await mkdir(join(DIST, base, 'guide'), { recursive: true });
  await writeFile(join(DIST, base, 'index.html'), homePage(c));
  await writeFile(join(DIST, base, 'guide', 'index.html'), guidePage(c, facts));
  urls.push(`${SITE_URL}${base}`, `${SITE_URL}${base}guide/`);
}

// Pages serves this file for anything it cannot find; without it, a Jekyll pass would eat `_`-prefixed paths.
await writeFile(join(DIST, '.nojekyll'), '');
await writeFile(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}sitemap.xml\n`);
await writeFile(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n')}\n</urlset>\n`,
);
await writeFile(
  join(DIST, '404.html'),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Not found · Carom</title><meta name="robots" content="noindex"><style>body{font:16px/1.5 system-ui,sans-serif;background:#131519;color:#dce0e7;display:grid;place-items:center;min-height:100vh;margin:0}main{text-align:center;padding:24px}a{color:#7c9cf7}</style></head><body><main><h1>404</h1><p>That page is not here.</p><p><a href="${SITE_URL}">Carom</a> · <a href="${SITE_URL}guide/">Guide</a></p></main></body></html>\n`,
);

console.log(`Built ${urls.length} pages (${facts.shortcuts.length} shortcuts, ${facts.generators.length} generators) into site/dist`);
