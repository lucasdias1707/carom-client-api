import { useMemo, useState } from 'react';
import { Dialog } from '@/components/common/Dialog';
import { TreePicker } from '@/components/common/TreePicker';
import { useToast } from '@/components/common/Toaster';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { exportFileName, exportSelection } from '@/lib/export';
import { saveJson, saveMessage } from '@/lib/save';
import { allIds, buildTree, pruneTree } from '@/lib/tree';
import { useWorkspace } from '@/state/workspace-store';

/**
 * Export whatever you point at.
 *
 * Exporting used to be one command per thing — a folder from its menu, a
 * request from its own — with no way to say "these three and the staging
 * environment", and no way to export environments at all. This is the same
 * tree the import dialog uses, asked in the other direction.
 *
 * What comes out is the app's own slice format, which the import dialog now
 * reads back: an export nobody can open is a backup only in name.
 */
export function ExportDialog({
  onClose,
  initialSelection,
}: {
  onClose: () => void;
  /** Pre-ticked ids, when the dialog was opened from a folder or a request. */
  initialSelection?: string[];
}) {
  const { state } = useWorkspace();
  const { toast } = useToast();

  const scoped = useMemo(
    () => ({
      folders: state.folders.filter((folder) => folder.workspaceId === state.activeWorkspaceId),
      requests: state.requests.filter((request) => request.workspaceId === state.activeWorkspaceId),
    }),
    [state.folders, state.requests, state.activeWorkspaceId],
  );
  const environments = state.environments.filter(
    (environment) => environment.workspaceId === state.activeWorkspaceId,
  );
  const workspace = state.workspaces.find((item) => item.id === state.activeWorkspaceId);

  const tree = useMemo(() => buildTree(scoped), [scoped]);
  const [selected, setSelected] = useState<Set<string>>(
    // Opened from a menu, it starts on what was clicked; opened on its own, on
    // everything, since "the whole workspace" is the usual reason to be here.
    () => new Set(initialSelection ?? allIds(buildTree(scoped))),
  );
  const [environmentIds, setEnvironmentIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const counts = useMemo(() => {
    const pruned = pruneTree(scoped, selected);
    return { folders: pruned.folders.length, requests: pruned.requests.length };
  }, [scoped, selected]);

  const anything = counts.requests > 0 || counts.folders > 0 || environmentIds.size > 0;

  /** One folder on its own names the file after it; anything wider is the workspace. */
  const name = useMemo(() => {
    const pruned = pruneTree(scoped, selected);
    if (pruned.folders.length === 1 && pruned.requests.length === 0) return pruned.folders[0].name;
    if (pruned.folders.length === 0 && pruned.requests.length === 1) return pruned.requests[0].name;
    if (pruned.folders.length === 1) return pruned.folders[0].name;
    return workspace?.name ?? 'Carom export';
  }, [scoped, selected, workspace]);

  const run = async () => {
    setSaving(true);
    try {
      const payload = exportSelection(state, { name, selected, environmentIds });
      const message = saveMessage(await saveJson(exportFileName(name), payload), name);
      if (message) toast({ ...message, kind: 'success' });
      onClose();
    } catch (error) {
      toast({
        title: 'Could not write the file',
        description: error instanceof Error ? error.message : undefined,
        kind: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleEnvironment = (id: string) =>
    setEnvironmentIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Dialog
      title="Export"
      description={`From ${workspace?.name ?? 'this workspace'}. Import reads this file back.`}
      onClose={onClose}
      testId="dialog-export"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void run()} disabled={!anything || saving} data-testid="button-confirm-export">
            Export
          </Button>
        </>
      }
    >
      <div className="stack" style={{ gap: 10 }}>
        <div className="section-label">
          What to export
          <span className="spacer" />
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set(allIds(tree)))} data-testid="button-select-all-export">
            All
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} data-testid="button-select-none-export">
            None
          </Button>
        </div>

        <TreePicker nodes={tree} selected={selected} onChange={setSelected} testPrefix="export" />

        {environments.length > 0 ? (
          <>
            <div className="section-label">
              Environments
              <span className="spacer" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEnvironmentIds(new Set(environments.map((environment) => environment.id)))}
                data-testid="button-select-all-environments"
              >
                All
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEnvironmentIds(new Set())} data-testid="button-select-none-environments">
                None
              </Button>
            </div>
            <div className="pick-tree">
              {environments.map((environment) => (
                <div className="pick-row" key={environment.id} style={{ paddingLeft: 4 }}>
                  <Checkbox
                    id={`export-env-${environment.id}`}
                    checked={environmentIds.has(environment.id)}
                    onCheckedChange={() => toggleEnvironment(environment.id)}
                    data-testid={`checkbox-export-env-${environment.id}`}
                  />
                  <span className="var-dot" style={{ background: environment.color }} />
                  <Label htmlFor={`export-env-${environment.id}`} className="truncate font-normal">
                    {environment.name}
                    {environment.isBase ? ' (base)' : ''}
                  </Label>
                  <span className="spacer" />
                  <span className="tree-count">{environment.variables.length}</span>
                </div>
              ))}
            </div>
            <p className="hint">
              Variables are exported <strong>as they are</strong>, values included. A token in one of these travels
              with the file — check before sending it on.
            </p>
          </>
        ) : null}

        <p className="hint" data-testid="text-export-summary">
          {counts.requests} request{counts.requests === 1 ? '' : 's'} in {counts.folders} folder
          {counts.folders === 1 ? '' : 's'}
          {environmentIds.size > 0 ? `, and ${environmentIds.size} environment${environmentIds.size === 1 ? '' : 's'}` : ''}.
          A folder you left unticked still comes along when something inside it is ticked — otherwise that request
          would have nowhere to sit.
        </p>
      </div>
    </Dialog>
  );
}
