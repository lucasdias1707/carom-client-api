import { useState } from 'react';
import { Check, ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react';
import { AppMark } from '@/components/common/AppMark';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ContextMenu, type MenuEntry } from '@/components/common/ContextMenu';
import { PromptDialog } from '@/components/common/PromptDialog';
import { createEnvironment, createWorkspace } from '@/lib/factories';
import { useDeleteWithUndo } from '@/hooks/use-delete-with-undo';
import { useWorkspace } from '@/state/workspace-store';

/** Workspace identity in the sidebar header, doubling as the switcher. */
export function WorkspaceMenu() {
  const { state, dispatch, t, tNodes } = useWorkspace();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [prompt, setPrompt] = useState<'create' | 'rename' | null>(null);
  const [confirming, setConfirming] = useState(false);
  const deleteWithUndo = useDeleteWithUndo();

  const active = state.workspaces.find((workspace) => workspace.id === state.activeWorkspaceId);
  const requestCount = state.requests.filter((request) => request.workspaceId === state.activeWorkspaceId).length;

  const entries: MenuEntry[] = [
    ...state.workspaces.map<MenuEntry>((workspace) => ({
      kind: 'item',
      label: workspace.name,
      icon: workspace.id === state.activeWorkspaceId ? <Check size={13} /> : <span style={{ width: 13 }} />,
      onSelect: () => dispatch({ type: 'workspace/activate', id: workspace.id }),
    })),
    { kind: 'separator' },
    { kind: 'item', label: t('workspace.new'), icon: <Plus size={13} />, onSelect: () => setPrompt('create') },
    { kind: 'item', label: t('workspace.rename'), icon: <Pencil size={13} />, onSelect: () => setPrompt('rename') },
  ];

  if (state.workspaces.length > 1) {
    entries.push({
      kind: 'item',
      label: t('workspace.delete'),
      icon: <Trash2 size={13} />,
      danger: true,
      onSelect: () => setConfirming(true),
    });
  }

  return (
    <>
      <button
        className="workspace-button"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setMenu({ x: rect.left, y: rect.bottom + 4 });
        }}
        data-testid="button-workspace-menu"
      >
        <span className="brand-mark">
          <AppMark size={13} />
        </span>
        <span className="brand-text">
          <span className="brand-name truncate">{active?.name ?? 'Workspace'}</span>
          <span className="brand-sub">
            {t('count.requests', { count: requestCount })}
          </span>
        </span>
        <ChevronDown size={13} style={{ color: 'var(--text-faint)' }} />
      </button>

      {menu ? <ContextMenu x={menu.x} y={menu.y} entries={entries} onClose={() => setMenu(null)} /> : null}

      {confirming ? (
        <ConfirmDialog
          title={t('workspace.deleteTitle')}
          message={tNodes('workspace.deleteMessage', {
            name: <strong>{active?.name}</strong>,
            requests: t('count.requests', { count: requestCount }),
          })}
          confirmLabel={t('workspace.delete')}
          requireText={active?.name}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            deleteWithUndo(
              { type: 'workspace/delete', id: state.activeWorkspaceId },
              {
                title: t('workspace.deleted', { name: active?.name ?? t('workspace.deletedFallback') }),
                detail: t('workspace.deletedDetail'),
              },
            );
            setConfirming(false);
          }}
        />
      ) : null}

      {prompt === 'create' ? (
        <PromptDialog
          title={t('workspace.new')}
          description={t('workspace.newDescription')}
          label={t('workspace.nameLabel')}
          initialValue="New workspace"
          confirmLabel={t('workspace.create')}
          onCancel={() => setPrompt(null)}
          onConfirm={(name) => {
            const workspace = createWorkspace(name);
            dispatch({
              type: 'workspace/create',
              workspace,
              environment: createEnvironment(workspace.id, t('import.baseEnvironment'), true, []),
            });
            setPrompt(null);
          }}
        />
      ) : null}

      {prompt === 'rename' ? (
        <PromptDialog
          title={t('workspace.rename')}
          label={t('workspace.nameLabel')}
          initialValue={active?.name ?? ''}
          onCancel={() => setPrompt(null)}
          onConfirm={(name) => {
            dispatch({ type: 'workspace/rename', id: state.activeWorkspaceId, name });
            setPrompt(null);
          }}
        />
      ) : null}
    </>
  );
}
