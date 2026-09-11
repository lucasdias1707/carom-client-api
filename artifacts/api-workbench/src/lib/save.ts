import { downloadJson, downloadText } from '@/lib/download';
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

/** What the file picker should offer, worked out from the name it is given. */
function filterFor(filename: string): { name: string; extensions: string[] } {
  const extension = filename.split('.').pop()?.toLowerCase();
  const named: Record<string, string> = { json: 'JSON', xml: 'XML', txt: 'Text', html: 'HTML', csv: 'CSV' };
  return extension && named[extension]
    ? { name: named[extension], extensions: [extension] }
    : { name: 'All files', extensions: ['*'] };
}

/**
 * Save any text file, asking where when the app is allowed to ask.
 *
 * Everything that writes a file goes through here. A response body used to
 * build its own `<a download>` instead, which on the desktop means the file
 * lands in Downloads with no question asked — the app can open a real save
 * sheet, and not using it was just an oversight.
 */
export async function saveText(filename: string, text: string, mime = 'text/plain'): Promise<SaveOutcome> {
  if (!isDesktop()) {
    downloadText(filename, text, mime);
    return 'downloaded';
  }

  const { save } = await import('@tauri-apps/plugin-dialog');
  const path = await save({ defaultPath: filename, filters: [filterFor(filename)] });
  // Null is the sheet being dismissed, which is an answer, not a failure.
  if (!path) return 'cancelled';

  const { writeTextFile } = await import('@tauri-apps/plugin-fs');
  await writeTextFile(path, text);
  return 'saved';
}

export async function saveJson(filename: string, payload: unknown): Promise<SaveOutcome> {
  if (!isDesktop()) {
    downloadJson(filename, payload);
    return 'downloaded';
  }
  return saveText(filename, JSON.stringify(payload, null, 2), 'application/json');
}

/** What to tell someone after a save, given where it went. */
export function saveMessage(
  outcome: SaveOutcome,
  name: string,
  verb = 'Exported',
): { title: string; description?: string } | null {
  if (outcome === 'cancelled') return null;
  return outcome === 'saved'
    ? { title: `${verb} ${name}` }
    : { title: `${verb} ${name}`, description: 'Saved to your downloads — a browser tab cannot choose the folder.' };
}
