import { describe, expect, it } from 'vitest';
import {
  adoptWorkspaceFile,
  fileName,
  fingerprint,
  parseWorkspaceFile,
  serialiseWorkspaceFile,
  toWorkspaceFile,
  WORKSPACE_FILE_FORMAT,
  type WorkspaceFile,
} from '@/lib/workspace-file';
import { createSeedState } from '@/lib/seed';
import { translatorFor } from '@/locales';
import type { WorkspaceState } from '@/types';

function seeded(): WorkspaceState {
  return createSeedState(translatorFor('en'));
}

/** The seeded workspace, written out. One state, so the id matches its rows. */
function seededFile() {
  const state = seeded();
  return toWorkspaceFile(state, state.activeWorkspaceId);
}

describe('toWorkspaceFile', () => {
  it('carries the folders, requests and environments of that workspace', () => {
    const state = seeded();
    const file = toWorkspaceFile(state, state.activeWorkspaceId);

    expect(file.format).toBe(WORKSPACE_FILE_FORMAT);
    expect(file.requests.length).toBeGreaterThan(0);
    expect(file.requests.every((request) => request.workspaceId === state.activeWorkspaceId)).toBe(true);
    expect(file.environments.length).toBeGreaterThan(0);
  });

  it('leaves out what belongs to the person rather than to the API', () => {
    // Responses, drafts, saved versions and settings are local. A file that
    // carried a colleague's response bodies into your checkout is a surprise.
    const file = seededFile() as unknown as Record<string, unknown>;
    expect(file.responses).toBeUndefined();
    expect(file.drafts).toBeUndefined();
    expect(file.versions).toBeUndefined();
    expect(file.settings).toBeUndefined();
  });

  it('takes nothing from another workspace', () => {
    const state = seeded();
    const other = { ...state.workspaces[0], id: 'other' };
    const mixed: WorkspaceState = {
      ...state,
      workspaces: [...state.workspaces, other],
      requests: [...state.requests, { ...state.requests[0], id: 'r-other', workspaceId: 'other' }],
    };
    const file = toWorkspaceFile(mixed, state.activeWorkspaceId);
    expect(file.requests.some((request) => request.id === 'r-other')).toBe(false);
  });
});

describe('serialiseWorkspaceFile', () => {
  it('writes something a diff can read', () => {
    // This file lands in a repository. One long line makes every change one
    // unreadable diff.
    const text = serialiseWorkspaceFile(seededFile());
    expect(text.split('\n').length).toBeGreaterThan(10);
    expect(text.endsWith('\n')).toBe(true);
  });

  it('round-trips through the parser', () => {
    const state = seeded();
    const file = toWorkspaceFile(state, state.activeWorkspaceId);
    const parsed = parseWorkspaceFile(serialiseWorkspaceFile(file));
    expect(parsed.kind).toBe('file');
    if (parsed.kind !== 'file') return;
    expect(parsed.file.requests).toEqual(file.requests);
  });
});

describe('parseWorkspaceFile', () => {
  it('reads a link pointing at nothing yet as empty, not as a failure', () => {
    // This is how a workspace is written out the first time.
    expect(parseWorkspaceFile(null)).toEqual({ kind: 'empty' });
    expect(parseWorkspaceFile('')).toEqual({ kind: 'empty' });
    expect(parseWorkspaceFile('   \n ')).toEqual({ kind: 'empty' });
  });

  it('reports a file that is not JSON', () => {
    expect(parseWorkspaceFile('not json {')).toEqual({ kind: 'invalid', reason: 'unreadable' });
  });

  it('reports a JSON file that is not one of ours', () => {
    // A Postman collection pointed at here is a mistake with an obvious fix,
    // and it deserves a different sentence from a corrupt file.
    expect(parseWorkspaceFile('{"info":{"name":"Pokemon"}}')).toEqual({
      kind: 'invalid',
      reason: 'not-a-workspace',
    });
    expect(parseWorkspaceFile('[]')).toEqual({ kind: 'invalid', reason: 'not-a-workspace' });
  });

  it('fills in lists a hand-written file left out', () => {
    const parsed = parseWorkspaceFile(
      JSON.stringify({ format: WORKSPACE_FILE_FORMAT, version: 1, name: 'x', savedAt: '' }),
    );
    expect(parsed.kind).toBe('file');
    if (parsed.kind !== 'file') return;
    expect(parsed.file.folders).toEqual([]);
    expect(parsed.file.requests).toEqual([]);
    expect(parsed.file.environments).toEqual([]);
  });

  it('takes a version it does not know, rather than refusing to open', () => {
    const parsed = parseWorkspaceFile(
      JSON.stringify({ format: WORKSPACE_FILE_FORMAT, version: 99, name: 'x', savedAt: '', requests: [] }),
    );
    expect(parsed.kind).toBe('file');
  });
});

