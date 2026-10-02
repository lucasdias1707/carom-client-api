import { describe, expect, it } from 'vitest';
import { translatorFor } from '@/locales';
import { createSeedState } from '@/lib/seed';
import {
  MAX_PERSISTED_BODY,
  MAX_PERSISTED_RESPONSES,
  MAX_PERSISTED_TOTAL,
  Persister,
  select,
  type Backend,
  type MainRecord,
  type StorageStatus,
} from '@/lib/persistence';
import type { RequestVersion, ResponseRecord, WorkspaceState } from '@/types';

/** A database in memory, that can be made to run out of room. */
class MemoryBackend implements Backend {
  main: MainRecord | undefined;
  responses = new Map<string, ResponseRecord>();
  backup: string | undefined;
  /** What each `writeResponses` was asked to do. */
  calls: Array<{ put: string[]; remove: string[] }> = [];
  mainWrites = 0;
  /** Characters the whole database may hold before a write is refused. */
  room = Infinity;

  used(extra = 0): number {
    let total = extra;
    for (const response of this.responses.values()) total += response.body.length;
    return total + (this.main ? JSON.stringify(this.main).length : 0);
  }

  private refuse(): never {
    throw Object.assign(new Error('full'), { name: 'QuotaExceededError' });
  }

  async readMain() {
    return this.main;
  }
  async writeMain(record: MainRecord) {
    if (this.used(JSON.stringify(record).length - (this.main ? JSON.stringify(this.main).length : 0)) > this.room) this.refuse();
    this.main = record;
    this.mainWrites++;
  }
  async readResponses() {
    return [...this.responses.values()];
  }
  async writeResponses(put: ResponseRecord[], remove: string[]) {
    const next = new Map(this.responses);
    for (const id of remove) next.delete(id);
    for (const record of put) next.set(record.id, record);
    let total = this.main ? JSON.stringify(this.main).length : 0;
    for (const record of next.values()) total += record.body.length;
    if (total > this.room) this.refuse();
    this.responses = next;
    this.calls.push({ put: put.map((record) => record.id), remove });
  }
  async writeBackup(raw: string) {
    this.backup = raw;
  }
  async wipe() {
    this.main = undefined;
    this.responses = new Map();
  }
}

const response = (id: string, size = 10): ResponseRecord => ({
  id,
  requestId: 'req',
  url: 'http://x.test',
  method: 'GET',
  status: 200,
  statusText: 'OK',
  headers: [],
  body: 'x'.repeat(size),
  truncated: false,
  size,
  durationMs: 1,
  sentAt: '2026-01-01T00:00:00Z',
  via: 'desktop',
});

const baseState = (): WorkspaceState => createSeedState(translatorFor('en'));
const withResponses = (responses: ResponseRecord[], state = baseState()): WorkspaceState => ({ ...state, responses });
const version = (id: string): RequestVersion => ({ id, requestId: 'req', savedAt: '2026-01-01T00:00:00Z', changed: [], request: baseState().requests[0] });

function persister(backend = new MemoryBackend()) {
  const statuses: StorageStatus[] = [];
  let persisted = 0;
  const instance = new Persister(backend, { onStatus: (status) => statuses.push(status), onPersisted: () => persisted++ });
  return { backend, instance, statuses, persisted: () => persisted };
}

