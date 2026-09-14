mod linked;
mod staging;

use std::ffi::OsString;
use std::sync::Mutex;

/// What `TMPDIR` held before an install pointed it elsewhere.
///
/// `None` means no install is staging right now; `Some(None)` means one is,
/// and the variable was unset before it started.
static PREVIOUS_TMPDIR: Mutex<Option<Option<OsString>>> = Mutex::new(None);

/// Point the updater's scratch space at the volume the app is installed on.
///
/// Returns the directory it chose, which is only for the log and the error
/// message; `None` means nothing needed changing, which is the usual answer.
/// See `staging.rs` for why this is done around the install and not at start.
#[tauri::command]
fn begin_update_staging() -> Option<String> {
    let bundle = staging::bundle_path(&std::env::current_exe().ok()?)?;
    let dir = staging::staging_dir(&bundle, &std::env::temp_dir(), staging::same_volume)?;
    // Created rather than merely named: `tempfile` will not create a missing
    // parent, and a `TMPDIR` pointing at nothing is worse than the boot volume.
    std::fs::create_dir_all(&dir).ok()?;

    let mut previous = PREVIOUS_TMPDIR.lock().ok()?;
    // Only the first caller records the old value. A second one would record
    // our own directory as the thing to restore.
    if previous.is_none() {
        *previous = Some(std::env::var_os("TMPDIR"));
    }
    std::env::set_var("TMPDIR", &dir);
    Some(dir.to_string_lossy().into_owned())
}

/// Put `TMPDIR` back, whatever the install did.
#[tauri::command]
fn end_update_staging() {
    let Ok(mut previous) = PREVIOUS_TMPDIR.lock() else {
        return;
    };
    match previous.take() {
        Some(Some(value)) => std::env::set_var("TMPDIR", value),
        Some(None) => std::env::remove_var("TMPDIR"),
        // Nothing was staged, so there is nothing to undo.
        None => {}
    }
}

/// Where the allowlist lives. Failing to resolve it refuses every path, which
/// is the right way round: no config directory, no authorised files.
fn config_dir(app: &tauri::AppHandle) -> Option<std::path::PathBuf> {
    use tauri::Manager;
    app.path().app_config_dir().ok()
}

/// Ask for the directory a workspace lives in, and remember that it was chosen.
///
/// The only way a path becomes usable by the commands below. It opens a native
/// dialog, so it cannot be used quietly: anything calling it puts a folder
/// picker in front of the reader.
#[tauri::command]
async fn pick_workspace_dir(app: tauri::AppHandle) -> Option<String> {
    use tauri_plugin_dialog::DialogExt;

    let (tx, rx) = std::sync::mpsc::channel();
    app.dialog().file().pick_folder(move |path| {
        tx.send(path).ok();
    });
    let picked = rx.recv().ok().flatten()?;

    let path = picked.into_path().ok()?;
    let dir = config_dir(&app)?;
    linked::allow(&dir, &path);
    Some(path.display().to_string())
}

/// Stop treating a directory as authorised, when a workspace is unlinked.
#[tauri::command]
fn forget_workspace_dir(app: tauri::AppHandle, path: String) {
    if let Some(dir) = config_dir(&app) {
        linked::forget(&dir, std::path::Path::new(&path));
    }
}

/// Every `.json` file in a linked directory, by its path within it.
#[tauri::command]
fn read_workspace_dir(app: tauri::AppHandle, path: String) -> Result<Vec<(String, String)>, String> {
    let config = config_dir(&app).ok_or("no config directory")?;
    let root = std::path::Path::new(&path);
    if !linked::is_allowed(&config, root) {
        return Err("that folder has not been chosen in this app".into());
    }
    linked::read_tree(root).map_err(|error| error.to_string())
}

/// Write the files that changed, and remove the ones that are gone.
///
/// Every relative path is checked for staying inside the directory before it
/// is touched. They arrive from the webview, which runs scripts that are not
/// sandboxed, and `../../.ssh/id_rsa` is a relative path too.
#[tauri::command]
fn write_workspace_dir(
    app: tauri::AppHandle,
    path: String,
    files: Vec<(String, String)>,
    remove: Vec<String>,
) -> Result<(), String> {
    let config = config_dir(&app).ok_or("no config directory")?;
    let root = std::path::Path::new(&path);
    if !linked::is_allowed(&config, root) {
        return Err("that folder has not been chosen in this app".into());
    }

    // Checked before anything is written, so a bad path in the middle of a
    // batch cannot leave the directory half updated.
    for (relative, _) in &files {
        if !linked::is_contained(relative) {
            return Err(format!("refusing to write outside the folder: {relative}"));
        }
    }
    for relative in &remove {
        if !linked::is_contained(relative) {
            return Err(format!("refusing to remove outside the folder: {relative}"));
        }
    }

    for (relative, contents) in &files {
        let target = root.join(relative);
        if let Some(parent) = target.parent() {
            std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }
        linked::write_atomically(&target, contents).map_err(|error| error.to_string())?;
    }
    for relative in &remove {
        linked::remove_file_and_empty_parents(root, &root.join(relative));
    }
    Ok(())
}

/// How this copy was installed, which decides whether it can replace itself.
///
/// An AppImage knows its own path through `$APPIMAGE`, which the runtime sets
/// and nothing else does. A `.deb` or `.rpm` install has no such marker and
/// belongs to the package manager, so the app must not try to overwrite it.
#[tauri::command]
fn install_kind() -> &'static str {
    if cfg!(target_os = "macos") {
        "macos"
    } else if cfg!(target_os = "windows") {
        "windows"
    } else if std::env::var_os("APPIMAGE").is_some() {
        "appimage"
    } else {
        "linux-package"
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        // The HTTP plugin performs requests in Rust rather than in the webview,
        // so the desktop build is not subject to CORS and can reach private
        // hosts directly. Scope is declared in capabilities/default.json.
        //
        // The `:*` in those patterns is load-bearing. That scope is matched
        // with URLPattern, not with a glob, and a pattern that names no port
        // means *no port* — so `http://**` allowed http://example.com and
        // refused http://localhost:3000, which is to say every API anyone
        // runs while developing. `http://*:*/*` is host, port and path.
        .plugin(tauri_plugin_http::init())
        // Exporting asks where to put the file and then writes it. Both are
        // scoped in capabilities/default.json to the one dialog-chosen path,
        // so the app can write what someone just named and nothing else.
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            install_kind,
            begin_update_staging,
            end_update_staging,
            pick_workspace_dir,
            forget_workspace_dir,
            read_workspace_dir,
            write_workspace_dir
        ]);

    // Updating means replacing the installed files and starting the new binary,
    // neither of which exists as a concept on mobile.
    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init());

    builder
        .run(tauri::generate_context!())
        .expect("error while running Carom");
}
