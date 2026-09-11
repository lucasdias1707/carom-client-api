import { fieldsIn, fieldsOf, inferType } from '@/lib/docs';
import { pruneTree } from '@/lib/tree';
import type { DocField, Folder, RequestRecord, ResponseRecord, WorkspaceState } from '@/types';

/**
 * Write an OpenAPI 3.1 description from requests.
 *
 * This is the other half of the importer: what comes out is what the Docs tab
 * knows how to say. A request with no documented fields still exports — its
 * path, method, summary and an example body — and every field described in
 * Docs adds a parameter or a property that a generated client can act on.
 *
 * It is deliberately not a round trip. Importing a description and exporting
 * it again gives you a description of *the requests*, not the original file:
 * anything the app never held (callbacks, links, discriminators, per-field
 * schemas beyond a type) was not lost here, it was never carried.
 */

type Json = Record<string, unknown>;

/** Split `{{baseUrl}}/pets/{{id}}` into its server and its path. */
export function splitUrl(url: string): { server: string; path: string } {
  const trimmed = url.trim();
  const match = trimmed.match(/^(\{\{[\w.-]+\}\}|[a-z][\w+.-]*:\/\/[^/]*)/i);
  const server = match ? match[1] : '';
  const rest = (match ? trimmed.slice(server.length) : trimmed).split('?')[0];
  // OpenAPI writes a hole as `{name}`; this app writes `{{name}}`.
  const path = rest.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, '{$1}');
  return { server, path: path.startsWith('/') ? path : `/${path}` };
}

function schemaFor(field: DocField): Json {
  const schema: Json = { type: field.type };
  if (field.example) {
    // The example is typed text; a number field wants a number in the schema.
    if (field.type === 'integer' || field.type === 'number') {
      const parsed = Number(field.example);
      if (!Number.isNaN(parsed)) schema.example = parsed;
    } else if (field.type === 'boolean') {
      schema.example = field.example === 'true';
    } else {
      schema.example = field.example;
    }
  }
  return schema;
}

/**
 * One step of a field's path: the key, and how many lists it sits inside.
 *
 * `items[]` is the key `items` holding a list; `matrix[][]` a list of lists;
 * a bare `[]` is the thing itself being a list, which is how a body that *is*
 * an array names its fields.
 */
function segmentsOf(name: string): Array<{ key: string; arrays: number }> {
  return name.split('.').map((part) => {
    const brackets = part.match(/(\[\])*$/)?.[0] ?? '';
    return { key: part.slice(0, part.length - brackets.length), arrays: brackets.length / 2 };
  });
}

type SchemaNode = {
  /** The described field that named this node exactly, if one did. */
  field?: DocField;
  children: Map<string, SchemaNode>;
  /** How many lists wrap it. The deepest claim wins: `items` and `items[].sku`
   *  describe the same property, and only the second one knows it is a list. */
  arrays: number;
};

const emptyNode = (): SchemaNode => ({ children: new Map(), arrays: 0 });

/**
 * Rebuild the nesting the field names describe.
 *
 * The Docs table is flat because a table is flat, but the names carry the
 * shape — `customer.email`, `items[].sku` — and a schema that pasted those in
 * as literal property names would describe an object with a property called
 * "items[].sku", which is not a thing. This walks them back into objects and
 * arrays.
 */
