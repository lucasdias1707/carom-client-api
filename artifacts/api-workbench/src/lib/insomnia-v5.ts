import { ENVIRONMENT_COLORS, createEnvironment, createFolder, createRequest, emptyAuth, row } from '@/lib/factories';
import { asArray, asObject, bodyOf, dataRows, methodOf, rows, text, toTemplate } from '@/lib/insomnia';
import { importOpenApi, looksLikeOpenApi } from '@/lib/openapi';
import type { ImportNote, ParsedImport } from '@/lib/postman';
import type { Auth, Environment, Folder, KeyValue, RequestRecord } from '@/types';

/**
 * Read an Insomnia v5 export.
 *
 * Where v4 was a flat list wired together by `parentId`, v5 is a nested YAML
 * document: a collection holds folders that hold folders that hold requests,
 * and the environments hang off the top. The shape was read from Insomnia's own
 * schema (`import-v5-parser.ts`) rather than from a sample export, so the
 * things a sample happens not to contain are still accounted for.
 *
 * The file arrives already parsed — turning YAML into an object is the
 * caller's job — so this module stays a plain function of data.
 */

type Item = Record<string, unknown>;
type Notes = Partial<Record<ImportNote, number>>;

const note = (notes: Notes, kind: ImportNote) => {
  notes[kind] = (notes[kind] ?? 0) + 1;
};

/**
 * Insomnia shows a folder's contents by `meta.sortKey`, ascending, folders and
 * requests together. The export normally lists them that way already, so the
 * file's own order is kept unless *every* item carries a key to sort by.
 */
function ordered(items: Item[]): Item[] {
  const key = (item: Item) => {
    const value = asObject(item.meta).sortKey;
    return typeof value === 'number' ? value : null;
  };
  return items.every((item) => key(item) !== null) ? [...items].sort((a, b) => key(a)! - key(b)!) : items;
}

/** Insomnia's environment colours are free-form hex; ours come from a palette, so anything else cycles it. */
function colourOf(value: unknown, index: number): string {
  const candidate = text(value);
  return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate : ENVIRONMENT_COLORS[(index + 1) % ENVIRONMENT_COLORS.length];
}

/**
 * A script that calls `insomnia.*` would throw here, and a throwing pre-request
 * script stops the request from being sent — so importing it live would break
 * every request it touches. It comes across as comments instead: nothing is
 * lost, and nothing breaks until someone chooses to port it.
 *
 * One that never mentions `insomnia` is most likely written against `pm`, which
 * Carom does provide, so that one is kept as it is.
 */
function scriptOf(code: unknown, notes: Notes): string {
  const source = text(code).trim();
  if (!source) return '';
  if (!/\binsomnia\b/.test(source)) return source;
  note(notes, 'scripts');
  return [
    '// Brought over from Insomnia and switched off: it uses the insomnia.* API, which',
    '// Carom does not provide, and a script that throws stops the request from being sent.',
    '// Rewrite it with carom.* (or pm.*) and remove the slashes.',
    '',
    ...source.split('\n').map((line) => `// ${line}`),
  ].join('\n');
}

type AuthResult = {
  auth: Auth;
  /** Some schemes are really a header, and travel as one. */
  headers: KeyValue[];
  /** No equivalent here; the request inherits instead. */
  unsupported: boolean;
};

const inherited = (): AuthResult => ({ auth: { ...emptyAuth(), type: 'inherit' }, headers: [], unsupported: false });
const header = (name: string, value: string): AuthResult => ({
  auth: { ...emptyAuth(), type: 'none' },
  headers: [row(name, value)],
  unsupported: false,
});

/**
 * Insomnia's schemes, mapped to the four Carom has.
 *
 * `none` and a disabled scheme both mean "send nothing", which here is `none`
 * — not `inherit`, because a request that turned authentication off must not
 * pick it up again from its folder. A missing scheme is the opposite: nothing
 * was said, so the folder gets to.
 */
function authOf(raw: unknown): AuthResult {
  const auth = asObject(raw);
  const type = text(auth.type).toLowerCase();
  if (!type || type === 'inherit') return inherited();
  if (auth.disabled === true || type === 'none') {
    return { auth: { ...emptyAuth(), type: 'none' }, headers: [], unsupported: false };
  }

  if (type === 'bearer') {
    const token = toTemplate(text(auth.token));
    const prefix = text(auth.prefix);
    if (!prefix || prefix === 'Bearer') return { auth: { ...emptyAuth(), type: 'bearer', token }, headers: [], unsupported: false };
    // Insomnia sends `<prefix> <token>`, or the bare token for the NO_PREFIX marker.
    return header('Authorization', prefix === 'NO_PREFIX' ? token : `${prefix} ${token}`);
  }
  if (type === 'basic') {
    return {
      auth: { ...emptyAuth(), type: 'basic', username: toTemplate(text(auth.username)), password: toTemplate(text(auth.password)) },
      headers: [],
      unsupported: false,
    };
  }
  if (type === 'apikey') {
    const name = text(auth.key);
    const value = toTemplate(text(auth.value));
    const addTo = text(auth.addTo);
    if (addTo === 'cookie') return header('Cookie', `${name}=${value}`);
    return {
      auth: { ...emptyAuth(), type: 'apikey', apiKeyName: name, apiKeyValue: value, apiKeyIn: addTo === 'queryParams' ? 'query' : 'header' },
      headers: [],
      unsupported: false,
    };
  }
  // An OAuth 2 grant is a flow Carom does not run; a token that was already
  // fetched is the part that can be used, and it is only good until it expires.
  if (type === 'oauth2' && text(auth.accessToken)) {
    return { auth: { ...emptyAuth(), type: 'bearer', token: toTemplate(text(auth.accessToken)) }, headers: [], unsupported: false };
  }
  return { ...inherited(), unsupported: true };
}

