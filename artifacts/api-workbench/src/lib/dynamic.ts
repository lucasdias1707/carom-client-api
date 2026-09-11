import { corpusFor } from '@/lib/faker';
import { digits, integer, pick } from '@/lib/faker/corpus';
import type { Language } from '@/lib/i18n';

/**
 * Variables that make up a value every time they are used.
 *
 * `{{baseUrl}}` is a value someone wrote down; `{{$randomFirstName}}` is a value
 * invented at the moment the request goes out. The two sit in the same braces
 * on purpose — a body full of test data reads better when the fixed parts and
 * the made-up parts are written the same way — and the `$` is what tells them
 * apart, here and on screen.
 *
 * The names follow Postman's, because that is where these requests come from
 * and a collection that has to be rewritten to be imported has not really been
 * imported. What is here is the set people actually use; an unknown `$name` is
 * left in the text rather than replaced, so a typo shows up as itself instead
 * of vanishing into an empty string.
 *
 * **The data follows the language the interface is in.** Working in Portuguese
 * gets Brazilian names, cities and phone numbers; the identifiers, numbers and
 * dates have no language and never change. The language is passed in rather
 * than read from anywhere, so this file stays pure and a caller cannot forget
 * to decide.
 */

/** Which part of the list a variable belongs to, for the reference panel. */
export type DynamicGroup =
  | 'identifiers'
  | 'person'
  | 'internet'
  | 'location'
  | 'business'
  | 'text'
  | 'numbers'
  | 'dates';

export type DynamicVariable = {
  /** Written with the `$`, exactly as it goes between the braces. */
  name: string;
  group: DynamicGroup;
  /** A fresh value. Called once per occurrence, never cached. */
  generate: (language: Language) => string;
  /**
   * True when the value reads differently in another language. The reference
   * panel says so; a uuid or a timestamp would be a lie to mark.
   */
  localised?: boolean;
};

/** Random hex, for the several generators that are really just hex of a length. */
const hex = (count: number) => Array.from({ length: count }, () => integer(0, 15).toString(16)).join('');

/*
  Lorem is not a language — it is the same nonsense Latin everywhere, and
  translating it would defeat the point of using it. It stays shared.
*/
const LOREM = [
  'a', 'ab', 'accusamus', 'ad', 'adipisci', 'alias', 'aliquam', 'amet', 'animi', 'aperiam', 'architecto',
  'aut', 'autem', 'beatae', 'blanditiis', 'commodi', 'consectetur', 'consequatur', 'corporis', 'culpa',
  'cumque', 'debitis', 'dicta', 'dolor', 'dolore', 'dolorem', 'doloribus', 'ducimus', 'ea', 'eaque',
  'eius', 'eligendi', 'enim', 'error', 'esse', 'est', 'et', 'eum', 'ex', 'excepturi', 'exercitationem',
  'expedita', 'explicabo', 'facere', 'facilis', 'fuga', 'fugiat', 'harum', 'hic', 'id', 'illo', 'illum',
  'impedit', 'in', 'inventore', 'ipsa', 'ipsam', 'ipsum', 'iste', 'itaque', 'iure', 'iusto', 'labore',
  'laboriosam', 'laborum', 'laudantium', 'libero', 'magnam', 'magni', 'maiores', 'maxime', 'minima',
  'minus', 'modi', 'molestiae', 'mollitia', 'nam', 'natus', 'necessitatibus', 'nemo', 'neque', 'nesciunt',
  'nihil', 'nisi', 'nobis', 'non', 'nostrum', 'nulla', 'numquam', 'occaecati', 'odio', 'odit', 'officia',
  'omnis', 'optio', 'pariatur', 'perferendis', 'perspiciatis', 'placeat', 'porro', 'possimus', 'quae',
  'quam', 'quas', 'quasi', 'qui', 'quia', 'quibusdam', 'quidem', 'quis', 'quo', 'quod', 'ratione',
  'recusandae', 'reiciendis', 'rem', 'repellat', 'repellendus', 'reprehenderit', 'rerum', 'saepe',
  'sapiente', 'sed', 'sequi', 'similique', 'sint', 'sit', 'soluta', 'sunt', 'suscipit', 'tempora',
  'tempore', 'tenetur', 'totam', 'ullam', 'unde', 'ut', 'vel', 'velit', 'veniam', 'veritatis', 'vero',
  'vitae', 'voluptas', 'voluptate', 'voluptatem', 'voluptates', 'voluptatibus',
] as const;

