import { formatBytes } from '@/lib/format';
import { isDesktop } from '@/lib/http';
import type { MessageKey } from '@/locales/en';
import type { Vars } from '@/lib/i18n';

/**
 * Self-updating from the GitHub releases.
 *
 * The plugin is imported lazily, the same way `lib/http.ts` loads the HTTP one,
 * so a web build never pulls in code that only exists inside the desktop shell.
 * Everything the UI needs goes through this module rather than the plugin, so
 * there is one place that knows the plugin exists.
 */

export const REPO_URL = 'https://github.com/lucasdias1707/carom-client-api';

/** How the running copy was installed. Mirrors the `install_kind` command. */
export type InstallKind = 'macos' | 'windows' | 'appimage' | 'linux-package' | 'web';

/**
 * `.deb` and `.rpm` belong to the package manager: the files are owned by it,
 * and an app that overwrote them would leave the system's own record of what is
 * installed pointing at something else. Those are told where to download
 * instead.
 */
export function canSelfUpdate(kind: InstallKind): boolean {
  return kind === 'macos' || kind === 'windows' || kind === 'appimage';
}

/** Where to send someone who has to update by hand. */
export function releasePageUrl(version?: string): string {
  return version ? `${REPO_URL}/releases/tag/v${version}` : `${REPO_URL}/releases/latest`;
}

/**
 * A sentence the catalogue owns, and what to fill into it.
 *
 * This module decides *what* is being said — which is logic, and testable —
 * while the wording and the language belong to `locales`. Returning a finished
 * English string from here is how the whole updater stayed monolingual through
 * a translation pass that covered the rest of the app.
 */
export type Message = { key: MessageKey; vars?: Vars };

/**
 * Progress text for the download.
 *
 * A server is free to answer without a `content-length`, and it does happen
 * behind proxies, so a total of zero has to pick the sentence that does not
 * promise a percentage, rather than saying "0%" or `NaN`.
 */
export function describeDownload(received: number, total: number): Message {
  if (!Number.isFinite(total) || total <= 0) {
    return { key: 'updates.progress.unknown', vars: { received: formatBytes(received) } };
  }
  return {
    key: 'updates.progress.known',
    vars: {
      received: formatBytes(received),
      total: formatBytes(total),
      percent: Math.min(100, Math.round((received / total) * 100)),
    },
  };
}

/**
 * Whether an install failed because the swap could not cross a filesystem.
 *
 * macOS stages the swap in a temporary directory and renames the installed
 * `.app` into it. `rename` cannot cross a filesystem, so an app on a mounted
 * drive and a temp directory on the boot volume fail with `EXDEV`, which
 * reaches the reader as "Cross-device link (os error 18)" — true, and useless
 * unless you already know what it is about.
 *
 * `begin_update_staging` moves the scratch space onto the app's own volume
 * before the install, so this should no longer happen. It is still recognised
 * here because the move can fail — a read-only mount, a directory the reader
 * cannot write — and a raw errno is the worst possible thing to show when it
 * does.
 */
export function isCrossDeviceFailure(message: string): boolean {
  return /cross-device|os error 18|EXDEV/i.test(message);
}

export function installErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** What the UI needs to know about an update that is waiting. */
export type AvailableUpdate = {
  version: string;
  currentVersion: string;
  /** Release notes, which for our releases is the body of the GitHub release. */
  notes: string;
  /** Download and swap in the update. Does not restart the app. */
  install: (onProgress: (received: number, total: number) => void) => Promise<void>;
};

export async function readInstallKind(): Promise<InstallKind> {
  if (!isDesktop()) return 'web';
  const { invoke } = await import('@tauri-apps/api/core');
  return await invoke<InstallKind>('install_kind');
}

/**
 * Ask the release feed whether there is something newer. `null` means we are
 * current — the plugin compares versions itself against the manifest.
 */
