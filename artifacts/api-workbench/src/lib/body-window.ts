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
