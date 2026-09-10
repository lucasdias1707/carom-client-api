import { pruneTree } from '@/lib/tree';
import type { Environment, Folder, RequestRecord, WorkspaceState } from '@/types';

/**
 * A slice of a workspace: one folder with everything under it, or one request.
 *
 * It is deliberately not a `WorkspaceState`. A full export replaces the
 * workspace on import; a slice has to be merged into one, and the two must not
 * be mistaken for each other by whatever reads the file, so the shape carries
 * its own marker.
 */
export const SUBTREE_FORMAT = 'workspace-subtree';
/** 2 added `environments`. A version 1 file simply has none, and still reads. */
export const SUBTREE_VERSION = 2;

export type SubtreeExport = {
  format: typeof SUBTREE_FORMAT;
  version: number;
  /** What was exported, for a human reading the file or a future importer. */
  name: string;
  exportedAt: string;
  /** Empty when a single request was exported. Ordered outermost first. */
  folders: Folder[];
  requests: RequestRecord[];
  /**
   * Environments that were ticked, base included when it was.
   *
   * Absent in a version 1 file. They travel with the requests deliberately: a
   * request whose URL is `{{baseUrl}}/orders` is not much use to the person
   * you sent it to without the environment that says what `baseUrl` is.
   */
  environments?: Environment[];
};

/** True for any object carrying our slice marker, however old its version. */
export function isSubtreeExport(value: unknown): value is SubtreeExport {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { format?: unknown }).format === SUBTREE_FORMAT
  );
}

/**
 * Folder ids for `folderId` and every folder beneath it.
 *
 * The `seen` set is not paranoia about our own reducer: state comes back from
 * localStorage and from imported files, and a parent cycle there would
 * otherwise spin forever.
 */
export function subtreeFolderIds(state: WorkspaceState, folderId: string): string[] {
  const collected: string[] = [];
  const seen = new Set<string>();
  const queue = [folderId];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    if (seen.has(current)) continue;
    seen.add(current);
    if (!state.folders.some((folder) => folder.id === current)) continue;
    collected.push(current);
    for (const child of state.folders) {
      if (child.parentId === current) queue.push(child.id);
    }
  }
  return collected;
}

/**
 * A folder, everything under it, and the requests inside all of them — the tick
 * marks the export dialog opens with when a folder was the thing clicked.
 *
 * Seeding it with the folder ids alone was the bug behind "exporting a folder
 * gives an empty folder": `pruneTree` keeps a request only when the request's
 * own id is selected, so the file came out as a shell with nothing in it.
 */
export function subtreeSelection(state: WorkspaceState, folderId: string): string[] {
  const folderIds = subtreeFolderIds(state, folderId);
  const ids = new Set(folderIds);
  return [
    ...folderIds,
    ...state.requests
      .filter((request) => request.folderId !== null && ids.has(request.folderId))
      .map((request) => request.id),
  ];
}

function envelope(
  name: string,
  folders: Folder[],
  requests: RequestRecord[],
  environments: Environment[] = [],
): SubtreeExport {
  return {
    format: SUBTREE_FORMAT,
    version: SUBTREE_VERSION,
    name,
    exportedAt: new Date().toISOString(),
    folders,
    requests,
    ...(environments.length > 0 ? { environments } : {}),
  };
}

/**
 * Whatever was ticked in the export dialog.
 *
 * The ticking rules are the tree's, the same ones the import dialog uses: a
 * folder that was not ticked still comes along when something under it was,
 * because it is the path to that request.
 */
export function exportSelection(
  state: WorkspaceState,
  selection: { name: string; selected: ReadonlySet<string>; environmentIds?: ReadonlySet<string> },
): SubtreeExport {
  const workspace = state.activeWorkspaceId;
  const scoped = {
    folders: state.folders.filter((folder) => folder.workspaceId === workspace),
    requests: state.requests.filter((request) => request.workspaceId === workspace),
  };
  const { folders, requests } = pruneTree(scoped, selection.selected);
  const environments = state.environments.filter(
    (environment) => environment.workspaceId === workspace && selection.environmentIds?.has(environment.id),
  );
  return envelope(selection.name, folders, requests, environments);
}

/** One folder, its nested folders, and every request inside any of them. */
export function exportFolder(state: WorkspaceState, folderId: string): SubtreeExport | null {
  const root = state.folders.find((folder) => folder.id === folderId);
  if (!root) return null;
  const ids = new Set(subtreeFolderIds(state, folderId));
  const folders = state.folders.filter((folder) => ids.has(folder.id));
  const requests = state.requests.filter((request) => request.folderId !== null && ids.has(request.folderId));
  return envelope(root.name, folders, requests);
}

/** A single request, with no folder around it. */
export function exportRequest(state: WorkspaceState, requestId: string): SubtreeExport | null {
  const request = state.requests.find((item) => item.id === requestId);
  if (!request) return null;
  return envelope(request.name, [], [request]);
}

/**
 * A file name built from what was exported. Anything that is not a letter,
 * digit or dash collapses to a single dash, so "Pokémon / v2" saves as
 * "pok-mon-v2.json" rather than something the OS refuses to write.
 */
export function exportFileName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || 'export'}.json`;
}
