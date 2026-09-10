/**
 * The files attached to multipart rows.
 *
 * They are held here, in memory, and deliberately **not** in the workspace
 * state. The whole state is serialised into localStorage on every change, and
 * a quota of a few megabytes is already shared with every request, every
 * response body and every environment — one attached PDF, base64'd a third
 * larger, could evict all of it. `lib/storage.ts` already truncates response
 * bodies at 128 KB for exactly this reason.
 *
 * So the state keeps what a row needs to *read* right — name, size, type — and
 * the bytes live for the session. After a reload the row still says which file
 * it wants, and asks for it again rather than pretending to have it: sending
 * without the bytes fails before the request leaves, naming the field.
 */

/** What the workspace state stores about an attachment: enough to describe it. */
export type FileMeta = {
  name: string;
  /** What the browser reported, or '' when it could not tell. */
  type: string;
  size: number;
};

const files = new Map<string, File>();

export function putFile(rowId: string, file: File): FileMeta {
  files.set(rowId, file);
  return { name: file.name, type: file.type, size: file.size };
}

/** `undefined` after a reload, or once the row was cleared. */
export function getFile(rowId: string): File | undefined {
  return files.get(rowId);
}

export function dropFile(rowId: string): void {
  files.delete(rowId);
}

/** `12.4 KB · application/pdf`, or just the size when the type is unknown. */
export function describeFile(meta: FileMeta): string {
  const size =
    meta.size < 1024 ? `${meta.size} B`
    : meta.size < 1024 * 1024 ? `${(meta.size / 1024).toFixed(1)} KB`
    : `${(meta.size / (1024 * 1024)).toFixed(2)} MB`;
  return meta.type ? `${size} · ${meta.type}` : size;
}
