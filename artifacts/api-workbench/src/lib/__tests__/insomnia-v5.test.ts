import { beforeAll, describe, expect, it } from 'vitest';
import { detectFormat, readImport } from '@/lib/import-formats';
import type { ParsedImport } from '@/lib/postman';

/*
  A v5 export written the way Insomnia writes one, from the shapes in its own
  schema: nested folders, a folder that carries variables, authentication and
  scripts of its own, every kind of body, and the requests Carom cannot take.
  It goes through `readImport`, so the YAML parsing is part of what is tested.
*/
const COLLECTION = `type: collection.insomnia.rest/5.0
schema_version: "5.1"
name: Pokédex API
meta:
  id: wrk_1
  created: 1750000000000
  modified: 1750000000000
collection:
  - name: Second folder
    meta:
      id: fld_b
      sortKey: -200
    children: []
  - name: Trainers
    meta:
      id: fld_a
      sortKey: -300
    environment:
      region: kanto
      limit: 20
    authentication:
      type: bearer
      token: "{{ _.token }}"
    scripts:
      preRequest: insomnia.environment.set('t', Date.now())
      afterResponse: pm.test('ok', () => pm.response.to.have.status(200))
    headers:
      - name: X-Folder
        value: one
    children:
      - name: Register
        meta:
          id: req_1
          description: Creates a trainer
          sortKey: -100
        method: POST
        url: "{{ _.baseUrl }}/trainers"
        body:
          mimeType: application/json
          text: |-
            {
              "name": "{{ _.name }}"
            }
        headers:
          - name: Content-Type
            value: application/json
          - name: X-Off
            value: "1"
            disabled: true
        parameters:
          - name: dry
            value: "true"
        authentication:
          type: none
        scripts:
          preRequest: |-
            const stamp = insomnia.variables.get('stamp');
            console.log(stamp);
      - name: Fetch one
        meta:
          id: req_2
          sortKey: -200
        method: GET
        url: "{{ _.baseUrl }}/trainers/:id/pokemon/:slot?full=1"
        pathParameters:
          - name: id
            value: "{{ _.trainerId }}"
          - name: slot
            value: ""
        authentication:
          type: bearer
          token: abc
          prefix: Token
      - name: Upload
        method: POST
        url: http://localhost:3000/upload
        body:
          mimeType: multipart/form-data
          params:
            - name: caption
              value: hello
            - name: photo
              type: file
              fileName: /Users/ash/pikachu.png
      - name: Login form
        method: POST
        url: http://localhost:3000/login
        body:
          mimeType: application/x-www-form-urlencoded
          params:
            - name: user
              value: ash
        authentication:
          type: basic
          username: ash
          password: "{{ _.password }}"
      - name: Query
        method: POST
        url: http://localhost:3000/graphql
        body:
          mimeType: application/graphql
          text: '{"query":"{ pokemon { name } }","variables":{"first":1}}'
        authentication:
          type: apikey
          key: X-Key
          value: k
          addTo: queryParams
      - name: Cookie key
        method: GET
        url: http://localhost:3000/c
        authentication:
          type: apikey
          key: sid
          value: s1
          addTo: cookie
      - name: Digest
        method: GET
        url: http://localhost:3000/d
        authentication:
          type: digest
          username: a
          password: b
      - name: Stream
        url: wss://example.test/socket
        meta:
          id: ws-req_1
      - name: Reflection
        url: grpc.example.test:443
        protoFileId: pf_1
cookieJar:
  name: Default Jar
environments:
  name: Base Environment
  meta:
    id: env_base
  data:
    baseUrl: https://api.pokedex.example
    retries: 3
    flags:
      beta: true
  subEnvironments:
    - name: Staging
      meta:
        id: env_s
      data:
        baseUrl: https://staging.pokedex.example
      color: "#ff8800"
    - name: Production
      meta:
        id: env_p
      data:
        baseUrl: https://pokedex.example
      color: null
`;

