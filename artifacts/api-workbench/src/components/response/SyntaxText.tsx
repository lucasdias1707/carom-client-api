import { useMemo } from 'react';
import { mirrorTokens, type MirrorLanguage } from '@/lib/mirror-tokens';

type SyntaxTextProps = {
  text: string;
  language: MirrorLanguage;
  wrap: boolean;
  testId?: string;
};

/**
 * A read-only block of coloured code.
 *
 * It runs the same lexers as the editor's mirror, so a body is the same
 * colours whether you are writing it or reading the answer — and the JSON
 * theme in Settings reaches both, since the colours come from the same
 * variables.
 */
export function SyntaxText({ text, language, wrap, testId }: SyntaxTextProps) {
  const tokens = useMemo(() => mirrorTokens(text, language, null), [text, language]);

  return (
    <pre className={`code fill ${wrap ? 'wrap' : ''}`} data-testid={testId}>
      {tokens.map((token, index) => (
        <span key={index} className={`jt-${token.kind}`}>
          {token.text}
        </span>
      ))}
    </pre>
  );
}
