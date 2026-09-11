import { digits, integer, pick, type Corpus } from '@/lib/faker/corpus';

/**
 * Dados de teste brasileiros.
 *
 * A diferença não é só vocabulário. O cargo se monta ao contrário — "Analista
 * de Dados Sênior", não "Sênior Dados Analista" — e o endereço leva o número
 * depois do nome da via. Por isso essas entradas são funções: uma lista não
 * teria como dizer isso.
 *
 * Os acentos ficam. São o que faz o dado valer: um sistema que engasga com
 * "Natália" é exatamente o que um fixture de teste existe para encontrar. O
 * gerador de e-mail é o único que os remove, porque endereço com acento é
 * recusado por boa parte dos servidores para onde essas requisições vão.
 */

const FIRST_NAMES = [
  'Ana', 'André', 'Beatriz', 'Bruno', 'Camila', 'Carlos', 'Cláudia', 'Daniela', 'Diego', 'Eduardo',
  'Elaine', 'Fábio', 'Fernanda', 'Felipe', 'Gabriel', 'Gustavo', 'Helena', 'Igor', 'Isabela', 'Jéssica',
  'João', 'Juliana', 'Larissa', 'Leonardo', 'Letícia', 'Lucas', 'Luiza', 'Marcelo', 'Mariana', 'Matheus',
  'Natália', 'Otávio', 'Patrícia', 'Paulo', 'Rafael', 'Renata', 'Ricardo', 'Rodrigo', 'Sofia', 'Tatiane',
  'Thiago', 'Vanessa', 'Vinícius', 'Vitória', 'Yasmin',
] as const;

const LAST_NAMES = [
  'Almeida', 'Alves', 'Araújo', 'Barbosa', 'Barros', 'Cardoso', 'Carvalho', 'Castro', 'Correia',
  'Costa', 'Dias', 'Duarte', 'Fernandes', 'Ferreira', 'Gomes', 'Gonçalves', 'Lima', 'Lopes',
  'Machado', 'Martins', 'Melo', 'Mendes', 'Monteiro', 'Moreira', 'Nascimento', 'Nunes', 'Oliveira',
  'Pereira', 'Pinto', 'Ramos', 'Ribeiro', 'Rocha', 'Rodrigues', 'Santos', 'Silva', 'Soares',
  'Sousa', 'Teixeira', 'Vieira',
] as const;

/* Cargo: tipo + área, com a senioridade no fim, que é como se escreve. */
const JOB_TYPES = ['Analista', 'Assistente', 'Consultor', 'Coordenador', 'Desenvolvedor', 'Diretor', 'Engenheiro', 'Especialista', 'Gerente', 'Supervisor'] as const;
const JOB_AREAS = ['Atendimento', 'Dados', 'Infraestrutura', 'Integração', 'Logística', 'Marketing', 'Operações', 'Pesquisa', 'Produto', 'Segurança'] as const;
const JOB_LEVELS = ['Júnior', 'Pleno', 'Sênior', ''] as const;

const STREET_TYPES = ['Rua', 'Avenida', 'Travessa', 'Alameda', 'Praça', 'Estrada'] as const;
const STREET_NAMES = [
  'das Flores', 'das Palmeiras', 'dos Ipês', 'Sete de Setembro', 'Quinze de Novembro',
  'Getúlio Vargas', 'Santos Dumont', 'Dom Pedro II', 'Marechal Deodoro', 'São João',
  'Santa Catarina', 'Tiradentes', 'Duque de Caxias', 'Barão do Rio Branco', 'Nossa Senhora de Fátima',
  'Padre Anchieta', 'Visconde de Taunay', 'Juscelino Kubitschek',
] as const;

const COMPANY_SUFFIXES = ['Ltda', 'S.A.', 'ME', 'EIRELI', 'e Filhos', 'Participações'] as const;
const PRODUCT_ADJECTIVES = ['Artesanal', 'Compacto', 'Elegante', 'Ergonômico', 'Incrível', 'Inteligente', 'Prático', 'Refinado', 'Resistente', 'Rústico'] as const;
const PRODUCT_MATERIALS = ['de Aço', 'de Algodão', 'de Bambu', 'de Borracha', 'de Couro', 'de Granito', 'de Madeira', 'de Plástico', 'de Vidro'] as const;
const PRODUCTS = ['Cadeira', 'Mesa', 'Teclado', 'Mouse', 'Luminária', 'Camisa', 'Tênis', 'Bolsa', 'Banco', 'Toalha', 'Chaveiro', 'Caneca'] as const;

