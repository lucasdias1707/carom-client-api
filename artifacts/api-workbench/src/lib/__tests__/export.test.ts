import { describe, expect, it } from 'vitest';
import { createEnvironment, createFolder, createRequest, createWorkspace, row } from '@/lib/factories';
import {
  exportFileName,
  exportFolder,
  exportRequest,
  exportSelection,
  isSubtreeExport,
  subtreeFolderIds,
  subtreeSelection,
} from '@/lib/export';
import { importSubtree } from '@/lib/carom';
import { detectFormat, readImport } from '@/lib/import-formats';
import { defaultSettings } from '@/lib/settings';
import type { Folder, RequestRecord, WorkspaceState } from '@/types';

function stateWith(folders: Folder[], requests: RequestRecord[], workspaceId: string): WorkspaceState {
  return {
    version: 2,
    workspaces: [{ id: workspaceId, name: 'W', createdAt: new Date().toISOString() }],
    activeWorkspaceId: workspaceId,
    folders,
    requests,
    environments: [],
    activeEnvironmentId: null,
    responses: [],
    activeRequestId: null,
    settings: defaultSettings(),
  } as WorkspaceState;
}

/** api / v2 / pokemon, plus an unrelated sibling that must never come along. */
function fixture() {
  const workspace = createWorkspace('W');
  const api = createFolder(workspace.id, 'API', null, 0);
  const v2 = createFolder(workspace.id, 'v2', api.id, 0);
  const pokemon = createFolder(workspace.id, 'pokemon', v2.id, 0);
  const other = createFolder(workspace.id, 'Other', null, 1);

  const make = (name: string, folderId: string | null) =>
    createRequest({ workspaceId: workspace.id, folderId, name });
  const atApi = make('at api', api.id);
  const atV2 = make('at v2', v2.id);
  const deep = make('deep', pokemon.id);
  const outside = make('outside', other.id);
  const atRoot = make('at root', null);

  return {
    workspace,
    api,
    v2,
    pokemon,
    other,
    requests: { atApi, atV2, deep, outside, atRoot },
    state: stateWith([api, v2, pokemon, other], [atApi, atV2, deep, outside, atRoot], workspace.id),
  };
}

describe('subtreeSelection', () => {
  it('ticks the requests too, or the export comes out an empty shell', () => {
    const { state, api, v2, pokemon, requests } = fixture();
    expect(subtreeSelection(state, api.id).sort()).toEqual(
      [api.id, v2.id, pokemon.id, requests.atApi.id, requests.atV2.id, requests.deep.id].sort(),
    );
  });

  it('is exactly what exportFolder would have written', () => {
    const { state, api } = fixture();
    const viaDialog = exportSelection(state, { name: 'API', selected: new Set(subtreeSelection(state, api.id)) });
    const direct = exportFolder(state, api.id);
    expect(viaDialog.requests.map((request) => request.name).sort()).toEqual(
      direct?.requests.map((request) => request.name).sort(),
    );
  });

  it('leaves out the folders next door', () => {
    const { state, v2, requests } = fixture();
    const picked = subtreeSelection(state, v2.id);
    expect(picked).not.toContain(requests.atApi.id);
    expect(picked).not.toContain(requests.outside.id);
  });
});

describe('subtreeFolderIds', () => {
  it('collects the folder and every folder beneath it', () => {
    const { state, api, v2, pokemon } = fixture();
    expect(subtreeFolderIds(state, api.id).sort()).toEqual([api.id, v2.id, pokemon.id].sort());
  });

  it('starts where it is asked to, not at the root', () => {
    const { state, v2, pokemon } = fixture();
    expect(subtreeFolderIds(state, v2.id).sort()).toEqual([v2.id, pokemon.id].sort());
  });

  it('terminates when the parent chain loops back on itself', () => {
    const { state, api, v2 } = fixture();
    const looped = {
      ...state,
      folders: state.folders.map((folder) => (folder.id === api.id ? { ...folder, parentId: v2.id } : folder)),
    };
    expect(subtreeFolderIds(looped, api.id)).toHaveLength(3);
  });

  it('returns nothing for a folder that is not there', () => {
    const { state } = fixture();
    expect(subtreeFolderIds(state, 'missing')).toEqual([]);
  });
});

