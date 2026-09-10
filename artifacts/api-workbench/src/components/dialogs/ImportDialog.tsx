import { useMemo, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Dialog } from '@/components/common/Dialog';
import { TreePicker } from '@/components/common/TreePicker';
import { useToast } from '@/components/common/Toaster';
import { createEnvironment, createWorkspace } from '@/lib/factories';
import { retargetImport, type ParsedImport } from '@/lib/postman';
import { allIds, buildTree, pruneTree } from '@/lib/tree';
import { FORMAT_LABELS, readImport, type ImportFormat } from '@/lib/import-formats';
import { useWorkspace } from '@/state/workspace-store';
import { SelectField } from '@/components/common/SelectField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const SAMPLE = `{
  "openapi": "3.0.0",
  "info": { "title": "My API" },
  "paths": { "/things": { "get": { "summary": "List things" } } }
}`;

/** The value the destination picker uses for "somewhere that does not exist yet". */
const NEW_WORKSPACE = 'new';

/**
 * Import from another tool.
 *
 * Two steps, because an export is usually bigger than what someone wants: read
 * the file, then choose what comes across and where it lands. Both ways in are
 * offered — the file the other app wrote is the usual case, and pasting is what
 * is left when the JSON arrived in a chat message rather than as a download.
 *
 * The format is detected from the content rather than asked for. Every one of
 * these is a `.json` dragged out of a different app, and making someone
 * classify their own export before the app will look at it is a question the
 * file itself can answer.
 */
export function ImportDialog({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useWorkspace();
  const { toast } = useToast();
  const [raw, setRaw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedImport | null>(null);
  const [format, setFormat] = useState<ImportFormat | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [destination, setDestination] = useState(state.activeWorkspaceId);
  const [newName, setNewName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const tree = useMemo(() => (preview ? buildTree(preview) : []), [preview]);

  const read = (contents: string) => {
    try {
      const { format: detected, imported: parsed } = readImport(
        contents,
        state.activeWorkspaceId,
        state.requests.length,
      );
      setFormat(detected);
      setPreview(parsed);
      // Everything starts ticked: the common case is "all of it", and unticking
      // what you do not want is less work than ticking what you do.
      setSelected(new Set(allIds(buildTree(parsed))));
      setNewName(parsed.name);
      setError(null);
    } catch (importError) {
      setPreview(null);
      setFormat(null);
      setError(importError instanceof Error ? importError.message : 'Could not read that file.');
    }
  };

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      read(await file.text());
    } catch {
      setError('That file could not be read.');
    }
  };

  const counts = useMemo(() => {
    if (!preview) return { folders: 0, requests: 0 };
    const pruned = pruneTree(preview, selected);
    return { folders: pruned.folders.length, requests: pruned.requests.length };
  }, [preview, selected]);

  const extraEnvironments = preview?.environments ?? [];
  const creatingWorkspace = destination === NEW_WORKSPACE;
  const canImport = Boolean(
    preview &&
      (preview.environment || extraEnvironments.length > 0 || counts.requests > 0 || counts.folders > 0) &&
      (!creatingWorkspace || newName.trim()),
  );

  const confirm = () => {
    if (!preview) return;

    const workspace = creatingWorkspace ? createWorkspace(newName.trim()) : null;
    const workspaceId = workspace ? workspace.id : destination;
    const targeted = retargetImport(preview, workspaceId);
    const { folders, requests } = pruneTree(targeted, selected);

    dispatch({
      type: 'import/merge',
      folders,
      requests,
      environment: targeted.environment,
      environments: targeted.environments,
      baseVariables: targeted.variables,
      workspace,
      // A new workspace needs a base environment, the same one the workspace
      // menu would have given it.
      baseEnvironment: workspace ? createEnvironment(workspace.id, 'Base', true, []) : null,
      workspaceId,
    });

    const where =
      workspace ?? state.workspaces.find((item) => item.id === workspaceId);
    toast({
      title: `Imported ${preview.name}`,
      description: targeted.environment
        ? `${targeted.environment.variables.length} variables into ${where?.name ?? 'this workspace'}.`
        : `${requests.length} requests into ${where?.name ?? 'this workspace'}${
            extraEnvironments.length > 0
              ? `, with ${extraEnvironments.length} environment${extraEnvironments.length === 1 ? '' : 's'}`
              : ''
          }${
            targeted.variables.length > 0
              ? `, and ${targeted.variables.length} variables into its base environment`
              : ''
          }.`,
      kind: 'success',
    });
    onClose();
  };

  return (
    <Dialog
      title="Import"
      description={
        format
          ? `Read as ${FORMAT_LABELS[format]}.`
          : 'A Carom export, Postman, Insomnia v4, OpenAPI or Swagger, or a HAR from a browser. The format is worked out from the file.'
      }
      onClose={onClose}
      testId="dialog-import"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {preview ? (
            <Button
              onClick={confirm}
              disabled={!canImport}
              data-testid="button-confirm-import"
            >
              Import
            </Button>
          ) : (
            <Button
              onClick={() => read(raw)}
              disabled={!raw.trim()}
              data-testid="button-read-postman"
            >
              Continue
            </Button>
          )}
        </>
      }
    >
      {preview ? (
        <div className="stack" style={{ gap: 10 }}>
          <div className="section-label">
            {preview.environment ? 'Environment' : 'What to import'}
            <span className="spacer" />
            {preview.environment ? null : (
              <>
                <Button variant="ghost" size="sm"
                  onClick={() => setSelected(new Set(allIds(tree)))}
                  data-testid="button-select-all-import"
                >
                  All
                </Button>
                <Button variant="ghost" size="sm"
                  onClick={() => setSelected(new Set())}
                  data-testid="button-select-none-import"
                >
                  None
                </Button>
              </>
            )}
          </div>

          {preview.environment ? (
            <p className="hint" data-testid="text-import-environment">
              <strong>{preview.environment.name}</strong> — {preview.environment.variables.length} variables. An
              environment belongs to one workspace, so it lands in whichever you pick below.
            </p>
          ) : (
            <TreePicker nodes={tree} selected={selected} onChange={setSelected} testPrefix="import" />
          )}

          {extraEnvironments.length > 0 ? (
            <p className="hint" data-testid="text-import-environments">
              Also carries{' '}
              <strong>{extraEnvironments.map((environment) => environment.name).join(', ')}</strong>. They come across
              whole — an environment is a handful of names, and picking through them is what the environments screen
              is for.
            </p>
          ) : null}

          <div className="section-label">Where it goes</div>
          <SelectField
            value={destination}
            onChange={setDestination}
            options={[
              ...state.workspaces.map((workspace) => ({
                value: workspace.id,
                label: workspace.name + (workspace.id === state.activeWorkspaceId ? ' (current)' : ''),
              })),
              { value: NEW_WORKSPACE, label: 'New workspace…' },
            ]}
            ariaLabel="Destination workspace"
            testId="select-import-workspace"
            block
          />

          {creatingWorkspace ? (
            <Input
              value={newName}
              placeholder="Workspace name"
              onChange={(event) => setNewName(event.target.value)}
              aria-label="New workspace name"
              data-testid="input-import-workspace-name"
            />
          ) : null}

          {preview.environment ? null : (
            <p className="hint" data-testid="text-import-summary">
              {counts.requests} request{counts.requests === 1 ? '' : 's'} in {counts.folders} folder
              {counts.folders === 1 ? '' : 's'}. A folder you left unticked still comes across when something inside
              it is ticked — otherwise that request would have nowhere to sit.
            </p>
          )}

          <p className="hint">
            Scripts come across as written and run against a <code>pm</code> shim. They are{' '}
            <strong>not sandboxed</strong> — read them before sending anything from a collection you did not write.
          </p>
        </div>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          <Button variant="secondary" onClick={() => fileRef.current?.click()} data-testid="button-pick-postman-file">
            <Upload /> Choose a file
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => void pickFile(event.target.files?.[0])}
            data-testid="input-postman-file"
          />

          <div className="section-label">Or paste the JSON</div>
          <Textarea
            className="min-h-[150px] font-mono"
            value={raw}
            placeholder={SAMPLE}
            spellCheck={false}
            onChange={(event) => {
              setRaw(event.target.value);
              setError(null);
            }}
            aria-label="Postman export"
            data-testid="textarea-postman"
          />

          {error ? (
            <div className="hint" style={{ color: 'var(--red)' }} data-testid="text-postman-error">
              {error}
            </div>
          ) : null}

          <p className="hint">
            The collection becomes a folder, keeping its auth and its scripts, so everything inside it still inherits
            the way it did in Postman. Requests that set their own auth keep it.
          </p>
          <p className="hint">
            Its <strong>variables</strong> go into the base environment, not the folder. Postman resolves an
            environment before a collection, and folder variables here win over environments — so putting them on the
            folder would let a blank collection default shadow the real value in your selected environment. A name the
            base already defines is left alone.
          </p>
        </div>
      )}
    </Dialog>
  );
}