function schemaFromFields(fields: DocField[]): Json {
  const root = emptyNode();

  for (const field of fields) {
    let node = root;
    for (const { key, arrays } of segmentsOf(field.name.trim())) {
      // A segment with no key is the current node being a list, not a child.
      if (key) {
        if (!node.children.has(key)) node.children.set(key, emptyNode());
        node = node.children.get(key) as SchemaNode;
      }
      node.arrays = Math.max(node.arrays, arrays);
    }
    node.field = field;
  }

  const emit = (node: SchemaNode): Json => {
    let schema: Json;
    if (node.children.size > 0) {
      const properties: Json = {};
      const required: string[] = [];
      for (const [key, child] of node.children) {
        properties[key] = emit(child);
        if (child.field?.required) required.push(key);
      }
      // Having children is proof of an object, whatever the row's type says.
      schema = { type: 'object', properties, ...(required.length > 0 ? { required } : {}) };
    } else {
      schema = node.field ? schemaFor(node.field) : { type: 'object' };
    }
    for (let level = 0; level < node.arrays; level += 1) schema = { type: 'array', items: schema };
    // On the outside, so it describes the property and not the list's items.
    if (node.field?.description) schema.description = node.field.description;
    return schema;
  };

  return emit(root);
}

function parametersFor(request: RequestRecord): Json[] {
  const parameters: Json[] = [];
  for (const where of ['path', 'query', 'header'] as const) {
    for (const field of fieldsIn(request, where)) {
      parameters.push({
        name: field.name,
        in: where,
        // A path parameter that is not required is not a path parameter: the
        // address would not resolve. OpenAPI requires the flag to say so.
        required: where === 'path' ? true : field.required,
        ...(field.description ? { description: field.description } : {}),
        schema: schemaFor(field),
      });
    }
  }
  return parameters;
}

/**
 * The body's schema.
 *
 * Fields described in Docs win, because someone wrote them. When none were
 * described, the body itself is the description: its keys and their types,
 * which is more than nothing and exactly as accurate as what would be sent.
 */
function requestBodyFor(request: RequestRecord): Json | null {
  if (request.bodyType === 'none' || request.method === 'GET' || request.method === 'HEAD') return null;

  const described = fieldsIn(request, 'body');
  const mediaType =
    request.bodyType === 'form'
      ? 'application/x-www-form-urlencoded'
      : request.bodyType === 'multipart'
        ? 'multipart/form-data'
        : request.bodyType === 'xml'
          ? 'application/xml'
          : request.bodyType === 'text'
            ? 'text/plain'
            : 'application/json';

  if (described.length > 0) {
    return {
      required: described.some((field) => field.required),
      content: { [mediaType]: { schema: schemaFromFields(described) } },
    };
  }

  if (request.bodyType === 'json' && request.body.trim()) {
    try {
      const parsed = JSON.parse(request.body);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const properties: Json = {};
        for (const [name, value] of Object.entries(parsed as Json)) properties[name] = { type: inferType(value) };
        return { content: { [mediaType]: { schema: { type: 'object', properties }, example: parsed } } };
      }
      return { content: { [mediaType]: { example: parsed } } };
    } catch {
      // Not valid JSON: describe it as text rather than claiming a shape.
      return { content: { 'text/plain': { example: request.body } } };
    }
  }

  if (request.body.trim()) return { content: { [mediaType]: { example: request.body } } };
  return { content: { [mediaType]: {} } };
}

/**
 * Responses, from what actually came back.
 *
 * A recorded response is the most honest documentation there is — it is what
 * the server said, not what someone hoped it would say. With none recorded,
 * the operation still needs a `responses` object to be valid, so it gets the
 * one line that says nothing false.
 */
function responsesFor(request: RequestRecord, responses: ResponseRecord[]): Json {
  const mine = responses.filter((response) => response.requestId === request.id && !response.error);
  if (mine.length === 0) return { default: { description: 'No response recorded.' } };

  const out: Json = {};
  // Newest first, so re-sending replaces an old example rather than being
  // ignored behind it.
  for (const response of [...mine].sort((a, b) => b.sentAt.localeCompare(a.sentAt))) {
    const code = String(response.status);
    if (out[code]) continue;
    const type = response.headers.find((header) => header.key.toLowerCase() === 'content-type')?.value ?? '';
    const media = type.split(';')[0].trim() || 'application/json';
    let example: unknown = response.body;
    if (/json/i.test(media)) {
      try {
        example = JSON.parse(response.body);
      } catch {
        // Truncated, most likely. The text is still worth showing.
      }
    }
    out[code] = {
      description: response.statusText || 'Recorded response',
      ...(response.body ? { content: { [media]: { example } } } : {}),
    };
  }
  return out;
}

