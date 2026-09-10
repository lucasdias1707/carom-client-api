import { describe, expect, it } from 'vitest';
import { detectFormat, readImport } from '@/lib/import-formats';
import { pathToTemplate, sampleFromSchema } from '@/lib/openapi';
import { toTemplate } from '@/lib/insomnia';
import { nameFor } from '@/lib/har';

const openapi = {
  openapi: '3.0.3',
  info: { title: 'Orders' },
  servers: [{ url: 'https://api.test/v2' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } },
    schemas: {
      Order: {
        type: 'object',
        properties: { id: { type: 'integer' }, note: { type: 'string', example: 'gift' }, paid: { type: 'boolean' } },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/orders/{orderId}': {
      parameters: [{ name: 'orderId', in: 'path', schema: { type: 'string' } }],
      get: { summary: 'Fetch one order', tags: ['Orders'], parameters: [{ name: 'expand', in: 'query', schema: { type: 'string' } }] },
      post: {
        operationId: 'replaceOrder',
        tags: ['Orders'],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } },
      },
    },
  },
};

const insomnia = {
  _type: 'export',
  __export_format: 4,
  resources: [
    { _id: 'wrk_1', _type: 'workspace', name: 'Billing' },
    { _id: 'fld_1', _type: 'request_group', parentId: 'wrk_1', name: 'Invoices' },
    {
      _id: 'req_1',
      _type: 'request',
      parentId: 'fld_1',
      name: 'Create invoice',
      method: 'post',
      url: '{{ _.base_url }}/invoices',
      headers: [{ name: 'Accept', value: 'application/json' }, { name: 'X-Off', value: '1', disabled: true }],
      parameters: [{ name: 'dry', value: 'true' }],
      body: { mimeType: 'application/json', text: '{"total": 10}' },
      authentication: { type: 'bearer', token: '{{ _.token }}' },
    },
    { _id: 'env_base', _type: 'environment', parentId: 'wrk_1', name: 'Base', data: { base_url: 'https://api.test' } },
    { _id: 'env_prod', _type: 'environment', parentId: 'env_base', name: 'Production', data: { token: 'abc' } },
  ],
};

const har = {
  log: {
    version: '1.2',
    creator: { name: 'Firefox' },
    pages: [{ id: 'page_1', title: 'Dashboard' }],
    entries: [
      {
        pageref: 'page_1',
        request: {
          method: 'GET',
          url: 'https://api.test/v1/orders?page=2',
          headers: [
            { name: 'Accept', value: 'application/json' },
            { name: 'Host', value: 'api.test' },
            { name: ':authority', value: 'api.test' },
          ],
          queryString: [{ name: 'page', value: '2' }],
        },
        response: { content: { mimeType: 'application/json' } },
      },
      {
        pageref: 'page_1',
        request: { method: 'GET', url: 'https://cdn.test/app.js', headers: [], queryString: [] },
        response: { content: { mimeType: 'application/javascript' } },
      },
    ],
  },
};

