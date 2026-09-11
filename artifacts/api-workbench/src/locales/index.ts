import { en, type Catalogue } from '@/locales/en';
import { ptBR } from '@/locales/pt-BR';
import { es } from '@/locales/es';
import { format, type Language, type Translate } from '@/lib/i18n';

/**
 * Every catalogue, keyed by language.
 *
 * All three are in the bundle rather than fetched on demand: together they are
 * a few tens of kilobytes of text that gzip well, and the alternative is a
 * frame of untranslated interface — or, on the desktop with no network, an
 * interface that never arrives at all — every time someone switches language.
 */
const CATALOGUES: Record<Language, Catalogue> = {
  en,
  'pt-BR': ptBR,
  es,
};

export function catalogueFor(language: Language): Catalogue {
  return CATALOGUES[language];
}

/**
 * A translator bound to one language, for code that has no component to hang a
 * hook on: the seed workspace built before the provider exists, and the tests.
 */
export function translatorFor(language: Language): Translate {
  const catalogue = catalogueFor(language);
  return (key, vars) => format(catalogue[key], vars);
}
