import { describe, expect, it } from 'vitest';
import {
  canSelfUpdate,
  describeDownload,
  describeUpdateBadge,
  isCrossDeviceFailure,
  releasePageUrl,
  type InstallKind,
} from '@/lib/updates';

describe('canSelfUpdate', () => {
  it('allows the formats that can replace their own files', () => {
    for (const kind of ['macos', 'windows', 'appimage'] as InstallKind[]) {
      expect(canSelfUpdate(kind)).toBe(true);
    }
  });

  it('refuses a package-manager install', () => {
    // The files belong to dpkg or rpm; overwriting them would leave the
    // system's record of what is installed pointing at something else.
    expect(canSelfUpdate('linux-package')).toBe(false);
  });

  it('refuses the web build, which has nothing to replace', () => {
    expect(canSelfUpdate('web')).toBe(false);
  });
});

describe('releasePageUrl', () => {
  it('points at a specific tag when a version is known', () => {
    expect(releasePageUrl('0.3.0')).toBe(
      'https://github.com/lucasdias1707/carom-client-api/releases/tag/v0.3.0',
    );
  });

  it('falls back to the latest release when it is not', () => {
    expect(releasePageUrl()).toBe('https://github.com/lucasdias1707/carom-client-api/releases/latest');
  });
});

describe('describeDownload', () => {
  it('reports progress against a known total', () => {
    expect(describeDownload(512 * 1024, 1024 * 1024)).toEqual({
      key: 'updates.progress.known',
      vars: { received: '512.0 KB', total: '1.00 MB', percent: 50 },
    });
  });

  it('reports what has arrived when the server sent no length', () => {
    // A proxy stripping content-length is not an error, and it must not read
    // as "0%" or NaN — so it picks the sentence with no percentage in it.
    expect(describeDownload(2 * 1024 * 1024, 0)).toEqual({
      key: 'updates.progress.unknown',
      vars: { received: '2.00 MB' },
    });
    expect(describeDownload(1024, Number.NaN).key).toBe('updates.progress.unknown');
  });

  it('does not exceed 100% when the total was understated', () => {
    expect(describeDownload(200, 100).vars?.percent).toBe(100);
  });

  it('starts at zero rather than empty', () => {
    expect(describeDownload(0, 1024).vars).toEqual({ received: '0 B', total: '1.0 KB', percent: 0 });
  });
});

/**
 * The failure a copy of Carom on an external drive hits.
 *
 * macOS stages the swap in a temporary directory and renames the installed
 * `.app` into it; a rename cannot cross a filesystem, so the app on one volume
 * and the temp directory on another gives `EXDEV`. Worth recognising because
 * the message it arrives as — "Cross-device link (os error 18)" — is accurate
 * and tells the reader nothing.
 */
describe('isCrossDeviceFailure', () => {
  it('recognises the message the plugin actually reports', () => {
    expect(isCrossDeviceFailure('Cross-device link (os error 18)')).toBe(true);
    expect(isCrossDeviceFailure('The download did not finish. Cross-device link (os error 18)')).toBe(true);
  });

  it('recognises the other spellings of the same errno', () => {
    expect(isCrossDeviceFailure('EXDEV: cross-device link not permitted')).toBe(true);
    expect(isCrossDeviceFailure('os error 18')).toBe(true);
  });

  it('leaves every other failure alone', () => {
    // These have their own message; claiming the disk is at fault would send
    // someone to check the wrong thing.
    expect(isCrossDeviceFailure('Network unreachable')).toBe(false);
    expect(isCrossDeviceFailure('signature verification failed')).toBe(false);
    expect(isCrossDeviceFailure('Permission denied (os error 13)')).toBe(false);
    expect(isCrossDeviceFailure('')).toBe(false);
  });
});

