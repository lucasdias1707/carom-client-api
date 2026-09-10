import type { RequestRecord } from '@/types';

/**
 * Unsaved edits.
 *
 * Typing in the composer writes to a draft rather than to the request itself,
 * the way an editor holds a modified buffer: the tab shows a dot, ⌘S commits,
 * and closing without saving asks first. A request therefore says the same
 * thing in the sidebar, in an export and in a shared file until you decide it
 * should say something else.
 *
 * What the draft covers is exactly what the composer edits. Renaming from the
 * sidebar, dragging a request into another folder or duplicating it are
 * operations on the tree, not on the text in front of you, and they still take
 * effect immediately.
 */

/** One comparable part of a request, in the order the composer shows them. */
const SECTIONS: Array<{ label: string; parts: (request: RequestRecord) => unknown }> = [
  { label: 'Method', parts: (request) => request.method },
  { label: 'URL', parts: (request) => request.url },
  { label: 'Params', parts: (request) => request.params },
  { label: 'Headers', parts: (request) => request.headers },
  {
    label: 'Body',
    parts: (request) => [request.bodyType, request.body, request.form, request.multipart, request.graphql],
  },
  { label: 'Auth', parts: (request) => request.auth },
  { label: 'Scripts', parts: (request) => [request.preScript, request.postScript] },
  { label: 'Docs', parts: (request) => [request.description, request.docs ?? null] },
  { label: 'Name', parts: (request) => request.name },
];

/**
 * Which parts of the request the draft changed, in composer order.
 *
 * `updatedAt` is deliberately not one of them: every keystroke moves it, so
 * comparing it would make a draft that was typed and untyped look changed.
 */
export function draftChanges(saved: RequestRecord, draft: RequestRecord): string[] {
  return SECTIONS.filter(
    (section) => JSON.stringify(section.parts(saved)) !== JSON.stringify(section.parts(draft)),
  ).map((section) => section.label);
}

/** True when the draft still differs from what is saved. */
export function isDirty(saved: RequestRecord, draft: RequestRecord): boolean {
  return draftChanges(saved, draft).length > 0;
}

/**
 * The request as it should be shown and sent: the draft when there is one.
 *
 * Everything reads through here, so an unsaved change is what you see in the
 * composer, what the tab is named after and what goes out on Send — which is
 * the part that makes a draft usable rather than a nuisance.
 */
export function withDraft(
  request: RequestRecord | undefined | null,
  drafts: Record<string, RequestRecord>,
): RequestRecord | null {
  if (!request) return null;
  return drafts[request.id] ?? request;
}

/** Drop the drafts of requests that are gone, or whose tab was closed. */
export function dropDrafts(
  drafts: Record<string, RequestRecord>,
  ids: ReadonlySet<string>,
): Record<string, RequestRecord> {
  if (!Object.keys(drafts).some((id) => ids.has(id))) return drafts;
  return Object.fromEntries(Object.entries(drafts).filter(([id]) => !ids.has(id)));
}
