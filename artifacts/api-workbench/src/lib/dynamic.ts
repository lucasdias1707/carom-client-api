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
 * The data is deliberately plain English, again like Postman: a fixture that
 * changes language with the interface would make two runs of the same request
 * incomparable, and the language of the interface says nothing about the
 * language of the system under test.
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
  generate: () => string;
};

const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

const integer = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const digits = (count: number) =>
  Array.from({ length: count }, () => integer(0, 9)).join('');

/** Random hex, for the several generators that are really just hex of a length. */
const hex = (count: number) =>
  Array.from({ length: count }, () => integer(0, 15).toString(16)).join('');

const FIRST_NAMES = [
  'Ada', 'Alejandro', 'Amara', 'Anders', 'Aoife', 'Beatriz', 'Camille', 'Caleb', 'Dara', 'Diego',
  'Elena', 'Emeka', 'Farah', 'Felix', 'Grace', 'Hana', 'Hugo', 'Ines', 'Ivan', 'Jae',
  'Julia', 'Kenji', 'Lars', 'Leila', 'Lucas', 'Maya', 'Mateo', 'Nadia', 'Noor', 'Olive',
  'Omar', 'Priya', 'Quinn', 'Rafael', 'Rosa', 'Sana', 'Soren', 'Talia', 'Theo', 'Uma',
  'Viktor', 'Wren', 'Xiomara', 'Yara', 'Yusuf', 'Zane', 'Zoe',
] as const;

const LAST_NAMES = [
  'Abara', 'Almeida', 'Andersen', 'Bauer', 'Bennett', 'Castellanos', 'Chen', 'Dalgaard', 'Duarte',
  'Fitzgerald', 'Gallagher', 'Ghosh', 'Haddad', 'Hoffmann', 'Ibrahim', 'Jansen', 'Kaur', 'Kowalski',
  'Lindqvist', 'Marchetti', 'Mbeki', 'Nakamura', 'Novak', 'Okafor', 'Oliveira', 'Petrov', 'Pereira',
  'Quiroga', 'Rasmussen', 'Reyes', 'Sandoval', 'Silva', 'Tanaka', 'Thorne', 'Vasquez', 'Winters',
] as const;

const NAME_PREFIXES = ['Mr', 'Mrs', 'Ms', 'Dr', 'Miss'] as const;
const NAME_SUFFIXES = ['Jr.', 'Sr.', 'I', 'II', 'III', 'PhD', 'MD', 'DDS'] as const;

const JOB_DESCRIPTORS = ['Lead', 'Senior', 'Principal', 'Regional', 'Global', 'Chief', 'Dynamic', 'Forward'] as const;
const JOB_AREAS = ['Accounts', 'Brand', 'Data', 'Infrastructure', 'Integration', 'Marketing', 'Operations', 'Optimization', 'Research', 'Security'] as const;
const JOB_TYPES = ['Agent', 'Analyst', 'Architect', 'Consultant', 'Designer', 'Developer', 'Engineer', 'Manager', 'Officer', 'Specialist'] as const;

const DOMAIN_WORDS = ['acme', 'bluebird', 'cobalt', 'delta', 'eastwind', 'fernwood', 'goldleaf', 'harbour', 'ironvale', 'juniper', 'kestrel', 'lantern', 'meridian', 'northstar'] as const;
const TLDS = ['com', 'net', 'org', 'io', 'dev', 'co'] as const;
const FREE_MAIL = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com'] as const;

const CITIES = ['Auckland', 'Belgrade', 'Bristol', 'Curitiba', 'Dakar', 'Edinburgh', 'Faro', 'Gothenburg', 'Halifax', 'Innsbruck', 'Jaipur', 'Kyoto', 'Leiden', 'Medellín', 'Nantes', 'Osaka', 'Porto', 'Quito', 'Rotterdam', 'Salvador', 'Tallinn', 'Utrecht', 'Valencia', 'Wellington'] as const;
const COUNTRIES = ['Argentina', 'Australia', 'Brazil', 'Canada', 'Denmark', 'Estonia', 'France', 'Germany', 'India', 'Ireland', 'Japan', 'Kenya', 'Mexico', 'Netherlands', 'Norway', 'Peru', 'Portugal', 'Spain', 'Sweden', 'Uruguay'] as const;
const COUNTRY_CODES = ['AR', 'AU', 'BR', 'CA', 'DK', 'EE', 'FR', 'DE', 'IN', 'IE', 'JP', 'KE', 'MX', 'NL', 'NO', 'PE', 'PT', 'ES', 'SE', 'UY'] as const;
const STREET_NAMES = ['Alder', 'Birch', 'Cedar', 'Dover', 'Elm', 'Fallow', 'Garnet', 'Hazel', 'Ivy', 'Juniper', 'Kingfisher', 'Larch', 'Maple', 'Nettle', 'Orchard', 'Poplar', 'Quarry', 'Rowan', 'Sycamore', 'Thistle'] as const;
const STREET_TYPES = ['Avenue', 'Close', 'Court', 'Crescent', 'Drive', 'Lane', 'Road', 'Street', 'Way'] as const;

