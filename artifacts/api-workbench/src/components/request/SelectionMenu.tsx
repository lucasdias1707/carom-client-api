import { useEffect, useRef, useState } from 'react';
import { Check, Plus, Variable } from 'lucide-react';
import { ContextMenu, type MenuEntry } from '@/components/common/ContextMenu';
import { Dialog } from '@/components/common/Dialog';
import { useToast } from '@/components/common/Toaster';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LOCAL_VARIABLE_COLOR } from '@/lib/template';
import { assignVariable, assignableNames, suggestVariableName, usableSelection } from '@/lib/selection';
import { useWorkspace } from '@/state/workspace-store';

/** A field whose selection can be read, and written back to. */
type Field = HTMLInputElement | HTMLTextAreaElement;

type Captured = {
  text: string;
  x: number;
  y: number;
  /** Set when the selection came from a field, so `{{name}}` can replace it. */
  field: { element: Field; start: number; end: number } | null;
};

function isField(node: EventTarget | null): node is Field {
  return node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement;
}

/**
 * Read whatever is selected, from wherever it is.
 *
 * Two mechanisms, not one: `window.getSelection()` returns an empty string
 * inside an `<input>` or `<textarea>` in every browser, so a field has to be
 * asked for its own `selectionStart`/`selectionEnd`. Getting this wrong means
 * the feature works on a response and silently does nothing on a request,
 * which is the half that matters more.
 */
function capture(target: EventTarget | null, x: number, y: number): Captured | null {
  if (isField(target)) {
    const { selectionStart, selectionEnd } = target;
    if (selectionStart === null || selectionEnd === null || selectionStart === selectionEnd) return null;
    const text = target.value.slice(selectionStart, selectionEnd);
    return usableSelection(text)
      ? { text, x, y, field: { element: target, start: selectionStart, end: selectionEnd } }
      : null;
  }

  const text = window.getSelection()?.toString() ?? '';
  return usableSelection(text) ? { text, x, y, field: null } : null;
}

/**
 * Select a value, right-click, and put it in a variable.
 *
 * It writes to whichever environment is picked in the top bar, because that is
 * the one the request would read: capturing a production token into the
 * staging environment while production is selected is a bug you find much
 * later, in the form of a request that suddenly works against the wrong host.
 * The menu says which environment by name for that reason.
 *
 * When the selection came from a field, the text is replaced with `{{name}}`
 * as well. That is the point of the gesture — one action leaves the request
 * parameterised instead of leaving a copy of the value in two places. A
 * selection in a response has nowhere to write back to, and only the
 * environment is changed, which is how a token gets out of a login response
 * and into the next request.
 */
