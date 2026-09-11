import type { KeyValue, RequestRecord } from '@/types';

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

/** How a table of rows reads when it has to fit on one line. */
const rowsText = (rows: KeyValue[]): string => {
  const active = rows.filter((item) => item.key.trim());
  if (active.length === 0) return '—';
  return active.map((item) => `${item.enabled ? '' : '· '}${item.key}=${item.value}`).join('  ');
};

/**
 * The parts of a request the composer can change, named.
 *
 * These ids are written into every saved version's `changed` list, so they are
 * storage, not display: a version saved in Portuguese has to read the same
 * after switching to English, which it cannot do if the stored word is itself
 * a translation. The label comes from the catalogue at the moment of drawing.
 */
export const SECTION_IDS = [
  'method',
  'url',
  'params',
  'headers',
  'body',
  'auth',
  'scripts',
  'docs',
  'name',
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

/**
 * One comparable part of a request, in the order the composer shows them.
 *
 * `parts` is what decides whether it changed; `text` is how it reads when the
 * history shows the two sides of that change. They are declared together so a
 * section cannot be compared on one thing and displayed as another.
 */
const SECTIONS: Array<{
  id: SectionId;
  parts: (request: RequestRecord) => unknown;
  text: (request: RequestRecord) => string;
}> = [
  { id: 'method', parts: (request) => request.method, text: (request) => request.method },
  { id: 'url', parts: (request) => request.url, text: (request) => request.url || '—' },
  { id: 'params', parts: (request) => request.params, text: (request) => rowsText(request.params) },
  { id: 'headers', parts: (request) => request.headers, text: (request) => rowsText(request.headers) },
  {
    id: 'body',
    parts: (request) => [request.bodyType, request.body, request.form, request.multipart, request.graphql],
    text: (request) =>
      request.bodyType === 'none' ? 'none'
      : request.bodyType === 'form' ? `form · ${rowsText(request.form)}`
      : request.bodyType === 'multipart' ? `multipart · ${rowsText(request.multipart)}`
      : request.bodyType === 'graphql' ? `graphql · ${request.graphql.query}`
      : `${request.bodyType} · ${request.body || '—'}`,
  },
  {
    id: 'auth',
    parts: (request) => request.auth,
    text: (request) => request.auth.type,
  },
  {
    id: 'scripts',
    parts: (request) => [request.preScript, request.postScript],
    text: (request) =>
      [request.preScript.trim() && 'pre', request.postScript.trim() && 'post'].filter(Boolean).join(' + ') || 'none',
  },
  {
    id: 'docs',
    parts: (request) => [request.description, request.docs ?? null],
    text: (request) =>
      [request.description.trim(), `${request.docs?.fields.length ?? 0} fields`].filter(Boolean).join(' · '),
  },
  { id: 'name', parts: (request) => request.name, text: (request) => request.name },
];

/** How one section of a request reads, for showing two of them side by side. */
export function sectionText(request: RequestRecord, id: SectionId): string {
  return SECTIONS.find((section) => section.id === id)?.text(request) ?? '';
}

/**
 * Read a stored `changed` entry as a section id.
 *
 * Versions saved before the ids existed hold the English label — 'Method',
 * 'URL' — which lowercases straight onto its id. Anything that does not match
 * is dropped rather than shown: a badge saying nothing recognisable is worse
 * than one badge fewer, and the version itself still restores in full.
 */
export function sectionId(stored: string): SectionId | null {
  const lowered = stored.toLowerCase();
  return SECTION_IDS.find((id) => id === lowered) ?? null;
}

/**
 * Which parts of the request the draft changed, in composer order.
 *
 * `updatedAt` is deliberately not one of them: every keystroke moves it, so
 * comparing it would make a draft that was typed and untyped look changed.
 */
export function draftChanges(saved: RequestRecord, draft: RequestRecord): SectionId[] {
  return SECTIONS.filter(
    (section) => JSON.stringify(section.parts(saved)) !== JSON.stringify(section.parts(draft)),
  ).map((section) => section.id);
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
