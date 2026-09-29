#!/usr/bin/env node
/**
 * Photograph the real app for the site.
 *
 * The screenshots on the landing page and in the guide are of the running
 * application, not mock-ups: this boots the production web build, loads a demo
 * workspace, drives it the way a person would, and captures what it draws. That
 * is the whole reason it is a script and not a folder of images somebody made
 * once — the site is documentation, and a picture of last year's interface is a
 * documentation bug.
 *
 * Run it whenever the interface changes enough to notice:
 *
 *   # 1. build the web app and serve it
 *   PORT=5173 BASE_PATH=/ pnpm --filter @workspace/api-workbench exec vite build
 *   npx serve -s artifacts/api-workbench/dist/public -l 21728
 *
 *   # 2. photograph it (needs Playwright and ImageMagick's `convert`)
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node site/tools/screenshots.mjs
 *
 * Playwright is deliberately not a dependency of this repository — it would
 * add a browser download to every install for a step run a few times a year —
 * so it is located through PLAYWRIGHT_MODULE, or plain `playwright` if that is
 * resolvable from here.
 *
 * ── What is real and what is staged ───────────────────────────────────────
 *
 * The interface is real. The workspace is staged: a fictional "Pokédex" API on
 * `.example`, a top-level domain RFC 2606 reserves so that it can never be
 * somebody's real service, and its responses are served by the script rather
 * than by a network. Nothing here pretends a real service said something it
 * did not. The screenshots show the web build, which is the same interface as
 * the desktop app; the label under a response that says it was sent "through
 * the browser" is left in rather than cropped out, because cropping evidence
 * to look better is how a screenshot becomes an advertisement for something
 * else.
 *
 * ── Fonts ────────────────────────────────────────────────────────────────
 *
 * The app loads Inter and JetBrains Mono from Google Fonts. Headless Chromium
 * here cannot reach them (and TLS verification is not something to switch off
 * for a screenshot), so the files are fetched with `curl` — which trusts the
 * system's certificate store — cached, and handed to the browser through
 * request interception. Without this the pictures would come out in a fallback
 * face and look like a different product.
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../assets/shots');
const CACHE = resolve(HERE, '../.cache');
const APP = process.env.APP_URL ?? 'http://localhost:21728/';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright').catch(() => {
  console.error('Playwright not found. Set PLAYWRIGHT_MODULE to its index.mjs.');
  process.exit(1);
});

/* ------------------------------ fonts ---------------------------------- */

const FONT_CSS_URL =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap';

function curl(url, file) {
  execFileSync('curl', ['-sSfL', '--max-time', '30', '-A', 'Mozilla/5.0 (X11; Linux x86_64) Chrome/120 Safari/537.36', '-o', file, url]);
}

/** The stylesheet and every font file it names, cached on disk. */
function loadFonts() {
  mkdirSync(join(CACHE, 'fonts'), { recursive: true });
  const cssFile = join(CACHE, 'fonts.css');
  if (!existsSync(cssFile)) curl(FONT_CSS_URL, cssFile);
  const css = readFileSync(cssFile, 'utf8');

  const files = new Map();
  for (const match of css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)) {
    const url = match[1];
    const local = join(CACHE, 'fonts', `${createHash('sha1').update(url).digest('hex')}.woff2`);
    if (!existsSync(local)) curl(url, local);
    files.set(url, local);
  }
  return { css, files };
}

/* ---------------------------- demo workspace --------------------------- */

