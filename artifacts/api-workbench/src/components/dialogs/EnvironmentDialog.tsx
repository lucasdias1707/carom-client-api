import { useState } from 'react';
import { ArrowDownToLine, Plus, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { CopyVariablesDialog } from '@/components/dialogs/CopyVariablesDialog';
import { Dialog } from '@/components/common/Dialog';
import { KeyValueTable } from '@/components/request/KeyValueTable';
import { createEnvironment, ENVIRONMENT_COLORS } from '@/lib/factories';
import { useDeleteWithUndo } from '@/hooks/use-delete-with-undo';
import { useWorkspace } from '@/state/workspace-store';
import type { KeyValue } from '@/types';
import { IconButton } from '@/components/common/IconButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Editor for the base environment plus any number of overlays. The base always
 * applies; the selected overlay is layered on top when a request is sent.
 */
export function EnvironmentDialog({ onClose }: { onClose: () => void }) {
  const { state, dispatch, t, tNodes } = useWorkspace();
  const environments = state.environments.filter((environment) => environment.workspaceId === state.activeWorkspaceId);
  const base = environments.find((environment) => environment.isBase) ?? environments[0];
  // Open on whatever is in use, so managing follows straight on from picking.
  const [selectedId, setSelectedId] = useState(state.activeEnvironmentId ?? base?.id ?? '');
  const [copying, setCopying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const deleteWithUndo = useDeleteWithUndo();

  const selected = environments.find((environment) => environment.id === selectedId) ?? base;
  if (!selected) return null;

  const setVariables = (variables: KeyValue[]) =>
    dispatch({ type: 'environment/update', id: selected.id, patch: { variables } });

  const addEnvironment = () => {
    const overlays = environments.filter((environment) => !environment.isBase).length;
    const environment = createEnvironment(
      state.activeWorkspaceId,
      `Environment ${overlays + 1}`,
      false,
      [],
      ENVIRONMENT_COLORS[(overlays + 1) % ENVIRONMENT_COLORS.length],
    );
    dispatch({ type: 'environment/create', environment });
    setSelectedId(environment.id);
  };

  return (
    <Dialog
      title={t('environments.title')}
      description={t('environments.description', { syntax: t('environments.syntax') })}
      onClose={onClose}
      wide
      testId="dialog-environments"
      footer={
        <>
          <span className="spacer" />
          <Button onClick={onClose} data-testid="button-close-environments">
            {t('common.done')}
          </Button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr', gap: 14, alignItems: 'start' }}>
        <div>
          <div className="section-label">
            {t('environments.title')}
            <span className="spacer" />
            <IconButton label={t('environments.add')} onClick={addEnvironment} testId="button-add-environment">
              <Plus />
            </IconButton>
          </div>
          <div style={{ display: 'grid', gap: 2 }}>
            {environments.map((environment) => (
              <button
                key={environment.id}
                className={`tree-row ${environment.id === selected.id ? 'selected' : ''}`}
                style={{ paddingLeft: 8 }}
                onClick={() => setSelectedId(environment.id)}
                data-testid={`button-environment-${environment.id}`}
              >
                <span className="var-dot" style={{ background: environment.color }} />
                <span className="tree-name truncate">{environment.name}</span>
                {environment.isBase ? <span className="tree-count">{t('environments.base')}</span> : null}
              </button>
            ))}
          </div>
        </div>

        <div className="stack" style={{ gap: 10 }}>
          <div className="section-label">
            {t(selected.isBase ? 'environments.baseVariables' : 'common.name')}
            <span className="spacer" />
            {selected.isBase ? null : (
              <Button variant="destructive"
                onClick={() => setConfirming(true)}
                data-testid="button-delete-environment"
              >
                <Trash2 /> {t('common.delete')}
              </Button>
            )}
          </div>
          {selected.isBase ? null : (
            <Input
              value={selected.name}
              data-autofocus
              onChange={(event) => dispatch({ type: 'environment/update', id: selected.id, patch: { name: event.target.value } })}
              aria-label={t('environments.nameAria')}
              data-testid="input-environment-name"
            />
          )}

          <div className="section-label" style={{ margin: 0 }}>
            {t('folder.colour')}
            <span className="spacer" />
            <span className="hint" style={{ fontSize: 'var(--fs-10)' }}>
              {t('environments.colourHint')}
            </span>
          </div>
          <div className="swatches">
            {ENVIRONMENT_COLORS.map((color) => (
              <button
                key={color}
                className={`swatch ${selected.color === color ? 'active' : ''}`}
                style={{ background: color }}
                onClick={() => dispatch({ type: 'environment/update', id: selected.id, patch: { color } })}
                aria-label={t('environments.useColour', { colour: color })}
                data-testid={`swatch-${color.replace('#', '')}`}
              />
            ))}
            <input
              type="color"
              className="swatch-custom"
              value={selected.color}
              onChange={(event) => dispatch({ type: 'environment/update', id: selected.id, patch: { color: event.target.value } })}
              aria-label={t('environments.customColour')}
              data-testid="input-environment-color"
            />
          </div>
          <div className="section-label" style={{ margin: 0 }}>
            {t('environments.variables')}
            <span className="spacer" />
            <Button variant="secondary" size="sm" onClick={() => setCopying(true)} data-testid="button-copy-variables">
              <ArrowDownToLine /> {t('environments.copyFrom')}
            </Button>
          </div>
          <KeyValueTable
            items={selected.variables}
            onChange={setVariables}
            keyPlaceholder={t('folder.variablePlaceholder')}
            testPrefix={`env-${selected.isBase ? 'base' : 'overlay'}`}
          />
          <p className="hint">
            {t(selected.isBase ? 'environments.baseHint' : 'environments.overlayHint')}
          </p>
        </div>
      </div>

      {confirming ? (
        <ConfirmDialog
          title={t('environments.deleteTitle')}
          message={tNodes('environments.deleteMessage', {
            name: <strong>{selected.name}</strong>,
            count: selected.variables.length,
          })}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            deleteWithUndo(
              { type: 'environment/delete', id: selected.id },
              { title: t('environments.deleted', { name: selected.name }) },
            );
            setSelectedId(base.id);
            setConfirming(false);
          }}
        />
      ) : null}

      {copying ? (
        <CopyVariablesDialog
          destination={selected}
          onApply={setVariables}
          onClose={() => setCopying(false)}
        />
      ) : null}
    </Dialog>
  );
}