const DOMAIN_WORDS = ['acme', 'bluebird', 'cobalt', 'delta', 'eastwind', 'fernwood', 'goldleaf', 'harbour', 'ironvale', 'juniper', 'kestrel', 'lantern', 'meridian', 'northstar'] as const;
const TLDS = ['com', 'net', 'org', 'io', 'dev', 'co'] as const;
const FREE_MAIL = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com'] as const;
const PROTOCOLS = ['http', 'https'] as const;
const BROWSERS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0',
] as const;

/**
 * A name as it can go in the local part of an email address.
 *
 * The accents come off here and only here. They are the point of the name
 * lists — a system that chokes on "Natália" is what a fixture exists to find —
 * but an address with a non-ASCII local part is rejected outright by plenty of
 * the servers these requests are pointed at, so the address would be testing
 * the wrong thing.
 */
const slug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const loremWords = (count: number) => Array.from({ length: count }, () => pick(LOREM)).join(' ');

const sentence = () => {
  const words = loremWords(integer(4, 10));
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}.`;
};

const uuid = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // Version 4, laid out by hand where `randomUUID` is missing.
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${pick(['8', '9', 'a', 'b'])}${hex(3)}-${hex(12)}`;
};

const domainName = () => `${pick(DOMAIN_WORDS)}.${pick(TLDS)}`;

const firstName = (language: Language) => pick(corpusFor(language).firstNames);
const lastName = (language: Language) => pick(corpusFor(language).lastNames);

/** A date `days` away from now, at a random time, as an ISO string. */
const dateAround = (days: number) =>
  new Date(Date.now() + days * 86_400_000 + integer(-43_200_000, 43_200_000)).toISOString();

