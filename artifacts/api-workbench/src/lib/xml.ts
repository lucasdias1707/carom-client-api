/**
 * XML: colouring while it is being typed, a pretty-printer, and the
 * well-formedness check behind the editor's red border.
 *
 * Same rule as the JSON lexer, for the same reason: this is painted behind a
 * transparent textarea, so joining every token's text must reproduce the input
 * exactly. A single lost character slides the colours out from under the caret.
 * `DOMParser` cannot do that job — it rejects half-typed markup, which is what
 * markup is for most of its life.
 */

export type XmlTokenKind =
  /** `<`, `</`, `>`, `/>` and the `=` between an attribute and its value. */
  | 'tag-punct'
  /** The element name itself. */
  | 'tag'
  | 'attr'
  | 'attr-value'
  | 'comment'
  /** `<?xml ... ?>` and `<!DOCTYPE ...>`. */
  | 'meta'
  | 'cdata'
  | 'text';

export type XmlToken = { kind: XmlTokenKind; text: string };

const NAME = /[^\s"'=<>/]+/y;
const ATTR_VALUE = /"[^"]*"?|'[^']*'?/y;

/** Read to `close`, or to the end when it never arrives. */
function until(input: string, from: number, close: string): number {
  const at = input.indexOf(close, from);
  return at === -1 ? input.length : at + close.length;
}

export function lexXml(input: string): XmlToken[] {
  const tokens: XmlToken[] = [];
  const push = (kind: XmlTokenKind, text: string) => {
    if (!text) return;
    // Runs of text merge, so the mirror gets one span per stretch rather than
    // one per character.
    const last = tokens[tokens.length - 1];
    if (last && last.kind === kind && kind === 'text') last.text += text;
    else tokens.push({ kind, text });
  };

  let index = 0;
  while (index < input.length) {
    if (input[index] !== '<') {
      const next = input.indexOf('<', index);
      const to = next === -1 ? input.length : next;
      push('text', input.slice(index, to));
      index = to;
      continue;
    }

    if (input.startsWith('<!--', index)) {
      const to = until(input, index + 4, '-->');
      push('comment', input.slice(index, to));
      index = to;
      continue;
    }
    if (input.startsWith('<![CDATA[', index)) {
      const to = until(input, index + 9, ']]>');
      push('cdata', input.slice(index, to));
      index = to;
      continue;
    }
    if (input.startsWith('<?', index)) {
      const to = until(input, index + 2, '?>');
      push('meta', input.slice(index, to));
      index = to;
      continue;
    }
    if (input.startsWith('<!', index)) {
      const to = until(input, index + 2, '>');
      push('meta', input.slice(index, to));
      index = to;
      continue;
    }

    const opener = input.startsWith('</', index) ? '</' : '<';
    push('tag-punct', opener);
    index += opener.length;

    NAME.lastIndex = index;
    const name = NAME.exec(input);
    if (name && name.index === index) {
      push('tag', name[0]);
      index += name[0].length;
    }

    // Everything up to the tag's own `>`: attributes, whitespace, and any
    // stray character, each kept verbatim.
    while (index < input.length) {
      const char = input[index];
      if (char === '>') {
        push('tag-punct', '>');
        index += 1;
        break;
      }
      if (char === '/' && input[index + 1] === '>') {
        push('tag-punct', '/>');
        index += 2;
        break;
      }
      if (char === '=') {
        push('tag-punct', '=');
        index += 1;
        continue;
      }
      if (char === '"' || char === "'") {
        ATTR_VALUE.lastIndex = index;
        const value = ATTR_VALUE.exec(input) as RegExpExecArray;
        push('attr-value', value[0]);
        index += value[0].length;
        continue;
      }
      if (/\s/.test(char)) {
        push('text', char);
        index += 1;
        continue;
      }
      NAME.lastIndex = index;
      const attr = NAME.exec(input);
      if (attr && attr.index === index) {
        push('attr', attr[0]);
        index += attr[0].length;
        continue;
      }
      push('text', char);
      index += 1;
    }
  }

  return tokens;
}

type Chunk = { kind: 'open' | 'close' | 'self' | 'text' | 'other'; text: string; name: string };

