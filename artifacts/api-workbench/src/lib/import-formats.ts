import type { MessageKey } from '@/locales/en';
import { importSubtree, looksLikeSubtree } from '@/lib/carom';
import { importHar, looksLikeHar } from '@/lib/har';
import { importInsomnia, looksLikeInsomnia, looksLikeInsomniaV5 } from '@/lib/insomnia';
import { importOpenApi, looksLikeOpenApi } from '@/lib/openapi';
import { importPostman, type ParsedImport } from '@/lib/postman';

/**
 * Work out which tool wrote a file, and read it.
 *
 * Detection is by content, not by extension or by asking first: every one of
 * these is a `.json` someone dragged out of a different app, and making a
 * person classify their own export before the app will look at it is a
 * question the file itself can answer.
 *
 * Each format is recognised by the marker its writer puts there on purpose —
 * `_type: "export"`, `openapi`, `log.version` — so a file that merely looks
 * similar is not mistaken for one.
 */

export type ImportFormat = 'postman' | 'insomnia' | 'openapi' | 'har' | 'carom';

/** Written with the article, so a sentence can use them without patching one in. */
/**
 * How each format is named in the sentence "Read as …".
 *
 * Keys rather than words: the article is part of the name ("a Postman
 * collection"), and which article a language uses is a thing the language
 * decides, not this table.
 */
export const FORMAT_LABELS: Record<ImportFormat, MessageKey> = {
  postman: 'format.postman',
  insomnia: 'format.insomnia',
  openapi: 'format.openapi',
  har: 'format.har',
  carom: 'format.carom',
};

export function detectFormat(payload: unknown): ImportFormat | null {
  if (looksLikeSubtree(payload)) return 'carom';
  if (looksLikeOpenApi(payload)) return 'openapi';
  if (looksLikeInsomnia(payload)) return 'insomnia';
  if (looksLikeHar(payload)) return 'har';
  // Postman last: its marker is a schema URL inside `info`, and the others
  // announce themselves more plainly.
  const info = payload && typeof payload === 'object' ? (payload as Record<string, unknown>).info : undefined;
  const schema = info && typeof info === 'object' ? (info as Record<string, unknown>).schema : undefined;
  if (typeof schema === 'string' && /getpostman|schema\.postman/i.test(schema)) return 'postman';
  if (payload && typeof payload === 'object' && Array.isArray((payload as Record<string, unknown>).item)) return 'postman';
  if (payload && typeof payload === 'object' && Array.isArray((payload as Record<string, unknown>).values)) return 'postman';
  return null;
}

const READERS: Record<ImportFormat, (payload: unknown, workspaceId: string, startIndex: number) => ParsedImport> = {
  postman: importPostman,
  insomnia: importInsomnia,
  openapi: importOpenApi,
  har: importHar,
  carom: importSubtree,
};

export type ReadResult = { format: ImportFormat; imported: ParsedImport };

/**
 * Read whatever was handed over.
 *
 * The errors are written for someone holding a file that did not work, so they
 * say which formats *are* understood rather than only that this one was not —
 * and the Insomnia v5 case is called out by name, because "not valid JSON" is
 * a misleading thing to tell someone who exported from Insomnia last week.
 */
export function readImport(raw: string, workspaceId: string, startIndex = 0): ReadResult {
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    if (looksLikeInsomniaV5(raw)) {
      throw new Error(
        'That is an Insomnia v5 export, which is YAML. Export again choosing “Insomnia v4 (JSON)”, and this will read it.',
      );
    }
    throw new Error('That file is not valid JSON. Carom, Postman, Insomnia v4, OpenAPI and HAR files all are.');
  }

  const format = detectFormat(payload);
  if (!format) {
    throw new Error(
      'That JSON is not a format this understands. It reads its own exports, Postman collections and environments, Insomnia v4 exports, OpenAPI or Swagger descriptions, and HAR logs.',
    );
  }
  return { format, imported: READERS[format](payload, workspaceId, startIndex) };
}
