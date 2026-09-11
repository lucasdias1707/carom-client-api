import { describe, expect, it } from 'vitest';
import {
  detectLanguage,
  format,
  messageParts,
  resolveDataLanguage,
  resolveLanguage,
  LANGUAGES,
} from '@/lib/i18n';
import { sectionId, SECTION_IDS } from '@/lib/draft';
import { en } from '@/locales/en';
import { ptBR } from '@/locales/pt-BR';
import { es } from '@/locales/es';
import { catalogueFor, translatorFor } from '@/locales';

describe('picking a language from what the machine says', () => {
  it('takes an exact match', () => {
    expect(detectLanguage(['pt-BR'])).toBe('pt-BR');
    expect(detectLanguage(['es'])).toBe('es');
  });

  it('is not fooled by case, which some platforms vary', () => {
    expect(detectLanguage(['PT-br'])).toBe('pt-BR');
  });

  /*
    The whole reason detection is worth doing: someone in Portugal or Mexico is
    far better served by the Portuguese or Spanish we have than by English, even
    though neither tag is one we ship.
  */
  it('falls to the nearest language sharing the primary tag', () => {
    expect(detectLanguage(['pt-PT'])).toBe('pt-BR');
    expect(detectLanguage(['es-419'])).toBe('es');
    expect(detectLanguage(['en-GB'])).toBe('en');
  });

  it('honours preference order, so a near match beats an exact one below it', () => {
    // Their list says Portuguese first. Answering in Spanish because `es` is an
    // exact tag and `pt-PT` is not would be ignoring what they ranked.
    expect(detectLanguage(['pt-PT', 'es'])).toBe('pt-BR');
  });

  it('falls back to English rather than guessing', () => {
    expect(detectLanguage(['de', 'fr'])).toBe('en');
    expect(detectLanguage([])).toBe('en');
  });

  it('treats no choice as "follow the system", not as English', () => {
    // A stored choice wins outright; the absence of one is what reaches the
    // detector at all.
    expect(resolveLanguage('es')).toBe('es');
    expect(resolveLanguage('pt-BR')).toBe('pt-BR');
  });
});

describe('which language the generated data speaks', () => {
  it('follows the interface until someone pins it', () => {
    expect(resolveDataLanguage(undefined, 'pt-BR')).toBe('pt-BR');
    expect(resolveDataLanguage(undefined, 'es')).toBe('es');
  });

  it('stays pinned once chosen, whatever the interface does', () => {
    // The case the setting exists for: an API that validates English names,
    // read by someone working in Portuguese.
    expect(resolveDataLanguage('en', 'pt-BR')).toBe('en');
    expect(resolveDataLanguage('pt-BR', 'en')).toBe('pt-BR');
  });
});

describe('rendering a message', () => {
  it('fills placeholders', () => {
    expect(format('Deleted {name}', { name: 'Orders' })).toBe('Deleted Orders');
  });

  it('fills the same placeholder everywhere it appears', () => {
    expect(format('{a} and {a}', { a: 'x' })).toBe('x and x');
  });

  it('leaves a placeholder nobody supplied visible instead of printing undefined', () => {
    // Visible is the point: "Deleted {name}" in a screenshot is a bug report,
    // "Deleted undefined" is a mystery.
    expect(format('Deleted {name}', {})).toBe('Deleted {name}');
  });

  it('picks the plural form by count, with zero counting as plural', () => {
    const message = { one: '{count} request', other: '{count} requests' };
    expect(format(message, { count: 1 })).toBe('1 request');
    expect(format(message, { count: 2 })).toBe('2 requests');
    expect(format(message, { count: 0 })).toBe('0 requests');
  });

  it('leaves Carom\'s own {{variable}} syntax alone', () => {
    // Several messages show the syntax as an example. Reading the inner braces
    // as a placeholder would eat the example, or fill it with something a
    // caller passed for an unrelated reason.
    expect(format('Use {{variables}} here', { variables: 'nope' })).toBe('Use {{variables}} here');
    expect(messageParts('{{variables}}')).toEqual([{ text: '{{variables}}' }]);
  });

  it('splits a message into text and placeholders for the rich case', () => {
    expect(messageParts('before {name} after')).toEqual([
      { text: 'before ' },
      { variable: 'name' },
      { text: ' after' },
    ]);
  });

  it('reads a real key through a bound translator', () => {
    expect(translatorFor('en')('common.cancel')).toBe('Cancel');
    expect(translatorFor('pt-BR')('common.cancel')).toBe('Cancelar');
    expect(translatorFor('es')('common.cancel')).toBe('Cancelar');
  });
});

