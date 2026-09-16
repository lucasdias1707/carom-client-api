import { useEffect } from 'react';
import { Folder as FolderIcon, Layers, Settings2, X } from 'lucide-react';
import { KeyValueTable } from '@/components/request/KeyValueTable';
import { IconButton } from '@/components/common/IconButton';
import { Button } from '@/components/ui/button';
import { LOCAL_VARIABLE_COLOR } from '@/lib/template';
import { useWorkspace } from '@/state/workspace-store';
import type { Folder, KeyValue } from '@/types';

/**
 * The variables in reach of the request on screen, editable where they stand.
 *
 * The full editor answers "what environments do I have"; this answers the
 * question that actually comes up mid-request — "what is `{{baseUrl}}` right
 * now, and can I change it without losing my place". That is why it is a
 * drawer and not a modal: the request stays visible beside it, so a value can
 * be changed and the send repeated without anything closing.
 *
 * It shows both scopes because both reach the request and they do not behave
 * alike: a folder's variables beat the environment, so seeing only the
 * environment is how you edit a value and watch nothing change. The folders
 * are listed innermost first, in the order they win.
 */
export function EnvironmentDrawer({ onClose, onManage }: { onClose: () => void; onManage: () => void }) {
  const { state, dispatch, activeRequest, activeFolder, chainFor, t } = useWorkspace();

  // Escape closes it, the way every other layer here does. It is not a modal,
  // so nothing else is listening on its behalf.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // A popover or a menu inside the drawer answers Escape first; closing
      // the drawer as well would take away more than was asked for.
      if (event.key === 'Escape' && !event.defaultPrevented) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const environments = state.environments.filter(
    (environment) => environment.workspaceId === state.activeWorkspaceId,
  );
  const base = environments.find((environment) => environment.isBase) ?? null;
  const overlays = environments.filter((environment) => !environment.isBase);
  const activeId = state.activeEnvironmentId;

  /*
    Every environment, not only the one that is applied.

    It used to show the active one and the base, on the reasoning that those
    are what the request can actually see. That reading was too narrow: an
    environment created from the manage screen is not activated, so it did not
    appear here at all — you would add one and find the drawer showing no sign
    of it. "Quick editing" has to mean the thing you just made is there.

    Active first, then the rest in the order they were created, then the base,
    which is last because it is the one underneath. The ones that are not
    applied say so and switch to on a click, which is the other half of what
    this panel is for.
  */
  const ordered = [...overlays].sort((a, b) => {
    if (a.id === activeId) return -1;
    if (b.id === activeId) return 1;
    return 0;
  });

  /*
    Whichever pane the drawer was opened over, tested in the order the pane
    itself is chosen: a folder's own pane wins over a request. The reducer
    clears one when the other opens, so the two orders agree today — matching
    the pane is what keeps them agreeing if that ever changes.

    With neither there is no local scope to show, and the section says so
    rather than showing an empty table that looks broken.
  */
  const chain = activeFolder ? chainFor(activeFolder.id) : activeRequest ? chainFor(activeRequest.folderId) : [];

  const setEnvironment = (id: string, variables: KeyValue[]) =>
    dispatch({ type: 'environment/update', id, patch: { variables } });
  const setFolder = (folder: Folder, variables: KeyValue[]) =>
    dispatch({ type: 'folder/update', id: folder.id, patch: { variables } });

  return (
    <>
      {/* Dismisses on a click outside, like a menu. It is not a modal: nothing
          behind it is disabled, and the request it is about stays usable. */}
      <div className="drawer-scrim" onClick={onClose} data-testid="drawer-scrim" />
      <aside className="env-drawer" role="dialog" aria-label={t('drawer.title')} data-testid="drawer-environments">
        <header>
          <Layers size={13} style={{ color: 'var(--text-faint)' }} />
          <span className="drawer-title">{t('drawer.title')}</span>
          <span className="spacer" />
          <IconButton label={t('common.close')} onClick={onClose} testId="button-close-drawer">
            <X />
          </IconButton>
        </header>

        <div className="drawer-body">
          <section data-testid="drawer-global">
            <div className="section-label">
              <Layers size={12} style={{ color: 'var(--text-faint)' }} />
              {t('drawer.global')}
            </div>

            {overlays.length === 0 ? (
              <p className="hint" data-testid="text-drawer-no-environment">{t('drawer.noEnvironment')}</p>
            ) : (
              ordered.map((environment) => {
                const applied = environment.id === activeId;
                return (
                  <div
                    key={environment.id}
                    className="drawer-scope"
                    data-testid={`drawer-environment-${environment.id}`}
                  >
                    <div className="drawer-scope-name" style={{ color: environment.color }}>
                      <span className="var-dot" style={{ background: environment.color }} />
                      {environment.name}
                      <span className="spacer" />
                      {applied ? (
                        <span className="drawer-applied" data-testid="text-drawer-applied">
                          {t('drawer.applied')}
                        </span>
                      ) : (
                        /* Switching from here rather than going back to the
                           picker: you are already looking at the values, and
                           the question "which of these is on" is the one being
                           asked when they are side by side. */
                        <button
                          className="drawer-use"
                          onClick={() => dispatch({ type: 'environment/activate', id: environment.id })}
                          data-testid={`button-drawer-use-${environment.id}`}
                        >
                          {t('drawer.use')}
                        </button>
                      )}
                    </div>
                    <KeyValueTable
                      items={environment.variables}
                      onChange={(variables) => setEnvironment(environment.id, variables)}
                      testPrefix={`drawer-env-${environment.id}`}
                    />
                  </div>
                );
              })
            )}

            {base ? (
              <div className="drawer-scope" data-testid={`drawer-environment-${base.id}`}>
                {/* Named even when it is the only one: "Base" is what makes it
                    obvious that a value here applies to every environment. */}
                <div className="drawer-scope-name">{t('drawer.base')}</div>
                <KeyValueTable
                  items={base.variables}
                  onChange={(variables) => setEnvironment(base.id, variables)}
                  testPrefix={`drawer-env-${base.id}`}
                />
              </div>
            ) : null}
          </section>

          <section data-testid="drawer-local">
            <div className="section-label">
              <span className="var-dot" style={{ background: LOCAL_VARIABLE_COLOR }} />
              {t('drawer.local')}
            </div>
            {chain.length === 0 ? (
              <p className="hint" data-testid="text-drawer-no-folder">{t('drawer.noFolder')}</p>
            ) : (
              chain.map((folder) => (
                <div key={folder.id} className="drawer-scope" data-testid={`drawer-folder-${folder.id}`}>
                  <div className="drawer-scope-name" style={{ color: LOCAL_VARIABLE_COLOR }}>
                    <FolderIcon size={11} /> {folder.name}
                  </div>
                  <KeyValueTable
                    items={folder.variables ?? []}
                    onChange={(variables) => setFolder(folder, variables)}
                    testPrefix={`drawer-folder-${folder.id}`}
                  />
                </div>
              ))
            )}
          </section>

          <p className="hint">{t('drawer.precedence')}</p>
        </div>

        <footer>
          <Button variant="secondary" onClick={onManage} data-testid="button-drawer-manage">
            <Settings2 size={13} /> {t('environment.manage')}
          </Button>
        </footer>
      </aside>
    </>
  );
}
