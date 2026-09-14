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

/// Ask for a workspace file, and remember that this one was chosen.
///
/// The only way a path becomes usable by the two commands below. It opens a
/// native dialog, so it cannot be used quietly: anything calling it puts a
/// file picker in front of the reader.
#[tauri::command]
async fn pick_workspace_file(app: tauri::AppHandle, save: bool) -> Option<String> {
    use tauri_plugin_dialog::DialogExt;

    let (tx, rx) = std::sync::mpsc::channel();
    let builder = app.dialog().file().add_filter("JSON", &["json"]);
    if save {
        builder.save_file(move |path| {
            tx.send(path).ok();
        });
    } else {
        builder.pick_file(move |path| {
            tx.send(path).ok();
        });
    }
    let picked = rx.recv().ok().flatten()?;

    let path = picked.into_path().ok()?;
    let dir = config_dir(&app)?;
    linked::allow(&dir, &path);
    Some(path.display().to_string())
}

/// Stop treating a path as authorised, when a workspace is unlinked from it.
#[tauri::command]
fn forget_workspace_file(app: tauri::AppHandle, path: String) {
    if let Some(dir) = config_dir(&app) {
        linked::forget(&dir, std::path::Path::new(&path));
    }
}

/// Read a linked workspace file. `None` means the file is not there yet.
#[tauri::command]
fn read_workspace_file(app: tauri::AppHandle, path: String) -> Result<Option<String>, String> {
    let dir = config_dir(&app).ok_or("no config directory")?;
    let path = std::path::Path::new(&path);
    if !linked::is_allowed(&dir, path) {
        return Err("that file has not been chosen in this app".into());
    }
    match std::fs::read_to_string(path) {
        Ok(text) => Ok(Some(text)),
        // A link pointing at a file that does not exist yet is how a workspace
        // is written out for the first time, not a failure.
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error.to_string()),
    }
}

#[tauri::command]
fn write_workspace_file(app: tauri::AppHandle, path: String, contents: String) -> Result<(), String> {
    let dir = config_dir(&app).ok_or("no config directory")?;
    let path = std::path::Path::new(&path);
    if !linked::is_allowed(&dir, path) {
        return Err("that file has not been chosen in this app".into());
    }
    linked::write_atomically(path, &contents).map_err(|error| error.to_string())
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
            pick_workspace_file,
            forget_workspace_file,
            read_workspace_file,
            write_workspace_file
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