describe('describeUpdateBadge', () => {
  const nothing = { received: 0, total: 0 };
  const version = { version: '0.4.0' };

  it('shows nothing while there is nothing to act on', () => {
    // A bar carrying a permanently dead icon teaches people to ignore it.
    for (const phase of ['idle', 'checking', 'current']) {
      expect(describeUpdateBadge(phase, null, nothing)).toBeNull();
    }
  });

  it('shows nothing when a check failed', () => {
    // Reported in Settings, where it can be acted on; a badge would promise a
    // download that does not exist.
    expect(describeUpdateBadge('error', null, nothing)).toBeNull();
    expect(describeUpdateBadge('error', version, nothing)).toBeNull();
  });

  it('announces a version that is waiting, and downloads on click', () => {
    expect(describeUpdateBadge('available', version, nothing)).toEqual({
      tone: 'available',
      action: 'download',
      label: { key: 'updates.badge.available', vars: { version: '0.4.0' } },
    });
  });

  it('shows nothing for "available" with no version, which should not happen', () => {
    expect(describeUpdateBadge('available', null, nothing)).toBeNull();
  });

  it('reports progress while downloading, and cannot be clicked', () => {
    const badge = describeUpdateBadge('downloading', version, { received: 512, total: 1024 });
    expect(badge?.tone).toBe('busy');
    expect(badge?.action).toBe('none');
    expect(badge?.label).toEqual({
      key: 'updates.badge.downloading',
      vars: { received: '512 B', total: '1.0 KB', percent: 50 },
    });
  });

  it('restarts on click once the update is in place', () => {
    expect(describeUpdateBadge('ready', version, nothing)).toEqual({
      tone: 'ready',
      action: 'restart',
      label: { key: 'updates.badge.readyVersion', vars: { version: '0.4.0' } },
    });
  });

  it('still asks for a restart if the version was somehow lost', () => {
    expect(describeUpdateBadge('ready', null, nothing)?.action).toBe('restart');
  });

  describe('when a download fails', () => {
    /**
     * The badge is the thing that started the download, so it is the thing
     * that has to report the failure. Before it did the work itself this could
     * stay silent — now, staying silent would mean the button vanishes a
     * moment after being pressed.
     */
    const failed = { errorStage: 'download' } as const;

    it('stays put, in red, and offers another go', () => {
      expect(describeUpdateBadge('error', version, nothing, failed)).toEqual({
        tone: 'failed',
        action: 'download',
        label: { key: 'updates.badge.failedDownload' },
      });
    });

    /**
     * The macOS failure on an external drive. It gets its own sentence because
     * it is the one a reader can do something about — the errno that describes
     * it says nothing useful to anyone who has not met it before.
     */
    it('says so plainly when the app could not replace itself', () => {
      const badge = describeUpdateBadge('error', version, nothing, { errorStage: 'cross-device' });
      expect(badge?.label).toEqual({ key: 'updates.badge.failedCrossDevice' });
      expect(badge?.tone).toBe('failed');
    });

    it('sends a package install to the release page instead of retrying', () => {
      expect(describeUpdateBadge('error', version, nothing, { ...failed, selfUpdating: false })?.action).toBe(
        'release-page',
      );
    });
  });

  describe('on an install that cannot replace its own files', () => {
    /**
     * A `.deb` or `.rpm` belongs to the package manager. Starting a download
     * the installer would refuse is worse than sending someone somewhere they
     * can act, so that one case is a link.
     */
    it('links to the release page rather than downloading', () => {
      const badge = describeUpdateBadge('available', version, nothing, { selfUpdating: false });
      expect(badge?.action).toBe('release-page');
      expect(badge?.tone).toBe('available');
    });

    it('says why, since the button does something different from what it looks like', () => {
      const badge = describeUpdateBadge('available', version, nothing, { selfUpdating: false });
      expect(badge?.label.key).toBe('updates.badge.availablePackage');
    });

    it('still restarts normally once something else installed the update', () => {
      expect(describeUpdateBadge('ready', version, nothing, { selfUpdating: false })?.action).toBe('restart');
    });
  });
});
