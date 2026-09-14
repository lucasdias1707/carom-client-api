import { describe, expect, it } from 'vitest';
import { assignVariable, assignableNames, suggestVariableName, usableSelection } from '@/lib/selection';
import { row } from '@/lib/factories';

describe('usableSelection', () => {
  it('takes anything with content in it', () => {
    expect(usableSelection('https://api.example.com')).toBe(true);
    expect(usableSelection('  spaced  ')).toBe(true);
  });

  it('refuses what a stray drag produces', () => {
    expect(usableSelection('')).toBe(false);
    expect(usableSelection('   \n  ')).toBe(false);
  });

  it('refuses half a response body', () => {
    // Past a point this is a paste, not a value, and the menu entry would
    // promise something that cannot work.
    expect(usableSelection('x'.repeat(2048))).toBe(true);
    expect(usableSelection('x'.repeat(2049))).toBe(false);
  });
});

describe('suggestVariableName', () => {
  it('names a URL after its host', () => {
    expect(suggestVariableName('https://api.example.com/v1/bookings')).toBe('api');
    expect(suggestVariableName('https://www.pokeapi.co/api/v2')).toBe('pokeapi');
  });

  it('calls a long unbroken value a token', () => {
    // A JWT, a key, a uuid: nothing in the value is worth naming it after.
    expect(suggestVariableName('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abcdefghijkl')).toBe('token');
    expect(suggestVariableName('550e8400-e29b-41d4-a716-446655440000')).toBe('token');
  });

  it('camel-cases a few words of anything else', () => {
    expect(suggestVariableName('user id')).toBe('userId');
    expect(suggestVariableName('Data de entrada')).toBe('dataDeEntrada');
    expect(suggestVariableName('first_name')).toBe('firstName');
  });

  it('keeps accented letters, which are letters', () => {
    expect(suggestVariableName('código')).toBe('código');
  });

  it('always returns something typeable', () => {
    expect(suggestVariableName('!!!')).toBe('value');
    expect(suggestVariableName('   ')).toBe('value');
  });
});

describe('assignVariable', () => {
  it('adds a variable that does not exist yet', () => {
    const rows = assignVariable([], 'token', 'abc');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ key: 'token', value: 'abc', enabled: true });
  });

  it('updates one that does, rather than adding a second', () => {
    const rows = assignVariable([row('token', 'old')], 'token', 'new');
    expect(rows).toHaveLength(1);
    expect(rows[0].value).toBe('new');
  });

  it('matches on the trimmed name, which is what gets interpolated', () => {
    const rows = assignVariable([row('token ', 'old')], 'token', 'new');
    expect(rows).toHaveLength(1);
    expect(rows[0].value).toBe('new');
  });

  it('switches a disabled row back on', () => {
    // You just asked for this value to be used. Writing it into a row that
    // stays off would look exactly like nothing happening.
    const off = { ...row('token', 'old'), enabled: false };
    expect(assignVariable([off], 'token', 'new')[0]).toMatchObject({ value: 'new', enabled: true });
  });

  it('writes to the first of two rows sharing a name, which is the one read', () => {
    const rows = assignVariable([row('token', 'a'), row('token', 'b')], 'token', 'c');
    expect(rows.map((item) => item.value)).toEqual(['c', 'b']);
  });

  it('leaves the rows alone for a blank name', () => {
    const rows = [row('token', 'a')];
    expect(assignVariable(rows, '   ', 'b')).toBe(rows);
  });

  it('keeps every other row untouched', () => {
    const rows = assignVariable([row('a', '1'), row('b', '2')], 'b', '3');
    expect(rows.map((item) => [item.key, item.value])).toEqual([
      ['a', '1'],
      ['b', '3'],
    ]);
  });
});

describe('assignableNames', () => {
  it('lists what is defined, once each', () => {
    expect(assignableNames([row('a', '1'), row('b', '2'), row('a', '3')])).toEqual(['a', 'b']);
  });

  it('skips the blank row the table always keeps at the end', () => {
    expect(assignableNames([row('a', '1'), row('', '')])).toEqual(['a']);
  });

  it('lists a disabled row too — assigning to it is how you turn it back on', () => {
    const off = { ...row('a', '1'), enabled: false };
    expect(assignableNames([off])).toEqual(['a']);
  });
});
