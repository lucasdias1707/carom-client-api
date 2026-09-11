import { EN } from '@/lib/faker/en';
import { PT_BR } from '@/lib/faker/pt-BR';
import { ES } from '@/lib/faker/es';
import type { Corpus } from '@/lib/faker/corpus';
import type { Language } from '@/lib/i18n';

/**
 * Which word lists a generator draws from.
 *
 * Keyed by the same `Language` the interface uses, and chosen at the moment a
 * value is generated rather than stored anywhere: the data follows the
 * language on screen, so someone working in Portuguese gets Brazilian names
 * and addresses without a second setting to find and set.
 */
const CORPORA: Record<Language, Corpus> = {
  en: EN,
  'pt-BR': PT_BR,
  es: ES,
};

export function corpusFor(language: Language): Corpus {
  return CORPORA[language] ?? EN;
}

export type { Corpus } from '@/lib/faker/corpus';
