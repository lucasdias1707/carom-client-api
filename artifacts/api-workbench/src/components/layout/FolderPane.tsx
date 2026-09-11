import type { MessageKey } from '@/locales/en';
import { useState } from 'react';
import { Download, FilePlus2, FolderPlus, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { AuthEditor } from '@/components/request/AuthEditor';
import { KeyValueTable } from '@/components/request/KeyValueTable';
import { ScriptEditor } from '@/components/request/ScriptEditor';
import { subtreeSelection } from '@/lib/export';
import { createFolder, createRequest } from '@/lib/factories';
import { LOCAL_VARIABLE_COLOR } from '@/lib/template';
import { folderPath } from '@/state/selectors';
import { useDeleteWithUndo } from '@/hooks/use-delete-with-undo';
import { useWorkspace } from '@/state/workspace-store';
import type { Auth, Folder } from '@/types';
import { IconButton } from '@/components/common/IconButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type FolderTab = 'variables' | 'auth' | 'scripts' | 'docs';

const TABS: Array<{ id: FolderTab; label: MessageKey }> = [
  { id: 'variables', label: 'folder.tab.variables' },
  { id: 'auth', label: 'request.tab.auth' },
  { id: 'scripts', label: 'request.tab.scripts' },
  { id: 'docs', label: 'request.tab.docs' },
];

/**
 * A folder's own pane, opened by clicking it in the sidebar.
 *
 * Everything a folder carries lives here rather than behind a right-click:
 * variables, the auth its contents inherit, and the scripts that wrap them.
 * That is the whole reason a folder is a unit and not just a label.
 */
export function FolderPane({ folder, onExport }: { folder: Folder; onExport: (selection?: string[]) => void }) {
  const { state, dispatch, chainFor, tableFor, t, tNodes } = useWorkspace();
  const [tab, setTab] = useState<FolderTab>('variables');
  const [confirming, setConfirming] = useState(false);
  const deleteWithUndo = useDeleteWithUndo();

  const patch = (changes: Partial<Folder>) => dispatch({ type: 'folder/update', id: folder.id, patch: changes });

  // A folder inherits from its ancestors, never from itself, so its own record
  // is dropped from the chain before it reaches the auth editor.
  const ancestors = chainFor(folder.parentId);
  const path = folderPath(state, folder.parentId);

  const childCount = state.requests.filter((request) => request.folderId === folder.id).length;
  // Everything below, however deep — the number the sidebar shows on the row.
  const subtree = new Set([folder.id]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const item of state.folders) {
      if (item.parentId && subtree.has(item.parentId) && !subtree.has(item.id)) {
        subtree.add(item.id);
        grew = true;
      }
    }
  }
  const nestedCount = state.requests.filter((request) => request.folderId && subtree.has(request.folderId)).length;

  const addRequest = () =>
    dispatch({
      type: 'request/create',
      request: createRequest({
        workspaceId: folder.workspaceId,
        folderId: folder.id,
        name: t('sidebar.newRequest'),
        sortIndex: state.requests.length,
      }),
    });

  return (
    <section className="pane" aria-label={t('pane.folder')} data-testid="folder-pane">
      <div className="folder-head">
        <Input
          className="folder-title"
          value={folder.name}
          onChange={(event) => patch({ name: event.target.value })}
          aria-label={t('folder.name')}
          data-testid="input-folder-name"
        />
        <IconButton label={t('folder.newRequest')} onClick={addRequest} testId="button-folder-new-request">
          <FilePlus2 />
        </IconButton>
        <IconButton label={t('folder.newFolder')}
          onClick={() =>
            dispatch({
              type: 'folder/create',
              folder: createFolder(folder.workspaceId, t('folder.newFolderName'), folder.id, state.folders.length),
            })
          }
          testId="button-folder-new-folder"
        >
          <FolderPlus />
        </IconButton>
        <IconButton label={t('folder.export')}
          onClick={() => onExport(subtreeSelection(state, folder.id))}
          testId="button-folder-export"
        >
          <Download />
        </IconButton>
        <IconButton label={t('folder.delete')} tone="danger"
          onClick={() => setConfirming(true)}
          testId="button-folder-delete"
        >
          <Trash2 />
        </IconButton>
      </div>

      <div className="pane-tabs">
        {TABS.map((item) => (
          <button
            key={item.id}
            className={`pane-tab ${tab === item.id ? 'active' : ''}`}
            onClick={() => setTab(item.id)}
            data-testid={`tab-folder-${item.id}`}
          >
            {t(item.label)}
            {item.id === 'variables' && folder.variables.length > 0 ? (
              <span className="badge">{folder.variables.length}</span>
            ) : null}
            {item.id === 'auth' && folder.auth.type !== 'inherit' ? (
              <span className="badge">{folder.auth.type}</span>
            ) : null}
            {item.id === 'scripts' && (folder.preScript.trim() || folder.postScript.trim()) ? (
              <span className="badge">{t('request.scriptsOn')}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="pane-body">
        {tab === 'variables' ? (
          <div className="pane-pad stack">
            <div className="section-label">
              <span className="var-dot" style={{ background: LOCAL_VARIABLE_COLOR }} />
              {t('folder.localVariables')}
            </div>
            <KeyValueTable
              items={folder.variables}
              onChange={(variables) => dispatch({ type: 'folder/variables', id: folder.id, variables })}
              keyPlaceholder={t('folder.variablePlaceholder')}
              testPrefix="folder-var"
            />
            <p className="hint">
              {t('folder.variablesHint')}
            </p>
          </div>
        ) : null}

        {tab === 'auth' ? (
          <AuthEditor
            auth={folder.auth}
            onChange={(auth: Auth) => patch({ auth })}
            chain={ancestors}
            subject="folder"
            variables={tableFor(folder.id)}
          />
        ) : null}

        {tab === 'scripts' ? (
          <ScriptEditor
            preScript={folder.preScript}
            postScript={folder.postScript}
            onChange={patch}
            subject="folder"
            testPrefix="folder"
          />
        ) : null}

        {tab === 'docs' ? (
          <div className="pane-pad stack">
            <div className="section-label">{t('folder.whereItSits')}</div>
            <p className="hint">
              {path.length > 0 ? t('folder.insidePath', { path: path.join(' / ') }) : t('folder.atRoot')}{' '}
              {t('folder.counts', {
                direct: t('count.requests', { count: childCount }),
                nested: t('count.requests', { count: nestedCount }),
              })}
            </p>
            <div className="section-label">{t('folder.colour')}</div>
            <input
              type="color"
              className=""
              style={{ width: 72, padding: 3 }}
              value={folder.color}
              onChange={(event) => patch({ color: event.target.value })}
              aria-label={t('folder.colourAria')}
              data-testid="input-folder-color"
            />
          </div>
        ) : null}
      </div>
      {confirming ? (
        <ConfirmDialog
          title={t('sidebar.deleteFolderTitle')}
          message={tNodes('sidebar.deleteFolderMessage', {
            name: <strong>{folder.name}</strong>,
            count: nestedCount,
          })}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            deleteWithUndo(
              { type: 'folder/delete', id: folder.id },
              {
                title: t('sidebar.deleted', { name: folder.name }),
                detail: t('sidebar.deletedFolderDetail'),
              },
            );
            setConfirming(false);
          }}
        />
      ) : null}
    </section>
  );
}
