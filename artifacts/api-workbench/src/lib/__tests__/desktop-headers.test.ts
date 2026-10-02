import { describe, expect, it } from 'vitest';
import { desktopHeaders } from '@/lib/http';
import { defaultSettings } from '@/lib/settings';

const header = (key: string, value = 'x') => ({ key, value });
const names = (rows: Array<{ key: string }>) => rows.map((row) => row.key);

describe('desktopHeaders', () => {
  it('adds nothing when compression is on, so the client asks for it itself', () => {
    expect(desktopHeaders([header('Accept', 'application/json')], true)).toEqual([header('Accept', 'application/json')]);
  });

  it('says identity when compression is off', () => {
    expect(desktopHeaders([header('Accept')], false)).toEqual([header('Accept'), header('Accept-Encoding', 'identity')]);
    expect(desktopHeaders([], false)).toEqual([header('Accept-Encoding', 'identity')]);
  });

  it('lets an Accept-Encoding written on the request win over the setting, either way', () => {
    const written = [header('accept-encoding', 'gzip')];
    expect(desktopHeaders(written, true)).toEqual(written);
    expect(desktopHeaders(written, false)).toEqual(written);
    expect(desktopHeaders([header('ACCEPT-ENCODING', 'identity')], true)).toEqual([header('ACCEPT-ENCODING', 'identity')]);
  });

  it('keeps dropping what the plugin always dropped, so only one header behaves differently', () => {
    const sent = desktopHeaders(
      [
        header('Cookie'), header('Host'), header('Origin'), header('Referer'), header('Content-Length'),
        header('Connection'), header('Transfer-Encoding'), header('Proxy-Authorization'), header('Sec-Fetch-Mode'),
        header('Accept-Charset'), header('Date'), header('TE'), header('Via'), header('Upgrade'),
        header('X-Api-Key'), header('Authorization'), header('Content-Type'),
      ],
      true,
    );
    expect(names(sent)).toEqual(['X-Api-Key', 'Authorization', 'Content-Type']);
  });

  it('is case-insensitive about all of it', () => {
    expect(names(desktopHeaders([header('COOKIE'), header('sec-ch-ua'), header('X-One')], true))).toEqual(['X-One']);
  });
});

describe('the setting', () => {
  it('is off by default: measured, a compressed body reaches the window slower on a fast connection', () => {
    expect(defaultSettings().compressedResponses).toBe(false);
  });
});
