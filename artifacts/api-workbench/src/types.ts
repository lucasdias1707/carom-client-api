import type { Language } from '@/lib/i18n';

/**
 * Domain model for the workbench.
 *
 * The shape mirrors what a desktop HTTP client needs: a workspace holds a tree
 * of folders and requests, plus a set of environments whose variables are
 * interpolated into every outgoing request.
 */

import type { Binding, CommandId } from '@/lib/shortcuts';
import type { DraftPalette, FontTheme, Palette } from '@/lib/themes';

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

export const BODY_TYPES = ['none', 'json', 'text', 'xml', 'form', 'multipart', 'graphql'] as const;
export type BodyType = (typeof BODY_TYPES)[number];

/**
 * `inherit` takes whatever the nearest enclosing folder defines, and is the
 * default for a new request. Every request written before this existed carries
 * a concrete type, so none of them silently changed behaviour.
 */
export type AuthType = 'inherit' | 'none' | 'bearer' | 'basic' | 'apikey';

import type { FileMeta } from '@/lib/files';

export type KeyValue = {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  /**
   * Set on query parameters mirrored out of the URL, so re-reading the URL can
   * replace them without touching rows someone typed into the table. Absent on
   * everything else, including every row written before this existed.
   */
  source?: 'url';
  /**
   * Set on a multipart row that carries a file. Only what describes the file
   * lives here — the bytes are held for the session in `lib/files.ts`, keyed by
   * this row's id, because the whole state is written to localStorage and one
   * attachment could evict every request in it.
   */
  file?: FileMeta;
};

export type Auth = {
  type: AuthType;
  /** bearer */
  token: string;
  /** basic */
  username: string;
  password: string;
  /** apikey */
  apiKeyName: string;
  apiKeyValue: string;
  apiKeyIn: 'header' | 'query';
};

/** Where a documented field travels. */
export const DOC_FIELD_LOCATIONS = ['query', 'path', 'header', 'body'] as const;
export type DocFieldIn = (typeof DOC_FIELD_LOCATIONS)[number];

export const DOC_FIELD_TYPES = ['string', 'number', 'integer', 'boolean', 'array', 'object'] as const;
export type DocFieldType = (typeof DOC_FIELD_TYPES)[number];

/**
 * One documented field of a request.
 *
 * The params and headers tables already say what is *sent*; this says what a
 * field *means* — whether it is required, what type it holds, an example worth
 * showing. That is the part an OpenAPI description needs and a key/value row
 * cannot carry.
 */
export type DocField = {
  id: string;
  in: DocFieldIn;
  name: string;
  description: string;
  required: boolean;
  type: DocFieldType;
  example: string;
};

export type GraphQLBody = {
  query: string;
  variables: string;
};

export type RequestRecord = {
  id: string;
  workspaceId: string;
  folderId: string | null;
  name: string;
  method: HttpMethod;
  url: string;
  description: string;
  params: KeyValue[];
  headers: KeyValue[];
  bodyType: BodyType;
  /** Raw text payload used by the json/text/xml body types. */
  body: string;
  form: KeyValue[];
  multipart: KeyValue[];
  graphql: GraphQLBody;
  auth: Auth;
  /**
   * Documented fields. Optional, and absent on every request written before
   * the Docs tab could hold them — `hydrate` needs no migration for that.
   */
  docs?: { fields: DocField[] };
  /** Runs before the request is sent, outermost folder first. */
  preScript: string;
  /** Runs after the response arrives, innermost first. */
  postScript: string;
  sortIndex: number;
  createdAt: string;
  updatedAt: string;
};

export type Folder = {
  id: string;
  workspaceId: string;
  /** `null` means the folder sits at the root of the workspace. */
  parentId: string | null;
  name: string;
  color: string;
  sortIndex: number;
  /**
   * Variables scoped to this folder and everything under it. They are the
   * "local" scope: nearer folders win over outer ones, and any folder wins
   * over an environment.
   */
  variables: KeyValue[];
  /** Applied to every request beneath that has not chosen its own. */
  auth: Auth;
  /** Wrap every request beneath: pre runs before, post after. */
  preScript: string;
  postScript: string;
};

export type Workspace = {
  id: string;
  name: string;
  createdAt: string;
};

export type Environment = {
  id: string;
  workspaceId: string;
  name: string;
  /**
   * The base environment is always applied; the active sub-environment is
   * layered on top of it, so shared values live in one place.
   */
  isBase: boolean;
  /** Colour its variables are drawn in, so staging never reads as production. */
  color: string;
  variables: KeyValue[];
};

/** Where a resolved variable came from. Folder scope is "local", the rest global. */
export type VariableScope = 'folder' | 'environment' | 'base';

export type VariableOrigin = {
  scope: VariableScope;
  sourceId: string;
  sourceName: string;
  color: string;
  value: string;
};

export type ResolvedVariable = VariableOrigin & {
  name: string;
  /** Definitions this one overrides, nearest first. */
  shadowed: VariableOrigin[];
};

