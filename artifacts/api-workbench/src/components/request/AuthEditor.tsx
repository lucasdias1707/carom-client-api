import { useWorkspace } from '@/state/workspace-store';
import type { MessageKey } from '@/locales/en';
import { TemplateField } from '@/components/request/TemplateField';
import { resolveAuth } from '@/lib/inherit';
import type { Auth, AuthType, Folder, VariableTable } from '@/types';
import { SelectField } from '@/components/common/SelectField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const AUTH_LABELS: Record<AuthType, MessageKey> = {
  inherit: 'auth.inherit',
  none: 'auth.none',
  bearer: 'auth.bearer',
  basic: 'auth.basic',
  apikey: 'auth.apiKey',
};

type AuthEditorProps = {
  auth: Auth;
  onChange: (auth: Auth) => void;
  /**
   * The folders to inherit through, nearest first. Empty means there is
   * nothing above this record, so "Inherit" is not offered.
   */
  chain?: Folder[];
  /** What the thing being edited is, for the copy. */
  subject: 'request' | 'folder';
  /**
   * Resolved variables, so a credential written as `{{token}}` reads the same
   * here as in the URL bar: coloured, hoverable, and red when it resolves to
   * nothing. Interpolation always worked — what was missing was any sign that
   * a typo like `{{tokne}}` would be sent literally.
   */
  variables: VariableTable;
};

export function AuthEditor({ auth, onChange, chain = [], subject, variables }: AuthEditorProps) {
  const { t, tNodes } = useWorkspace();
  const setAuth = (patch: Partial<Auth>) => onChange({ ...auth, ...patch });
  const inherited = resolveAuth({ ...auth, type: 'inherit' }, chain);
  const canInherit = chain.length > 0;

  const types = (Object.keys(AUTH_LABELS) as AuthType[]).filter((type) => type !== 'inherit' || canInherit);

  /**
   * Stop inheriting, keeping what was being inherited as a starting point.
   * Copying rather than clearing is the point of the button: someone detaching
   * usually wants to change one field of what the folder already sends.
   */
  const detach = () => onChange({ ...inherited.auth });

  return (
    <div className="pane-pad stack">
      <div className="section-label">
        {t('auth.title')}
        <span className="spacer" />
        <SelectField
          value={auth.type}
          onChange={(type) => setAuth({ type })}
          options={types.map((type) => ({ value: type, label: t(AUTH_LABELS[type]) }))}
          ariaLabel={t('auth.typeAria')}
          testId="select-auth-type"
          className="min-w-[170px]"
        />
      </div>

      {auth.type === 'inherit' ? (
        <div className="inherit-note" data-testid="auth-inherited">
          {inherited.from === 'folder' ? (
            <>
              <p>
                {tNodes('auth.inheritedFromFolder', {
                  type: <strong>{t(AUTH_LABELS[inherited.auth.type])}</strong>,
                  folder: <strong>{inherited.folder.name}</strong>,
                  scope: t(subject === 'folder' ? 'auth.scopeFolder' : 'auth.scopeRequest'),
                })}
              </p>
              <Button variant="secondary" size="sm" onClick={detach} data-testid="button-auth-detach">
                {t(subject === 'folder' ? 'auth.detachFolder' : 'auth.detachRequest')}
              </Button>
            </>
          ) : (
            <p>{t(subject === 'folder' ? 'auth.nothingAboveFolder' : 'auth.nothingAboveRequest')}</p>
          )}
        </div>
      ) : null}

      {auth.type === 'none' ? (
        <p className="hint">
          {tNodes('auth.noneHint', { header: <code>Authorization</code> })}
          {canInherit ? ` ${t('auth.noneOverrides')}` : ''}
        </p>
      ) : null}

      {auth.type === 'bearer' ? (
        <label className="stack" style={{ gap: 6 }}>
          <span className="section-label" style={{ margin: 0 }}>
            {t('auth.token')}
          </span>
          <TemplateField
            value={auth.token}
            table={variables}
            onChange={(token) => setAuth({ token })}
            placeholder="{{token}}"
            ariaLabel={t('auth.bearer')}
            testId="input-auth-token"
          />
        </label>
      ) : null}

      {auth.type === 'basic' ? (
        <div className="stack" style={{ gap: 10 }}>
          <label className="stack" style={{ gap: 6 }}>
            <span className="section-label" style={{ margin: 0 }}>
              {t('auth.username')}
            </span>
            <TemplateField
              value={auth.username}
              table={variables}
              onChange={(username) => setAuth({ username })}
              ariaLabel={t('auth.username')}
              testId="input-auth-username"
            />
          </label>
          <label className="stack" style={{ gap: 6 }}>
            <span className="section-label" style={{ margin: 0 }}>
              {t('auth.password')}
            </span>
            {/*
              The only field left masked, so a password typed in by hand is not
              on screen. A `{{variable}}` still resolves here — it just cannot
              be shown as a chip without unmasking everything around it.
            */}
            <Input
              className="font-mono"
              type="password"
              value={auth.password}
              onChange={(event) => setAuth({ password: event.target.value })}
              data-testid="input-auth-password"
            />
          </label>
        </div>
      ) : null}

      {auth.type === 'apikey' ? (
        <div className="stack" style={{ gap: 10 }}>
          <label className="stack" style={{ gap: 6 }}>
            <span className="section-label" style={{ margin: 0 }}>
              {t('auth.keyName')}
            </span>
            <TemplateField
              value={auth.apiKeyName}
              table={variables}
              onChange={(apiKeyName) => setAuth({ apiKeyName })}
              placeholder="X-Api-Key"
              ariaLabel={t('auth.keyName')}
              testId="input-auth-key-name"
            />
          </label>
          <label className="stack" style={{ gap: 6 }}>
            <span className="section-label" style={{ margin: 0 }}>
              {t('auth.keyValue')}
            </span>
            <TemplateField
              value={auth.apiKeyValue}
              table={variables}
              onChange={(apiKeyValue) => setAuth({ apiKeyValue })}
              ariaLabel={t('auth.keyValue')}
              testId="input-auth-key-value"
            />
          </label>
          <label className="stack" style={{ gap: 6 }}>
            <span className="section-label" style={{ margin: 0 }}>
              {t('auth.sendInLabel')}
            </span>
            <SelectField
              value={auth.apiKeyIn}
              onChange={(apiKeyIn) => setAuth({ apiKeyIn })}
              options={[
                { value: 'header', label: t('auth.sendHeader') },
                { value: 'query', label: t('auth.sendQuery') },
              ]}
              ariaLabel={t('auth.sendIn')}
              testId="select-auth-key-in"
              block
            />
          </label>
        </div>
      ) : null}

      {auth.type !== 'inherit' ? (
        <p className="hint">
          {tNodes(subject === 'folder' ? 'auth.variablesHintFolder' : 'auth.variablesHintRequest', {
            variables: <code>{'{{variables}}'}</code>,
          })}
        </p>
      ) : null}
    </div>
  );
}
