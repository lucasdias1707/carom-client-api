/*
  The two page templates. Content comes in as data (content/<locale>.mjs); nothing
  in here is language-specific, so a fourth language is a fourth content file.
*/
import { posix } from 'node:path';
import { LOCALES, keycap } from './facts.mjs';
import { esc, icon, inline, keys } from './render.mjs';

export const REPO = 'https://github.com/lucasdias1707/carom-client-api';
export const RELEASES = `${REPO}/releases/latest`;
export const SITE_URL = (process.env.SITE_URL || 'https://lucasdias1707.github.io/carom-client-api/').replace(/\/?$/, '/');

/** Installers, matched against release asset names by the script in site.js. */
const PLATFORMS = [
  { id: 'mac', icon: 'terminal', variants: [['Apple Silicon (.dmg)', 'aarch64\\.dmg$'], ['Intel (.dmg)', 'x64\\.dmg$']] },
  { id: 'win', icon: 'layers', variants: [['.exe', 'x64-setup\\.exe$'], ['.msi', '\\.msi$']] },
  { id: 'linux', icon: 'code', variants: [['.deb', '\\.deb$'], ['.rpm', '\\.rpm$'], ['.AppImage', '\\.AppImage$']] },
];

/** Where a page lives, as a directory under the site root. */
const dirOf = (locale, kind) =>
  [locale === 'en' ? '' : locale, kind === 'guide' ? 'guide' : ''].filter(Boolean).join('/');

