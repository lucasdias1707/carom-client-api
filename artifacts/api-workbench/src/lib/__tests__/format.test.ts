import { describe, expect, it } from 'vitest';
import {
  byteLength,
  contentTypeLabel,
  formatBytes,
  formatDuration,
  formatRelative,
  statusFamily,
  tryPrettyJson,
} from '@/lib/format';
import { translatorFor } from '@/locales';

describe('formatBytes', () => {
  it.each([
    [0, '0 B'],
    [512, '512 B'],
    [2048, '2.0 KB'],
    [1024 * 1024 * 3, '3.00 MB'],
  ])('formats %i as %s', (input, expected) => {
    expect(formatBytes(input)).toBe(expected);
  });
});

describe('formatDuration', () => {
  it('switches units as the value grows', () => {
    expect(formatDuration(120)).toBe('120 ms');
    expect(formatDuration(1500)).toBe('1.50 s');
    expect(formatDuration(65_000)).toBe('1m 5s');
  });
});

describe('statusFamily', () => {
  it.each([
    [0, 'none'],
    [204, 'success'],
    [301, 'redirect'],
    [404, 'client'],
    [503, 'server'],
  ] as const)('maps %i to %s', (status, family) => {
    expect(statusFamily(status)).toBe(family);
  });
});

describe('contentTypeLabel', () => {
  it('recognises common types', () => {
    expect(contentTypeLabel('application/json; charset=utf-8')).toBe('JSON');
    expect(contentTypeLabel('text/html')).toBe('HTML');
    expect(contentTypeLabel(undefined)).toBe('Unknown');
    // The one word in there, so the caller can say it in the reader's language.
    expect(contentTypeLabel(undefined, 'Desconhecido')).toBe('Desconhecido');
  });
});

describe('tryPrettyJson', () => {
  it('formats valid JSON', () => {
    expect(tryPrettyJson('{"a":1}')).toEqual({ text: '{\n  "a": 1\n}', ok: true });
  });

  it('returns the input untouched when it is not JSON', () => {
    expect(tryPrettyJson('<html>')).toEqual({ text: '<html>', ok: false });
  });
});

describe('byteLength', () => {
  it('counts UTF-8 bytes, not characters', () => {
    expect(byteLength('café')).toBe(5);
  });
});

describe('how long ago, in words', () => {
  const t = translatorFor('pt-BR');
  const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

  it('reads in the language it is handed', () => {
    expect(formatRelative(minutesAgo(0), t, 'pt-BR')).toBe('agora mesmo');
    expect(formatRelative(minutesAgo(5), t, 'pt-BR')).toBe('há 5min');
    expect(formatRelative(minutesAgo(150), t, 'pt-BR')).toBe('há 2h');
    expect(formatRelative(minutesAgo(60 * 24 * 3), t, 'pt-BR')).toBe('há 3d');
  });

  it('writes an old date the way that language writes dates', () => {
    // The failure this guards against is silent: 11/09 and 09/11 are the same
    // day and opposite claims, and nothing on screen says which one it meant.
    const old = new Date('2020-09-11T12:00:00Z').toISOString();
    expect(formatRelative(old, t, 'pt-BR')).toBe(new Date(old).toLocaleDateString('pt-BR'));
    expect(formatRelative(old, translatorFor('en'), 'en')).toBe(new Date(old).toLocaleDateString('en'));
  });

  it('says nothing rather than something wrong for an unreadable date', () => {
    expect(formatRelative('not a date', t, 'pt-BR')).toBe('—');
  });
});
