import { hasCompletedOpenPitIntro, rememberOpenPitIntro } from './open-pit-intro.storage';

describe('Open Pit intro preference', () => {
  it('remembers completion separately for each account without touching lesson progress', () => {
    const items = new Map([['exploralab.pending-progress.v1.a', 'pending']]);
    const storage = {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => { items.set(key, value); },
    };
    expect(hasCompletedOpenPitIntro('a', storage)).toBe(false);
    expect(rememberOpenPitIntro('a', storage)).toBe(true);
    expect(hasCompletedOpenPitIntro('a', storage)).toBe(true);
    expect(hasCompletedOpenPitIntro('b', storage)).toBe(false);
    expect(rememberOpenPitIntro('account/b', storage)).toBe(true);
    expect(items.get('exploralab.open-pit-intro.v1.account%2Fb')).toBe('completed');
    expect(items.get('exploralab.pending-progress.v1.a')).toBe('pending');
  });

  it('handles blocked or unavailable storage without pretending completion persisted', () => {
    const blocked = { getItem: () => { throw new Error('Blocked'); }, setItem: () => { throw new Error('Blocked'); } };
    for (const storage of [null, blocked]) {
      expect(hasCompletedOpenPitIntro('a', storage)).toBe(false);
      expect(rememberOpenPitIntro('a', storage)).toBe(false);
    }
  });

  it('does not save anonymous completion or accept unknown stored values', () => {
    const storage = { getItem: vi.fn(() => 'unknown'), setItem: vi.fn() };
    expect(hasCompletedOpenPitIntro('a', storage)).toBe(false);
    expect(hasCompletedOpenPitIntro('', storage)).toBe(false);
    expect(rememberOpenPitIntro('', storage)).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
