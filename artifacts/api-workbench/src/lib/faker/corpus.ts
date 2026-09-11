/**
 * The word lists and the small pieces of grammar a generator needs, per
 * language.
 *
 * Split from the generators themselves because what differs between languages
 * is only ever the data and the word order — `$randomFullName` is the same
 * idea everywhere, and `$guid` has no language at all. Keeping the lists here
 * means adding a language is adding one file, not editing sixty-seven
 * generators.
 *
 * The builders are the entries whose *shape* changes, not just their contents.
 * "Senior Data Analyst" and "Analista de Dados Sênior" are not the same three
 * words reordered, and a street address puts the number after the name in
 * Brazil and before it in the United States. A list could not express either.
 */
export type Corpus = {
  firstNames: readonly string[];
  lastNames: readonly string[];
  namePrefixes: readonly string[];
  nameSuffixes: readonly string[];
  cities: readonly string[];
  countries: readonly string[];
  /** ISO codes, weighted towards the places this language is spoken. */
  countryCodes: readonly string[];
  departments: readonly string[];
  products: readonly string[];
  colours: readonly string[];
  abbreviations: readonly string[];
  /** Code, name, symbol — the name is the only part that is language. */
  currencies: readonly (readonly [string, string, string])[];

  jobArea: () => string;
  jobType: () => string;
  jobTitle: () => string;
  companyName: () => string;
  companySuffix: () => string;
  catchPhrase: () => string;
  streetName: () => string;
  streetAddress: () => string;
  productName: () => string;
  productAdjective: () => string;
  productMaterial: () => string;
  phone: () => string;
};

export const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

export const integer = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const digits = (count: number) => Array.from({ length: count }, () => integer(0, 9)).join('');
