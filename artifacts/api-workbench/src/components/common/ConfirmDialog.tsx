import { useState } from 'react';
import { useT } from '@/state/workspace-store';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ConfirmDialogProps = {
  title: string;
  /** What is about to happen, in enough detail to decide. */
  message: React.ReactNode;
  /** Defaults to Delete, which is what most of these ask. */
  confirmLabel?: string;
  /**
   * A third answer, between confirming and backing out: "Don't save" to the
   * question "Save before closing?". Absent leaves the usual two buttons.
   */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /**
   * `danger` paints the confirm button as a deletion. A question that loses
   * nothing — closing a tab, say — asks in the ordinary colours.
   */
  tone?: 'danger' | 'default';
  /**
   * When set, the exact text has to be typed before the destructive button
   * works. For the deletions where a misclick costs everything at once.
   */
  requireText?: string;
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
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  secondaryLabel,
  onSecondary,
  tone = 'danger',
  requireText,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const t = useT();
  const [typed, setTyped] = useState('');
  const armed = requireText === undefined || typed.trim() === requireText;

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
          <AlertDialogTitle className="text-[length:var(--fs-14)] font-semibold text-[var(--text-strong)]">{title}</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription
          className="px-[14px] text-[length:var(--fs-12-5)] leading-relaxed text-[var(--text-dim)]"
          data-testid="text-confirm-message"
        >
          {message}
        </AlertDialogDescription>
        {requireText === undefined ? null : (
          <div className="stack px-[14px]" style={{ gap: 6 }}>
            {/*
              The name is deliberately outside the label. `.section-label`
              uppercases what it holds, so a workspace called "Personal" was
              displayed as PERSONAL while the field still demanded "Personal" —
              the dialog was asking for something it was not showing.
            */}
            <Label htmlFor="confirm-name" className="section-label m-0">
              {t('common.confirmTypeName')}
            </Label>
            <code className="confirm-required mono" data-testid="text-confirm-required">
              {requireText}
            </code>
            <Input
              id="confirm-name"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              aria-label={t('common.confirmTypeNameAria', { name: requireText })}
              data-testid="input-confirm-name"
              autoFocus
            />
          </div>
        )}
        <AlertDialogFooter className="flex flex-row items-center justify-end gap-2 border-t border-[var(--border)] bg-[var(--bg-raised)] px-3.5 py-2.5 sm:space-x-0">
          <AlertDialogCancel
            className={buttonVariants({ variant: 'secondary' })}
            onClick={onCancel}
            data-testid="button-cancel-confirm"
          >
            {t('common.cancel')}
          </AlertDialogCancel>
          {secondaryLabel ? (
            <AlertDialogAction
              className={buttonVariants({ variant: 'secondary' })}
              onClick={onSecondary}
              data-testid="button-secondary-confirm"
            >
              {secondaryLabel}
            </AlertDialogAction>
          ) : null}
          <AlertDialogAction
            className={buttonVariants({ variant: tone === 'danger' ? 'destructive' : 'default' })}
            onClick={onConfirm}
            disabled={!armed}
            // Focus the confirm button only when it is the thing to press. With
            // a name to type, the field is.
            autoFocus={requireText === undefined}
            data-testid="button-accept-confirm"
          >
            {confirmLabel ?? t('common.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
