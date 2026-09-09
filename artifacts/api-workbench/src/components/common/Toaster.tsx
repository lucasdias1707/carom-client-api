import { type ReactNode } from 'react';
import { toast as sonnerToast } from 'sonner';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';

type ToastKind = 'success' | 'error' | 'info';

/** One button on a toast. Undo is the reason this exists. */
type ToastAction = { label: string; run: () => void };

type ToastApi = {
  toast: (toast: {
    title: string;
    description?: string;
    kind?: ToastKind;
    action?: ToastAction;
    durationMs?: number;
  }) => void;
};

const TOAST_MS = 4200;
/** An undo has to be read, understood and aimed at, which 4 seconds does not cover. */
const ACTION_TOAST_MS = 9000;

/**
 * Toasts, over sonner.
 *
 * `toast.custom` rather than sonner's own layout, because the shape here
 * carries meaning: the coloured left edge says at a glance whether something
 * worked, and Undo has to be a real button, not a link at the end of a
 * sentence. What sonner brings is the part that was hand-rolled before —
 * stacking, the timer pausing while the pointer is over the stack or the tab
 * is in the background, swipe to dismiss, and a live region that announces
 * each toast once.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <SonnerToaster
        position="bottom-right"
        offset={14}
        gap={8}
        visibleToasts={4}
        toastOptions={{ unstyled: true, classNames: { toast: 'w-full' } }}
        style={{ width: 'min(340px, calc(100vw - 28px))' }}
      />
    </>
  );
}

/**
 * Kept as a hook, and kept returning `{ toast }`, so the thirty-odd call sites
 * did not have to change when what is underneath did.
 */
export function useToast(): ToastApi {
  return { toast: showToast };
}

function showToast({
  title,
  description,
  kind = 'info',
  action,
  durationMs,
}: Parameters<ToastApi['toast']>[0]): void {
  sonnerToast.custom(
    (id) => (
      <div className={`toast ${kind}`} role="status" data-testid="status-toast">
        <div className="toast-text">
          <strong>{title}</strong>
          {description ? <span>{description}</span> : null}
        </div>
        {action ? (
          <button
            className="toast-action"
            onClick={() => {
              action.run();
              sonnerToast.dismiss(id);
            }}
            data-testid="button-toast-action"
          >
            {action.label}
          </button>
        ) : null}
      </div>
    ),
    { duration: durationMs ?? (action ? ACTION_TOAST_MS : TOAST_MS) },
  );
}
