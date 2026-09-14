import { isDesktop } from '@/lib/http';

/**
 * The desktop side of a linked workspace.
 *
 * Four commands, each lazily imported the way the rest of the desktop-only
 * code is, so a web build never pulls in something it cannot use. Everything
 * that knows these commands exist is in here.
 *
 * The path is checked in Rust, not here: a path becomes usable only by being
 * chosen in the native dialog, and the list of chosen paths is kept in the
 * app's own config directory. That matters because scripts in this app run
 * through `new Function` and can reach anything the webview can — so a check
 * living in the webview would be a check the thing it guards against can skip.
 */

async function invoker() {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke;
}

/** Whether a workspace can be linked to a file at all. */
export function canLinkFiles(): boolean {
  return isDesktop();
}

/**
 * Ask for the file, and authorise it.
 *
 * `save` picks the save dialog, for choosing where a workspace should be
 * written for the first time; otherwise it opens an existing one.
 */
export async function pickWorkspaceFile(save: boolean): Promise<string | null> {
  if (!isDesktop()) return null;
  const invoke = await invoker();
  return (await invoke<string | null>('pick_workspace_file', { save })) ?? null;
}

/** `null` means the file is not there yet, which is not an error. */
export async function readWorkspaceFile(path: string): Promise<string | null> {
  if (!isDesktop()) return null;
  const invoke = await invoker();
  return (await invoke<string | null>('read_workspace_file', { path })) ?? null;
}

export async function writeWorkspaceFile(path: string, contents: string): Promise<void> {
  if (!isDesktop()) return;
  const invoke = await invoker();
  await invoke('write_workspace_file', { path, contents });
}

/** Drop a path's authorisation, when a workspace stops being linked to it. */
export async function forgetWorkspaceFile(path: string): Promise<void> {
  if (!isDesktop()) return;
  const invoke = await invoker();
  await invoke('forget_workspace_file', { path }).catch(() => undefined);
}
