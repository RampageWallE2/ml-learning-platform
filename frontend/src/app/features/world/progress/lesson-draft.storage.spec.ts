import { C6State } from '../lessons/lesson-06-sag/lesson-06-sag.state';
import { clearC6Draft, loadC6Draft, saveC6Draft } from './lesson-draft.storage';

const state: C6State = { stage: 'practice-checked', squaresFormed: true, round: 2, practiceHelped: true, practiceVarianceAnswered: false, choiceOffset: 2 };
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
  it.each(['duplicate', 'average'] as const)('reads an old %s copy draft without rewriting it or completing C6', stage => {
    const storage = memoryStorage();
    const legacy = { ...state, stage, round: 0, practiceHelped: false,
      duplicated: stage === 'average', duplicateViewed: true };
    const raw = JSON.stringify({ version: 1, lessonVersion: 1, userId: 'a', lessonId: 'lesson-06',
      step: 1, exercise: legacy });
    storage.setItem(draftKey('a'), raw);
    const result = loadC6Draft('a', storage);
    expect(result.discarded).toBe(false);
    expect(result.draft?.step).toBe(1);
    expect(result.draft?.exercise).toEqual({ ...state, stage: 'discovery', round: 0, practiceHelped: false });
    expect(storage.getItem(draftKey('a'))).toBe(raw);
  });

  it('preserves old practice help and round, then saves only the new fields on a normal action', () => {
    const storage = memoryStorage();
    const legacy = { ...state, stage: 'practice-average', duplicated: true, duplicateViewed: true };
    const raw = JSON.stringify({ version: 1, lessonVersion: 1, userId: 'a', lessonId: 'lesson-06',
      step: 1, exercise: legacy });
    storage.setItem(draftKey('a'), raw);
    const result = loadC6Draft('a', storage);
    expect(result.draft?.exercise).toEqual(state);
    expect(storage.getItem(draftKey('a'))).toBe(raw);
    expect(saveC6Draft('a', { step: 1, exercise: result.draft!.exercise }, storage)).toBe(true);
    expect(JSON.parse(storage.getItem(draftKey('a'))!).exercise).toEqual(state);
    expect(storage.getItem(draftKey('a'))).not.toContain('duplicate');
    expect(loadC6Draft('a', storage).draft?.exercise).toEqual(state);
  });

  it('preserves an already successful old closing draft but rejects an unchecked one', () => {
    const storage = memoryStorage();
    const legacy = { ...state, stage: 'success', duplicated: true, duplicateViewed: true,
      practiceVarianceAnswered: true };
    const raw = JSON.stringify({ version: 1, lessonVersion: 1, userId: 'a', lessonId: 'lesson-06',
      step: 2, exercise: legacy });
    storage.setItem(draftKey('a'), raw);
    expect(loadC6Draft('a', storage).draft?.exercise).toEqual({ ...state, stage: 'success',
      practiceVarianceAnswered: true });
    expect(storage.getItem(draftKey('a'))).toBe(raw);
    storage.setItem(draftKey('a'), JSON.stringify({ ...JSON.parse(raw),
      exercise: { ...legacy, practiceVarianceAnswered: false } }));
    expect(loadC6Draft('a', storage).discarded).toBe(true);
  });

  it.each([{ userId: 'b' }, { version: 2 }, { lessonVersion: 2 },
    { exercise: { ...state, stage: 'average', duplicated: false, duplicateViewed: true } },
  ])('rejects corrupt or foreign legacy drafts %j', invalid => {
    const storage = memoryStorage();
    storage.setItem(draftKey('a'), JSON.stringify({ version: 1, lessonVersion: 1, userId: 'a',
      lessonId: 'lesson-06', step: 1, exercise: { ...state, stage: 'practice-average',
        duplicated: true, duplicateViewed: true }, ...invalid }));
    expect(loadC6Draft('a', storage)).toEqual({ draft: null, available: true, discarded: true });
  });

});
