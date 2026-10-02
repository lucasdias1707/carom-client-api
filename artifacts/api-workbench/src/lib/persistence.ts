import type { ResponseRecord, WorkspaceState } from '@/types';

/**
 * Keeping the workspace, without a five-megabyte ceiling.
 *
 * The workspace used to live in one `localStorage` string, which a browser caps
 * at about 5 million characters for *everything*: requests, environments, saved
 * versions and every response body together. A single large response could fill
 * it, and when it did the write failed without a word.
 *
 * It now lives in IndexedDB, whose quota is a share of the disk (1 GB in the
 * browser this was measured in) — and in two parts, because they change at
 * different rates. The workspace itself is small and written on every edit.
 * Responses are large and written when one arrives, so each is its own record
 * and only the ones that changed are written; a 26 MB response costs one
 * 26 MB write when it lands, not one per keystroke after.
 *
 * Nothing here touches the DOM. The storage it writes to is passed in, so the
 * parts that can lose someone's work — what is kept when space runs short,
 * what a migration is allowed to delete — are tested as plain functions.
 */

/** Longest response body kept, in characters. A 26 MB body is kept whole. */
export const MAX_PERSISTED_BODY = 32_000_000;
/** Most responses kept between runs. */
export const MAX_PERSISTED_RESPONSES = 40;
/**
 * All the bodies together, in characters. This is what the app has to read back
 * before it can show anything, so it is bounded by how long that may take rather
 * than by how much the disk could hold.
 */
export const MAX_PERSISTED_TOTAL = 64_000_000;

export type MainRecord = {
  /** Everything but the responses. */
  state: Omit<WorkspaceState, 'responses'>;
  /** Which responses, newest first: the records themselves are stored apart. */
  responseOrder: string[];
  /** When it was written, to tell it from a copy saved at the moment of closing. */
  savedAt: number;
};

/** What the persister needs from a database, and nothing about which one. */
export interface Backend {
  readMain(): Promise<MainRecord | undefined>;
  writeMain(record: MainRecord): Promise<void>;
  readResponses(): Promise<ResponseRecord[]>;
  /** One transaction: either both happen or neither does. */
  writeResponses(put: ResponseRecord[], remove: string[]): Promise<void>;
  /** Kept, never read: the raw text of what a migration replaced. */
  writeBackup(raw: string): Promise<void>;
  wipe(): Promise<void>;
}

/** How storage is doing, reported when it changes rather than on every write. */
export type StorageStatus = 'ok' | 'trimmed' | 'failed';

/**
 * What gets let go, in order, when a write does not fit.
 *
 * Responses go first, because a response can be fetched again and a version you
 * might want to restore cannot. The requests, folders and environments go last,
 * and never by choice: if the last rung fails, nothing was saved and the person
 * is told.
 */
const LADDER: Array<{ responses: number; versions: number }> = [
  { responses: MAX_PERSISTED_RESPONSES, versions: Infinity },
  { responses: 5, versions: Infinity },
  { responses: 0, versions: Infinity },
  { responses: 0, versions: 20 },
  { responses: 0, versions: 0 },
];

export type PersisterOptions = {
  /** Called after a write that stored everything it was given. */
  onPersisted?: () => void;
  onStatus?: (status: StorageStatus) => void;
};

export class Persister {
  /** Responses on disk by id, with the object each was written from (null: not known). */
  private written = new Map<string, ResponseRecord | null>();
  private latest: { state: WorkspaceState; at: number } | null = null;
  private running: Promise<void> | null = null;
  private status: StorageStatus = 'ok';

  constructor(
    private readonly backend: Backend,
    private readonly options: PersisterOptions = {},
  ) {}

  /** The stored workspace, with its responses put back in order, or null if there is none. */
  async load(): Promise<{ state: WorkspaceState; savedAt: number } | null> {
    const main = await this.backend.readMain();
    const stored = await this.backend.readResponses();
    // Responses with no workspace are what a first write leaves behind if it
    // stops between its two halves. They are still known to be on disk, so the
    // next write can clear them rather than leave them there for good.
    if (!main) {
      this.written = new Map(stored.map((response) => [response.id, null]));
      return null;
    }
    const byId = new Map(stored.map((response) => [response.id, response]));
    const responses = main.responseOrder.flatMap((id) => {
      const found = byId.get(id);
      return found ? [found] : [];
    });
    // Everything on disk is known to be there, so a later write can remove it.
    // A record that is on disk but not in the order is an orphan from a write
    // that stopped half way: nothing refers to it, and the next write clears it.
    this.written = new Map(stored.map((response) => [response.id, null]));
    for (const response of responses) this.written.set(response.id, response);
    return { state: { ...main.state, responses } as WorkspaceState, savedAt: main.savedAt };
  }

