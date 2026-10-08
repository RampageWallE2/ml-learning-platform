import { C4State, isC4State } from '../lessons/lesson-04-workshop/lesson-04-workshop.state';
import { loadLessonDraft, saveLessonDraft } from './lesson-draft.storage';

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
    removeItem: (key: string) => {
      items.delete(key);
    },
  };
}
const key = (user = 'worker-a') => 'exploralab.lesson-draft.v1.' + user + '.lesson-04';
const legacy = {
  stage: 'experiment',
  experimentMode: 'together',
  rangePrediction: 'increase',
  separatedViewed: true,
  round: 0,
  practiceHelped: false,
};
const envelope = (exercise: unknown, step = 1) => ({
  version: 1,
  lessonVersion: 1,
  userId: 'worker-a',
  lessonId: 'lesson-04',
  step,
  exercise,
});

describe('C4 draft compatibility after removing the range experiment', () => {
  it('round-trips only current fields and preserves the closing conversation', () => {
    const storage = memoryStorage();
    const current: C4State = { stage: 'discovery', round: 0, practiceHelped: false };
    expect(saveLessonDraft('worker-a', 'lesson-04', { step: 1, exercise: current }, storage)).toBe(
      true,
    );
    expect(loadLessonDraft('worker-a', 'lesson-04', storage).draft?.exercise).toEqual(current);
    const success: C4State = { stage: 'success', round: 1, practiceHelped: true };
    expect(saveLessonDraft('worker-a', 'lesson-04', { step: 2, exercise: success }, storage)).toBe(
      true,
    );
    expect(loadLessonDraft('worker-a', 'lesson-04', storage).draft?.step).toBe(2);
    expect(storage.getItem(key())).not.toMatch(/experimentMode|rangePrediction|separatedViewed/);
  });

  it.each([
    { ...legacy, stage: 'predict', rangePrediction: null, separatedViewed: false },
    legacy,
    { ...legacy, experimentMode: 'apart' },
    { ...legacy, stage: 'explain', experimentMode: 'apart' },
    { ...legacy, stage: 'discovery', experimentMode: 'apart' },
  ])(
    'adapts a valid retired state to the explanation without deleting its draft: %j',
    (exercise) => {
      const storage = memoryStorage();
      storage.setItem(key(), JSON.stringify(envelope(exercise)));
      const previous = storage.getItem(key());
      const result = loadLessonDraft('worker-a', 'lesson-04', storage);
      expect(result.available).toBe(true);
      expect(result.discarded).toBe(false);
      expect(result.draft?.step).toBe(1);
      expect(result.draft?.exercise).toEqual({
        stage: 'discovery',
        round: 0,
        practiceHelped: false,
      });
      expect(storage.getItem(key())).toBe(previous); // A read never rewrites browser data.
      expect(saveLessonDraft('worker-a', 'lesson-04', result.draft!, storage)).toBe(true);
      expect(storage.getItem(key())).not.toMatch(/experimentMode|rangePrediction|separatedViewed/);
    },
  );

  it.each(['practice', 'evidence', 'review', 'success'] as const)(
    'preserves legacy %s, practice round and support',
    (stage) => {
      const storage = memoryStorage();
      const exercise = {
        ...legacy,
        stage,
        experimentMode: 'apart',
        round: 1,
        practiceHelped: true,
      };
      const step = stage === 'success' ? 2 : 1;
      storage.setItem(key(), JSON.stringify(envelope(exercise, step)));
      const result = loadLessonDraft('worker-a', 'lesson-04', storage);
      expect(result.discarded).toBe(false);
      expect(result.draft?.step).toBe(step);
      expect(result.draft?.exercise).toEqual({ stage, round: 1, practiceHelped: true });
    },
  );

  it.each([
    { ...legacy, experimentMode: 'invalid' },
    { ...legacy, rangePrediction: null },
    { ...legacy, stage: 'explain', experimentMode: 'apart', separatedViewed: false },
    { ...legacy, round: -1 },
    { stage: 'predict', round: 0, practiceHelped: false },
  ])('rejects corrupt old states rather than allowing them to skip practice: %j', (exercise) => {
    const storage = memoryStorage();
    storage.setItem(key(), JSON.stringify(envelope(exercise)));
    expect(loadLessonDraft('worker-a', 'lesson-04', storage)).toEqual({
      draft: null,
      available: true,
      discarded: true,
    });
    expect(storage.getItem(key())).toBeNull();
  });

  it('does not adapt another account or accept an incompatible version or unfinished closing draft', () => {
    const storage = memoryStorage();
    for (const change of [{ userId: 'worker-b' }, { lessonVersion: 2 }, { step: 2 }]) {
      storage.setItem(key(), JSON.stringify({ ...envelope(legacy), ...change }));
      expect(loadLessonDraft('worker-a', 'lesson-04', storage).discarded).toBe(true);
    }
    storage.setItem(key(), JSON.stringify(envelope(legacy)));
    expect(loadLessonDraft('worker-b', 'lesson-04', storage).draft).toBeNull();
    expect(storage.getItem(key())).not.toBeNull();
    expect(saveLessonDraft('worker-a', 'lesson-04', { step: 0, exercise: null }, storage)).toBe(
      true,
    );
    expect(loadLessonDraft('worker-a', 'lesson-04', storage).draft?.exercise).toBeNull();
  });

  it.each([
    { stage: 'success', round: 0, practiceHelped: true },
    { stage: 'review', round: 0, practiceHelped: false },
    { stage: 'discovery', round: 1, practiceHelped: false },
    { stage: 'compare', round: 0, practiceHelped: true },
    { stage: 'practice', round: Number.MAX_SAFE_INTEGER, practiceHelped: false },
  ])('rejects incoherent current states: %j', (state) => expect(isC4State(state)).toBe(false));
});
