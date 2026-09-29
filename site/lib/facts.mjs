/*
  What the site says about the app, read from the app.

  Shortcuts and generators are the two things a guide gets wrong first, because
  they are lists and lists drift. They are parsed out of the source here, so the
  page that documents them is regenerated with them — and the build fails, loudly,
  when a parse finds nothing, which is what a refactor of those files would do.
*/
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', '..', 'artifacts', 'api-workbench', 'src');

export const LOCALES = ['en', 'pt-BR', 'es'];

/** The value of a string key in a locale catalogue, unescaped. */
function catalogueString(source, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`'${escaped}':\\s*('(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*")`));
  if (!match) throw new Error(`Locale key not found: ${key}`);
  const raw = match[1];
  const quote = raw[0];
  return raw
    .slice(1, -1)
    .replace(/\\(.)/g, (_, c) => (c === 'n' ? '\n' : c))
    .replace(new RegExp(`\\\\${quote}`, 'g'), quote);
}

export async function loadFacts() {
  const catalogues = {};
  for (const locale of LOCALES) {
    catalogues[locale] = await readFile(join(SRC, 'locales', `${locale}.ts`), 'utf8');
  }

  const shortcutsSource = await readFile(join(SRC, 'lib', 'shortcuts.ts'), 'utf8');
  const shortcuts = [
    ...shortcutsSource.matchAll(
      /\{\s*id:\s*'([\w.]+)',\s*label:\s*'([\w.]+)',\s*defaultBinding:\s*\{\s*key:\s*'([^']+)'(?:,\s*mod:\s*(true|false))?(?:,\s*shift:\s*(true|false))?\s*\}\s*\}/g,
    ),
  ].map(([, id, label, key, mod, shift]) => ({
    id,
    key,
    mod: mod === 'true',
    shift: shift === 'true',
    label: Object.fromEntries(LOCALES.map((locale) => [locale, catalogueString(catalogues[locale], label)])),
  }));
  if (shortcuts.length < 10) throw new Error(`Only ${shortcuts.length} shortcuts parsed from shortcuts.ts`);

  const dynamicSource = await readFile(join(SRC, 'lib', 'dynamic.ts'), 'utf8');
  const generators = [...dynamicSource.matchAll(/name:\s*'(\$\w+)',\s*group:\s*'(\w+)'/g)].map(([, name, group]) => ({
    name,
    group,
  }));
  if (generators.length < 60) throw new Error(`Only ${generators.length} generators parsed from dynamic.ts`);

  const groupIds = [...new Set(generators.map((item) => item.group))];
  const groups = groupIds.map((id) => ({
    id,
    label: Object.fromEntries(
      LOCALES.map((locale) => [locale, catalogueString(catalogues[locale], `dynamic.group.${id}`)]),
    ),
  }));

  return { shortcuts, generators, groups };
}

/** `k` → `K`, `enter` → `Enter`: how a key is written on a keycap. */
export function keycap(key) {
  if (key === 'enter') return 'Enter';
  return key.length === 1 ? key.toUpperCase() : key[0].toUpperCase() + key.slice(1);
}
