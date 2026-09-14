import { useCallback, useEffect, useRef, useState } from 'react';
import type { ResolvedVariable } from '@/types';

/** How long the pointer has to rest on a chip before the popover appears. */
export const OPEN_DELAY = 420;
/** Grace period to cross the gap between the chip and the popover. */
export const CLOSE_DELAY = 220;

export type Editing = { variable: ResolvedVariable | null; name: string; anchor: DOMRect };

/**
 * The timing behind "rest on a variable and it opens".
 *
 * Both fields that draw chips need exactly this, and the two delays are the
 * whole feel of the gesture — a hover that opens too eagerly fights with
 * reading, and one that closes too eagerly cannot be reached with the mouse.
 * Having them written twice is how those two numbers drift apart, so they are
 * written once.
 *
 * `held` is why the close is scheduled rather than immediate: leaving the chip
 * normally means leaving for the popover, which is a few pixels of nothing in
 * between.
 */
export function useVariableHover() {
  const [editing, setEditing] = useState<Editing | null>(null);
  const timer = useRef<number | null>(null);
  /** Set once the pointer is inside the popover, so it stops chasing the mouse. */
  const held = useRef(false);

  const clearTimer = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const open = useCallback(
    (anchor: DOMRect, name: string, variable: ResolvedVariable | null) => {
      clearTimer();
      held.current = false;
      setEditing({ variable, name, anchor });
    },
    [clearTimer],
  );

  const openAfterDelay = useCallback(
    (anchor: () => DOMRect, name: string, variable: ResolvedVariable | null) => {
      clearTimer();
      timer.current = window.setTimeout(() => open(anchor(), name, variable), OPEN_DELAY);
    },
    [clearTimer, open],
  );

  const scheduleClose = useCallback(() => {
    clearTimer();
    timer.current = window.setTimeout(() => {
      if (!held.current) setEditing(null);
    }, CLOSE_DELAY);
  }, [clearTimer]);

  const close = useCallback(() => {
    clearTimer();
    held.current = false;
    setEditing(null);
  }, [clearTimer]);

  /** The three handlers the popover itself needs, identical for every caller. */
  const popoverProps = {
    onPointerEnter: () => {
      held.current = true;
      clearTimer();
    },
    onPointerLeave: () => {
      held.current = false;
      scheduleClose();
    },
    onClose: close,
  };

  return { editing, open, openAfterDelay, scheduleClose, close, clearTimer, popoverProps };
}
