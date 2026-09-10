import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { LOCAL_VARIABLE_COLOR, tokenize } from '@/lib/template';
import { VariablePopover } from '@/components/request/VariablePopover';
import type { ResolvedVariable, VariableTable } from '@/types';

type TemplateFieldProps = {
  value: string;
  table: VariableTable;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  ariaLabel: string;
  testId?: string;
  className?: string;
};

/** How long the pointer has to rest on a chip before the popover appears. */
const OPEN_DELAY = 420;
/** Grace period to cross the gap between the chip and the popover. */
const CLOSE_DELAY = 220;

type Editing = { variable: ResolvedVariable | null; name: string; anchor: DOMRect };

/**
 * The character the pointer is over, within the clicked chip's own text.
 *
 * The mirror renders the same string in the same font at the same offset as the
 * input, so asking the document where the caret would go lands on the right
 * character even when the field is scrolled sideways. The two spellings are the
 * standard one and WebKit's; if neither is there the caller falls back to the
 * end of the variable, which is at least a sane place to leave the caret.
 */
function offsetWithinChip(x: number, y: number): number | null {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  const position = doc.caretPositionFromPoint?.(x, y);
  if (position && position.offsetNode.nodeType === Node.TEXT_NODE) return position.offset;
  const range = doc.caretRangeFromPoint?.(x, y);
  if (range && range.startContainer.nodeType === Node.TEXT_NODE) return range.startOffset;
  return null;
}

/**
 * A text input whose `{{variables}}` are drawn coloured and hoverable.
 *
 * The input keeps its own text transparent and a mirror sits on top rendering
 * the same string with markup. The mirror ignores the pointer everywhere except
 * on the variable chips, so typing, selection and the caret still belong to the
 * real input.
 *
 * **Clicking a chip edits the text**, like clicking anywhere else in a URL:
 * the chip is drawn over the input, so the click is caught there and the caret
 * is put back at the character the pointer was on. Resting on it opens the
 * editor instead — the Postman gesture, and the one that does not fight with
 * fixing a typo in the middle of a variable name. Double-click opens it at
 * once, for a pointer that cannot hover.
 */
export function TemplateField({
  value,
  table,
  onChange,
  onSubmit,
  placeholder,
  ariaLabel,
  testId,
  className,
}: TemplateFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const timer = useRef<number | null>(null);
  /** Set once the pointer is inside the popover, so it stops chasing the mouse. */
  const held = useRef(false);

  const tokens = tokenize(value, table);

  const clearTimer = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clearTimer, []);

  const open = (target: HTMLElement, name: string, variable: ResolvedVariable | null) => {
    clearTimer();
    held.current = false;
    setEditing({ variable, name, anchor: target.getBoundingClientRect() });
  };

  const scheduleClose = () => {
    clearTimer();
    timer.current = window.setTimeout(() => {
      if (!held.current) setEditing(null);
    }, CLOSE_DELAY);
  };

  useLayoutEffect(() => {
    if (mirrorRef.current) mirrorRef.current.scrollLeft = scrollLeft;
  }, [scrollLeft, value]);

  return (
    <div className={`template-field ${className ?? ''}`}>
      <div className="template-mirror" ref={mirrorRef} aria-hidden="true">
        {tokens.map((token, index) => {
          if (token.kind === 'text') return <span key={index}>{token.text}</span>;
          const resolved = token.resolved;
          const style: CSSProperties = resolved
            ? { '--var-color': resolved.scope === 'folder' ? LOCAL_VARIABLE_COLOR : resolved.color } as CSSProperties
            : {};
          return (
            <button
              key={index}
              type="button"
              tabIndex={-1}
              className={`var-chip ${resolved ? '' : 'missing'}`}
              style={style}
              onMouseDown={(event) => {
                // The chip must not take focus or swallow the click: this is a
                // click in a text field, and it belongs to the caret.
                event.preventDefault();
                clearTimer();
                setEditing(null);
                const within = offsetWithinChip(event.clientX, event.clientY);
                const caret = within === null ? token.end : token.start + within;
                const input = inputRef.current;
                if (!input) return;
                input.focus();
                input.setSelectionRange(caret, caret);
              }}
              onDoubleClick={(event) => open(event.currentTarget, token.name, resolved)}
              onMouseEnter={(event) => {
                const chip = event.currentTarget;
                clearTimer();
                timer.current = window.setTimeout(() => open(chip, token.name, resolved), OPEN_DELAY);
              }}
              onMouseLeave={() => (editing ? scheduleClose() : clearTimer())}
              data-testid={`var-chip-${token.name}`}
            >
              {token.text}
            </button>
          );
        })}
      </div>
      <input
        ref={inputRef}
        value={value}
        spellCheck={false}
        autoComplete="off"
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onScroll={(event) => setScrollLeft(event.currentTarget.scrollLeft)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && onSubmit) {
            event.preventDefault();
            onSubmit();
          }
        }}
        aria-label={ariaLabel}
        data-testid={testId}
      />
      {editing ? (
        <VariablePopover
          name={editing.name}
          variable={editing.variable}
          anchor={editing.anchor}
          onPointerEnter={() => {
            held.current = true;
            clearTimer();
          }}
          onPointerLeave={() => {
            held.current = false;
            scheduleClose();
          }}
          onClose={() => {
            clearTimer();
            held.current = false;
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

export function scopeLabel(variable: ResolvedVariable): string {
  const where = variable.scope === 'folder' ? `folder “${variable.sourceName}”` : `environment “${variable.sourceName}”`;
  const scope = variable.scope === 'folder' ? 'local' : 'global';
  const shadowed = variable.shadowed.length
    ? ` · overrides ${variable.shadowed.length} other definition${variable.shadowed.length === 1 ? '' : 's'}`
    : '';
  return `${scope} · from ${where}${shadowed}`;
}