/**
 * The document as a flat list of tags and the text between them.
 *
 * Built from the tokens rather than a second scanner, so the pretty-printer
 * and the colouring can never disagree about where a tag ends. Whitespace
 * inside a tag is collapsed to single spaces; everything else is kept as it
 * was typed.
 *
 * `null` means the input is not shaped like XML — an unterminated tag, or no
 * tag at all — and the caller leaves the text alone rather than guessing.
 */
function chunk(input: string): Chunk[] | null {
  const tokens = lexXml(input);
  const chunks: Chunk[] = [];
  let tags = 0;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token.kind === 'comment' || token.kind === 'cdata' || token.kind === 'meta') {
      chunks.push({ kind: 'other', text: token.text, name: '' });
      continue;
    }
    if (token.kind !== 'tag-punct' || (token.text !== '<' && token.text !== '</')) {
      chunks.push({ kind: 'text', text: token.text, name: '' });
      continue;
    }

    const opening = token.text === '<';
    let text = token.text;
    let name = '';
    let closed = false;
    index += 1;
    for (; index < tokens.length; index += 1) {
      const part = tokens[index];
      if (part.kind === 'tag') name ||= part.text;
      if (part.kind === 'text') {
        // Collapse the run of whitespace between attributes to one space, and
        // drop it entirely where a space would read as noise: before the tag
        // closes, or on either side of the `=` in `id = "7"`.
        const next = tokens[index + 1];
        const closes = next?.kind === 'tag-punct' && (next.text === '>' || next.text === '/>');
        const equals = text.endsWith('=') || (next?.kind === 'tag-punct' && next.text === '=');
        if (!closes && !equals && text !== '<' && text !== '</') text += ' ';
        continue;
      }
      text += part.text;
      if (part.kind === 'tag-punct' && (part.text === '>' || part.text === '/>')) {
        closed = true;
        break;
      }
    }
    if (!closed) return null;

    tags += 1;
    chunks.push({
      kind: opening ? (text.endsWith('/>') ? 'self' : 'open') : 'close',
      text,
      name,
    });
  }

  return tags === 0 ? null : chunks;
}

/**
 * Re-indent XML.
 *
 * An element holding nothing but text stays on one line — `<name>Ada</name>`
 * rather than three lines for six characters. Text is trimmed, which is what
 * every XML pretty-printer does and what makes the indentation readable; it
 * also means whitespace that was significant (mixed content, or
 * `xml:space="preserve"`) does not survive a Format. Formatting is a
 * deliberate press, never automatic, so that trade is the caller's to make.
 */
export function prettyXml(input: string, indent = '  '): { text: string; ok: boolean } {
  const chunks = chunk(input);
  if (!chunks) return { text: input, ok: false };

  const nodes = chunks
    .map((item) => (item.kind === 'text' ? { ...item, text: item.text.trim() } : item))
    .filter((item) => item.text !== '');

  const lines: string[] = [];
  let depth = 0;
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (node.kind === 'close') depth = Math.max(0, depth - 1);

    const inner = nodes[index + 1];
    const after = nodes[index + 2];
    if (node.kind === 'open' && inner?.kind === 'text' && after?.kind === 'close') {
      lines.push(indent.repeat(depth) + node.text + inner.text + after.text);
      index += 2;
      continue;
    }

    lines.push(indent.repeat(depth) + node.text);
    if (node.kind === 'open') depth += 1;
  }

  return { text: lines.join('\n'), ok: true };
}

/**
 * Why this XML will not parse, or `null` when it is fine.
 *
 * The same affordance the JSON body has: one line under the editor, and a red
 * border. It reports only what it is sure of — a closing tag that does not
 * match the element it lands on, one that closes nothing, an element still
 * open at the end. A tag that is only half typed is not an error yet, which is
 * why an unterminated `<` says nothing.
 */
export function xmlError(input: string): string | null {
  if (!input.trim()) return null;
  const chunks = chunk(input);
  if (!chunks) return null;

  const open: string[] = [];
  for (const node of chunks) {
    if (node.kind === 'open') open.push(node.name);
    if (node.kind === 'close') {
      const last = open.pop();
      if (last === undefined) return `</${node.name}> closes an element that was never opened`;
      if (last !== node.name) return `</${node.name}> does not close <${last}>`;
    }
  }
  return open.length > 0 ? `<${open[open.length - 1]}> is never closed` : null;
}
