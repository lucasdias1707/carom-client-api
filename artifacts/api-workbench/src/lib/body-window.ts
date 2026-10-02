/**
 * How much of a body to draw at once.
 *
 * A browser can hold a 26 MB string without trouble and cannot lay one out: put
 * it in a single `<pre>` and the window is gone for ten seconds, every time the
 * tab is opened. The tree view never had this problem because it pages its
 * children; the plain-text views did not, so they draw a window of the body and
 * let someone ask for more. Nothing is lost — Copy and Save take the whole body.
 *
 * Measured in characters, because that is what a string is cut by.
 */

/** Enough to read the start of anything and cheap to lay out. */
export const FIRST_WINDOW = 250_000;
/** What one press of "show more" adds: a second or two to draw, not a freeze. */
export const NEXT_WINDOW = 1_000_000;
/** How far past the cut to look for a line break to end on. */
const LOOK_AHEAD = 200;

/** The first `shown` characters of `text`, cut where it will not look broken. */
export function windowOf(text: string, shown: number): string {
  if (text.length <= shown) return text;
  let end = shown;
  // A formatted body has a line break close by; ending on it reads as a clean
  // cut. A minified one is a single line, so there is nothing to find and the
  // cut stays where it is.
  // Only the next stretch is searched: on a body with no line breaks, looking
  // to the end of the string would read all 26 MB to find nothing.
  const nearby = text.slice(end, end + LOOK_AHEAD + 1).indexOf('\n');
  if (nearby !== -1) end += nearby;
  // Never end between the two halves of a surrogate pair, which draws as a
  // replacement character at the very edge.
  else if (isHighSurrogate(text.charCodeAt(end - 1))) end -= 1;
  return text.slice(0, end);
}

function isHighSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff;
}

/** The size of one block when a long body is drawn as many. */
export const CHUNK_SIZE = 100_000;

/**
 * A body cut into blocks, ending each on a line break when one is near.
 *
 * Drawn as separate blocks the browser can skip the ones that are off screen,
 * which is what makes a 26 MB body cost a fifth of a second instead of ten
 * seconds: layout is paid for per visible block, not per character in the body.
 * Cutting at a line break keeps a selection that spans two blocks from picking
 * up a break that was never in the text; a minified body has none to cut at and
 * is cut where the size says.
 */
export function chunksOf(text: string, size = CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + size, text.length);
    if (end < text.length) {
      const nearby = text.slice(end, end + LOOK_AHEAD + 1).indexOf('\n');
      if (nearby !== -1) end += nearby + 1;
      else if (isHighSurrogate(text.charCodeAt(end - 1))) end -= 1;
    }
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}

/**
 * How many lines a block will take, for the height reserved for it before it
 * has been drawn. Close is enough: the browser replaces the guess with the real
 * height the first time the block scrolls into view, and the guess only decides
 * how the scrollbar is sized until then.
 */
export function estimateLines(chunk: string, columns: number, wrap: boolean): number {
  let breaks = 0;
  for (let at = chunk.indexOf('\n'); at !== -1; at = chunk.indexOf('\n', at + 1)) breaks++;
  const lines = breaks + (chunk.endsWith('\n') ? 0 : 1);
  return wrap ? Math.max(lines, Math.ceil(chunk.length / Math.max(columns, 1))) : lines;
}

/** Whether this engine can skip drawing blocks that are off screen. */
export function canSkipOffscreen(): boolean {
  return typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('content-visibility', 'auto');
}