describe('exportFolder', () => {
  it('takes the nested folders and their requests', () => {
    const { state, api, v2, pokemon, requests } = fixture();
    const result = exportFolder(state, api.id);
    expect(result?.folders.map((folder) => folder.id).sort()).toEqual([api.id, v2.id, pokemon.id].sort());
    expect(result?.requests.map((request) => request.name).sort()).toEqual(['at api', 'at v2', 'deep']);
  });

  it('leaves a sibling folder and its requests behind', () => {
    const { state, api, other } = fixture();
    const result = exportFolder(state, api.id);
    expect(result?.folders.some((folder) => folder.id === other.id)).toBe(false);
    expect(result?.requests.some((request) => request.name === 'outside')).toBe(false);
  });

  it('leaves requests that sit at the workspace root behind', () => {
    const { state, api } = fixture();
    expect(exportFolder(state, api.id)?.requests.some((request) => request.name === 'at root')).toBe(false);
  });

  it('names the export after the folder and marks the format', () => {
    const { state, v2 } = fixture();
    const result = exportFolder(state, v2.id);
    expect(result?.name).toBe('v2');
    expect(isSubtreeExport(result)).toBe(true);
  });

  it('is null for a folder that is not there', () => {
    const { state } = fixture();
    expect(exportFolder(state, 'missing')).toBeNull();
  });
});

describe('exportRequest', () => {
  it('takes the one request and no folders', () => {
    const { state, requests } = fixture();
    const result = exportRequest(state, requests.deep.id);
    expect(result?.requests).toHaveLength(1);
    expect(result?.requests[0].id).toBe(requests.deep.id);
    expect(result?.folders).toEqual([]);
  });

  it('is null for a request that is not there', () => {
    const { state } = fixture();
    expect(exportRequest(state, 'missing')).toBeNull();
  });
});

describe('exportFileName', () => {
  it('lowercases and joins words with a single dash', () => {
    expect(exportFileName('Pokemon API')).toBe('pokemon-api.json');
  });

  it('collapses runs of punctuation instead of emitting them', () => {
    expect(exportFileName('Pokémon / v2!!')).toBe('pok-mon-v2.json');
  });

  it('falls back rather than producing a nameless file', () => {
    expect(exportFileName('///')).toBe('export.json');
    expect(exportFileName('')).toBe('export.json');
  });
});

describe('isSubtreeExport', () => {
  it('rejects a full workspace export, which has no marker', () => {
    const { state } = fixture();
    expect(isSubtreeExport(state)).toBe(false);
  });

  it('rejects values that are not objects', () => {
    expect(isSubtreeExport(null)).toBe(false);
    expect(isSubtreeExport('workspace-subtree')).toBe(false);
  });
});

describe('exportSelection', () => {
  it('takes exactly what was ticked, and the folders that hold it', () => {
    const { state, api, v2, requests } = fixture();
    const result = exportSelection(state, { name: 'Slice', selected: new Set([requests.deep.id]) });
    // The pokemon folder is not ticked, but "deep" lives in it, and that folder
    // lives in v2, which lives in api — all four are the path to the request.
    expect(result.requests.map((request) => request.name)).toEqual(['deep']);
    expect(result.folders.map((folder) => folder.name).sort()).toEqual(['API', 'pokemon', 'v2']);
    // "Other" holds nothing that was ticked, so it stays behind.
    expect(result.folders.map((folder) => folder.id)).not.toContain(state.folders[3].id);
    expect(result.folders.find((folder) => folder.id === v2.id)?.parentId).toBe(api.id);
  });

  it('leaves out the environments nobody ticked, and keeps the ones they did', () => {
    const { state } = fixture();
    const staging = createEnvironment(state.activeWorkspaceId, 'Staging', false, [row('host', 'https://stg')]);
    const other = createEnvironment(state.activeWorkspaceId, 'Prod', false, []);
    const withEnvironments = { ...state, environments: [staging, other] };

    const result = exportSelection(withEnvironments, {
      name: 'W',
      selected: new Set(),
      environmentIds: new Set([staging.id]),
    });
    expect(result.environments?.map((environment) => environment.name)).toEqual(['Staging']);
  });

  it('writes no environments key at all when none were ticked', () => {
    // A version 1 reader sees exactly the file it used to see.
    const { state } = fixture();
    expect('environments' in exportSelection(state, { name: 'W', selected: new Set() })).toBe(false);
  });

  it('exports only the active workspace, whatever else is in state', () => {
    const { state, requests } = fixture();
    const elsewhere = createRequest({ workspaceId: 'other-ws', name: 'not mine' });
    const wider = { ...state, requests: [...state.requests, elsewhere] };
    const result = exportSelection(wider, {
      name: 'W',
      selected: new Set([requests.atRoot.id, elsewhere.id]),
    });
    expect(result.requests.map((request) => request.name)).toEqual(['at root']);
  });
});

