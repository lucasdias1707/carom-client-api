import { dropDrafts, isDirty } from '@/lib/draft';
import { cloneRequest } from '@/lib/factories';
import { createId } from '@/lib/id';
import type { Action } from '@/state/actions';
import type { Environment, RequestRecord, WorkspaceState } from '@/types';
import { isDescendantFolder } from '@/state/selectors';

/** Keep at most this many responses per request so history stays useful but bounded. */
const MAX_RESPONSES_PER_REQUEST = 15;
const MAX_RESPONSES_TOTAL = 120;

function touch(request: RequestRecord, patch: Partial<RequestRecord>): RequestRecord {
  return { ...request, ...patch, updatedAt: new Date().toISOString() };
}

function withTabOpen(state: WorkspaceState, id: string): WorkspaceState {
  const openTabIds = state.openTabIds.includes(id) ? state.openTabIds : [...state.openTabIds, id];
  // A request and a folder never share the pane, so opening one closes the other.
  return { ...state, openTabIds, activeRequestId: id, activeFolderId: null };
}

/** Pick the tab that should take focus after `closedId` goes away. */
function nextActiveId(openTabIds: string[], closedId: string, currentActive: string | null): string | null {
  if (currentActive !== closedId) return currentActive;
  const index = openTabIds.indexOf(closedId);
  const remaining = openTabIds.filter((tabId) => tabId !== closedId);
  if (remaining.length === 0) return null;
  return remaining[Math.min(index, remaining.length - 1)] ?? null;
}

/** Ids of a folder and every folder nested beneath it. */
function folderSubtree(state: WorkspaceState, rootId: string): Set<string> {
  const ids = new Set([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const folder of state.folders) {
      if (folder.parentId && ids.has(folder.parentId) && !ids.has(folder.id)) {
        ids.add(folder.id);
        grew = true;
      }
    }
  }
  return ids;
}

function removeRequests(state: WorkspaceState, ids: Set<string>): WorkspaceState {
  const requests = state.requests.filter((request) => !ids.has(request.id));
  const openTabIds = state.openTabIds.filter((tabId) => !ids.has(tabId));
  const activeRequestId =
    state.activeRequestId && ids.has(state.activeRequestId) ? (openTabIds.at(-1) ?? null) : state.activeRequestId;
  return {
    ...state,
    requests,
    openTabIds,
    activeRequestId,
    drafts: dropDrafts(state.drafts, ids),
    responses: state.responses.filter((response) => !ids.has(response.requestId)),
  };
}

