import { createEnvironment, createFolder, createRequest, emptyAuth, row } from '@/lib/factories';
import type { ParsedImport } from '@/lib/postman';
import type { Auth, Folder, HttpMethod, KeyValue, RequestRecord } from '@/types';

/**
 * Read an Insomnia v4 export.
 *
 * The file is a flat list of resources — workspaces, folders, requests,
 * environments — wired together by `parentId`, so the tree is rebuilt rather
 * than read. Insomnia v5 is YAML and would need a parser this app does not
 * carry; `looksLikeInsomniaV5` exists so the dialog can say that plainly
 * instead of failing on a file that is obviously an Insomnia export.
 */

type Resource = Record<string, unknown>;

function asObject(value: unknown): Resource {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Resource) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value);
}

/**
 * Insomnia writes a variable as `{{ _.name }}`; this app writes `{{name}}`.
 *
 * Both the bare `{{ name }}` form and the `_.`-prefixed one appear in real
 * exports, so both are normalised — and the whitespace goes with them, since
 * `{{ name }}` and `{{name}}` are the same variable here.
 */
export function toTemplate(value: string): string {
  return value.replace(/\{\{\s*(?:_\.)?([\w.-]+)\s*\}\}/g, '{{$1}}');
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

function methodOf(value: unknown): HttpMethod {
  const upper = text(value).toUpperCase() as HttpMethod;
  return METHODS.includes(upper) ? upper : 'GET';
}

function rows(list: unknown): KeyValue[] {
  return asArray(list)
    .map(asObject)
    .filter((item) => text(item.name))
    .map((item) => row(toTemplate(text(item.name)), toTemplate(text(item.value)), item.disabled !== true));
}

function authOf(resource: Resource): Auth {
  const auth = asObject(resource.authentication);
  const type = text(auth.type).toLowerCase();
  if (auth.disabled === true || !type) return { ...emptyAuth(), type: 'inherit' };
  if (type === 'bearer') return { ...emptyAuth(), type: 'bearer', token: toTemplate(text(auth.token)) };
  if (type === 'basic') {
    return {
      ...emptyAuth(),
      type: 'basic',
      username: toTemplate(text(auth.username)),
      password: toTemplate(text(auth.password)),
    };
  }
  if (type === 'apikey') {
    return {
      ...emptyAuth(),
      type: 'apikey',
      apiKeyName: text(auth.key),
      apiKeyValue: toTemplate(text(auth.value)),
      apiKeyIn: text(auth.addTo).toLowerCase() === 'queryparams' ? 'query' : 'header',
    };
  }
  // Insomnia also stores OAuth grants; the token is the part that survives.
  if (type === 'oauth2') return { ...emptyAuth(), type: 'bearer', token: toTemplate(text(auth.accessToken)) };
  return { ...emptyAuth(), type: 'inherit' };
}

/** Returns a patch rather than a fixed shape, so GraphQL can bring its own field. */
function bodyOf(resource: Resource): Partial<RequestRecord> {
  const body = asObject(resource.body);
  const mime = text(body.mimeType).toLowerCase();
  if (!mime && !body.text) return { bodyType: 'none' };

  if (mime.includes('json')) return { bodyType: 'json', body: toTemplate(text(body.text)) };
  if (mime.includes('xml')) return { bodyType: 'xml', body: toTemplate(text(body.text)) };
  if (mime.includes('graphql')) {
    // Insomnia stores the query and its variables as one JSON blob.
    try {
      const parsed = asObject(JSON.parse(text(body.text)));
      return {
        bodyType: 'graphql',
        graphql: {
          query: toTemplate(text(parsed.query)),
          variables: parsed.variables ? JSON.stringify(parsed.variables, null, 2) : '',
        },
      };
    } catch {
      return { bodyType: 'text', body: toTemplate(text(body.text)) };
    }
  }
  if (mime.includes('x-www-form-urlencoded')) return { bodyType: 'form', form: rows(body.params) };
  if (mime.includes('multipart')) {
    // A file part in Insomnia is a path on the machine that exported it, which
    // means nothing here; the field survives and says what to attach, which
    // beats an empty row that looks finished.
    const parts = asArray(body.params).map(asObject).map((part) => {
      const fileName = text(part.fileName);
      return row(
        text(part.name),
        fileName ? `(attach ${fileName.split(/[\\/]/).pop()})` : toTemplate(text(part.value)),
        part.disabled !== true,
      );
    });
    return { bodyType: 'multipart', multipart: parts };
  }
  return { bodyType: 'text', body: toTemplate(text(body.text)) };
}

export function importInsomnia(payload: unknown, workspaceId: string, startIndex = 0): ParsedImport {
  const resources = asArray(asObject(payload).resources).map(asObject);
  const groups = resources.filter((item) => text(item._type) === 'request_group');
  const requestResources = resources.filter((item) => text(item._type) === 'request');
  const workspace = resources.find((item) => text(item._type) === 'workspace');
  const name = text(workspace?.name) || 'Insomnia import';

  const folders: Folder[] = [];
  const byOldId = new Map<string, Folder>();

  // Everything hangs off one folder named after the exported workspace, so an
  // import is one thing in the tree rather than a scattering.
  const root = createFolder(workspaceId, name, null, startIndex);
  folders.push(root);

  groups.forEach((group, index) => {
    const folder = createFolder(workspaceId, text(group.name) || 'Folder', root.id, index);
    byOldId.set(text(group._id), folder);
    folders.push(folder);
  });

  // A second pass wires the parents: the export lists resources in no
  // particular order, so a child can appear before its own group.
  for (const group of groups) {
    const folder = byOldId.get(text(group._id));
    const parent = byOldId.get(text(group.parentId));
    if (folder) folder.parentId = parent ? parent.id : root.id;
  }

  const requests = requestResources.map((resource, index) =>
    createRequest({
      workspaceId,
      folderId: byOldId.get(text(resource.parentId))?.id ?? root.id,
      name: text(resource.name) || 'Imported request',
      description: text(resource.description),
      method: methodOf(resource.method),
      url: toTemplate(text(resource.url)),
      params: rows(resource.parameters),
      headers: rows(resource.headers),
      auth: authOf(resource),
      sortIndex: index,
      ...bodyOf(resource),
    }),
  );

  /*
    Insomnia nests its environments: the base hangs off the workspace, and each
    sub-environment hangs off the base. So the base is found by its parent and
    the subs by theirs, rather than by position in a list that has no order.
  */
  const environments = resources.filter((item) => text(item._type) === 'environment');
  const base = environments.find((item) => text(item.parentId) === text(workspace?._id));
  const sub = environments.find((item) => base && text(item.parentId) === text(base._id));

  const asRows = (data: unknown) =>
    Object.entries(asObject(data)).map(([key, value]) =>
      row(key, typeof value === 'string' ? toTemplate(value) : JSON.stringify(value)),
    );

  const environment = sub ? createEnvironment(workspaceId, text(sub.name) || 'Insomnia', false, asRows(sub.data)) : null;
  // The base's variables go to *this* app's base environment, for the same
  // reason the Postman importer does it: a folder-scoped copy would outrank the
  // selected environment and shadow the real value.
  const variables = base ? asRows(base.data) : [];

  return { name, folders, requests, environment, variables };
}

export function looksLikeInsomnia(payload: unknown): boolean {
  const doc = asObject(payload);
  return text(doc._type) === 'export' && Array.isArray(doc.resources);
}

/** v5 is YAML, which this app has no parser for. Detected only to say so. */
export function looksLikeInsomniaV5(raw: string): boolean {
  return /^\s*type:\s*collection\.insomnia\.rest/m.test(raw) || /insomnia\.rest\/schema/.test(raw);
}
