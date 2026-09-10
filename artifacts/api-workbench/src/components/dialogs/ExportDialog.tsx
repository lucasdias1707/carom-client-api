import { useMemo, useState } from 'react';
import { Dialog } from '@/components/common/Dialog';
import { TreePicker } from '@/components/common/TreePicker';
import { useToast } from '@/components/common/Toaster';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { exportFileName, exportSelection } from '@/lib/export';
import { describedCount, toOpenApi } from '@/lib/openapi-export';
import { SelectField } from '@/components/common/SelectField';
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
  const [format, setFormat] = useState<'carom' | 'openapi'>('carom');
  const [saving, setSaving] = useState(false);

  const counts = useMemo(() => {
    const pruned = pruneTree(scoped, selected);
    return { folders: pruned.folders.length, requests: pruned.requests.length };
  }, [scoped, selected]);

  const described = useMemo(
    () => describedCount(pruneTree(scoped, selected).requests),
    [scoped, selected],
  );

  const openApi = format === 'openapi';
  // An OpenAPI description is made of operations, so requests are the whole of
  // it: folders become tags and environments have nowhere to go.
  const anything = openApi ? counts.requests > 0 : counts.requests > 0 || counts.folders > 0 || environmentIds.size > 0;

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
      const payload = openApi
        ? toOpenApi(state, { title: name, selected })
        : exportSelection(state, { name, selected, environmentIds });
      const filename = openApi ? exportFileName(`${name}-openapi`) : exportFileName(name);
      const message = saveMessage(await saveJson(filename, payload), name);
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
      description={
        openApi
          ? 'An OpenAPI 3.1 description of the requests you pick, from what the Docs tab knows.'
          : `From ${workspace?.name ?? 'this workspace'}. Import reads this file back.`
      }
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
        <div className="section-label">Format</div>
        <SelectField
          value={format}
          onChange={(next) => setFormat(next as 'carom' | 'openapi')}
          options={[
            { value: 'carom', label: 'Carom — reads back into this app' },
            { value: 'openapi', label: 'OpenAPI 3.1 — a description of the API' },
          ]}
          ariaLabel="Export format"
          testId="select-export-format"
          block
        />

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

        {environments.length > 0 && !openApi ? (
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

        {openApi ? (
          <p className="hint" data-testid="text-openapi-note">
            {described === 0
              ? 'No fields are described yet, so bodies are described from the JSON you have and parameters are left out. The Docs tab of a request has a “Read from the request” button that fills them in.'
              : `${described} documented field${described === 1 ? '' : 's'} across the ticked requests become parameters and body properties. Recorded responses become response examples.`}
          </p>
        ) : null}

        <p className="hint" data-testid="text-export-summary">
          {counts.requests} request{counts.requests === 1 ? '' : 's'} in {counts.folders} folder
          {counts.folders === 1 ? '' : 's'}
          {!openApi && environmentIds.size > 0
            ? `, and ${environmentIds.size} environment${environmentIds.size === 1 ? '' : 's'}`
            : ''}
          .
          A folder you left unticked still comes along when something inside it is ticked — otherwise that request
          would have nowhere to sit.
        </p>
      </div>
    </Dialog>
  );
}
