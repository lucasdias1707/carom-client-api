import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { useVariableHover } from '@/hooks/use-variable-hover';
import { changedSpan, handleEditorKey, pairsFor } from '@/lib/editor-keys';
import { mirrorTokens, type MirrorLanguage } from '@/lib/mirror-tokens';
import { VariablePopover } from '@/components/request/VariablePopover';
import type { VariableTable } from '@/types';

type CodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  /**
   * Which colouring runs, and which bracket keys close themselves. 'plain'
   * gets the key handling alone; 'xml' also auto-closes `<`.
   */
  language?: MirrorLanguage;
  placeholder?: string;
  ariaLabel: string;
  testId?: string;
  invalid?: boolean;
  style?: CSSProperties;
  /**
   * Resolved variables, so `{{name}}` is drawn as a variable here too — red
   * when it resolves to nothing. Omit it and the text is coloured but no
   * variable is marked, which is what a caller with nothing to resolve wants.
   */
  variables?: VariableTable;
};

/**
 * The variable chip the pointer is over, if any.
 *
 * The mirror is behind the textarea and takes no pointer events, so the chips
 * cannot be asked directly — they are hit-tested instead. That is the whole
 * reason this works differently from `TemplateField`, where the mirror is on
 * top and the chips are real buttons: a single-line input can give its chips
 * to the pointer and hand the caret back by hand, but a textarea has
 * selection, drag, wheel and multi-line caret placement to lose, and hit-
 * testing costs none of it.
 *
 * `getClientRects` rather than `getBoundingClientRect`: a variable near the
 * end of a line wraps, and its bounding box then covers the whole width of
 * the editor including text it does not contain.
 */
function chipAt(mirror: HTMLElement | null, x: number, y: number): { name: string; rect: DOMRect } | null {
  if (!mirror) return null;
  for (const element of mirror.querySelectorAll<HTMLElement>('[data-var]')) {
    for (const rect of element.getClientRects()) {
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return { name: element.dataset.var ?? '', rect };
      }
    }
  }
  return null;
}

/**
 * A textarea with JSON colouring and the bracket and Tab behaviour of a real
 * editor.
 *
 * The textarea keeps the caret, the selection, undo and the browser's own text
 * handling; its text is transparent, and a mirror behind it paints the same
 * string in colour. The two have to agree on layout, which is why the
 * `.code-editor` rules set font, padding and wrapping on both at once.
 *
 * Resting on a `{{variable}}` opens the same editor the URL bar opens, so a
 * value used in a body can be changed — or defined for the first time —
 * without going to look for where it lives. The body is where most variables
 * are actually read, and it was the one place they could only be looked at.
 */
