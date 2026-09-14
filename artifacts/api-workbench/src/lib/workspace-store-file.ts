import { isDesktop } from '@/lib/http';
import type { DirectoryFiles } from '@/lib/workspace-dir';

/**
 * The desktop side of a linked workspace.
 *
 * Four commands, lazily imported the way the rest of the desktop-only code is,
 * so a web build never pulls in something it cannot use. Everything that knows
 * these commands exist is in here.
 *
 * The path is checked in Rust, not here, and twice over: a directory becomes
 * usable only by being chosen in the native dialog, and every relative path
 * within it is checked for staying inside before anything is written. That
 * matters because scripts in this app run through `new Function` and can reach
 * anything the webview can — so a check living in the webview would be a check
 * the thing it guards against can skip.
 */

async function invoker() {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke;
}

/** Whether a workspace can be kept in a directory at all. */
export function canLinkFiles(): boolean {
  return isDesktop();
}

/** Ask for the directory, and authorise it. */
export async function pickWorkspaceDir(): Promise<string | null> {
  if (!isDesktop()) return null;
  const invoke = await invoker();
  return (await invoke<string | null>('pick_workspace_dir')) ?? null;
}

/** Every `.json` under the directory, by its path within it. */
export async function readWorkspaceDir(path: string): Promise<DirectoryFiles> {
  if (!isDesktop()) return new Map();
  const invoke = await invoker();
  const entries = await invoke<Array<[string, string]>>('read_workspace_dir', { path });
  return new Map(entries);
}

export async function writeWorkspaceDir(
  path: string,
  files: DirectoryFiles,
  remove: string[],
): Promise<void> {
  if (!isDesktop()) return;
  if (files.size === 0 && remove.length === 0) return;
  const invoke = await invoker();
  await invoke('write_workspace_dir', { path, files: [...files.entries()], remove });
}

/** Drop a directory's authorisation, when a workspace stops being linked. */
export async function forgetWorkspaceDir(path: string): Promise<void> {
  if (!isDesktop()) return;
  const invoke = await invoker();
  await invoke('forget_workspace_dir', { path }).catch(() => undefined);
}
