import type { Environment, Folder, KeyValue, RequestRecord, WorkspaceState } from '@/types';

/**
 * A shared workspace, as a directory of small files.
 *
 * The first version of this was one JSON file, and one file is the wrong shape
 * for something several people edit through git. Two people adding a request
 * each both append to the same array, on adjacent lines, and git has no way to
 * know those are independent — so it is a conflict, every time, for a change
 * that had no disagreement in it at all.
 *
 * A file per request has no such problem: two people adding different requests
 * touch different files and git merges them without being asked. Two people
 * editing *the same* request still conflict, which is correct — that is a real
 * disagreement, and it becomes the only kind you see.
 *
 * The tree on disk mirrors the tree in the sidebar, so a pull request reads as
 * "added Pokemon/List pokemon.json" rather than as a diff somewhere in the
 * middle of a four-thousand-line file.
 *
 *     pokeapi/
 *       workspace.json            the name, and the marker saying this is ours
 *       environments.json         which variables exist, and the shared values
 *       Pokemon/
 *         _folder.json            the folder's own auth, scripts and variables
 *         Get pokemon.json
 *         List pokemon.json
 *
 * The second cause of conflict is values. `baseUrl` is `localhost:3000` for me
 * and `localhost:8080` for you, and the token is mine alone: those are not
 * disagreements to resolve, they are personal settings that never belonged in
 * a shared file. So a variable says whether its *value* travels, and the ones
 * that do not keep their value on the machine it was typed on. What is always
 * shared is that the variable exists, which is the half everyone does need.
 */

export const WORKSPACE_DIR_FORMAT = 'carom-workspace';
export const WORKSPACE_DIR_VERSION = 2;

export const WORKSPACE_FILE = 'workspace.json';
export const ENVIRONMENTS_FILE = 'environments.json';
/** A folder's own record, inside the directory that represents it. */
export const FOLDER_FILE = '_folder.json';

/** Relative path within the directory, to that file's contents. */
export type DirectoryFiles = Map<string, string>;

/* -------------------------------- names -------------------------------- */

/** Characters no filesystem in common use will take, plus the separators. */
const UNSAFE = /[/\\:*?"<>|]/g;
/** Windows keeps these reserved whatever the extension. */
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
const MAX_SEGMENT = 60;

/**
 * A name turned into something every filesystem will accept.
 *
 * Readable rather than escaped: this goes into a repository where someone
 * reviews it, and `Get pokemon.json` says what a percent-encoded id cannot.
 * Accents stay — they are legal in a filename, and stripping them would mangle
 * the names of everyone who does not work in English.
 */
export function slug(name: string): string {
  let text = name.replace(UNSAFE, '-').replace(/\s+/g, ' ').trim();
  // Windows drops trailing dots and spaces silently, which would turn two
  // distinct names into one file.
  text = text.replace(/[. ]+$/, '');
  if (text.length > MAX_SEGMENT) text = text.slice(0, MAX_SEGMENT).trim();
  // Nothing but the characters that were replaced: `///` came out as `---`,
  // which is a legal file name and tells a reviewer nothing at all.
  if (!/[\p{L}\p{N}]/u.test(text)) return 'untitled';
  return RESERVED.test(text) ? `${text}-` : text;
}

/**
 * Make every name within one directory distinct.
 *
 * The caller feeds these in id order, not in whatever order state happens to
 * hold: two people with the same two requests have to produce the same two
 * file names, or the suffixes swap between machines and every pull is a pile
 * of renames.
 */
function nameWithin(taken: Set<string>, base: string): string {
  const lower = base.toLowerCase();
  if (!taken.has(lower)) {
    taken.add(lower);
    return base;
  }
  for (let n = 2; ; n += 1) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate.toLowerCase())) {
      taken.add(candidate.toLowerCase());
      return candidate;
    }
  }
}

/* --------------------------- deterministic JSON ------------------------ */