const CATCH_A = ['Adaptável', 'Distribuída', 'Escalável', 'Estratégica', 'Fundamental', 'Integrada', 'Modular', 'Multicamada', 'Progressiva', 'Universal'] as const;
const CATCH_B = ['de alto desempenho', 'de baixa latência', 'em tempo real', 'orientada a eventos', 'ponta a ponta', 'sob demanda'] as const;
const CATCH_C = ['arquitetura', 'abordagem', 'capacidade', 'infraestrutura', 'metodologia', 'plataforma', 'solução'] as const;

/** DDDs reais espalhados pelo país, para o telefone sair plausível. */
const AREA_CODES = ['11', '19', '21', '27', '31', '41', '47', '48', '51', '61', '71', '81', '85', '92'] as const;

export const PT_BR: Corpus = {
  firstNames: FIRST_NAMES,
  lastNames: LAST_NAMES,
  namePrefixes: ['Sr.', 'Sra.', 'Srta.', 'Dr.', 'Dra.'],
  nameSuffixes: ['Filho', 'Neto', 'Júnior', 'Sobrinho'],
  cities: [
    'Belo Horizonte', 'Blumenau', 'Brasília', 'Campinas', 'Chapecó', 'Curitiba', 'Florianópolis',
    'Fortaleza', 'Goiânia', 'Joinville', 'Londrina', 'Manaus', 'Natal', 'Niterói', 'Porto Alegre',
    'Recife', 'Ribeirão Preto', 'Salvador', 'Santos', 'São Paulo', 'Sorocaba', 'Uberlândia', 'Vitória',
  ],
  countries: [
    'Alemanha', 'Argentina', 'Austrália', 'Brasil', 'Canadá', 'Chile', 'Colômbia', 'Dinamarca',
    'Espanha', 'Estados Unidos', 'França', 'Índia', 'Irlanda', 'Itália', 'Japão', 'México',
    'Noruega', 'Paraguai', 'Peru', 'Portugal', 'Suécia', 'Uruguai',
  ],
  countryCodes: ['AR', 'BR', 'CL', 'CO', 'DE', 'ES', 'FR', 'IT', 'JP', 'MX', 'PE', 'PT', 'PY', 'US', 'UY'],
  departments: [
    'Alimentos', 'Automotivo', 'Beleza', 'Brinquedos', 'Casa', 'Eletrônicos', 'Esportes',
    'Ferramentas', 'Infantil', 'Informática', 'Jardim', 'Livros', 'Moda', 'Móveis', 'Papelaria',
    'Pet', 'Saúde',
  ],
  products: PRODUCTS,
  colours: ['amarelo', 'azul', 'bege', 'bordô', 'branco', 'cinza', 'dourado', 'laranja', 'lilás', 'marrom', 'prata', 'preto', 'rosa', 'roxo', 'turquesa', 'verde', 'vermelho', 'vinho'],
  abbreviations: ['TCP', 'HTTP', 'SSD', 'RAM', 'GB', 'CSS', 'SSL', 'SQL', 'XML', 'CPF'],
  currencies: [
    ['BRL', 'Real', 'R$'],
    ['USD', 'Dólar americano', 'US$'],
    ['EUR', 'Euro', '€'],
    ['ARS', 'Peso argentino', '$'],
    ['GBP', 'Libra esterlina', '£'],
    ['JPY', 'Iene', '¥'],
    ['CLP', 'Peso chileno', '$'],
  ],

  jobArea: () => pick(JOB_AREAS),
  jobType: () => pick(JOB_TYPES),
  jobTitle: () => `${pick(JOB_TYPES)} de ${pick(JOB_AREAS)} ${pick(JOB_LEVELS)}`.trim(),
  companyName: () => `${pick(LAST_NAMES)} ${pick(COMPANY_SUFFIXES)}`,
  companySuffix: () => pick(COMPANY_SUFFIXES),
  catchPhrase: () => `${pick(CATCH_C)} ${pick(CATCH_A)} ${pick(CATCH_B)}`,
  streetName: () => `${pick(STREET_TYPES)} ${pick(STREET_NAMES)}`,
  // Número depois do nome, separado por vírgula, como se escreve no Brasil.
  streetAddress: () => `${pick(STREET_TYPES)} ${pick(STREET_NAMES)}, ${integer(1, 4999)}`,
  productName: () => `${pick(PRODUCTS)} ${pick(PRODUCT_ADJECTIVES)} ${pick(PRODUCT_MATERIALS)}`,
  productAdjective: () => pick(PRODUCT_ADJECTIVES),
  productMaterial: () => pick(PRODUCT_MATERIALS),
  // Celular: nove dígitos começando em 9, com o DDD entre parênteses.
  phone: () => `(${pick(AREA_CODES)}) 9${digits(4)}-${digits(4)}`,
};
