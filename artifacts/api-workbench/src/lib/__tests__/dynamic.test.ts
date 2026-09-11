import { describe, expect, it } from 'vitest';
import {
  DYNAMIC_GROUPS,
  DYNAMIC_VARIABLES,
  dynamicVariable,
  generateDynamic,
  isDynamic,
  looksDynamic,
} from '@/lib/dynamic';
import { interpolate, missingVariables, tokenize } from '@/lib/template';
import { LANGUAGES } from '@/lib/i18n';
import { catalogueFor } from '@/locales';

/** Run a generator often enough for "it varies" to mean something. */
const many = (name: string, times = 40) =>
  Array.from({ length: times }, () => generateDynamic(name) ?? '');

describe('the registry', () => {
  it('names every variable with a $, which is what marks it as generated', () => {
    const wrong = DYNAMIC_VARIABLES.filter((variable) => !variable.name.startsWith('$'));
    expect(wrong.map((variable) => variable.name)).toEqual([]);
  });

  it('has no two variables under one name', () => {
    const names = DYNAMIC_VARIABLES.map((variable) => variable.name);
    expect(names.length).toBe(new Set(names).size);
  });

  it('puts every variable in a group the panel renders', () => {
    const orphans = DYNAMIC_VARIABLES.filter((variable) => !DYNAMIC_GROUPS.includes(variable.group));
    expect(orphans.map((variable) => variable.name)).toEqual([]);
  });

  it('names every group in every language', () => {
    for (const language of LANGUAGES) {
      const catalogue = catalogueFor(language);
      for (const group of DYNAMIC_GROUPS) expect(catalogue[`dynamic.group.${group}`]).toBeTruthy();
    }
  });

  it('never generates an empty string', () => {
    const empty = DYNAMIC_VARIABLES.filter((variable) =>
      Array.from({ length: 20 }, () => variable.generate()).some((value) => value.length === 0),
    );
    expect(empty.map((variable) => variable.name)).toEqual([]);
  });

  it('carries the Postman names a collection would already be using', () => {
    // Not the whole list — the ones a body is most likely to contain, so an
    // imported collection does not quietly stop producing data.
    for (const name of [
      '$guid',
      '$timestamp',
      '$randomFirstName',
      '$randomLastName',
      '$randomFullName',
      '$randomEmail',
      '$randomInt',
      '$randomPhoneNumber',
      '$randomCity',
      '$randomCompanyName',
      '$randomPrice',
      '$randomBoolean',
    ]) {
      expect({ name, known: isDynamic(name) }).toEqual({ name, known: true });
    }
  });

  it('separates "meant as a generator" from "is one"', () => {
    // The distinction the red chip depends on: a misspelt generator is still a
    // generator someone was reaching for, not an undefined variable.
    expect(looksDynamic('$randomFrstName')).toBe(true);
    expect(isDynamic('$randomFrstName')).toBe(false);
    expect(looksDynamic('baseUrl')).toBe(false);
    expect(dynamicVariable('$randomFrstName')).toBeNull();
  });
});

describe('what the generators produce', () => {
  it('varies', () => {
    // One value repeated forty times would still pass every shape check below
    // while being useless as test data.
    expect(new Set(many('$randomFirstName')).size).toBeGreaterThan(1);
    expect(new Set(many('$guid')).size).toBe(40);
  });

  it('shapes the ones a server will actually validate', () => {
    expect(generateDynamic('$guid')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(generateDynamic('$randomUUID')).toMatch(/^[0-9a-f-]{36}$/);
    expect(generateDynamic('$timestamp')).toMatch(/^\d{10}$/);
    expect(generateDynamic('$isoTimestamp')).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/);
    expect(generateDynamic('$randomEmail')).toMatch(/^[a-z]+\.[a-z]+@[a-z.]+$/);
    expect(generateDynamic('$randomIP')).toMatch(/^(\d{1,3}\.){3}\d{1,3}$/);
    expect(generateDynamic('$randomHexColor')).toMatch(/^#[0-9a-f]{6}$/);
    expect(generateDynamic('$randomPrice')).toMatch(/^\d+\.\d{2}$/);
    expect(generateDynamic('$today')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('strips the accents out of a name before putting it in an email', () => {
    // Medellín is in the city list and é in the name list; an address with a
    // non-ASCII local part is rejected by plenty of the servers these requests
    // are pointed at.
    const addresses = many('$randomEmail', 200);
    expect(addresses.filter((address) => /[^\x20-\x7e]/.test(address))).toEqual([]);
  });

  it('keeps the numbers inside the range Postman documents', () => {
    const numbers = many('$randomInt', 100).map(Number);
    expect(numbers.every((value) => Number.isInteger(value) && value >= 0 && value <= 1000)).toBe(true);
  });

  it('reads yesterday, today and tomorrow in order', () => {
    const days = ['$yesterday', '$today', '$tomorrow'].map((name) => generateDynamic(name) ?? '');
    expect([...days].sort()).toEqual(days);
  });
});

describe('generators in a template', () => {
  const none = {};

  it('fills one in', () => {
    expect(interpolate('{{$randomBoolean}}', none)).toMatch(/^(true|false)$/);
  });

  /*
    The behaviour the feature exists for. A list of guests written with one
    `{{$randomFullName}}` per entry has to come out as different people — if
    every occurrence resolved to the same value, the generator would be no more
    use than a variable.
  */
  it('gives every occurrence its own value', () => {
    const body = Array.from({ length: 30 }, () => '{{$guid}}').join(',');
    const values = interpolate(body, none).split(',');
    expect(new Set(values).size).toBe(30);
  });

  it('leaves a variable someone defined alone, even under a $ name', () => {
    // What was written down beats what would have been invented.
    expect(interpolate('{{$randomFirstName}}', { $randomFirstName: 'Ada' })).toBe('Ada');
  });

  it('leaves an unknown $name in the text instead of emptying it', () => {
    expect(interpolate('{{$randomFrstName}}', none)).toBe('{{$randomFrstName}}');
  });

  it('tolerates the spaces Postman allows inside the braces', () => {
    expect(interpolate('{{ $randomBoolean }}', none)).toMatch(/^(true|false)$/);
  });

  it('works in the middle of a real body', () => {
    const body = '{"nome":"{{$randomFirstName}} {{$randomLastName}}","id":"{{id}}"}';
    const out = interpolate(body, { id: '7' });
    expect(out).toMatch(/^\{"nome":"[A-Za-z]+ [A-Za-z]+","id":"7"\}$/);
  });
});

describe('what the composer draws', () => {
  it('marks a generator as its own kind of chip, neither resolved nor missing', () => {
    const [token] = tokenize('{{$randomFirstName}}', {});
    expect(token.kind === 'variable' && { resolved: token.resolved, dynamic: token.dynamic }).toEqual({
      resolved: null,
      dynamic: true,
    });
  });

  it('still marks a misspelt one as missing, which is the useful signal', () => {
    const [token] = tokenize('{{$randomFrstName}}', {});
    expect(token.kind === 'variable' && token.dynamic).toBe(false);
  });

  it('does not warn about a generator as an undefined variable', () => {
    expect(missingVariables('{{$randomFirstName}} {{baseUrl}}', {})).toEqual(['baseUrl']);
  });

  it('does warn about a misspelt one', () => {
    expect(missingVariables('{{$randomFrstName}}', {})).toEqual(['$randomFrstName']);
  });
});
