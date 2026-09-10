import { describe, expect, it } from 'vitest';
import { discoverFields, docField, inferType, mergeFields, pathVariables } from '@/lib/docs';
import { splitUrl, toOpenApi } from '@/lib/openapi-export';
import { createEnvironment, createFolder, createRequest, row } from '@/lib/factories';
import { defaultSettings } from '@/lib/settings';
import type { RequestRecord, ResponseRecord, WorkspaceState } from '@/types';

const request = (over: Partial<RequestRecord> = {}) =>
  createRequest({ workspaceId: 'ws', name: 'Create order', method: 'POST', ...over });

describe('pathVariables', () => {
  it('reads the holes in the path and leaves the server alone', () => {
    // `{{baseUrl}}` says where the API lives; `{{orderId}}` is a field.
    expect(pathVariables('{{baseUrl}}/orders/{{orderId}}/items/{{itemId}}')).toEqual(['orderId', 'itemId']);
    expect(pathVariables('https://api.test/v1/{{id}}')).toEqual(['id']);
  });

  it('ignores a variable that is only in the query', () => {
    expect(pathVariables('https://api.test/orders?since={{from}}')).toEqual([]);
  });

  it('does not report the same name twice', () => {
    expect(pathVariables('https://api.test/{{id}}/copy/{{id}}')).toEqual(['id']);
  });
});

describe('inferType', () => {
  it('tells an integer from a number, which OpenAPI cares about', () => {
    expect(inferType(3)).toBe('integer');
    expect(inferType(3.5)).toBe('number');
    expect(inferType(true)).toBe('boolean');
    expect(inferType([1])).toBe('array');
    expect(inferType({})).toBe('object');
    expect(inferType(null)).toBe('string');
  });
});

describe('discoverFields', () => {
  it('reads params, headers, path holes and body keys in one pass', () => {
    const found = discoverFields(
      request({
        url: '{{baseUrl}}/orders/{{orderId}}',
        params: [row('expand', 'items'), row('', 'ignored')],
        headers: [row('Accept', 'application/json')],
        bodyType: 'json',
        body: '{"total": 10, "note": "gift", "paid": false}',
      }),
    );
    expect(found.map((field) => [field.in, field.name])).toEqual([
      ['path', 'orderId'],
      ['query', 'expand'],
      ['header', 'Accept'],
      ['body', 'total'],
      ['body', 'note'],
      ['body', 'paid'],
    ]);
    expect(found.find((field) => field.name === 'total')?.type).toBe('integer');
    expect(found.find((field) => field.name === 'orderId')?.required).toBe(true);
  });

  it('says nothing about a body that is not valid JSON yet', () => {
    // Half-typed is the normal state of a body someone is editing.
    expect(discoverFields(request({ bodyType: 'json', body: '{"a": ' }))).toEqual([]);
  });

  it('reads a form body from its rows rather than its text', () => {
    const found = discoverFields(request({ bodyType: 'form', form: [row('email', 'a@b.test')] }));
    expect(found.map((field) => [field.in, field.name, field.example])).toEqual([['body', 'email', 'a@b.test']]);
  });
});

describe('mergeFields', () => {
  it('leaves a described row exactly as it was', () => {
    const existing = [docField({ in: 'query', name: 'expand', description: 'Which parts to inline', required: true })];
    const { fields, added } = mergeFields(existing, [
      docField({ in: 'query', name: 'expand' }),
      docField({ in: 'query', name: 'limit' }),
    ]);
    expect(added).toBe(1);
    expect(fields[0].description).toBe('Which parts to inline');
    expect(fields.map((field) => field.name)).toEqual(['expand', 'limit']);
  });

  it('treats the same name in two places as two fields', () => {
    const { added } = mergeFields([docField({ in: 'query', name: 'id' })], [docField({ in: 'path', name: 'id' })]);
    expect(added).toBe(1);
  });
});

