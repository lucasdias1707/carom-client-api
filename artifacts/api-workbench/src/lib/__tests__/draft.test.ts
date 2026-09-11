import { describe, expect, it } from 'vitest';
import { draftChanges, dropDrafts, isDirty, withDraft } from '@/lib/draft';
import { createRequest, row } from '@/lib/factories';

const base = () => createRequest({ workspaceId: 'w', name: 'Get user', url: 'https://api.test/users/1' });

describe('draftChanges', () => {
  it('finds nothing in a copy of the same request', () => {
    const saved = base();
    expect(draftChanges(saved, { ...saved })).toEqual([]);
    expect(isDirty(saved, { ...saved })).toBe(false);
  });

  it('ignores updatedAt, which every keystroke moves', () => {
    const saved = base();
    expect(isDirty(saved, { ...saved, updatedAt: new Date(Date.now() + 5000).toISOString() })).toBe(false);
  });

  it('names each part, in the order the composer shows them', () => {
    const saved = base();
    const draft = {
      ...saved,
      url: 'https://api.test/users/2',
      headers: [row('Accept', 'application/json')],
      method: 'POST' as const,
    };
    expect(draftChanges(saved, draft)).toEqual(['method', 'url', 'headers']);
  });

  it('counts every kind of body as the body', () => {
    const saved = base();
    expect(draftChanges(saved, { ...saved, bodyType: 'json' })).toEqual(['body']);
    expect(draftChanges(saved, { ...saved, graphql: { query: '{ me }', variables: '' } })).toEqual(['body']);
    expect(draftChanges(saved, { ...saved, form: [row('a', 'b')] })).toEqual(['body']);
  });

  it('notices a row that was only unticked', () => {
    const saved = { ...base(), params: [row('page', '2')] };
    const draft = { ...saved, params: [{ ...saved.params[0], enabled: false }] };
    expect(draftChanges(saved, draft)).toEqual(['params']);
  });
});

describe('withDraft', () => {
  it('prefers the draft, and copes with nothing being open', () => {
    const saved = base();
    const draft = { ...saved, url: 'https://draft.test' };
    expect(withDraft(saved, {})).toBe(saved);
    expect(withDraft(saved, { [saved.id]: draft })).toBe(draft);
    expect(withDraft(null, {})).toBeNull();
  });
});

describe('dropDrafts', () => {
  it('returns the same object when there is nothing to drop', () => {
    const saved = base();
    const drafts = { [saved.id]: saved };
    expect(dropDrafts(drafts, new Set(['req_other']))).toBe(drafts);
  });

  it('removes only what was named', () => {
    const one = base();
    const two = base();
    const drafts = { [one.id]: one, [two.id]: two };
    expect(Object.keys(dropDrafts(drafts, new Set([one.id])))).toEqual([two.id]);
  });
});
