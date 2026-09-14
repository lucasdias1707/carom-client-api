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

use std::collections::{BTreeSet, HashMap};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

/// The authorised paths, by the config directory they were read from.
///
/// Keyed, not a single set. The app only ever has one config directory, so
/// this looks like ceremony — but a cache that does not remember where its
/// contents came from will happily answer a question about one directory with
/// the contents of another, and that is exactly what it did: the tests run in
/// parallel, each with its own directory, and one of them read another's set
/// and reported a path as unauthorised that it had just authorised.
static ALLOWED: Mutex<Option<HashMap<PathBuf, BTreeSet<PathBuf>>>> = Mutex::new(None);

/// The set for one directory, read from disk the first time it is asked for.
fn entry<'a>(
    cache: &'a mut Option<HashMap<PathBuf, BTreeSet<PathBuf>>>,
    config_dir: &Path,
) -> &'a mut BTreeSet<PathBuf> {
    cache
        .get_or_insert_with(HashMap::new)
        .entry(config_dir.to_path_buf())
        .or_insert_with(|| load(config_dir))
}

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
    let allowed = entry(&mut guard, config_dir);
    allowed.insert(path.to_path_buf());
    save(config_dir, allowed);
}

/// Forget a path, when a workspace stops being linked to it.
pub fn forget(config_dir: &Path, path: &Path) {
    let Ok(mut guard) = ALLOWED.lock() else {
        return;
    };
    let allowed = entry(&mut guard, config_dir);
    allowed.remove(path);
    save(config_dir, allowed);
}

/// Whether a path was chosen through the dialog at some point.
pub fn is_allowed(config_dir: &Path, path: &Path) -> bool {
    let Ok(mut guard) = ALLOWED.lock() else {
        return false;
    };
    entry(&mut guard, config_dir).contains(path)
}

/// Whether a relative path stays inside the directory it is relative to.
///
/// The paths come from the webview, and the webview runs scripts that are not
/// sandboxed. `../../.ssh/id_rsa` is a relative path too, and a directory the
/// reader authorised must not become a way to write anywhere on the disk from
/// there. Rejecting the components outright beats canonicalising, which
/// answers a different question on a path that does not exist yet.
pub fn is_contained(relative: &str) -> bool {
    if relative.is_empty() || relative.len() > 1024 {
        return false;
    }
    let path = Path::new(relative);
    if path.is_absolute() {
        return false;
    }
    path.components().all(|component| matches!(component, std::path::Component::Normal(_)))
}

/// Every `.json` file under a directory, by its path relative to that root.
///
/// Only `.json`: a README, a `.gitignore` or anything else someone keeps in
/// there is not this app's to read, and certainly not to rewrite.
pub fn read_tree(root: &Path) -> std::io::Result<Vec<(String, String)>> {
    let mut found = Vec::new();
    collect(root, root, &mut found, 0)?;
    found.sort_by(|a, b| a.0.cmp(&b.0));
    Ok(found)
}

fn collect(root: &Path, dir: &Path, found: &mut Vec<(String, String)>, depth: usize) -> std::io::Result<()> {
    // A workspace nested twenty deep is a symlink loop, not a workspace.
    if depth > 20 {
        return Ok(());
    }
    let entries = match std::fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(error),
    };
    for entry in entries {
        let entry = entry?;
        let path = entry.path();
        let name = entry.file_name();
        let name = name.to_string_lossy();
        // `.git` above all: walking it is slow, pointless and enormous.
        if name.starts_with('.') {
            continue;
        }
        // `file_type` does not follow symlinks, which is how a link pointing
        // out of the directory stays out of it.
        let kind = entry.file_type()?;
        if kind.is_dir() {
            collect(root, &path, found, depth + 1)?;
        } else if kind.is_file() && path.extension().is_some_and(|ext| ext == "json") {
            if let Ok(relative) = path.strip_prefix(root) {
                let relative = relative.to_string_lossy().replace('\\', "/");
                if let Ok(text) = std::fs::read_to_string(&path) {
                    found.push((relative, text));
                }
            }
        }
    }
    Ok(())
}

