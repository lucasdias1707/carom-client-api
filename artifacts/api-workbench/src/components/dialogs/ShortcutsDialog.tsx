import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Dialog } from '@/components/common/Dialog';
import { IconButton } from '@/components/common/IconButton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/common/Toaster';
import {
  COMMANDS,
  bindingConflicts,
  bindingFromEvent,
  formatBinding,
  labelFor,
  resolveBindings,
  sameBinding,
  type Binding,
  type CommandId,
} from '@/lib/shortcuts';
import { useWorkspace } from '@/state/workspace-store';

/**
 * The shortcuts screen, which is now also where they are changed.
 *
 * It used to be a hand-written list next to hand-written handlers, and the two
 * had already drifted — a key was advertised that nothing listened for. Both
 * now come from `lib/shortcuts`, so what this shows is what the keyboard does.
 *
 * Changes are held in a draft until Save: a half-typed rebinding that clashes
 * with another command should not be live while you decide what to do about it.
 */
export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useWorkspace();
  const { toast } = useToast();
  const [draft, setDraft] = useState<Partial<Record<CommandId, Binding>>>(state.settings.keyBindings ?? {});
  const [recording, setRecording] = useState<CommandId | null>(null);

  const bindings = resolveBindings({ keyBindings: draft });
  const conflicts = bindingConflicts(bindings);
  const hasConflict = Object.keys(conflicts).length > 0;

  /*
    Capture phase, and the event stops here: the app's own shortcuts listen on
    the same window, so without this, recording ⌘B would toggle the sidebar
    behind the dialog instead of being recorded.
  */
  useEffect(() => {
    if (!recording) return;
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'Escape') {
        setRecording(null);
        return;
      }
      const binding = bindingFromEvent(event);
      // A modifier on its own, or a key with no modifier at all: keep waiting
      // rather than record something that would fire while typing a URL.
      if (!binding) return;
      setDraft((current) => ({ ...current, [recording]: binding }));
      setRecording(null);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [recording]);

  const save = () => {
    // Only what actually differs is stored, so a default that moves in a later
    // version moves for anyone who never touched that row.
    const changed: Partial<Record<CommandId, Binding>> = {};
    for (const command of COMMANDS) {
      const binding = bindings[command.id];
      if (!sameBinding(binding, command.defaultBinding)) changed[command.id] = binding;
    }
    dispatch({ type: 'settings/update', patch: { keyBindings: changed } });
    toast({
      title: 'Shortcuts saved',
      description: Object.keys(changed).length === 0 ? 'Back to the defaults.' : undefined,
      kind: 'success',
    });
    onClose();
  };

  return (
    <Dialog
      title="Keyboard shortcuts"
      description="Click a shortcut to record a new one. Esc cancels the recording."
      onClose={onClose}
      testId="dialog-shortcuts"
      footer={
        <>
          <Button variant="ghost" onClick={() => setDraft({})} data-testid="button-reset-shortcuts">
            Restore defaults
          </Button>
          <span className="flex-1" />
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={hasConflict} data-testid="button-save-shortcuts">
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-1">
        {COMMANDS.map((command) => {
          const clash = conflicts[command.id];
          const custom = !sameBinding(bindings[command.id], command.defaultBinding);
          return (
            <div
              key={command.id}
              className="grid grid-cols-[1fr_auto_28px] items-center gap-2 rounded-[var(--radius-sm)] px-1 py-0.5"
              data-testid={`shortcut-row-${command.id}`}
            >
              <div className="min-w-0">
                <div className="truncate text-[13px]">{command.label}</div>
                {clash ? (
                  <div className="text-[11.5px] text-[var(--red)]">
                    Also {clash.map(labelFor).join(', ').toLowerCase()}
                  </div>
                ) : null}
              </div>

              <Button
                variant="secondary"
                size="sm"
                className="min-w-[92px] justify-center font-mono text-[12px]"
                onClick={() => setRecording(command.id)}
                aria-label={`Change the shortcut for ${command.label}`}
                data-testid={`button-record-${command.id}`}
              >
                {recording === command.id ? 'Press keys…' : formatBinding(bindings[command.id])}
              </Button>

              {custom ? (
                <IconButton
                  label="Back to the default"
                  hint={formatBinding(command.defaultBinding)}
                  onClick={() =>
                    setDraft((current) => {
                      const next = { ...current };
                      delete next[command.id];
                      return next;
                    })
                  }
                  testId={`button-reset-${command.id}`}
                >
                  <RotateCcw />
                </IconButton>
              ) : (
                <span />
              )}
            </div>
          );
        })}
      </div>

      {hasConflict ? (
        <p className="mt-3 text-[12.5px] text-[var(--red)]" data-testid="shortcuts-conflict">
          Two commands answer to the same keys. Change one of them before saving.
        </p>
      ) : null}

      <p className="mt-3 text-[12.5px] text-[var(--text-faint)]">
        Enter sends the request while the URL field has focus, whatever is bound above.
      </p>
    </Dialog>
  );
}
