import { useState } from 'react';
import { FolderOpen, GitBranch } from 'lucide-react';
import { Dialog } from '@/components/common/Dialog';
import { useToast } from '@/components/common/Toaster';
import { Button } from '@/components/ui/button';
import { pickWorkspaceDir } from '@/lib/workspace-store-file';
import { useWorkspace } from '@/state/workspace-store';

/**
 * Choosing the folder a workspace lives in.
 *
 * One door, not two: a folder is either empty, in which case this workspace
 * becomes its contents, or it already holds one, in which case that is what
 * gets opened. The app can tell which, so asking would be asking a question it
 * already knows the answer to.
 *
 * The dialog exists at all to say the three things someone is entitled to know
 * before pointing this at a repository: what ends up in the folder, what stays
 * on this machine, and that variable *values* only travel where they are told
 * to — which is the part that decides whether a token ends up committed.
 */
export function LinkWorkspaceDialog({
  onClose,
  onPicked,
}: {
  onClose: () => void;
  onPicked: (path: string) => void;
}) {
  const { t, tNodes } = useWorkspace();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    setBusy(true);
    try {
      const path = await pickWorkspaceDir();
      if (path) onPicked(path);
      else onClose();
    } catch (error) {
      toast({
        title: t('linked.pickFailed'),
        description: error instanceof Error ? error.message : String(error),
        kind: 'error',
      });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      title={t('linked.title')}
      description={t('linked.description')}
      onClose={onClose}
      testId="dialog-link-workspace"
      footer={
        <>
          <span className="spacer" />
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button disabled={busy} onClick={() => void pick()} data-testid="button-link-choose">
            <FolderOpen size={13} /> {t('linked.choose')}
          </Button>
        </>
      }
    >
      <div className="stack" style={{ gap: 12 }}>
        <p className="hint" style={{ margin: 0 }}>{t('linked.chooseHint')}</p>

        <div className="stack" style={{ gap: 4 }}>
          <div className="section-label">
            <GitBranch size={12} /> {t('linked.whyFolder')}
          </div>
          <p className="hint" style={{ margin: 0 }}>{t('linked.whyFolderHint')}</p>
        </div>

        <p className="hint" style={{ margin: 0 }}>{t('linked.contentsNote')}</p>
        <p className="hint" style={{ margin: 0 }}>
          {tNodes('linked.secretsNote', { example: <code>{'{{baseUrl}}'}</code> })}
        </p>
      </div>
    </Dialog>
  );
}
