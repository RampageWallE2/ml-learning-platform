import { C6State } from '../lessons/lesson-06-sag/lesson-06-sag.state';
import { C8State } from '../lessons/lesson-08-flotation/lesson-08-flotation.state';
import { C8DraftContent, clearLessonDraft, loadC6Draft, loadLessonDraft, saveC6Draft, saveLessonDraft } from './lesson-draft.storage';

const state: C8State = { stage: 'locate', round: 2, helped: true, selectedRecord: 5, comparing: true, choiceOffset: 2 };
const key = (id: string) => 'exploralab.lesson-draft.v1.' + encodeURIComponent(id) + '.lesson-08';
function storage() {
  const items = new Map<string, string>();
  return { items, getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => { items.set(key, value); }, removeItem: (key: string) => { items.delete(key); } };
}

describe('C8 drafts — storage and C6 compatibility', () => {
  it('round-trips the C8 comparison and help, storing only the needed fields', () => {
    const store = storage();
    expect(saveLessonDraft('draft/a', 'lesson-08', { step: 1, exercise: { ...state, email: 'not-needed' } as C8State }, store)).toBe(true);
    expect(loadLessonDraft('draft/a', 'lesson-08', store)).toEqual({ available: true, discarded: false,
      draft: { version: 1, lessonVersion: 1, userId: 'draft/a', lessonId: 'lesson-08', step: 1, exercise: state } });
    expect(store.getItem(key('draft/a'))).not.toContain('email');
  });

  it('preserves an existing v1 C6 draft byte-for-byte when saving, restarting and clearing C8', () => {
    const store = storage();
    const c6: C6State = { stage: 'squares', squaresFormed: true, duplicated: false, duplicateViewed: false,
      round: 0, practiceHelped: false, practiceVarianceAnswered: false, choiceOffset: 1 };
    const c6Key = 'exploralab.lesson-draft.v1.a.lesson-06';
    const previous = JSON.stringify({ version: 1, lessonVersion: 1, userId: 'a', lessonId: 'lesson-06', step: 1, exercise: c6 });
    store.setItem(c6Key, previous); store.setItem('exploralab.pending-progress.v1.a', '["lesson-08"]');
    saveLessonDraft('a', 'lesson-08', { step: 1, exercise: state }, store);
    saveLessonDraft('a', 'lesson-08', { step: 0, exercise: null }, store);
    clearLessonDraft('a', 'lesson-08', store);
    expect(store.getItem(c6Key)).toBe(previous); expect(loadC6Draft('a', store).draft?.exercise).toEqual(c6);
    expect(store.getItem('exploralab.pending-progress.v1.a')).toBe('["lesson-08"]');
  });

  it('separates accounts and clears only the requested lesson', () => {
    const store = storage();
    saveLessonDraft('a', 'lesson-08', { step: 1, exercise: state }, store);
    saveLessonDraft('b', 'lesson-08', { step: 0, exercise: null }, store);
    saveC6Draft('a', { step: 0, exercise: null }, store);
    clearLessonDraft('a', 'lesson-08', store);
    expect(loadLessonDraft('a', 'lesson-08', store).draft).toBeNull();
    expect(loadLessonDraft('b', 'lesson-08', store).draft?.step).toBe(0);
    expect(loadC6Draft('a', store).draft).not.toBeNull();
  });

  it.each([
    { version: 2 }, { lessonVersion: 2 }, { userId: 'b' }, { lessonId: 'lesson-06' },
    { step: 0 }, { step: 2 }, { exercise: { ...state, selectedRecord: 0 } },
  ])('discards an incompatible C8 draft without touching C6: %j', invalid => {
    const store = storage(); saveC6Draft('a', { step: 0, exercise: null }, store);
    saveLessonDraft('a', 'lesson-08', { step: 1, exercise: state }, store);
    store.setItem(key('a'), JSON.stringify({ ...JSON.parse(store.getItem(key('a'))!), ...invalid }));
    expect(loadLessonDraft('a', 'lesson-08', store)).toEqual({ draft: null, available: true, discarded: true });
    expect(loadC6Draft('a', store).draft).not.toBeNull();
  });

  it('does not accept C6 state as C8 or a closing phase without C8 success', () => {
    const store = storage();
    const wrong = { stage: 'observe', squaresFormed: false, duplicated: false, duplicateViewed: false,
      round: 0, practiceHelped: false, practiceVarianceAnswered: false, choiceOffset: 0 };
    expect(saveLessonDraft('a', 'lesson-08', { step: 1, exercise: wrong } as unknown as C8DraftContent, store)).toBe(false);
    expect(saveLessonDraft('a', 'lesson-08', { step: 2, exercise: state }, store)).toBe(false);
    expect(saveLessonDraft('a', 'lesson-08', { step: 2, exercise: null }, store)).toBe(false);
    const success: C8State = { ...state, stage: 'success', helped: false, comparing: false };
    expect(saveLessonDraft('a', 'lesson-08', { step: 2, exercise: success }, store)).toBe(true);
    expect(loadLessonDraft('a', 'lesson-08', store).draft?.step).toBe(2);
    const guided: C8State = { ...success, round: 1, helped: true };
    expect(saveLessonDraft('a', 'lesson-08', { step: 2, exercise: guided }, store)).toBe(true);
    expect(loadLessonDraft('a', 'lesson-08', store).draft?.exercise).toEqual(guided);
    expect(saveLessonDraft('a', 'lesson-08', { step: 2, exercise: { ...guided, round: 0, selectedRecord: 0 } }, store)).toBe(false);
    expect(saveLessonDraft('a', 'lesson-08', { step: 2, exercise: { ...guided, selectedRecord: null } }, store)).toBe(false);
    expect(loadLessonDraft('a', 'lesson-08', store).draft?.exercise).toEqual(guided);
  });

  it('reports unavailable storage and failed writes rather than claiming a draft was saved', () => {
    expect(loadLessonDraft('a', 'lesson-08', null).available).toBe(false);
    expect(saveLessonDraft('a', 'lesson-08', { step: 1, exercise: state }, null)).toBe(false);
    expect(clearLessonDraft('a', 'lesson-08', null)).toBe(false);
    const blocked = { ...storage(), getItem: () => { throw new Error('blocked'); } };
    expect(loadLessonDraft('a', 'lesson-08', blocked).available).toBe(false);
    const quota = { ...storage(), setItem: () => { throw new Error('quota'); } };
    expect(saveLessonDraft('a', 'lesson-08', { step: 1, exercise: state }, quota)).toBe(false);
    const silent = { ...storage(), setItem: () => {} };
    expect(saveLessonDraft('a', 'lesson-08', { step: 1, exercise: state }, silent)).toBe(false);
  });
});
