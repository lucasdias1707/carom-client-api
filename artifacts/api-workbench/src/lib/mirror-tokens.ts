import { lexJson, type JsonTokenKind } from '@/lib/json-lexer';
import { VARIABLE_PATTERN } from '@/lib/template';
import { dynamicVariable } from '@/lib/dynamic';
import { lexXml, type XmlTokenKind } from '@/lib/xml';
import type { VariableTable } from '@/types';

/**
 * What the editor's mirror paints: JSON or XML colouring, with `{{variables}}`
 * picked out on top of it.
 *
 * The two have to be layered rather than chosen between. A body is JSON *and*
 * carries variables — `{"name":"{{first_name}}"}` is both a string token and a
 * variable inside it — and before this the variable was simply drawn as part of
 * the string, so a typo like `{{frist_name}}` looked exactly like a correct
 * one and went out on the wire as literal text.
 *
 * The invariant from `lexJson` and `lexXml` carries over unchanged and matters
 * just as much: joining every token's text must reproduce the input exactly,
 * because this is painted behind a transparent textarea and one lost character
 * slides every colour out from under the caret.
 */

/** The mirror paints one CSS class per kind, so JSON's and XML's do not overlap. */
export type MirrorKind = JsonTokenKind | XmlTokenKind;

export type MirrorToken = {
  kind: MirrorKind;
  text: string;
  /**
   * Set on a `{{...}}` span. `defined` is false when it resolves to nothing,
   * and `dynamic` marks the third case: a generator, which has no value now
   * and will have one when the request goes out.
   */
  variable?: { name: string; defined: boolean; dynamic: boolean };
};

/** What the editor can colour. `plain` is one uncoloured run. */
export type MirrorLanguage = 'json' | 'xml' | 'plain';

/** Where each `{{...}}` sits in the whole string, and what it is. */
type VariableSpan = { start: number; end: number; name: string };

function variableSpans(value: string): VariableSpan[] {
  return [...value.matchAll(VARIABLE_PATTERN)].map((match) => ({
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
    name: match[1].trim(),
  }));
}

/**
 * Lay the variable spans over the lexed tokens.
 *
 * Done against the whole string rather than inside each token, because a
 * variable does not respect token boundaries. `{"n": {{count}}}` lexes its
 * braces as separate pieces of punctuation with the name loose between them,
 * so a per-token search found nothing to highlight — and an unquoted variable
 * is exactly how a number or a boolean is written into a JSON body. It went
 * out looking like plain text while working perfectly.
 *
 * Inside a string the variable does fall within one token, and that case has
 * to keep working, which is why this splits spans over the lexer's output
 * rather than lexing around them: the lexer still sees the string whole and
 * still knows it is a string.
 *
 * The pieces of one span are emitted as a single token, taking the kind of the
 * piece it started in, so a variable is one chip however many tokens it
 * straddles.
 */
function applySpans(
  tokens: Array<{ kind: MirrorKind; text: string }>,
  value: string,
  table: VariableTable,
): MirrorToken[] {
  const spans = variableSpans(value);
  if (spans.length === 0) return tokens;

  const out: MirrorToken[] = [];
  let offset = 0;
  /** The span being assembled, when a token ended in the middle of one. */
  let open: { kind: MirrorKind; span: VariableSpan; text: string } | null = null;

  const closeOpen = () => {
    if (!open) return;
    const { name } = open.span;
    out.push({
      kind: open.kind,
      text: open.text,
      variable: {
        name,
        defined: table[name] !== undefined,
        dynamic: table[name] === undefined && dynamicVariable(name) !== null,
      },
    });
    open = null;
  };

  for (const token of tokens) {
    const start = offset;
    const end = offset + token.text.length;
    offset = end;

    let cursor = start;
    for (const span of spans) {
      if (span.end <= cursor || span.start >= end) continue;
      const from = Math.max(span.start, cursor);
      const to = Math.min(span.end, end);
      if (from > cursor) {
        closeOpen();
        out.push({ kind: token.kind, text: value.slice(cursor, from) });
      }
      if (open && open.span !== span) closeOpen();
      if (!open) open = { kind: token.kind, span, text: '' };
      open.text += value.slice(from, to);
      if (to === span.end) closeOpen();
      cursor = to;
    }
    if (cursor < end) {
      closeOpen();
      out.push({ kind: token.kind, text: value.slice(cursor, end) });
    }
  }
  closeOpen();
  return out;
}

/**
 * Tokens for the mirror.
 *
 * `language` decides only which colouring runs underneath; variables are picked
 * out either way, because a GraphQL query, an XML body or a script uses them
 * just as a JSON body does — `<host>{{base_url}}</host>` has to show a missing
 * variable as plainly as `{"url": "{{base_url}}"}` does.
 */
export function mirrorTokens(
  value: string,
  language: MirrorLanguage,
  /**
   * `null` for text that is not a template — a response body, say. A response
   * that happens to contain `{{x}}` is showing you two braces and a letter, not
   * an unresolved variable, and painting it red would be a lie.
   */
  table: VariableTable | null,
): MirrorToken[] {
  const base: Array<{ kind: MirrorKind; text: string }> =
    language === 'json' ? lexJson(value)
    : language === 'xml' ? lexXml(value)
    : [{ kind: 'plain', text: value }];
  return table === null ? base : applySpans(base, value, table);
}
