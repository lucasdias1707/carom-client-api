import { forwardRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type IconButtonProps = {
  /** Both the tooltip and the accessible name — one string, so they cannot drift. */
  label: string;
  /** A shortcut or a caveat, shown under the label in the tooltip. */
  hint?: string;
  children: ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  className?: string;
  tone?: 'default' | 'accent' | 'danger';
  testId?: string;
};

/**
 * The square icon button used across the toolbars, with its tooltip.
 *
 * A `title` attribute was doing this job before, which meant waiting out the
 * browser's own delay, no styling, and nothing at all on a touch device. Radix
 * shows the same text on hover *and* on keyboard focus, which is the part
 * `title` never did.
 *
 * The tooltip and `aria-label` come from the same prop deliberately: a button
 * whose tooltip says one thing and whose screen-reader name says another is a
 * bug waiting for someone who cannot see the tooltip.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, hint, children, className, tone = 'default', testId, ...props },
  ref,
) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          ref={ref}
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          data-testid={testId}
          className={cn(
            'h-7 w-7 shrink-0 rounded-[var(--radius-sm)] text-[var(--text-dim)] [&_svg]:size-[15px]',
            'hover:text-[var(--text-strong)] disabled:opacity-40',
            tone === 'accent' && 'text-[var(--accent)] bg-[var(--accent-soft)]',
            tone === 'danger' && 'hover:text-[var(--red)]',
            className,
          )}
          {...props}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {hint ? <span className="ml-1.5 opacity-60">{hint}</span> : null}
      </TooltipContent>
    </Tooltip>
  );
});
