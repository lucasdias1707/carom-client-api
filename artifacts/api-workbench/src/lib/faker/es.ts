import { digits, integer, pick, type Corpus } from '@/lib/faker/corpus';

/**
 * Datos de prueba en español.
 *
 * Neutro, como el resto de la interfaz: nombres y ciudades de ambos lados del
 * Atlántico, sin léxico de un solo país. Los apellidos van de a uno — el par
 * paterno-materno es lo normal en varios países y en otros no, y un fixture
 * con dos apellidos rompe cualquier campo que espere uno.
 *
 * El cargo se arma al revés que en inglés ("Analista de Datos", no "Datos
 * Analista") y la dirección lleva el número después de la calle. Por eso esas
 * entradas son funciones y no listas.
 */

const FIRST_NAMES = [
  'Adrián', 'Alejandra', 'Alejandro', 'Ana', 'Andrés', 'Beatriz', 'Camila', 'Carlos', 'Carmen',
  'Daniel', 'Diego', 'Elena', 'Emilio', 'Fernando', 'Gabriela', 'Gonzalo', 'Inés', 'Javier',
  'Jorge', 'José', 'Juan', 'Laura', 'Lucía', 'Luis', 'Manuel', 'Marta', 'Martín', 'Mateo',
  'Miguel', 'Natalia', 'Nicolás', 'Pablo', 'Paula', 'Pilar', 'Ricardo', 'Rocío', 'Sofía',
  'Teresa', 'Valentina', 'Ximena',
] as const;

const LAST_NAMES = [
  'Aguirre', 'Álvarez', 'Benítez', 'Cabrera', 'Castillo', 'Castro', 'Delgado', 'Díaz', 'Domínguez',
  'Fernández', 'Flores', 'García', 'Gómez', 'González', 'Gutiérrez', 'Hernández', 'Herrera',
  'Jiménez', 'López', 'Márquez', 'Martín', 'Martínez', 'Medina', 'Méndez', 'Molina', 'Morales',
  'Moreno', 'Muñoz', 'Navarro', 'Ortega', 'Peña', 'Pérez', 'Ramírez', 'Ramos', 'Reyes', 'Rivera',
  'Rodríguez', 'Romero', 'Ruiz', 'Sánchez', 'Santos', 'Serrano', 'Torres', 'Vargas', 'Vega',
] as const;

const JOB_TYPES = ['Analista', 'Arquitecto', 'Asesor', 'Consultor', 'Coordinador', 'Desarrollador', 'Director', 'Especialista', 'Gerente', 'Responsable'] as const;
const JOB_AREAS = ['Atención al Cliente', 'Calidad', 'Datos', 'Infraestructura', 'Integración', 'Logística', 'Marketing', 'Operaciones', 'Producto', 'Seguridad'] as const;
const JOB_LEVELS = ['Junior', 'Senior', ''] as const;

const STREET_TYPES = ['Calle', 'Avenida', 'Paseo', 'Plaza', 'Camino', 'Ronda'] as const;
const STREET_NAMES = [
  'Mayor', 'Real', 'del Sol', 'de la Constitución', 'de los Olivos', 'de las Acacias',
  'San Martín', 'Simón Bolívar', 'Cervantes', 'Colón', 'Independencia', 'Libertad',
  'Gran Vía', 'de la Paz', 'del Carmen', 'Montevideo', 'Buenos Aires',
] as const;

const COMPANY_SUFFIXES = ['S.L.', 'S.A.', 'y Asociados', 'Group', 'e Hijos', 'Holding'] as const;
const PRODUCT_ADJECTIVES = ['Artesanal', 'Compacto', 'Elegante', 'Ergonómico', 'Increíble', 'Inteligente', 'Práctico', 'Refinado', 'Resistente', 'Rústico'] as const;
const PRODUCT_MATERIALS = ['de Acero', 'de Algodón', 'de Bambú', 'de Cuero', 'de Goma', 'de Granito', 'de Madera', 'de Plástico', 'de Vidrio'] as const;
const PRODUCTS = ['Silla', 'Mesa', 'Teclado', 'Ratón', 'Lámpara', 'Camisa', 'Zapatos', 'Bolso', 'Banco', 'Toalla', 'Llavero', 'Taza'] as const;

