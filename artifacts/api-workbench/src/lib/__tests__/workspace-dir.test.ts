import { describe, expect, it } from 'vitest';
import {
  diffFiles,
  ENVIRONMENTS_FILE,
  FOLDER_FILE,
  parseFiles,
  planFiles,
  slug,
  stableJson,
  WORKSPACE_FILE,
  type DirectoryFiles,
} from '@/lib/workspace-dir';
import { createSeedState } from '@/lib/seed';
import { translatorFor } from '@/locales';
import { createEnvironment, createFolder, createRequest, row } from '@/lib/factories';
import type { WorkspaceState } from '@/types';

function seed(): WorkspaceState {
  return createSeedState(translatorFor('en'));
}

/** Share everything, for the cases that are not about sharing. */
const shareAll = { shares: () => true };
const shareNone = { shares: () => false };

function plan(state: WorkspaceState, options = shareAll) {
  return planFiles(state, state.activeWorkspaceId, options);
}

describe('slug', () => {
  it('keeps a name readable, because someone reviews this in a pull request', () => {
    expect(slug('Get pokemon')).toBe('Get pokemon');
    expect(slug('Listar Pokémon')).toBe('Listar Pokémon');
  });

  it('replaces what a filesystem will not take', () => {
    expect(slug('GET /v1/users')).toBe('GET -v1-users');
    expect(slug('a:b*c?d"e<f>g|h')).toBe('a-b-c-d-e-f-g-h');
  });

  it('drops trailing dots and spaces, which Windows silently eats', () => {
    // Otherwise "Get." and "Get" become one file and one of them is lost.
    expect(slug('Get.')).toBe('Get');
    expect(slug('Get ')).toBe('Get');
  });

  it('sidesteps the names Windows reserves', () => {
    expect(slug('CON')).toBe('CON-');
    expect(slug('com1')).toBe('com1-');
    // Only when that is the whole name.
    expect(slug('console')).toBe('console');
  });

  it('always produces something', () => {
    expect(slug('')).toBe('untitled');
    expect(slug('   ')).toBe('untitled');
    expect(slug('///')).toBe('untitled');
  });

  it('caps a very long name', () => {
    expect(slug('x'.repeat(200)).length).toBeLessThanOrEqual(60);
  });
});

describe('stableJson', () => {
  it('writes keys in a fixed order whatever order they were built in', () => {
    // Insertion order differs between a record the reducer made and the same
    // record read back from a file. Without this, every pull shows a diff in
    // which nothing changed.
    expect(stableJson({ b: 1, a: 2 })).toBe(stableJson({ a: 2, b: 1 }));
  });

  it('sorts nested keys too', () => {
    expect(stableJson({ x: { b: 1, a: 2 } })).toBe(stableJson({ x: { a: 2, b: 1 } }));
  });

  it('leaves array order alone, which is meaning, not formatting', () => {
    expect(stableJson([1, 2])).not.toBe(stableJson([2, 1]));
  });

  it('ends with a newline, like every other file in a repository', () => {
    expect(stableJson({ a: 1 }).endsWith('\n')).toBe(true);
  });
});

