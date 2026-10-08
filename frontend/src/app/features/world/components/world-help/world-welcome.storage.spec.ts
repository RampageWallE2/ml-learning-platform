import { hasSeenWorldWelcome, rememberWorldWelcome } from './world-welcome.storage';

describe('World welcome preference', () => {
  it('remembers only the dismissed welcome, separately for each account', () => {
    const items = new Map<string, string>();
    items.set('exploralab.lesson-draft.v1.a.lesson-01', 'draft');
    items.set('exploralab.pending-progress.v1.a', 'pending');
    const storage = {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => { items.set(key, value); },
    };
    expect(hasSeenWorldWelcome('a', storage)).toBe(false);
    expect(rememberWorldWelcome('a', storage)).toBe(true);
    expect(hasSeenWorldWelcome('a', storage)).toBe(true);
    expect(hasSeenWorldWelcome('b', storage)).toBe(false);
    expect(rememberWorldWelcome('account/b', storage)).toBe(true);
    expect(items.get('exploralab.world-welcome.v1.account%2Fb')).toBe('seen');
    expect(items.get('exploralab.lesson-draft.v1.a.lesson-01')).toBe('draft');
    expect(items.get('exploralab.pending-progress.v1.a')).toBe('pending');
  });

  it('handles missing or blocked storage without pretending the preference persisted', () => {
    const blocked = { getItem: () => { throw new Error('Blocked'); }, setItem: () => { throw new Error('Blocked'); } };
    for (const storage of [null, blocked]) {
      expect(hasSeenWorldWelcome('a', storage)).toBe(false);
      expect(rememberWorldWelcome('a', storage)).toBe(false);
    }
  });

  it('does not write anonymous preferences or trust an unknown stored value', () => {
    const storage = { getItem: vi.fn(() => 'unknown'), setItem: vi.fn() };
    expect(hasSeenWorldWelcome('a', storage)).toBe(false);
    expect(rememberWorldWelcome('', storage)).toBe(false);
    expect(hasSeenWorldWelcome('', storage)).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
