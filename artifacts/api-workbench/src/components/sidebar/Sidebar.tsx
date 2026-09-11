import { useEffect, useMemo, useState } from 'react';
import { Braces, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Copy, Download, FilePlus2, FolderInput, FolderPlus, Pencil, Search, Terminal, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ContextMenu, type MenuEntry } from '@/components/common/ContextMenu';
import { PromptDialog } from '@/components/common/PromptDialog';
import { subtreeSelection } from '@/lib/export';
import { createFolder, createRequest } from '@/lib/factories';
import { buildTree, countRequests, isDescendantFolder, type TreeNode } from '@/state/selectors';
import { WorkspaceMenu } from '@/components/sidebar/WorkspaceMenu';
import { useDeleteWithUndo } from '@/hooks/use-delete-with-undo';
import { useWorkspace } from '@/state/workspace-store';
import type { Folder, RequestRecord } from '@/types';
import { IconButton } from '@/components/common/IconButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type MenuState = { x: number; y: number; entries: MenuEntry[] } | null;
type PromptState =
  | { kind: 'new-folder'; parentId: string | null }
  | { kind: 'rename-folder'; folder: Folder }
  | { kind: 'rename-request'; request: RequestRecord }
  | null;

type ConfirmState = { kind: 'folder'; folder: Folder } | { kind: 'request'; request: RequestRecord } | null;

