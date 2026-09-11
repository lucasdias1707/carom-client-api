import { describe, expect, it } from 'vitest';
import { row } from '@/lib/factories';
import { prepareRequest } from '@/lib/http';
import { paramsMatchUrl, splitQuery, syncUrlParams, writeUrlParams } from '@/lib/query';
import type { KeyValue } from '@/types';
import { createRequest } from '@/lib/factories';

const fromUrl = (key: string, value: string): KeyValue => ({ ...row(key, value), source: 'url' });

describe('splitQuery', () => {
  it('leaves a URL with no query alone', () => {
    expect(splitQuery('https://api.example.com/users')).toEqual({
      base: 'https://api.example.com/users',
      params: [],
    });
  });

  it('separates the address from the parameters', () => {
    expect(splitQuery('https://api.example.com/users?page=2&limit=10')).toEqual({
      base: 'https://api.example.com/users',
      params: [
        { key: 'page', value: '2' },
        { key: 'limit', value: '10' },
      ],
    });
  });

  it('works on a URL that is still templated', () => {
    // `new URL()` throws on this, which is why the split is hand-rolled.
    expect(splitQuery('{{baseUrl}}/teste?teste=1&teste=2').params).toEqual([
      { key: 'teste', value: '1' },
      { key: 'teste', value: '2' },
    ]);
  });

  it('keeps a variable inside a value intact', () => {
    expect(splitQuery('{{baseUrl}}/x?token={{apiKey}}').params).toEqual([
      { key: 'token', value: '{{apiKey}}' },
    ]);
  });

  it('keeps repeated keys, which mean something different to a server', () => {
    expect(splitQuery('/x?id=1&id=2').params).toEqual([
      { key: 'id', value: '1' },
      { key: 'id', value: '2' },
    ]);
  });

  it('treats a key with no value as a parameter', () => {
    expect(splitQuery('/x?debug&page=1').params).toEqual([
      { key: 'debug', value: '' },
      { key: 'page', value: '1' },
    ]);
  });

  it('decodes what was percent-encoded', () => {
    expect(splitQuery('/search?q=hello%20world&tag=a%26b').params).toEqual([
      { key: 'q', value: 'hello world' },
      { key: 'tag', value: 'a&b' },
    ]);
  });

  it('drops the separators of an empty query rather than inventing rows', () => {
    expect(splitQuery('/x?')).toEqual({ base: '/x', params: [] });
    expect(splitQuery('/x?&&').params).toEqual([]);
  });

  it('puts the fragment back on the address, where it belongs', () => {
    expect(splitQuery('/docs?page=2#section')).toEqual({
      base: '/docs#section',
      params: [{ key: 'page', value: '2' }],
    });
  });

  it('splits on the first question mark only', () => {
    expect(splitQuery('/x?next=/y?z=1').params).toEqual([{ key: 'next', value: '/y?z=1' }]);
  });
});