const DEFINITIONS: DynamicVariable[] = [
  // ── Identifiers ───────────────────────────────────────────────────────
  { name: '$guid', group: 'identifiers', generate: uuid },
  { name: '$randomUUID', group: 'identifiers', generate: uuid },
  { name: '$timestamp', group: 'identifiers', generate: () => String(Math.floor(Date.now() / 1000)) },
  { name: '$isoTimestamp', group: 'identifiers', generate: () => new Date().toISOString() },
  { name: '$randomBankAccount', group: 'identifiers', generate: () => digits(8) },
  {
    name: '$randomBankAccountIban',
    group: 'identifiers',
    localised: true,
    generate: (language) => `${pick(corpusFor(language).countryCodes)}${digits(2)}${hex(16).toUpperCase()}`,
  },
  { name: '$randomCreditCardMask', group: 'identifiers', generate: () => digits(4) },

  // ── People ────────────────────────────────────────────────────────────
  { name: '$randomFirstName', group: 'person', localised: true, generate: firstName },
  { name: '$randomLastName', group: 'person', localised: true, generate: lastName },
  {
    name: '$randomFullName',
    group: 'person',
    localised: true,
    generate: (language) => `${firstName(language)} ${lastName(language)}`,
  },
  { name: '$randomNamePrefix', group: 'person', localised: true, generate: (language) => pick(corpusFor(language).namePrefixes) },
  { name: '$randomNameSuffix', group: 'person', localised: true, generate: (language) => pick(corpusFor(language).nameSuffixes) },
  { name: '$randomJobTitle', group: 'person', localised: true, generate: (language) => corpusFor(language).jobTitle() },
  { name: '$randomJobArea', group: 'person', localised: true, generate: (language) => corpusFor(language).jobArea() },
  { name: '$randomJobType', group: 'person', localised: true, generate: (language) => corpusFor(language).jobType() },
  { name: '$randomPhoneNumber', group: 'person', localised: true, generate: (language) => corpusFor(language).phone() },

  // ── Internet ──────────────────────────────────────────────────────────
  {
    name: '$randomEmail',
    group: 'internet',
    localised: true,
    generate: (language) => `${slug(firstName(language))}.${slug(lastName(language))}@${pick(FREE_MAIL)}`,
  },
  {
    name: '$randomExampleEmail',
    group: 'internet',
    localised: true,
    generate: (language) => `${slug(firstName(language))}.${slug(lastName(language))}@example.com`,
  },
  {
    name: '$randomUserName',
    group: 'internet',
    localised: true,
    generate: (language) => `${slug(firstName(language))}_${integer(10, 9999)}`,
  },
  { name: '$randomDomainName', group: 'internet', generate: domainName },
  { name: '$randomDomainWord', group: 'internet', generate: () => pick(DOMAIN_WORDS) },
  { name: '$randomUrl', group: 'internet', generate: () => `https://${domainName()}` },
  { name: '$randomProtocol', group: 'internet', generate: () => pick(PROTOCOLS) },
  { name: '$randomIP', group: 'internet', generate: () => Array.from({ length: 4 }, () => integer(0, 255)).join('.') },
  { name: '$randomIPV6', group: 'internet', generate: () => Array.from({ length: 8 }, () => hex(4)).join(':') },
  { name: '$randomMACAddress', group: 'internet', generate: () => Array.from({ length: 6 }, () => hex(2)).join(':') },
  { name: '$randomUserAgent', group: 'internet', generate: () => pick(BROWSERS) },
  {
    name: '$randomPassword',
    group: 'internet',
    generate: () => {
      const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      return Array.from({ length: 15 }, () => alphabet[integer(0, alphabet.length - 1)]).join('');
    },
  },

  // ── Places ────────────────────────────────────────────────────────────
  { name: '$randomCity', group: 'location', localised: true, generate: (language) => pick(corpusFor(language).cities) },
  { name: '$randomCountry', group: 'location', localised: true, generate: (language) => pick(corpusFor(language).countries) },
  { name: '$randomCountryCode', group: 'location', localised: true, generate: (language) => pick(corpusFor(language).countryCodes) },
  { name: '$randomStreetName', group: 'location', localised: true, generate: (language) => corpusFor(language).streetName() },
  { name: '$randomStreetAddress', group: 'location', localised: true, generate: (language) => corpusFor(language).streetAddress() },
  { name: '$randomLatitude', group: 'location', generate: () => (Math.random() * 180 - 90).toFixed(6) },
  { name: '$randomLongitude', group: 'location', generate: () => (Math.random() * 360 - 180).toFixed(6) },

  // ── Business ──────────────────────────────────────────────────────────
  { name: '$randomCompanyName', group: 'business', localised: true, generate: (language) => corpusFor(language).companyName() },
  { name: '$randomCompanySuffix', group: 'business', localised: true, generate: (language) => corpusFor(language).companySuffix() },
  { name: '$randomCatchPhrase', group: 'business', localised: true, generate: (language) => corpusFor(language).catchPhrase() },
  { name: '$randomDepartment', group: 'business', localised: true, generate: (language) => pick(corpusFor(language).departments) },
  { name: '$randomProduct', group: 'business', localised: true, generate: (language) => pick(corpusFor(language).products) },
  { name: '$randomProductName', group: 'business', localised: true, generate: (language) => corpusFor(language).productName() },
  { name: '$randomProductAdjective', group: 'business', localised: true, generate: (language) => corpusFor(language).productAdjective() },
  { name: '$randomProductMaterial', group: 'business', localised: true, generate: (language) => corpusFor(language).productMaterial() },
  { name: '$randomPrice', group: 'business', generate: () => (integer(100, 99_900) / 100).toFixed(2) },
  { name: '$randomCurrencyCode', group: 'business', localised: true, generate: (language) => pick(corpusFor(language).currencies)[0] },
  { name: '$randomCurrencyName', group: 'business', localised: true, generate: (language) => pick(corpusFor(language).currencies)[1] },
  { name: '$randomCurrencySymbol', group: 'business', localised: true, generate: (language) => pick(corpusFor(language).currencies)[2] },

  // ── Words ─────────────────────────────────────────────────────────────
  { name: '$randomWord', group: 'text', generate: () => pick(LOREM) },
  { name: '$randomWords', group: 'text', generate: () => loremWords(integer(2, 6)) },
  { name: '$randomLoremWord', group: 'text', generate: () => pick(LOREM) },
  { name: '$randomLoremWords', group: 'text', generate: () => loremWords(integer(2, 6)) },
  { name: '$randomLoremSentence', group: 'text', generate: sentence },
  {
    name: '$randomLoremParagraph',
    group: 'text',
    generate: () => Array.from({ length: integer(3, 5) }, sentence).join(' '),
  },
  { name: '$randomLoremSlug', group: 'text', generate: () => loremWords(3).replace(/ /g, '-') },
  { name: '$randomColor', group: 'text', localised: true, generate: (language) => pick(corpusFor(language).colours) },
  { name: '$randomHexColor', group: 'text', generate: () => `#${hex(6)}` },
  { name: '$randomAbbreviation', group: 'text', generate: (language) => pick(corpusFor(language).abbreviations) },

  // ── Numbers ───────────────────────────────────────────────────────────
  { name: '$randomInt', group: 'numbers', generate: () => String(integer(0, 1000)) },
  { name: '$randomBoolean', group: 'numbers', generate: () => String(Math.random() < 0.5) },
  {
    name: '$randomAlphaNumeric',
    group: 'numbers',
    generate: () => {
      const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
      return alphabet[integer(0, alphabet.length - 1)];
    },
  },
  { name: '$randomDigits', group: 'numbers', generate: () => digits(6) },

  // ── Dates ─────────────────────────────────────────────────────────────
  { name: '$randomDateRecent', group: 'dates', generate: () => dateAround(-integer(0, 7)) },
  { name: '$randomDatePast', group: 'dates', generate: () => dateAround(-integer(8, 365)) },
  { name: '$randomDateFuture', group: 'dates', generate: () => dateAround(integer(1, 365)) },
  /*
    Not Postman's, and named so they cannot be mistaken for one of theirs. A
    body that has to say "the day after check-in" is the single most common
    thing missing from the Postman set, and writing it by hand means editing
    two dates every time the fixture is reused.
  */
  { name: '$today', group: 'dates', generate: () => new Date().toISOString().slice(0, 10) },
  { name: '$tomorrow', group: 'dates', generate: () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10) },
  { name: '$yesterday', group: 'dates', generate: () => new Date(Date.now() - 86_400_000).toISOString().slice(0, 10) },
];

/** Every dynamic variable, in the order the reference panel lists them. */
export const DYNAMIC_VARIABLES: DynamicVariable[] = DEFINITIONS;

const BY_NAME = new Map(DEFINITIONS.map((variable) => [variable.name, variable]));

/**
 * Whether a name between braces is meant as a dynamic variable at all.
 *
 * The `$` decides, not the registry: `{{$randomFrstName}}` is a typo in a
 * dynamic variable, and saying so is more use than treating it as an ordinary
 * variable nobody has defined.
 */
export function looksDynamic(name: string): boolean {
  return name.startsWith('$');
}

export function isDynamic(name: string): boolean {
  return BY_NAME.has(name);
}

export function dynamicVariable(name: string): DynamicVariable | null {
  return BY_NAME.get(name) ?? null;
}

/** A fresh value, or null when nothing here goes by that name. */
export function generateDynamic(name: string, language: Language): string | null {
  return BY_NAME.get(name)?.generate(language) ?? null;
}

/** The groups, in the order they are shown. */
export const DYNAMIC_GROUPS: DynamicGroup[] = [
  'identifiers',
  'person',
  'internet',
  'location',
  'business',
  'text',
  'numbers',
  'dates',
];