const LOCALES = {
  en: {
    tag: 'en-US',
    workspace: 'Pokédex',
    folders: { pokemon: 'Pokémon', trainers: 'Trainers' },
    requests: { get: 'Get pokémon', list: 'List pokémon', register: 'Register trainer' },
    environments: { base: 'Base', staging: 'Staging', production: 'Production' },
  },
  'pt-BR': {
    tag: 'pt-BR',
    workspace: 'Pokédex',
    folders: { pokemon: 'Pokémon', trainers: 'Treinadores' },
    requests: { get: 'Buscar pokémon', list: 'Listar pokémon', register: 'Cadastrar treinador' },
    environments: { base: 'Base', staging: 'Homologação', production: 'Produção' },
  },
  es: {
    tag: 'es-ES',
    workspace: 'Pokédex',
    folders: { pokemon: 'Pokémon', trainers: 'Entrenadores' },
    requests: { get: 'Obtener pokémon', list: 'Listar pokémon', register: 'Registrar entrenador' },
    environments: { base: 'Base', staging: 'Preproducción', production: 'Producción' },
  },
};

const NOW = '2026-01-15T10:00:00.000Z';
let counter = 0;
const id = (prefix) => `${prefix}_demo${(counter += 1).toString().padStart(3, '0')}`;
const row = (key, value, enabled = true) => ({ id: id('row'), key, value, enabled });
const noAuth = (type = 'none') => ({
  type, token: '', username: '', password: '', apiKeyName: '', apiKeyValue: '', apiKeyIn: 'header',
});

function request(workspaceId, folderId, name, patch) {
  return {
    id: id('req'), workspaceId, folderId, name, method: 'GET', url: '', description: '',
    params: [], headers: [], bodyType: 'none', body: '', form: [], multipart: [],
    graphql: { query: '', variables: '' }, auth: noAuth('inherit'), preScript: '', postScript: '',
    sortIndex: 0, createdAt: NOW, updatedAt: NOW, ...patch,
  };
}

/** The whole state a screenshot needs, built on top of what the app booted with. */
function demoState(base, copy, { theme }) {
  counter = 0;
  const workspaceId = id('ws');
  const workspace = { id: workspaceId, name: copy.workspace, createdAt: NOW };

  const pokemonFolder = {
    id: id('fld'), workspaceId, parentId: null, name: copy.folders.pokemon, color: '#5b83f5', sortIndex: 0,
    // The blue "local" variable: it beats every environment, which is the thing
    // the colour is there to make visible.
    variables: [row('pokemon', 'pikachu')],
    auth: noAuth('inherit'), preScript: '', postScript: '',
  };
  const trainersFolder = {
    id: id('fld'), workspaceId, parentId: null, name: copy.folders.trainers, color: '#e0913f', sortIndex: 1,
    variables: [], auth: noAuth('inherit'), preScript: '', postScript: '',
  };

  const baseEnvironment = {
    id: id('env'), workspaceId, name: copy.environments.base, isBase: true, color: '#8a919e',
    variables: [row('baseUrl', 'https://api.pokedex.example/v2'), row('token', 'demo-token-0000')],
  };
  const staging = {
    id: id('env'), workspaceId, name: copy.environments.staging, isBase: false, color: '#e0913f',
    variables: [row('baseUrl', 'https://staging.pokedex.example/v2')],
  };
  const production = {
    id: id('env'), workspaceId, name: copy.environments.production, isBase: false, color: '#57b981',
    variables: [row('baseUrl', 'https://api.pokedex.example/v2'), row('region', 'eu-west')],
  };

  const get = request(workspaceId, pokemonFolder.id, copy.requests.get, {
    method: 'GET', url: '{{baseUrl}}/pokemon/{{pokemon}}', sortIndex: 0,
    headers: [row('Accept', 'application/json'), row('Cache-Control', 'no-cache')],
    auth: { ...noAuth('bearer'), token: '{{token}}' },
  });
  const list = request(workspaceId, pokemonFolder.id, copy.requests.list, {
    method: 'GET', url: '{{baseUrl}}/pokemon?limit=20&offset=0', sortIndex: 1,
    params: [{ ...row('limit', '20'), source: 'url' }, { ...row('offset', '0'), source: 'url' }],
  });
  const register = request(workspaceId, trainersFolder.id, copy.requests.register, {
    method: 'POST', url: '{{baseUrl}}/trainers', sortIndex: 0,
    bodyType: 'json',
    body: '{\n  "name": "{{$randomFullName}}",\n  "email": "{{$randomEmail}}",\n  "phone": "{{$randomPhoneNumber}}",\n  "city": "{{$randomCity}}"\n}',
    headers: [row('Content-Type', 'application/json')],
    auth: { ...noAuth('bearer'), token: '{{token}}' },
  });

  return {
    ...base,
    workspaces: [workspace],
    folders: [pokemonFolder, trainersFolder],
    requests: [get, list, register],
    environments: [baseEnvironment, staging, production],
    responses: [],
    drafts: {},
    versions: [],
    activeWorkspaceId: workspaceId,
    activeEnvironmentId: production.id,
    openTabIds: [get.id, list.id, register.id],
    activeRequestId: get.id,
    activeFolderId: null,
    settings: { ...base.settings, theme, language: undefined, dataLanguage: undefined },
    /* handy for the driver below */
    __ids: { get: get.id, list: list.id, register: register.id },
  };
}

