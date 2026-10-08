import { DraftLessonId, isLessonExerciseState } from '../progress/lesson-draft.storage';

const cases: readonly { id: DraftLessonId; state: Record<string, unknown>; invalid: readonly Record<string, unknown>[] }[] = [
  { id: 'lesson-01', state: { stage: 'practice-reason', selectedLoad: 'D1', selectedGroup: 'D', practiceRound: 0, practiceHelped: true },
    invalid: [{ selectedLoad: 'A1' }, { selectedGroup: 'C' }, { stage: 'success' }, { stage: 'practice' }, { practiceRound: 1 }, { practiceRound: -1 }] },
  { id: 'lesson-01', state: { stage: 'success', selectedLoad: null, selectedGroup: 'E', practiceRound: 1, practiceHelped: true },
    invalid: [{ practiceRound: 0, selectedGroup: 'D' }, { selectedGroup: 'F' }, { selectedLoad: 'E1' },
      { stage: 'practice' }, { practiceRound: -1 }, { practiceRound: 1.5 }] },
  { id: 'lesson-02', state: { stage: 'reason', redistributed: true, round: 1, practiceCase: 1, practiceHelped: true, selectedLoad: 'E1' },
    invalid: [{ redistributed: false }, { practiceCase: 0 }, { selectedLoad: 'C1' }, { stage: 'success', round: 0, selectedLoad: null }, { round: 2 }, { round: 1.5 }] },
  { id: 'lesson-03', state: { stage: 'practice-range', selectedMinId: 'practice-1-2', selectedMaxId: 'practice-1-3', round: 1, practiceHelped: true },
    invalid: [{ selectedMinId: null }, { selectedMaxId: null }, { selectedMinId: 'practice-1-1' }, { selectedMaxId: 'trip-4' }, { stage: 'practice-extremes' }, { round: 2 }] },
  { id: 'lesson-04', state: { stage: 'evidence', experimentMode: 'apart', rangePrediction: 'same', separatedViewed: true, round: 1, practiceHelped: true },
    invalid: [{ separatedViewed: false }, { experimentMode: 'together' }, { rangePrediction: null }, { rangePrediction: 'invalid' }, { stage: 'success', round: 0 }, { stage: 'compare' }] },
  { id: 'lesson-05', state: { stage: 'review', selected: 2, round: 1, solvedCount: 3, practiceHelped: true },
    invalid: [{ solvedCount: 2 }, { selected: 4 }, { selected: -1 }, { stage: 'practice' }, { stage: 'success', round: 0 }, { practiceHelped: false }, { round: Number.MAX_SAFE_INTEGER }] },
  { id: 'lesson-09', state: { stage: 'recommend', round: 1, helped: true, answered: false, feedbackKind: 'adjust' },
    invalid: [{ helped: false }, { answered: true }, { stage: 'spread' }, { stage: 'transfer-intro' }, { stage: 'success' }, { feedbackKind: 'answer' }, { round: Infinity }] },
];
describe('Remaining lesson state coherence', () => {
  const guided: readonly { id: DraftLessonId; state: Record<string, unknown>; invalid: readonly Record<string, unknown>[] }[] = [
    { id: 'lesson-02', state: { stage: 'success', redistributed: true, round: 1, practiceCase: 1, practiceHelped: true, selectedLoad: null },
      invalid: [{ round: 0 }, { practiceCase: 0 }, { redistributed: false }] },
    { id: 'lesson-03', state: { stage: 'success', selectedMinId: 'practice-1-2', selectedMaxId: 'practice-1-3', round: 1, practiceHelped: true },
      invalid: [{ round: 0, selectedMinId: 'practice-0-2', selectedMaxId: 'practice-0-4' }, { selectedMaxId: null }, { selectedMinId: null }] },
    { id: 'lesson-04', state: { stage: 'success', experimentMode: 'apart', rangePrediction: 'same', separatedViewed: true, round: 1, practiceHelped: true },
      invalid: [{ round: 0 }, { separatedViewed: false }, { rangePrediction: null }] },
    { id: 'lesson-05', state: { stage: 'success', selected: 2, round: 1, solvedCount: 3, practiceHelped: true },
      invalid: [{ round: 0 }, { solvedCount: 2 }, { selected: 4 }] },
    { id: 'lesson-09', state: { stage: 'success', round: 1, helped: true, answered: false, feedbackKind: 'none' },
      invalid: [{ round: 0 }, { answered: true }, { feedbackKind: 'answer' }] },
  ];
  for (const item of guided) {
    it(item.id + ' accepts an assisted additional finish but rejects a premature or incomplete one', () => {
      expect(isLessonExerciseState(item.id, item.state)).toBe(true);
      for (const change of item.invalid) expect(isLessonExerciseState(item.id, { ...item.state, ...change }), JSON.stringify(change)).toBe(false);
    });
  }
  for (const item of cases) {
    it(item.id + ' rejects impossible stages, selections and assistance combinations', () => {
      expect(isLessonExerciseState(item.id, item.state)).toBe(true);
      for (const change of item.invalid) expect(isLessonExerciseState(item.id, { ...item.state, ...change }), JSON.stringify(change)).toBe(false);
    });
    it(item.id + ' rejects missing fields, wrong types and unknown stages', () => {
      for (const field of Object.keys(item.state)) {
        const missing = { ...item.state }; delete missing[field];
        expect(isLessonExerciseState(item.id, missing), field).toBe(false);
      }
      for (const value of [null, [], 'draft', { ...item.state, stage: 'unknown' }]) expect(isLessonExerciseState(item.id, value)).toBe(false);
    });
  }
});
