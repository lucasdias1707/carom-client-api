import { docField, exampleOf } from '@/lib/docs';
import { createFolder, createRequest, emptyAuth, row } from '@/lib/factories';
import type { ParsedImport } from '@/lib/postman';
import type { Auth, DocField, DocFieldType, Folder, HttpMethod, KeyValue, RequestRecord } from '@/types';

/**
 * Read an OpenAPI 3.x or Swagger 2.0 description into requests.
 *
 * A description says what an API *offers*; this app holds what someone
 * *sends*. Most of the work is turning the first into a believable second: a
 * schema becomes an example body, a path template becomes something the
 * variable table can fill in, and a security scheme becomes auth on the
 * request rather than a note about it.
 *
 * Nothing here validates the document. A description that is wrong about
 * itself still imports — the requests just come out as wrong as it was, which
 * is more useful than refusing the file.
 */

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

type Doc = Record<string, unknown>;

function asObject(value: unknown): Doc {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Doc) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value);
}

/** `$ref: '#/components/schemas/Pet'` — only local refs, which is all an export uses. */
function resolve(doc: Doc, node: unknown, seen: Set<string> = new Set()): Doc {
  let current = asObject(node);
  let ref = text(current.$ref);
  while (ref.startsWith('#/')) {
    if (seen.has(ref)) return {};
    seen.add(ref);
    let target: unknown = doc;
    for (const part of ref.slice(2).split('/')) {
      target = asObject(target)[part.replace(/~1/g, '/').replace(/~0/g, '~')];
    }
    current = asObject(target);
    ref = text(current.$ref);
  }
  return current;
}

/**
 * A plausible value for a schema.
 *
 * `example` wins, then `default`, then the first `enum` — those are what the
 * author actually wrote down. Only when the schema says nothing does this
 * invent, and it invents the shape rather than the data: an empty string, a
 * zero, one element of an array. The point is a body you can edit, not a body
 * you can send unread.
 */
export function sampleFromSchema(doc: Doc, node: unknown, depth = 0): unknown {
  const schema = resolve(doc, node);
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  const choices = asArray(schema.enum);
  if (choices.length > 0) return choices[0];

  // A self-referencing schema would otherwise recurse until the stack gives up.
  if (depth > 6) return null;

  for (const key of ['allOf', 'oneOf', 'anyOf']) {
    const branches = asArray(schema[key]);
    if (branches.length > 0) {
      if (key !== 'allOf') return sampleFromSchema(doc, branches[0], depth + 1);
      return branches.reduce<Record<string, unknown>>(
        (merged, branch) => ({ ...merged, ...asObject(sampleFromSchema(doc, branch, depth + 1)) }),
        {},
      );
    }
  }

  const type = text(schema.type) || (schema.properties ? 'object' : '');
  if (type === 'array') return [sampleFromSchema(doc, schema.items, depth + 1)];
  if (type === 'object' || schema.properties) {
    const out: Record<string, unknown> = {};
    for (const [name, child] of Object.entries(asObject(schema.properties))) {
      out[name] = sampleFromSchema(doc, child, depth + 1);
    }
    return out;
  }
  if (type === 'integer' || type === 'number') return 0;
  if (type === 'boolean') return false;
  if (type === 'null') return null;
  return '';
}

/**
 * `/pets/{petId}` becomes `/pets/{{petId}}`.
 *
 * A path template and this app's variables mean the same thing — a hole to be
 * filled — so translating one into the other makes the imported request
 * runnable the moment a value exists, instead of sending the word `{petId}`.
 */
export function pathToTemplate(path: string): string {
  return path.replace(/\{([^{}]+)\}/g, '{{$1}}');
}

/** Where a Swagger 2.0 document says its server is. */
function swaggerBase(doc: Doc): string {
  const host = text(doc.host);
  if (!host) return text(doc.basePath);
  const scheme = text(asArray(doc.schemes)[0]) || 'https';
  return `${scheme}://${host}${text(doc.basePath)}`;
}

function serverUrl(doc: Doc): string {
  const servers = asArray(doc.servers);
  if (servers.length > 0) {
    const url = text(asObject(servers[0]).url);
    // A templated server (`https://{region}.api.test`) is a variable too.
    return pathToTemplate(url);
  }
  return swaggerBase(doc);
}