export function SelectionMenu() {
  const { state, dispatch, t } = useWorkspace();
  const { toast } = useToast();
  const [captured, setCaptured] = useState<Captured | null>(null);
  const [naming, setNaming] = useState<string | null>(null);
  /** Held across the naming dialog, which takes focus off the field. */
  const pending = useRef<Captured | null>(null);

  const environments = state.environments.filter(
    (environment) => environment.workspaceId === state.activeWorkspaceId,
  );
  const active = environments.find(
    (environment) => environment.id === state.activeEnvironmentId && !environment.isBase,
  );
  const base = environments.find((environment) => environment.isBase);
  // With no environment picked there is still somewhere sensible to put it:
  // the base applies to every environment, which is what "no selection" means.
  const target = active ?? base ?? null;

  useEffect(() => {
    const onContextMenu = (event: MouseEvent) => {
      // The tree, the tabs and the folder pane have menus of their own; a
      // second one competing for the same click would replace something
      // useful with something less so.
      if ((event.target as HTMLElement | null)?.closest?.('[data-own-context-menu]')) return;
      const found = capture(event.target, event.clientX, event.clientY);
      if (!found) return;
      event.preventDefault();
      setCaptured(found);
    };
    window.addEventListener('contextmenu', onContextMenu);
    return () => window.removeEventListener('contextmenu', onContextMenu);
  }, []);

  /** Replace the selected text with the reference, where there is a field. */
  const parameterise = (found: Captured, name: string) => {
    const { field } = found;
    if (!field) return;
    const { element, start, end } = field;
    element.focus();
    element.setSelectionRange(start, end);
    // Through the browser's own insertion so one Ctrl+Z undoes it and React's
    // onChange fires — assigning `value` does neither.
    document.execCommand('insertText', false, `{{${name}}}`);
  };

  const assign = (found: Captured, name: string) => {
    if (!target) return;
    dispatch({
      type: 'environment/update',
      id: target.id,
      patch: { variables: assignVariable(target.variables, name, found.text) },
    });
    parameterise(found, name);
    toast({
      title: t('selection.assigned', { name, environment: target.name }),
      kind: 'success',
    });
  };

  /**
   * Close the naming dialog, then write.
   *
   * In that order, and not in the same frame. While the dialog is open Radix
   * marks the rest of the page inert, so focusing the field does nothing and
   * the insertion lands nowhere — which showed up as a new variable being
   * created correctly while the field it came from kept the literal value.
   * Radix also restores focus on close, so the write waits for the frame after
   * that, or it would be undone by it.
   */
  const finishNaming = (name: string) => {
    const found = pending.current;
    setNaming(null);
    setCaptured(null);
    pending.current = null;
    if (!found || !name.trim()) return;
    requestAnimationFrame(() => requestAnimationFrame(() => assign(found, name.trim())));
  };

  const cancelNaming = () => {
    setNaming(null);
    setCaptured(null);
    pending.current = null;
  };

  if (!captured && naming === null) return null;

  const entries: MenuEntry[] = [];
  if (target) {
    for (const name of assignableNames(target.variables)) {
      entries.push({
        kind: 'item',
        label: t('selection.setExisting', { name }),
        icon: <Check size={13} />,
        onSelect: () => captured && assign(captured, name),
      });
    }
    if (entries.length > 0) entries.push({ kind: 'separator' });
    entries.push({
      kind: 'item',
      label: t('selection.createNew'),
      icon: <Plus size={13} />,
      onSelect: () => {
        pending.current = captured;
        setNaming(suggestVariableName(captured?.text ?? ''));
      },
    });
  } else {
    // No environments at all. Saying so beats a menu with one dead entry.
    entries.push({
      kind: 'item',
      label: t('selection.noEnvironment'),
      onSelect: () => undefined,
    });
  }

  return (
    <>
      {captured && naming === null ? (
        <ContextMenu
          x={captured.x}
          y={captured.y}
          entries={entries}
          onClose={() => setCaptured(null)}
        />
      ) : null}

      {naming !== null ? (
        <Dialog
          title={t('selection.newTitle')}
          description={
            target ? t('selection.newDescription', { environment: target.name }) : undefined
          }
          onClose={cancelNaming}
          testId="dialog-name-variable"
          footer={
            <>
              <span className="spacer" />
              <Button variant="secondary" onClick={cancelNaming}>
                {t('common.cancel')}
              </Button>
              <Button
                disabled={!naming.trim()}
                onClick={() => finishNaming(naming)}
                data-testid="button-create-variable"
              >
                {t('common.save')}
              </Button>
            </>
          }
        >
          <div className="stack" style={{ gap: 8 }}>
            <Input
              value={naming}
              onChange={(event) => setNaming(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || !naming.trim()) return;
                event.preventDefault();
                finishNaming(naming);
              }}
              aria-label={t('selection.nameAria')}
              data-autofocus
              data-testid="input-new-variable-name"
            />
            {/* The value is shown, not editable: it is what you selected, and
                a field here would invite editing it somewhere it cannot be
                seen in context. */}
            <div className="hint">
              <span style={{ color: LOCAL_VARIABLE_COLOR }} className="mono">
                {`{{${naming.trim() || '…'}}}`}
              </span>{' '}
              <Variable size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />{' '}
              <span className="mono">{truncate(pending.current?.text ?? '')}</span>
            </div>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}

/** Enough of the value to recognise it, without wrapping the dialog. */
function truncate(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > 90 ? `${flat.slice(0, 90)}…` : flat;
}
