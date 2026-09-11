import { createEnvironment, createFolder, createRequest, createWorkspace, emptyAuth, row } from '@/lib/factories';
import type { WorkspaceState } from '@/types';
import type { Translate } from '@/lib/i18n';
import { STATE_VERSION } from '@/lib/storage';
import { defaultSettings } from '@/lib/settings';

/**
 * A small but realistic starter workspace so the app is useful on first open.
 * It points at httpbin, which is reachable from a browser, instead of a
 * fictional host that would only ever produce network errors.
 *
 * The names are translated once, here, and then they are ordinary data: a
 * later change of language leaves them alone, the same way it leaves alone
 * anything else you could rename. Only what someone has never seen would be
 * safe to rewrite, and by the time this has run they have seen it.
 *
 * URLs, methods, headers and variable names stay as they are — those are not
 * words, they are the request.
 */
export function createSeedState(t: Translate): WorkspaceState {
  const workspace = createWorkspace(t('seed.workspace'));
  const playground = createFolder(workspace.id, t('seed.playground'), null, 0, '#5fb37a');
  const inspect = createFolder(workspace.id, t('seed.inspect'), playground.id, 0, '#5fb37a');
  const writes = createFolder(workspace.id, t('seed.writes'), playground.id, 1, '#e0913f');
  const github = createFolder(workspace.id, t('seed.github'), null, 1, '#a97ad6');

  const requests = [
    createRequest({
      workspaceId: workspace.id,
      folderId: inspect.id,
      name: t('seed.echo'),
      method: 'GET',
      url: '{{baseUrl}}/get',
      params: [row('team', 'northstar'), row('limit', '20')],
      headers: [row('Accept', 'application/json')],
      description: t('seed.echoDescription'),
      sortIndex: 0,
    }),
    createRequest({
      workspaceId: workspace.id,
      folderId: inspect.id,
      name: t('seed.responseHeaders'),
      method: 'GET',
      url: '{{baseUrl}}/response-headers?fresh=true',
      headers: [row('Accept', 'application/json')],
      sortIndex: 1,
    }),
    createRequest({
      workspaceId: workspace.id,
      folderId: inspect.id,
      name: t('seed.status404'),
      method: 'GET',
      url: '{{baseUrl}}/status/404',
      sortIndex: 2,
    }),
    createRequest({
      workspaceId: workspace.id,
      folderId: writes.id,
      name: t('seed.createProject'),
      method: 'POST',
      url: '{{baseUrl}}/post',
      bodyType: 'json',
      body: '{\n  "name": "Signal atlas",\n  "slug": "signal-atlas",\n  "public": false\n}',
      headers: [row('Content-Type', 'application/json')],
      sortIndex: 0,
    }),
    createRequest({
      workspaceId: workspace.id,
      folderId: writes.id,
      name: t('seed.submitForm'),
      method: 'POST',
      url: '{{baseUrl}}/post',
      bodyType: 'form',
      form: [row('email', 'ada@example.com'), row('plan', 'pro')],
      sortIndex: 1,
    }),
    createRequest({
      workspaceId: workspace.id,
      folderId: writes.id,
      name: t('seed.deleteResource'),
      method: 'DELETE',
      url: '{{baseUrl}}/delete',
      auth: { ...emptyAuth(), type: 'bearer', token: '{{token}}' },
      sortIndex: 2,
    }),
    createRequest({
      workspaceId: workspace.id,
      folderId: github.id,
      name: t('seed.publicRepo'),
      method: 'GET',
      url: '{{baseUrl}}/repos/mountain-loop/yaak',
      headers: [row('Accept', 'application/vnd.github+json')],
      sortIndex: 0,
    }),
  ];

  // Only the base environment ships. Anything beyond it is the user's own
  // staging/production split, created from the environment picker.
  const base = createEnvironment(workspace.id, 'Base', true, [
    row('baseUrl', 'https://httpbin.org'),
    row('token', 'replace-me'),
  ]);

  // One folder-scoped variable, to show that a folder can narrow a value.
  github.variables = [row('baseUrl', 'https://api.github.com')];

  return {
    version: STATE_VERSION,
    workspaces: [workspace],
    folders: [playground, inspect, writes, github],
    requests,
    environments: [base],
    responses: [],
    activeWorkspaceId: workspace.id,
    activeEnvironmentId: null,
    openTabIds: [requests[0].id],
    drafts: {},
    versions: [],
    activeFolderId: null,
    activeRequestId: requests[0].id,
    settings: defaultSettings(),
  };
}