describe('detectFormat', () => {
  it('tells the four apart by the marker each writer puts there', () => {
    expect(detectFormat(openapi)).toBe('openapi');
    expect(detectFormat(insomnia)).toBe('insomnia');
    expect(detectFormat(har)).toBe('har');
    expect(detectFormat({ info: { schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' }, item: [] })).toBe('postman');
  });

  it('does not guess at JSON that is none of them', () => {
    expect(detectFormat({ hello: 'world' })).toBeNull();
    expect(detectFormat([])).toBeNull();
  });
});

describe('readImport', () => {
  it('names Insomnia v5 rather than calling it broken JSON', () => {
    // Someone who exported from Insomnia last week gets a YAML file, and
    // "not valid JSON" would send them looking in the wrong place.
    expect(() => readImport('type: collection.insomnia.rest/5.0\nname: X\n', 'ws')).toThrow(/Insomnia v5/);
  });

  it('says what it does read when the file is something else entirely', () => {
    expect(() => readImport('{"hello":"world"}', 'ws')).toThrow(/Postman.*Insomnia.*OpenAPI.*HAR/s);
  });
});

describe('OpenAPI', () => {
  const { imported } = readImport(JSON.stringify(openapi), 'ws');

  it('turns each operation into a request, under a folder per tag', () => {
    expect(imported.requests.map((request) => request.name)).toEqual(['Fetch one order', 'replaceOrder']);
    expect(imported.folders.map((folder) => folder.name)).toEqual(['Orders', 'Orders']);
  });

  it('makes the path template something the variable table can fill', () => {
    expect(imported.requests[0].url).toBe('https://api.test/v2/orders/{{orderId}}');
    expect(pathToTemplate('/a/{b}/c/{d}')).toBe('/a/{{b}}/c/{{d}}');
  });

  it('keeps a path parameter out of the query, where it would be sent twice', () => {
    expect(imported.requests[0].params.map((param) => param.key)).toEqual(['expand']);
  });

  it('builds a body from the schema, preferring what the author wrote down', () => {
    expect(JSON.parse(imported.requests[1].body)).toEqual({ id: 0, note: 'gift', paid: false });
  });

  it('turns the security scheme into auth rather than a note about auth', () => {
    expect(imported.requests[0].auth).toMatchObject({ type: 'bearer', token: '{{bearerAuth}}' });
  });

  it('keeps the server as a variable, since that is what changes between stages', () => {
    expect(imported.variables).toEqual([expect.objectContaining({ key: 'baseUrl', value: 'https://api.test/v2' })]);
  });

  it('does not recurse forever on a schema that contains itself', () => {
    const doc = { Node: { type: 'object', properties: { next: { $ref: '#/Node' } } } };
    expect(() => sampleFromSchema(doc, { $ref: '#/Node' })).not.toThrow();
  });
});

describe('Insomnia', () => {
  const { imported } = readImport(JSON.stringify(insomnia), 'ws');

  it('rebuilds the tree from parentId', () => {
    const invoices = imported.folders.find((folder) => folder.name === 'Invoices');
    expect(invoices?.parentId).toBe(imported.folders[0].id);
    expect(imported.requests[0].folderId).toBe(invoices?.id);
  });

  it('rewrites `{{ _.name }}` into this app’s variables', () => {
    expect(imported.requests[0].url).toBe('{{base_url}}/invoices');
    expect(imported.requests[0].auth).toMatchObject({ type: 'bearer', token: '{{token}}' });
    expect(toTemplate('a {{ _.x }} b {{ y }}')).toBe('a {{x}} b {{y}}');
  });

  it('keeps a disabled header disabled instead of dropping it', () => {
    expect(imported.requests[0].headers.map((header) => [header.key, header.enabled])).toEqual([
      ['Accept', true],
      ['X-Off', false],
    ]);
  });

  it('puts the sub-environment on its own and the base into base variables', () => {
    // Same reason as the Postman importer: a folder-scoped copy would outrank
    // the selected environment and shadow the real value.
    expect(imported.environment?.name).toBe('Production');
    expect(imported.variables.map((item) => item.key)).toEqual(['base_url']);
  });
});

describe('HAR', () => {
  const { imported } = readImport(JSON.stringify(har), 'ws');

  it('drops what the page fetched for itself', () => {
    expect(imported.requests).toHaveLength(1);
  });

  it('names a request by what it hit', () => {
    expect(imported.requests[0].name).toBe('GET /v1/orders');
    expect(nameFor('POST', 'https://x.test/a/b?q=1')).toBe('POST /a/b');
  });

  it('moves the query into the params table rather than leaving it in the URL twice', () => {
    expect(imported.requests[0].url).toBe('https://api.test/v1/orders');
    expect(imported.requests[0].params.map((param) => [param.key, param.value])).toEqual([['page', '2']]);
  });

  it('strips the headers the browser wrote for itself', () => {
    expect(imported.requests[0].headers.map((header) => header.key)).toEqual(['Accept']);
  });
});