describe('syncUrlParams', () => {
  it('mirrors the query into an empty table, marking where the rows came from', () => {
    const synced = syncUrlParams([], [{ key: 'page', value: '2' }]);
    expect(synced).toHaveLength(1);
    expect(synced[0]).toMatchObject({ key: 'page', value: '2', enabled: true, source: 'url' });
  });

  it('replaces the mirrored rows when the URL changes, rather than piling up', () => {
    // Editing ?page=2 into ?page=3 must not leave both, or both would be sent.
    const before = syncUrlParams([], [{ key: 'page', value: '2' }]);
    const after = syncUrlParams(before, [{ key: 'page', value: '3' }]);
    expect(after.map((item) => item.value)).toEqual(['3']);
  });

  it('leaves rows typed into the table alone', () => {
    const manual = row('sort', 'asc');
    const synced = syncUrlParams([manual], [{ key: 'page', value: '2' }]);
    expect(synced[0]).toBe(manual);
    expect(synced.map((item) => item.key)).toEqual(['sort', 'page']);
  });

  it('empties the mirrored rows when the query is deleted, keeping manual ones', () => {
    const start = syncUrlParams([row('sort', 'asc')], [{ key: 'page', value: '2' }]);
    expect(syncUrlParams(start, []).map((item) => item.key)).toEqual(['sort']);
  });

  it('reuses an unchanged row, so unticking one survives the next keystroke', () => {
    const before = syncUrlParams([], [{ key: 'page', value: '2' }]);
    const unticked = [{ ...before[0], enabled: false }];
    const after = syncUrlParams(unticked, [{ key: 'page', value: '2' }]);
    expect(after[0].enabled).toBe(false);
    expect(after[0].id).toBe(before[0].id);
  });

  it('keeps both halves of a repeated key', () => {
    const synced = syncUrlParams(
      [],
      [
        { key: 'id', value: '1' },
        { key: 'id', value: '2' },
      ],
    );
    expect(synced.map((item) => item.value)).toEqual(['1', '2']);
  });

  it('updates a row someone typed rather than adding a second with the same key', () => {
    // Reported: a `cnpj` row in the table plus ?cnpj=… in the URL went out as
    // ?cnpj=1&cnpj=2, because the table is what gets sent.
    const manual = row('cnpj', '1');
    const synced = syncUrlParams([manual], [{ key: 'cnpj', value: '2' }]);
    expect(synced).toHaveLength(1);
    expect(synced[0]).toMatchObject({ id: manual.id, key: 'cnpj', value: '2', source: 'url' });
  });

  it('settles after taking a typed row over, instead of syncing forever', () => {
    const once = syncUrlParams([row('cnpj', '1')], [{ key: 'cnpj', value: '2' }]);
    expect(paramsMatchUrl(once, [{ key: 'cnpj', value: '2' }])).toBe(true);
    expect(syncUrlParams(once, [{ key: 'cnpj', value: '2' }])[0]).toBe(once[0]);
  });

  it('takes over one typed row per repeated key, and mirrors the rest', () => {
    const synced = syncUrlParams(
      [row('id', 'x')],
      [
        { key: 'id', value: '1' },
        { key: 'id', value: '2' },
      ],
    );
    expect(synced.map((item) => item.value)).toEqual(['1', '2']);
    expect(new Set(synced.map((item) => item.id)).size).toBe(2);
  });

  it('keeps a taken-over row unticked, and moves it in with the mirrored ones', () => {
    const off = { ...row('cnpj', '1'), enabled: false };
    const synced = syncUrlParams([off, row('sort', 'asc')], [{ key: 'cnpj', value: '2' }]);
    expect(synced.map((item) => item.key)).toEqual(['sort', 'cnpj']);
    expect(synced[1].enabled).toBe(false);
  });

  it('gives every new row its own id, so the table can edit them apart', () => {
    const synced = syncUrlParams(
      [],
      [
        { key: 'a', value: '1' },
        { key: 'b', value: '2' },
      ],
    );
    expect(new Set(synced.map((item) => item.id)).size).toBe(2);
  });
});

describe('writeUrlParams', () => {
  const on = (key: string, value: string) => row(key, value);
  const off = (key: string, value: string) => ({ ...row(key, value), enabled: false });

  it('writes the table into the query, leaving the address alone', () => {
    expect(writeUrlParams('https://api.test/users', [on('page', '2'), on('limit', '10')])).toBe(
      'https://api.test/users?page=2&limit=10',
    );
  });

  it('replaces whatever query was there', () => {
    expect(writeUrlParams('https://api.test/x?old=1&stale=2', [on('page', '3')])).toBe('https://api.test/x?page=3');
  });

  it('drops the question mark when nothing is left to say', () => {
    expect(writeUrlParams('https://api.test/x?page=2', [])).toBe('https://api.test/x');
    expect(writeUrlParams('https://api.test/x?page=2', [off('page', '2')])).toBe('https://api.test/x');
    expect(writeUrlParams('https://api.test/x?page=2', [on('', 'orphan')])).toBe('https://api.test/x');
  });

  it('leaves unticked and unnamed rows out, keeping the rest', () => {
    const written = writeUrlParams('/x', [on('a', '1'), off('b', '2'), on('', '3'), on('c', '4')]);
    expect(written).toBe('/x?a=1&c=4');
  });

  it('keeps a variable readable, so the field can still draw it as a chip', () => {
    // encodeURIComponent would write %7B%7BapiKey%7D%7D, which is neither
    // readable nor a chip.
    expect(writeUrlParams('{{baseUrl}}/x', [on('token', '{{apiKey}}')])).toBe('{{baseUrl}}/x?token={{apiKey}}');
  });

  it('puts the fragment back where it was', () => {
    expect(writeUrlParams('/docs?page=1#section', [on('page', '2')])).toBe('/docs?page=2#section');
    expect(writeUrlParams('/docs#section', [on('page', '2')])).toBe('/docs?page=2#section');
    expect(writeUrlParams('/docs?page=1#section', [])).toBe('/docs#section');
  });

  it('escapes only what would be read back as something else', () => {
    expect(writeUrlParams('/x', [on('a b', 'c d')])).toBe('/x?a b=c d');
    expect(writeUrlParams('/x', [on('q', 'a&b')])).toBe('/x?q=a%26b');
    expect(writeUrlParams('/x', [on('q', '100%')])).toBe('/x?q=100%25');
    expect(writeUrlParams('/x', [on('q', 'a+b')])).toBe('/x?q=a%2Bb');
    expect(writeUrlParams('/x', [on('a=b', 'v')])).toBe('/x?a%3Db=v');
    // A `=` in a value is safe: the split is on the first one.
    expect(writeUrlParams('/x', [on('q', 'a=b')])).toBe('/x?q=a=b');
  });

  it('round-trips through splitQuery, which is the property that matters', () => {
    const rows = [
      on('page', '2'),
      on('q', 'hello world'),
      on('weird', 'a&b=c#d+e 100%'),
      on('token', '{{apiKey}}'),
      on('empty', ''),
      on('id', '1'),
      on('id', '2'),
      off('hidden', 'x'),
    ];
    const back = splitQuery(writeUrlParams('https://api.test/users#top', rows)).params;
    expect(back).toEqual(
      rows.filter((item) => item.enabled && item.key).map((item) => ({ key: item.key, value: item.value })),
    );
  });

  it('settles: what it wrote is what the mirror already agrees with', () => {
    // Otherwise editing a row would dispatch a sync a beat later and undo it.
    const rows = [{ ...row('cnpj', '000110'), source: 'url' as const }];
    const url = writeUrlParams('http://localhost:3000/hotel/cnpj-exists', rows);
    expect(paramsMatchUrl(rows, splitQuery(url).params)).toBe(true);
  });
});