/* ------------------------------ mock API ------------------------------- */

const POKEMON = {
  id: 25,
  name: 'pikachu',
  height: 4,
  weight: 60,
  base_experience: 112,
  types: ['electric'],
  abilities: [
    { name: 'static', hidden: false },
    { name: 'lightning-rod', hidden: true },
  ],
  sprites: { front_default: 'https://cdn.pokedex.example/sprites/25.png' },
};

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
  'access-control-expose-headers': '*',
};

async function mockApi(page) {
  await page.route('https://*.pokedex.example/**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    // A believable latency, so the timing chip reads like a network and not 0 ms.
    await new Promise((done) => setTimeout(done, 118));

    const headers = {
      ...CORS,
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=3600',
      'x-request-id': 'b1f9c3a0-6e0d-4d2a-9d55-0c7d2b8a41e7',
    };

    /*
      A POST is answered with what it carried. The point of the generated-data
      screenshot is that the values in the response are *the ones the app just
      made up* — a name, an e-mail and a city in the language of the interface —
      and an echo is the only way for the picture to show that without the
      script inventing them.
    */
    if (request.method() === 'POST') {
      let sent = {};
      try {
        sent = request.postDataJSON() ?? {};
      } catch {
        // An unparsable body is echoed as nothing, which is what a server would say.
      }
      return route.fulfill({
        status: 201,
        headers,
        body: JSON.stringify({ id: 8214, ...sent, created_at: '2026-01-15T10:00:00Z' }, null, 2),
      });
    }

    return route.fulfill({ status: 200, headers, body: JSON.stringify(POKEMON, null, 2) });
  });
}

async function serveFonts(page, fonts) {
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: fonts.css }),
  );
  await page.route('https://fonts.gstatic.com/**', (route) => {
    const local = fonts.files.get(route.request().url());
    return local
      ? route.fulfill({ status: 200, contentType: 'font/woff2', body: readFileSync(local) })
      : route.abort();
  });
}

/* ------------------------------- driving ------------------------------- */

async function newPage(browser, locale, state) {
  const context = await browser.newContext({
    locale: locale.tag,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
  });
  // Set before the app starts. Writing storage while it runs is a race the app
  // wins, and a screenshot of whatever the race produced is not a screenshot.
  // `__ids` is the driver's own bookkeeping; it has no business in the app's storage.
  const { __ids: _ids, ...stored } = state;
  await context.addInitScript((seeded) => {
    localStorage.setItem('api-workbench:state', seeded);
  }, JSON.stringify(stored));
  const page = await context.newPage();
  return { context, page };
}

async function settle(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350);
}

/** Radix holds `pointer-events: none` on <body> while a select or dialog closes. */
async function idle(page) {
  await page.waitForFunction(() => !document.body.style.pointerEvents);
}