/**
 * JSON with its keys in a fixed order.
 *
 * `JSON.stringify` follows insertion order, which differs between a record the
 * reducer built and the same record read back from a file. That alone would
 * put a diff in every pull in which nothing had changed — and a diff that is
 * always there is a diff nobody reads.
 */
export function stableJson(value: unknown): string {
  return `${JSON.stringify(sortKeys(value), null, 2)}\n`;
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

/* -------------------------------- writing ------------------------------ */

/**
 * What belongs in a request's file.
 *
 * `workspaceId` and `folderId` are left out: both are answered by where the
 * file sits, and writing them down would mean a workspace opened somewhere
 * else disagreed with its own directory. `id` stays, because that is what
 * makes a renamed request the same request rather than a delete and an add.
 */
function requestFile(request: RequestRecord): unknown {
  const { workspaceId: _workspaceId, folderId: _folderId, ...rest } = request;
  return rest;
}

function folderFile(folder: Folder): unknown {
  const { workspaceId: _workspaceId, parentId: _parentId, ...rest } = folder;
  return rest;
}

/** One variable as the file records it: always the name, sometimes the value. */
export type SharedVariable = {
  key: string;
  enabled: boolean;
  value?: string;
  /** True when the value belongs to whoever is reading, not to the project. */
  local?: true;
};

export type PlanOptions = {
  /** Decides, per variable, whether its value travels with the project. */
  shares: (environment: Environment, variable: KeyValue) => boolean;
};

/**
 * Every file the directory should hold for this workspace.
 *
 * A plan rather than a write, so what lands on disk is something that can be
 * compared, tested and diffed without a filesystem anywhere near it.
 */
export function planFiles(
  state: WorkspaceState,
  workspaceId: string,
  options: PlanOptions,
): DirectoryFiles {
  const files: DirectoryFiles = new Map();
  const workspace = state.workspaces.find((item) => item.id === workspaceId);
  const folders = state.folders.filter((folder) => folder.workspaceId === workspaceId);
  const requests = state.requests.filter((request) => request.workspaceId === workspaceId);
  const environments = state.environments.filter((item) => item.workspaceId === workspaceId);

  files.set(
    WORKSPACE_FILE,
    stableJson({
      format: WORKSPACE_DIR_FORMAT,
      version: WORKSPACE_DIR_VERSION,
      name: workspace?.name ?? '',
    }),
  );

  files.set(
    ENVIRONMENTS_FILE,
    stableJson({
      environments: [...environments]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((environment) => ({
          id: environment.id,
          name: environment.name,
          isBase: environment.isBase,
          color: environment.color,
          variables: [...environment.variables]
            .filter((variable) => variable.key.trim())
            .sort((a, b) => a.key.trim().localeCompare(b.key.trim()))
            .map((variable): SharedVariable => ({
              key: variable.key.trim(),
              enabled: variable.enabled,
              /*
                The half everyone needs is that the variable exists. Whether
                the *value* belongs to the project or to the person reading is
                the caller's decision — a public base URL is worth sharing, a
                token is not, and neither can be worked out from here.
              */
              ...(options.shares(environment, variable)
                ? { value: variable.value }
                : { local: true as const }),
            })),
        })),
    }),
  );

  /** Where each folder's directory sits, once names have been made distinct. */
  const directoryOf = new Map<string, string>();
  const childrenOf = (parentId: string | null) =>
    folders
      .filter((folder) => (folder.parentId ?? null) === parentId)
      .sort((a, b) => a.id.localeCompare(b.id));

  const walk = (parentId: string | null, prefix: string) => {
    const taken = new Set<string>();
    for (const folder of childrenOf(parentId)) {
      const name = nameWithin(taken, slug(folder.name));
      const directory = prefix ? `${prefix}/${name}` : name;
      directoryOf.set(folder.id, directory);
      files.set(`${directory}/${FOLDER_FILE}`, stableJson(folderFile(folder)));
      walk(folder.id, directory);
    }
  };
  walk(null, '');

  // Requests, grouped by where they land, named distinctly within that.
  const byDirectory = new Map<string, RequestRecord[]>();
  for (const request of requests) {
    const directory = request.folderId ? directoryOf.get(request.folderId) ?? '' : '';
    const group = byDirectory.get(directory);
    if (group) group.push(request);
    else byDirectory.set(directory, [request]);
  }

  for (const [directory, group] of byDirectory) {
    // Taken already by the files this format reserves at that level.
    const taken = new Set<string>(['_folder']);
    if (directory === '') {
      taken.add('workspace');
      taken.add('environments');
    }
    for (const request of [...group].sort((a, b) => a.id.localeCompare(b.id))) {
      const name = nameWithin(taken, slug(request.name));
      files.set(directory ? `${directory}/${name}.json` : `${name}.json`, stableJson(requestFile(request)));
    }
  }

  return files;
}

/* -------------------------------- reading ------------------------------ */

export type ParsedDirectory =
  | { kind: 'empty' }
  | { kind: 'not-ours' }
  | { kind: 'unreadable'; file: string }
  | {
      kind: 'workspace';
      name: string;
      folders: Folder[];
      requests: RequestRecord[];
      environments: Environment[];
      /** Variables whose value is the reader's own, by environment id. */
      localNames: Map<string, string[]>;
    };

/**
 * A folder id derived from where it sits, for a directory made by hand.
 *
 * Deterministic, so two people who both pulled a directory somebody created
 * with `mkdir` end up agreeing about which folder is which. Not random, and
 * not a hash anyone has to trust — just the path, which is the only thing
 * about that folder either of them knows.
 */
export function derivedFolderId(directory: string): string {
  return `fld_path_${directory.replace(/[^A-Za-z0-9]+/g, '_')}`;
}

/**
 * Read a directory of files back into a workspace.
 *
 * Tolerant on purpose. This is a directory in somebody's repository: it will
 * be edited by hand, half-merged, and occasionally left with a folder that has
 * no `_folder.json` because someone made it with `mkdir`. None of that should
 * mean "cannot open".
 */
export function parseFiles(files: DirectoryFiles, workspaceId: string): ParsedDirectory {
  if (files.size === 0) return { kind: 'empty' };

  const root = files.get(WORKSPACE_FILE);
  if (root === undefined) {
    // A directory with json in it that is not ours. Refusing is the only safe
    // answer: writing here would delete files this app never wrote.
    return { kind: 'not-ours' };
  }

  let header: { name?: unknown; format?: unknown };
  try {
    header = JSON.parse(root) as { name?: unknown; format?: unknown };
  } catch {
    return { kind: 'unreadable', file: WORKSPACE_FILE };
  }
  if (header.format !== WORKSPACE_DIR_FORMAT) return { kind: 'not-ours' };

  const folders: Folder[] = [];
  const requests: RequestRecord[] = [];
  const environments: Environment[] = [];
  const localNames = new Map<string, string[]>();

  /** Folder id per directory path, so requests can be hung off it. */
  const idOf = new Map<string, string>();

  // Folders first, outermost first, so a nested one can find its parent.
  const folderPaths = [...files.keys()]
    .filter((path) => path.endsWith(`/${FOLDER_FILE}`) || path === FOLDER_FILE)
    .sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b));

  // Every directory that holds anything, so one made by hand still appears.
  const directories = new Set<string>();
  for (const path of files.keys()) {
    const parts = path.split('/');
    for (let depth = 1; depth < parts.length; depth += 1) {
      directories.add(parts.slice(0, depth).join('/'));
    }
  }

  const ordered = [...directories].sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b));
  for (const directory of ordered) {
    const parts = directory.split('/');
    const parentPath = parts.slice(0, -1).join('/');
    const parentId = parentPath ? idOf.get(parentPath) ?? null : null;
    const own = files.get(`${directory}/${FOLDER_FILE}`);

    let record: Partial<Folder> = {};
    if (own !== undefined) {
      try {
        record = JSON.parse(own) as Partial<Folder>;
      } catch {
        return { kind: 'unreadable', file: `${directory}/${FOLDER_FILE}` };
      }
    }

    const id = typeof record.id === 'string' && record.id ? record.id : derivedFolderId(directory);
    idOf.set(directory, id);
    folders.push({
      id,
      workspaceId,
      parentId,
      name: typeof record.name === 'string' && record.name ? record.name : parts[parts.length - 1],
      color: record.color ?? '#6d8fff',
      sortIndex: record.sortIndex ?? 0,
      variables: record.variables ?? [],
      auth: record.auth ?? { type: 'inherit', token: '', username: '', password: '', apiKeyName: '', apiKeyValue: '', apiKeyIn: 'header' },
      preScript: record.preScript ?? '',
      postScript: record.postScript ?? '',
    });
  }
  void folderPaths;

  for (const [path, contents] of files) {
    if (!path.endsWith('.json')) continue;
    if (path === WORKSPACE_FILE || path === ENVIRONMENTS_FILE) continue;
    if (path === FOLDER_FILE || path.endsWith(`/${FOLDER_FILE}`)) continue;

    let record: Partial<RequestRecord>;
    try {
      record = JSON.parse(contents) as Partial<RequestRecord>;
    } catch {
      return { kind: 'unreadable', file: path };
    }
    if (!record || typeof record !== 'object' || typeof record.id !== 'string') {
      return { kind: 'unreadable', file: path };
    }

    const parts = path.split('/');
    const directory = parts.slice(0, -1).join('/');
    requests.push({
      ...(record as RequestRecord),
      workspaceId,
      folderId: directory ? idOf.get(directory) ?? null : null,
    });
  }

  const environmentsRaw = files.get(ENVIRONMENTS_FILE);
  if (environmentsRaw !== undefined) {
    let parsed: { environments?: unknown };
    try {
      parsed = JSON.parse(environmentsRaw) as { environments?: unknown };
    } catch {
      return { kind: 'unreadable', file: ENVIRONMENTS_FILE };
    }
    const list = Array.isArray(parsed.environments) ? parsed.environments : [];
    for (const entry of list as Array<Record<string, unknown>>) {
      const id = typeof entry.id === 'string' ? entry.id : '';
      if (!id) continue;
      const rawVariables = Array.isArray(entry.variables) ? (entry.variables as SharedVariable[]) : [];
      const local: string[] = [];
      const variables: KeyValue[] = rawVariables
        .filter((variable) => typeof variable?.key === 'string' && variable.key.trim())
        .map((variable, index) => {
          if (variable.local) local.push(variable.key.trim());
          return {
            // Derived from the environment and the name so it is the same on
            // every machine — a random id here would make every row look new
            // after a pull.
            id: `var_${id}_${index}_${variable.key.trim().replace(/[^A-Za-z0-9]+/g, '_')}`,
            key: variable.key.trim(),
            value: variable.local ? '' : variable.value ?? '',
            enabled: variable.enabled !== false,
          };
        });
      if (local.length) localNames.set(id, local);
      environments.push({
        id,
        workspaceId,
        name: typeof entry.name === 'string' ? entry.name : '',
        isBase: entry.isBase === true,
        color: typeof entry.color === 'string' ? entry.color : '#6d8fff',
        variables,
      });
    }
  }

  return {
    kind: 'workspace',
    name: typeof header.name === 'string' ? header.name : '',
    folders,
    requests,
    environments,
    localNames,
  };
}

/**
 * What changed between what is on disk and what should be.
 *
 * Only what actually differs is written, and only files this format would have
 * produced are removed — a README or a `.gitignore` someone keeps in there is
 * none of our business.
 */
export function diffFiles(
  current: DirectoryFiles,
  wanted: DirectoryFiles,
): { write: DirectoryFiles; remove: string[] } {
  const write: DirectoryFiles = new Map();
  for (const [path, contents] of wanted) {
    if (current.get(path) !== contents) write.set(path, contents);
  }
  const remove = [...current.keys()].filter((path) => path.endsWith('.json') && !wanted.has(path));
  return { write, remove };
}