describe('storing and loading', () => {
  it('has nothing to load until something is written', async () => {
    expect(await persister().instance.load()).toBeNull();
  });

  it('gives back what was written, responses in the order they were in', async () => {
    const { backend, instance } = persister();
    const state = withResponses([response('b'), response('a'), response('c')]);
    await instance.writeNow(state);

    const back = await persister(backend).instance.load();
    expect(back?.state.requests).toEqual(state.requests);
    expect(back?.state.responses.map((item) => item.id)).toEqual(['b', 'a', 'c']);
  });

  it('keeps responses apart from the workspace, so an edit does not rewrite a response', async () => {
    const { backend, instance } = persister();
    const state = withResponses([response('a', 1000), response('b', 1000)]);
    await instance.writeNow(state);
    expect(backend.calls).toEqual([{ put: ['a', 'b'], remove: [] }]);

    // The workspace changes; the responses are the same objects.
    await instance.writeNow({ ...state, activeEnvironmentId: 'other' });
    expect(backend.calls).toHaveLength(1);
    expect(backend.mainWrites).toBe(2);
  });

  it('writes only the response that is new, and removes the one that fell off the end', async () => {
    const { backend, instance } = persister();
    const a = response('a');
    const b = response('b');
    await instance.writeNow(withResponses([b, a]));
    backend.calls.length = 0;

    const c = response('c');
    await instance.writeNow(withResponses([c, b]));
    expect(backend.calls).toEqual([{ put: ['c'], remove: ['a'] }]);
  });

  it('after a load, does not write back what it just read', async () => {
    const first = persister();
    await first.instance.writeNow(withResponses([response('a'), response('b')]));

    const second = persister(first.backend);
    const loaded = await second.instance.load();
    first.backend.calls.length = 0;
    await second.instance.writeNow(loaded!.state);
    expect(first.backend.calls).toEqual([]);
  });

  it('clears an orphan left by a write that stopped half way', async () => {
    const backend = new MemoryBackend();
    backend.responses.set('orphan', response('orphan'));
    const { instance } = persister(backend);
    await instance.load();
    await instance.writeNow(withResponses([response('a')]));
    expect([...backend.responses.keys()]).toEqual(['a']);
  });

  it('keeps no responses when asked not to', async () => {
    const { backend, instance } = persister();
    const state = withResponses([response('a')]);
    await instance.writeNow({ ...state, settings: { ...state.settings, persistResponses: false } });
    expect(backend.responses.size).toBe(0);
    expect(backend.main?.responseOrder).toEqual([]);
  });

  it('wipes everything on clear', async () => {
    const { backend, instance } = persister();
    await instance.writeNow(withResponses([response('a')]));
    await instance.clear();
    expect(backend.main).toBeUndefined();
    expect(backend.responses.size).toBe(0);
  });
});

describe('what is kept', () => {
  it('keeps a 26 MB body whole, which the old five-megabyte store could not', () => {
    const big = response('big', 26_000_000);
    const [only] = select([big], MAX_PERSISTED_RESPONSES);
    expect(only.stored.body.length).toBe(26_000_000);
    expect(only.stored.truncated).toBe(false);
    expect(only.stored).toBe(big);
  });

  it('cuts a body past the cap and says so, leaving the original alone', () => {
    const huge = response('huge', MAX_PERSISTED_BODY + 5);
    const [only] = select([huge], MAX_PERSISTED_RESPONSES);
    expect(only.stored.body.length).toBe(MAX_PERSISTED_BODY);
    expect(only.stored.truncated).toBe(true);
    expect(huge.body.length).toBe(MAX_PERSISTED_BODY + 5);
    expect(only.source).toBe(huge);
  });

  it('keeps the newest ones, up to the count', () => {
    const many = Array.from({ length: MAX_PERSISTED_RESPONSES + 10 }, (_, index) => response(`r${index}`));
    const chosen = select(many, MAX_PERSISTED_RESPONSES);
    expect(chosen).toHaveLength(MAX_PERSISTED_RESPONSES);
    expect(chosen[0].source.id).toBe('r0');
  });

  it('stops at the total, newest first, and does not skip ahead to a smaller one', () => {
    // Three at 30 M is 90 M against a total of 64 M: two fit, and the tiny one after them does not get in.
    const chosen = select([response('a', 30_000_000), response('b', 30_000_000), response('c', 30_000_000), response('d', 10)], 40);
    expect(chosen.map((item) => item.source.id)).toEqual(['a', 'b']);
  });

  it('caps the newest at the body limit and still keeps what fits after it', () => {
    // The body cap is half the total or less, so the newest can never fill the total alone.
    expect(MAX_PERSISTED_BODY * 2).toBeLessThanOrEqual(MAX_PERSISTED_TOTAL);
    const chosen = select([response('x', MAX_PERSISTED_TOTAL + 1), response('y', 10)], 40);
    expect(chosen.map((item) => item.source.id)).toEqual(['x', 'y']);
    expect(chosen[0].stored.body.length).toBe(MAX_PERSISTED_BODY);
  });
});

