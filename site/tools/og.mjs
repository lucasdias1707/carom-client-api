/*
  The card that shows when a link to the site is pasted somewhere: 1200×630, one
  per language, made from the same screenshot and the same words as the page.

    PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node site/tools/og.mjs
*/
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LOCALES } from '../lib/facts.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || 'playwright').href);

const logo = (await readFile(join(ROOT, 'assets', 'logo.svg'), 'utf8')).replace(/ width="512" height="512"/, '');
await mkdir(join(ROOT, 'assets', 'og'), { recursive: true });

const browser = await chromium.launch();
for (const locale of LOCALES) {
  const c = (await import(`../content/${locale}.mjs`)).default;
  const shot = (await readFile(join(ROOT, 'assets', 'shots', locale, 'workbench.webp'))).toString('base64');
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(`<!doctype html><html><body style="margin:0"><style>
    *{box-sizing:border-box}
    body{width:1200px;height:630px;overflow:hidden;background:#131519;color:#dce0e7;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;position:relative}
    .glow{position:absolute;inset:0;background:radial-gradient(60% 70% at 8% 0%,rgba(91,131,245,.35),transparent 70%),radial-gradient(45% 55% at 100% 100%,rgba(224,145,63,.22),transparent 70%)}
    .brand{position:absolute;left:72px;top:64px;display:flex;align-items:center;gap:16px;font-size:34px;font-weight:700}
    .brand svg{width:52px;height:52px;border-radius:12px}
    h1{position:absolute;left:72px;top:150px;width:520px;margin:0;font-size:58px;line-height:1.06;letter-spacing:-.035em}
    .grad{background:linear-gradient(100deg,#5b83f5,#a97ad6 55%,#e0913f);-webkit-background-clip:text;background-clip:text;color:transparent}
    p{position:absolute;left:72px;bottom:56px;width:500px;margin:0;font-size:24px;line-height:1.4;color:#9aa3b2}
    .win{position:absolute;left:640px;top:120px;width:760px;border-radius:16px;overflow:hidden;background:#1b1e24;border:1px solid #2b3038;box-shadow:0 40px 90px rgba(0,0,0,.6)}
    .win i{display:inline-block;width:11px;height:11px;border-radius:50%;background:#2b3038;margin:12px 0 12px 7px}
    .win i:first-child{margin-left:14px}
    .win img{display:block;width:760px;height:475px}
  </style><div class="glow"></div>
  <div class="brand">${logo}<span>Carom</span></div>
  <h1>${c.home.hero.title} <span class="grad">${c.home.hero.accent}</span></h1>
  <p>${c.home.hero.eyebrow} · macOS · Windows · Linux</p>
  <div class="win"><div><i></i><i></i><i></i></div><img alt="" src="data:image/webp;base64,${shot}"></div></body></html>`);
  await page.screenshot({ path: join(ROOT, 'assets', 'og', `${locale}.png`) });
  await page.close();
}
await browser.close();
console.log('og cards written');
