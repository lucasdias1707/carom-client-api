import type { Environment, Folder, RequestRecord, Workspace, WorkspaceState } from '@/types';

/**
 * A workspace kept in a file you choose, instead of only in this browser.
 *
 * The point is sharing: the PokeAPI project keeps its requests in its own
 * repository, everyone who checks it out points a workspace at that file, and
 * a request added by one of them arrives with the next pull. That only works
 * if the file is the record — so a linked workspace reads from it when it is
 * opened and writes back when it changes, rather than treating it as an
 * import that produces a copy.
 *
 * What travels is what describes the API: folders, requests and environments.
 * What does not is what belongs to the person: responses, unsaved drafts,
 * saved-version history and every setting. Those are local by nature, and a
 * file that carried a colleague's response bodies into your checkout would be
 * a surprise at best.
 *
 * Environments travel with the rest deliberately, for the reason they travel
 * in an export: a request pointing at `{{baseUrl}}/pokemon` is not much use
 * without the thing that says what `baseUrl` is. Secrets are the cost of that,
 * which is why it is written down in the dialog rather than left to be
 * discovered.
 */

export const WORKSPACE_FILE_FORMAT = 'carom-workspace';
export const WORKSPACE_FILE_VERSION = 1;

export type WorkspaceFile = {
  format: typeof WORKSPACE_FILE_FORMAT;
  version: number;
  /** The workspace's name when it was written, for a reader opening the file. */
  name: string;
  savedAt: string;
  folders: Folder[];
  requests: RequestRecord[];
  environments: Environment[];
};

/** True for anything carrying our marker, whatever version it claims. */
export function isWorkspaceFile(value: unknown): value is WorkspaceFile {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { format?: unknown }).format === WORKSPACE_FILE_FORMAT
  );
}

/** Everything of a workspace that belongs in its file. */
export function toWorkspaceFile(state: WorkspaceState, workspaceId: string): WorkspaceFile {
  const workspace = state.workspaces.find((item) => item.id === workspaceId);
  return {
    format: WORKSPACE_FILE_FORMAT,
    version: WORKSPACE_FILE_VERSION,
    name: workspace?.name ?? '',
    savedAt: new Date().toISOString(),
    folders: state.folders.filter((folder) => folder.workspaceId === workspaceId),
    requests: state.requests.filter((request) => request.workspaceId === workspaceId),
    environments: state.environments.filter((environment) => environment.workspaceId === workspaceId),
  };
}

export function serialiseWorkspaceFile(file: WorkspaceFile): string {
  // Indented and newline-terminated: this lands in someone's repository, and a
  // one-line file turns every change into one unreadable diff.
  return `${JSON.stringify(file, null, 2)}\n`;
}

/**
 * What a file's contents mean, with the failures named.
 *
 * The three cases are told apart because they need different answers: nothing
 * there yet is normal and means "write it", unreadable is worth reporting, and
 * the wrong kind of file is worth reporting differently — a Postman collection
 * pointed at here is a mistake with an obvious fix.
 */
export type ParsedWorkspaceFile =
  | { kind: 'empty' }
  | { kind: 'file'; file: WorkspaceFile }
  | { kind: 'invalid'; reason: 'unreadable' | 'not-a-workspace' };

export function parseWorkspaceFile(text: string | null): ParsedWorkspaceFile {
  if (text === null || text.trim() === '') return { kind: 'empty' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { kind: 'invalid', reason: 'unreadable' };
  }
  if (!isWorkspaceFile(parsed)) return { kind: 'invalid', reason: 'not-a-workspace' };

  // Absent arrays rather than a hard failure: a file written by hand, or by a
  // future version that stopped writing an empty list, still opens.
  return {
    kind: 'file',
    file: {
      ...parsed,
      folders: Array.isArray(parsed.folders) ? parsed.folders : [],
      requests: Array.isArray(parsed.requests) ? parsed.requests : [],
      environments: Array.isArray(parsed.environments) ? parsed.environments : [],
    },
  };
}

/**
 * Re-home a file's contents onto the workspace reading it.
 *
 * The ids inside the records are kept — `folderId` on a request points at a
 * folder in the same file, and rewriting one without the other would scatter
 * the tree. Only `workspaceId` changes, because the workspace a file is opened
 * in is a local thing: the same file opened on two machines is two workspaces,
 * and the file has no business naming either.
 */
export function adoptWorkspaceFile(
  file: WorkspaceFile,
  workspaceId: string,
): { folders: Folder[]; requests: RequestRecord[]; environments: Environment[] } {
  return {
    folders: file.folders.map((folder) => ({ ...folder, workspaceId })),
    requests: file.requests.map((request) => ({ ...request, workspaceId })),
    environments: file.environments.map((environment) => ({ ...environment, workspaceId })),
  };
}

/**
 * What in the file has actually changed, ignoring when it was written.
 *
 * Reading a file produces a state change, which would look to the writer like
 * something to save, which would rewrite `savedAt` and produce another change.
 * Comparing everything *except* `savedAt` is what stops the two chasing each
 * other, and it also keeps a file out of `git status` when nothing about the
 * requests moved.
 */
export function fingerprint(file: WorkspaceFile): string {
  const { savedAt: _savedAt, ...rest } = file;
  return JSON.stringify(rest);
}

/** Whether a workspace is backed by a file. */
export function linkedPath(workspace: Workspace | undefined): string | null {
  return workspace?.filePath ?? null;
}

/** The file's own name, for showing a path that would otherwise be too long. */
export function fileName(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? path;
}
