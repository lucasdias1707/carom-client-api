import { createContext, Fragment, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { draftChanges, withDraft, type SectionId } from '@/lib/draft';
import {
  format,
  messageParts,
  resolveDataLanguage,
  resolveLanguage,
  systemLanguage,
  LANGUAGE_TAGS,
  type Language,
  type Translate,
} from '@/lib/i18n';
import { catalogueFor, translatorFor } from '@/locales';
import type { Catalogue, MessageKey } from '@/locales/en';
import { emptyAuth } from '@/lib/factories';
import { dropLegacyState, migrateLegacyState } from '@/lib/migrate';
import { createSeedState } from '@/lib/seed';
import { defaultSettings } from '@/lib/settings';
import { readState, writeState, STATE_VERSION } from '@/lib/storage';
import { buildVariableTable, valuesOf } from '@/lib/template';
import { reducer } from '@/state/reducer';
import { folderChain } from '@/state/selectors';
import type { Action } from '@/state/actions';
import type { Folder, RequestRecord, ResponseRecord, VariableTable, WorkspaceState } from '@/types';

export type { Translate };

/**
 * The same, for a sentence that has to contain an element rather than a word.
 *
 * The translation still decides the word order; the caller only says what each
 * placeholder looks like. Interpolating markup into the string itself would
 * make the translator responsible for the markup too, and a stray tag in a
 * catalogue is a rendering bug nobody can see until that language is on
 * screen.
 */
export type TranslateNodes = (key: MessageKey, vars: Record<string, ReactNode>) => ReactNode;

type StoreValue = {
  state: WorkspaceState;
  dispatch: (action: Action) => void;
  activeRequest: RequestRecord | null;
  /** Set while a folder's own pane is open. */
  activeFolder: Folder | null;
  /** The folders a request sits in, nearest first — what auth and scripts inherit through. */
  chainFor: (folderId: string | null) => Folder[];
  /** What an open request has unsaved, in composer order. Empty means saved. */
  unsavedIn: (requestId: string) => SectionId[];
  /** The language on screen: the chosen one, or the system's until one is chosen. */
  language: Language;
  /**
   * The language the `{{$random...}}` generators invent data in. Separate from
   * the one above because the interface and the system under test do not have
   * to agree: reading the app in Portuguese while an API validates English
   * names is a real combination, and it is the whole reason this exists.
   */
  dataLanguage: Language;
  t: Translate;
  tNodes: TranslateNodes;
  /** Values only, for building the outgoing request. */
  variables: Record<string, string>;
  /** Values plus where each came from, for the UI. */
  variableTable: VariableTable;
  /** Resolve in the context of any folder, not just the active request's. */
  tableFor: (folderId: string | null) => VariableTable;
  responsesFor: (requestId: string) => ResponseRecord[];
};

const WorkspaceContext = createContext<StoreValue | null>(null);

/**
 * Fill in anything a stored state is missing so older payloads stay loadable.
 *
 * Auth and scripts arrived on folders after people already had folders stored,
 * so they are filled in here rather than by a version bump. A folder written
 * before they existed gets `inherit`, which is what it effectively already was;
 * a *request* written back then keeps its own concrete auth, so nothing that
 * used to send a token silently stops.
 */
function hydrate(state: WorkspaceState): WorkspaceState {
  return {
    ...state,
    version: STATE_VERSION,
    responses: state.responses ?? [],
    openTabIds: state.openTabIds ?? [],
    drafts: state.drafts ?? {},
    versions: state.versions ?? [],
    folders: (state.folders ?? []).map((folder) => ({
      ...folder,
      variables: folder.variables ?? [],
      auth: folder.auth ?? { ...emptyAuth(), type: 'inherit' },
      preScript: folder.preScript ?? '',
      postScript: folder.postScript ?? '',
    })),
    requests: (state.requests ?? []).map((request) => ({
      ...request,
      auth: request.auth ?? emptyAuth(),
      preScript: request.preScript ?? '',
      postScript: request.postScript ?? '',
    })),
    environments: state.environments ?? [],
    activeFolderId: state.activeFolderId ?? null,
    settings: { ...defaultSettings(), ...(state.settings ?? {}) },
  };
}

function initialState(): WorkspaceState {
  const stored = readState();
  if (stored) return hydrate(stored);
  const migrated = migrateLegacyState();
  if (migrated) {
    dropLegacyState();
    return migrated;
  }
  /*
    No stored state means a genuinely fresh install, and on a fresh install the
    only thing that could have picked a language is the machine — so the sample
    workspace is named in whatever `systemLanguage()` resolves to, which is the
    same language the interface is about to render in.
  */
  return createSeedState(translatorFor(systemLanguage()));
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const writeTimer = useRef<number | null>(null);

  // Persist on a short debounce: typing in the composer updates state on every
  // keystroke and localStorage writes are synchronous.
  useEffect(() => {
    if (writeTimer.current !== null) window.clearTimeout(writeTimer.current);
    writeTimer.current = window.setTimeout(() => writeState(state), 250);
    return () => {
      if (writeTimer.current !== null) window.clearTimeout(writeTimer.current);
    };
  }, [state]);

  useEffect(() => {
    const flush = () => writeState(state);
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, [state]);

  const language = resolveLanguage(state.settings.language);
  const dataLanguage = resolveDataLanguage(state.settings.dataLanguage, language);
  const catalogue = useMemo<Catalogue>(() => catalogueFor(language), [language]);

  /*
    Tell the document what it is showing. A screen reader picks its voice from
    this, and a page that claims English while showing Portuguese is read out
    as gibberish — so it is set from the same value the interface renders from,
    and cannot drift from it.
  */
  useEffect(() => {
    document.documentElement.lang = LANGUAGE_TAGS[language];
  }, [language]);

  const value = useMemo<StoreValue>(() => {
    const t: Translate = (key, vars) => format(catalogue[key], vars);
    const tNodes: TranslateNodes = (key, vars) => {
      const message = catalogue[key];
      // A counted sentence picks its form the same way `t` does, so "1 version"
      // and "3 versions" do not need two keys just because one of them has a
      // name in bold.
      const text =
        typeof message === 'string' ? message
        : Number(vars.count) === 1 ? message.one
        : message.other;
      return messageParts(text).map((part, index) => (
        <Fragment key={index}>{'text' in part ? part.text : vars[part.variable]}</Fragment>
      ));
    };
    // The draft when there is one, so the composer, the tab's name and Send
    // all mean the same thing: what is on screen.
    const activeRequest = withDraft(
      state.requests.find((request) => request.id === state.activeRequestId),
      state.drafts,
    );
    const environments = state.environments.filter(
      (environment) => environment.workspaceId === state.activeWorkspaceId,
    );
    const chainFor = (folderId: string | null) => folderChain(state, folderId);
    const tableFor = (folderId: string | null) =>
      buildVariableTable(chainFor(folderId), environments, state.activeEnvironmentId);
    const variableTable = tableFor(activeRequest?.folderId ?? null);
    return {
      state,
      dispatch,
      activeRequest,
      activeFolder: state.folders.find((folder) => folder.id === state.activeFolderId) ?? null,
      chainFor,
      unsavedIn: (requestId: string) => {
        const draft = state.drafts[requestId];
        const saved = state.requests.find((request) => request.id === requestId);
        return draft && saved ? draftChanges(saved, draft) : [];
      },
      language,
      dataLanguage,
      t,
      tNodes,
      variables: valuesOf(variableTable),
      variableTable,
      tableFor,
      responsesFor: (requestId: string) => state.responses.filter((response) => response.requestId === requestId),
    };
  }, [state, catalogue, language, dataLanguage]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): StoreValue {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used inside a WorkspaceProvider');
  return context;
}

/**
 * Just the translator, for the many components that want words and nothing
 * else from the store.
 */
export function useT(): Translate {
  return useWorkspace().t;
}
