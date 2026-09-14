//! Keeping the updater's file swap on one filesystem.
//!
//! The macOS half of `tauri-plugin-updater` stages the swap in two temporary
//! directories from `std::env::temp_dir()`, then `rename`s the installed
//! `.app` into one of them and the new build back out. `rename` cannot cross a
//! filesystem, so when Carom lives on an external drive and the temp directory
//! is on the boot volume, the first of those fails with `EXDEV` — surfaced to
//! the reader as "Cross-device link (os error 18)". The plugin treats anything
//! that is not a permission error as fatal, so the update stops there.
//!
//! The plugin's Linux path does not have this problem: it tries several
//! candidate directories and compares `dev()` before using one. This is the
//! same idea, applied from outside, since the macOS path takes no such hint:
//! point `TMPDIR` at a directory on the app's own volume for the length of the
//! install, so both renames stay within one filesystem, and put it back
//! afterwards.
//!
//! `TMPDIR` is process-global, which is why it is set around the install
//! rather than at startup. Everything else in the process — and any child it
//! spawns — would otherwise write its scratch files to a removable disk for
//! the whole session, and be looking at a vanished directory the moment that
//! disk is ejected.

use std::path::{Path, PathBuf};

/// The directory the swap should be staged in, or `None` to change nothing.
///
/// Split out from the code that touches the environment so the decision can be
/// tested without a second volume to mount: the caller supplies the answer to
/// "are these two on the same filesystem".
pub fn staging_dir(app: &Path, temp: &Path, same_volume: impl Fn(&Path, &Path) -> bool) -> Option<PathBuf> {
    // The overwhelmingly common install — /Applications, with the temp
    // directory on the same volume — needs nothing, and the safest thing to do
    // when nothing is wrong is nothing.
    if same_volume(app, temp) {
        return None;
    }
    // Beside the app rather than at the root of the volume: whoever put the
    // bundle here could write here, which is not true of every mount point.
    // Dot-prefixed so Finder does not show it during the seconds it exists.
    Some(app.parent()?.join(".carom-update"))
}

/// The `.app` bundle the running executable belongs to.
///
/// Derived the same way the plugin derives the path it is going to replace, so
/// the volume compared here is the volume it will actually rename across. A
/// binary that is not inside a bundle — `cargo run`, mainly — has no bundle to
/// find, and gets `None`.
pub fn bundle_path(executable: &Path) -> Option<PathBuf> {
    let macos = executable.parent()?;
    // Whole components, not a substring: a folder called "Contents/MacOS" some
    // levels up is not the same thing as being inside one.
    if !macos.ends_with("Contents/MacOS") {
        return None;
    }
    macos.parent()?.parent().map(PathBuf::from)
}

/// Whether two paths sit on the same filesystem.
///
/// Unknown counts as "yes", which means "change nothing". Not being able to
/// stat a path is not evidence that a move will fail, and acting on a guess
/// would move the staging directory for installs that work today.
#[cfg(unix)]
pub fn same_volume(a: &Path, b: &Path) -> bool {
    use std::os::unix::fs::MetadataExt;
    match (std::fs::metadata(a), std::fs::metadata(b)) {
        (Ok(a), Ok(b)) => a.dev() == b.dev(),
        _ => true,
    }
}

#[cfg(not(unix))]
pub fn same_volume(_a: &Path, _b: &Path) -> bool {
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The install almost everyone has: nothing to do.
    #[test]
    fn leaves_a_same_volume_install_alone() {
        let dir = staging_dir(
            Path::new("/Applications/Carom.app"),
            Path::new("/var/folders/ab/T"),
            |_, _| true,
        );
        assert_eq!(dir, None);
    }

    /// The reported bug: an app on a mounted drive, temp on the boot volume.
    #[test]
    fn stages_beside_an_app_on_another_volume() {
        let dir = staging_dir(
            Path::new("/Volumes/Backup/Carom.app"),
            Path::new("/var/folders/ab/T"),
            |_, _| false,
        );
        assert_eq!(dir, Some(PathBuf::from("/Volumes/Backup/.carom-update")));
    }

    /// A bundle sitting at the root of a volume still has a parent to use.
    #[test]
    fn handles_a_bundle_at_the_root_of_a_volume() {
        let dir = staging_dir(Path::new("/Carom.app"), Path::new("/tmp"), |_, _| false);
        assert_eq!(dir, Some(PathBuf::from("/.carom-update")));
    }

    #[test]
    fn finds_the_bundle_around_the_executable() {
        let bundle = bundle_path(Path::new("/Applications/Carom.app/Contents/MacOS/carom"));
        assert_eq!(bundle, Some(PathBuf::from("/Applications/Carom.app")));
    }

    /// `cargo run`, or any binary that is not inside a bundle.
    #[test]
    fn finds_no_bundle_outside_one() {
        assert_eq!(bundle_path(Path::new("/usr/local/bin/carom")), None);
        assert_eq!(bundle_path(Path::new("/home/me/target/debug/carom")), None);
    }

    /// The components have to be the last two, not merely present.
    #[test]
    fn does_not_match_a_bundle_shaped_path_higher_up() {
        assert_eq!(
            bundle_path(Path::new("/Applications/Carom.app/Contents/MacOS/helpers/tool")),
            None,
        );
    }
}