export function CodeEditor({
  value,
  onChange,
  language = 'plain',
  placeholder,
  ariaLabel,
  testId,
  invalid,
  style,
  variables,
}: CodeEditorProps) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const { editing, open, openAfterDelay, scheduleClose, clearTimer, popoverProps } = useVariableHover();
  /** The chip the open timer is counting down for, so moving within one chip does not restart it. */
  const hovered = useRef<string | null>(null);

  // Both scroll: the mirror has no scrollbar of its own, so it follows.
  const syncScroll = () => {
    const area = areaRef.current;
    const mirror = mirrorRef.current;
    if (!area || !mirror) return;
    mirror.scrollTop = area.scrollTop;
    mirror.scrollLeft = area.scrollLeft;
  };

  useLayoutEffect(syncScroll, [value]);

  const applyEdit = (next: { value: string; start: number; end: number }) => {
    const area = areaRef.current;
    if (!area) return;
    const current = area.value;

    // Route the change through the browser's own insertion, so one Ctrl+Z
    // undoes it. Assigning `value` directly wipes the undo stack, which is a
    // worse trade than a deprecated call every engine still implements.
    //
    // Only the span that actually changed is replaced. Selecting the whole
    // document and retyping it would work, but it makes every Tab a
    // document-sized undo step and rewrites the entire body on each keystroke.
    const [from, to, insert] = changedSpan(current, next.value);
    try {
      area.setSelectionRange(from, to);
      if (document.execCommand('insertText', false, insert)) {
        area.setSelectionRange(next.start, next.end);
        onChange(next.value);
        return;
      }
    } catch {
      // Fall through to the plain assignment below.
    }

    onChange(next.value);
    // React re-renders from state, so the caret is restored after that lands.
    requestAnimationFrame(() => area.setSelectionRange(next.start, next.end));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const area = event.currentTarget;
    const edit = handleEditorKey(
      { value: area.value, start: area.selectionStart, end: area.selectionEnd },
      event.key,
      event.shiftKey,
      pairsFor(language),
    );
    if (!edit) return;
    event.preventDefault();
    if (edit.value === area.value) {
      // A pure caret move, such as stepping over a closing brace.
      area.setSelectionRange(edit.start, edit.end);
      return;
    }
    applyEdit(edit);
  };

  /**
   * Start, keep or cancel the hover, from wherever the pointer is over the text.
   *
   * Tracked by name rather than by element because the mirror is re-rendered
   * on every keystroke: the span under the pointer is a different object a
   * moment later, and comparing objects would restart the timer on each one.
   */
  const onPointerOverText = (event: React.MouseEvent<HTMLTextAreaElement>) => {
    if (!variables) return;
    // Read off the event now rather than inside the timeout: the closure below
    // outlives the handler, and what it needs is where the pointer was.
    const { clientX, clientY } = event;
    const chip = chipAt(mirrorRef.current, clientX, clientY);
    if (!chip) {
      hovered.current = null;
      if (editing) scheduleClose();
      else clearTimer();
      return;
    }
    if (chip.name === hovered.current) return;
    hovered.current = chip.name;
    const { name } = chip;
    openAfterDelay(
      // Measured again when it fires: the text may have scrolled in between.
      () => chipAt(mirrorRef.current, clientX, clientY)?.rect ?? chip.rect,
      name,
      variables[name] ?? null,
    );
  };

  const tokens = mirrorTokens(value, language, variables ?? {});

  return (
    /*
      The popover is a sibling of the editor, not a child of it: every direct
      child of `.code-editor` is given the editor's own padding and font so the
      mirror and the textarea cannot drift apart, and the popover's anchor is a
      bare rect that must keep the size it was handed. It is fixed-positioned,
      so sitting outside costs it nothing.
    */
    <>
      <div className={`code-editor ${invalid ? 'invalid' : ''}`} style={style}>
        <div className="code-mirror" ref={mirrorRef} aria-hidden="true">
          {tokens.map((token, index) => (
            <span
              key={index}
              className={`jt-${token.kind}${
                token.variable
                  ? ` jt-var${token.variable.defined ? '' : token.variable.dynamic ? ' dynamic' : ' missing'}`
                  : ''
              }`}
              /* The name, so the hit test reads it off the element it found
               rather than keeping a second index of where every chip is. */
              data-var={token.variable?.name}
              data-testid={token.variable ? `body-var-${token.variable.name}` : undefined}
            >
              {token.text}
            </span>
          ))}
          {/* A trailing newline collapses in a div but not in a textarea; this
            keeps the last line of the two in the same place. */}
          {'\n'}
        </div>
        {/*
        A bare textarea, not the `Textarea` from `components/ui`: this one is
        transparent and sits exactly on top of the mirror, so every property
        that moves a glyph has to come from the shared `.code-editor > *` rule.
        A component with padding and a font of its own would slide the two
        apart.
      */}
        <textarea
          ref={areaRef}
          className="code-area"
          value={value}
          spellCheck={false}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          onScroll={() => {
            syncScroll();
            // The popover is anchored to a rect that has just moved.
            if (editing) scheduleClose();
          }}
          onMouseMove={onPointerOverText}
          onMouseLeave={() => {
            hovered.current = null;
            if (editing) scheduleClose();
            else clearTimer();
          }}
          onDoubleClick={(event) => {
            // For a pointer that cannot hover, and for anyone who would rather
            // not wait. A double-click off a chip is the browser's word select.
            const chip = chipAt(mirrorRef.current, event.clientX, event.clientY);
            if (chip) open(chip.rect, chip.name, variables?.[chip.name] ?? null);
          }}
          aria-label={ariaLabel}
          data-testid={testId}
        />
      </div>
      {editing ? (
        <VariablePopover name={editing.name} variable={editing.variable} anchor={editing.anchor} {...popoverProps} />
      ) : null}
    </>
  );
}
