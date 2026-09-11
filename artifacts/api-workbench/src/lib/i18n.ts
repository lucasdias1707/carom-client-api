import type { Catalogue, MessageKey } from '@/locales/en';

/**
 * The interface, in three languages.
 *
 * English is the source: it is what the keys are written against, and the
 * other catalogues are typed as `Catalogue`, so a key that exists in English
 * and nowhere else fails the typecheck rather than falling back at runtime to
 * a word nobody asked for. That is the whole consistency mechanism — there is
 * no "missing translation" state to notice in production, because a missing
 * translation does not build.
 */
export const LANGUAGES = ['en', 'pt-BR', 'es'] as const;

export type Language = (typeof LANGUAGES)[number];

/**
 * How each language names itself.
 *
 * A picker that offers "Portuguese" in English to someone who cannot read
 * English has already failed at the one job it has, so every entry is written
 * the way its own speakers write it.
 */
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  'pt-BR': 'Português (Brasil)',
  es: 'Español',
};

/**
 * The BCP 47 tag to put on `<html lang>` for each.
 *
 * Not decoration: it is what decides hyphenation, quotation marks and which
 * voice a screen reader uses, and a page that claims to be English while
 * showing Portuguese makes a screen reader unusable.
 */
export const LANGUAGE_TAGS: Record<Language, string> = {
  en: 'en',
  'pt-BR': 'pt-BR',
  es: 'es',
};

/**
 * What the language picker calls "follow the machine".
 *
 * A sentinel rather than a `Language`, because it is the absence of a choice:
 * picking it clears `settings.language` instead of storing a fourth value, so
 * the state has one representation of "not chosen" and not two.
 */
export const FOLLOW_SYSTEM = 'system';

/** A message with a singular and a plural, chosen by `count`. */
export type Plural = { one: string; other: string };

export type Message = string | Plural;

/** What can be substituted into a message. */
export type Vars = Record<string, string | number>;

function isPlural(message: Message): message is Plural {
  return typeof message !== 'string';
}

/**
 * Which of a plural's two forms applies.
 *
 * English, Portuguese and Spanish agree here — one thing is singular and
 * everything else, zero included, is plural — so one rule covers all three.
 * A language that disagrees (French counts zero as singular; Polish has three
 * forms) cannot simply be added to `LANGUAGES`: it needs this function to take
 * the language and grow a case, which is exactly the reminder we want at the
 * moment someone adds one.
 */
function pluralForm(count: number): keyof Plural {
  return count === 1 ? 'one' : 'other';
}

/** A message split into its literal text and its `{placeholders}`. */
export type MessagePart = { text: string } | { variable: string };

/**
 * A `{placeholder}`, but not one inside doubled braces.
 *
 * `{{variables}}` is Carom's own template syntax, and several messages show it
 * as an example. Without the guards, the interpolator would read the inner
 * `{variables}` as something to substitute and quietly eat the example — or
 * worse, replace it with whatever a caller happened to pass.
 */
const PLACEHOLDER = /(?<!\{)\{(\w+)\}(?!\})/g;

/**
 * Take a message apart at its placeholders.
 *
 * Exported because a placeholder is not always a string: a confirmation that
 * names a request wants that name in bold, and building the sentence out of
 * parts is how the translation keeps deciding the word order while React
 * decides what a part looks like. Interpolating markup into a translated
 * string would hand one of those jobs to the wrong side.
 */
export function messageParts(message: string): MessagePart[] {
  const parts: MessagePart[] = [];
  let index = 0;
  for (const match of message.matchAll(PLACEHOLDER)) {
    const at = match.index ?? 0;
    if (at > index) parts.push({ text: message.slice(index, at) });
    parts.push({ variable: match[1] });
    index = at + match[0].length;
  }
  if (index < message.length) parts.push({ text: message.slice(index) });
  return parts;
}

/** Pick the form, then fill the placeholders. */
export function format(message: Message, vars?: Vars): string {
  const text = isPlural(message) ? message[pluralForm(Number(vars?.count ?? 0))] : message;
  if (!vars) return text;
  return messageParts(text)
    .map((part) => ('text' in part ? part.text : String(vars[part.variable] ?? `{${part.variable}}`)))
    .join('');
}

/**
 * Look a message up and fill in its placeholders.
 *
 * Declared here rather than beside the React store so that pure modules — the
 * seed workspace, anything else that needs words without needing a component —
 * can ask for one without importing the store and creating a cycle.
 */
export type Translate = (key: MessageKey, vars?: Vars) => string;

/** Look a key up in a catalogue and render it. */
export function translate(catalogue: Catalogue, key: MessageKey, vars?: Vars): string {
  return format(catalogue[key], vars);
}

/**
 * Which of our languages best matches a list of the reader's, in their order
 * of preference.
 *
 * The near match is the point: someone whose system says `pt-PT` or `es-419`
 * is served far better by the Portuguese or Spanish we have than by English,
 * and someone whose system says `de` genuinely is better served by English
 * than by a language they may not read. Preference order is honoured strictly
 * — an exact match further down the list does not beat a near match higher up,
 * because the reader already ranked them.
 */
export function detectLanguage(tags: readonly string[]): Language {
  for (const tag of tags) {
    const wanted = tag.toLowerCase();
    const exact = LANGUAGES.find((language) => language.toLowerCase() === wanted);
    if (exact) return exact;
    const primary = wanted.split('-')[0];
    const near = LANGUAGES.find((language) => language.toLowerCase().split('-')[0] === primary);
    if (near) return near;
  }
  return 'en';
}

/**
 * What the machine is set to.
 *
 * `navigator.languages` is the browser's copy of the operating system's
 * language list, and the Tauri webview inherits it from the OS on all three
 * platforms — so the desktop app reads the system language on first run
 * without a plugin, a permission or a native call.
 */
export function systemLanguage(): Language {
  if (typeof navigator === 'undefined') return 'en';
  const tags = navigator.languages?.length ? navigator.languages : [navigator.language];
  return detectLanguage(tags.filter(Boolean));
}

/**
 * The language to render in: the chosen one, or the system's until someone
 * chooses.
 *
 * Absent means "follow the system" rather than "English". Storing the detected
 * language on first run instead would freeze whatever the machine happened to
 * say that day, and someone who changes their system language would have to
 * come here and change it again.
 */
export function resolveLanguage(chosen: Language | undefined): Language {
  return chosen ?? systemLanguage();
}
