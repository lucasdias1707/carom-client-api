import { useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/components/common/Toaster';
import {
  adoptWorkspaceFile,
  fingerprint,
  parseWorkspaceFile,
  serialiseWorkspaceFile,
  toWorkspaceFile,
} from '@/lib/workspace-file';
import { readWorkspaceFile, writeWorkspaceFile } from '@/lib/workspace-store-file';
import { useWorkspace } from '@/state/workspace-store';

/** How long editing has to stop before the file is written. */
const WRITE_DELAY = 500;

/**
 * Keep a linked workspace and its file in step.
 *
 * Read when the workspace is opened; write, shortly after, whenever anything
 * in it moves. The delay is not for performance — it is so a file in someone's
 * repository does not get a commit's worth of churn from every keystroke in a
 * URL bar.
 *
 * The fingerprint is what stops the two chasing each other. Reading a file
 * produces a state change, which looks to the writer exactly like an edit
 * worth saving, which would rewrite the file and produce another change.
 * Comparing what was last seen against what is there now — ignoring the
 * timestamp, which always differs — breaks that loop, and as a side effect
 * keeps the file out of `git status` when nothing has really changed.
 */
export function useLinkedWorkspace() {
  const { state, dispatch, t } = useWorkspace();
  const { toast } = useToast();

  const workspace = state.workspaces.find((item) => item.id === state.activeWorkspaceId);
  const path = workspace?.filePath ?? null;

  /** The contents last read from or written to the file, per path. */
  const seen = useRef(new Map<string, string>());
  const timer = useRef<number | null>(null);
  /** Set while a read is in flight, so the writer does not race it. */
  const loading = useRef<string | null>(null);

  const load = useCallback(
    async (target: string, announce: boolean) => {
      if (!workspace) return;
      loading.current = target;
      try {
        const parsed = parseWorkspaceFile(await readWorkspaceFile(target));

        if (parsed.kind === 'invalid') {
          toast({
            title: t('linked.unreadable'),
            description: t(
              parsed.reason === 'unreadable' ? 'linked.notJson' : 'linked.notAWorkspace',
            ),
            kind: 'error',
          });
          return;
        }

        if (parsed.kind === 'empty') {
          // A link pointing at nothing yet: the workspace as it stands becomes
          // the file's first contents, rather than being wiped by it.
          const file = toWorkspaceFile(state, workspace.id);
          await writeWorkspaceFile(target, serialiseWorkspaceFile(file));
          seen.current.set(target, fingerprint(file));
          if (announce) toast({ title: t('linked.written'), kind: 'success' });
          return;
        }

        seen.current.set(target, fingerprint(parsed.file));
        const adopted = adoptWorkspaceFile(parsed.file, workspace.id);
        dispatch({ type: 'workspace/adopt', id: workspace.id, name: parsed.file.name, ...adopted });
        if (announce) toast({ title: t('linked.loaded'), kind: 'success' });
      } catch (error) {
        toast({
          title: t('linked.unreadable'),
          description: error instanceof Error ? error.message : String(error),
          kind: 'error',
        });
      } finally {
        loading.current = null;
      }
    },
    // `state` is read inside for the empty case only, and adding it here would
    // reload the file on every keystroke. The path and the workspace are what
    // decide whether a load is the right thing to do.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workspace?.id, dispatch, toast, t],
  );

  /** Read when the workspace is opened, or when it is pointed somewhere new. */
  useEffect(() => {
    if (!path) return;
    // Already in step with this file: opening the workspace again should not
    // throw away edits made since, which a reload would.
    if (seen.current.has(path)) return;
    void load(path, false);
  }, [path, load]);

  /** Write, once editing settles. */
  useEffect(() => {
    if (!path || !workspace) return;
    if (loading.current === path) return;

    const file = toWorkspaceFile(state, workspace.id);
    const mark = fingerprint(file);
    if (seen.current.get(path) === mark) return;

    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void (async () => {
        try {
          await writeWorkspaceFile(path, serialiseWorkspaceFile(file));
          seen.current.set(path, mark);
        } catch (error) {
          toast({
            title: t('linked.notWritten'),
            description: error instanceof Error ? error.message : String(error),
            kind: 'error',
          });
        }
      })();
    }, WRITE_DELAY);

    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [state, path, workspace, toast, t]);

  /** Re-read on demand, for when the file moved underneath — a pull, say. */
  const reload = useCallback(() => {
    if (!path) return;
    seen.current.delete(path);
    void load(path, true);
  }, [path, load]);

  /** Forget what was last seen, so the next render writes whatever is here. */
  const forget = useCallback((target: string) => {
    seen.current.delete(target);
  }, []);

  return { path, reload, forget };
}