describe('when there is not room', () => {
  it('lets go of responses before versions, and says it did', async () => {
    const versions = [version('v1'), version('v2')];
    const state: WorkspaceState = { ...withResponses([response('a', 50_000), response('b', 50_000)]), versions };
    const roomForMainOnly = JSON.stringify({ state: { ...state, responses: undefined }, responseOrder: [], savedAt: 0 }).length + 500;

    const { backend, instance, statuses } = persister();
    backend.room = roomForMainOnly;
    const level = await instance.writeNow(state);

    expect(level).toBeGreaterThan(0);
    expect(backend.responses.size).toBe(0);
    // The versions survived: they could not be fetched again.
    expect(backend.main?.state.versions).toHaveLength(2);
    expect(statuses).toEqual(['trimmed']);
  });

  it('keeps fewer responses before it keeps none', async () => {
    const state = withResponses(Array.from({ length: 10 }, (_, index) => response(`r${index}`, 10_000)));
    const mainLength = JSON.stringify({ state: { ...state, responses: undefined }, responseOrder: [], savedAt: 0 }).length;
    const { backend, instance } = persister();
    backend.room = mainLength + 5 * 10_000 + 2_000;
    await instance.writeNow(state);
    expect(backend.responses.size).toBe(5);
    expect(backend.main?.responseOrder).toEqual(['r0', 'r1', 'r2', 'r3', 'r4']);
  });

  it('reports failure when not even the workspace fits, and recovery when it does again', async () => {
    const { backend, instance, statuses } = persister();
    backend.room = 10;
    expect(await instance.writeNow(baseState())).toBeNull();
    expect(statuses).toEqual(['failed']);

    backend.room = Infinity;
    expect(await instance.writeNow(baseState())).toBe(0);
    expect(statuses).toEqual(['failed', 'ok']);
  });

  it('says it once, not once per write', async () => {
    const { backend, instance, statuses } = persister();
    backend.room = 10;
    await instance.writeNow(baseState());
    await instance.writeNow(baseState());
    await instance.writeNow(baseState());
    expect(statuses).toEqual(['failed']);
  });

  it('does not call a trimmed write persisted, so a stopgap copy is not deleted too soon', async () => {
    const { backend, instance, persisted } = persister();
    const state = withResponses([response('a', 50_000)]);
    backend.room = JSON.stringify({ state: { ...state, responses: undefined }, responseOrder: [], savedAt: 0 }).length + 500;
    await instance.writeNow(state);
    expect(persisted()).toBe(0);
    backend.room = Infinity;
    await instance.writeNow(state);
    expect(persisted()).toBe(1);
  });
});

describe('write coalescing', () => {
  it('writes one at a time, and only the newest of a burst', async () => {
    const { backend, instance } = persister();
    const state = baseState();
    for (let index = 0; index < 20; index++) instance.write({ ...state, activeEnvironmentId: `e${index}` }, index + 1);
    await instance.settled();
    expect(backend.mainWrites).toBeLessThanOrEqual(2);
    expect(backend.main?.state.activeEnvironmentId).toBe('e19');
    expect(backend.main?.savedAt).toBe(20);
  });
});

describe('taking over the old storage', () => {
  const legacy = () => JSON.stringify(withResponses([response('a')]));

  it('moves the workspace across and says the old copy is safe to remove', async () => {
    const { backend, instance } = persister();
    const raw = legacy();
    const result = await instance.migrate(raw);
    expect(result?.safeToRemove).toBe(true);
    expect(backend.main?.state.requests).toHaveLength(baseState().requests.length);
    expect(backend.responses.size).toBe(1);
    // What it replaced is kept, in the database, in case it is ever needed.
    expect(backend.backup).toBe(raw);
  });

  it('does not say the old copy is safe when not everything fit', async () => {
    const { backend, instance } = persister();
    backend.room = 10;
    const result = await instance.migrate(legacy());
    expect(result?.safeToRemove).toBe(false);
    expect(backend.backup).toBeUndefined();
  });

  it('does not say so when it had to let go of anything, versions included', async () => {
    const state: WorkspaceState = { ...baseState(), versions: [version('v1')] };
    const { backend, instance } = persister();
    backend.room = JSON.stringify({ state: { ...state, versions: [] }, responseOrder: [], savedAt: 0 }).length + 20;
    const result = await instance.migrate(JSON.stringify(state));
    expect(result?.safeToRemove).toBe(false);
  });

  it('refuses what is not a workspace, and leaves the database alone', async () => {
    const { backend, instance } = persister();
    expect(await instance.migrate('not json')).toBeNull();
    expect(await instance.migrate('{"hello":"world"}')).toBeNull();
    expect(await instance.migrate('null')).toBeNull();
    expect(backend.main).toBeUndefined();
  });
});
