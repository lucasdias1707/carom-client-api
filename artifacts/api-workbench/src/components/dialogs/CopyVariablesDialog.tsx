import { useMemo, useState } from 'react';
import { ArrowDownToLine } from 'lucide-react';
import { Dialog } from '@/components/common/Dialog';
import { row } from '@/lib/factories';
import { copyableVariables, mergeVariables, variableSources } from '@/lib/variables';
import { useWorkspace } from '@/state/workspace-store';
import type { Environment, KeyValue } from '@/types';
import { SelectField } from '@/components/common/SelectField';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

type CopyVariablesDialogProps = {
  destination: Environment;
  onApply: (variables: KeyValue[]) => void;
  onClose: () => void;
};

/**
 * Pull variables in from another environment or folder.
 *
 * Everything starts ticked except the names the destination already defines:
 * those are the ones where copying overwrites something, so they are the ones
 * worth deciding about rather than defaulting through.
 */
export function CopyVariablesDialog({ destination, onApply, onClose }: CopyVariablesDialogProps) {
  const { state, t } = useWorkspace();

  const sources = useMemo(
    () =>
      variableSources(
        state.environments.filter((item) => item.workspaceId === state.activeWorkspaceId),
        state.folders.filter((item) => item.workspaceId === state.activeWorkspaceId),
        destination.id,
      ),
    [state.environments, state.folders, state.activeWorkspaceId, destination.id],
  );

  const [sourceId, setSourceId] = useState(sources[0]?.id ?? '');
  const [withValues, setWithValues] = useState(true);
  const source = sources.find((item) => item.id === sourceId) ?? sources[0];

  const copyable = useMemo(
    () => (source ? copyableVariables(source.variables, destination.variables) : []),
    [source, destination.variables],
  );

  /**
   * Which names are ticked. Seeded from the source rather than stored across
   * sources: everything comes across except the names the destination already
   * has, since those are the ones where copying overwrites something and so
   * the ones worth a deliberate tick.
   *
   * Re-seeded during render when the source changes — React's own pattern for
   * state derived from props, and the reason switching source cannot leave a
   * tick belonging to the previous one.
   */
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (seededFor !== sourceId) {
    setSeededFor(sourceId);
    setPicked(new Set(copyable.filter((item) => !item.conflict).map((item) => item.key)));
  }

  const toggle = (key: string) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const chosen = copyable.filter((item) => picked.has(item.key));

  const apply = () => {
    onApply(mergeVariables(destination.variables, chosen, (key, value) => row(key, value), withValues));
    onClose();
  };

  return (
    <Dialog
      title={t('copy.title', { name: destination.name })}
      description={t('copy.description')}
      onClose={onClose}
      testId="dialog-copy-variables"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={apply}
            disabled={chosen.length === 0}
            data-testid="button-confirm-copy-variables"
          >
            <ArrowDownToLine />{' '}
            {chosen.length > 0 ? t('copy.confirmCount', { count: chosen.length }) : t('copy.confirm')}
          </Button>
        </>
      }
    >
      {sources.length === 0 ? (
        <p className="hint" data-testid="text-no-sources">
          {t('copy.noSources')}
        </p>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          <div className="section-label">{t('copy.from')}</div>
          <SelectField
            value={sourceId}
            onChange={setSourceId}
            options={sources.map((item) => ({
              value: item.id,
              label: t('copy.sourceOption', {
                name: item.name,
                kind: t(item.kind === 'folder' ? 'copy.kind.folder' : 'copy.kind.environment'),
              }),
            }))}
            ariaLabel={t('copy.from')}
            testId="select-copy-source"
            block
          />

          <div className="section-label">
            {t('environments.variables')}
            <span className="spacer" />
            <span className="hint" style={{ fontSize: 'var(--fs-10)' }}>
              {copyable.filter((item) => item.conflict).length > 0
                ? t('copy.conflictsHint')
                : t('copy.availableHint', { count: copyable.length })}
            </span>
          </div>

          <div className="pick-tree" data-testid="copy-variable-list">
            {copyable.length === 0 ? (
              <div className="tree-empty">{t('copy.noneToCopy')}</div>
            ) : (
              copyable.map((item) => {
                const on = picked.has(item.key);
                return (
                  <label className="pick-row" key={item.key} htmlFor={`copy-${item.key}`} style={{ paddingLeft: 6 }}>
                    <Checkbox
                      id={`copy-${item.key}`}
                      checked={on}
                      onCheckedChange={() => toggle(item.key)}
                      data-testid={`checkbox-copy-${item.key}`}
                    />
                    <span className="mono truncate" style={{ flex: '0 0 auto' }}>
                      {item.key}
                    </span>
                    <span className="hint mono truncate" style={{ flex: 1, minWidth: 0 }}>
                      {withValues ? item.value || t('variable.emptyValue') : t('copy.blank')}
                    </span>
                    {item.conflict ? (
                      <Badge variant="outline" className="chip" style={{ color: 'var(--yellow)' }}>
                        {t('copy.replaces')}
                      </Badge>
                    ) : null}
                  </label>
                );
              })
            )}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Checkbox
              checked={withValues}
              onCheckedChange={(checked) => setWithValues(checked === true)}
              data-testid="checkbox-copy-values"
            />
            {t('copy.withValues')}
          </label>
          <p className="hint">
            {t('copy.withValuesHint')}
          </p>
        </div>
      )}
    </Dialog>
  );
}