export type VariableTable = Record<string, ResolvedVariable>;

/** Syntax colours for the response viewer, editable like an editor theme. */
export type JsonTheme = {
  key: string;
  string: string;
  number: string;
  boolean: string;
  null: string;
  punctuation: string;
};

/** How a request should reach the network. */
export type SendMode = 'auto' | 'browser' | 'proxy';
export type PaneLayout = 'horizontal' | 'vertical';
export type ThemeName = 'dark' | 'light' | 'system';

export type Settings = {
  theme: ThemeName;
  /**
   * Which language the interface speaks. Absent means "follow the system",
   * which is what a fresh install is: the machine already knows what its owner
   * reads, so asking would be asking a question we can answer. Choosing one
   * here pins it, and a later change of system language then leaves it alone.
   */
  language?: Language;
  /**
   * Which language the `{{$random...}}` generators invent data in. Absent
   * means "follow the interface", which is right until it is not: testing an
   * API that validates against English names while reading the app in
   * Portuguese is a real combination, and it is the only reason this is a
   * setting of its own rather than a consequence of the one above.
   */
  dataLanguage?: Language;
  layout: PaneLayout;
  sendMode: SendMode;
  /** Follow redirects when sending through the proxy. */
  followRedirects: boolean;
  timeoutMs: number;
  /** Persist response bodies between reloads. */
  persistResponses: boolean;
  /**
   * Ask the release feed for a newer version when the app starts. Desktop only,
   * and it never downloads anything on its own.
   */
  autoCheckUpdates: boolean;
  /** Width of the request tree, in pixels. Dragged, and kept between sessions. */
  sidebarWidth: number;
  /**
   * Hide the tree entirely. Deliberately a preference rather than something
   * derived from the window size: a narrow window is a reason to offer the
   * control, not a reason to decide for someone.
   */
  sidebarCollapsed: boolean;
  jsonTheme: JsonTheme;
  /**
   * Which colour palette the tokens come from. Absent means the one built into
   * the stylesheet, which is why the default overrides nothing.
   */
  palette?: string;
  /** Colour palettes someone made here. The built-in ones are not stored. */
  palettes?: Palette[];
  /**
   * A generated palette being looked at but not kept. One slot: shuffling
   * again replaces it, Save moves it into `palettes` under a real id, and
   * Discard drops it. Absent means there is nothing on trial.
   */
  draftPalette?: DraftPalette;
  /** Which font theme is in use, built-in or saved. */
  fontTheme?: string;
  /** Font themes someone made here. The built-in ones are not stored. */
  fontThemes?: FontTheme[];
  /**
   * Rebound shortcuts, keyed by command. Only what was changed is stored, so a
   * default that moves in a later version moves for everyone who never touched
   * it — and an unknown id left behind by an older build is ignored rather than
   * resurrected.
   */
  keyBindings?: Partial<Record<CommandId, Binding>>;
};

export type ResponseRecord = {
  id: string;
  requestId: string;
  /** Fully resolved URL that was actually sent. */
  url: string;
  method: HttpMethod;
  status: number;
  statusText: string;
  headers: KeyValue[];
  body: string;
  /** Set when the body was cut down before being persisted. */
  truncated: boolean;
  size: number;
  durationMs: number;
  sentAt: string;
  via: 'browser' | 'proxy' | 'desktop';
  error?: string;
};

/**
 * A request as it stood at one Save.
 *
 * The whole record is kept, not a diff: restoring has to produce a request that
 * works, and a chain of diffs that has to be replayed is a second thing that
 * can be wrong. `changed` is only for the list to read.
 */
export type RequestVersion = {
  id: string;
  requestId: string;
  savedAt: string;
  /**
   * Which parts moved in this save, in composer order, as `SectionId`s.
   *
   * Typed loosely on purpose: versions written before the ids existed hold the
   * English label instead, and `sectionId` in `lib/draft` is what reconciles
   * the two on the way to the screen. Narrowing this would be a lie about what
   * is already in people's storage.
   */
  changed: string[];
  request: RequestRecord;
};

export type WorkspaceState = {
  version: number;
  workspaces: Workspace[];
  folders: Folder[];
  requests: RequestRecord[];
  environments: Environment[];
  responses: ResponseRecord[];
  activeWorkspaceId: string;
  /** Active sub-environment id, or `null` for "base only". */
  activeEnvironmentId: string | null;
  openTabIds: string[];
  /**
   * Unsaved edits, by request id. The composer writes here and ⌘S commits, so
   * what the sidebar, an export and a shared file say about a request stays
   * what was last saved. Absent on every state written before drafts existed,
   * which `hydrate` reads as "nothing unsaved".
   */
  drafts: Record<string, RequestRecord>;
  /**
   * Every saved version of every request, newest first. Absent on a state
   * written before this existed, which `hydrate` reads as "no history yet".
   */
  versions: RequestVersion[];
  activeRequestId: string | null;
  /** Set when a folder's own pane is open; clears when a request is opened. */
  activeFolderId: string | null;
  settings: Settings;
};
