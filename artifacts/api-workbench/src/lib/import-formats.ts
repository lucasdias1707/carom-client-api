import type { MessageKey } from '@/locales/en';
import { importSubtree, looksLikeSubtree } from '@/lib/carom';
import { importHar, looksLikeHar } from '@/lib/har';
import { importInsomnia, looksLikeInsomnia, looksLikeInsomniaV5 } from '@/lib/insomnia';
import { importInsomniaV5 } from '@/lib/insomnia-v5';
import { importOpenApi, looksLikeOpenApi } from '@/lib/openapi';
import { importPostman, type ParsedImport } from '@/lib/postman';

/**
 * Work out which tool wrote a file, and read it.
 *
 * Detection is by content, not by extension or by asking first: every one of
 * these is a file someone dragged out of a different app, and making a person
 * classify their own export before the app will look at it is a question the
 * file itself can answer. Most are JSON; Insomnia v5 is YAML, and a description
 * of an API often is too, so a file that is not JSON is tried as YAML before
 * giving up.
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
  if (looksLikeInsomnia(payload) || looksLikeInsomniaV5(payload)) return 'insomnia';
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
  // One format to the reader of the file, two shapes to the code: v4 is a flat
  // list of resources, v5 a nested document.
  insomnia: (payload, workspaceId, startIndex) =>
    looksLikeInsomniaV5(payload)
      ? importInsomniaV5(payload, workspaceId, startIndex)
      : importInsomnia(payload, workspaceId, startIndex),
  openapi: importOpenApi,
  har: importHar,
  carom: importSubtree,
};

export type ReadResult = { format: ImportFormat; imported: ParsedImport };

/**
 * JSON if it is JSON, YAML if it is not.
 *
 * The YAML parser is loaded only when it is needed, so the many imports that
 * are JSON never pay for it, and the app's first load does not carry it.
 */
async function parseDocument(raw: string): Promise<unknown> {
  const contents = raw.replace(/^\uFEFF/, '');
  try {
    return JSON.parse(contents);
  } catch {
    // Not JSON; fall through to YAML.
  }
  const { parse } = await import('yaml');
  try {
    return parse(contents);
  } catch (error) {
    const reason = error instanceof Error ? error.message.split('\n')[0] : '';
    throw new Error(
      `That file is neither valid JSON nor valid YAML${reason ? ` (${reason})` : ''}. Carom, Postman, Insomnia, OpenAPI and HAR files are one or the other.`,
    );
  }
}

/**
 * Read whatever was handed over.
 *
 * The errors are written for someone holding a file that did not work, so they
 * say which formats *are* understood rather than only that this one was not.
 * Asynchronous because a YAML file needs its parser fetched first.
 */
export async function readImport(raw: string, workspaceId: string, startIndex = 0): Promise<ReadResult> {
  const payload = await parseDocument(raw);

  const format = detectFormat(payload);
  if (!format) {
    throw new Error(
      'That file is not a format this understands. It reads its own exports, Postman collections and environments, Insomnia v4 and v5 exports, OpenAPI or Swagger descriptions, and HAR logs.',
    );
  }
  return { format, imported: READERS[format](payload, workspaceId, startIndex) };
}
