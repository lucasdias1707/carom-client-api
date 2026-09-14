import { useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/components/common/Toaster';
import {
  looksSecret,
  rememberLocal,
  restoreLocal,
  shareKey,
  type LocalValues,
  type SharedValueKeys,
} from '@/lib/shared-values';
import { diffFiles, parseFiles, planFiles, type DirectoryFiles } from '@/lib/workspace-dir';
import { readWorkspaceDir, writeWorkspaceDir } from '@/lib/workspace-store-file';
import { useWorkspace } from '@/state/workspace-store';
import type { Environment, KeyValue } from '@/types';

/** How long editing has to stop before anything is written. */
const WRITE_DELAY = 600;

function sameFiles(a: DirectoryFiles, b: DirectoryFiles): boolean {
  if (a.size !== b.size) return false;
  for (const [path, contents] of a) if (b.get(path) !== contents) return false;
  return true;
}

/**
 * Keep a linked workspace and its directory in step.
 *
 * Read when the workspace is opened; write, once editing settles, and only the
 * files that actually differ. The delay is not about performance — it is so a
 * directory in someone's repository does not take a commit's worth of churn
 * from every keystroke in a URL bar.
 *
 * Two things here exist entirely to keep git out of trouble.
 *
 * The first is that a write re-reads the directory and refuses to proceed if
 * it has moved since — a `git pull` with the app open, most likely. Writing
 * over that would silently undo whatever was just pulled, and the reader would
 * find out from a diff they did not make.
 *
 * The second is which variable values are written at all. The directory itself
 * carries that decision, as `local: true` beside a name, so it is the
 * project's and not each machine's — one person deciding the token does not
 * travel decides it for everyone who pulls. A variable the file has never seen
 * falls back to the same guess used when a workspace is first linked: shared,
 * unless the name says it is a credential.
 */
export function useLinkedWorkspace() {
  const { state, dispatch, t } = useWorkspace();
  const { toast } = useToast();

  const workspace = state.workspaces.find((item) => item.id === state.activeWorkspaceId);
  const path = workspace?.linkedPath ?? null;

  /** The directory as this app last saw it, per path. */
  const seen = useRef(new Map<string, DirectoryFiles>());
  /** Variable names the directory says belong to the reader, per path. */
  const localNames = useRef(new Map<string, Set<string>>());
  const timer = useRef<number | null>(null);
  /** Set while a read is in flight, so the writer does not race it. */
  const loading = useRef<string | null>(null);
  /** Set once the directory has moved underneath, until it is reloaded. */
  const stale = useRef<string | null>(null);

  /** Does this variable's value travel with the project? */
  const sharesFor = useCallback(
    (target: string) =>
      (environment: Environment, variable: KeyValue): boolean => {
        const name = variable.key.trim();
        if (!name) return false;
        const known = localNames.current.get(target);
        if (known) return !known.has(shareKey(environment.id, name));
        // Never written before: the same guess the first link makes.
        return !looksSecret(name);
      },
    [],
  );

  const sharedSet = useCallback(
    (target: string, environments: Environment[]): SharedValueKeys => {
      const shared: SharedValueKeys = new Set();
      const decides = sharesFor(target);
      for (const environment of environments) {
        for (const variable of environment.variables) {
          const name = variable.key.trim();
          if (name && decides(environment, variable)) shared.add(shareKey(environment.id, name));
        }
      }
      return shared;
    },
    [sharesFor],
  );

  const load = useCallback(
    async (target: string, announce: boolean) => {
      if (!workspace) return;
      loading.current = target;
      try {
        const files = await readWorkspaceDir(target);
        const parsed = parseFiles(files, workspace.id);

        if (parsed.kind === 'not-ours') {
          toast({ title: t('linked.notOurs'), description: t('linked.notOursDetail'), kind: 'error' });
          return;
        }
        if (parsed.kind === 'unreadable') {
          toast({ title: t('linked.unreadable'), description: t('linked.unreadableFile', { file: parsed.file }), kind: 'error' });
          return;
        }

        if (parsed.kind === 'empty') {
          // A link pointing at an empty directory: this workspace becomes its
          // first contents, rather than being wiped by it.
          const environments = state.environments.filter((item) => item.workspaceId === workspace.id);
          const shared = sharedSet(target, environments);
          const wanted = planFiles(state, workspace.id, { shares: (e, v) => shared.has(shareKey(e.id, v.key.trim())) });
          await writeWorkspaceDir(target, wanted, []);
          seen.current.set(target, wanted);
          dispatch({
            type: 'workspace/local-values',
            id: workspace.id,
            values: rememberLocal(environments, shared, workspace.localValues ?? {}),
          });
          if (announce) toast({ title: t('linked.written'), kind: 'success' });
          return;
        }

        seen.current.set(target, files);
        const local = new Set<string>();
        for (const [environmentId, names] of parsed.localNames) {
          for (const name of names) local.add(shareKey(environmentId, name));
        }
        localNames.current.set(target, local);
        stale.current = null;

        dispatch({
          type: 'workspace/adopt',
          id: workspace.id,
          name: parsed.name,
          folders: parsed.folders,
          requests: parsed.requests,
          // Your own values put back over the blanks the file leaves.
          environments: restoreLocal(parsed.environments, workspace.localValues ?? {}),
        });
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
    // `state` is read inside for the empty case only; depending on it here
    // would reload the directory on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workspace?.id, workspace?.localValues, dispatch, toast, t, sharedSet],
  );

  /** Read when the workspace is opened, or pointed somewhere new. */
  useEffect(() => {
    if (!path) return;
    // Already in step with this directory: opening the workspace again should
    // not throw away edits made since, which a reload would.
    if (seen.current.has(path)) return;
    void load(path, false);
  }, [path, load]);

  /** Write, once editing settles. */
  useEffect(() => {
    if (!path || !workspace) return;
    if (loading.current === path || stale.current === path) return;
    const before = seen.current.get(path);
    if (!before) return;

    const environments = state.environments.filter((item) => item.workspaceId === workspace.id);
    const shared = sharedSet(path, environments);
    const wanted = planFiles(state, workspace.id, { shares: (e, v) => shared.has(shareKey(e.id, v.key.trim())) });
    if (sameFiles(before, wanted)) return;

    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void (async () => {
        try {
          /*
            Re-read first. If the directory has moved since it was last seen —
            a pull with the app open — writing would silently undo it, and the
            reader would learn about it from a diff they did not make.
          */
          const current = await readWorkspaceDir(path);
          if (!sameFiles(current, before)) {
            stale.current = path;
            toast({
              title: t('linked.changedOnDisk'),
              description: t('linked.changedOnDiskDetail'),
              kind: 'error',
            });
            return;
          }

          const { write, remove } = diffFiles(before, wanted);
          await writeWorkspaceDir(path, write, remove);
          seen.current.set(path, wanted);
          dispatch({
            type: 'workspace/local-values',
            id: workspace.id,
            values: rememberLocal(environments, shared, workspace.localValues ?? {}),
          });
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
  }, [state, path, workspace, toast, t, dispatch, sharedSet]);

  /** Re-read on demand — after a pull, or once the directory has gone stale. */
  const reload = useCallback(() => {
    if (!path) return;
    seen.current.delete(path);
    stale.current = null;
    void load(path, true);
  }, [path, load]);

  /** Forget what was last seen, so the next render writes whatever is here. */
  const forget = useCallback((target: string) => {
    seen.current.delete(target);
    localNames.current.delete(target);
    stale.current = null;
  }, []);

  return { path, reload, forget };
}

export type { LocalValues };
