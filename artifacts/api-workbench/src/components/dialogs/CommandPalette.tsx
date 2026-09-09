import { useMemo, type ReactNode } from 'react';
import { CornerDownLeft } from 'lucide-react';
import {
  Command as CommandRoot,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useWorkspace } from '@/state/workspace-store';
import { folderPath } from '@/state/selectors';

export type Command = {
  id: string;
  label: string;
  hint?: string;
  icon?: ReactNode;
  run: () => void;
};

type CommandPaletteProps = {
  commands: Command[];
  onClose: () => void;
};

/**
 * ⌘K launcher: search over actions and every request in the workspace.
 *
 * The filtering and the arrow-key cursor were hand-written before, including
 * the `scrollIntoView` that kept the highlighted row visible. cmdk does all of
 * that, and does the part that was missing: the list is a real listbox, so the
 * highlighted row is announced as you move rather than just changing colour.
 *
 * Two commands can share a label — "Delete resource" the request and Delete
 * the action — so the item value is the id with the label appended: the id
 * keeps them apart, the label is what gets matched.
 */
export function CommandPalette({ commands, onClose }: CommandPaletteProps) {
  const { state, dispatch } = useWorkspace();

  const requestCommands = useMemo<Command[]>(
    () =>
      state.requests
        .filter((request) => request.workspaceId === state.activeWorkspaceId)
        .map((request) => ({
          id: `open-${request.id}`,
          label: request.name,
          hint: [...folderPath(state, request.folderId), request.method].join(' · '),
          run: () => dispatch({ type: 'request/open', id: request.id }),
        })),
    [dispatch, state],
  );

  const run = (command: Command) => {
    command.run();
    onClose();
  };

  const row = (entry: Command) => (
    <CommandItem
      key={entry.id}
      value={`${entry.id} ${entry.label} ${entry.hint ?? ''}`}
      onSelect={() => run(entry)}
      className="palette-item gap-2 text-[13px] data-[selected=true]:bg-[var(--bg-active)]"
      data-testid={`palette-item-${entry.id}`}
    >
      {entry.icon}
      <span className="truncate">{entry.label}</span>
      <span className="flex-1" />
      {entry.hint ? <span className="tree-count">{entry.hint}</span> : null}
      <CornerDownLeft size={12} className="opacity-0 group-data-[selected=true]:opacity-100" />
    </CommandItem>
  );

  return (
    <UiDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="top-[12vh] max-w-[620px] translate-y-0 gap-0 overflow-hidden rounded-[10px] border-[var(--border-strong)] bg-[var(--bg-surface)] p-0 shadow-[var(--shadow-pop)] [&>button]:hidden"
        data-testid="dialog-command-palette"
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">Search requests and actions</DialogDescription>
        <CommandRoot loop className="bg-transparent">
          <CommandInput
            placeholder="Search requests and actions…"
            className="h-11 text-[15px]"
            data-testid="input-command-palette"
          />
          <CommandList className="max-h-[52vh]">
            <CommandEmpty className="tree-empty py-6">No matches.</CommandEmpty>
            <CommandGroup>{commands.map(row)}</CommandGroup>
            <CommandGroup heading="Requests">{requestCommands.map(row)}</CommandGroup>
          </CommandList>
        </CommandRoot>
      </DialogContent>
    </UiDialog>
  );
}
