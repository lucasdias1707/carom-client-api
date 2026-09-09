import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { LOCAL_VARIABLE_COLOR } from '@/lib/template';
import { row } from '@/lib/factories';
import { useWorkspace } from '@/state/workspace-store';
import type { ResolvedVariable } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';

type VariablePopoverProps = {
  name: string;
  /** `null` when the variable is referenced but defined nowhere yet. */
  variable: ResolvedVariable | null;
  anchor: DOMRect;
  onClose: () => void;
};

/**
 * Edit the definition a variable actually resolves to, without leaving the
 * request. Writes back to whichever folder or environment supplied the value,
 * so the edit lands where the reader expects.
 */
export function VariablePopover({ name, variable, anchor, onClose }: VariablePopoverProps) {
  const { state, dispatch, activeRequest } = useWorkspace();
  const [value, setValue] = useState(variable?.value ?? '');

  const environments = state.environments.filter(
    (environment) => environment.workspaceId === state.activeWorkspaceId,
  );
  const base = environments.find((environment) => environment.isBase);
  /**
   * A new global goes into whichever environment is selected right now, and
   * only falls back to Base when none is. Defining a staging URL while staging
   * is active, and having it land in Base for every environment to inherit,
   * is not what anyone means by that click.
   */
  const target = environments.find((environment) => environment.id === state.activeEnvironmentId) ?? base;
  const folder = state.folders.find((item) => item.id === activeRequest?.folderId);

  const save = () => {
    if (variable?.scope === 'folder') {
      const target = state.folders.find((item) => item.id === variable.sourceId);
      if (target) {
        dispatch({
          type: 'folder/variables',
          id: target.id,
          variables: target.variables.map((item) => (item.key.trim() === name ? { ...item, value } : item)),
        });
      }
    } else if (variable) {
      const target = environments.find((environment) => environment.id === variable.sourceId);
      if (target) {
        dispatch({
          type: 'environment/update',
          id: target.id,
          patch: { variables: target.variables.map((item) => (item.key.trim() === name ? { ...item, value } : item)) },
        });
      }
    }
    onClose();
  };

  const define = (scope: 'folder' | 'global') => {
    if (scope === 'folder' && folder) {
      dispatch({ type: 'folder/variables', id: folder.id, variables: [...folder.variables, row(name, value)] });
    } else if (target) {
      dispatch({
        type: 'environment/update',
        id: target.id,
        patch: { variables: [...target.variables, row(name, value)] },
      });
    }
    onClose();
  };

  const accent = variable ? (variable.scope === 'folder' ? LOCAL_VARIABLE_COLOR : variable.color) : 'var(--red)';

  return (
    <Popover
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {/*
        Radix hangs a popover off an element; the anchor here is a run of text
        inside a textarea's mirror, which has no element of its own. So the
        anchor is an empty box laid over exactly where that text is, and Radix
        takes it from there — flipping above the caret when there is no room
        below, Escape, the click outside, and the focus trip back.
      */}
      <PopoverAnchor asChild>
        <span
          aria-hidden
          className="pointer-events-none fixed"
          style={{ left: anchor.left, top: anchor.top, width: anchor.width, height: anchor.height }}
        />
      </PopoverAnchor>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="var-popover w-[300px] p-0"
        aria-label={`Edit ${name}`}
        data-testid="popover-variable"
      >
      <div className="var-popover-head">
        <span className="var-dot" style={{ background: accent }} />
        <span className="mono" style={{ fontWeight: 600 }}>
          {name}
        </span>
        <span className="spacer" />
        {variable ? (
          <Badge variant="outline" className="chip" style={{ color: accent }}>
            {variable.scope === 'folder' ? 'local' : 'global'}
          </Badge>
        ) : (
          <Badge variant="outline" className="chip" style={{ color: 'var(--red)' }}>
            undefined
          </Badge>
        )}
      </div>

      {variable ? (
        <>
          <div className="var-popover-origin">
            from {variable.scope === 'folder' ? 'folder' : 'environment'} <strong>{variable.sourceName}</strong>
          </div>
          <div className="var-popover-row">
            <Input
              className="font-mono"
              value={value}
              autoFocus
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') save();
              }}
              aria-label={`Value of ${name}`}
              data-testid="input-variable-value"
            />
            <Button onClick={save} data-testid="button-save-variable">
              <Check /> Save
            </Button>
          </div>
          {variable.shadowed.length > 0 ? (
            <div className="var-popover-shadowed">
              overrides{' '}
              {variable.shadowed.map((origin, index) => (
                <span key={`${origin.sourceId}-${index}`}>
                  {index > 0 ? ', ' : ''}
                  <span style={{ color: origin.scope === 'folder' ? LOCAL_VARIABLE_COLOR : origin.color }}>
                    {origin.sourceName}
                  </span>
                  <span className="mono"> = {origin.value || '(empty)'}</span>
                </span>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="var-popover-origin">Not defined yet. Give it a value and pick where it lives.</div>
          <div className="var-popover-row">
            <Input
              className="font-mono"
              value={value}
              autoFocus
              placeholder="Value"
              onChange={(event) => setValue(event.target.value)}
              aria-label={`Value of ${name}`}
              data-testid="input-variable-value"
            />
          </div>
          <div className="var-popover-row">
            <Button variant="secondary" size="sm"
              onClick={() => define('folder')}
              disabled={!folder}
              title={folder ? `Local to ${folder.name}` : 'This request is not in a folder'}
              data-testid="button-define-local"
            >
              <Plus /> Local {folder ? `(${folder.name})` : ''}
            </Button>
            <Button variant="secondary" size="sm"
              onClick={() => define('global')}
              disabled={!target}
              title={target ? `Goes into the ${target.name} environment` : 'This workspace has no environment'}
              data-testid="button-define-global"
            >
              <Plus /> Global {target ? `(${target.name})` : ''}
            </Button>
          </div>
        </>
      )}
      </PopoverContent>
    </Popover>
  );
}