/**
 * Insomnia's `:name` path parameters carry their values in a separate list. The
 * URL here has nowhere to put that list, so the values go into the URL — only
 * where a `/` precedes the name, which keeps `host:8080` out of it.
 */
function withPathParameters(url: string, list: unknown): string {
  let result = url;
  for (const entry of asArray(list).map(asObject)) {
    const name = text(entry.name);
    const value = toTemplate(text(entry.value));
    if (!name || !value) continue;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(`/:${escaped}(?=[/?#]|$)`, 'g'), () => `/${value}`);
  }
  return result;
}

type Context = { workspaceId: string; folders: Folder[]; requests: RequestRecord[]; notes: Notes };

function readChildren(children: unknown[], parent: Folder, context: Context) {
  let folderIndex = 0;
  for (const item of ordered(children.map(asObject))) {
    if (Array.isArray(item.children)) {
      const folder = createFolder(context.workspaceId, text(item.name) || 'Folder', parent.id, folderIndex++);
      folder.variables = dataRows(item.environment);
      folder.preScript = scriptOf(asObject(item.scripts).preRequest, context.notes);
      folder.postScript = scriptOf(asObject(item.scripts).afterResponse, context.notes);

      const auth = authOf(item.authentication);
      // A folder cannot hold a header, so a scheme that is really one has nowhere to go.
      if (auth.unsupported || auth.headers.length > 0) note(context.notes, 'authentication');
      else folder.auth = auth.auth;
      if (asArray(item.headers).length > 0) note(context.notes, 'folderHeaders');

      context.folders.push(folder);
      readChildren(item.children, folder, context);
    } else if (text(item.method)) {
      const auth = authOf(item.authentication);
      if (auth.unsupported) note(context.notes, 'authentication');
      const scripts = asObject(item.scripts);
      context.requests.push(
        createRequest({
          workspaceId: context.workspaceId,
          folderId: parent.id,
          name: text(item.name) || 'Imported request',
          description: text(asObject(item.meta).description),
          method: methodOf(item.method),
          url: withPathParameters(toTemplate(text(item.url)), item.pathParameters),
          params: rows(item.parameters),
          headers: [...rows(item.headers), ...auth.headers],
          auth: auth.auth,
          preScript: scriptOf(scripts.preRequest, context.notes),
          postScript: scriptOf(scripts.afterResponse, context.notes),
          sortIndex: context.requests.length,
          ...bodyOf(item),
        }),
      );
    } else {
      // No method and no children: gRPC, WebSocket or Socket.IO.
      note(context.notes, 'otherProtocols');
    }
  }
}

/** The OpenAPI document inside a design-document export, when there is one to read. */
function specOf(spec: unknown): unknown {
  const contents = asObject(spec).contents;
  if (typeof contents === 'string') {
    try {
      return JSON.parse(contents);
    } catch {
      return null;
    }
  }
  return contents;
}

export function importInsomniaV5(payload: unknown, workspaceId: string, startIndex = 0): ParsedImport {
  const doc = asObject(payload);
  const type = text(doc.type);

  if (type.startsWith('mock.') || type.startsWith('mcpClient.')) {
    throw new Error(
      `That Insomnia file is ${type.startsWith('mock.') ? 'a mock server' : 'an MCP client'}, which has no HTTP requests to bring in. Export a collection instead.`,
    );
  }

  const fileEnvironments = asObject(doc.environments);
  const baseVariables = dataRows(fileEnvironments.data);
  const subs: Environment[] = asArray(fileEnvironments.subEnvironments)
    .map(asObject)
    .map((sub, index) =>
      createEnvironment(workspaceId, text(sub.name) || `Environment ${index + 1}`, false, dataRows(sub.data), colourOf(sub.color, index)),
    );

  const name = text(doc.name) || (type.startsWith('environment.') ? 'Insomnia environments' : 'Insomnia import');

  // A file that is only environments: with sub-environments they come in beside
  // the base, and without any it is one environment — the shape a Postman
  // environment file has, which the dialog already knows how to offer.
  if (type.startsWith('environment.')) {
    if (subs.length === 0) {
      return { name, folders: [], requests: [], environment: createEnvironment(workspaceId, name, false, baseVariables), variables: [] };
    }
    return { name, folders: [], requests: [], environment: null, environments: subs, variables: baseVariables };
  }

  // Everything hangs off one folder named after the exported collection, as it
  // does for v4, so an import is one thing in the tree rather than a scattering.
  const root = createFolder(workspaceId, name, null, startIndex);
  const context: Context = { workspaceId, folders: [root], requests: [], notes: {} };
  readChildren(asArray(doc.collection), root, context);

  // A design document whose requests are empty is its OpenAPI spec, which the
  // OpenAPI reader already knows how to turn into requests.
  if (type.startsWith('spec.') && context.requests.length === 0) {
    const spec = specOf(doc.spec);
    if (looksLikeOpenApi(spec)) {
      const fromSpec = importOpenApi(spec, workspaceId, startIndex);
      return {
        ...fromSpec,
        name: text(doc.name) || fromSpec.name,
        environments: subs.length > 0 ? subs : undefined,
        variables: [...fromSpec.variables, ...baseVariables],
      };
    }
  }

  return {
    name,
    folders: context.folders,
    requests: context.requests,
    environment: null,
    environments: subs.length > 0 ? subs : undefined,
    // The base goes to this app's base environment, for the reason the Postman
    // reader gives: a folder-scoped copy would outrank the selected environment.
    variables: baseVariables,
    notes: Object.keys(context.notes).length > 0 ? context.notes : undefined,
  };
}