export async function checkForUpdate(): Promise<AvailableUpdate | null> {
  if (!isDesktop()) return null;
  const { check } = await import('@tauri-apps/plugin-updater');
  const update = await check();
  if (!update) return null;

  return {
    version: update.version,
    currentVersion: update.currentVersion,
    notes: update.body ?? '',
    install: async (onProgress) => {
      let received = 0;
      let total = 0;
      const { invoke } = await import('@tauri-apps/api/core');
      /*
        Put the updater's scratch space on the same volume as the app, for the
        length of the install only. Without this, a copy of Carom on an
        external drive cannot replace itself: the swap is two renames through
        a temporary directory, and a rename cannot cross a filesystem.
      */
      await invoke<string | null>('begin_update_staging').catch(() => null);
      try {
        await update.downloadAndInstall((event) => {
          if (event.event === 'Started') {
            total = event.data.contentLength ?? 0;
            onProgress(0, total);
          } else if (event.event === 'Progress') {
            received += event.data.chunkLength;
            onProgress(received, total);
          } else if (event.event === 'Finished') {
            onProgress(total || received, total);
          }
        });
      } finally {
        // In `finally` because leaving TMPDIR pointing at a removable disk is
        // worse than the failure that got us here.
        await invoke('end_update_staging').catch(() => undefined);
      }
    },
  };
}

/** Restart into the version that was just installed. */
export async function restartApp(): Promise<void> {
  const { relaunch } = await import('@tauri-apps/plugin-process');
  await relaunch();
}

/** What the top-bar badge should look like, or `null` for "show nothing". */
export type UpdateBadgeView = {
  /** Drives the colour: blue waiting, grey busy, green installed, red failed. */
  tone: 'available' | 'busy' | 'ready' | 'failed';
  /** The hover text. It has to say what clicking does, since the icon cannot. */
  label: Message;
  /**
   * What the click does. The badge acts on the update itself rather than
   * sending anyone to Settings for a second click — Settings is still there,
   * behind the gear, for the notes and the preference.
   */
  action: 'download' | 'restart' | 'release-page' | 'none';
};

export type UpdateBadgeInput = {
  /**
   * False for a `.deb` or `.rpm`, where the files belong to the package
   * manager. Clicking has to lead somewhere useful rather than start a
   * download that the installer would refuse.
   */
  selfUpdating?: boolean;
  /**
   * Set when an install failed, so the button that started it can say so.
   *
   * The stage rather than the message: each one has a sentence of its own in
   * the catalogue, and gluing a reason onto "Click to try again" would hand
   * the word order of two languages to whoever wrote the first half.
   */
  errorStage?: 'download' | 'cross-device';
};

/**
 * Turn the update state into the badge.
 *
 * Pure and separate from the component because this is the part that decides
 * whether anyone ever learns a new version exists, and it is worth being able
 * to test each phase without a desktop shell to run it in.
 *
 * `idle`, `checking` and `current` show nothing: a bar that carries a
 * permanently dead icon teaches people to ignore it. A failed *check* shows
 * nothing either — it is reported in Settings, where it can be acted on, and a
 * badge there would promise a download that does not exist. A failed
 * *download* is the opposite: someone pressed this button and it did not work,
 * so it stays and says so.
 */
export function describeUpdateBadge(
  phase: string,
  update: { version: string } | null,
  progress: { received: number; total: number },
  input: UpdateBadgeInput = {},
): UpdateBadgeView | null {
  const selfUpdating = input.selfUpdating ?? true;

  if (phase === 'ready') {
    return {
      tone: 'ready',
      action: 'restart',
      label: update
        ? { key: 'updates.badge.readyVersion', vars: { version: update.version } }
        : { key: 'updates.badge.ready' },
    };
  }

  if (phase === 'downloading') {
    const progressed = describeDownload(progress.received, progress.total);
    return {
      tone: 'busy',
      action: 'none',
      // The whole sentence, not "Downloading — " with the progress appended:
      // the two halves are one sentence and one language decides its order.
      label: {
        key:
          progressed.key === 'updates.progress.unknown'
            ? 'updates.badge.downloadingUnknown'
            : 'updates.badge.downloading',
        vars: progressed.vars,
      },
    };
  }

  if (phase === 'error' && input.errorStage) {
    return {
      tone: 'failed',
      // Retrying is the only useful thing left, and it is one click away.
      action: selfUpdating ? 'download' : 'release-page',
      label: {
        key:
          input.errorStage === 'cross-device'
            ? 'updates.badge.failedCrossDevice'
            : 'updates.badge.failedDownload',
      },
    };
  }

  if (phase === 'available' && update) {
    if (!selfUpdating) {
      return {
        tone: 'available',
        action: 'release-page',
        label: { key: 'updates.badge.availablePackage', vars: { version: update.version } },
      };
    }
    return {
      tone: 'available',
      action: 'download',
      label: { key: 'updates.badge.available', vars: { version: update.version } },
    };
  }

  return null;
}
