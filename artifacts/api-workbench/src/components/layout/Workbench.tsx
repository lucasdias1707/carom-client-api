import { useState } from 'react';
import {
  Columns2,
  Download,
  FilePlus2,
  FolderInput,
  Keyboard,
  Layers,
  PanelLeft,
  PanelLeftClose,
  Rows2,
  Save,
  Search,
  Send,
  Settings,
  Terminal,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { CommandPalette, type Command } from '@/components/dialogs/CommandPalette';
import { EnvironmentDialog } from '@/components/dialogs/EnvironmentDialog';
import { ExportDialog } from '@/components/dialogs/ExportDialog';
import { ImportCurlDialog } from '@/components/dialogs/ImportCurlDialog';
import { ImportDialog } from '@/components/dialogs/ImportDialog';
import { SettingsDialog } from '@/components/dialogs/SettingsDialog';
import { ShortcutsDialog } from '@/components/dialogs/ShortcutsDialog';
import { EnvironmentPicker } from '@/components/layout/EnvironmentPicker';
import { FolderPane } from '@/components/layout/FolderPane';
import { SidebarResizer } from '@/components/layout/SidebarResizer';
import { UpdateBadge } from '@/components/layout/UpdateBadge';
import { TabStrip } from '@/components/layout/TabStrip';
import { RequestPane } from '@/components/request/RequestPane';
import { ResponsePane } from '@/components/response/ResponsePane';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { useToast } from '@/components/common/Toaster';
import { useHotkeys, type Hotkey } from '@/hooks/use-hotkeys';
import { formatBinding, resolveBindings, type CommandId } from '@/lib/shortcuts';
import { useProxyHealth } from '@/hooks/use-proxy-health';
import { useSendRequest } from '@/hooks/use-send-request';
import { useTheme } from '@/hooks/use-theme';
import { createRequest } from '@/lib/factories';
import { draftChanges } from '@/lib/draft';
import { clampSidebarWidth } from '@/lib/sidebar';
import { useWorkspace } from '@/state/workspace-store';
import { IconButton } from '@/components/common/IconButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';

type Overlay =
  | 'palette'
  | 'palette.requests'
  | 'palette.workspaces'
  | 'palette.commands'
  | 'palette.tabs'
  | 'environments'
  | 'settings'
  | 'curl'
  | 'import'
  | 'export'
  | 'shortcuts'
  | null;

export function Workbench() {
  const { state, dispatch, activeRequest, activeFolder } = useWorkspace();
  const { toast } = useToast();
  const { status: proxyStatus } = useProxyHealth();
  const { sending, send, cancel, scriptLogs, scriptTests } = useSendRequest(proxyStatus);
  const [overlay, setOverlay] = useState<Overlay>(null);
  /**
   * A request the sidebar should reveal. The nonce is what makes asking twice
   * for the same request count twice.
   */
  const [locate, setLocate] = useState<{ id: string; nonce: number } | null>(null);
  /** What the export dialog opens ticked; undefined means the whole workspace. */
  const [exporting, setExporting] = useState<string[] | undefined>(undefined);
  /** Tabs waiting on an answer about their unsaved edits. */
  const [closing, setClosing] = useState<string[] | null>(null);
  const openExport = (selection?: string[]) => {
    setExporting(selection);
    setOverlay('export');
  };
  // Kept in settings rather than component state: someone who narrows the
  // window and hides the tree means it, and should not have to say so again on
  // the next launch.
  const sidebarVisible = !state.settings.sidebarCollapsed;
  const sidebarWidth = clampSidebarWidth(state.settings.sidebarWidth);
  const setSidebarVisible = (visible: boolean) =>
    dispatch({ type: 'settings/update', patch: { sidebarCollapsed: !visible } });

  useTheme(state.settings);

  const environments = state.environments.filter(
    (environment) => environment.workspaceId === state.activeWorkspaceId && !environment.isBase,
  );

  const newRequest = () =>
    dispatch({
      type: 'request/create',
      request: createRequest({
        workspaceId: state.activeWorkspaceId,
        folderId: activeRequest?.folderId ?? null,
        name: 'New request',
        sortIndex: state.requests.length,
      }),
    });

  /*
    Closing a tab is the one place unsaved work can disappear, so it is the one
    place that asks. Everything that closes tabs — the X, middle click, the tab
    menu and ⌘W — comes through here, so the question is asked once and in one
    voice rather than at three call sites that can drift apart.
  */
  const unsavedAmong = (ids: string[]) =>
    ids.filter((id) => {
      const draft = state.drafts[id];
      const saved = state.requests.find((request) => request.id === id);
      return draft && saved && draftChanges(saved, draft).length > 0;
    });

  const closeTabs = (ids: string[]) => {
    if (ids.length === 0) return;
    if (unsavedAmong(ids).length > 0) {
      setClosing(ids);
      return;
    }
    for (const id of ids) dispatch({ type: 'request/close-tab', id });
  };

  const finishClosing = (save: boolean) => {
    const ids = closing ?? [];
    setClosing(null);
    for (const id of ids) {
      if (save) dispatch({ type: 'request/save', id });
      dispatch({ type: 'request/close-tab', id });
    }
  };

  const saveActive = () => {
    if (!state.activeRequestId) return;
    if (!state.drafts[state.activeRequestId]) {
      toast({ title: 'Nothing to save', description: 'This request has no unsaved changes.', kind: 'info' });
      return;
    }
    dispatch({ type: 'request/save', id: state.activeRequestId });
  };

  const sendActive = () => {
    if (!activeRequest) {
      toast({ title: 'Nothing to send', description: 'Open a request first.', kind: 'info' });
      return;
    }
    void send(activeRequest);
  };

  /*
    Every shortcut in the app comes from here, so what the screen shows and what
    the keyboard does cannot drift apart — and rebinding one in the shortcuts
    screen moves the handler, the hint on the button and the hint in the palette
    together.
  */
  const bindings = resolveBindings(state.settings);
  const bind = (id: CommandId, handler: () => void): Hotkey => ({
    ...bindings[id],
    allowInInput: true,
    handler,
  });

  useHotkeys([
    bind('palette', () => setOverlay('palette')),
    bind('palette.requests', () => setOverlay('palette.requests')),
    bind('palette.workspaces', () => setOverlay('palette.workspaces')),
    bind('palette.commands', () => setOverlay('palette.commands')),
    bind('send', sendActive),
    bind('newRequest', newRequest),
    bind('environments', () => setOverlay('environments')),
    bind('toggleSidebar', () => setSidebarVisible(!sidebarVisible)),
    bind('settings', () => setOverlay('settings')),
    bind('saveRequest', saveActive),
    bind('searchTabs', () => setOverlay('palette.tabs')),
    bind('closeTab', () => {
      if (state.activeRequestId) closeTabs([state.activeRequestId]);
    }),
  ]);

  const commands: Command[] = [
    { id: 'new-request', label: 'New request', icon: <FilePlus2 size={13} />, hint: formatBinding(bindings.newRequest), run: newRequest },
    { id: 'send', label: 'Send request', icon: <Send size={13} />, hint: formatBinding(bindings.send), run: sendActive },
    { id: 'save', label: 'Save the request', icon: <Save size={13} />, hint: formatBinding(bindings.saveRequest), run: saveActive },
    { id: 'search-tabs', label: 'Search the open tabs', icon: <Search size={13} />, hint: formatBinding(bindings.searchTabs), run: () => setOverlay('palette.tabs') },
    { id: 'environments', label: 'Edit environments', icon: <Layers size={13} />, hint: formatBinding(bindings.environments), run: () => setOverlay('environments') },
    { id: 'import-curl', label: 'Import from curl', icon: <Terminal size={13} />, run: () => setOverlay('curl') },
    { id: 'import-file', label: 'Import from another tool', icon: <FolderInput size={13} />, run: () => setOverlay('import') },
    { id: 'export', label: 'Export requests and environments', icon: <Download size={13} />, run: () => openExport() },
    { id: 'settings', label: 'Settings', icon: <Settings size={13} />, hint: formatBinding(bindings.settings), run: () => setOverlay('settings') },
    { id: 'shortcuts', label: 'Keyboard shortcuts', icon: <Keyboard size={13} />, run: () => setOverlay('shortcuts') },
    {
      id: 'layout',
      label: state.settings.layout === 'horizontal' ? 'Stack the panes' : 'Place panes side by side',
      icon: state.settings.layout === 'horizontal' ? <Rows2 size={13} /> : <Columns2 size={13} />,
      run: () =>
        dispatch({
          type: 'settings/update',
          patch: { layout: state.settings.layout === 'horizontal' ? 'vertical' : 'horizontal' },
        }),
    },
  ];

  return (
    <div
      className="workbench"
      data-sidebar={sidebarVisible ? 'visible' : 'hidden'}
      style={
        {
          '--sidebar-w': `${sidebarWidth}px`,
          '--json-key': state.settings.jsonTheme.key,
          '--json-string': state.settings.jsonTheme.string,
          '--json-number': state.settings.jsonTheme.number,
          '--json-boolean': state.settings.jsonTheme.boolean,
          '--json-null': state.settings.jsonTheme.null,
          '--json-punct': state.settings.jsonTheme.punctuation,
        } as React.CSSProperties
      }
    >
      <Sidebar
        onImportCurl={() => setOverlay('curl')}
        onImport={() => setOverlay('import')}
        onExport={openExport}
        locate={locate}
      />
      {sidebarVisible ? (
        <SidebarResizer
          width={sidebarWidth}
          onChange={(width) => dispatch({ type: 'settings/update', patch: { sidebarWidth: width } })}
        />
      ) : null}

      <main className="main">
        <div className="topbar">
          {/*
            One toggle, saying which way it goes. There used to be a second one
            inside the sidebar, for the width where the sidebar covered this
            bar; the overlay now starts below the bar instead, so this one is
            always reachable.
          */}
          <IconButton
            label={sidebarVisible ? 'Hide the sidebar' : 'Show the sidebar'}
            onClick={() => setSidebarVisible(!sidebarVisible)}
            hint={formatBinding(bindings.toggleSidebar)}
            testId="button-toggle-sidebar"
          >
            {sidebarVisible ? <PanelLeftClose /> : <PanelLeft />}
          </IconButton>

          <TabStrip
            onLocate={(id) => setLocate({ id, nonce: Date.now() })}
            onClose={closeTabs}
            onNew={newRequest}
            onSearch={() => setOverlay('palette.tabs')}
            newHint={formatBinding(bindings.newRequest)}
            searchHint={formatBinding(bindings.searchTabs)}
          />

          <div className="topbar-actions">
            <EnvironmentPicker onManage={() => setOverlay('environments')} />
            <IconButton label="Environments"
              onClick={() => setOverlay('environments')}
              hint={formatBinding(bindings.environments)}
              testId="button-environments"
            >
              <Layers />
            </IconButton>
            <IconButton label="Switch pane layout"
              onClick={() =>
                dispatch({
                  type: 'settings/update',
                  patch: { layout: state.settings.layout === 'horizontal' ? 'vertical' : 'horizontal' },
                })
              }
              testId="button-toggle-layout"
            >
              {state.settings.layout === 'horizontal' ? <Rows2 /> : <Columns2 />}
            </IconButton>
            <UpdateBadge />
            <IconButton label="Settings"
              onClick={() => setOverlay('settings')}
              hint={formatBinding(bindings.settings)}
              testId="button-settings"
            >
              <Settings />
            </IconButton>
          </div>
        </div>

        {activeFolder ? (
          <FolderPane folder={activeFolder} onExport={openExport} />
        ) : activeRequest ? (
          <ResizablePanelGroup
            className="panes"
            direction={state.settings.layout}
            autoSaveId={`workbench-panes-${state.settings.layout}`}
          >
            <ResizablePanel defaultSize={50} minSize={22} order={1}>
              <RequestPane request={activeRequest} sending={sending} onSend={sendActive} onCancel={cancel} />
            </ResizablePanel>
            <ResizableHandle className="pane-divider" />
            <ResizablePanel defaultSize={50} minSize={22} order={2}>
              <ResponsePane
                requestId={activeRequest.id}
                sending={sending}
                scriptLogs={scriptLogs}
                scriptTests={scriptTests}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="empty" data-testid="empty-workspace">
            <div>
              <div className="empty-icon">
                <Send size={19} />
              </div>
              <h3>No request open</h3>
              <p>
                Pick one from the sidebar, or press <span className="kbd">{formatBinding(bindings.newRequest)}</span> to start a new one.
              </p>
              <Button style={{ marginTop: 14 }} onClick={newRequest} data-testid="button-empty-new-request">
                <FilePlus2 /> New request
              </Button>
            </div>
          </div>
        )}
      </main>

      {overlay?.startsWith('palette') ? (
        <CommandPalette
          commands={commands}
          mode={
            overlay === 'palette.requests'
              ? 'requests'
              : overlay === 'palette.workspaces'
                ? 'workspaces'
                : overlay === 'palette.commands'
                  ? 'commands'
                  : overlay === 'palette.tabs'
                    ? 'tabs'
                    : 'all'
          }
          onClose={() => setOverlay(null)}
        />
      ) : null}
      {overlay === 'environments' ? <EnvironmentDialog onClose={() => setOverlay(null)} /> : null}
      {overlay === 'settings' ? (
        <SettingsDialog
          onClose={() => setOverlay(null)}
          proxyStatus={proxyStatus}
          onOpenShortcuts={() => setOverlay('shortcuts')}
        />
      ) : null}
      {overlay === 'curl' ? <ImportCurlDialog onClose={() => setOverlay(null)} /> : null}
      {overlay === 'import' ? <ImportDialog onClose={() => setOverlay(null)} /> : null}
      {overlay === 'export' ? (
        <ExportDialog initialSelection={exporting} onClose={() => setOverlay(null)} />
      ) : null}
      {overlay === 'shortcuts' ? <ShortcutsDialog onClose={() => setOverlay(null)} /> : null}
      {closing ? (
        <ConfirmDialog
          title={closing.length === 1 ? 'Save before closing?' : 'Save before closing these tabs?'}
          message={
            <>
              {unsavedAmong(closing)
                .map((id) => state.requests.find((request) => request.id === id)?.name ?? 'A request')
                .join(', ')}{' '}
              {unsavedAmong(closing).length === 1 ? 'has' : 'have'} changes that were never saved. Closing without
              saving throws them away.
            </>
          }
          confirmLabel="Save and close"
          secondaryLabel="Close without saving"
          tone="default"
          onConfirm={() => finishClosing(true)}
          onSecondary={() => finishClosing(false)}
          onCancel={() => setClosing(null)}
        />
      ) : null}
    </div>
  );
}