describe('Insomnia v5', () => {
  let imported: ParsedImport;
  beforeAll(async () => {
    const result = await readImport(COLLECTION, 'ws');
    expect(result.format).toBe('insomnia');
    imported = result.imported;
  });

  const request = (name: string) => imported.requests.find((item) => item.name === name)!;
  const folder = (name: string) => imported.folders.find((item) => item.name === name)!;

  it('nests the folders under one named after the collection', () => {
    expect(imported.name).toBe('Pokédex API');
    const root = imported.folders[0];
    expect(root.name).toBe('Pokédex API');
    expect(root.parentId).toBeNull();
    expect(folder('Trainers').parentId).toBe(root.id);
    expect(request('Register').folderId).toBe(folder('Trainers').id);
  });

  it('orders by sortKey when every sibling has one, folders and requests alike', async () => {
    // Trainers (-300) comes before Second folder (-200) though the file lists it second.
    expect(folder('Trainers').sortIndex).toBeLessThan(folder('Second folder').sortIndex);

    const { imported: keyed } = await readImport(
      `type: collection.insomnia.rest/5.0
name: K
collection:
  - name: Later
    url: http://a.test
    method: GET
    meta: { id: req_l, sortKey: -100 }
  - name: Earlier
    url: http://a.test
    method: GET
    meta: { id: req_e, sortKey: -200 }
`,
      'ws',
    );
    expect(keyed.requests.map((item) => item.name)).toEqual(['Earlier', 'Later']);
  });

  it('keeps the file’s own order when some siblings have no key to sort by', () => {
    // Inside Trainers only two of the requests carry a sortKey, so nothing is reordered.
    const names = imported.requests.filter((item) => item.folderId === folder('Trainers').id).map((item) => item.name);
    expect(names.slice(0, 2)).toEqual(['Register', 'Fetch one']);
  });

  it('carries a folder’s own variables, authentication and scripts', () => {
    const trainers = folder('Trainers');
    expect(trainers.variables.map((item) => [item.key, item.value])).toEqual([
      ['region', 'kanto'],
      ['limit', '20'],
    ]);
    expect(trainers.auth).toMatchObject({ type: 'bearer', token: '{{token}}' });
    expect(trainers.postScript).toContain("pm.test('ok'");
  });

  it('switches off a script that calls the insomnia API, and keeps every line of it', () => {
    const trainers = folder('Trainers');
    expect(trainers.preScript.split('\n').every((line) => line === '' || line.startsWith('//'))).toBe(true);
    expect(trainers.preScript).toContain("// insomnia.environment.set('t', Date.now())");
    expect(request('Register').preScript).toContain('// const stamp = insomnia.variables.get');
    expect(request('Register').preScript).toContain('// console.log(stamp);');
  });

  it('keeps a script that never mentions insomnia, since it is written against pm', () => {
    expect(folder('Trainers').postScript.startsWith('//')).toBe(false);
  });

  it('turns Insomnia’s template syntax into this app’s', () => {
    expect(request('Register').url).toBe('{{baseUrl}}/trainers');
    expect(request('Register').body).toContain('"name": "{{name}}"');
    expect(request('Login form').auth).toMatchObject({ type: 'basic', username: 'ash', password: '{{password}}' });
  });

  it('reads the description from meta, and the rows with their disabled flag', () => {
    const register = request('Register');
    expect(register.description).toBe('Creates a trainer');
    expect(register.bodyType).toBe('json');
    expect(register.headers.map((item) => [item.key, item.enabled])).toEqual([
      ['Content-Type', true],
      ['X-Off', false],
    ]);
    expect(register.params.map((item) => [item.key, item.value])).toEqual([['dry', 'true']]);
  });

  it('treats an explicit `none` as none, not as inherit', () => {
    expect(request('Register').auth.type).toBe('none');
    expect(request('Upload').auth.type).toBe('inherit');
  });

  it('puts path-parameter values in the URL, leaving empty ones and ports alone', () => {
    expect(request('Fetch one').url).toBe('{{baseUrl}}/trainers/{{trainerId}}/pokemon/:slot?full=1');
    expect(request('Upload').url).toBe('http://localhost:3000/upload');
  });

  it('sends a custom bearer prefix as the header it really is', () => {
    const fetchOne = request('Fetch one');
    expect(fetchOne.auth.type).toBe('none');
    expect(fetchOne.headers.map((item) => [item.key, item.value])).toContainEqual(['Authorization', 'Token abc']);
  });

  it('sends an API key that lives in a cookie as a Cookie header', () => {
    expect(request('Cookie key').headers.map((item) => [item.key, item.value])).toContainEqual(['Cookie', 'sid=s1']);
    expect(request('Query').auth).toMatchObject({ type: 'apikey', apiKeyName: 'X-Key', apiKeyIn: 'query' });
  });

  it('reads every kind of body', () => {
    expect(request('Query').bodyType).toBe('graphql');
    expect(request('Query').graphql.query).toBe('{ pokemon { name } }');
    expect(request('Login form').bodyType).toBe('form');
    expect(request('Login form').form[0]).toMatchObject({ key: 'user', value: 'ash' });
    expect(request('Upload').bodyType).toBe('multipart');
    expect(request('Upload').multipart.map((item) => item.value)).toEqual(['hello', '(attach pikachu.png)']);
  });

  it('brings every sub-environment, with its colour, and the base as variables', () => {
    expect(imported.environments?.map((item) => item.name)).toEqual(['Staging', 'Production']);
    expect(imported.environments?.[0].color).toBe('#ff8800');
    // No colour given: one from the palette rather than nothing.
    expect(imported.environments?.[1].color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(imported.environments?.[0].variables[0]).toMatchObject({ key: 'baseUrl', value: 'https://staging.pokedex.example' });
    expect(imported.environment).toBeNull();
    expect(imported.variables.map((item) => [item.key, item.value])).toEqual([
      ['baseUrl', 'https://api.pokedex.example'],
      ['retries', '3'],
      ['flags', '{"beta":true}'],
    ]);
  });

  it('counts what it could not bring across, so the dialog can say so', () => {
    expect(imported.notes).toEqual({
      otherProtocols: 2,
      authentication: 1,
      scripts: 2,
      folderHeaders: 1,
    });
    // The digest request is still there, inheriting, rather than dropped.
    expect(request('Digest').auth.type).toBe('inherit');
  });
});

describe('Insomnia v5, the other kinds of file', () => {
  it('reads an environment file with sub-environments as environments beside the base', async () => {
    const { imported } = await readImport(
      `type: environment.insomnia.rest/5.0
name: Shared
environments:
  name: Base Environment
  data:
    token: abc
  subEnvironments:
    - name: Dev
      data:
        host: localhost
`,
      'ws',
    );
    expect(imported.environments?.map((item) => item.name)).toEqual(['Dev']);
    expect(imported.variables).toHaveLength(1);
    expect(imported.requests).toEqual([]);
  });

  it('reads an environment file with none as a single environment, as Postman’s is', async () => {
    const { imported } = await readImport(
      `type: environment.insomnia.rest/5.0
name: Only base
environments:
  name: Base Environment
  data:
    token: abc
`,
      'ws',
    );
    expect(imported.environment?.name).toBe('Only base');
    expect(imported.environment?.variables).toHaveLength(1);
  });

  it('reads a design document as the API description it holds', async () => {
    const { imported } = await readImport(
      `type: spec.insomnia.rest/5.0
name: Orders design
spec:
  contents:
    openapi: 3.0.3
    info:
      title: Orders
      version: "1"
    paths:
      /orders:
        get:
          operationId: listOrders
          responses:
            "200":
              description: ok
environments:
  data:
    key: v
`,
      'ws',
    );
    expect(imported.name).toBe('Orders design');
    expect(imported.requests.map((item) => item.name)).toContain('listOrders');
    expect(imported.variables.map((item) => item.key)).toContain('key');
  });

  it('says plainly that a mock server or an MCP client has nothing to import', async () => {
    await expect(readImport('type: mock.insomnia.rest/5.0\nname: M\n', 'ws')).rejects.toThrow(/mock server/);
    await expect(readImport('type: mcpClient.insomnia/5.0\nname: M\n', 'ws')).rejects.toThrow(/MCP client/);
  });

  it('is only what announces itself, so other YAML is not mistaken for it', () => {
    expect(detectFormat({ type: 'something.else', collection: [] })).toBeNull();
    expect(detectFormat({ type: 'collection.insomnia.rest/5.0' })).toBe('insomnia');
  });
});

describe('YAML more generally', () => {
  it('reads an OpenAPI description written in YAML, which is how most of them are', async () => {
    const { format, imported } = await readImport(
      `openapi: 3.0.3
info:
  title: Pets
  version: "1"
paths:
  /pets:
    get:
      operationId: listPets
      responses:
        "200":
          description: ok
`,
      'ws',
    );
    expect(format).toBe('openapi');
    expect(imported.requests.map((item) => item.name)).toContain('listPets');
  });

  it('ignores a byte-order mark, which Windows editors like to write', async () => {
    const { format } = await readImport('﻿{"_type":"export","resources":[]}', 'ws');
    expect(format).toBe('insomnia');
  });

  it('reports what is wrong with a YAML file that does not parse', async () => {
    await expect(readImport('a: [unclosed\nb: 1\n', 'ws')).rejects.toThrow(/neither valid JSON nor valid YAML/);
  });
});
