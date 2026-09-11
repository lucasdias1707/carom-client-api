import type { Translate } from '@/lib/i18n';
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)} s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

/**
 * How long ago, in words.
 *
 * Takes a translator and a language rather than reading either: it is a pure
 * function, and the language is also what decides how the fallback date is
 * written — 11/09/2026 and 09/11/2026 are the same day and opposite claims.
 */
export function formatRelative(iso: string, t: Translate, language: string): string {
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return '—';
  const diff = Date.now() - timestamp;
  const minutes = Math.max(0, Math.floor(diff / 60_000));
  if (minutes < 1) return t('time.justNow');
  if (minutes < 60) return t('time.minutesAgo', { count: minutes });
  if (minutes < 1440) return t('time.hoursAgo', { count: Math.floor(minutes / 60) });
  if (minutes < 1440 * 30) return t('time.daysAgo', { count: Math.floor(minutes / 1440) });
  return new Date(iso).toLocaleDateString(language);
}

/** Byte length of a string as it would go over the wire. */
export function byteLength(value: string): number {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(value).length;
  return value.length;
}

export function statusFamily(status: number): 'info' | 'success' | 'redirect' | 'client' | 'server' | 'none' {
  if (status <= 0) return 'none';
  if (status < 200) return 'info';
  if (status < 300) return 'success';
  if (status < 400) return 'redirect';
  if (status < 500) return 'client';
  return 'server';
}

const CONTENT_TYPE_LABELS: Array<[RegExp, string]> = [
  [/json/i, 'JSON'],
  [/html/i, 'HTML'],
  [/xml/i, 'XML'],
  [/javascript/i, 'JS'],
  [/css/i, 'CSS'],
  [/csv/i, 'CSV'],
  [/^image\//i, 'Image'],
  [/^text\//i, 'Text'],
];

/**
 * A short name for a content type.
 *
 * The names themselves are format names — JSON is JSON everywhere — so only
 * the "we do not know" case is a word, and the caller supplies it.
 */
export function contentTypeLabel(contentType: string | undefined, unknown = 'Unknown'): string {
  if (!contentType) return unknown;
  for (const [pattern, label] of CONTENT_TYPE_LABELS) {
    if (pattern.test(contentType)) return label;
  }
  return contentType.split(';')[0]?.trim() || unknown;
}

/** Pretty-print JSON, returning the original text when it is not valid JSON. */
export function tryPrettyJson(text: string): { text: string; ok: boolean } {
  const trimmed = text.trim();
  if (!trimmed) return { text, ok: false };
  try {
    return { text: JSON.stringify(JSON.parse(trimmed), null, 2), ok: true };
  } catch {
    return { text, ok: false };
  }
}
