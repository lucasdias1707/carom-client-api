import { digits, integer, pick, type Corpus } from '@/lib/faker/corpus';

/**
 * English test data, which is also the fallback.
 *
 * The names are deliberately international rather than Anglo-American: these
 * end up in systems that will be asked to handle a real customer list, and a
 * fixture made entirely of seven-letter ASCII names hides exactly the bugs
 * worth finding. The email generator strips the accents back off, because an
 * address with a non-ASCII local part is rejected by plenty of the servers
 * these requests are pointed at.
 */

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

const JOB_DESCRIPTORS = ['Lead', 'Senior', 'Principal', 'Regional', 'Global', 'Chief', 'Dynamic', 'Forward'] as const;
const JOB_AREAS = ['Accounts', 'Brand', 'Data', 'Infrastructure', 'Integration', 'Marketing', 'Operations', 'Optimization', 'Research', 'Security'] as const;
const JOB_TYPES = ['Agent', 'Analyst', 'Architect', 'Consultant', 'Designer', 'Developer', 'Engineer', 'Manager', 'Officer', 'Specialist'] as const;

const STREET_NAMES = ['Alder', 'Birch', 'Cedar', 'Dover', 'Elm', 'Fallow', 'Garnet', 'Hazel', 'Ivy', 'Juniper', 'Kingfisher', 'Larch', 'Maple', 'Nettle', 'Orchard', 'Poplar', 'Quarry', 'Rowan', 'Sycamore', 'Thistle'] as const;
const STREET_TYPES = ['Avenue', 'Close', 'Court', 'Crescent', 'Drive', 'Lane', 'Road', 'Street', 'Way'] as const;

const COMPANY_SUFFIXES = ['Inc', 'LLC', 'Ltd', 'Group', 'and Sons', 'Holdings'] as const;
const PRODUCT_ADJECTIVES = ['Awesome', 'Ergonomic', 'Fantastic', 'Handcrafted', 'Incredible', 'Intelligent', 'Practical', 'Refined', 'Rustic', 'Sleek'] as const;
const PRODUCT_MATERIALS = ['Bamboo', 'Concrete', 'Cotton', 'Frozen', 'Granite', 'Leather', 'Plastic', 'Rubber', 'Steel', 'Wooden'] as const;

const CATCH_A = ['Adaptive', 'Balanced', 'Cloned', 'Distributed', 'Enterprise-wide', 'Fundamental', 'Integrated', 'Multi-tiered', 'Open-source', 'Universal'] as const;
const CATCH_B = ['analysing', 'bandwidth-monitored', 'client-server', 'context-sensitive', 'encompassing', 'homogeneous', 'incremental', 'logistical', 'reciprocal', 'zero-tolerance'] as const;
const CATCH_C = ['ability', 'algorithm', 'application', 'approach', 'architecture', 'capability', 'framework', 'infrastructure', 'methodology', 'workflow'] as const;

export const EN: Corpus = {
  firstNames: FIRST_NAMES,
  lastNames: LAST_NAMES,
  namePrefixes: ['Mr', 'Mrs', 'Ms', 'Dr', 'Miss'],
  nameSuffixes: ['Jr.', 'Sr.', 'I', 'II', 'III', 'PhD', 'MD', 'DDS'],
  cities: [
    'Auckland', 'Belgrade', 'Bristol', 'Curitiba', 'Dakar', 'Edinburgh', 'Faro', 'Gothenburg',
    'Halifax', 'Innsbruck', 'Jaipur', 'Kyoto', 'Leiden', 'Nantes', 'Osaka', 'Porto', 'Quito',
    'Rotterdam', 'Salvador', 'Tallinn', 'Utrecht', 'Valencia', 'Wellington',
  ],
  countries: [
    'Argentina', 'Australia', 'Brazil', 'Canada', 'Denmark', 'Estonia', 'France', 'Germany',
    'India', 'Ireland', 'Japan', 'Kenya', 'Mexico', 'Netherlands', 'Norway', 'Peru', 'Portugal',
    'Spain', 'Sweden', 'Uruguay',
  ],
  countryCodes: ['AR', 'AU', 'BR', 'CA', 'DK', 'EE', 'FR', 'DE', 'GB', 'IE', 'IN', 'JP', 'KE', 'MX', 'NL', 'NO', 'PE', 'PT', 'SE', 'US'],
  departments: [
    'Automotive', 'Books', 'Clothing', 'Electronics', 'Garden', 'Grocery', 'Health', 'Home',
    'Industrial', 'Jewelery', 'Kids', 'Movies', 'Music', 'Outdoors', 'Shoes', 'Sports', 'Tools', 'Toys',
  ],
  products: ['Bench', 'Chair', 'Chips', 'Computer', 'Gloves', 'Hat', 'Keyboard', 'Lamp', 'Mouse', 'Pants', 'Salad', 'Shirt', 'Shoes', 'Table', 'Towels'],
  colours: ['azure', 'black', 'blue', 'cyan', 'gold', 'green', 'grey', 'indigo', 'ivory', 'lime', 'magenta', 'maroon', 'olive', 'orange', 'pink', 'plum', 'purple', 'red', 'salmon', 'silver', 'tan', 'teal', 'violet', 'white', 'yellow'],
  abbreviations: ['TCP', 'HTTP', 'SDD', 'RAM', 'GB', 'CSS', 'SSL', 'AGP', 'SQL', 'XML'],
  currencies: [
    ['USD', 'US Dollar', '$'],
    ['EUR', 'Euro', '€'],
    ['GBP', 'British Pound', '£'],
    ['BRL', 'Brazilian Real', 'R$'],
    ['JPY', 'Japanese Yen', '¥'],
    ['CAD', 'Canadian Dollar', '$'],
    ['AUD', 'Australian Dollar', '$'],
    ['MXN', 'Mexican Peso', '$'],
  ],

  jobArea: () => pick(JOB_AREAS),
  jobType: () => pick(JOB_TYPES),
  jobTitle: () => `${pick(JOB_DESCRIPTORS)} ${pick(JOB_AREAS)} ${pick(JOB_TYPES)}`,
  companyName: () => `${pick(LAST_NAMES)} ${pick(COMPANY_SUFFIXES)}`,
  companySuffix: () => pick(COMPANY_SUFFIXES),
  catchPhrase: () => `${pick(CATCH_A)} ${pick(CATCH_B)} ${pick(CATCH_C)}`,
  streetName: () => `${pick(STREET_NAMES)} ${pick(STREET_TYPES)}`,
  streetAddress: () => `${integer(1, 9999)} ${pick(STREET_NAMES)} ${pick(STREET_TYPES)}`,
  productName: () => `${pick(PRODUCT_ADJECTIVES)} ${pick(PRODUCT_MATERIALS)} ${pick(['Bench', 'Chair', 'Computer', 'Gloves', 'Hat', 'Keyboard', 'Lamp', 'Mouse', 'Shirt', 'Table'])}`,
  productAdjective: () => pick(PRODUCT_ADJECTIVES),
  productMaterial: () => pick(PRODUCT_MATERIALS),
  phone: () => `${digits(3)}-${digits(3)}-${digits(4)}`,
};