function toWebp(png, webp) {
  execFileSync('convert', [png, '-quality', '82', '-define', 'webp:method=6', webp]);
  rmSync(png);
}

async function shoot(page, locale, name) {
  const dir = join(OUT, locale);
  mkdirSync(dir, { recursive: true });
  const png = join(dir, `${name}.png`);
  await page.screenshot({ path: png });
  toWebp(png, join(dir, `${name}.webp`));
  console.log(`  ${locale}/${name}.webp`);
}

async function main() {
  const fonts = loadFonts();
  const browser = await chromium.launch();

  // The state the app boots with is the base: it carries the right version and
  // settings shape, which is not something to reproduce by hand and get wrong.
  const probe = await browser.newContext();
  const probePage = await probe.newPage();
  await probePage.goto(APP, { waitUntil: 'networkidle' });
  const baseState = JSON.parse(await probePage.evaluate(() => localStorage.getItem('api-workbench:state')));
  await probe.close();

  for (const [name, copy] of Object.entries(LOCALES)) {
    console.log(name);

    /* 1. The workbench, after a request — the hero. */
    {
      const state = demoState(baseState, copy, { theme: 'dark' });
      const { context, page } = await newPage(browser, copy, state);
      await serveFonts(page, fonts);
      await mockApi(page);
      await page.goto(APP, { waitUntil: 'networkidle' });
      await page.getByTestId('button-send-request').click();
      await page.getByText('pikachu').first().waitFor();
      await page.getByRole('tab', { name: /^(Headers|Cabeçalhos|Cabeceras)/ }).first().click();
      await settle(page);
      await shoot(page, name, 'workbench');

      /* 2. The environments drawer, over the same request. */
      await page.keyboard.press('Control+e');
      await page.getByTestId('drawer-environments').waitFor();
      await settle(page);
      await shoot(page, name, 'environments');
      await page.keyboard.press('Escape');
      await page.getByTestId('drawer-environments').waitFor({ state: 'hidden' });

      /* 3. The command palette. */
      await page.keyboard.press('Control+k');
      await page.getByTestId('dialog-command-palette').waitFor();
      await settle(page);
      await shoot(page, name, 'palette');
      await context.close();
    }

    /* 4. A body of generated data, sent, with the popover open on the last one. */
    {
      const state = demoState(baseState, copy, { theme: 'dark' });
      state.activeRequestId = state.__ids.register;
      const { context, page } = await newPage(browser, copy, state);
      await serveFonts(page, fonts);
      await mockApi(page);
      await page.goto(APP, { waitUntil: 'networkidle' });
      await page.getByRole('tab', { name: /^(Body|Corpo|Cuerpo)/ }).click();
      await idle(page);
      await page.getByTestId('button-send-request').click();
      await page.getByText('8214').first().waitFor();
      /*
        The last generator, not the first. The popover opens below the chip and
        covers the lines under it, so hovering the first would hide the other
        two — and "several of these in one body" is the point.
      */
      await page.getByTestId('body-var-$randomCity').waitFor();
      const chip = await page.getByTestId('body-var-$randomCity').boundingBox();
      await page.mouse.move(chip.x + chip.width / 2, chip.y + chip.height / 2);
      await page.getByTestId('popover-variable').waitFor({ timeout: 4000 });
      await settle(page);
      await shoot(page, name, 'generated');
      await context.close();
    }

    /* 5. Light theme. The same screen, so the only difference is the colour. */
    {
      const state = demoState(baseState, copy, { theme: 'light' });
      const { context, page } = await newPage(browser, copy, state);
      await serveFonts(page, fonts);
      await mockApi(page);
      await page.goto(APP, { waitUntil: 'networkidle' });
      await page.getByTestId('button-send-request').click();
      await page.getByText('pikachu').first().waitFor();
      await settle(page);
      await shoot(page, name, 'light');
      await context.close();
    }
  }

  await browser.close();
}

await main();