export function reducer(state: WorkspaceState, action: Action): WorkspaceState {
  switch (action.type) {
    case 'state/replace':
      // A file written by an older build carries no drafts, and an imported
      // workspace has no unsaved edits by definition.
      return { ...action.state, drafts: action.state.drafts ?? {} };

    case 'restore': {
      const previous = action.previous;
      // Re-add only what is missing. Anything still present was either never
      // deleted or was edited since, and the edit is newer than the snapshot.
      const missing = <T extends { id: string }>(current: T[], saved: T[]): T[] => {
        const have = new Set(current.map((item) => item.id));
        const back = saved.filter((item) => !have.has(item.id));
        return back.length === 0 ? current : [...current, ...back];
      };

      const requests = missing(state.requests, previous.requests);
      const restoredIds = new Set(requests.map((request) => request.id));
      return {
        ...state,
        workspaces: missing(state.workspaces, previous.workspaces),
        folders: missing(state.folders, previous.folders),
        requests,
        environments: missing(state.environments, previous.environments),
        responses: missing(state.responses, previous.responses),
        // The tab strip is an ordered list, so it is restored rather than
        // merged — but only for requests that actually exist again.
        openTabIds: previous.openTabIds.filter((id) => restoredIds.has(id)),
        activeRequestId: previous.activeRequestId,
        activeFolderId: previous.activeFolderId,
        activeWorkspaceId: previous.activeWorkspaceId,
        activeEnvironmentId: previous.activeEnvironmentId,
      };
    }

    case 'request/open':
      return withTabOpen(state, action.id);

    /*
      Closing a tab throws its draft away. The asking happens before we get
      here — the tab strip puts Save / Don't save / Cancel in front of anything
      that would lose work — so by this point the answer has been given.
    */
    case 'request/close-tab': {
      const openTabIds = state.openTabIds.filter((tabId) => tabId !== action.id);
      return {
        ...state,
        openTabIds,
        drafts: dropDrafts(state.drafts, new Set([action.id])),
        activeRequestId: nextActiveId(state.openTabIds, action.id, state.activeRequestId),
      };
    }

    case 'request/close-other-tabs':
      return {
        ...state,
        openTabIds: [action.id],
        drafts: dropDrafts(state.drafts, new Set(state.openTabIds.filter((tabId) => tabId !== action.id))),
        activeRequestId: action.id,
      };

    case 'request/close-all-tabs':
      return {
        ...state,
        openTabIds: [],
        drafts: dropDrafts(state.drafts, new Set(state.openTabIds)),
        activeRequestId: null,
      };

    /*
      An edit goes to the draft, never to the request. A draft typed back to
      what was saved stops being a draft, so the dot on the tab means there is
      really something to save rather than that something was once touched.
    */
    case 'request/update': {
      const saved = state.requests.find((request) => request.id === action.id);
      if (!saved) return state;

      /*
        A mirrored patch is the app agreeing with itself, not an edit: copying
        `?page=2` out of the URL into the Params table changes nothing about
        what gets sent, because sending reads the table and skips the URL's own
        query either way. Treated as an edit it would mark a request unsaved
        for merely having been opened — and, worse, mark it unsaved again half
        a second after every save.
      */
      if (action.mirror && !state.drafts[action.id]) {
        return {
          ...state,
          requests: state.requests.map((request) =>
            request.id === action.id ? { ...request, ...action.patch } : request,
          ),
        };
      }

      const draft = touch(state.drafts[action.id] ?? saved, action.patch);
      return {
        ...state,
        drafts: isDirty(saved, draft)
          ? { ...state.drafts, [action.id]: draft }
          : dropDrafts(state.drafts, new Set([action.id])),
      };
    }

    case 'request/save': {
      const draft = state.drafts[action.id];
      if (!draft) return state;
      return {
        ...state,
        requests: state.requests.map((request) => (request.id === action.id ? draft : request)),
        drafts: dropDrafts(state.drafts, new Set([action.id])),
      };
    }

    case 'request/revert':
      return { ...state, drafts: dropDrafts(state.drafts, new Set([action.id])) };

    /*
      Renaming from the tree is not a composer edit: it names the thing rather
      than describing what it sends, and holding it back behind ⌘S would leave
      the sidebar showing the old name with no tab to save from. The draft, if
      there is one, is renamed alongside so saving it later does not put the
      old name back.
    */
    case 'request/rename': {
      const rename = (request: RequestRecord) => touch(request, { name: action.name });
      const draft = state.drafts[action.id];
      return {
        ...state,
        requests: state.requests.map((request) => (request.id === action.id ? rename(request) : request)),
        drafts: draft ? { ...state.drafts, [action.id]: rename(draft) } : state.drafts,
      };
    }

    case 'request/create':
      return withTabOpen({ ...state, requests: [...state.requests, action.request] }, action.request.id);

    case 'request/duplicate': {
      // The copy is of what is on screen, drafts included: duplicating a
      // request you have been editing to try a variation of it is the reason
      // the command exists, and silently copying the older saved version would
      // be the one outcome nobody asked for. The original keeps its draft.
      const source = state.drafts[action.id] ?? state.requests.find((request) => request.id === action.id);
      if (!source) return state;
      const copy = cloneRequest(source);
      copy.id = createId('req');
      copy.name = `${source.name} copy`;
      copy.sortIndex = source.sortIndex + 1;
      copy.createdAt = new Date().toISOString();
      copy.updatedAt = copy.createdAt;
      return withTabOpen({ ...state, requests: [...state.requests, copy] }, copy.id);
    }

    case 'request/delete':
      return removeRequests(state, new Set([action.id]));

    case 'request/move': {
      const moving = state.requests.find((request) => request.id === action.id);
      if (!moving) return state;

      // Rebuild the destination's order with the dragged request inserted at
      // the drop point, then renumber so sortIndex stays dense and stable.
      const siblings = state.requests
        .filter((request) => request.folderId === action.folderId && request.id !== action.id)
        .sort((left, right) => left.sortIndex - right.sortIndex);
      const at = action.beforeId ? siblings.findIndex((request) => request.id === action.beforeId) : -1;
      const ordered = [...siblings];
      ordered.splice(at === -1 ? ordered.length : at, 0, moving);

      const order = new Map(ordered.map((request, index) => [request.id, index]));
      return {
        ...state,
        requests: state.requests.map((request) => {
          const index = order.get(request.id);
          if (index === undefined) return request;
          return request.id === action.id
            ? touch(request, { folderId: action.folderId, sortIndex: index })
            : { ...request, sortIndex: index };
        }),
      };
    }

    case 'folder/move': {
      // Refuse to drop a folder into its own subtree, which would detach it.
      if (action.parentId && isDescendantFolder(state, action.parentId, action.id)) return state;
      return {
        ...state,
        folders: state.folders.map((folder) =>
          folder.id === action.id ? { ...folder, parentId: action.parentId } : folder,
        ),
      };
    }

    case 'folder/create':
      return { ...state, folders: [...state.folders, action.folder] };

    case 'folder/rename':
      return {
        ...state,
        folders: state.folders.map((folder) => (folder.id === action.id ? { ...folder, name: action.name } : folder)),
      };

    case 'folder/delete': {
      const doomedFolders = folderSubtree(state, action.id);
      const doomedRequests = new Set(
        state.requests.filter((request) => request.folderId && doomedFolders.has(request.folderId)).map((request) => request.id),
      );
      const next = removeRequests(state, doomedRequests);
      return {
        ...next,
        folders: next.folders.filter((folder) => !doomedFolders.has(folder.id)),
        activeFolderId:
          next.activeFolderId && doomedFolders.has(next.activeFolderId) ? null : next.activeFolderId,
      };
    }

    case 'folder/open':
      return { ...state, activeFolderId: action.id, activeRequestId: action.id ? null : state.activeRequestId };

    case 'folder/update':
      return {
        ...state,
        folders: state.folders.map((folder) =>
          folder.id === action.id ? { ...folder, ...action.patch } : folder,
        ),
      };

    case 'folder/variables':
      return {
        ...state,
        folders: state.folders.map((folder) =>
          folder.id === action.id ? { ...folder, variables: action.variables } : folder,
        ),
      };

    case 'workspace/create':
      return {
        ...state,
        workspaces: [...state.workspaces, action.workspace],
        environments: [...state.environments, action.environment],
        activeWorkspaceId: action.workspace.id,
        activeEnvironmentId: null,
        openTabIds: [],
        activeRequestId: null,
        activeFolderId: null,
      };

    case 'workspace/activate': {
      if (action.id === state.activeWorkspaceId) return state;
      // Tabs belong to the workspace they were opened from.
      return {
        ...state,
        activeWorkspaceId: action.id,
        activeEnvironmentId: null,
        openTabIds: [],
        activeRequestId: null,
        activeFolderId: null,
      };
    }

    case 'workspace/rename':
      return {
        ...state,
        workspaces: state.workspaces.map((workspace) =>
          workspace.id === action.id ? { ...workspace, name: action.name } : workspace,
        ),
      };

    case 'workspace/delete': {
      // The last workspace stays: there is nowhere to send the user otherwise.
      if (state.workspaces.length <= 1) return state;
      const remaining = state.workspaces.filter((workspace) => workspace.id !== action.id);
      const doomedRequests = new Set(
        state.requests.filter((request) => request.workspaceId === action.id).map((request) => request.id),
      );
      const next = removeRequests(state, doomedRequests);
      const activeWorkspaceId = state.activeWorkspaceId === action.id ? remaining[0].id : state.activeWorkspaceId;
      return {
        ...next,
        workspaces: remaining,
        folders: next.folders.filter((folder) => folder.workspaceId !== action.id),
        environments: next.environments.filter((environment) => environment.workspaceId !== action.id),
        activeWorkspaceId,
        activeEnvironmentId: null,
      };
    }

    case 'environment/activate':
      return { ...state, activeEnvironmentId: action.id };

    case 'environment/create':
      return { ...state, environments: [...state.environments, action.environment] };

    case 'environment/update':
      return {
        ...state,
        environments: state.environments.map((environment) =>
          environment.id === action.id ? { ...environment, ...action.patch } : environment,
        ),
      };

    case 'environment/delete': {
      const target = state.environments.find((environment) => environment.id === action.id);
      if (!target || target.isBase) return state;
      return {
        ...state,
        environments: state.environments.filter((environment) => environment.id !== action.id),
        activeEnvironmentId: state.activeEnvironmentId === action.id ? null : state.activeEnvironmentId,
      };
    }

    case 'response/add': {
      const sameRequest = state.responses
        .filter((response) => response.requestId === action.response.requestId)
        .slice(0, MAX_RESPONSES_PER_REQUEST - 1);
      const others = state.responses.filter((response) => response.requestId !== action.response.requestId);
      const merged = [action.response, ...sameRequest, ...others]
        .sort((left, right) => right.sentAt.localeCompare(left.sentAt))
        .slice(0, MAX_RESPONSES_TOTAL);
      return { ...state, responses: merged };
    }

    case 'response/clear':
      return { ...state, responses: state.responses.filter((response) => response.requestId !== action.requestId) };

    case 'import/merge': {
      const added = [action.baseEnvironment, action.environment, ...(action.environments ?? [])].filter(
        (environment): environment is Environment => Boolean(environment),
      );
      const destination = action.workspaceId ?? action.workspace?.id ?? state.activeWorkspaceId;
      const moving = destination !== state.activeWorkspaceId;

      // An imported collection's own variables go into the destination's base
      // environment, and never overwrite a name it already defines: the local
      // value is the one someone chose, and the collection's is a default.
      const withBaseVariables = (environments: Environment[]): Environment[] => {
        const incoming = action.baseVariables ?? [];
        if (incoming.length === 0) return environments;
        return environments.map((environment) => {
          if (!environment.isBase || environment.workspaceId !== destination) return environment;
          const defined = new Set(environment.variables.map((item) => item.key.trim()).filter(Boolean));
          const fresh = incoming.filter((item) => !defined.has(item.key.trim()));
          return fresh.length === 0 ? environment : { ...environment, variables: [...environment.variables, ...fresh] };
        });
      };

      const next: WorkspaceState = {
        ...state,
        workspaces: action.workspace ? [...state.workspaces, action.workspace] : state.workspaces,
        folders: [...state.folders, ...action.folders],
        requests: [...state.requests, ...action.requests],
        environments: withBaseVariables([...state.environments, ...added]),
        activeWorkspaceId: destination,
        // Tabs belong to the workspace they were opened from, so importing
        // somewhere else leaves them behind rather than dragging them along.
        ...(moving ? { openTabIds: [], activeRequestId: null, activeEnvironmentId: null } : {}),
      };

      // Land on what was just imported rather than leaving it to be hunted for
      // in the tree: the outermost new folder.
      const landing = action.folders[0];
      return landing ? { ...next, activeFolderId: landing.id, activeRequestId: null } : next;
    }

    case 'settings/update':
      return { ...state, settings: { ...state.settings, ...action.patch } };

    default:
      return state;
  }
}