describe('planFiles', () => {
  it('writes one file per request, in the folder tree it lives in', () => {
    const files = plan(seed());
    const paths = [...files.keys()];

    expect(paths).toContain(WORKSPACE_FILE);
    expect(paths).toContain(ENVIRONMENTS_FILE);
    // Every request is its own file, which is the whole point: two people
    // adding different requests then touch different files.
    const requestFiles = paths.filter(
      (path) => path.endsWith('.json') && !path.endsWith(FOLDER_FILE) && path !== WORKSPACE_FILE && path !== ENVIRONMENTS_FILE,
    );
    const state = seed();
    expect(requestFiles).toHaveLength(
      state.requests.filter((request) => request.workspaceId === state.activeWorkspaceId).length,
    );
  });

  it('gives each folder a directory and its own record', () => {
    const state = seed();
    const folder = state.folders.find((item) => item.workspaceId === state.activeWorkspaceId)!;
    const files = plan(state);
    expect([...files.keys()].some((path) => path === `${slug(folder.name)}/${FOLDER_FILE}`)).toBe(true);
  });

  it('leaves the ids that say where a record sits out of the record', () => {
    // The directory answers both, and writing them down would let a workspace
    // opened elsewhere disagree with its own tree.
    const state = seed();
    const files = plan(state);
    for (const [path, contents] of files) {
      if (path === WORKSPACE_FILE || path === ENVIRONMENTS_FILE) continue;
      const parsed = JSON.parse(contents);
      expect(parsed.workspaceId).toBeUndefined();
      expect(parsed.folderId ?? undefined).toBeUndefined();
      expect(parsed.parentId ?? undefined).toBeUndefined();
    }
  });

  it('keeps the id inside, so a rename is a rename and not a delete', () => {
    const state = seed();
    const request = state.requests.find((item) => item.workspaceId === state.activeWorkspaceId)!;
    const files = plan(state);
    const contents = [...files.values()].map((text) => JSON.parse(text));
    expect(contents.some((item) => item.id === request.id)).toBe(true);
  });

  it('produces byte-identical files from the same workspace twice', () => {
    // A write that changes nothing must produce no diff, or the file is noise
    // in every pull request that touches the repository.
    const state = seed();
    expect([...plan(state).entries()]).toEqual([...plan(state).entries()]);
  });

  it('names two requests sharing a name in an order every machine agrees on', () => {
    const state = seed();
    const workspaceId = state.activeWorkspaceId;
    const a = { ...createRequest({ workspaceId, name: 'Get' }), id: 'req_bbb' };
    const b = { ...createRequest({ workspaceId, name: 'Get' }), id: 'req_aaa' };

    const one = planFiles({ ...state, requests: [a, b] }, workspaceId, shareAll);
    // The same two requests, handed over in the other order.
    const two = planFiles({ ...state, requests: [b, a] }, workspaceId, shareAll);
    expect([...one.keys()].sort()).toEqual([...two.keys()].sort());
    expect([...one.keys()]).toContain('Get.json');
    expect([...one.keys()]).toContain('Get-2.json');
  });

  it('does not let a request take a name the format reserves', () => {
    const state = seed();
    const workspaceId = state.activeWorkspaceId;
    const clash = createRequest({ workspaceId, name: 'workspace' });
    const files = planFiles({ ...state, requests: [clash] }, workspaceId, shareAll);
    expect([...files.keys()]).toContain('workspace-2.json');
    // And the real one is still there, unharmed.
    expect(JSON.parse(files.get(WORKSPACE_FILE)!).format).toBe('carom-workspace');
  });

  describe('what the environments file carries', () => {
    function environmentsIn(state: WorkspaceState, options = shareAll) {
      return JSON.parse(plan(state, options).get(ENVIRONMENTS_FILE)!).environments;
    }

    it('always says which variables exist', () => {
      const state = seed();
      const names = environmentsIn(state, shareNone)[0].variables.map((v: { key: string }) => v.key);
      expect(names).toContain('baseUrl');
      expect(names).toContain('token');
    });

    it('carries a value only where it is shared', () => {
      const state = seed();
      const shared = environmentsIn(state, shareAll)[0].variables;
      expect(shared.every((v: { value?: string }) => v.value !== undefined)).toBe(true);

      const local = environmentsIn(state, shareNone)[0].variables;
      expect(local.every((v: { value?: string }) => v.value === undefined)).toBe(true);
      expect(local.every((v: { local?: boolean }) => v.local === true)).toBe(true);
    });

    it('never writes a value it was told to keep local', () => {
      // The one that matters. A token in a public repository is not a bug you
      // can take back.
      const state = seed();
      const text = plan(state, shareNone).get(ENVIRONMENTS_FILE)!;
      expect(text).not.toContain('replace-me');
      expect(text).not.toContain('httpbin');
    });

    it('sorts variables by name, so two machines write the same bytes', () => {
      const state = seed();
      const environment = state.environments[0];
      const scrambled = {
        ...state,
        environments: [{ ...environment, variables: [...environment.variables].reverse() }],
      };
      expect(plan(scrambled).get(ENVIRONMENTS_FILE)).toBe(plan(state).get(ENVIRONMENTS_FILE));
    });

    it('leaves out the blank row the table keeps at the end', () => {
      const state = seed();
      const environment = state.environments[0];
      const withBlank = {
        ...state,
        environments: [{ ...environment, variables: [...environment.variables, row('', '')] }],
      };
      expect(plan(withBlank).get(ENVIRONMENTS_FILE)).toBe(plan(state).get(ENVIRONMENTS_FILE));
    });
  });
});