const COMPANY_SUFFIXES = ['Inc', 'LLC', 'Ltd', 'Group', 'and Sons', 'Holdings'] as const;
const PRODUCT_ADJECTIVES = ['Awesome', 'Ergonomic', 'Fantastic', 'Handcrafted', 'Incredible', 'Intelligent', 'Practical', 'Refined', 'Rustic', 'Sleek'] as const;
const PRODUCT_MATERIALS = ['Bamboo', 'Concrete', 'Cotton', 'Frozen', 'Granite', 'Leather', 'Plastic', 'Rubber', 'Steel', 'Wooden'] as const;
const PRODUCTS = ['Bench', 'Chair', 'Chips', 'Computer', 'Gloves', 'Hat', 'Keyboard', 'Lamp', 'Mouse', 'Pants', 'Salad', 'Shirt', 'Shoes', 'Table', 'Towels'] as const;
const DEPARTMENTS = ['Automotive', 'Books', 'Clothing', 'Electronics', 'Garden', 'Grocery', 'Health', 'Home', 'Industrial', 'Jewelery', 'Kids', 'Movies', 'Music', 'Outdoors', 'Shoes', 'Sports', 'Tools', 'Toys'] as const;
const CATCH_A = ['Adaptive', 'Balanced', 'Cloned', 'Distributed', 'Enterprise-wide', 'Fundamental', 'Integrated', 'Multi-tiered', 'Open-source', 'Universal'] as const;
const CATCH_B = ['analysing', 'bandwidth-monitored', 'client-server', 'context-sensitive', 'encompassing', 'homogeneous', 'incremental', 'logistical', 'reciprocal', 'zero-tolerance'] as const;
const CATCH_C = ['ability', 'algorithm', 'application', 'approach', 'architecture', 'capability', 'framework', 'infrastructure', 'methodology', 'workflow'] as const;

const CURRENCIES = [
  ['USD', 'US Dollar', '$'],
  ['EUR', 'Euro', '€'],
  ['BRL', 'Brazilian Real', 'R$'],
  ['GBP', 'British Pound', '£'],
  ['JPY', 'Japanese Yen', '¥'],
  ['CAD', 'Canadian Dollar', '$'],
  ['AUD', 'Australian Dollar', '$'],
  ['MXN', 'Mexican Peso', '$'],
] as const;

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

const COLOURS = ['azure', 'black', 'blue', 'cyan', 'gold', 'green', 'grey', 'indigo', 'ivory', 'lime', 'magenta', 'maroon', 'olive', 'orange', 'pink', 'plum', 'purple', 'red', 'salmon', 'silver', 'tan', 'teal', 'violet', 'white', 'yellow'] as const;
const PROTOCOLS = ['http', 'https'] as const;
const BROWSERS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0',
] as const;

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

const firstName = () => pick(FIRST_NAMES);
const lastName = () => pick(LAST_NAMES);

/** A date `days` away from now, at a random time, as an ISO string. */
const dateAround = (days: number) =>
  new Date(Date.now() + days * 86_400_000 + integer(-43_200_000, 43_200_000)).toISOString();

const CURRENCY = () => pick(CURRENCIES);