/** A security scheme, as far as this app can act on it. */
function authFrom(doc: Doc, names: string[]): Auth {
  const schemes = {
    ...asObject(asObject(doc.components).securitySchemes),
    ...asObject(doc.securityDefinitions),
  };
  for (const name of names) {
    const scheme = resolve(doc, schemes[name]);
    const type = text(scheme.type).toLowerCase();
    if (type === 'http') {
      const kind = text(scheme.scheme).toLowerCase();
      if (kind === 'bearer') return { ...emptyAuth(), type: 'bearer', token: `{{${name}}}` };
      if (kind === 'basic') return { ...emptyAuth(), type: 'basic', username: `{{${name}_user}}`, password: `{{${name}_password}}` };
    }
    if (type === 'apikey') {
      const where = text(scheme.in) === 'query' ? 'query' : 'header';
      return { ...emptyAuth(), type: 'apikey', apiKeyName: text(scheme.name) || name, apiKeyValue: `{{${name}}}`, apiKeyIn: where };
    }
    // OAuth2 and OpenID hand back a bearer token in the end, and the token is
    // the only part of the dance this app can hold.
    if (type === 'oauth2' || type === 'openidconnect') {
      return { ...emptyAuth(), type: 'bearer', token: `{{${name}_token}}` };
    }
  }
  return { ...emptyAuth(), type: 'inherit' };
}

function bodyFor(doc: Doc, operation: Doc): Pick<RequestRecord, 'bodyType' | 'body' | 'form'> {
  // OpenAPI 3: requestBody.content keyed by media type.
  const content = asObject(asObject(operation.requestBody).content);
  const json = Object.keys(content).find((type) => /json/i.test(type));
  if (json) {
    const media = asObject(content[json]);
    const example = media.example !== undefined ? media.example : sampleFromSchema(doc, media.schema);
    return { bodyType: 'json', body: JSON.stringify(example, null, 2), form: [] };
  }
  const form = Object.keys(content).find((type) => /x-www-form-urlencoded/i.test(type));
  if (form) {
    const schema = resolve(doc, asObject(content[form]).schema);
    const fields = Object.keys(asObject(schema.properties)).map((name) => row(name, ''));
    return { bodyType: 'form', body: '', form: fields };
  }

  // Swagger 2: a `body` parameter carries the schema instead.
  const bodyParam = asArray(operation.parameters)
    .map((item) => resolve(doc, item))
    .find((item) => text(item.in) === 'body');
  if (bodyParam) {
    return { bodyType: 'json', body: JSON.stringify(sampleFromSchema(doc, bodyParam.schema), null, 2), form: [] };
  }
  return { bodyType: 'none', body: '', form: [] };
}

function paramsFor(doc: Doc, operation: Doc, shared: unknown[]) {
  const params: KeyValue[] = [];
  const headers: KeyValue[] = [];
  for (const item of [...shared, ...asArray(operation.parameters)]) {
    const parameter = resolve(doc, item);
    const name = text(parameter.name);
    if (!name) continue;
    const where = text(parameter.in);
    // A path parameter is already in the URL as `{{name}}`; listing it again
    // as a query parameter would send it twice, once in the wrong place.
    if (where === 'query') params.push(row(name, text(sampleFromSchema(doc, parameter.schema ?? parameter))));
    if (where === 'header') headers.push(row(name, ''));
  }
  return { params, headers };
}

const DOC_TYPES: DocFieldType[] = ['string', 'number', 'integer', 'boolean', 'array', 'object'];

function docType(schema: Doc): DocFieldType {
  const named = text(schema.type).toLowerCase() as DocFieldType;
  if (DOC_TYPES.includes(named)) return named;
  return schema.properties ? 'object' : 'string';
}

/**
 * What the description says about each field, kept rather than thrown away.
 *
 * The importer already reads `description`, `required` and the type of every
 * parameter to build the params and headers tables, and a key/value row can
 * hold none of the three. Now that the Docs tab can, they land there: an
 * imported operation arrives documented, and exporting it back to OpenAPI says
 * what the original said instead of what could be guessed from a body.
 */
