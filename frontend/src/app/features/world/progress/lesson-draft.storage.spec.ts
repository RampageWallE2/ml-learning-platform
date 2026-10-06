import { C6State } from '../lessons/lesson-06-sag/lesson-06-sag.state';
import { clearC6Draft, loadC6Draft, saveC6Draft } from './lesson-draft.storage';

const state: C6State = { stage: 'practice-average', squaresFormed: true, duplicated: true,
  duplicateViewed: true, round: 2, practiceHelped: true, practiceVarianceAnswered: false, choiceOffset: 2 };
const draftKey = (id: string) => 'exploralab.lesson-draft.v1.' + encodeURIComponent(id) + '.lesson-06';
function memoryStorage() {
  const items = new Map<string, string>();
  return { items, getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => { items.set(key, value); }, removeItem: (key: string) => { items.delete(key); } };
}

describe('C6 draft storage', () => {
  it('round-trips exercise, hints, round and choice order without storing extra fields', () => {
    const storage = memoryStorage();
    expect(saveC6Draft('draft/a', { step: 1, exercise: { ...state, email: 'not-needed' } as C6State }, storage)).toBe(true);
    const result = loadC6Draft('draft/a', storage);
    expect(result.available).toBe(true); expect(result.discarded).toBe(false);
    expect(result.draft).toEqual({ version: 1, lessonVersion: 1, userId: 'draft/a', lessonId: 'lesson-06', step: 1, exercise: state });
    expect(storage.items.get(draftKey('draft/a'))).not.toContain('email');
  });

  it('separates accounts and preserves pending completions when restarting or clearing C6', () => {
    const storage = memoryStorage();
    storage.setItem('exploralab.pending-progress.v1.a', '["lesson-06"]');
    saveC6Draft('a', { step: 1, exercise: state }, storage);
    saveC6Draft('b', { step: 0, exercise: null }, storage);
    expect(loadC6Draft('b', storage).draft?.exercise).toBeNull();
    saveC6Draft('a', { step: 0, exercise: null }, storage);
    expect(loadC6Draft('a', storage).draft?.step).toBe(0);
    expect(clearC6Draft('a', storage)).toBe(true);
    expect(loadC6Draft('a', storage).draft).toBeNull();
    expect(loadC6Draft('b', storage).draft).not.toBeNull();
    expect(storage.getItem('exploralab.pending-progress.v1.a')).toBe('["lesson-06"]');
  });

  it.each([
    { version: 2 }, { lessonVersion: 0 }, { userId: 'b' }, { lessonId: 'lesson-08' },
    { step: 3 }, { step: 0 }, { step: 2 }, { exercise: { ...state, stage: 'unknown' } },
  ])('discards incompatible or incoherent drafts: %j', invalid => {
    const storage = memoryStorage();
    saveC6Draft('a', { step: 1, exercise: state }, storage);
    storage.setItem(draftKey('a'), JSON.stringify({ ...JSON.parse(storage.getItem(draftKey('a'))!), ...invalid }));
    expect(loadC6Draft('a', storage)).toEqual({ draft: null, available: true, discarded: true });
    expect(storage.getItem(draftKey('a'))).toBeNull();
  });

  it('discards invalid JSON and accepts an absent draft', () => {
    const storage = memoryStorage();
    expect(loadC6Draft('a', storage)).toEqual({ draft: null, available: true, discarded: false });
    storage.setItem(draftKey('a'), '{bad');
    expect(loadC6Draft('a', storage).discarded).toBe(true);
  });

  it('requires a successful exercise for a closing-dialogue draft', () => {
    const storage = memoryStorage();
    expect(saveC6Draft('a', { step: 2, exercise: state }, storage)).toBe(false);
    expect(saveC6Draft('a', { step: 2, exercise: null }, storage)).toBe(false);
    const finished: C6State = { ...state, stage: 'success', practiceHelped: false, practiceVarianceAnswered: true };
    expect(saveC6Draft('a', { step: 2, exercise: finished }, storage)).toBe(true);
    expect(loadC6Draft('a', storage).draft?.exercise).toEqual(finished);
    const guided: C6State = { ...finished, practiceHelped: true };
    expect(saveC6Draft('a', { step: 2, exercise: guided }, storage)).toBe(true);
    expect(loadC6Draft('a', storage).draft?.exercise).toEqual(guided);
    expect(saveC6Draft('a', { step: 2, exercise: { ...guided, round: 0 } }, storage)).toBe(false);
    expect(saveC6Draft('a', { step: 2, exercise: { ...guided, practiceVarianceAnswered: false } }, storage)).toBe(false);
    expect(loadC6Draft('a', storage).draft?.exercise).toEqual(guided);
  });

  it('reports storage denial, quota errors and silent failures honestly', () => {
    expect(loadC6Draft('a', null).available).toBe(false);
    expect(saveC6Draft('a', { step: 0, exercise: null }, null)).toBe(false);
    expect(clearC6Draft('a', null)).toBe(false);
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => {}, removeItem: () => {} };
    expect(loadC6Draft('a', blocked).available).toBe(false);
    const quota = { ...memoryStorage(), setItem: () => { throw new Error('quota'); } };
    expect(saveC6Draft('a', { step: 0, exercise: null }, quota)).toBe(false);
    const silent = { ...memoryStorage(), setItem: () => {} };
    expect(saveC6Draft('a', { step: 0, exercise: null }, silent)).toBe(false);
    const removeBlocked = { ...memoryStorage(), removeItem: () => { throw new Error('blocked'); } };
    expect(clearC6Draft('a', removeBlocked)).toBe(false);
    removeBlocked.setItem(draftKey('a'), 'invalid');
    expect(loadC6Draft('a', removeBlocked).available).toBe(false);
  });
});
