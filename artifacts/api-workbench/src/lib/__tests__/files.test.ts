import { describe, expect, it } from 'vitest';
import { describeFile, dropFile, getFile, putFile } from '@/lib/files';

const fakeFile = (name: string, bytes: number, type = 'text/plain') =>
  new File([new Uint8Array(bytes)], name, { type });

describe('the session file store', () => {
  it('hands back the file the row attached', () => {
    const file = fakeFile('report.csv', 12, 'text/csv');
    const meta = putFile('row-1', file);
    expect(meta).toEqual({ name: 'report.csv', type: 'text/csv', size: 12 });
    expect(getFile('row-1')).toBe(file);
  });

  it('knows nothing about a row that never attached one', () => {
    // This is also the state after a reload, which is the case the send path
    // has to report rather than send an empty field.
    expect(getFile('never')).toBeUndefined();
  });

  it('forgets a file when the row lets it go', () => {
    putFile('row-2', fakeFile('a.txt', 1));
    dropFile('row-2');
    expect(getFile('row-2')).toBeUndefined();
  });
});

describe('describeFile', () => {
  it('scales the unit to the size', () => {
    expect(describeFile({ name: 'a', type: '', size: 512 })).toBe('512 B');
    expect(describeFile({ name: 'a', type: '', size: 2048 })).toBe('2.0 KB');
    expect(describeFile({ name: 'a', type: '', size: 3 * 1024 * 1024 })).toBe('3.00 MB');
  });

  it('names the type when the browser knew it', () => {
    expect(describeFile({ name: 'a', type: 'application/pdf', size: 1024 })).toBe('1.0 KB · application/pdf');
  });
});
