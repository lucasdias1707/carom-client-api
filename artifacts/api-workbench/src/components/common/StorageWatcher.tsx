import { useEffect } from 'react';
import { useToast } from '@/components/common/Toaster';
import { onStorageStatus } from '@/lib/storage';
import { useT } from '@/state/workspace-store';

/**
 * Says so when storage stops keeping everything.
 *
 * Writing the workspace used to fail without a word when the browser's quota
 * ran out, and what someone found out about it was a lost afternoon. It speaks
 * when the situation *changes* — a rung of the ladder given up, nothing saved at
 * all, or saving working again — and not on every write, so a full disk is one
 * message and not a stream of them.
 */
export function StorageWatcher() {
  const { toast } = useToast();
  const t = useT();

  useEffect(
    () =>
      onStorageStatus((status) => {
        if (status === 'trimmed') {
          toast({ title: t('storage.trimmed.title'), description: t('storage.trimmed.body'), kind: 'info', durationMs: 12000 });
        } else if (status === 'failed') {
          toast({ title: t('storage.failed.title'), description: t('storage.failed.body'), kind: 'error', durationMs: 20000 });
        } else {
          toast({ title: t('storage.recovered'), kind: 'success' });
        }
      }),
    [toast, t],
  );

  return null;
}
