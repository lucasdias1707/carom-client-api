import { CodeEditor } from '@/components/request/CodeEditor';
import { useWorkspace } from '@/state/workspace-store';

type ScriptEditorProps = {
  preScript: string;
  postScript: string;
  onChange: (patch: { preScript?: string; postScript?: string }) => void;
  /** What the scripts hang off, which decides what the copy says about scope. */
  subject: 'request' | 'folder';
  testPrefix: string;
};

const PRE_PLACEHOLDER = `// carom.set('nonce', Date.now());
// carom.header('X-Nonce', carom.get('nonce'));`;

const POST_PLACEHOLDER = `// const body = carom.json();
// carom.set('token', body.access_token);`;

/**
 * The two script slots, shown the same way on a request and on a folder.
 *
 * Scripts are JavaScript run in the app's own context — see `lib/scripts.ts`.
 * The warning below is the one place a person sees that before writing one, so
 * it stays visible rather than being tucked into a tooltip.
 */
export function ScriptEditor({ preScript, postScript, onChange, subject, testPrefix }: ScriptEditorProps) {
  const { variableTable, t, tNodes } = useWorkspace();

  return (
    <div className="pane-pad stack">
      <div className="section-label">{t('scripts.pre')}</div>
      <CodeEditor
        variables={variableTable}
        value={preScript}
        onChange={(value) => onChange({ preScript: value })}
        language="plain"
        placeholder={PRE_PLACEHOLDER}
        ariaLabel={t('scripts.pre')}
        testId={`${testPrefix}-pre-script`}
        style={{ minHeight: 130 }}
      />

      <div className="section-label">{t('scripts.post')}</div>
      <CodeEditor
        variables={variableTable}
        value={postScript}
        onChange={(value) => onChange({ postScript: value })}
        language="plain"
        placeholder={POST_PLACEHOLDER}
        ariaLabel={t('scripts.post')}
        testId={`${testPrefix}-post-script`}
        style={{ minHeight: 130 }}
      />

      <p className="hint">
        {t(subject === 'folder' ? 'scripts.scopeFolder' : 'scripts.scopeRequest')}{' '}
        {tNodes('scripts.api', {
          get: <code>carom.get</code>,
          set: <code>carom.set</code>,
          header: <code>carom.header</code>,
          json: <code>carom.json()</code>,
          pm: <code>pm.*</code>,
        })}
      </p>
      <p className="hint" data-testid="script-warning">
        <strong>{t('scripts.notSandboxedTitle')}</strong> {t('scripts.notSandboxedBody')}
      </p>
    </div>
  );
}