export function Sidebar({
  onImportCurl,
  onImport,
  onExport,
  locate,
}: {
  onImportCurl: () => void;
  onImport: () => void;
  /** Opens the export dialog, ticking what was clicked. Nothing means all of it. */
  onExport: (selection?: string[]) => void;
  /**
   * A request to reveal, and a nonce so asking for the same one twice still
   * counts as asking twice.
   */
  locate?: { id: string; nonce: number } | null;
}) {
  const { state, dispatch, chainFor, t, tNodes } = useWorkspace();
  const [located, setLocated] = useState<string | null>(null);
  const deleteWithUndo = useDeleteWithUndo();
  const [search, setSearch] = useState('');

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  /**
   * Reveal a request asked for from elsewhere — today the tab's "Locate".
   *
   * Expanding is enough on its own: the tree only renders what is open, so
   * scrolling has to wait for the row to exist, which is why the scroll happens
   * a frame later rather than in the same pass.
   */
  useEffect(() => {
    if (!locate) return;
    const request = state.requests.find((item) => item.id === locate.id);
    if (!request) return;

    const ancestors = chainFor(request.folderId).map((folder) => folder.id);
    setCollapsed((current) => {
      const next = { ...current };
      for (const id of ancestors) delete next[id];
      return next;
    });
    dispatch({ type: 'request/open', id: request.id });
    setLocated(request.id);

    const frame = requestAnimationFrame(() => {
      document
        .querySelector(`[data-testid="button-request-${request.id}"]`)
        ?.scrollIntoView({ block: 'nearest' });
    });
    // Long enough to catch the eye, short enough not to look like selection.
    const fade = window.setTimeout(() => setLocated(null), 1200);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(fade);
    };
    // The nonce is the signal: locating the same request twice must still fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locate?.id, locate?.nonce]);
  const [menu, setMenu] = useState<MenuState>(null);
  const [prompt, setPrompt] = useState<PromptState>(null);
  const [confirming, setConfirming] = useState<ConfirmState>(null);
  /** What is being dragged, and which row it is currently hovering. */
  const [dragging, setDragging] = useState<{ kind: 'request' | 'folder'; id: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const tree = useMemo(() => buildTree(state, search), [state, search]);
  const isSearching = search.trim().length > 0;

  const addRequest = (folderId: string | null) => {
    dispatch({
      type: 'request/create',
      request: createRequest({
        workspaceId: state.activeWorkspaceId,
        folderId,
        name: t('sidebar.newRequest'),
        sortIndex: state.requests.length,
      }),
    });
  };

  /**
   * Clicking a folder does both things it plausibly means: it shows what is
   * inside, and it opens the folder's own pane — where its variables, auth and
   * scripts live. Before this, that pane was only reachable by right-clicking.
   */
  const openFolder = (folderId: string, isOpen: boolean) => {
    setCollapsed((current) => ({ ...current, [folderId]: isOpen }));
    dispatch({ type: 'folder/open', id: folderId });
  };

  /**
   * Collapse everything, or open everything.
   *
   * Which one the button does is decided by what is on screen: if anything is
   * still open it collapses, otherwise it expands. One button, and it always
   * does the thing that changes what you can see.
   */
  const workspaceFolders = state.folders.filter((item) => item.workspaceId === state.activeWorkspaceId);

  /** How many requests a folder would take with it, however deep they sit. */
  const requestsUnder = (folderId: string) => {
    const subtree = new Set([folderId]);
    for (let grew = true; grew; ) {
      grew = false;
      for (const item of workspaceFolders) {
        if (item.parentId && subtree.has(item.parentId) && !subtree.has(item.id)) {
          subtree.add(item.id);
          grew = true;
        }
      }
    }
    return state.requests.filter((request) => request.folderId && subtree.has(request.folderId)).length;
  };
  const anyExpanded = workspaceFolders.some((item) => !collapsed[item.id]);
  const toggleAll = () => {
    if (!anyExpanded) {
      setCollapsed({});
      return;
    }
    setCollapsed(Object.fromEntries(workspaceFolders.map((item) => [item.id, true])));
  };

  // Both go through the export dialog rather than writing a file on the spot:
  // it starts ticked on what was clicked, so the one-click case is one extra
  // click, and everything else — a second folder, an environment, where to put
  // it — is now reachable from the same place.
  const saveFolder = (folder: Folder) => onExport(subtreeSelection(state, folder.id));
  const saveRequest = (request: RequestRecord) => onExport([request.id]);

  const folderMenu = (folder: Folder): MenuEntry[] => [
    { kind: 'item', label: t('sidebar.newRequest'), icon: <FilePlus2 size={13} />, onSelect: () => addRequest(folder.id) },
    { kind: 'item', label: t('sidebar.newFolder'), icon: <FolderPlus size={13} />, onSelect: () => setPrompt({ kind: 'new-folder', parentId: folder.id }) },
    { kind: 'separator' },
    { kind: 'item', label: t('sidebar.folderSettings'), icon: <Braces size={13} />, onSelect: () => dispatch({ type: 'folder/open', id: folder.id }) },
    { kind: 'item', label: t('common.rename'), icon: <Pencil size={13} />, onSelect: () => setPrompt({ kind: 'rename-folder', folder }) },
    {
      kind: 'item',
      label: t('sidebar.exportFolder'),
      icon: <Download size={13} />,
      onSelect: () => saveFolder(folder),
    },
    {
      kind: 'item',
      label: t('sidebar.deleteFolder'),
      icon: <Trash2 size={13} />,
      danger: true,
      onSelect: () => setConfirming({ kind: 'folder', folder }),
    },
  ];

  const requestMenu = (request: RequestRecord): MenuEntry[] => [
    { kind: 'item', label: t('common.rename'), icon: <Pencil size={13} />, onSelect: () => setPrompt({ kind: 'rename-request', request }) },
    { kind: 'item', label: t('common.duplicate'), icon: <Copy size={13} />, onSelect: () => dispatch({ type: 'request/duplicate', id: request.id }) },
    { kind: 'item', label: t('sidebar.exportRequest'), icon: <Download size={13} />, onSelect: () => saveRequest(request) },
    { kind: 'separator' },
    {
      kind: 'item',
      label: t('sidebar.deleteRequest'),
      icon: <Trash2 size={13} />,
      danger: true,
      onSelect: () => setConfirming({ kind: 'request', request }),
    },
  ];

  /**
   * Right-clicking the tree itself, rather than a row in it.
   *
   * Every row stops its own context menu from bubbling, so what reaches here is
   * the empty space — and the empty space means the root of the workspace.
   */
  const rootMenu = (): MenuEntry[] => [
    { kind: 'item', label: t('sidebar.newRequest'), icon: <FilePlus2 size={13} />, onSelect: () => addRequest(null) },
    {
      kind: 'item',
      label: t('sidebar.newFolder'),
      icon: <FolderPlus size={13} />,
      onSelect: () => setPrompt({ kind: 'new-folder', parentId: null }),
    },
  ];

  const openMenu = (event: React.MouseEvent, entries: MenuEntry[]) => {
    event.preventDefault();
    event.stopPropagation();
    setMenu({ x: event.clientX, y: event.clientY, entries });
  };

  /** Whether the current drag may be dropped on this row. */
  const canDrop = (targetKind: 'folder' | 'root', targetId: string | null) => {
    if (!dragging) return false;
    if (dragging.kind === 'folder') {
      if (targetKind === 'root') return true;
      return !isDescendantFolder(state, targetId!, dragging.id);
    }
    return true;
  };

  const handleDrop = (folderId: string | null, beforeId?: string | null) => {
    if (!dragging) return;
    if (dragging.kind === 'request') {
      dispatch({ type: 'request/move', id: dragging.id, folderId, beforeId: beforeId ?? null });
    } else {
      dispatch({ type: 'folder/move', id: dragging.id, parentId: folderId });
    }
    setDragging(null);
    setDropTarget(null);
  };

  const renderNodes = (nodes: TreeNode[]) =>
    nodes.map((node) => {
      if (node.kind === 'request') {
        const request = node.request;
        const selected = request.id === state.activeRequestId;
        return (
          /*
            The row truncates, so the name it shows is often not the whole name.
            A `title` carried one or the other — it read `url || name`, so a
            request with a URL never showed its own name — and only after the
            browser's own delay. This shows both, straight away, and on keyboard
            focus too. The content only mounts while it is open, so a tree of
            hundreds of rows pays for the wrapper, not for the card.
          */
          <Tooltip key={request.id}>
            <TooltipTrigger asChild>
          <div
            className={`tree-row ${selected ? 'selected' : ''} ${located === request.id ? 'located' : ''} ${
              dragging?.id === request.id ? 'dragging' : ''
            } ${dropTarget === `before:${request.id}` ? 'drop-before' : ''}`}
            style={{ paddingLeft: 8 + node.depth * 12 }}
            role="button"
            tabIndex={0}
            draggable={!isSearching}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', request.id);
              setDragging({ kind: 'request', id: request.id });
            }}
            onDragEnd={() => {
              setDragging(null);
              setDropTarget(null);
            }}
            onDragOver={(event) => {
              if (!dragging || dragging.id === request.id) return;
              event.preventDefault();
              // dragover bubbles; without this the root drop zone overwrites
              // the target on its way up and nothing highlights.
              event.stopPropagation();
              event.dataTransfer.dropEffect = 'move';
              setDropTarget(`before:${request.id}`);
            }}
            onDragLeave={() => setDropTarget((current) => (current === `before:${request.id}` ? null : current))}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              handleDrop(request.folderId, request.id);
            }}
            onClick={() => dispatch({ type: 'request/open', id: request.id })}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                dispatch({ type: 'request/open', id: request.id });
              }
            }}
            onContextMenu={(event) => openMenu(event, requestMenu(request))}
            data-testid={`button-request-${request.id}`}
          >
            <span className={`tree-method m-${request.method.toLowerCase()}`}>{request.method}</span>
            <span className="tree-name truncate">{request.name}</span>
          </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[420px]">
              <div className="font-medium">{request.name}</div>
              {request.url ? (
                <div className="mt-0.5 font-mono text-[length:var(--fs-11)] opacity-70 break-all">{request.url}</div>
              ) : null}
            </TooltipContent>
          </Tooltip>
        );
      }

      const folder = node.folder;
      const isOpen = isSearching || !collapsed[folder.id];
      const hasVariables = (folder.variables ?? []).some((item) => item.enabled && item.key.trim());
      return (
        <div key={folder.id}>
          <div
            className={`tree-row ${folder.id === state.activeFolderId ? 'selected' : ''} ${
              dragging?.id === folder.id ? 'dragging' : ''
            } ${dropTarget === `into:${folder.id}` ? 'drop-into' : ''}`}
            style={{ paddingLeft: 4 + node.depth * 12 }}
            role="button"
            tabIndex={0}
            aria-expanded={isOpen}
            draggable={!isSearching}
            onDragStart={(event) => {
              event.stopPropagation();
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', folder.id);
              setDragging({ kind: 'folder', id: folder.id });
            }}
            onDragEnd={() => {
              setDragging(null);
              setDropTarget(null);
            }}
            onDragOver={(event) => {
              if (!canDrop('folder', folder.id) || dragging?.id === folder.id) return;
              event.preventDefault();
              event.stopPropagation();
              event.dataTransfer.dropEffect = 'move';
              setDropTarget(`into:${folder.id}`);
            }}
            onDragLeave={() => setDropTarget((current) => (current === `into:${folder.id}` ? null : current))}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!canDrop('folder', folder.id)) return;
              // Dropping onto a collapsed folder should reveal what just moved.
              setCollapsed((current) => ({ ...current, [folder.id]: false }));
              handleDrop(folder.id);
            }}
            onClick={() => openFolder(folder.id, isOpen)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openFolder(folder.id, isOpen);
              }
            }}
            onContextMenu={(event) => openMenu(event, folderMenu(folder))}
            data-testid={`button-folder-${folder.id}`}
          >
            <span className="tree-caret">{isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
            <span className="tree-folder-name truncate">{folder.name}</span>
            {hasVariables ? (
              <span className="folder-vars">
                <Braces size={10} />
              </span>
            ) : null}
            <span className="tree-count">{countRequests(node.children)}</span>
          </div>
          {isOpen ? renderNodes(node.children) : null}
        </div>
      );
    });

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <WorkspaceMenu />
        {/*
          The actions sit on their own row rather than fighting the workspace
          name for one line. The sidebar's own hide button used to live here
          too; there is a single toggle in the top bar now, and the narrow-window
          overlay starts below the top bar so that one stays reachable.
        */}
        <div className="sidebar-actions">
          <IconButton
            label={t(anyExpanded ? 'sidebar.collapseAll' : 'sidebar.expandAll')}
            onClick={toggleAll}
            disabled={workspaceFolders.length === 0}
            testId="button-toggle-all-folders"
          >
            {anyExpanded ? <ChevronsDownUp /> : <ChevronsUpDown />}
          </IconButton>
          <span className="flex-1" />
          <IconButton
            label={t('sidebar.newFolder')}
            onClick={() => setPrompt({ kind: 'new-folder', parentId: null })}
            testId="button-new-folder"
          >
            <FolderPlus />
          </IconButton>
          <IconButton label={t('sidebar.newRequest')} onClick={() => addRequest(null)} testId="button-new-request">
            <FilePlus2 />
          </IconButton>
        </div>
      </div>

      <div className="sidebar-search">
        <Search size={13} />
        <Input
          type="search"
          className="h-7 pl-[26px] pr-2 placeholder:text-[var(--text-faint)]"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('sidebar.filter')}
          aria-label={t('sidebar.filter')}
          data-testid="input-search-requests"
        />
      </div>

      <div
        className={`sidebar-tree ${dropTarget === 'root' ? 'drop-into' : ''}`}
        data-testid="sidebar-tree"
        onDragOver={(event) => {
          if (!canDrop('root', null)) return;
          event.preventDefault();
          setDropTarget('root');
        }}
        onDragLeave={() => setDropTarget((current) => (current === 'root' ? null : current))}
        onDrop={(event) => {
          event.preventDefault();
          handleDrop(null);
        }}
        onContextMenu={(event) => openMenu(event, rootMenu())}
      >
        {tree.length === 0 ? (
          <div className="tree-empty">{isSearching ? `Nothing matches “${search}”.` : 'No requests yet.'}</div>
        ) : (
          renderNodes(tree)
        )}
      </div>

      {/*
        Three labelled buttons do not fit a sidebar someone has narrowed, and
        the one that overflowed ended up under the resize handle. curl keeps
        its meaning as an icon with a tooltip; the two that name a direction
        keep their words.
      */}
      <div className="sidebar-foot">
        <IconButton label={t('sidebar.importCurl')} onClick={onImportCurl} testId="button-import-curl">
          <Terminal />
        </IconButton>
        <Button variant="ghost" size="sm" onClick={onImport} data-testid="button-import">
          <FolderInput /> Import
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onExport()} data-testid="button-export">
          <Download /> Export
        </Button>
      </div>

      {menu ? <ContextMenu x={menu.x} y={menu.y} entries={menu.entries} onClose={() => setMenu(null)} /> : null}

      {confirming?.kind === 'request' ? (
        <ConfirmDialog
          title={t('sidebar.deleteRequestTitle')}
          message={tNodes('sidebar.deleteRequestMessage', {
            name: <strong>{confirming.request.name}</strong>,
          })}
          onCancel={() => setConfirming(null)}
          onConfirm={() => {
            deleteWithUndo(
              { type: 'request/delete', id: confirming.request.id },
              { title: t('sidebar.deleted', { name: confirming.request.name }) },
            );
            setConfirming(null);
          }}
        />
      ) : null}

      {confirming?.kind === 'folder' ? (
        <ConfirmDialog
          title={t('sidebar.deleteFolderTitle')}
          message={tNodes('sidebar.deleteFolderMessage', {
            name: <strong>{confirming.folder.name}</strong>,
            count: requestsUnder(confirming.folder.id),
          })}
          onCancel={() => setConfirming(null)}
          onConfirm={() => {
            deleteWithUndo(
              { type: 'folder/delete', id: confirming.folder.id },
              {
                title: t('sidebar.deleted', { name: confirming.folder.name }),
                detail: t('sidebar.deletedFolderDetail'),
              },
            );
            setConfirming(null);
          }}
        />
      ) : null}

      {prompt?.kind === 'new-folder' ? (
        <PromptDialog
          title={t('sidebar.newFolder')}
          label={t('sidebar.newFolderName')}
          initialValue={t('sidebar.newFolder')}
          confirmLabel={t('sidebar.newFolderCreate')}
          onCancel={() => setPrompt(null)}
          onConfirm={(name) => {
            dispatch({
              type: 'folder/create',
              folder: createFolder(state.activeWorkspaceId, name, prompt.parentId, state.folders.length),
            });
            setPrompt(null);
          }}
        />
      ) : null}

      {prompt?.kind === 'rename-folder' ? (
        <PromptDialog
          title={t('sidebar.renameFolder')}
          label={t('sidebar.newFolderName')}
          initialValue={prompt.folder.name}
          onCancel={() => setPrompt(null)}
          onConfirm={(name) => {
            dispatch({ type: 'folder/rename', id: prompt.folder.id, name });
            setPrompt(null);
          }}
        />
      ) : null}

      {prompt?.kind === 'rename-request' ? (
        <PromptDialog
          title={t('sidebar.renameRequest')}
          label={t('sidebar.requestName')}
          initialValue={prompt.request.name}
          onCancel={() => setPrompt(null)}
          onConfirm={(name) => {
            dispatch({ type: 'request/rename', id: prompt.request.id, name });
            setPrompt(null);
          }}
        />
      ) : null}
    </aside>
  );
}
