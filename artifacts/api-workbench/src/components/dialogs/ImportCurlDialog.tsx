import { useState } from 'react';
import { Dialog } from '@/components/common/Dialog';
import { parseCurl } from '@/lib/curl';
import { createRequest } from '@/lib/factories';
import { useWorkspace } from '@/state/workspace-store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const SAMPLE = `curl https://api.github.com/repos/mountain-loop/yaak \\
  -H 'Accept: application/vnd.github+json'`;

export function ImportCurlDialog({ onClose }: { onClose: () => void }) {
  const { state, dispatch, t } = useWorkspace();
  const [command, setCommand] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    try {
      const parsed = parseCurl(command);
      if (!parsed.url) {
        setError(t('curl.noUrl'));
        return;
      }
      dispatch({
        type: 'request/create',
        request: createRequest({
          workspaceId: state.activeWorkspaceId,
          folderId: null,
          name: parsed.name,
          method: parsed.method,
          url: parsed.url,
          headers: parsed.headers,
          params: parsed.params,
          bodyType: parsed.bodyType,
          body: parsed.body,
          form: parsed.form,
          multipart: parsed.multipart,
          auth: parsed.auth,
          sortIndex: state.requests.length,
        }),
      });
      onClose();
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : t('curl.parseFailed'));
    }
  };

  return (
    <Dialog
      title={t('curl.title')}
      description={t('curl.description')}
      onClose={onClose}
      testId="dialog-import-curl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={!command.trim()} data-testid="button-confirm-import-curl">
            {t('curl.create')}
          </Button>
        </>
      }
    >
      <Textarea
        className="min-h-[170px] font-mono"
        value={command}
        placeholder={SAMPLE}
        spellCheck={false}
        onChange={(event) => {
          setCommand(event.target.value);
          setError(null);
        }}
        aria-label={t('curl.aria')}
        data-testid="textarea-curl"
      />
      {error ? (
        <div className="hint" style={{ color: 'var(--red)', marginTop: 8 }} data-testid="text-curl-error">
          {error}
        </div>
      ) : null}
      <p className="hint" style={{ marginTop: 8 }}>
        Headers, query parameters, JSON and form bodies, and <code>-u</code> basic auth are all carried over.
      </p>
    </Dialog>
  );
}
