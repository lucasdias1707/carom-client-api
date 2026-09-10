import { isSubtreeExport, type SubtreeExport } from '@/lib/export';
import { createId } from '@/lib/id';
import type { ParsedImport } from '@/lib/postman';
import type { Environment, Folder, RequestRecord } from '@/types';

/**
 * Read a file this app wrote.
 *
 * Exporting a folder has existed since early on; reading one back has not, so
 * a slice could be sent to someone who then had no way to open it. This is
 * that way in, and it goes through the same dialog as every other format:
 * a tree of what is in the file, and a workspace to put it in.
 *
 * Every id is issued fresh. The file was written from a workspace whose ids
 * are still in use — importing it next to its own origin, which is exactly
 * what someone does when they mean to duplicate a folder, would otherwise
 * collide with the records it was copied from.
 */

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function importSubtree(payload: unknown, workspaceId: string, startIndex = 0): ParsedImport {
  if (!isSubtreeExport(payload)) throw new Error('That is not a Carom export.');
  const file = payload as SubtreeExport;

  const folderIds = new Map<string, string>();
  for (const folder of asArray<Folder>(file.folders)) folderIds.set(folder.id, createId('fld'));

  const folders = asArray<Folder>(file.folders).map((folder, index) => ({
    ...folder,
    id: folderIds.get(folder.id) as string,
    workspaceId,
    // A parent outside the file is a folder that was not exported, so what was
    // under it lands at the top rather than pointing at nothing.
    parentId: folder.parentId ? (folderIds.get(folder.parentId) ?? null) : null,
    sortIndex: startIndex + index,
  }));

  const requests = asArray<RequestRecord>(file.requests).map((request, index) => ({
    ...request,
    id: createId('req'),
    workspaceId,
    folderId: request.folderId ? (folderIds.get(request.folderId) ?? null) : null,
    sortIndex: startIndex + index,
  }));

  /*
    The base of the workspace that was exported is not this workspace's base —
    there is exactly one of those and it already exists — so its variables go
    in as the import's base variables, which the reducer merges without
    overwriting a name that is already defined here.
  */
  const exported = asArray<Environment>(file.environments);
  const base = exported.find((environment) => environment.isBase);
  const environments = exported
    .filter((environment) => !environment.isBase)
    .map((environment) => ({ ...environment, id: createId('env'), workspaceId }));

  return {
    name: file.name || 'Carom export',
    folders,
    requests,
    // `environment` means "this file *is* an environment", which a slice never
    // is: a slice can carry several, and they ride in `environments`.
    environment: null,
    environments,
    variables: base?.variables ?? [],
  };
}

export function looksLikeSubtree(payload: unknown): boolean {
  return isSubtreeExport(payload);
}