describe('splitUrl', () => {
  it('separates where the API lives from what is being asked for', () => {
    expect(splitUrl('{{baseUrl}}/orders/{{orderId}}')).toEqual({ server: '{{baseUrl}}', path: '/orders/{orderId}' });
    expect(splitUrl('https://api.test/v1/orders')).toEqual({ server: 'https://api.test', path: '/v1/orders' });
  });

  it('drops the query, which belongs in parameters', () => {
    expect(splitUrl('https://api.test/orders?page=2').path).toBe('/orders');
  });
});

function stateWith(requests: RequestRecord[], responses: ResponseRecord[] = []): WorkspaceState {
  const folder = createFolder('ws', 'Orders', null, 0);
  return {
    version: 2,
    workspaces: [{ id: 'ws', name: 'W', createdAt: new Date().toISOString() }],
    activeWorkspaceId: 'ws',
    folders: [folder],
    requests: requests.map((item) => ({ ...item, folderId: folder.id })),
    environments: [createEnvironment('ws', 'Base', true)],
    activeEnvironmentId: null,
    responses,
    openTabIds: [],
    activeRequestId: null,
    activeFolderId: null,
    settings: defaultSettings(),
  } as WorkspaceState;
}

describe('toOpenApi', () => {
  const documented = request({
    url: '{{baseUrl}}/orders/{{orderId}}',
    method: 'PUT',
    description: 'Replace an order',
    bodyType: 'json',
    body: '{"total": 10}',
    docs: {
      fields: [
        docField({ in: 'path', name: 'orderId', type: 'string' }),
        docField({ in: 'query', name: 'expand', description: 'Inline the items', required: true }),
        docField({ in: 'header', name: 'X-Trace', type: 'string' }),
        docField({ in: 'body', name: 'total', type: 'integer', required: true, example: '10' }),
      ],
    },
  });

  const all = (state: WorkspaceState) =>
    new Set([...state.folders.map((folder) => folder.id), ...state.requests.map((item) => item.id)]);

  it('turns each request into an operation under its path', () => {
    const state = stateWith([documented]);
    const doc = toOpenApi(state, { title: 'Orders API', selected: all(state) }) as any;
    expect(doc.openapi).toBe('3.1.0');
    expect(Object.keys(doc.paths)).toEqual(['/orders/{orderId}']);
    expect(doc.paths['/orders/{orderId}'].put.summary).toBe('Create order');
    expect(doc.paths['/orders/{orderId}'].put.description).toBe('Replace an order');
  });

  it('keeps the server as an OpenAPI variable rather than a literal `{{baseUrl}}`', () => {
    const state = stateWith([documented]);
    const doc = toOpenApi(state, { title: 'X', selected: all(state) }) as any;
    expect(doc.servers[0].url).toBe('{baseUrl}');
    expect(doc.servers[0].variables.baseUrl).toBeTruthy();
  });

  it('writes the documented fields as parameters, path ones always required', () => {
    const state = stateWith([documented]);
    const doc = toOpenApi(state, { title: 'X', selected: all(state) }) as any;
    const parameters = doc.paths['/orders/{orderId}'].put.parameters;
    expect(parameters.map((item: any) => [item.in, item.name, item.required])).toEqual([
      ['path', 'orderId', true],
      ['query', 'expand', true],
      ['header', 'X-Trace', false],
    ]);
    expect(parameters[1].description).toBe('Inline the items');
  });

  it('builds the body schema from the described fields, typing the example', () => {
    const state = stateWith([documented]);
    const doc = toOpenApi(state, { title: 'X', selected: all(state) }) as any;
    const schema = doc.paths['/orders/{orderId}'].put.requestBody.content['application/json'].schema;
    expect(schema.properties.total).toMatchObject({ type: 'integer', example: 10 });
    expect(schema.required).toEqual(['total']);
  });

  it('falls back to the body itself when nobody has described anything', () => {
    const plain = request({ url: 'https://api.test/orders', body: '{"total": 10, "paid": false}', bodyType: 'json' });
    const state = stateWith([plain]);
    const doc = toOpenApi(state, { title: 'X', selected: all(state) }) as any;
    const content = doc.paths['/orders'].post.requestBody.content['application/json'];
    expect(content.schema.properties).toEqual({ total: { type: 'integer' }, paid: { type: 'boolean' } });
    expect(content.example).toEqual({ total: 10, paid: false });
  });

  it('never gives a GET a request body', () => {
    const get = request({ method: 'GET', url: 'https://api.test/orders', bodyType: 'json', body: '{"x":1}' });
    const state = stateWith([get]);
    const doc = toOpenApi(state, { title: 'X', selected: all(state) }) as any;
    expect(doc.paths['/orders'].get.requestBody).toBeUndefined();
  });

  it('uses a recorded response as the example, newest of each status', () => {
    const target = request({ url: 'https://api.test/orders' });
    const response = (status: number, body: string, sentAt: string): ResponseRecord => ({
      id: `res-${sentAt}`,
      requestId: target.id,
      url: 'https://api.test/orders',
      method: 'POST',
      status,
      statusText: 'Created',
      headers: [row('content-type', 'application/json')],
      body,
      truncated: false,
      size: body.length,
      durationMs: 5,
      sentAt,
      via: 'browser',
    });
    const state = stateWith(
      [target],
      [response(201, '{"id":1}', '2024-01-01T00:00:00Z'), response(201, '{"id":2}', '2024-02-01T00:00:00Z')],
    );
    const doc = toOpenApi(state, { title: 'X', selected: all(state) }) as any;
    expect(doc.paths['/orders'].post.responses['201'].content['application/json'].example).toEqual({ id: 2 });
  });

  it('still produces a valid operation when nothing came back yet', () => {
    // `responses` is required by the spec, so it says the honest thing.
    const state = stateWith([request({ url: 'https://api.test/orders' })]);
    const doc = toOpenApi(state, { title: 'X', selected: all(state) }) as any;
    expect(doc.paths['/orders'].post.responses.default.description).toMatch(/No response recorded/);
  });

  it('exports only the ticked requests', () => {
    const kept = request({ url: 'https://api.test/kept' });
    const left = request({ url: 'https://api.test/left' });
    const state = stateWith([kept, left]);
    const doc = toOpenApi(state, { title: 'X', selected: new Set([kept.id]) }) as any;
    expect(Object.keys(doc.paths)).toEqual(['/kept']);
  });

  it('names the folder path as the tag, so the tree survives the trip', () => {
    const state = stateWith([documented]);
    const doc = toOpenApi(state, { title: 'X', selected: all(state) }) as any;
    expect(doc.tags).toEqual([{ name: 'Orders' }]);
    expect(doc.paths['/orders/{orderId}'].put.tags).toEqual(['Orders']);
  });
});

describe('toOpenApi with more than one host', () => {
  it('says which server each path belongs to, instead of one root lie', () => {
    const a = createRequest({ workspaceId: 'ws', name: 'A', url: 'https://one.test/a' });
    const b = createRequest({ workspaceId: 'ws', name: 'B', url: 'https://two.test/b' });
    const state = stateWith([a, b]);
    const doc = toOpenApi(state, {
      title: 'X',
      selected: new Set([a.id, b.id, ...state.folders.map((folder) => folder.id)]),
    }) as any;
    expect(doc.servers.map((server: any) => server.url).sort()).toEqual(['https://one.test', 'https://two.test']);
    expect(doc.paths['/a'].servers[0].url).toBe('https://one.test');
    expect(doc.paths['/b'].servers[0].url).toBe('https://two.test');
  });

  it('leaves the path items alone when there is only one', () => {
    const state = stateWith([createRequest({ workspaceId: 'ws', name: 'A', url: 'https://one.test/a' })]);
    const doc = toOpenApi(state, {
      title: 'X',
      selected: new Set([...state.requests.map((item) => item.id), ...state.folders.map((folder) => folder.id)]),
    }) as any;
    expect(doc.paths['/a'].servers).toBeUndefined();
  });
});