describe('parseFiles', () => {
  it('reads back what it wrote', () => {
    const state = seed();
    const parsed = parseFiles(plan(state), 'local');
    expect(parsed.kind).toBe('workspace');
    if (parsed.kind !== 'workspace') return;

    const original = state.requests.filter((r) => r.workspaceId === state.activeWorkspaceId);
    expect(parsed.requests).toHaveLength(original.length);
    expect(new Set(parsed.requests.map((r) => r.id))).toEqual(new Set(original.map((r) => r.id)));
  });

  it('puts every request back in the folder it came from', () => {
    const state = seed();
    const parsed = parseFiles(plan(state), 'local');
    if (parsed.kind !== 'workspace') throw new Error('expected a workspace');

    const nameOf = new Map(parsed.folders.map((folder) => [folder.id, folder.name]));
    const originalNames = new Map(
      state.folders.map((folder) => [folder.id, folder.name] as const),
    );
    for (const request of parsed.requests) {
      const before = state.requests.find((item) => item.id === request.id)!;
      const wanted = before.folderId ? originalNames.get(before.folderId) : null;
      const got = request.folderId ? nameOf.get(request.folderId) : null;
      expect(got ?? null).toBe(wanted ?? null);
    }
  });

  it('re-homes everything onto the workspace reading it', () => {
    const parsed = parseFiles(plan(seed()), 'local');
    if (parsed.kind !== 'workspace') throw new Error('expected a workspace');
    expect(parsed.requests.every((r) => r.workspaceId === 'local')).toBe(true);
    expect(parsed.folders.every((f) => f.workspaceId === 'local')).toBe(true);
    expect(parsed.environments.every((e) => e.workspaceId === 'local')).toBe(true);
  });

  it('survives a round trip twice over, unchanged', () => {
    // What a pull actually does: read, adopt, write. If that is not a fixed
    // point then simply opening the app dirties the repository.
    const state = seed();
    const once = plan(state);
    const parsed = parseFiles(once, state.activeWorkspaceId);
    if (parsed.kind !== 'workspace') throw new Error('expected a workspace');

    const rebuilt: WorkspaceState = {
      ...state,
      folders: parsed.folders,
      requests: parsed.requests,
      environments: parsed.environments,
    };
    expect([...plan(rebuilt).entries()]).toEqual([...once.entries()]);
  });

  it('says nothing is there for an empty directory', () => {
    expect(parseFiles(new Map(), 'local')).toEqual({ kind: 'empty' });
  });

  it('refuses a directory that is somebody else’s', () => {
    // Writing here would delete files this app never wrote.
    const files: DirectoryFiles = new Map([['package.json', '{}']]);
    expect(parseFiles(files, 'local')).toEqual({ kind: 'not-ours' });
  });

  it('names the file it could not read', () => {
    const files = plan(seed());
    const broken = [...files.keys()].find((path) => path.endsWith('.json') && path !== WORKSPACE_FILE)!;
    files.set(broken, '{ not json');
    expect(parseFiles(files, 'local')).toEqual({ kind: 'unreadable', file: broken });
  });

  it('takes a folder somebody made with mkdir', () => {
    // A directory in a repository gets edited by hand. A folder with no
    // `_folder.json` is not a reason to refuse to open the workspace.
    const files: DirectoryFiles = new Map([
      [WORKSPACE_FILE, stableJson({ format: 'carom-workspace', version: 2, name: 'PokeAPI' })],
      ['Extra/Ping.json', stableJson({ id: 'req_ping', name: 'Ping', method: 'GET', url: 'https://x' })],
    ]);
    const parsed = parseFiles(files, 'local');
    if (parsed.kind !== 'workspace') throw new Error('expected a workspace');
    expect(parsed.folders.map((folder) => folder.name)).toEqual(['Extra']);
    expect(parsed.requests[0].folderId).toBe(parsed.folders[0].id);
  });

  it('gives a hand-made folder the same id on every machine', () => {
    const files: DirectoryFiles = new Map([
      [WORKSPACE_FILE, stableJson({ format: 'carom-workspace', version: 2, name: 'x' })],
      ['Extra/Ping.json', stableJson({ id: 'req_ping', name: 'Ping' })],
    ]);
    const one = parseFiles(files, 'local');
    const two = parseFiles(new Map([...files.entries()].reverse()), 'local');
    if (one.kind !== 'workspace' || two.kind !== 'workspace') throw new Error('expected workspaces');
    expect(one.folders[0].id).toBe(two.folders[0].id);
  });

  it('reports which variables the reader has to fill in themselves', () => {
    const parsed = parseFiles(plan(seed(), shareNone), 'local');
    if (parsed.kind !== 'workspace') throw new Error('expected a workspace');

    const environment = parsed.environments[0];
    expect(parsed.localNames.get(environment.id)).toContain('token');
    // And they arrive empty, which is what draws them red until they are set.
    expect(environment.variables.every((variable) => variable.value === '')).toBe(true);
  });

  it('gives a variable the same row id on every machine', () => {
    // A random id here would make every row look new after a pull.
    const files = plan(seed());
    const one = parseFiles(files, 'local');
    const two = parseFiles(files, 'local');
    if (one.kind !== 'workspace' || two.kind !== 'workspace') throw new Error('expected workspaces');
    expect(one.environments[0].variables.map((v) => v.id)).toEqual(
      two.environments[0].variables.map((v) => v.id),
    );
  });
});

