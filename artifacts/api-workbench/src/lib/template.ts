import { dynamicVariable, generateDynamic, looksDynamic } from '@/lib/dynamic';
import type { Language } from '@/lib/i18n';
import type { Environment, Folder, KeyValue, ResolvedVariable, VariableOrigin, VariableTable } from '@/types';

export const VARIABLE_PATTERN = /\{\{\s*([^}\s][^}]*?)\s*\}\}/g;

/** Folder-scoped variables are always drawn in this blue, whatever else changes. */
export const LOCAL_VARIABLE_COLOR = '#4d90d8';

export type TemplateToken =
  | { kind: 'text'; text: string }
  | {
      kind: 'variable';
      text: string;
      name: string;
      resolved: ResolvedVariable | null;
      /**
       * True for a `{{$name}}` this app knows how to make up. It has no value
       * to show — the value does not exist until the request goes out — which
       * is why it is a flag beside `resolved` rather than a fake entry in it.
       */
      dynamic: boolean;
      start: number;
      end: number;
    };

/**
 * Layer every scope into one lookup, nearest first.
 *
 * Order is folder chain (innermost outwards), then the active environment,
 * then base. The winner is kept as the value; everything it beat is recorded so
 * the UI can explain where a value came from and what it overrode.
 */
export function buildVariableTable(
  folderChain: Folder[],
  environments: Environment[],
  activeEnvironmentId: string | null,
): VariableTable {
  const definitions: Array<{ name: string; origin: VariableOrigin }> = [];

  const collect = (rows: KeyValue[], origin: Omit<VariableOrigin, 'value'>) => {
    for (const rowItem of rows) {
      if (!rowItem.enabled || !rowItem.key.trim()) continue;
      definitions.push({ name: rowItem.key.trim(), origin: { ...origin, value: rowItem.value } });
    }
  };

  for (const folder of folderChain) {
    collect(folder.variables ?? [], {
      scope: 'folder',
      sourceId: folder.id,
      sourceName: folder.name,
      color: LOCAL_VARIABLE_COLOR,
    });
  }

  const active = environments.find((environment) => environment.id === activeEnvironmentId && !environment.isBase);
  if (active) {
    collect(active.variables, {
      scope: 'environment',
      sourceId: active.id,
      sourceName: active.name,
      color: active.color,
    });
  }

  const base = environments.find((environment) => environment.isBase);
  if (base) {
    collect(base.variables, { scope: 'base', sourceId: base.id, sourceName: base.name, color: base.color });
  }

  const table: VariableTable = {};
  for (const { name, origin } of definitions) {
    const existing = table[name];
    if (existing) existing.shadowed.push(origin);
    else table[name] = { name, ...origin, shadowed: [] };
  }
  return table;
}

/** Flatten a table to the plain name/value map the request builder wants. */
export function valuesOf(table: VariableTable): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [name, variable] of Object.entries(table)) values[name] = variable.value;
  return values;
}

/**
 * Replace `{{ name }}` placeholders. Unknown names are left untouched so the
 * user can see what is still missing instead of silently sending an empty
 * string.
 *
 * A `{{$name}}` is generated here rather than looked up, and generated **once
 * per occurrence**: two `{{$randomFirstName}}` in one body are two different
 * people, which is the whole point of putting one in a list of guests. A
 * defined variable is the opposite — the same value everywhere it appears —
 * and that difference is why they are written differently.
 *
 * A defined variable wins over a generator of the same name, on the principle
 * that what someone wrote down beats what the app would have invented. It
 * takes a `$` in the name to reach one at all, so this only arises if someone
 * deliberately defines one.
 *
 * `language` decides which word lists the generators draw from — Brazilian
 * names for an interface in Portuguese. It is required rather than defaulted
 * so that every caller has to decide, which is what stopped a request built in
 * one place from quietly disagreeing with one built in another.
 */
export function interpolate(
  value: string,
  variables: Record<string, string>,
  language: Language,
): string {
  if (!value) return value;
  return value.replace(VARIABLE_PATTERN, (match, raw: string) => {
    const name = raw.trim();
    const defined = variables[name];
    if (defined !== undefined) return defined;
    if (looksDynamic(name)) return generateDynamic(name, language) ?? match;
    return match;
  });
}

/** Split a string into literal and variable spans, for highlighted inputs. */
export function tokenize(value: string, table: VariableTable): TemplateToken[] {
  const tokens: TemplateToken[] = [];
  let lastIndex = 0;
  for (const match of value.matchAll(VARIABLE_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) tokens.push({ kind: 'text', text: value.slice(lastIndex, index) });
    const name = match[1].trim();
    tokens.push({
      kind: 'variable',
      text: match[0],
      name,
      resolved: table[name] ?? null,
      dynamic: table[name] === undefined && dynamicVariable(name) !== null,
      start: index,
      end: index + match[0].length,
    });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < value.length) tokens.push({ kind: 'text', text: value.slice(lastIndex) });
  return tokens;
}

/**
 * Variable names referenced by a string but not defined anywhere.
 *
 * A generator counts as defined: it has no value yet, but it will have one by
 * the time the request leaves, and warning about it would be warning about
 * something that is working. A misspelt `{{$randomFrstName}}` is not a
 * generator and does show up here, which is the case worth catching.
 */
export function missingVariables(value: string, variables: Record<string, string>): string[] {
  const missing = new Set<string>();
  for (const match of value.matchAll(VARIABLE_PATTERN)) {
    const name = match[1].trim();
    if (variables[name] !== undefined) continue;
    if (dynamicVariable(name)) continue;
    missing.add(name);
  }
  return [...missing];
}

export function interpolateRows(
  rows: KeyValue[],
  variables: Record<string, string>,
  language: Language,
): KeyValue[] {
  return rows.map((rowItem) => ({
    ...rowItem,
    key: interpolate(rowItem.key, variables, language),
    value: interpolate(rowItem.value, variables, language),
  }));
}
