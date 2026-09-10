import type { Folder, HttpMethod, RequestRecord } from '@/types';

/**
 * The folder tree, and picking things out of it.
 *
 * These started in `lib/postman.ts`, for the dialog that asks which parts of a
 * collection to take. Nothing in them is about Postman: they work on any
 * `{ folders, requests }`, which is the shape of an import, of an export, and
 * of the workspace itself — so the export dialog now asks its question with
 * the same tree, the same ticking rules and the same tests.
 */

export type TreeSource = { folders: Folder[]; requests: RequestRecord[] };

export type TreeNode =
  | { kind: 'folder'; id: string; name: string; depth: number; children: TreeNode[] }
  | { kind: 'request'; id: string; name: string; method: HttpMethod; depth: number };

/** Build the tree, folders before requests at each level. */
export function buildTree(source: TreeSource): TreeNode[] {
  const build = (parentId: string | null, depth: number): TreeNode[] => [
    ...source.folders
      .filter((folder) => folder.parentId === parentId)
      .map<TreeNode>((folder) => ({
        kind: 'folder',
        id: folder.id,
        name: folder.name,
        depth,
        children: build(folder.id, depth + 1),
      })),
    ...source.requests
      .filter((request) => request.folderId === parentId)
      .map<TreeNode>((request) => ({
        kind: 'request',
        id: request.id,
        name: request.name,
        method: request.method,
        depth,
      })),
  ];
  return build(null, 0);
}

/** Every id at or below a node — what ticking a folder ticks. */
export function subtreeIds(node: TreeNode): string[] {
  if (node.kind === 'request') return [node.id];
  return [node.id, ...node.children.flatMap(subtreeIds)];
}

/** Every id in the tree, for "select all". */
export function allIds(nodes: TreeNode[]): string[] {
  return nodes.flatMap(subtreeIds);
}

/**
 * Keep only what was ticked.
 *
 * A folder that was not ticked itself still comes along when something under it
 * was: it is the path to that request, and dropping it would either orphan the
 * request or silently move it somewhere it never was. Nothing else is inferred
 * — unticking one request inside a ticked folder leaves the rest alone, which
 * is the whole point of a per-row checkbox.
 */
export function pruneTree(source: TreeSource, selected: ReadonlySet<string>): TreeSource {
  const requests = source.requests.filter((request) => selected.has(request.id));
  const byId = new Map(source.folders.map((folder) => [folder.id, folder]));

  const keep = new Set<string>();
  const keepWithAncestors = (folderId: string | null) => {
    let current = folderId;
    const seen = new Set<string>();
    while (current && !seen.has(current)) {
      seen.add(current);
      keep.add(current);
      current = byId.get(current)?.parentId ?? null;
    }
  };

  for (const folder of source.folders) {
    if (selected.has(folder.id)) keepWithAncestors(folder.id);
  }
  for (const request of requests) keepWithAncestors(request.folderId);

  return {
    folders: source.folders.filter((folder) => keep.has(folder.id)),
    requests,
  };
}