describe('diffFiles', () => {
  it('writes only what actually differs', () => {
    const current: DirectoryFiles = new Map([['a.json', '1'], ['b.json', '2']]);
    const wanted: DirectoryFiles = new Map([['a.json', '1'], ['b.json', '3']]);
    const { write, remove } = diffFiles(current, wanted);
    expect([...write.keys()]).toEqual(['b.json']);
    expect(remove).toEqual([]);
  });

  it('removes a request that is gone', () => {
    const current: DirectoryFiles = new Map([['a.json', '1'], ['b.json', '2']]);
    const wanted: DirectoryFiles = new Map([['a.json', '1']]);
    expect(diffFiles(current, wanted).remove).toEqual(['b.json']);
  });

  it('leaves alone anything this format would not have written', () => {
    // A README or a .gitignore kept in that directory is none of our business,
    // and deleting one would be unforgivable.
    const current: DirectoryFiles = new Map([['README.md', 'hi'], ['.gitignore', 'x'], ['a.json', '1']]);
    const wanted: DirectoryFiles = new Map([['a.json', '1']]);
    expect(diffFiles(current, wanted).remove).toEqual([]);
  });

  it('has nothing to do when the directory is already right', () => {
    const files = plan(seed());
    const { write, remove } = diffFiles(files, new Map(files));
    expect(write.size).toBe(0);
    expect(remove).toEqual([]);
  });
});

