import { describe, expect, it } from 'vitest';
import {
  COMMANDS,
  bindingConflicts,
  bindingFromEvent,
  formatBinding,
  labelFor,
  resolveBindings,
  sameBinding,
  type Binding,
  type CommandId,
} from '@/lib/shortcuts';

const key = (over: Partial<KeyboardEvent> = {}) =>
  ({ key: 'k', metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, ...over }) as KeyboardEvent;

describe('COMMANDS', () => {
  it('has no two commands on the same keys out of the box', () => {
    // The whole point of one list is that the defaults cannot collide silently.
    expect(bindingConflicts(resolveBindings({}))).toEqual({});
  });

  it('binds every command to something with a modifier', () => {
    // A bare letter would fire while typing a URL or a JSON body.
    expect(COMMANDS.every((command) => command.defaultBinding.mod)).toBe(true);
  });
});

describe('resolveBindings', () => {
  it('lays what was customised over the defaults', () => {
    const bindings = resolveBindings({ keyBindings: { newRequest: { key: 'j', mod: true } } });
    expect(bindings.newRequest).toEqual({ key: 'j', mod: true });
    expect(bindings.send).toEqual({ key: 'enter', mod: true });
  });

  it('ignores an id left behind by an older build', () => {
    const stored = { gone: { key: 'q', mod: true } } as unknown as Partial<Record<CommandId, Binding>>;
    expect(Object.keys(resolveBindings({ keyBindings: stored }))).toEqual(COMMANDS.map((command) => command.id));
  });
});

describe('formatBinding', () => {
  it('spells out the keys that have no printable character', () => {
    expect(formatBinding({ key: 'enter', mod: true })).toMatch(/Enter$/);
    expect(formatBinding({ key: 'p', mod: true, shift: true })).toMatch(/⇧ P$/);
    expect(formatBinding({ key: ',', mod: true })).toMatch(/,$/);
  });
});

describe('bindingFromEvent', () => {
  it('waits rather than recording a modifier on its own', () => {
    // Recording ⌘ the instant it goes down would end the capture before the
    // second half of the shortcut was pressed.
    expect(bindingFromEvent(key({ key: 'Meta', metaKey: true }))).toBeNull();
    expect(bindingFromEvent(key({ key: 'Shift', shiftKey: true }))).toBeNull();
  });

  it('refuses a key with no modifier', () => {
    expect(bindingFromEvent(key({ key: 'a' }))).toBeNull();
  });

  it('reads Ctrl and ⌘ as the same modifier', () => {
    expect(bindingFromEvent(key({ key: 'K', ctrlKey: true }))).toEqual({ key: 'k', mod: true });
    expect(bindingFromEvent(key({ key: 'K', metaKey: true, shiftKey: true }))).toEqual({
      key: 'k',
      mod: true,
      shift: true,
    });
  });
});

describe('bindingConflicts', () => {
  it('finds nothing to complain about in the defaults we ship', () => {
    expect(bindingConflicts(resolveBindings({}))).toEqual({});
  });

  it('names both sides, so nobody has to hunt for the other one', () => {
    const bindings = resolveBindings({ keyBindings: { newRequest: { key: 'k', mod: true } } });
    expect(bindingConflicts(bindings)).toEqual({ palette: ['newRequest'], newRequest: ['palette'] });
    expect(labelFor('palette')).toBe('Search everything');
  });

  it('treats a missing modifier flag and a false one as the same binding', () => {
    expect(sameBinding({ key: 'k', mod: true }, { key: 'k', mod: true, shift: false })).toBe(true);
    expect(sameBinding({ key: 'k', mod: true }, { key: 'k', mod: true, shift: true })).toBe(false);
  });
});