/** A link from one page to another, relative, so the site works under any base path. */
export function link(from, to, hash = '') {
  const path = posix.relative(dirOf(from.locale, from.kind) || '.', dirOf(to.locale, to.kind) || '.') || '.';
  return `${path}/${hash}`.replace(/^\.\/#/, './#');
}

const assets = (page) => posix.relative(dirOf(page.locale, page.kind) || '.', 'assets') || 'assets';

function head(page, c, meta) {
  const own = link(page, page);
  const url = SITE_URL + dirOf(page.locale, page.kind) + (dirOf(page.locale, page.kind) ? '/' : '');
  const alternates = LOCALES.map((locale) => {
    const target = dirOf(locale, page.kind);
    return `<link rel="alternate" hreflang="${locale}" href="${SITE_URL}${target}${target ? '/' : ''}">`;
  }).join('\n');
  const image = `${SITE_URL}assets/og/${page.locale}.png`;
  return `<!doctype html>
<html lang="${c.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(meta.description)}">
<meta name="color-scheme" content="dark light">
<meta name="theme-color" content="#131519">
<link rel="canonical" href="${url}">
${alternates}
<link rel="alternate" hreflang="x-default" href="${SITE_URL}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Carom">
<meta property="og:title" content="${esc(meta.title)}">
<meta property="og:description" content="${esc(meta.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="${assets(page)}/logo.svg">
<link rel="stylesheet" href="${assets(page)}/style.css">
<script>try{var t=localStorage.getItem('carom-site-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
</head>`;
}

function header(page, c) {
  const home = { locale: page.locale, kind: 'home' };
  const guide = { locale: page.locale, kind: 'guide' };
  const nav =
    page.kind === 'home'
      ? [
          ['#features', c.ui.nav.features],
          ['#tour', c.ui.nav.tour],
          ['#download', c.ui.nav.download],
          [link(page, guide), c.ui.nav.guide],
        ]
      : [
          [link(page, home), c.ui.nav.home],
          [link(page, guide), c.ui.nav.guide, true],
          [link(page, home, '#download'), c.ui.nav.download],
        ];
  const languages = LOCALES.map((locale) => {
    const target = { locale, kind: page.kind };
    const names = { en: 'English', 'pt-BR': 'Português (BR)', es: 'Español' };
    return `<a href="${link(page, target)}" hreflang="${locale}" lang="${locale}"${locale === page.locale ? ' aria-current="true"' : ''}>${names[locale]}</a>`;
  }).join('');
  return `<a class="skip" href="#main">${esc(c.ui.nav.skip)}</a>
<header class="top">
  <div class="wrap top-in">
    <a class="brand" href="${link(page, home)}" aria-label="Carom">
      <img src="${assets(page)}/logo.svg" width="28" height="28" alt=""><span>Carom</span>
    </a>
    <nav class="nav" aria-label="${esc(c.ui.nav.label)}">
      ${nav.map(([href, label, current]) => `<a href="${href}"${current ? ' aria-current="page"' : ''}>${esc(label)}</a>`).join('\n      ')}
    </nav>
    <div class="tools">
      <details class="lang">
        <summary aria-label="${esc(c.ui.nav.language)}">${icon('lang', 18)}<span>${esc(page.locale === 'pt-BR' ? 'PT' : page.locale.toUpperCase())}</span></summary>
        <div class="lang-menu">${languages}</div>
      </details>
      <button class="icon-btn" type="button" data-theme-toggle aria-label="${esc(c.ui.nav.theme)}">
        <span class="when-dark">${icon('sun', 18)}</span><span class="when-light">${icon('moon', 18)}</span>
      </button>
      <a class="icon-btn" href="${REPO}" rel="noopener" target="_blank" aria-label="GitHub">${icon('branch', 18)}</a>
    </div>
  </div>
</header>`;
}

function footer(page, c) {
  const home = { locale: page.locale, kind: 'home' };
  const guide = { locale: page.locale, kind: 'guide' };
  return `<footer class="foot">
  <div class="wrap foot-in">
    <div class="foot-brand"><img src="${assets(page)}/logo.svg" width="24" height="24" alt=""><strong>Carom</strong><span>${esc(c.ui.footer.tagline)}</span></div>
    <nav class="foot-links" aria-label="${esc(c.ui.footer.label)}">
      <a href="${link(page, home, '#download')}">${esc(c.ui.nav.download)}</a>
      <a href="${link(page, guide)}">${esc(c.ui.nav.guide)}</a>
      <a href="${REPO}/releases" rel="noopener" target="_blank">${esc(c.ui.footer.releases)}</a>
      <a href="${REPO}/issues" rel="noopener" target="_blank">${esc(c.ui.footer.issues)}</a>
      <a href="${REPO}" rel="noopener" target="_blank">GitHub</a>
    </nav>
  </div>
</footer>
<script src="${assets(page)}/site.js" defer></script>
</body>
</html>`;
}

const shot = (page, name, alt, extra = '') =>
  `<img class="shot" src="${assets(page)}/shots/${page.locale}/${name}.webp" width="1600" height="1000" alt="${esc(alt)}" ${extra}>`;

const windowed = (page, name, alt, eager = false) =>
  `<figure class="window"><div class="window-bar" aria-hidden="true"><i></i><i></i><i></i></div>${shot(page, name, alt, eager ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"')}</figure>`;

/* ───────────────────────────── landing ───────────────────────────── */

function downloadSection(page, c) {
  const d = c.home.download;
  const cards = PLATFORMS.map((platform) => {
    const text = d.platforms[platform.id];
    return `<article class="platform" data-platform="${platform.id}">
      <div class="platform-head">${icon(platform.icon, 22)}<h3>${esc(text.name)}</h3></div>
      <p>${inline(text.detail)}</p>
      <div class="platform-links">
        ${platform.variants
          .map(([label, pattern], index) => `<a class="btn ${index === 0 ? 'btn-primary' : 'btn-ghost'}" href="${RELEASES}" rel="noopener" data-asset="${esc(pattern)}">${icon('download', 16)}${esc(label)}</a>`)
          .join('\n        ')}
      </div>
    </article>`;
  }).join('\n    ');
  const firstRun = d.firstRun.items
    .map(
      (item) => `<details class="fold" id="first-run-${item.id}">
      <summary>${esc(item.title)}${icon('chevron', 18)}</summary>
      <div class="fold-body"><p>${inline(item.text)}</p>${item.command ? `<pre class="code"><code>${esc(item.command)}</code></pre>` : ''}${item.after ? `<p>${inline(item.after)}</p>` : ''}</div>
    </details>`,
    )
    .join('\n    ');
  return `<section class="band" id="download">
  <div class="wrap">
    <header class="section-head"><h2>${esc(d.title)}</h2><p>${inline(d.lead)}</p></header>
    <p class="version" data-version hidden></p>
    <div class="platforms">
    ${cards}
    </div>
    <p class="muted center">${inline(d.note)} <a href="${RELEASES}" rel="noopener" target="_blank">${esc(d.releases)}</a></p>
    <div class="first-run">
      <h3>${esc(d.firstRun.title)}</h3>
      <p class="muted">${inline(d.firstRun.lead)}</p>
      ${firstRun}
      <h3 class="spaced">${esc(d.updates.title)}</h3>
      <p class="muted">${inline(d.updates.text)}</p>
    </div>
  </div>
</section>`;
}

export function homePage(c) {
  const page = { locale: c.locale, kind: 'home' };
  const h = c.home;
  const guide = { locale: c.locale, kind: 'guide' };
  const tour = h.tour.items
    .map(
      (item, index) => `<article class="tour-item${index % 2 ? ' flip' : ''}">
      <div class="tour-text">
        <span class="chip">${icon(item.icon, 16)}${esc(item.kicker)}</span>
        <h3>${esc(item.title)}</h3>
        <p>${inline(item.text)}</p>
        <ul class="ticks">${item.bullets.map((bullet) => `<li>${icon('check', 16)}<span>${inline(bullet)}</span></li>`).join('')}</ul>
      </div>
      ${windowed(page, item.shot, item.alt)}
    </article>`,
    )
    .join('\n    ');

  const body = `<body class="home">
${header(page, c)}
<main id="main">
  <section class="hero">
    <div class="wrap hero-in">
      <p class="eyebrow">${icon('zap', 14)}${esc(h.hero.eyebrow)}</p>
      <h1>${esc(h.hero.title)} <span class="grad">${esc(h.hero.accent)}</span></h1>
      <p class="lead">${inline(h.hero.lead)}</p>
      <div class="cta">
        <a class="btn btn-primary btn-lg" href="#download">${icon('download', 18)}${esc(h.hero.download)}</a>
        <a class="btn btn-ghost btn-lg" href="${link(page, guide)}">${icon('book', 18)}${esc(h.hero.guide)}</a>
      </div>
      <p class="hero-note">${inline(h.hero.note)}</p>
    </div>
    <div class="wrap hero-shot">${windowed(page, 'workbench', h.hero.shotAlt, true)}</div>
  </section>

  <section class="section" id="features">
    <div class="wrap">
      <header class="section-head"><h2>${esc(h.pillars.title)}</h2><p>${inline(h.pillars.lead)}</p></header>
      <div class="grid">
        ${h.pillars.items.map((item) => `<article class="card"><span class="card-ico">${icon(item.icon, 22)}</span><h3>${esc(item.title)}</h3><p>${inline(item.text)}</p></article>`).join('\n        ')}
      </div>
    </div>
  </section>

  <section class="section tint" id="tour">
    <div class="wrap">
      <header class="section-head"><h2>${esc(h.tour.title)}</h2><p>${inline(h.tour.lead)}</p></header>
      ${tour}
      <p class="muted center small">${inline(h.tour.caption)}</p>
    </div>
  </section>

  <section class="section" id="desktop">
    <div class="wrap">
      <header class="section-head"><h2>${esc(h.native.title)}</h2><p>${inline(h.native.lead)}</p></header>
      <div class="grid three">
        ${h.native.points.map((item) => `<article class="card plain"><h3>${esc(item.title)}</h3><p>${inline(item.text)}</p></article>`).join('\n        ')}
      </div>
    </div>
  </section>

  <section class="section tint" id="formats">
    <div class="wrap">
      <header class="section-head"><h2>${esc(h.formats.title)}</h2><p>${inline(h.formats.lead)}</p></header>
      <div class="split">
        <div><h3>${esc(h.formats.importTitle)}</h3><ul class="pills">${h.formats.importItems.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></div>
        <div><h3>${esc(h.formats.exportTitle)}</h3><ul class="pills">${h.formats.exportItems.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></div>
      </div>
      <p class="muted center">${inline(h.formats.note)}</p>
    </div>
  </section>

  <section class="section" id="teams">
    <div class="wrap two">
      <div>
        <h2>${esc(h.shared.title)}</h2>
        <p class="lead-sm">${inline(h.shared.text)}</p>
      </div>
      <ul class="ticks big">${h.shared.points.map((point) => `<li>${icon('check', 18)}<span>${inline(point)}</span></li>`).join('')}</ul>
    </div>
  </section>

  <section class="section tint" id="privacy">
    <div class="wrap two">
      <div>
        <h2>${esc(h.privacy.title)}</h2>
        <p class="lead-sm">${inline(h.privacy.text)}</p>
      </div>
      <ul class="ticks big">${h.privacy.points.map((point) => `<li>${icon('shield', 18)}<span>${inline(point)}</span></li>`).join('')}</ul>
    </div>
  </section>

  ${downloadSection(page, c)}

  <section class="section" id="faq">
    <div class="wrap narrow">
      <header class="section-head"><h2>${esc(h.faq.title)}</h2></header>
      ${h.faq.items.map((item) => `<details class="fold"><summary>${esc(item.q)}${icon('chevron', 18)}</summary><div class="fold-body"><p>${inline(item.a)}</p></div></details>`).join('\n      ')}
    </div>
  </section>

  <section class="final">
    <div class="wrap center">
      <h2>${esc(h.final.title)}</h2>
      <p class="lead-sm">${inline(h.final.text)}</p>
      <div class="cta">
        <a class="btn btn-primary btn-lg" href="#download">${icon('download', 18)}${esc(h.hero.download)}</a>
        <a class="btn btn-ghost btn-lg" href="${link(page, guide)}">${icon('book', 18)}${esc(h.hero.guide)}</a>
      </div>
    </div>
  </section>
</main>
${footer(page, c)}`;

  return head(page, c, c.meta.home) + '\n' + body;
}

/* ───────────────────────────── guide ───────────────────────────── */

function block(page, c, facts, item) {
  if ('p' in item) return `<p>${inline(item.p)}</p>`;
  if ('h3' in item) return `<h3 id="${esc(item.id)}">${esc(item.h3)}</h3>`;
  if ('ul' in item) return `<ul>${item.ul.map((entry) => `<li>${inline(entry)}</li>`).join('')}</ul>`;
  if ('ol' in item) return `<ol class="steps">${item.ol.map((entry) => `<li>${inline(entry)}</li>`).join('')}</ol>`;
  if ('note' in item)
    return `<aside class="note ${esc(item.kind)}"><strong>${esc(c.guide.noteLabels[item.kind])}</strong><p>${inline(item.note)}</p></aside>`;
  if ('code' in item) return `<pre class="code"><code>${esc(item.code)}</code></pre>`;
  if ('shot' in item) return windowed(page, item.shot, item.alt);
  if ('table' in item) {
    const { head: cells, rows } = item.table;
    return `<div class="table-wrap"><table><thead><tr>${cells.map((cell) => `<th scope="col">${esc(cell)}</th>`).join('')}</tr></thead><tbody>${rows
      .map((row) => `<tr>${row.map((cell, index) => (index === 0 ? `<th scope="row">${inline(cell)}</th>` : `<td>${inline(cell)}</td>`)).join('')}</tr>`)
      .join('')}</tbody></table></div>`;
  }
  if ('shortcuts' in item) {
    const rows = facts.shortcuts
      .map((s) => {
        const combo = [s.mod ? 'Mod' : null, s.shift ? 'Shift' : null, keycap(s.key)].filter(Boolean).join('+');
        return `<tr><th scope="row">${esc(s.label[page.locale])}</th><td>${keys(combo)}</td></tr>`;
      })
      .join('');
    return `<div class="os-switch" role="group" aria-label="${esc(c.guide.osLabel)}"><span>${esc(c.guide.osLabel)}</span><button type="button" data-os="mac">macOS</button><button type="button" data-os="other">Windows / Linux</button></div>
    <div class="table-wrap"><table><thead><tr><th scope="col">${esc(c.guide.shortcutsHead[0])}</th><th scope="col">${esc(c.guide.shortcutsHead[1])}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  if ('generators' in item) {
    const groups = facts.groups
      .map((group) => {
        const names = facts.generators.filter((g) => g.group === group.id);
        return `<section class="gen-group" data-gen-group><h3>${esc(group.label[page.locale])} <span class="count">${names.length}</span></h3><ul class="gen-list">${names.map((g) => `<li><code data-gen>{{${esc(g.name)}}}</code></li>`).join('')}</ul></section>`;
      })
      .join('');
    return `<div class="gen-tools"><label class="sr-only" for="gen-filter">${esc(c.guide.generatorsFilter)}</label><input id="gen-filter" type="search" placeholder="${esc(c.guide.generatorsFilter)}" autocomplete="off" data-gen-filter><span class="muted small" data-gen-count aria-live="polite"></span></div>
    <div data-gen-groups>${groups}</div><p class="muted" data-gen-none hidden>${esc(c.guide.generatorsNone)}</p>`;
  }
  throw new Error(`Unknown guide block: ${JSON.stringify(item).slice(0, 80)}`);
}

export function guidePage(c, facts) {
  const page = { locale: c.locale, kind: 'guide' };
  const g = c.guide;
  const toc = g.sections.map((section) => `<li><a href="#${section.id}">${esc(section.title)}</a></li>`).join('');
  const sections = g.sections
    .map(
      (section) => `<section class="doc" id="${section.id}">
      <h2><a class="anchor" href="#${section.id}" aria-label="${esc(section.title)}">#</a>${esc(section.title)}</h2>
      ${section.lead ? `<p class="lead-sm">${inline(section.lead)}</p>` : ''}
      ${section.blocks.map((item) => block(page, c, facts, item)).join('\n      ')}
    </section>`,
    )
    .join('\n    ');
  const body = `<body class="guide">
${header(page, c)}
<main id="main">
  <div class="wrap guide-head">
    <p class="eyebrow">${icon('book', 14)}${esc(g.eyebrow)}</p>
    <h1>${esc(g.title)}</h1>
    <p class="lead">${inline(g.lead)}</p>
  </div>
  <div class="wrap guide-body">
    <aside class="toc" aria-label="${esc(g.tocTitle)}">
      <details class="toc-fold" open>
        <summary>${esc(g.tocTitle)}${icon('chevron', 16)}</summary>
        <ol>${toc}</ol>
      </details>
    </aside>
    <article class="prose">
    ${sections}
    </article>
  </div>
</main>
${footer(page, c)}`;
  return head(page, c, c.meta.guide) + '\n' + body;
}
