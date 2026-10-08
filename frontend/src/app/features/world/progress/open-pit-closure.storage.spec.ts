import { hasAllOpenPitLessons, hasDeliveredOpenPitReport, rememberOpenPitReport } from './open-pit-closure.storage';
import { LEARNING_ZONES } from '../lessons/lesson-catalog';

describe('Open Pit report delivery preference', () => {
  const lessons = LEARNING_ZONES.find(zone => zone.id === 'zone-01')!.lessons.map(lesson => lesson.lessonId);

  it('requires every catalogued class, not nine duplicate or unrelated results', () => {
    expect(hasAllOpenPitLessons(lessons)).toBe(true);
    expect(hasAllOpenPitLessons([...lessons, 'another-scenario'])).toBe(true);
    expect(hasAllOpenPitLessons(lessons.slice(0, -1))).toBe(false);
    expect(hasAllOpenPitLessons(Array(9).fill(lessons[0]))).toBe(false);
    expect(hasAllOpenPitLessons([...lessons.slice(0, -1), 'another-scenario'])).toBe(false);
  });

  it('remembers delivery per account without changing learning progress', () => {
    const items = new Map([['exploralab.pending-progress.v1.a', 'pending']]);
    const storage = { getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => { items.set(key, value); } };
    expect(rememberOpenPitReport('a', storage)).toBe(true);
    expect(hasDeliveredOpenPitReport('a', storage)).toBe(true);
    expect(hasDeliveredOpenPitReport('b', storage)).toBe(false);
    expect(rememberOpenPitReport('account/b', storage)).toBe(true);
    expect(items.get('exploralab.open-pit-closure.v1.account%2Fb')).toBe('delivered');
    expect(items.get('exploralab.pending-progress.v1.a')).toBe('pending');
  });

  it('fails safely when storage is blocked or unavailable, and rejects anonymous or unknown values', () => {
    const blocked = { getItem: () => { throw new Error('Blocked'); }, setItem: () => { throw new Error('Blocked'); } };
    for (const storage of [null, blocked]) {
      expect(hasDeliveredOpenPitReport('a', storage)).toBe(false);
      expect(rememberOpenPitReport('a', storage)).toBe(false);
    }
    const storage = { getItem: vi.fn(() => 'unknown'), setItem: vi.fn() };
    expect(hasDeliveredOpenPitReport('a', storage)).toBe(false);
    expect(rememberOpenPitReport('', storage)).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
