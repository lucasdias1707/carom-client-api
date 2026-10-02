import { openIndexedDb } from '@/lib/idb-backend';
import { Persister, type StorageStatus } from '@/lib/persistence';
import type { ResponseRecord, WorkspaceState } from '@/types';

/** Where the workspace used to live, whole, and still the way in for an older install. */
export const STORAGE_KEY = 'api-workbench:state';
export const STATE_VERSION = 2;

/**
 * The workspace as it was at the moment the window closed.
 *
 * An IndexedDB write is asynchronous and a window that is closing may not wait
 * for it, so on the way out the workspace is also put here, synchronously — the
 * one thing a closing window can still do. It is only ever a stopgap: the next
 * start prefers it when it is newer than the database, writes it there, and
 * deletes it.
 */
const UNSAVED_KEY = 'api-workbench:unsaved';
/** Past this a stopgap would itself fail on the quota, so it is not attempted. */
const UNSAVED_LIMIT = 1_500_000;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/* ───────────────────────── what the rest of the app sees ───────────────────────── */

let persister: Persister | null = null;
let cache: WorkspaceState | null = null;
const listeners = new Set<(status: StorageStatus) => void>();

/**
 * Open storage and read the workspace into memory. Call once, before the first
 * render: the store reads its initial state synchronously, and this is what
 * makes that possible with a database that is not.
 *
 * Never throws. If IndexedDB is not there or will not open, the app carries on
 * as it did before, on `localStorage`.
 */
export async function bootStorage(): Promise<void> {
  if (!isBrowser()) return;
  try {
    const backend = await openIndexedDb();
    const next = new Persister(backend, {
      onStatus: (status) => listeners.forEach((listener) => listener(status)),
      onPersisted: removeUnsaved,
    });

    const loaded = await next.load();
    let state: WorkspaceState | null = loaded?.state ?? null;

    if (!state) {
      // Nothing in the database yet: take over what the old storage held.
      const raw = safely(() => window.localStorage.getItem(STORAGE_KEY));
      const migrated = raw ? await next.migrate(raw) : null;
      if (migrated) {
        state = migrated.state;
        if (migrated.safeToRemove) safely(() => window.localStorage.removeItem(STORAGE_KEY));
      }
    }

    const unsaved = readUnsaved();
    if (state && unsaved && unsaved.savedAt > (loaded?.savedAt ?? 0)) {
      state = { ...unsaved.state, responses: state.responses };
      next.write(state);
    } else if (unsaved) {
      removeUnsaved();
    }

    persister = next;
    cache = state;
  } catch {
    persister = null;
    cache = readLegacy();
  }
}

/** The stored workspace, as of boot. */
export function readState(): WorkspaceState | null {
  return cache;
}

/** The language someone chose, for the one screen that must work when the app does not. */
export function storedLanguage(): string | undefined {
  return (cache ?? readLegacy())?.settings?.language;
}

/** Store the workspace. Coalesced: only the newest of a burst of calls is written. */
export function writeState(state: WorkspaceState): void {
  if (!isBrowser()) return;
  if (persister) persister.write(state);
  else writeLegacy(state);
}

/** The window is going: start the write now, and keep a synchronous copy in case it cannot finish. */
export function flushState(state: WorkspaceState): void {
  if (!isBrowser()) return;
  if (!persister) {
    writeLegacy(state);
    return;
  }
  persister.write(state);
  const { responses: _responses, ...rest } = state;
  const text = JSON.stringify({ savedAt: Date.now(), state: rest });
  if (text.length <= UNSAVED_LIMIT) safely(() => window.localStorage.setItem(UNSAVED_KEY, text));
}

export function clearState(): void {
  if (!isBrowser()) return;
  safely(() => window.localStorage.removeItem(STORAGE_KEY));
  removeUnsaved();
  cache = null;
  void persister?.clear();
}

/** Hear when storage stops keeping everything, or stops keeping anything — and when it recovers. */
export function onStorageStatus(listener: (status: StorageStatus) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/* ───────────────────────── the stopgap copy ───────────────────────── */

function readUnsaved(): { savedAt: number; state: Omit<WorkspaceState, 'responses'> } | null {
  const raw = safely(() => window.localStorage.getItem(UNSAVED_KEY));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { savedAt?: number; state?: { requests?: unknown } };
    if (typeof parsed.savedAt !== 'number' || !parsed.state || !Array.isArray(parsed.state.requests)) return null;
    return parsed as { savedAt: number; state: Omit<WorkspaceState, 'responses'> };
  } catch {
    return null;
  }
}

function removeUnsaved(): void {
  safely(() => window.localStorage.removeItem(UNSAVED_KEY));
}

function safely<T>(action: () => T): T | null {
  try {
    return action();
  } catch {
    return null;
  }
}

/* ───────────────────────── the way it worked before ─────────────────────────
   Kept for a browser that will not give out IndexedDB. The whole workspace in
   one `localStorage` string, with the ladder of what to let go when it does not
   fit; the quota that made it necessary is the reason this is no longer the
   first choice. */

/** Bodies larger than this are stored truncated so one response cannot fill the quota. */
const LEGACY_MAX_BODY = 128 * 1024;
const LEGACY_MAX_RESPONSES = 40;

function readLegacy(): WorkspaceState | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkspaceState;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.requests)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function trimResponses(responses: ResponseRecord[], persist: boolean): ResponseRecord[] {
  if (!persist) return [];
  return responses.slice(0, LEGACY_MAX_RESPONSES).map((response) =>
    response.body.length > LEGACY_MAX_BODY
      ? { ...response, body: response.body.slice(0, LEGACY_MAX_BODY), truncated: true }
      : response,
  );
}

function writeLegacy(state: WorkspaceState): void {
  const attempts: WorkspaceState[] = [
    { ...state, responses: trimResponses(state.responses, state.settings.persistResponses) },
    { ...state, responses: trimResponses(state.responses.slice(0, 5), state.settings.persistResponses) },
    { ...state, responses: [] },
    { ...state, responses: [], versions: state.versions.slice(0, 20) },
    { ...state, responses: [], versions: [] },
  ];
  for (const attempt of attempts) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(attempt));
      return;
    } catch {
      // Try again with a smaller payload.
    }
  }
  listeners.forEach((listener) => listener('failed'));
}