const DEFINITIONS: DynamicVariable[] = [
  // ── Identifiers ───────────────────────────────────────────────────────
  { name: '$guid', group: 'identifiers', generate: uuid },
  { name: '$randomUUID', group: 'identifiers', generate: uuid },
  { name: '$timestamp', group: 'identifiers', generate: () => String(Math.floor(Date.now() / 1000)) },
  { name: '$isoTimestamp', group: 'identifiers', generate: () => new Date().toISOString() },
  { name: '$randomBankAccount', group: 'identifiers', generate: () => digits(8) },
  { name: '$randomBankAccountIban', group: 'identifiers', generate: () => `${pick(COUNTRY_CODES)}${digits(2)}${hex(16).toUpperCase()}` },
  { name: '$randomCreditCardMask', group: 'identifiers', generate: () => digits(4) },

  // ── People ────────────────────────────────────────────────────────────
  { name: '$randomFirstName', group: 'person', generate: firstName },
  { name: '$randomLastName', group: 'person', generate: lastName },
  { name: '$randomFullName', group: 'person', generate: () => `${firstName()} ${lastName()}` },
  { name: '$randomNamePrefix', group: 'person', generate: () => pick(NAME_PREFIXES) },
  { name: '$randomNameSuffix', group: 'person', generate: () => pick(NAME_SUFFIXES) },
  { name: '$randomJobTitle', group: 'person', generate: () => `${pick(JOB_DESCRIPTORS)} ${pick(JOB_AREAS)} ${pick(JOB_TYPES)}` },
  { name: '$randomJobArea', group: 'person', generate: () => pick(JOB_AREAS) },
  { name: '$randomJobType', group: 'person', generate: () => pick(JOB_TYPES) },
  { name: '$randomPhoneNumber', group: 'person', generate: () => `${digits(3)}-${digits(3)}-${digits(4)}` },

  // ── Internet ──────────────────────────────────────────────────────────
  {
    name: '$randomEmail',
    group: 'internet',
    generate: () => `${slug(firstName())}.${slug(lastName())}@${pick(FREE_MAIL)}`,
  },
  {
    name: '$randomExampleEmail',
    group: 'internet',
    generate: () => `${slug(firstName())}.${slug(lastName())}@example.com`,
  },
  { name: '$randomUserName', group: 'internet', generate: () => `${slug(firstName())}_${integer(10, 9999)}` },
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
  { name: '$randomCity', group: 'location', generate: () => pick(CITIES) },
  { name: '$randomCountry', group: 'location', generate: () => pick(COUNTRIES) },
  { name: '$randomCountryCode', group: 'location', generate: () => pick(COUNTRY_CODES) },
  { name: '$randomStreetName', group: 'location', generate: () => `${pick(STREET_NAMES)} ${pick(STREET_TYPES)}` },
  {
    name: '$randomStreetAddress',
    group: 'location',
    generate: () => `${integer(1, 9999)} ${pick(STREET_NAMES)} ${pick(STREET_TYPES)}`,
  },
  { name: '$randomLatitude', group: 'location', generate: () => (Math.random() * 180 - 90).toFixed(6) },
  { name: '$randomLongitude', group: 'location', generate: () => (Math.random() * 360 - 180).toFixed(6) },

  // ── Business ──────────────────────────────────────────────────────────
  { name: '$randomCompanyName', group: 'business', generate: () => `${pick(LAST_NAMES)} ${pick(COMPANY_SUFFIXES)}` },
  { name: '$randomCompanySuffix', group: 'business', generate: () => pick(COMPANY_SUFFIXES) },
  {
    name: '$randomCatchPhrase',
    group: 'business',
    generate: () => `${pick(CATCH_A)} ${pick(CATCH_B)} ${pick(CATCH_C)}`,
  },
  { name: '$randomDepartment', group: 'business', generate: () => pick(DEPARTMENTS) },
  { name: '$randomProduct', group: 'business', generate: () => pick(PRODUCTS) },
  {
    name: '$randomProductName',
    group: 'business',
    generate: () => `${pick(PRODUCT_ADJECTIVES)} ${pick(PRODUCT_MATERIALS)} ${pick(PRODUCTS)}`,
  },
  { name: '$randomProductAdjective', group: 'business', generate: () => pick(PRODUCT_ADJECTIVES) },
  { name: '$randomProductMaterial', group: 'business', generate: () => pick(PRODUCT_MATERIALS) },
  { name: '$randomPrice', group: 'business', generate: () => (integer(100, 99_900) / 100).toFixed(2) },
  { name: '$randomCurrencyCode', group: 'business', generate: () => CURRENCY()[0] },
  { name: '$randomCurrencyName', group: 'business', generate: () => CURRENCY()[1] },
  { name: '$randomCurrencySymbol', group: 'business', generate: () => CURRENCY()[2] },

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
  { name: '$randomColor', group: 'text', generate: () => pick(COLOURS) },
  { name: '$randomHexColor', group: 'text', generate: () => `#${hex(6)}` },
  { name: '$randomAbbreviation', group: 'text', generate: () => pick(['TCP', 'HTTP', 'SDD', 'RAM', 'GB', 'CSS', 'SSL', 'AGP', 'SQL', 'XML']) },

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
    Not Postman's, and named so it cannot be mistaken for one of theirs. A body
    that has to say "the day after check-in" is the single most common thing
    missing from the Postman set, and writing it by hand means editing two
    dates every time the fixture is reused.
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
export function generateDynamic(name: string): string | null {
  return BY_NAME.get(name)?.generate() ?? null;
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
