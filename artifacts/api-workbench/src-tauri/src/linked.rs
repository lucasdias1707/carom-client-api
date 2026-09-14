//! The files a workspace is allowed to read and write.
//!
//! A linked workspace lives in a JSON file the reader chose, so the commands
//! behind it take a path — and a command that reads or writes any path it is
//! handed is a bigger thing to expose than it looks. Scripts in this app run
//! through `new Function`, which leaves the real global scope reachable, so a
//! script inside an imported collection can call any command the webview can.
//! That is already true and already warned about on import; it must not become
//! "and therefore it can read any file you can".
//!
//! So a path is only usable once it has been chosen through the native file
//! dialog, and the set of chosen paths is kept *here*, in the app's own config
//! directory. Nothing in the webview can add to it — the only way in is a
//! dialog the reader has to see and act on — which is what makes the check
//! worth anything. Keeping the list in the webview's storage instead would put
//! it exactly where the code it is defending against can write.

use std::collections::BTreeSet;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

/// The authorised paths, loaded once and written back on every change.
static ALLOWED: Mutex<Option<BTreeSet<PathBuf>>> = Mutex::new(None);

fn store_path(config_dir: &Path) -> PathBuf {
    config_dir.join("linked-workspaces.json")
}

fn load(config_dir: &Path) -> BTreeSet<PathBuf> {
    let Ok(text) = std::fs::read_to_string(store_path(config_dir)) else {
        return BTreeSet::new();
    };
    serde_json::from_str::<Vec<String>>(&text)
        .map(|paths| paths.into_iter().map(PathBuf::from).collect())
        .unwrap_or_default()
}

fn save(config_dir: &Path, allowed: &BTreeSet<PathBuf>) {
    let paths: Vec<String> = allowed.iter().map(|path| path.display().to_string()).collect();
    let Ok(text) = serde_json::to_string_pretty(&paths) else {
        return;
    };
    std::fs::create_dir_all(config_dir).ok();
    std::fs::write(store_path(config_dir), text).ok();
}

/// Record a path the reader picked, so the read and write commands will take it.
pub fn allow(config_dir: &Path, path: &Path) {
    let Ok(mut guard) = ALLOWED.lock() else {
        return;
    };
    let allowed = guard.get_or_insert_with(|| load(config_dir));
    allowed.insert(path.to_path_buf());
    save(config_dir, allowed);
}

/// Forget a path, when a workspace stops being linked to it.
pub fn forget(config_dir: &Path, path: &Path) {
    let Ok(mut guard) = ALLOWED.lock() else {
        return;
    };
    let allowed = guard.get_or_insert_with(|| load(config_dir));
    allowed.remove(path);
    save(config_dir, allowed);
}

/// Whether a path was chosen through the dialog at some point.
pub fn is_allowed(config_dir: &Path, path: &Path) -> bool {
    let Ok(mut guard) = ALLOWED.lock() else {
        return false;
    };
    let allowed = guard.get_or_insert_with(|| load(config_dir));
    allowed.contains(path)
}

/// Write by replacing, so a crash midway cannot leave a half-written file.
///
/// The temporary file is made beside the target rather than in the system
/// temp directory: `rename` cannot cross a filesystem, and a workspace file on
/// a mounted drive is exactly the case this app has already been bitten by.
pub fn write_atomically(path: &Path, contents: &str) -> std::io::Result<()> {
    let temporary = path.with_extension("carom-tmp");
    std::fs::write(&temporary, contents)?;
    match std::fs::rename(&temporary, path) {
        Ok(()) => Ok(()),
        Err(error) => {
            std::fs::remove_file(&temporary).ok();
            Err(error)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A file the reader never picked is not readable, however it is asked for.
    #[test]
    fn refuses_a_path_that_was_never_chosen() {
        let dir = tempdir();
        assert!(!is_allowed(&dir, Path::new("/etc/passwd")));
    }

    #[test]
    fn takes_a_path_once_it_has_been_chosen() {
        let dir = tempdir();
        let file = dir.join("pokeapi.json");
        allow(&dir, &file);
        assert!(is_allowed(&dir, &file));
    }

    /// The point of keeping the list on disk: a relaunch still knows.
    #[test]
    fn remembers_across_a_restart() {
        let dir = tempdir();
        let file = dir.join("pokeapi.json");
        allow(&dir, &file);
        reset();
        assert!(is_allowed(&dir, &file));
    }

    #[test]
    fn forgets_an_unlinked_path() {
        let dir = tempdir();
        let file = dir.join("pokeapi.json");
        allow(&dir, &file);
        forget(&dir, &file);
        reset();
        assert!(!is_allowed(&dir, &file));
    }

    #[test]
    fn writes_the_whole_file_or_none_of_it() {
        let dir = tempdir();
        let file = dir.join("workspace.json");
        write_atomically(&file, "{\"a\":1}").unwrap();
        assert_eq!(std::fs::read_to_string(&file).unwrap(), "{\"a\":1}");

        write_atomically(&file, "{\"a\":2}").unwrap();
        assert_eq!(std::fs::read_to_string(&file).unwrap(), "{\"a\":2}");
        // The scratch file does not survive a successful write.
        assert!(!dir.join("workspace.carom-tmp").exists());
    }

    /// Each test gets its own config directory, since the list is a file.
    fn tempdir() -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "carom-linked-{}-{:?}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir_all(&dir).unwrap();
        reset();
        dir
    }

    /// Drop the in-memory copy, so the next call reads the file again.
    fn reset() {
        if let Ok(mut guard) = ALLOWED.lock() {
            *guard = None;
        }
    }
}
