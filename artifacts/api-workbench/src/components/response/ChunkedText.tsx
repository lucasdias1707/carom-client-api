import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { canSkipOffscreen, chunksOf, estimateLines } from '@/lib/body-window';
import { Windowed } from '@/components/response/Windowed';

/**
 * Plain text, however long.
 *
 * A browser can hold a 26 MB string and cannot lay one out as a single block:
 * measured, that was ten seconds on every tab switch. Cut into blocks, one that
 * is off screen costs nothing, so the whole body is drawn in a fifth of a second
 * and scrolls like any other page.
 *
 * Where the engine cannot skip what is off screen — a WebKit older than
 * Safari 18 — the blocks are still cheaper than one, but all of them are not, so
 * it falls back to drawing a window of the body and offering more.
 */
export function ChunkedText({
  text,
  wrap,
  testId,
  empty,
}: {
  text: string;
  wrap: boolean;
  testId: string;
  /** Shown instead of nothing. */
  empty: string;
}) {
  const skips = useMemo(canSkipOffscreen, []);
  if (text === '') {
    return (
      <pre className={`code fill ${wrap ? 'wrap' : ''}`} data-testid={testId}>
        {empty}
      </pre>
    );
  }
  return skips ? (
    <Blocks text={text} wrap={wrap} testId={testId} />
  ) : (
    <Windowed text={text}>{(visible) => <Blocks text={visible} wrap={wrap} testId={testId} />}</Windowed>
  );
}

function Blocks({ text, wrap, testId }: { text: string; wrap: boolean; testId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(80);
  const chunks = useMemo(() => chunksOf(text), [text]);

  // How many characters fit on a line, to guess a block's height before it is
  // drawn. The font and the pane's width are the two things that move it.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const size = parseFloat(getComputedStyle(element).fontSize) || 12.5;
      setColumns(Math.max(20, Math.floor((element.clientWidth - 24) / (0.6 * size))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`code fill chunked ${wrap ? 'wrap' : ''}`} data-testid={testId}>
      {chunks.map((chunk, index) => (
        <div
          key={index}
          className="code-chunk"
          style={{ ['--lines' as string]: estimateLines(chunk, columns, wrap) }}
        >
          {chunk}
        </div>
      ))}
    </div>
  );
}