/*
  The typecheck already refuses a catalogue with a key missing, but it says so
  as a type error across the whole object. These say which key, which is the
  difference between a one-line fix and a hunt.
*/
describe('the three catalogues stay in step', () => {
  const catalogues = { 'pt-BR': ptBR, es } as const;
  const keys = Object.keys(en) as Array<keyof typeof en>;

  it('has every language covering every key', () => {
    for (const [language, catalogue] of Object.entries(catalogues)) {
      const missing = keys.filter((key) => !(key in catalogue));
      expect({ language, missing }).toEqual({ language, missing: [] });
    }
  });

  it('adds no key English does not have', () => {
    for (const [language, catalogue] of Object.entries(catalogues)) {
      const extra = Object.keys(catalogue).filter((key) => !(key in en));
      expect({ language, extra }).toEqual({ language, extra: [] });
    }
  });

  it('keeps a counted message counted in every language', () => {
    for (const [language, catalogue] of Object.entries(catalogues)) {
      const wrong = keys.filter(
        (key) => typeof en[key] !== typeof (catalogue as Record<string, unknown>)[key],
      );
      expect({ language, wrong }).toEqual({ language, wrong: [] });
    }
  });

  it('leaves no message empty', () => {
    for (const language of LANGUAGES) {
      const catalogue = catalogueFor(language);
      const empty = keys.filter((key) => {
        const message = catalogue[key];
        return typeof message === 'string'
          ? message.length === 0
          : message.one.length === 0 || message.other.length === 0;
      });
      expect({ language, empty }).toEqual({ language, empty: [] });
    }
  });

  /*
    A placeholder dropped in translation is the failure this catches: the
    sentence still reads, and the name or the number it was meant to carry is
    simply gone.
  */
  it('carries the same placeholders through every translation', () => {
    const placeholdersOf = (message: string) =>
      messageParts(message)
        .flatMap((part) => ('variable' in part ? [part.variable] : []))
        .sort();
    const formsOf = (message: string | { one: string; other: string }) =>
      typeof message === 'string' ? [message] : [message.one, message.other];

    // Form by form, not message by message: a singular and a plural are
    // allowed to differ from each other — "the saved response" carries no
    // count, "all 3 saved responses" does — and only the same form across two
    // languages has to agree.
    for (const [language, catalogue] of Object.entries(catalogues)) {
      for (const key of keys) {
        const source = formsOf(en[key]);
        formsOf((catalogue as Record<string, never>)[key]).forEach((form, index) => {
          expect({ language, key, index, placeholders: placeholdersOf(form) }).toEqual({
            language,
            key,
            index,
            placeholders: placeholdersOf(source[index]),
          });
        });
      }
    }
  });

  it('names every part of a request the composer can change', () => {
    // The version history looks these up by id; a section without one would
    // draw a blank badge rather than fail anywhere visible.
    for (const language of LANGUAGES) {
      const catalogue = catalogueFor(language);
      for (const id of SECTION_IDS) expect(catalogue[`section.${id}`]).toBeTruthy();
    }
  });
});

describe('reading a stored version back', () => {
  it('accepts the English labels written before the ids existed', () => {
    expect(sectionId('Method')).toBe('method');
    expect(sectionId('URL')).toBe('url');
    expect(sectionId('Headers')).toBe('headers');
  });

  it('takes an id unchanged', () => {
    expect(sectionId('body')).toBe('body');
  });

  it('drops what it cannot recognise rather than showing it', () => {
    expect(sectionId('Something else')).toBeNull();
  });
});
