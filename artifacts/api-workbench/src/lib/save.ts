import { downloadJson } from '@/lib/download';
import { isDesktop } from '@/lib/http';

/**
 * Save a JSON file, asking where when the app is allowed to ask.
 *
 * On the desktop that is the native save sheet: a folder *and* a name, which
 * is what "choose where to export" means to anyone outside a browser. The web
 * build cannot ask — a page may hand the browser a file, not choose a path —
 * so it keeps the download it always did, and says so rather than claiming the
 * file went where it did not.
 *
 * Both plugins are imported lazily, behind `isDesktop()`, so the web bundle
 * never pulls them in.
 */
export type SaveOutcome = 'saved' | 'downloaded' | 'cancelled';

export async function saveJson(filename: string, payload: unknown): Promise<SaveOutcome> {
  const text = JSON.stringify(payload, null, 2);

  if (!isDesktop()) {
    downloadJson(filename, payload);
    return 'downloaded';
  }

  const { save } = await import('@tauri-apps/plugin-dialog');
  const path = await save({
    defaultPath: filename,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  // Null is the sheet being dismissed, which is an answer, not a failure.
  if (!path) return 'cancelled';

  const { writeTextFile } = await import('@tauri-apps/plugin-fs');
  await writeTextFile(path, text);
  return 'saved';
}

/** What to tell someone after a save, given where it went. */
export function saveMessage(outcome: SaveOutcome, name: string): { title: string; description?: string } | null {
  if (outcome === 'cancelled') return null;
  return outcome === 'saved'
    ? { title: `Exported ${name}` }
    : { title: `Exported ${name}`, description: 'Saved to your downloads — a browser tab cannot choose the folder.' };
}