describe('the conflicts this is all for', () => {
  /*
    One starting point, cloned — which is what a pull gives two people. Seeding
    twice would hand them different ids for the same records and test nothing.
  */
  const start = seed();

  function afterAdding(name: string, id: string) {
    const request = { ...createRequest({ workspaceId: start.activeWorkspaceId, name }), id };
    return plan({ ...start, requests: [...start.requests, request] });
  }

  it('puts two people’s new requests in different files', () => {
    // The whole reason this is a directory. In one file these were adjacent
    // lines in the same array, and git called it a conflict every time.
    const mine = afterAdding('Catch pokemon', 'req_mine');
    const theirs = afterAdding('List berries', 'req_theirs');

    const base = new Set(plan(start).keys());
    const addedByMe = [...mine.keys()].filter((path) => !base.has(path));
    const addedByThem = [...theirs.keys()].filter((path) => !base.has(path));

    expect(addedByMe).toEqual(['Catch pokemon.json']);
    expect(addedByThem).toEqual(['List berries.json']);
    expect(addedByMe).not.toEqual(addedByThem);
  });

  it('leaves every file either of them did not touch byte-identical', () => {
    const mine = afterAdding('Catch pokemon', 'req_mine');
    const theirs = afterAdding('List berries', 'req_theirs');
    for (const [path, contents] of mine) {
      if (path === 'Catch pokemon.json') continue;
      expect(theirs.get(path)).toBe(contents);
    }
  });

  it('does not write a file when one person changes only their own value', () => {
    // The other half. Changing `baseUrl` to your own localhost port is not a
    // change to the project, and must not show up as one.
    const state = seed();
    const environment = state.environments[0];
    const shared = { shares: (_e: unknown, v: { key: string }) => v.key.trim() !== 'baseUrl' };

    const before = planFiles(state, state.activeWorkspaceId, shared as never);
    const mine = {
      ...state,
      environments: [
        {
          ...environment,
          variables: environment.variables.map((variable) =>
            variable.key.trim() === 'baseUrl' ? { ...variable, value: 'http://localhost:8080' } : variable,
          ),
        },
      ],
    };
    const after = planFiles(mine, state.activeWorkspaceId, shared as never);
    expect([...after.entries()]).toEqual([...before.entries()]);
  });
});

describe('a workspace with everything in it', () => {
  /** Nested folders, a request at the root, and two environments. */
  function rich(): WorkspaceState {
    const state = seed();
    const workspaceId = state.activeWorkspaceId;
    const outer = { ...createFolder(workspaceId, 'Pokemon', null, 0), id: 'fld_outer' };
    const inner = { ...createFolder(workspaceId, 'Berries', outer.id, 0), id: 'fld_inner' };
    return {
      ...state,
      folders: [outer, inner],
      requests: [
        { ...createRequest({ workspaceId, name: 'Root request' }), id: 'req_root' },
        { ...createRequest({ workspaceId, folderId: outer.id, name: 'Get pokemon' }), id: 'req_get' },
        { ...createRequest({ workspaceId, folderId: inner.id, name: 'Get berry' }), id: 'req_berry' },
      ],
      environments: [
        { ...createEnvironment(workspaceId, 'Base', true, [row('baseUrl', 'https://pokeapi.co')]), id: 'env_base' },
        { ...createEnvironment(workspaceId, 'Production', false, [row('token', 'abc')]), id: 'env_prod' },
      ],
    };
  }

  it('nests the directories the way the sidebar nests the folders', () => {
    const files = plan(rich());
    expect([...files.keys()].sort()).toEqual(
      [
        ENVIRONMENTS_FILE,
        WORKSPACE_FILE,
        'Pokemon/Berries/Get berry.json',
        'Pokemon/Berries/_folder.json',
        'Pokemon/Get pokemon.json',
        'Pokemon/_folder.json',
        'Root request.json',
      ].sort(),
    );
  });

  it('survives the round trip with its tree intact', () => {
    const state = rich();
    const parsed = parseFiles(plan(state), 'local');
    if (parsed.kind !== 'workspace') throw new Error('expected a workspace');

    const byName = new Map(parsed.folders.map((folder) => [folder.name, folder]));
    expect(byName.get('Berries')?.parentId).toBe(byName.get('Pokemon')?.id);
    expect(parsed.requests.find((r) => r.id === 'req_root')?.folderId).toBeNull();
    expect(parsed.requests.find((r) => r.id === 'req_berry')?.folderId).toBe(byName.get('Berries')?.id);
  });
});