describe('paramsMatchUrl', () => {
  it('is true once the table reflects the query', () => {
    expect(paramsMatchUrl([fromUrl('page', '2')], [{ key: 'page', value: '2' }])).toBe(true);
  });

  it('ignores rows typed into the table', () => {
    expect(paramsMatchUrl([row('sort', 'asc'), fromUrl('page', '2')], [{ key: 'page', value: '2' }])).toBe(
      true,
    );
  });

  it('is false when a value, a count or an order differs', () => {
    expect(paramsMatchUrl([fromUrl('page', '2')], [{ key: 'page', value: '3' }])).toBe(false);
    expect(paramsMatchUrl([], [{ key: 'page', value: '2' }])).toBe(false);
    expect(
      paramsMatchUrl(
        [fromUrl('a', '1'), fromUrl('b', '2')],
        [
          { key: 'b', value: '2' },
          { key: 'a', value: '1' },
        ],
      ),
    ).toBe(false);
  });
});

describe('sending a request whose URL carries a query', () => {
  const send = (url: string, params: KeyValue[]) =>
    prepareRequest(createRequest({ workspaceId: 'w', url, params }), {}).url;

  it('sends each mirrored parameter once, not twice', () => {
    // The URL keeps ?page=2 and the table mirrors it; only one may go out.
    expect(send('https://api.example.com/x?page=2', [fromUrl('page', '2')])).toBe(
      'https://api.example.com/x?page=2',
    );
  });

  it('honours a mirrored row that was unticked', () => {
    expect(send('https://api.example.com/x?page=2', [{ ...fromUrl('page', '2'), enabled: false }])).toBe(
      'https://api.example.com/x',
    );
  });

  it('honours a mirrored row that was edited in the table', () => {
    expect(send('https://api.example.com/x?page=2', [fromUrl('page', '9')])).toBe(
      'https://api.example.com/x?page=9',
    );
  });

  it('still sends a query the mirror has not caught up with', () => {
    // Send can beat the debounce; what was typed still has to go out.
    expect(send('https://api.example.com/x?page=2', [])).toBe('https://api.example.com/x?page=2');
  });

  it('combines a manual row with the URL query', () => {
    expect(send('https://api.example.com/x?page=2', [row('sort', 'asc'), fromUrl('page', '2')])).toBe(
      'https://api.example.com/x?sort=asc&page=2',
    );
  });

  it('sends a parameter the table and the URL both name exactly once', () => {
    const synced = syncUrlParams([row('cnpj', '1')], splitQuery('http://x/y?cnpj=2').params);
    expect(send('http://x/y?cnpj=2', synced)).toBe('http://x/y?cnpj=2');
  });

  it('sends both halves of a repeated key exactly once each', () => {
    expect(send('https://api.example.com/x?id=1&id=2', [fromUrl('id', '1'), fromUrl('id', '2')])).toBe(
      'https://api.example.com/x?id=1&id=2',
    );
  });
});
