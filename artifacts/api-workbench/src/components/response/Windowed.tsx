import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { FIRST_WINDOW, NEXT_WINDOW, windowOf } from '@/lib/body-window';
import { useWorkspace } from '@/state/workspace-store';

/**
 * Draw a long body a window at a time, and say so.
 *
 * What is shown is handed to `children`, so the same limit serves a plain
 * `<pre>` and the coloured one. The notice sticks to the bottom of the pane:
 * it is the one thing on screen that explains why the text stops, and it
 * should not be somewhere you have to scroll to.
 */
export function Windowed({ text, children }: { text: string; children: (visible: string) => ReactNode }) {
  const { t, language } = useWorkspace();
  const [shown, setShown] = useState(FIRST_WINDOW);
  const visible = useMemo(() => windowOf(text, shown), [text, shown]);
  const remaining = text.length - visible.length;
  const count = (value: number) => value.toLocaleString(language);

  return (
    <>
      {children(visible)}
      {remaining > 0 ? (
        <div className="body-window" data-testid="notice-body-windowed">
          <span>{t('response.windowed', { shown: count(visible.length), total: count(text.length) })}</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShown(visible.length + NEXT_WINDOW)}
            data-testid="button-show-more-body"
          >
            {t('response.windowMore', { amount: count(Math.min(NEXT_WINDOW, remaining)) })}
          </Button>
        </div>
      ) : null}
    </>
  );
}
