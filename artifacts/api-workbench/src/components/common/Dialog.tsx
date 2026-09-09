import { useRef, type ReactNode } from 'react';
import {
  Dialog as UiDialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type DialogProps = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  align?: 'center' | 'top';
  testId?: string;
};

/**
 * Every modal in the app, over Radix.
 *
 * The props are unchanged from the hand-written version this replaces, so the
 * ten call sites did not move. What changed is underneath: Radix traps focus
 * (Tab used to walk out of the dialog and into the page behind it after the
 * last field), returns focus to whatever opened the dialog, marks the rest of
 * the page inert for screen readers, and owns Escape and the click outside.
 *
 * The one behaviour kept from before is where focus lands on open: the first
 * `[data-autofocus]`, else the first field in the body. Radix would otherwise
 * take the close button, which puts the caret nowhere useful in a dialog whose
 * whole purpose is typing.
 */
export function Dialog({ title, description, onClose, children, footer, wide, align = 'center', testId }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <UiDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        ref={ref}
        className={cn(
          'flex max-h-[82vh] flex-col gap-0 overflow-hidden border-[var(--border-strong)] bg-[var(--bg-surface)] p-0 text-[var(--text)] shadow-[var(--shadow-pop)]',
          'rounded-[10px] sm:rounded-[10px]',
          wide ? 'max-w-[860px]' : 'max-w-[560px]',
          // A palette is looked at, not filled in: it sits high so the list has
          // room to grow downwards without the dialog jumping.
          align === 'top' && 'top-[12vh] translate-y-0 data-[state=closed]:slide-out-to-top-0 data-[state=open]:slide-in-from-top-0',
        )}
        data-testid={testId}
        onOpenAutoFocus={(event) => {
          const target =
            ref.current?.querySelector<HTMLElement>('[data-autofocus]') ??
            ref.current?.querySelector<HTMLElement>('.dialog-body input, .dialog-body textarea, .dialog-body select, .dialog-body [role="combobox"]');
          if (!target) return;
          event.preventDefault();
          target.focus();
        }}
      >
        <DialogHeader className="flex shrink-0 flex-col space-y-0.5 border-b border-[var(--border)] px-3.5 py-2.5 pr-10 text-left sm:text-left">
          <DialogTitle className="text-[14px] font-semibold text-[var(--text-strong)]">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-[12.5px] text-[var(--text-faint)]">{description}</DialogDescription>
          ) : null}
          {/* Radix wants a description for the dialog it labels; when there is
              nothing worth saying, say nothing rather than repeat the title. */}
          {description ? null : <DialogDescription className="sr-only">{title}</DialogDescription>}
        </DialogHeader>
        <div className="dialog-body min-h-0 flex-1 overflow-auto p-3.5">{children}</div>
        {footer ? (
          <DialogFooter className="flex shrink-0 flex-row items-center justify-end gap-2 border-t border-[var(--border)] bg-[var(--bg-raised)] px-3.5 py-2.5 sm:space-x-0">
            {footer}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </UiDialog>
  );
}
