import type { ResponseRecord, WorkspaceState } from '@/types';

export const STORAGE_KEY = 'api-workbench:state';
export const STATE_VERSION = 2;

/** Bodies larger than this are stored truncated so one response cannot fill the quota. */
const MAX_PERSISTED_BODY = 128 * 1024;
/** Upper bound on how many responses we keep around between reloads. */
const MAX_PERSISTED_RESPONSES = 40;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readState(): WorkspaceState | null {
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
  return responses.slice(0, MAX_PERSISTED_RESPONSES).map((response) =>
    response.body.length > MAX_PERSISTED_BODY
      ? { ...response, body: response.body.slice(0, MAX_PERSISTED_BODY), truncated: true }
      : response,
  );
}

/**
 * Persist the workspace, shedding what is heavy before what is irreplaceable.
 *
 * Two parts of the state grow without a natural bound: recorded responses, and
 * the saved versions of each request. Neither may be the thing that costs
 * someone their requests, so on a quota error they go in that order —
 * responses first, because a response can be fetched again and a version you
 * might want to restore cannot.
 */
export function writeState(state: WorkspaceState): void {
  if (!isBrowser()) return;
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
}

export function clearState(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing sensible to do if storage is unavailable.
  }
}
