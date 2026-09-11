import type { MessageKey } from '@/locales/en';
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
  | 'saveRequest'
  | 'searchTabs'
  | 'closeTab'
  | 'environments'
  | 'toggleSidebar'
  | 'settings';

export type ShortcutCommand = {
  id: CommandId;
  /**
   * How the shortcuts list names this command. A key, not a word: the `id`
   * beside it is what a rebind is stored against, so the name can change with
   * the language while what was rebound stays put.
   */
  label: MessageKey;
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
  { id: 'palette', label: 'shortcut.palette', defaultBinding: { key: 'k', mod: true } },
  { id: 'palette.requests', label: 'shortcut.paletteRequests', defaultBinding: { key: 'p', mod: true } },
  { id: 'palette.workspaces', label: 'shortcut.paletteWorkspaces', defaultBinding: { key: 'r', mod: true } },
  { id: 'palette.commands', label: 'shortcut.paletteCommands', defaultBinding: { key: 'p', mod: true, shift: true } },
  { id: 'send', label: 'shortcut.send', defaultBinding: { key: 'enter', mod: true } },
  { id: 'newRequest', label: 'shortcut.newRequest', defaultBinding: { key: 'n', mod: true } },
  { id: 'saveRequest', label: 'shortcut.saveRequest', defaultBinding: { key: 's', mod: true } },
  { id: 'searchTabs', label: 'shortcut.searchTabs', defaultBinding: { key: 'e', mod: true, shift: true } },
  { id: 'closeTab', label: 'shortcut.closeTab', defaultBinding: { key: 'w', mod: true } },
  { id: 'environments', label: 'shortcut.environments', defaultBinding: { key: 'e', mod: true } },
  { id: 'toggleSidebar', label: 'shortcut.toggleSidebar', defaultBinding: { key: 'b', mod: true } },
  { id: 'settings', label: 'shortcut.settings', defaultBinding: { key: ',', mod: true } },
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

export function labelFor(id: CommandId): MessageKey | CommandId {
  return COMMANDS.find((command) => command.id === id)?.label ?? id;
}
