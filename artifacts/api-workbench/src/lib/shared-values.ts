import type { Environment, KeyValue } from '@/types';

/**
 * Which variable values belong to the project, and which to the person.
 *
 * This is the other half of "stop the shared file conflicting". Splitting one
 * file into many stops two people who added different requests from colliding;
 * it does nothing about `baseUrl`, which is `localhost:3000` for me and
 * `localhost:8080` for you. That is not a disagreement anyone can resolve —
 * both are right — so it must not be in a shared file to begin with.
 *
 * So a variable's *name* is always shared, and its *value* travels only if it
 * is marked as the project's. A pull then gives you every variable the project
 * uses, with the shared values filled in and your own ones blank and drawn
 * red, which is the same thing `.env.example` does and for the same reason.
 *
 * The default matters more than the mechanism. Defaulting to "share" puts
 * somebody's token in a public repository on the first commit. Defaulting to
 * "keep local" hands the second person a workspace where nothing works,
 * including the public base URL that obviously should have travelled. So the
 * default is to share, *except* where the name says the value is a credential
 * — and whatever that guess produces is shown, and editable, before anything
 * is written.
 */

/**
 * Words that mean "this is a credential", in the three languages the app
 * speaks plus the ones that turn up in API documentation regardless.
 *
 * Substrings, because the names people actually use are `apiToken`,
 * `X_AUTH_KEY`, `senha_admin`. False positives here cost nothing: the variable
 * still works, its value just stays on the machine it was typed on. A false
 * negative costs a credential in a public repository, so the list leans long.
 */
const SECRET_WORDS = [
  'auth',
  'bearer',
  'clave',
  'contrasena',
  'contraseña',
  'cookie',
  'credential',
  'credencial',
  'jwt',
  'key',
  'oauth',
  'pass',
  'private',
  'pwd',
  'secret',
  'segredo',
  'senha',
  'session',
  'sessao',
  'sessão',
  'signature',
  'token',
];

/**
 * Words that contain a secret word but are not one.
 *
 * `monkey` holds `key`; so does `keyword`. Checked first, because the point of
 * the guess is that it is right often enough to be worth showing.
 */
const NOT_SECRET = ['monkey', 'keyword', 'keyboard', 'passenger', 'compass', 'bypass', 'keystone'];

/** Whether a variable's name suggests its value is a credential. */
export function looksSecret(name: string): boolean {
  const text = name.toLowerCase().replace(/[\s_-]+/g, '');
  if (NOT_SECRET.some((word) => text.includes(word))) return false;
  return SECRET_WORDS.some((word) => text.includes(word));
}

/**
 * Which variables the project should carry values for, keyed as
 * `environmentId::variableName`.
 *
 * Stored as the set that *is* shared rather than the set that is not, so a
 * variable added later starts out local. Adding a variable to a project you
 * share should never publish its value because someone forgot to look.
 */
export type SharedValueKeys = Set<string>;

export function shareKey(environmentId: string, name: string): string {
  return `${environmentId}::${name.trim()}`;
}

/** The guess, for a workspace about to be linked for the first time. */
export function suggestShared(environments: Environment[]): SharedValueKeys {
  const shared: SharedValueKeys = new Set();
  for (const environment of environments) {
    for (const variable of environment.variables) {
      const name = variable.key.trim();
      if (name && !looksSecret(name)) shared.add(shareKey(environment.id, name));
    }
  }
  return shared;
}

/** What a row in the "what will be shared" list needs to say. */
export type ShareRow = {
  environmentId: string;
  environmentName: string;
  name: string;
  value: string;
  shared: boolean;
  /** True when the guess put it here, so the reason can be shown. */
  looksSecret: boolean;
};

export function shareRows(environments: Environment[], shared: SharedValueKeys): ShareRow[] {
  const rows: ShareRow[] = [];
  for (const environment of environments) {
    for (const variable of environment.variables) {
      const name = variable.key.trim();
      if (!name) continue;
      rows.push({
        environmentId: environment.id,
        environmentName: environment.name,
        name,
        value: variable.value,
        shared: shared.has(shareKey(environment.id, name)),
        looksSecret: looksSecret(name),
      });
    }
  }
  return rows;
}

/** Does this variable's value travel with the project? */
export function shares(shared: SharedValueKeys, environment: Environment, variable: KeyValue): boolean {
  return shared.has(shareKey(environment.id, variable.key.trim()));
}

/**
 * Keep the values the reader owns, across a pull that blanks them.
 *
 * Reading the directory replaces the workspace, so a value the file
 * deliberately does not carry would be lost every time anyone pulls. These are
 * held beside the link and put back afterwards, which is what makes "your
 * token stays yours" survive more than one sync.
 */
export type LocalValues = Record<string, string>;

export function rememberLocal(
  environments: Environment[],
  shared: SharedValueKeys,
  existing: LocalValues,
): LocalValues {
  const kept: LocalValues = { ...existing };
  for (const environment of environments) {
    for (const variable of environment.variables) {
      const name = variable.key.trim();
      if (!name || shares(shared, environment, variable)) continue;
      // An empty value is not worth remembering over one that arrived with
      // the project, and remembering it would blank the field on every pull.
      if (variable.value) kept[shareKey(environment.id, name)] = variable.value;
    }
  }
  return kept;
}

/** Put the reader's own values back into what the directory just produced. */
export function restoreLocal(environments: Environment[], local: LocalValues): Environment[] {
  return environments.map((environment) => ({
    ...environment,
    variables: environment.variables.map((variable) => {
      const name = variable.key.trim();
      const remembered = local[shareKey(environment.id, name)];
      // Only where the file left it blank: a value the project carries wins,
      // because that one is a decision somebody made on purpose.
      return remembered !== undefined && variable.value === ''
        ? { ...variable, value: remembered }
        : variable;
    }),
  }));
}
