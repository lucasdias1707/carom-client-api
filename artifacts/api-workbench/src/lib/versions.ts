import { draftChanges } from '@/lib/draft';
import { createId } from '@/lib/id';
import type { RequestRecord, RequestVersion, WorkspaceState } from '@/types';

/**
 * What a request used to be.
 *
 * A version is the request as it stood at a Save. Save is the moment you decide
 * it is how you want it — the same point the draft already commits at — so the
 * history agrees with what the tree, an export and a shared file say. Trying
 * something out does not make a version; that is what the draft is for.
 *
 * Restoring puts a version back into the *draft* rather than into the saved
 * request, so it is something you look at before confirming with ⌘S, and
 * backing out is the Revert that already exists.
 */

/**
 * How many are kept per request. Twenty covers a working session with room to
 * spare; the whole request is copied into each one, so this is also the bound
 * on what the history can cost. The responses next door are capped the same
 * way, for the same reason.
 */
export const MAX_VERSIONS_PER_REQUEST = 20;

/** Most recent first, which is the order the list is read in. */
export function versionsFor(versions: RequestVersion[], requestId: string): RequestVersion[] {
  return versions.filter((version) => version.requestId === requestId);
}

/**
 * Record a save, and drop the oldest of that request's versions past the cap.
 *
 * `changed` is worked out here rather than stored by the caller: `draftChanges`
 * is the same comparison the Save button's tooltip uses, so the row in the
 * history and the hint before you pressed it cannot disagree.
 */
export function recordVersion(
  versions: RequestVersion[],
  saved: RequestRecord,
  draft: RequestRecord,
): RequestVersion[] {
  const entry: RequestVersion = {
    id: createId('ver'),
    requestId: saved.id,
    savedAt: new Date().toISOString(),
    changed: draftChanges(saved, draft),
    request: draft,
  };

  const mine = [entry, ...versionsFor(versions, saved.id)].slice(0, MAX_VERSIONS_PER_REQUEST);
  const kept = new Set(mine.map((version) => version.id));
  return [entry, ...versions.filter((version) => version.requestId !== saved.id || kept.has(version.id))];
}

/** Drop the history of requests that are gone. */
export function dropVersions(versions: RequestVersion[], ids: ReadonlySet<string>): RequestVersion[] {
  if (!versions.some((version) => ids.has(version.requestId))) return versions;
  return versions.filter((version) => !ids.has(version.requestId));
}
