import { useState } from 'react';
import { FileJson, FilePlus2 } from 'lucide-react';
import { Dialog } from '@/components/common/Dialog';
import { useToast } from '@/components/common/Toaster';
import { Button } from '@/components/ui/button';
import { pickWorkspaceFile } from '@/lib/workspace-store-file';
import { useWorkspace } from '@/state/workspace-store';

/**
 * Choosing the file a workspace lives in.
 *
 * Two doors, because the two cases behave differently and picking the wrong
 * one loses work: opening a file that already has requests in it **replaces**
 * what this workspace holds, and writing a new one keeps what is here. Saying
 * that before the file dialog opens is the whole reason this is a dialog
 * rather than going straight to the picker.
 *
 * It also says that environments travel with the requests, which is the part
 * someone is entitled to know before pointing this at a shared repository.
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

  const pick = async (save: boolean) => {
    setBusy(true);
    try {
      const path = await pickWorkspaceFile(save);
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
        </>
      }
    >
      <div className="stack" style={{ gap: 12 }}>
        <div className="stack" style={{ gap: 6 }}>
          <Button
            variant="secondary"
            className="justify-self-start"
            disabled={busy}
            onClick={() => void pick(false)}
            data-testid="button-link-existing"
          >
            <FileJson size={13} /> {t('linked.openExisting')}
          </Button>
          <span className="hint">{t('linked.openExistingHint')}</span>
        </div>

        <div className="stack" style={{ gap: 6 }}>
          <Button
            variant="secondary"
            className="justify-self-start"
            disabled={busy}
            onClick={() => void pick(true)}
            data-testid="button-link-new"
          >
            <FilePlus2 size={13} /> {t('linked.writeNew')}
          </Button>
          <span className="hint">{t('linked.writeNewHint')}</span>
        </div>

        <p className="hint" style={{ margin: 0 }}>{t('linked.contentsNote')}</p>
        <p className="hint" style={{ margin: 0 }}>
          {tNodes('linked.secretsNote', { example: <code>{'{{baseUrl}}'}</code> })}
        </p>
      </div>
    </Dialog>
  );
}
