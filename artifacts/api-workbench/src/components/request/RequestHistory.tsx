import { useState } from 'react';
import { History, RotateCcw, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { sectionText } from '@/lib/draft';
import { formatRelative } from '@/lib/format';
import { MAX_VERSIONS_PER_REQUEST, versionsFor } from '@/lib/versions';
import { useWorkspace } from '@/state/workspace-store';
import type { RequestRecord } from '@/types';

/**
 * What this request used to be, one entry per save.
 *
 * A version is only written at ⌘S, so the list is the decisions rather than the
 * keystrokes — and restoring one puts it back into the draft, where the Save
 * and Revert you already know take over. Nothing here changes the saved request
 * on its own.
 */
export function RequestHistory({ request }: { request: RequestRecord }) {
  const { state, dispatch } = useWorkspace();
  const [openId, setOpenId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  // The saved request, not what is on screen: comparing a version against an
  // unsaved draft would show edits that are not part of any version's story.
  const saved = state.requests.find((item) => item.id === request.id) ?? request;
  const versions = versionsFor(state.versions, request.id);

  if (versions.length === 0) {
    return (
      <div className="pane-pad stack">
        <div className="section-label">Saved versions</div>
        <p className="hint" data-testid="text-no-versions">
          Nothing saved yet. Each time you save a request — ⌘S, the Save button, or saving on the way out of a tab —
          the version before it is kept here, and can be brought back.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="pane-pad stack" style={{ gap: 8 }}>
        <div className="section-label">
          Saved versions
          <span className="spacer" />
          <span>
            {versions.length} of {MAX_VERSIONS_PER_REQUEST} kept
          </span>
          <Button variant="ghost" size="sm" onClick={() => setClearing(true)} data-testid="button-clear-versions">
            <Trash2 size={12} /> Clear
          </Button>
        </div>

        <div data-testid="list-request-versions">
          {versions.map((version) => {
            const open = version.id === openId;
            /* Against what is saved now, so the panel answers "what would come
               back if I restored this", not "what did that save change". */
            const differs = version.changed.length > 0 ? version.changed : ['Name'];
            return (
              <div key={version.id}>
                <button
                  className={`history-row ${open ? 'active' : ''}`}
                  onClick={() => setOpenId(open ? null : version.id)}
                  data-testid={`button-version-${version.id}`}
                >
                  <History size={12} style={{ color: 'var(--text-faint)' }} />
                  <span className={`tab-method m-${version.request.method.toLowerCase()}`} style={{ width: 46 }}>
                    {version.request.method}
                  </span>
                  <span className="mono truncate" style={{ flex: 1, fontSize: 'var(--fs-11)' }}>
                    {version.request.url || '—'}
                  </span>
                  {version.changed.slice(0, 3).map((label) => (
                    <Badge key={label} variant="accent">{label}</Badge>
                  ))}
                  {version.changed.length > 3 ? (
                    <Badge variant="accent">+{version.changed.length - 3}</Badge>
                  ) : null}
                  <span className="status-meta" style={{ width: 72, textAlign: 'right' }}>
                    {formatRelative(version.savedAt)}
                  </span>
                </button>

                {open ? (
                  <div className="version-detail" data-testid={`version-detail-${version.id}`}>
                    {differs.map((label) => {
                      const then = sectionText(version.request, label);
                      const now = sectionText(saved, label);
                      return (
                        <div className="version-field" key={label}>
                          <span className="section-label m-0">{label}</span>
                          <span className="version-then mono">{then || '—'}</span>
                          <span className="version-now mono">{now || '—'}</span>
                        </div>
                      );
                    })}
                    <div className="version-actions">
                      <p className="hint" style={{ margin: 0 }}>
                        Restoring brings this back as an unsaved change — it is yours to save or revert.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => dispatch({ type: 'request/restore-version', versionId: version.id })}
                        data-testid={`button-restore-${version.id}`}
                      >
                        <RotateCcw size={12} /> Restore
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {clearing ? (
        <ConfirmDialog
          title="Forget this request's history?"
          message={
            <>
              All {versions.length} saved version{versions.length === 1 ? '' : 's'} of <strong>{saved.name}</strong> go.
              The request itself stays exactly as it is.
            </>
          }
          confirmLabel="Clear history"
          onCancel={() => setClearing(false)}
          onConfirm={() => {
            dispatch({ type: 'request/clear-versions', id: request.id });
            setClearing(false);
          }}
        />
      ) : null}
    </>
  );
}
