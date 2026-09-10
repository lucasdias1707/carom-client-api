import { type ReactNode } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type MenuEntry =
  | { kind: 'item'; label: string; icon?: ReactNode; danger?: boolean; onSelect: () => void }
  | { kind: 'separator' };

type ContextMenuProps = {
  x: number;
  y: number;
  entries: MenuEntry[];
  onClose: () => void;
};

/**
 * The right-click menu, opened at a point.
 *
 * Radix menus hang off a trigger element, and there is no element here — the
 * anchor is wherever the pointer was. So the trigger is an empty span pinned
 * at that point: zero-sized, so the menu opens exactly there, and Radix then
 * owns everything the hand-written version had to do by hand or did not do at
 * all — flipping when it would fall off the screen, Escape, the click outside,
 * arrow keys and typeahead through the items, and giving focus back to the
 * tree afterwards.
 */
export function ContextMenu({ x, y, entries, onClose }: ContextMenuProps) {
  return (
    <DropdownMenu
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DropdownMenuTrigger asChild>
        <span aria-hidden className="fixed h-0 w-0" style={{ left: x, top: y }} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="bottom"
        sideOffset={0}
        className="min-w-[184px] border-[var(--border-strong)] bg-[var(--bg-raised)] text-[length:var(--fs-13)] shadow-[var(--shadow-pop)]"
        data-testid="context-menu"
      >
        {entries.map((entry, index) =>
          entry.kind === 'separator' ? (
            <DropdownMenuSeparator key={`sep-${index}`} className="bg-[var(--border)]" />
          ) : (
            <DropdownMenuItem
              key={entry.label}
              onSelect={entry.onSelect}
              className={
                entry.danger
                  ? 'gap-2 text-[length:var(--fs-13)] text-[var(--red)] focus:text-[var(--red)] [&_svg]:size-[14px]'
                  : 'gap-2 text-[length:var(--fs-13)] [&_svg]:size-[14px]'
              }
            >
              {entry.icon}
              {entry.label}
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