const CATCH_A = ['Adaptable', 'Distribuida', 'Escalable', 'Estratégica', 'Fundamental', 'Integrada', 'Modular', 'Multicapa', 'Progresiva', 'Universal'] as const;
const CATCH_B = ['de alto rendimiento', 'de baja latencia', 'en tiempo real', 'orientada a eventos', 'de extremo a extremo', 'bajo demanda'] as const;
const CATCH_C = ['arquitectura', 'capacidad', 'infraestructura', 'metodología', 'plataforma', 'solución'] as const;

export const ES: Corpus = {
  firstNames: FIRST_NAMES,
  lastNames: LAST_NAMES,
  namePrefixes: ['Sr.', 'Sra.', 'Srta.', 'Dr.', 'Dra.'],
  nameSuffixes: ['Hijo', 'Padre', 'Jr.'],
  cities: [
    'Barcelona', 'Bilbao', 'Bogotá', 'Buenos Aires', 'Córdoba', 'Guadalajara', 'La Plata', 'Lima',
    'Madrid', 'Málaga', 'Medellín', 'Mendoza', 'Monterrey', 'Montevideo', 'Quito', 'Rosario',
    'San José', 'Santiago', 'Sevilla', 'Valencia', 'Valparaíso', 'Zaragoza',
  ],
  countries: [
    'Alemania', 'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Costa Rica', 'Ecuador',
    'España', 'Estados Unidos', 'Francia', 'Guatemala', 'Italia', 'México', 'Panamá', 'Paraguay',
    'Perú', 'Portugal', 'República Dominicana', 'Uruguay', 'Venezuela',
  ],
  countryCodes: ['AR', 'BO', 'BR', 'CL', 'CO', 'CR', 'DO', 'EC', 'ES', 'GT', 'MX', 'PA', 'PE', 'PY', 'US', 'UY', 'VE'],
  departments: [
    'Alimentación', 'Automoción', 'Belleza', 'Deportes', 'Electrónica', 'Ferretería', 'Hogar',
    'Infantil', 'Informática', 'Jardín', 'Juguetes', 'Libros', 'Mascotas', 'Moda', 'Muebles',
    'Papelería', 'Salud',
  ],
  products: PRODUCTS,
  colours: ['amarillo', 'azul', 'beige', 'blanco', 'dorado', 'granate', 'gris', 'lila', 'marrón', 'morado', 'naranja', 'negro', 'plateado', 'rojo', 'rosa', 'turquesa', 'verde', 'violeta'],
  abbreviations: ['TCP', 'HTTP', 'SSD', 'RAM', 'GB', 'CSS', 'SSL', 'SQL', 'XML', 'DNI'],
  currencies: [
    ['EUR', 'Euro', '€'],
    ['USD', 'Dólar estadounidense', 'US$'],
    ['MXN', 'Peso mexicano', '$'],
    ['ARS', 'Peso argentino', '$'],
    ['COP', 'Peso colombiano', '$'],
    ['CLP', 'Peso chileno', '$'],
    ['PEN', 'Sol', 'S/'],
    ['BRL', 'Real brasileño', 'R$'],
  ],

  jobArea: () => pick(JOB_AREAS),
  jobType: () => pick(JOB_TYPES),
  jobTitle: () => `${pick(JOB_TYPES)} de ${pick(JOB_AREAS)} ${pick(JOB_LEVELS)}`.trim(),
  companyName: () => `${pick(LAST_NAMES)} ${pick(COMPANY_SUFFIXES)}`,
  companySuffix: () => pick(COMPANY_SUFFIXES),
  catchPhrase: () => `${pick(CATCH_C)} ${pick(CATCH_A)} ${pick(CATCH_B)}`,
  streetName: () => `${pick(STREET_TYPES)} ${pick(STREET_NAMES)}`,
  streetAddress: () => `${pick(STREET_TYPES)} ${pick(STREET_NAMES)}, ${integer(1, 250)}`,
  productName: () => `${pick(PRODUCTS)} ${pick(PRODUCT_ADJECTIVES)} ${pick(PRODUCT_MATERIALS)}`,
  productAdjective: () => pick(PRODUCT_ADJECTIVES),
  productMaterial: () => pick(PRODUCT_MATERIALS),
  phone: () => `+34 ${digits(3)} ${digits(3)} ${digits(3)}`,
};
