import { Download, RefreshCw, RotateCw } from 'lucide-react';
import { useUpdates } from '@/state/update-store';
import { canSelfUpdate, describeDownload, releasePageUrl, restartApp } from '@/lib/updates';
import { useWorkspace } from '@/state/workspace-store';
import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

/**
 * The Updates panel.
 *
 * Rendered only on the desktop, by its caller. The check runs by itself; the
 * download never does. A `.deb` or `.rpm` install gets the same check but a
 * link instead of a button, because those files belong to the package manager.
 */
export function UpdatesSection() {
  const { state, dispatch } = useWorkspace();
  const settings = state.settings;
  // The check itself runs app-wide, so opening this dialog shows whatever was
  // already found rather than starting again.
  const updates = useUpdates();

  const selfUpdating = updates.installKind ? canSelfUpdate(updates.installKind) : true;

  return (
    <div>
      <div className="section-label">
        Updates
        <span className="spacer" />
        <Button variant="secondary" size="sm"
          onClick={updates.check}
          disabled={updates.phase === 'checking' || updates.phase === 'downloading'}
          data-testid="button-check-updates"
        >
          <RefreshCw /> {updates.phase === 'checking' ? 'Checking…' : 'Check now'}
        </Button>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Checkbox
          checked={settings.autoCheckUpdates}
          onCheckedChange={(checked) =>
            dispatch({ type: 'settings/update', patch: { autoCheckUpdates: checked === true } })
          }
          data-testid="checkbox-auto-check-updates"
        />
        Check for new versions when the app starts
      </label>

      <div style={{ marginTop: 10 }} data-testid="text-update-status">
        {updates.phase === 'current' ? <p className="hint">You are on the latest version.</p> : null}

        {updates.error ? (
          <p className="hint" style={{ color: 'var(--red)' }}>
            {updates.error.message}
          </p>
        ) : null}

        {updates.update && updates.phase !== 'ready' ? (
          <div className="stack" style={{ gap: 8 }}>
            <div>
              <strong>Version {updates.update.version}</strong>{' '}
              <span className="hint">is available — you have {updates.update.currentVersion}.</span>
            </div>

            {updates.update.notes ? (
              <pre className="update-notes">{updates.update.notes}</pre>
            ) : null}

            {selfUpdating ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Button
                  onClick={updates.download}
                  disabled={updates.phase === 'downloading'}
                  data-testid="button-download-update"
                >
                  <Download /> Download and install
                </Button>
                {updates.phase === 'downloading' ? (
                  <span className="hint mono">
                    {describeDownload(updates.progress.received, updates.progress.total)}
                  </span>
                ) : null}
              </div>
            ) : (
              <>
                <a
                  className={buttonVariants({ variant: 'secondary' })}
                  href={releasePageUrl(updates.update.version)}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="link-release-page"
                >
                  <Download /> Open the release page
                </a>
                <p className="hint">
                  This copy was installed from a <code>.deb</code> or <code>.rpm</code>, so the files belong to
                  your package manager and the app must not overwrite them. Download the new package and install
                  it the way you installed this one.
                </p>
              </>
            )}
          </div>
        ) : null}

        {updates.phase === 'ready' ? (
          <div className="stack" style={{ gap: 8 }}>
            <p className="hint">
              Version {updates.update?.version} is installed. It takes effect when the app restarts.
            </p>
            <Button onClick={() => void restartApp()} data-testid="button-restart-app">
              <RotateCw /> Restart now
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