function docsFor(doc: Doc, operation: Doc, shared: unknown[]): DocField[] {
  const fields: DocField[] = [];

  for (const item of [...shared, ...asArray(operation.parameters)]) {
    const parameter = resolve(doc, item);
    const name = text(parameter.name);
    const where = text(parameter.in);
    // `body` is Swagger 2's way of passing a schema, not a field of its own.
    if (!name || !['query', 'header', 'path'].includes(where)) continue;
    const schema = resolve(doc, parameter.schema ?? parameter);
    fields.push(
      docField({
        in: where as DocField['in'],
        name,
        description: text(parameter.description),
        required: parameter.required === true || where === 'path',
        type: docType(schema),
        example: exampleOf(sampleFromSchema(doc, parameter.schema ?? parameter)),
      }),
    );
  }

  const content = asObject(asObject(operation.requestBody).content);
  const jsonType = Object.keys(content).find((type) => /json/i.test(type));
  const bodySchema = jsonType
    ? resolve(doc, asObject(content[jsonType]).schema)
    : resolve(
        doc,
        asArray(operation.parameters)
          .map((item) => resolve(doc, item))
          .find((item) => text(item.in) === 'body')?.schema,
      );
  const required = new Set(asArray(bodySchema.required).map(text));
  for (const [name, child] of Object.entries(asObject(bodySchema.properties))) {
    const property = resolve(doc, child);
    fields.push(
      docField({
        in: 'body',
        name,
        description: text(property.description),
        required: required.has(name),
        type: docType(property),
        example: exampleOf(sampleFromSchema(doc, child)),
      }),
    );
  }

  return fields;
}

export function importOpenApi(payload: unknown, workspaceId: string, startIndex = 0): ParsedImport {
  const doc = asObject(payload);
  const info = asObject(doc.info);
  const name = text(info.title) || 'OpenAPI import';
  const base = serverUrl(doc);

  const folders: Folder[] = [];
  const requests: RequestRecord[] = [];
  const byTag = new Map<string, Folder>();

  // Everything lands under one folder named after the API, so an import does
  // not scatter loose requests through the tree.
  const root = createFolder(workspaceId, name, null, startIndex);
  folders.push(root);

  const folderFor = (tag: string): Folder => {
    if (!tag) return root;
    const existing = byTag.get(tag);
    if (existing) return existing;
    const folder = createFolder(workspaceId, tag, root.id, byTag.size);
    byTag.set(tag, folder);
    folders.push(folder);
    return folder;
  };

  let index = 0;
  for (const [path, item] of Object.entries(asObject(doc.paths))) {
    const pathItem = resolve(doc, item);
    const shared = asArray(pathItem.parameters);
    for (const method of METHODS) {
      const operation = asObject(pathItem[method.toLowerCase()]);
      if (Object.keys(operation).length === 0) continue;

      const tag = text(asArray(operation.tags)[0]);
      const { params, headers } = paramsFor(doc, operation, shared);
      const security = asArray(operation.security ?? doc.security)
        .flatMap((entry) => Object.keys(asObject(entry)));

      requests.push(
        createRequest({
          workspaceId,
          folderId: folderFor(tag).id,
          name: text(operation.summary) || text(operation.operationId) || `${method} ${path}`,
          description: text(operation.description),
          method,
          url: `${base}${pathToTemplate(path)}`,
          params,
          headers,
          auth: authFrom(doc, security),
          docs: { fields: docsFor(doc, operation, shared) },
          sortIndex: index++,
          ...bodyFor(doc, operation),
        }),
      );
    }
  }

  return {
    name,
    folders,
    requests,
    environment: null,
    // The server URL is worth having as a variable even though the requests
    // already carry it: it is the one thing that changes between staging and
    // production.
    variables: base ? [row('baseUrl', base)] : [],
  };
}

/** `true` when the payload announces itself as OpenAPI or Swagger. */
export function looksLikeOpenApi(payload: unknown): boolean {
  const doc = asObject(payload);
  return Boolean(text(doc.openapi) || text(doc.swagger)) && Boolean(doc.paths);
}