describe('adoptWorkspaceFile', () => {
  it('re-homes everything onto the workspace reading it', () => {
    const state = seeded();
    const file = toWorkspaceFile(state, state.activeWorkspaceId);
    const adopted = adoptWorkspaceFile(file, 'local-workspace');

    expect(adopted.requests.every((request) => request.workspaceId === 'local-workspace')).toBe(true);
    expect(adopted.folders.every((folder) => folder.workspaceId === 'local-workspace')).toBe(true);
    expect(adopted.environments.every((item) => item.workspaceId === 'local-workspace')).toBe(true);
  });

  it('keeps the ids inside, which point at each other', () => {
    // Rewriting a request's id without its folder's would scatter the tree.
    const state = seeded();
    const file = toWorkspaceFile(state, state.activeWorkspaceId);
    const adopted = adoptWorkspaceFile(file, 'local-workspace');

    expect(adopted.requests.map((request) => request.id)).toEqual(file.requests.map((r) => r.id));
    expect(adopted.requests.map((request) => request.folderId)).toEqual(
      file.requests.map((r) => r.folderId),
    );
    const folderIds = new Set(adopted.folders.map((folder) => folder.id));
    for (const request of adopted.requests) {
      if (request.folderId !== null) expect(folderIds.has(request.folderId)).toBe(true);
    }
  });
});

describe('fingerprint', () => {
  const base = (): WorkspaceFile => seededFile();

  it('ignores when the file was written', () => {
    // Otherwise reading a file looks like a change worth saving, which rewrites
    // it, which looks like another change — and the file never settles.
    const one = base();
    const two = { ...one, savedAt: new Date(Date.now() + 60_000).toISOString() };
    expect(fingerprint(one)).toBe(fingerprint(two));
  });

  it('notices a request that moved', () => {
    const one = base();
    const two = {
      ...one,
      requests: [{ ...one.requests[0], url: 'https://changed.example.com' }, ...one.requests.slice(1)],
    };
    expect(fingerprint(one)).not.toBe(fingerprint(two));
  });

  it('notices a variable that moved', () => {
    const one = base();
    const first = one.environments[0];
    const two = {
      ...one,
      environments: [{ ...first, variables: [...first.variables, { id: 'x', key: 'k', value: 'v', enabled: true }] }, ...one.environments.slice(1)],
    };
    expect(fingerprint(one)).not.toBe(fingerprint(two));
  });

  it('notices the workspace being renamed', () => {
    const one = base();
    expect(fingerprint(one)).not.toBe(fingerprint({ ...one, name: 'Renamed' }));
  });
});

describe('fileName', () => {
  it('takes the last segment of a path', () => {
    expect(fileName('/Users/me/projects/pokeapi/carom.json')).toBe('carom.json');
    expect(fileName('C:\\projects\\pokeapi\\carom.json')).toBe('carom.json');
  });

  it('survives a path with a trailing separator or no separator at all', () => {
    expect(fileName('carom.json')).toBe('carom.json');
    expect(fileName('/a/b/')).toBe('b');
  });
});
