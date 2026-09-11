import { useState } from 'react';
import { History, RotateCcw, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { sectionId, sectionText, type SectionId } from '@/lib/draft';
import { formatRelative } from '@/lib/format';
import { MAX_VERSIONS_PER_REQUEST, versionsFor } from '@/lib/versions';
import { useWorkspace } from '@/state/workspace-store';
import type { MessageKey } from '@/locales/en';
import type { RequestRecord } from '@/types';

/** A part of a request, named in the language on screen. */
const sectionLabel = (id: SectionId): MessageKey => `section.${id}` as MessageKey;

/**
 * What this request used to be, one entry per save.
 *
 * A version is only written at ⌘S, so the list is the decisions rather than the
 * keystrokes — and restoring one puts it back into the draft, where the Save
 * and Revert you already know take over. Nothing here changes the saved request
 * on its own.
 */
export function RequestHistory({ request }: { request: RequestRecord }) {
  const { state, dispatch, t, tNodes, language } = useWorkspace();
  const [openId, setOpenId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  // The saved request, not what is on screen: comparing a version against an
  // unsaved draft would show edits that are not part of any version's story.
  const saved = state.requests.find((item) => item.id === request.id) ?? request;
  const versions = versionsFor(state.versions, request.id);

  if (versions.length === 0) {
    return (
      <div className="pane-pad stack">
        <div className="section-label">{t('history.title')}</div>
        <p className="hint" data-testid="text-no-versions">
          {t('history.empty')}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="pane-pad stack" style={{ gap: 8 }}>
        <div className="section-label">
          {t('history.title')}
          <span className="spacer" />
          <span>{t('history.kept', { count: versions.length, max: MAX_VERSIONS_PER_REQUEST })}</span>
          <Button variant="ghost" size="sm" onClick={() => setClearing(true)} data-testid="button-clear-versions">
            <Trash2 size={12} /> {t('common.clear')}
          </Button>
        </div>

        <div data-testid="list-request-versions">
          {versions.map((version) => {
            const open = version.id === openId;
            /* Against what is saved now, so the panel answers "what would come
               back if I restored this", not "what did that save change". */
            const changed = version.changed.map(sectionId).filter((id): id is SectionId => id !== null);
            const differs = changed.length > 0 ? changed : (['name'] as SectionId[]);
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
                  {changed.slice(0, 3).map((id) => (
                    <Badge key={id} variant="accent">{t(sectionLabel(id))}</Badge>
                  ))}
                  {changed.length > 3 ? <Badge variant="accent">+{changed.length - 3}</Badge> : null}
                  <span className="status-meta" style={{ width: 72, textAlign: 'right' }}>
                    {formatRelative(version.savedAt, t, language)}
                  </span>
                </button>

                {open ? (
                  <div className="version-detail" data-testid={`version-detail-${version.id}`}>
                    {differs.map((id) => {
                      const then = sectionText(version.request, id);
                      const now = sectionText(saved, id);
                      return (
                        <div className="version-field" key={id}>
                          <span className="section-label m-0">{t(sectionLabel(id))}</span>
                          <span className="version-then mono">{then || '—'}</span>
                          <span className="version-now mono">{now || '—'}</span>
                        </div>
                      );
                    })}
                    <div className="version-actions">
                      <p className="hint" style={{ margin: 0 }}>
                        {t('history.restoreHint')}
                      </p>
                      <Button
                        size="sm"
                        onClick={() => dispatch({ type: 'request/restore-version', versionId: version.id })}
                        data-testid={`button-restore-${version.id}`}
                      >
                        <RotateCcw size={12} /> {t('history.restore')}
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
          title={t('history.clearTitle')}
          message={tNodes('history.clearMessage', {
            count: versions.length,
            name: <strong>{saved.name}</strong>,
          })}
          confirmLabel={t('history.clearConfirm')}
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
