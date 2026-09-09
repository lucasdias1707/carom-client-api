import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';

type ConfirmDialogProps = {
  title: string;
  /** What is about to happen, in enough detail to decide. */
  message: React.ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * A last check before something disappears.
 *
 * An alert dialog rather than a plain one, which is the distinction Radix
 * draws and screen readers act on: this interrupts to ask a question, so it is
 * announced as an alert and clicking the backdrop does not dismiss it — losing
 * the question by missing the button is not an answer.
 *
 * The confirm button is focused rather than cancel: someone who opened the menu
 * and chose Delete has already decided, and Enter should agree with them.
 * Escape still backs out, and the delete can be undone from the toast — this
 * guards the misclick, not the decision.
 */
export function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent
        className="max-w-[460px] gap-3 overflow-hidden rounded-[10px] border-[var(--border-strong)] bg-[var(--bg-surface)] p-0 text-[var(--text)] shadow-[var(--shadow-pop)]"
        data-testid="dialog-confirm"
      >
        <AlertDialogHeader className="space-y-0 border-b border-[var(--border)] px-3.5 py-2.5 text-left sm:text-left">
          <AlertDialogTitle className="text-[14px] font-semibold text-[var(--text-strong)]">{title}</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription
          className="px-[14px] text-[12.5px] leading-relaxed text-[var(--text-dim)]"
          data-testid="text-confirm-message"
        >
          {message}
        </AlertDialogDescription>
        <AlertDialogFooter className="flex flex-row items-center justify-end gap-2 border-t border-[var(--border)] bg-[var(--bg-raised)] px-3.5 py-2.5 sm:space-x-0">
          <AlertDialogCancel
            className={buttonVariants({ variant: 'secondary' })}
            onClick={onCancel}
            data-testid="button-cancel-confirm"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: 'destructive' })}
            onClick={onConfirm}
            autoFocus
            data-testid="button-accept-confirm"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