function tagFor(folders: Folder[], request: RequestRecord): string | null {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const names: string[] = [];
  let current = request.folderId;
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    seen.add(current);
    const folder = byId.get(current);
    if (!folder) break;
    names.unshift(folder.name);
    current = folder.parentId;
  }
  return names.length > 0 ? names.join(' / ') : null;
}

/** A method that carries an operation. `HEAD` and `OPTIONS` are describable too. */
const METHOD_KEYS: Record<string, string> = {
  GET: 'get',
  POST: 'post',
  PUT: 'put',
  PATCH: 'patch',
  DELETE: 'delete',
  HEAD: 'head',
  OPTIONS: 'options',
};

export function toOpenApi(
  state: WorkspaceState,
  selection: { title: string; selected: ReadonlySet<string> },
): Json {
  const workspaceId = state.activeWorkspaceId;
  const { folders, requests } = pruneTree(
    {
      folders: state.folders.filter((folder) => folder.workspaceId === workspaceId),
      requests: state.requests.filter((request) => request.workspaceId === workspaceId),
    },
    selection.selected,
  );

  const servers = new Set<string>();
  const tags = new Set<string>();
  const paths: Json = {};
  /** Which server each path came from, for the case where they differ. */
  const serverOfPath = new Map<string, string>();

  for (const request of requests) {
    const { server, path } = splitUrl(request.url);
    if (server) {
      servers.add(server);
      if (!serverOfPath.has(path)) serverOfPath.set(path, server);
    }

    const key = METHOD_KEYS[request.method];
    if (!key) continue;

    const tag = tagFor(folders, request);
    if (tag) tags.add(tag);

    const parameters = parametersFor(request);
    const body = requestBodyFor(request);
    const item = (paths[path] as Json) ?? {};

    item[key] = {
      summary: request.name,
      ...(request.description ? { description: request.description } : {}),
      ...(tag ? { tags: [tag] } : {}),
      // An id a generated client can name a method after, and stable across
      // exports because it comes from the request rather than from a counter.
      operationId: request.id,
      ...(parameters.length > 0 ? { parameters } : {}),
      ...(body ? { requestBody: body } : {}),
      responses: responsesFor(request, state.responses),
    };
    paths[path] = item;
  }

  /*
    Root-level `servers` applies to everything under it, which is a lie as soon
    as two requests point at different hosts. When they do, each path says
    where it lives, and the root list stays as the set of them.
  */
  if (servers.size > 1) {
    for (const [path, server] of serverOfPath) {
      (paths[path] as Json).servers = [serverEntry(server)];
    }
  }

  return {
    openapi: '3.1.0',
    info: {
      title: selection.title,
      version: '1.0.0',
      description: `Exported from Carom on ${new Date().toISOString().slice(0, 10)}.`,
    },
    // A `{{variable}}` server stays a variable: OpenAPI has its own syntax for
    // one, and a description whose host is literally "{{baseUrl}}" is broken.
    ...(servers.size > 0 ? { servers: [...servers].map((url) => serverEntry(url)) } : {}),
    ...(tags.size > 0 ? { tags: [...tags].map((name) => ({ name })) } : {}),
    paths,
  };
}

function serverEntry(url: string): Json {
  const variable = url.match(/^\{\{\s*([\w.-]+)\s*\}\}$/);
  if (!variable) return { url };
  return {
    url: `{${variable[1]}}`,
    variables: { [variable[1]]: { default: 'https://example.com', description: 'Set by the environment it came from.' } },
  };
}

/** Every documented field of a request, for a count the dialog can show. */
export function describedCount(requests: RequestRecord[]): number {
  return requests.reduce((total, request) => total + fieldsOf(request).length, 0);
}
