import { useMemo, type ReactNode } from 'react';
import { Box, CornerDownLeft } from 'lucide-react';
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

/**
 * `all` is ⌘K. The rest are the IDE habit: one key straight to a request, one
 * straight to a workspace, one straight to the actions, one straight to a tab
 * that is already open — each without typing past a list of things that were
 * not what you meant.
 */
export type PaletteMode = 'all' | 'requests' | 'workspaces' | 'commands' | 'tabs';

type CommandPaletteProps = {
  commands: Command[];
  mode?: PaletteMode;
  onClose: () => void;
};

const PLACEHOLDERS: Record<PaletteMode, string> = {
  all: 'Search requests and actions…',
  requests: 'Go to a request…',
  workspaces: 'Switch workspace…',
  commands: 'Run a command…',
  tabs: 'Go to an open tab…',
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
export function CommandPalette({ commands, mode = 'all', onClose }: CommandPaletteProps) {
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

  /*
    Only what is open, in the order the strip shows it. Searching tabs is a
    different question from searching requests — "the one I was just in" rather
    than "the one that exists somewhere" — which is why it is its own mode
    rather than a filter over the other list.
  */
  const tabCommands = useMemo<Command[]>(
    () =>
      state.openTabIds.flatMap((id) => {
        const request = state.requests.find((item) => item.id === id);
        if (!request) return [];
        return [
          {
            id: `tab-${request.id}`,
            label: request.name,
            hint: [
              request.method,
              ...(state.drafts[request.id] ? ['unsaved'] : []),
              ...(request.id === state.activeRequestId ? ['current'] : []),
            ].join(' · '),
            run: () => dispatch({ type: 'request/open', id: request.id }),
          },
        ];
      }),
    [dispatch, state],
  );

  const workspaceCommands = useMemo<Command[]>(
    () =>
      state.workspaces.map((workspace) => ({
        id: `workspace-${workspace.id}`,
        label: workspace.name,
        icon: <Box size={13} />,
        hint:
          workspace.id === state.activeWorkspaceId
            ? 'current'
            : `${state.requests.filter((request) => request.workspaceId === workspace.id).length} requests`,
        run: () => dispatch({ type: 'workspace/activate', id: workspace.id }),
      })),
    [dispatch, state],
  );

  /*
    Close first, run second, and the order matters. Both are a `setOverlay` on
    the same state in the same handler, so whichever is called last is the one
    that sticks — with `run` first, picking "Settings" or "Keyboard shortcuts"
    from the palette closed the palette and opened nothing.
  */
  const run = (command: Command) => {
    onClose();
    command.run();
  };

  const row = (entry: Command) => (
    <CommandItem
      key={entry.id}
      value={`${entry.id} ${entry.label} ${entry.hint ?? ''}`}
      onSelect={() => run(entry)}
      className="palette-item gap-2 text-[length:var(--fs-13)] data-[selected=true]:bg-[var(--bg-active)]"
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
            placeholder={PLACEHOLDERS[mode]}
            className="h-11 text-[length:var(--fs-15)]"
            data-testid="input-command-palette"
          />
          <CommandList className="max-h-[52vh]">
            <CommandEmpty className="tree-empty py-6">No matches.</CommandEmpty>
            {mode === 'all' || mode === 'commands' ? <CommandGroup>{commands.map(row)}</CommandGroup> : null}
            {mode === 'all' || mode === 'requests' ? (
              <CommandGroup heading="Requests">{requestCommands.map(row)}</CommandGroup>
            ) : null}
            {mode === 'workspaces' ? (
              <CommandGroup heading="Workspaces">{workspaceCommands.map(row)}</CommandGroup>
            ) : null}
            {mode === 'tabs' ? <CommandGroup heading="Open tabs">{tabCommands.map(row)}</CommandGroup> : null}
          </CommandList>
        </CommandRoot>
      </DialogContent>
    </UiDialog>
  );
}
