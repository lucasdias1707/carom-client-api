import { useCallback, useEffect, useRef, useState } from 'react';
import { isDesktop } from '@/lib/http';
import {
  canSelfUpdate,
  checkForUpdate,
  isCrossDeviceFailure,
  readInstallKind,
  type AvailableUpdate,
  type InstallKind,
} from '@/lib/updates';

export type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'current'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'error';

export type UpdateState = {
  phase: UpdatePhase;
  /** How this copy was installed, which decides whether it can update itself. */
  installKind: InstallKind | null;
  update: AvailableUpdate | null;
  /** Bytes so far and the total, both zero until a download starts. */
  progress: { received: number; total: number };
  /**
   * Which step failed, and what it said.
   *
   * The stage matters because the failures deserve different treatment: a
   * check that could not reach the release feed is worth mentioning in
   * Settings and nowhere else, while one that died mid-install was started by
   * someone pressing a button and has to be reported on that button.
   *
   * A stage rather than a finished sentence, because the sentence belongs to
   * whichever language is on screen. This hook held English ones until the
   * first reader outside English hit an update failure and got half a screen
   * in the wrong language.
   */
  error: { stage: UpdateErrorStage; detail: string } | null;
};

/**
 * `cross-device` is its own stage rather than a download failure carrying a
 * confusing message. It is the one failure a reader can act on — the app is
 * somewhere its own installer cannot stage a swap — and saying so is worth
 * more than the errno that describes it.
 */
export type UpdateErrorStage = 'check' | 'download' | 'cross-device';

export type UpdateApi = UpdateState & {
  check: () => void;
  download: () => void;
};

/**
 * Whatever the failure carries, in a form worth showing.
 *
 * Tauri's plugins reject with a plain string as often as with an `Error`, so
 * an `instanceof Error` check throws away the only useful part of most
 * failures — which is exactly what happened to the first macOS update report.
 */
function detail(error: unknown): string {
  if (typeof error === 'string' && error.trim()) return error.trim();
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message.trim();
    try {
      const json = JSON.stringify(error);
      if (json && json !== '{}') return json;
    } catch {
      // A value that will not serialise tells us nothing anyway.
    }
  }
  return 'No further detail was given.';
}

const IDLE: UpdateState = {
  phase: 'idle',
  installKind: null,
  update: null,
  progress: { received: 0, total: 0 },
  error: null,
};

/**
 * Finds out whether a newer release exists, and downloads it when asked to.
 *
 * It never downloads on its own. The check runs once on mount if `autoCheck` is
 * on, because a check is one request and the alternative is that nobody ever
 * learns a new version exists; the download is always a decision.
 */
export function useUpdateCheck(autoCheck: boolean): UpdateApi {
  const [state, setState] = useState<UpdateState>(IDLE);
  /** Guards against a second check landing after the component is gone. */
  const alive = useRef(true);
  /** One automatic check per app run, however often settings re-render. */
  const checkedOnce = useRef(false);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const check = useCallback(() => {
    if (!isDesktop()) return;
    setState((current) => ({ ...current, phase: 'checking', error: null }));

    void (async () => {
      try {
        const installKind = await readInstallKind();
        const update = await checkForUpdate();
        if (!alive.current) return;
        setState({
          ...IDLE,
          installKind,
          update,
          phase: update ? 'available' : 'current',
        });
      } catch (error) {
        if (!alive.current) return;
        setState({
          ...IDLE,
          phase: 'error',
                  error: { stage: 'check', detail: detail(error) },
        });
      }
    })();
  }, []);

  const download = useCallback(() => {
    setState((current) => {
      if (!current.update || !current.installKind || !canSelfUpdate(current.installKind)) {
        return current;
      }
      const { update } = current;

      void (async () => {
        try {
          await update.install((received, total) => {
            if (!alive.current) return;
            setState((inner) => ({ ...inner, progress: { received, total } }));
          });
          if (!alive.current) return;
          setState((inner) => ({ ...inner, phase: 'ready' }));
        } catch (error) {
          if (!alive.current) return;
          const message = detail(error);
          setState((inner) => ({
            ...inner,
            phase: 'error',
            error: {
              stage: isCrossDeviceFailure(message) ? 'cross-device' : 'download',
              detail: message,
            },
          }));
        }
      })();

      return { ...current, phase: 'downloading', error: null, progress: { received: 0, total: 0 } };
    });
  }, []);

  useEffect(() => {
    if (!autoCheck || checkedOnce.current || !isDesktop()) return;
    checkedOnce.current = true;
    check();
  }, [autoCheck, check]);

  return { ...state, check, download };
}
