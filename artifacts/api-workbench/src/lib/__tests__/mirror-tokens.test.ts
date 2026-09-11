import { describe, expect, it } from 'vitest';
import { mirrorTokens } from '@/lib/mirror-tokens';
import type { ResolvedVariable, VariableTable } from '@/types';

const defined = (name: string, value: string): ResolvedVariable => ({
  name,
  value,
  scope: 'environment',
  sourceId: 'env',
  sourceName: 'Base',
  color: '#888',
  shadowed: [],
});

const table: VariableTable = { first_name: defined('first_name', 'Ada') };

/** The invariant the whole mirror rests on. */
const joined = (value: string, language: 'json' | 'plain' = 'json') =>
  mirrorTokens(value, language, table)
    .map((token) => token.text)
    .join('');

describe('mirrorTokens', () => {
  it('reproduces the input exactly, which is what keeps the colours under the caret', () => {
    for (const input of [
      '{"name":"{{first_name}}"}',
      '{{first_name}}',
      'no variables here',
      '{ "a": [1, 2], "b": null }',
      '{{ spaced }}',
      '}}{{',
      '',
      '{"a":"{{one}}{{two}}"}',
    ]) {
      expect(joined(input)).toBe(input);
      expect(joined(input, 'plain')).toBe(input);
    }
  });

  it('marks a variable inside a JSON string, keeping the string colour', () => {
    const tokens = mirrorTokens('{"name":"{{first_name}}"}', 'json', table);
    const variable = tokens.find((token) => token.variable);
    expect(variable).toMatchObject({
      text: '{{first_name}}',
      kind: 'string',
      variable: { name: 'first_name', defined: true, dynamic: false },
    });
  });

  it('marks one that resolves to nothing as undefined', () => {
    // This is the case that used to be invisible: it goes out as literal text.
    const tokens = mirrorTokens('{"name":"{{frist_name}}"}', 'json', table);
    expect(tokens.find((token) => token.variable)?.variable).toEqual({ name: 'frist_name', defined: false, dynamic: false });
  });

  /*
    The unquoted case. `{"n": {{count}}}` is how a number or a boolean goes into
    a JSON body, and the lexer cuts those braces into four separate pieces of
    punctuation — so for as long as variables were searched for inside each
    token, this one was invisible while working.
  */
  it('picks out a variable the lexer split across tokens', () => {
    const tokens = mirrorTokens('{"n":{{count}},"b":{{flag}}}', 'json', { count: defined('count', '3') });
    const variables = tokens.filter((token) => token.variable);
    expect(variables.map((token) => token.text)).toEqual(['{{count}}', '{{flag}}']);
    expect(variables.map((token) => token.variable?.defined)).toEqual([true, false]);
  });

  it('still reassembles the whole text it was given', () => {
    // Whatever the splitting does, the mirror sits under the real textarea: a
    // character gained or lost here moves every character after it out of line.
    const source = '{"a":"{{x}} y","n":{{z}},"plain":1}';
    const tokens = mirrorTokens(source, 'json', {});
    expect(tokens.map((token) => token.text).join('')).toBe(source);
  });

  it('marks a generator as a third thing, so the body does not paint it red', () => {
    // Undefined and generated look identical to a naive check, and painting a
    // working generator red is the confusion this flag exists to prevent.
    const tokens = mirrorTokens('{"nome":"{{$randomFirstName}}"}', 'json', {});
    expect(tokens.find((token) => token.variable)?.variable).toEqual({
      name: '$randomFirstName',
      defined: false,
      dynamic: true,
    });
  });

  it('splits the quotes away from the variable, so only the variable is marked', () => {
    const tokens = mirrorTokens('"{{first_name}}"', 'json', table);
    expect(tokens.map((token) => token.text)).toEqual(['"', '{{first_name}}', '"']);
    expect(tokens.filter((token) => token.variable)).toHaveLength(1);
  });

  it('finds two variables in one string', () => {
    const tokens = mirrorTokens('"{{a}}-{{first_name}}"', 'json', table);
    expect(tokens.filter((token) => token.variable).map((token) => token.variable!.name)).toEqual([
      'a',
      'first_name',
    ]);
  });

  it('marks variables in plain text too, where there is no JSON to colour', () => {
    const tokens = mirrorTokens("carom.get('{{first_name}}')", 'plain', table);
    expect(tokens.find((token) => token.variable)?.variable).toEqual({ name: 'first_name', defined: true, dynamic: false });
  });

  it('leaves text with no variables as the lexer produced it', () => {
    const tokens = mirrorTokens('{"a":1}', 'json', table);
    expect(tokens.every((token) => token.variable === undefined)).toBe(true);
  });

  it('does not lose its place across repeated calls, which a stale lastIndex would', () => {
    // VARIABLE_PATTERN is a shared global regex; matchAll must not be affected
    // by whatever ran before it.
    const once = mirrorTokens('{{first_name}}', 'plain', table);
    const twice = mirrorTokens('{{first_name}}', 'plain', table);
    expect(twice).toEqual(once);
    expect(twice.filter((token) => token.variable)).toHaveLength(1);
  });

  it('colours XML, and still picks the variable out of a tag', () => {
    const tokens = mirrorTokens('<host>{{first_name}}</host>', 'xml', table);
    expect(tokens.map((token) => `${token.kind}:${token.text}`)).toEqual([
      'tag-punct:<',
      'tag:host',
      'tag-punct:>',
      'text:{{first_name}}',
      'tag-punct:</',
      'tag:host',
      'tag-punct:>',
    ]);
    expect(tokens.find((token) => token.variable)?.variable).toEqual({ name: 'first_name', defined: true, dynamic: false });
  });

  it('marks no variable at all when the text is not a template', () => {
    // A response body that happens to contain braces is showing you braces.
    const tokens = mirrorTokens('<a>{{first_name}} {{nope}}</a>', 'xml', null);
    expect(tokens.every((token) => token.variable === undefined)).toBe(true);
    expect(tokens.map((token) => token.text).join('')).toBe('<a>{{first_name}} {{nope}}</a>');
  });
});
