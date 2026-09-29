# The Carom site

A landing page and a usage guide, in English, Português (BR) and Español,
published to GitHub Pages by `.github/workflows/pages.yml`.

Plain HTML, one stylesheet and one small script. The build has **no
dependencies** — `node site/build.mjs` — so a deploy cannot break because a
package did.

```sh
node site/build.mjs     # → site/dist
node site/check.mjs     # links, anchors, alt text, markup, language parity
node site/tools/preview.mjs   # http://localhost:4173/carom-client-api/
```

Preview serves under `/carom-client-api/` on purpose: that is where Pages puts
it, and every link is relative so it works there and anywhere else.

## Where things are

| | |
| --- | --- |
| `content/<locale>.mjs` | Every word on both pages. `en.mjs` is the source; the other two must have the same shape or the build stops. |
| `lib/pages.mjs` | The two page templates. Nothing in them is language-specific. |
| `lib/facts.mjs` | Reads the shortcut list and the 67 generators **from the app's source**, so the guide cannot drift from the app. |
| `src/style.css`, `src/site.js` | Styles (dark first, follows the system) and the optional behaviour. Every page works with the script off. |
| `assets/shots/` | Screenshots of the real app. `assets/og/`: social cards. |

Strings take `` `code` ``, `**bold**`, `[links](url)` and `[[Mod+K]]` keycaps
(`Mod` shows as ⌘ on a Mac and Ctrl elsewhere).

## Changing the words

Edit `en.mjs`, then the same place in `pt-BR.mjs` and `es.mjs`. Use the terms in
`artifacts/api-workbench/src/locales/README.md` — the guide should say what the
app says. Anything claimed about the app should be something you have looked at
in the app or its source.

## Regenerating the screenshots

They are photographs of the web build with a staged workspace — a made-up
Pokédex API on `.example` hosts, answered by the script — so nothing in them is
anyone's real data. The interface is the real one.

```sh
pnpm --filter @workspace/api-workbench run build
npx serve -s artifacts/api-workbench/dist/public -l 21728 &
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node site/tools/screenshots.mjs
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node site/tools/og.mjs
```

They show `Ctrl` rather than `⌘` because they are captured on Linux. Needs
ImageMagick (`convert`, with WebP) and network access for the web fonts, which
are fetched once into `site/.cache` (git-ignored).

## Publishing

Merging to `main` deploys, when something under `site/` or the files the guide
reads from changes. The one-time setup is in `pages.yml`: Settings → Pages →
Source: **GitHub Actions**.

The download buttons ask GitHub's public API for the latest release to link
straight to the installers, and fall back to the Releases page if that fails.
That is the only request the page makes to anyone else.
