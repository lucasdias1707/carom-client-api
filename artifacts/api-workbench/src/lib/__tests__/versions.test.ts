import { describe, expect, it } from 'vitest';
import { MAX_VERSIONS_PER_REQUEST, dropVersions, recordVersion, versionsFor } from '@/lib/versions';
import { sectionText } from '@/lib/draft';
import { createRequest, row } from '@/lib/factories';
import type { RequestVersion } from '@/types';

const request = (over = {}) => createRequest({ workspaceId: 'ws', name: 'Create order', ...over });

describe('recordVersion', () => {
  it('keeps the request as it was saved, and says what moved', () => {
    const saved = request({ url: 'https://api.test/v1' });
    const draft = { ...saved, url: 'https://api.test/v2', method: 'POST' as const };
    const [entry] = recordVersion([], saved, draft);
    expect(entry.requestId).toBe(saved.id);
    expect(entry.request.url).toBe('https://api.test/v2');
    expect(entry.changed).toEqual(['method', 'url']);
  });

  it('puts the newest first', () => {
    const saved = request({ url: 'a' });
    let versions = recordVersion([], saved, { ...saved, url: 'b' });
    versions = recordVersion(versions, { ...saved, url: 'b' }, { ...saved, url: 'c' });
    expect(versions.map((version) => version.request.url)).toEqual(['c', 'b']);
  });

  it('drops the oldest of that request past the cap, and nobody else', () => {
    const mine = request({ url: 'x' });
    const other = request({ url: 'y' });
    let versions = recordVersion([], other, { ...other, url: 'y2' });
    for (let save = 0; save <= MAX_VERSIONS_PER_REQUEST; save += 1) {
      versions = recordVersion(versions, mine, { ...mine, url: `x${save}` });
    }
    expect(versionsFor(versions, mine.id)).toHaveLength(MAX_VERSIONS_PER_REQUEST);
    // The first save is the one that fell off; the last is still at the front.
    expect(versionsFor(versions, mine.id).map((version) => version.request.url)).not.toContain('x0');
    expect(versionsFor(versions, mine.id)[0].request.url).toBe(`x${MAX_VERSIONS_PER_REQUEST}`);
    // The other request's history is untouched by any of that.
    expect(versionsFor(versions, other.id)).toHaveLength(1);
  });

  it('gives each entry its own id', () => {
    const saved = request();
    const versions = recordVersion(recordVersion([], saved, { ...saved, url: 'a' }), saved, { ...saved, url: 'b' });
    expect(new Set(versions.map((version) => version.id)).size).toBe(2);
  });
});

describe('versionsFor and dropVersions', () => {
  const saved = request();
  const other = request();
  const versions = recordVersion(recordVersion([], other, { ...other, url: 'o' }), saved, { ...saved, url: 's' });

  it('returns only that request, in order', () => {
    expect(versionsFor(versions, saved.id).every((version) => version.requestId === saved.id)).toBe(true);
  });

  it('drops a deleted request without touching the rest', () => {
    const left = dropVersions(versions, new Set([saved.id]));
    expect(versionsFor(left, saved.id)).toHaveLength(0);
    expect(versionsFor(left, other.id)).toHaveLength(1);
  });

  it('returns the same array when there is nothing to drop', () => {
    expect(dropVersions(versions, new Set(['req_nobody']))).toBe(versions);
  });
});

describe('what a version reads as', () => {
  it('renders each section as one line, so two can sit side by side', () => {
    const saved = request({
      url: 'https://api.test/x',
      params: [row('page', '2'), { ...row('debug', '1'), enabled: false }],
      bodyType: 'json' as const,
      body: '{"a":1}',
    });
    expect(sectionText(saved, 'url')).toBe('https://api.test/x');
    expect(sectionText(saved, 'params')).toBe('page=2  · debug=1');
    expect(sectionText(saved, 'body')).toBe('json · {"a":1}');
    expect(sectionText(saved, 'scripts')).toBe('none');
  });

  it('says something for a section that is empty', () => {
    expect(sectionText(request({ url: '' }), 'url')).toBe('—');
    expect(sectionText(request(), 'params')).toBe('—');
  });
});

describe('the shape stored', () => {
  it('carries the whole request, not a diff to replay', () => {
    const saved = request({ headers: [row('Accept', 'application/json')] });
    const [entry]: RequestVersion[] = recordVersion([], saved, { ...saved, url: 'moved' });
    expect(entry.request.headers).toEqual(saved.headers);
    expect(entry.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