/// Remove a file, and any directory it leaves empty behind it.
///
/// A folder someone deleted in the app should not leave an empty directory in
/// the repository for the next person to wonder about.
pub fn remove_file_and_empty_parents(root: &Path, path: &Path) {
    std::fs::remove_file(path).ok();
    let mut parent = path.parent();
    while let Some(dir) = parent {
        if dir == root || !dir.starts_with(root) {
            break;
        }
        // Only if it is empty: `remove_dir` refuses otherwise, which is
        // exactly the check wanted here.
        if std::fs::remove_dir(dir).is_err() {
            break;
        }
        parent = dir.parent();
    }
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
        restart(&dir);
        assert!(is_allowed(&dir, &file));
    }

    #[test]
    fn forgets_an_unlinked_path() {
        let dir = tempdir();
        let file = dir.join("pokeapi.json");
        allow(&dir, &file);
        forget(&dir, &file);
        restart(&dir);
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

    /// The failure that got through CI once, made deterministic.
    ///
    /// Two directories, interleaved. The cache used to be one set with no
    /// memory of where it came from, so the second `allow` repopulated it and
    /// the first directory's `is_allowed` answered out of the second
    /// directory's contents — reporting a path as unauthorised moments after
    /// authorising it. Running the suite ten times and seeing green proves
    /// nothing about a race; this does.
    #[test]
    fn answers_about_the_directory_it_was_asked_about() {
        let one = tempdir();
        let two = tempdir();
        let file_one = one.join("first.json");
        let file_two = two.join("second.json");

        allow(&one, &file_one);
        // The step that used to poison the answer below.
        allow(&two, &file_two);

        assert!(is_allowed(&one, &file_one), "the first directory forgot its own file");
        assert!(is_allowed(&two, &file_two));
        // And neither directory has taken on the other's.
        assert!(!is_allowed(&one, &file_two));
        assert!(!is_allowed(&two, &file_one));
    }

    /// The same, across the restart that reads the file back.
    #[test]
    fn keeps_two_directories_apart_across_a_restart() {
        let one = tempdir();
        let two = tempdir();
        let file_one = one.join("first.json");
        let file_two = two.join("second.json");

        allow(&one, &file_one);
        allow(&two, &file_two);
        restart(&one);
        restart(&two);

        assert!(is_allowed(&one, &file_one));
        assert!(!is_allowed(&one, &file_two));
    }

    #[test]
    fn keeps_a_relative_path_inside_the_directory() {
        assert!(is_contained("workspace.json"));
        assert!(is_contained("Pokemon/Get pokemon.json"));
    }

    /// The one that matters: these paths come from a webview that runs
    /// unsandboxed scripts.
    #[test]
    fn refuses_a_path_that_climbs_out() {
        assert!(!is_contained("../secrets.json"));
        assert!(!is_contained("Pokemon/../../secrets.json"));
        assert!(!is_contained("/etc/passwd"));
        assert!(!is_contained(""));
        assert!(!is_contained("./x.json"));
    }

    #[test]
    fn reads_only_the_json_under_a_directory() {
        let dir = tempdir();
        std::fs::write(dir.join("workspace.json"), "{}").unwrap();
        std::fs::write(dir.join("README.md"), "hi").unwrap();
        std::fs::create_dir_all(dir.join("Pokemon")).unwrap();
        std::fs::write(dir.join("Pokemon/Get.json"), "{\"a\":1}").unwrap();

        let found = read_tree(&dir).unwrap();
        let paths: Vec<&str> = found.iter().map(|(path, _)| path.as_str()).collect();
        assert_eq!(paths, vec!["Pokemon/Get.json", "workspace.json"]);
    }

    /// `.git` alone would dwarf the workspace, and none of it is ours.
    #[test]
    fn skips_hidden_directories() {
        let dir = tempdir();
        std::fs::create_dir_all(dir.join(".git")).unwrap();
        std::fs::write(dir.join(".git/config.json"), "{}").unwrap();
        std::fs::write(dir.join("workspace.json"), "{}").unwrap();

        let found = read_tree(&dir).unwrap();
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].0, "workspace.json");
    }

    #[test]
    fn reads_a_directory_that_is_not_there_as_empty() {
        let dir = tempdir();
        assert!(read_tree(&dir.join("nothing")).unwrap().is_empty());
    }

    #[test]
    fn takes_an_emptied_directory_with_the_file() {
        let dir = tempdir();
        std::fs::create_dir_all(dir.join("Pokemon")).unwrap();
        let file = dir.join("Pokemon/Get.json");
        std::fs::write(&file, "{}").unwrap();

        remove_file_and_empty_parents(&dir, &file);
        assert!(!file.exists());
        assert!(!dir.join("Pokemon").exists());
        // Never the directory the reader chose, even once it is empty.
        assert!(dir.exists());
    }

    #[test]
    fn leaves_a_directory_that_still_holds_something() {
        let dir = tempdir();
        std::fs::create_dir_all(dir.join("Pokemon")).unwrap();
        std::fs::write(dir.join("Pokemon/Get.json"), "{}").unwrap();
        std::fs::write(dir.join("Pokemon/List.json"), "{}").unwrap();

        remove_file_and_empty_parents(&dir, &dir.join("Pokemon/Get.json"));
        assert!(dir.join("Pokemon").exists());
        assert!(dir.join("Pokemon/List.json").exists());
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
        dir
    }

    /// Forget one directory's copy, so the next call reads its file again.
    ///
    /// One directory, not the whole cache: these tests run in parallel, and
    /// wiping everything is how this test suite spent a CI run reporting a
    /// path as unauthorised that the same test had just authorised.
    fn restart(dir: &Path) {
        if let Ok(mut guard) = ALLOWED.lock() {
            if let Some(cache) = guard.as_mut() {
                cache.remove(dir);
            }
        }
    }
}