describe('importSubtree', () => {
  const roundTrip = () => {
    const { state, api, requests } = fixture();
    const base = createEnvironment(state.activeWorkspaceId, 'Base', true, [row('token', 'abc')]);
    const staging = createEnvironment(state.activeWorkspaceId, 'Staging', false, [row('host', 'https://stg')]);
    const file = exportSelection({ ...state, environments: [base, staging] }, {
      name: 'API',
      selected: new Set(subtreeFolderIds(state, api.id).concat([requests.deep.id, requests.atApi.id, requests.atV2.id])),
      environmentIds: new Set([base.id, staging.id]),
    });
    return { file, state, api, requests };
  };

  it('reads back what was written, tree and all', () => {
    const { file } = roundTrip();
    const imported = importSubtree(JSON.parse(JSON.stringify(file)), 'ws2');
    expect(imported.requests.map((request) => request.name).sort()).toEqual(['at api', 'at v2', 'deep']);

    const byName = new Map(imported.folders.map((folder) => [folder.name, folder]));
    expect(byName.get('v2')?.parentId).toBe(byName.get('API')?.id);
    expect(byName.get('API')?.parentId).toBeNull();
    expect(imported.requests.find((request) => request.name === 'deep')?.folderId).toBe(byName.get('pokemon')?.id);
  });

  it('issues fresh ids, so importing a slice beside its own origin does not collide', () => {
    const { file, api, requests } = roundTrip();
    const imported = importSubtree(JSON.parse(JSON.stringify(file)), 'ws2');
    expect(imported.folders.map((folder) => folder.id)).not.toContain(api.id);
    expect(imported.requests.map((request) => request.id)).not.toContain(requests.deep.id);
    expect(imported.folders.every((folder) => folder.workspaceId === 'ws2')).toBe(true);
  });

  it('sends the exported base into base variables, not into a second base', () => {
    // A workspace has exactly one base and it already exists, so the file's
    // base becomes variables the reducer merges into it.
    const { file } = roundTrip();
    const imported = importSubtree(JSON.parse(JSON.stringify(file)), 'ws2');
    expect(imported.variables.map((item) => item.key)).toEqual(['token']);
    expect(imported.environments?.map((environment) => environment.name)).toEqual(['Staging']);
    expect(imported.environment).toBeNull();
  });

  it('is what detectFormat picks, ahead of every other reader', () => {
    const { file } = roundTrip();
    expect(detectFormat(JSON.parse(JSON.stringify(file)))).toBe('carom');
    expect(readImport(JSON.stringify(file), 'ws2').format).toBe('carom');
  });

  it('lands a folder whose parent was left out at the top rather than nowhere', () => {
    const { state, v2, requests } = fixture();
    // v2 exported without API above it: its parent id is not in the file.
    const file = exportSelection(state, { name: 'v2', selected: new Set([v2.id, requests.atV2.id]) });
    const partial = { ...file, folders: file.folders.filter((folder) => folder.name !== 'API') };
    const imported = importSubtree(JSON.parse(JSON.stringify(partial)), 'ws2');
    expect(imported.folders.find((folder) => folder.name === 'v2')?.parentId).toBeNull();
  });
});
