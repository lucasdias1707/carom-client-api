import { createId } from '@/lib/id';
import type { DocField, DocFieldIn, DocFieldType, RequestRecord } from '@/types';

/**
 * Documented fields, and reading them off a request that already works.
 *
 * Nobody types a field table from scratch. The request in front of you already
 * names most of it — the query parameters, the headers, the keys of the JSON
 * body, the `{{holes}}` in the path — so the table is seeded from that and
 * what is left to write is the part only a person knows: what the field means
 * and whether it is required.
 *
 * Seeding never overwrites. A row you have described keeps its description,
 * its type and its example when you read the request again after adding a
 * parameter, which is the only way the button is safe to press twice.
 */

export function docField(over: Partial<DocField> = {}): DocField {
  return {
    id: createId('doc'),
    in: 'query',
    name: '',
    description: '',
    required: false,
    type: 'string',
    example: '',
    ...over,
  };
}

/** The type a value looks like, for seeding a row from a body someone wrote. */
export function inferType(value: unknown): DocFieldType {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'string';
  switch (typeof value) {
    case 'number':
      return Number.isInteger(value) ? 'integer' : 'number';
    case 'boolean':
      return 'boolean';
    case 'object':
      return 'object';
    default:
      return 'string';
  }
}

/** A short, printable example. Objects and arrays are summarised, not dumped. */
export function exampleOf(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return '';
  return String(value).slice(0, 80);
}

/**
 * `{{petId}}` in the path, but not in the host.
 *
 * `{{baseUrl}}/pets/{{petId}}` has two variables and only one of them is a path
 * parameter: the other is where the API lives, which an OpenAPI description
 * calls a server rather than a field.
 */
export function pathVariables(url: string): string[] {
  const withoutServer = url.replace(/^\s*(\{\{[\w.-]+\}\}|[a-z][\w+.-]*:\/\/[^/]*)/i, '');
  const path = withoutServer.split('?')[0];
  const names = [...path.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)].map((match) => match[1]);
  return [...new Set(names)];
}

/** Every key of a flat JSON object body, or nothing when the body is not one. */
function bodyKeys(request: RequestRecord): Array<{ name: string; value: unknown }> {
  if (request.bodyType !== 'json' || !request.body.trim()) return [];
  try {
    const parsed = JSON.parse(request.body);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
    return Object.entries(parsed as Record<string, unknown>).map(([name, value]) => ({ name, value }));
  } catch {
    // A body being edited is not valid JSON for most of the time it is open.
    return [];
  }
}

/** What a request says about itself, before anyone describes it. */
export function discoverFields(request: RequestRecord): DocField[] {
  const found: DocField[] = [];

  for (const name of pathVariables(request.url)) {
    // A path parameter is part of the address; a request cannot be sent without
    // it, so it starts required rather than waiting to be marked.
    found.push(docField({ in: 'path', name, required: true }));
  }

  for (const param of request.params) {
    if (param.key.trim()) found.push(docField({ in: 'query', name: param.key.trim(), example: param.value }));
  }

  for (const header of request.headers) {
    if (header.key.trim()) found.push(docField({ in: 'header', name: header.key.trim(), example: header.value }));
  }

  for (const { name, value } of bodyKeys(request)) {
    found.push(docField({ in: 'body', name, type: inferType(value), example: exampleOf(value) }));
  }

  if (request.bodyType === 'form' || request.bodyType === 'multipart') {
    const rows = request.bodyType === 'form' ? request.form : request.multipart;
    for (const item of rows) {
      if (item.key.trim()) found.push(docField({ in: 'body', name: item.key.trim(), example: item.file ? '' : item.value }));
    }
  }

  return found;
}

const identity = (field: Pick<DocField, 'in' | 'name'>) => `${field.in}:${field.name.trim().toLowerCase()}`;

/** Existing rows win; anything new is appended. Returns how many were added. */
export function mergeFields(existing: DocField[], discovered: DocField[]): { fields: DocField[]; added: number } {
  const known = new Set(existing.map(identity));
  const fresh = discovered.filter((field) => {
    const key = identity(field);
    if (known.has(key)) return false;
    known.add(key);
    return true;
  });
  return { fields: [...existing, ...fresh], added: fresh.length };
}

export function fieldsOf(request: RequestRecord): DocField[] {
  return request.docs?.fields ?? [];
}

export function fieldsIn(request: RequestRecord, where: DocFieldIn): DocField[] {
  return fieldsOf(request).filter((field) => field.in === where && field.name.trim());
}
