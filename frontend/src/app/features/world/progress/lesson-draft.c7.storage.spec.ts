import { C7State } from '../lessons/lesson-07-balls/lesson-07-balls.state';
import { C7DraftContent, clearLessonDraft, loadC6Draft, loadLessonDraft, saveC6Draft, saveLessonDraft } from './lesson-draft.storage';

const state: C7State = { stage: 'calculate', round: 2, prediction: 'equal', activeIndex: 1,
  solved: ['a'], helped: true, hintLevel: 2, hintFocus: 'count', choiceOffset: 2 };
const key = (id: string) => 'exploralab.lesson-draft.v1.' + encodeURIComponent(id) + '.lesson-07';
function storage() {
  const items = new Map<string, string>();
  return { items, getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => { items.set(key, value); }, removeItem: (key: string) => { items.delete(key); } };
}

describe('C7 drafts — storage and compatibility', () => {
  it('round-trips the second calculation and hint without storing extra UI or personal fields', () => {
    const store = storage();
    expect(saveLessonDraft('draft/a', 'lesson-07', { step: 1, exercise: { ...state, feedback: 'not stored', email: 'not stored' } as C7State }, store)).toBe(true);
    expect(loadLessonDraft('draft/a', 'lesson-07', store)).toEqual({ available: true, discarded: false,
      draft: { version: 1, lessonVersion: 1, userId: 'draft/a', lessonId: 'lesson-07', step: 1, exercise: state } });
    expect(store.getItem(key('draft/a'))).not.toContain('email'); expect(store.getItem(key('draft/a'))).not.toContain('feedback');
  });

  it('leaves existing C6 and C8 v1 drafts and I01 unchanged when saving, restarting and clearing C7', () => {
    const store = storage(); saveC6Draft('a', { step: 1, exercise: null }, store);
    saveLessonDraft('a', 'lesson-08', { step: 1, exercise: { stage: 'locate', round: 2, helped: true,
      selectedRecord: 5, comparing: true, choiceOffset: 2 } }, store);
    const c6Key = 'exploralab.lesson-draft.v1.a.lesson-06'; const c8Key = 'exploralab.lesson-draft.v1.a.lesson-08';
    const previousC6 = store.getItem(c6Key); const previousC8 = store.getItem(c8Key);
    store.setItem('exploralab.pending-progress.v1.a', '["lesson-07"]');
    saveLessonDraft('a', 'lesson-07', { step: 1, exercise: state }, store);
    saveLessonDraft('a', 'lesson-07', { step: 0, exercise: null }, store); clearLessonDraft('a', 'lesson-07', store);
    expect(store.getItem(c6Key)).toBe(previousC6); expect(loadC6Draft('a', store).draft?.step).toBe(1);
    expect(store.getItem(c8Key)).toBe(previousC8); expect(loadLessonDraft('a', 'lesson-08', store).draft?.exercise?.comparing).toBe(true);
    expect(store.getItem('exploralab.pending-progress.v1.a')).toBe('["lesson-07"]');
  });

  it('separates accounts and clears only the chosen account and lesson', () => {
    const store = storage(); saveLessonDraft('a', 'lesson-07', { step: 1, exercise: state }, store);
    saveLessonDraft('b', 'lesson-07', { step: 0, exercise: null }, store);
    clearLessonDraft('a', 'lesson-07', store);
    expect(loadLessonDraft('a', 'lesson-07', store).draft).toBeNull();
    expect(loadLessonDraft('b', 'lesson-07', store).draft?.step).toBe(0);
  });

  it.each([
    { version: 2 }, { lessonVersion: 2 }, { userId: 'b' }, { lessonId: 'lesson-08' },
    { step: 0 }, { step: 2 }, { exercise: { ...state, solved: [] } }, { exercise: { ...state, helped: false } },
  ])('discards only the incompatible C7 draft: %j', invalid => {
    const store = storage(); saveC6Draft('a', { step: 0, exercise: null }, store);
    saveLessonDraft('a', 'lesson-07', { step: 1, exercise: state }, store);
    store.setItem(key('a'), JSON.stringify({ ...JSON.parse(store.getItem(key('a'))!), ...invalid }));
    expect(loadLessonDraft('a', 'lesson-07', store)).toEqual({ draft: null, available: true, discarded: true });
    expect(loadC6Draft('a', store).draft).not.toBeNull();
  });

  it('requires a coherent C7 success before saving the closing phase', () => {
    const store = storage();
    expect(saveLessonDraft('a', 'lesson-07', { step: 2, exercise: null }, store)).toBe(false);
    expect(saveLessonDraft('a', 'lesson-07', { step: 2, exercise: state }, store)).toBe(false);
    const success: C7State = { ...state, stage: 'success', solved: ['a', 'b'], helped: false, hintLevel: 0, hintFocus: null };
    expect(saveLessonDraft('a', 'lesson-07', { step: 2, exercise: success }, store)).toBe(true);
    expect(loadLessonDraft('a', 'lesson-07', store).draft?.exercise).toEqual(success);
    const guided: C7State = { ...success, helped: true };
    expect(saveLessonDraft('a', 'lesson-07', { step: 2, exercise: guided }, store)).toBe(true);
    expect(loadLessonDraft('a', 'lesson-07', store).draft?.exercise).toEqual(guided);
    expect(saveLessonDraft('a', 'lesson-07', { step: 2, exercise: { ...guided, round: 0 } }, store)).toBe(false);
    expect(loadLessonDraft('a', 'lesson-07', store).draft?.exercise).toEqual(guided);
    expect(saveLessonDraft('a', 'lesson-07', { step: 1, exercise: { stage: 'root', round: 0, helped: false,
      selectedRecord: null, comparing: false, choiceOffset: 0 } } as unknown as C7DraftContent, store)).toBe(false);
    expect(loadLessonDraft('a', 'lesson-07', store).draft?.step).toBe(2);
  });

  it('handles corrupt JSON, storage denial, quota and silent write failure honestly', () => {
    const store = storage(); store.setItem(key('a'), '{broken');
    expect(loadLessonDraft('a', 'lesson-07', store).discarded).toBe(true);
    expect(loadLessonDraft('a', 'lesson-07', null).available).toBe(false);
    expect(saveLessonDraft('a', 'lesson-07', { step: 1, exercise: state }, null)).toBe(false);
    expect(clearLessonDraft('a', 'lesson-07', null)).toBe(false);
    expect(loadLessonDraft('a', 'lesson-07', { ...store, getItem: () => { throw new Error('blocked'); } }).available).toBe(false);
    expect(saveLessonDraft('a', 'lesson-07', { step: 1, exercise: state }, { ...store, setItem: () => { throw new Error('quota'); } })).toBe(false);
    expect(saveLessonDraft('a', 'lesson-07', { step: 1, exercise: state }, { ...store, setItem: () => {} })).toBe(false);
  });
});
