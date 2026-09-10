import { MOD_LABEL } from '@/hooks/use-hotkeys';
import type { Settings } from '@/types';

/**
 * The one list of shortcuts.
 *
 * There used to be three: the handlers in `Workbench`, a hand-written list in
 * the shortcuts dialog, and the hints on palette rows and buttons. They had
 * already drifted — the dialog advertised a key that had no handler, and one
 * with a handler that the dialog never mentioned. Now the handlers, the screen
 * and every hint read this, so a shortcut cannot be advertised without existing
 * or exist without being advertised.
 */

export type Binding = {
  /** Lower-case `KeyboardEvent.key`, e.g. `k`, `enter`, `,`. */
  key: string;
  /** ⌘ on macOS, Ctrl elsewhere. */
  mod?: boolean;
  shift?: boolean;
};

export type CommandId =
  | 'palette'
  | 'palette.requests'
  | 'palette.workspaces'
  | 'palette.commands'
  | 'send'
  | 'newRequest'
  | 'closeTab'
  | 'environments'
  | 'toggleSidebar'
  | 'settings';

export type ShortcutCommand = {
  id: CommandId;
  label: string;
  defaultBinding: Binding;
};

/**
 * `⌘Space` is missing on purpose. It is Spotlight on macOS — the system takes
 * it before any app sees the keydown — so binding it would produce a shortcut
 * that silently does nothing on the platform it was asked for. `⌘⇧P`, the
 * editor convention for the same idea, does reach the app and is what
 * `palette.commands` is bound to.
 */
export const COMMANDS: ShortcutCommand[] = [
  { id: 'palette', label: 'Search everything', defaultBinding: { key: 'k', mod: true } },
  { id: 'palette.requests', label: 'Go to a request', defaultBinding: { key: 'p', mod: true } },
  { id: 'palette.workspaces', label: 'Switch workspace', defaultBinding: { key: 'r', mod: true } },
  { id: 'palette.commands', label: 'Run a command', defaultBinding: { key: 'p', mod: true, shift: true } },
  { id: 'send', label: 'Send the active request', defaultBinding: { key: 'enter', mod: true } },
  { id: 'newRequest', label: 'New request', defaultBinding: { key: 'n', mod: true } },
  { id: 'closeTab', label: 'Close the active tab', defaultBinding: { key: 'w', mod: true } },
  { id: 'environments', label: 'Edit environments', defaultBinding: { key: 'e', mod: true } },
  { id: 'toggleSidebar', label: 'Show or hide the sidebar', defaultBinding: { key: 'b', mod: true } },
  { id: 'settings', label: 'Open settings', defaultBinding: { key: ',', mod: true } },
];

export type BindingMap = Record<CommandId, Binding>;

/** Defaults, with whatever was customised laid over them. */
export function resolveBindings(settings: Pick<Settings, 'keyBindings'>): BindingMap {
  const custom = settings.keyBindings ?? {};
  const out = {} as BindingMap;
  for (const command of COMMANDS) {
    out[command.id] = custom[command.id] ?? command.defaultBinding;
  }
  return out;
}

const KEY_LABELS: Record<string, string> = {
  enter: 'Enter',
  escape: 'Esc',
  ' ': 'Space',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  backspace: '⌫',
  tab: 'Tab',
};

/** `⌘ ⇧ P` — what the dialog shows and what a tooltip hint says. */
export function formatBinding(binding: Binding): string {
  const parts: string[] = [];
  if (binding.mod) parts.push(MOD_LABEL);
  if (binding.shift) parts.push('⇧');
  parts.push(KEY_LABELS[binding.key] ?? binding.key.toUpperCase());
  return parts.join(' ');
}

/**
 * A keydown as a binding, or `null` when there is nothing to bind yet.
 *
 * A modifier on its own is not a shortcut — it is the first half of one — and
 * recording it would end the capture the instant someone reached for ⌘.
 */
export function bindingFromEvent(event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>): Binding | null {
  const key = event.key.toLowerCase();
  if (['meta', 'control', 'shift', 'alt', 'dead'].includes(key)) return null;
  const mod = event.metaKey || event.ctrlKey;
  // Without a modifier a shortcut would fire while typing a URL or a body.
  if (!mod) return null;
  return { key, mod: true, ...(event.shiftKey ? { shift: true } : {}) };
}

export function sameBinding(a: Binding, b: Binding): boolean {
  return a.key === b.key && Boolean(a.mod) === Boolean(b.mod) && Boolean(a.shift) === Boolean(b.shift);
}

/**
 * Which commands would answer to the same keys.
 *
 * Returned as a map rather than a boolean so the screen can point at both rows
 * — being told "that is taken" without being told by what is the kind of
 * message that sends someone hunting.
 */
export function bindingConflicts(bindings: BindingMap): Partial<Record<CommandId, CommandId[]>> {
  const conflicts: Partial<Record<CommandId, CommandId[]>> = {};
  const ids = Object.keys(bindings) as CommandId[];
  for (const id of ids) {
    const clashing = ids.filter((other) => other !== id && sameBinding(bindings[id], bindings[other]));
    if (clashing.length > 0) conflicts[id] = clashing;
  }
  return conflicts;
}

export function labelFor(id: CommandId): string {
  return COMMANDS.find((command) => command.id === id)?.label ?? id;
}