  /** Ask for this state to be stored. Writes are one at a time, and only the newest is kept waiting. */
  write(state: WorkspaceState, at = Date.now()): void {
    this.latest = { state, at };
    if (!this.running) this.running = this.drain();
  }

  /** Resolves when everything asked for so far has been written. */
  settled(): Promise<void> {
    return this.running ?? Promise.resolve();
  }

  /** Store this state now and say how much of it fit: 0 is all of it, null is none. */
  async writeNow(state: WorkspaceState, at = Date.now()): Promise<number | null> {
    await this.settled();
    return this.persist(state, at);
  }

  /**
   * Take over a workspace that used to live in `localStorage`.
   *
   * What it replaced is only ever removed by the caller, and only when this says
   * it is safe: everything was written, in full, and reading it back finds the
   * same requests and folders. Anything short of that and the old copy stays
   * where it was.
   */
  async migrate(raw: string): Promise<{ state: WorkspaceState; safeToRemove: boolean } | null> {
    let parsed: WorkspaceState;
    try {
      parsed = JSON.parse(raw) as WorkspaceState;
    } catch {
      return null;
    }
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.requests)) return null;

    const level = await this.writeNow(parsed);
    let safe = false;
    if (level === 0) {
      const back = await this.load();
      safe =
        back !== null &&
        back.state.requests.length === parsed.requests.length &&
        (back.state.folders ?? []).length === (parsed.folders ?? []).length;
    }
    if (safe) await this.backend.writeBackup(raw).catch(() => undefined);
    return { state: parsed, safeToRemove: safe };
  }

  async clear(): Promise<void> {
    await this.settled();
    this.written = new Map();
    await this.backend.wipe();
  }

  private async drain(): Promise<void> {
    try {
      while (this.latest) {
        const job = this.latest;
        this.latest = null;
        await this.persist(job.state, job.at);
      }
    } finally {
      this.running = null;
    }
  }

  /** Try each rung of the ladder until one fits. */
  private async persist(state: WorkspaceState, at: number): Promise<number | null> {
    for (let level = 0; level < LADDER.length; level++) {
      try {
        await this.attempt(state, at, LADDER[level]);
        this.report(level === 0 ? 'ok' : 'trimmed');
        if (level === 0) this.options.onPersisted?.();
        return level;
      } catch {
        // Fall to the next rung, which keeps less.
      }
    }
    this.report('failed');
    return null;
  }

  private async attempt(state: WorkspaceState, at: number, rung: { responses: number; versions: number }) {
    const { responses, ...rest } = state;
    const keep = state.settings.persistResponses ? select(responses, rung.responses) : [];

    const put: ResponseRecord[] = [];
    const nextWritten = new Map<string, ResponseRecord | null>();
    for (const { source, stored } of keep) {
      nextWritten.set(source.id, source);
      if (this.written.get(source.id) !== source) put.push(stored);
    }
    const remove = [...this.written.keys()].filter((id) => !nextWritten.has(id));

    // The responses first and the workspace after: a write that stops between
    // the two leaves records nothing points to, which is harmless, rather than
    // a workspace pointing at records that are not there.
    if (put.length > 0 || remove.length > 0) await this.backend.writeResponses(put, remove);
    this.written = nextWritten;
    await this.backend.writeMain({
      state: { ...rest, versions: rest.versions.slice(0, rung.versions) },
      responseOrder: keep.map(({ source }) => source.id),
      savedAt: at,
    });
  }

  private report(next: StorageStatus) {
    if (next === this.status) return;
    this.status = next;
    this.options.onStatus?.(next);
  }
}

/**
 * The responses worth keeping, newest first: no more than `count`, none longer
 * than the cap, and all of them together within the total.
 *
 * `stored` is what gets written; `source` is what the app holds, which is how a
 * response that has not changed is recognised and not written again.
 */
export function select(
  responses: ResponseRecord[],
  count: number,
): Array<{ source: ResponseRecord; stored: ResponseRecord }> {
  const chosen: Array<{ source: ResponseRecord; stored: ResponseRecord }> = [];
  let total = 0;
  for (const source of responses.slice(0, count)) {
    const stored =
      source.body.length > MAX_PERSISTED_BODY
        ? { ...source, body: source.body.slice(0, MAX_PERSISTED_BODY), truncated: true }
        : source;
    // The newest is always kept, as a safeguard should the caps ever be set so that one alone overflows the total; the rest only while there is room.
    if (chosen.length > 0 && total + stored.body.length > MAX_PERSISTED_TOTAL) break;
    total += stored.body.length;
    chosen.push({ source, stored });
  }
  return chosen;
}
