import { describe, expect, it } from 'vitest';
import { lexXml, prettyXml, xmlError } from '@/lib/xml';

const join = (input: string) => lexXml(input).map((token) => token.text).join('');
const kinds = (input: string) => lexXml(input).map((token) => `${token.kind}:${token.text}`);

describe('lexXml', () => {
  it('reproduces the input exactly, which is what keeps the mirror under the caret', () => {
    const samples = [
      '<a b="c">text</a>',
      '<?xml version="1.0"?>\n<root/>\n',
      '<!-- a comment --><a><![CDATA[ raw < > ]]></a>',
      // Half-typed markup: the editor spends most of its life here.
      '<a b="unclos',
      '<',
      '</',
      '<a><',
      'plain text with < and > loose',
      '',
      '<a b = "c" d=\'e\' checked>x</a>',
    ];
    for (const sample of samples) expect(join(sample)).toBe(sample);
  });

  it('separates the parts of a tag', () => {
    expect(kinds('<user id="7">Ada</user>')).toEqual([
      'tag-punct:<',
      'tag:user',
      'text: ',
      'attr:id',
      'tag-punct:=',
      'attr-value:"7"',
      'tag-punct:>',
      'text:Ada',
      'tag-punct:</',
      'tag:user',
      'tag-punct:>',
    ]);
  });

  it('keeps a comment, a prolog and CDATA whole rather than colouring their insides', () => {
    expect(kinds('<!-- <a> -->')).toEqual(['comment:<!-- <a> -->']);
    expect(kinds('<?xml version="1.0"?>')).toEqual(['meta:<?xml version="1.0"?>']);
    expect(kinds('<![CDATA[<b>]]>')).toEqual(['cdata:<![CDATA[<b>]]>']);
    expect(kinds('<!DOCTYPE html>')).toEqual(['meta:<!DOCTYPE html>']);
  });

  it('does not run an unterminated comment off the end of the document', () => {
    expect(kinds('<!-- open')).toEqual(['comment:<!-- open']);
  });
});

describe('prettyXml', () => {
  it('indents by depth', () => {
    expect(prettyXml('<a><b><c/></b></a>').text).toBe('<a>\n  <b>\n    <c/>\n  </b>\n</a>');
  });

  it('keeps an element that holds only text on one line', () => {
    expect(prettyXml('<user><name>Ada</name></user>').text).toBe('<user>\n  <name>Ada</name>\n</user>');
  });

  it('collapses the whitespace inside a tag without touching the attributes', () => {
    expect(prettyXml('<a   id = "7"    flag >x</a>').text).toBe('<a id="7" flag>x</a>');
  });

  it('re-indents markup that arrived on one line, and is stable on a second press', () => {
    const once = prettyXml('<?xml version="1.0"?><feed><item id="1"><title>Hi</title></item></feed>').text;
    expect(once).toBe('<?xml version="1.0"?>\n<feed>\n  <item id="1">\n    <title>Hi</title>\n  </item>\n</feed>');
    expect(prettyXml(once).text).toBe(once);
  });

  it('leaves text alone when there is no XML to format', () => {
    expect(prettyXml('just a sentence')).toEqual({ text: 'just a sentence', ok: false });
    // An unterminated tag is half-typed markup, not a document to rewrite.
    expect(prettyXml('<a><b')).toEqual({ text: '<a><b', ok: false });
  });

  it('loses no element when the document is deep', () => {
    const source = '<a><b><c><d>1</d><d>2</d></c></b></a>';
    const formatted = prettyXml(source).text;
    expect(formatted.replace(/\s+/g, '')).toBe(source.replace(/\s+/g, ''));
  });
});

describe('xmlError', () => {
  it('says nothing about well-formed or still-being-typed markup', () => {
    expect(xmlError('<a><b/></a>')).toBeNull();
    expect(xmlError('')).toBeNull();
    expect(xmlError('   ')).toBeNull();
    expect(xmlError('<a b="c"')).toBeNull();
    expect(xmlError('not xml at all')).toBeNull();
  });

  it('names the element a closing tag failed to close', () => {
    expect(xmlError('<a><b></a></b>')).toBe('</a> does not close <b>');
  });

  it('catches a closing tag with nothing open', () => {
    expect(xmlError('<a/></b>')).toBe('</b> closes an element that was never opened');
  });

  it('catches an element left open', () => {
    expect(xmlError('<a><b>text</b>')).toBe('<a> is never closed');
  });

  it('does not count a self-closing tag as open', () => {
    expect(xmlError('<a><b/><c/></a>')).toBeNull();
  });
});
