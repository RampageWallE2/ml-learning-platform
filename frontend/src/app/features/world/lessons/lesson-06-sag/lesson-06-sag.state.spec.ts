import { C6State, copyC6State, isC6State, readC6State } from './lesson-06-sag.state';

const start: C6State = {
  stage: 'observe',
  squaresFormed: false,
  round: 0,
  practiceHelped: false,
  practiceVarianceAnswered: false,
  choiceOffset: 1,
};
const practice: C6State = { ...start, stage: 'practice-square', squaresFormed: true };

describe('C6 state validation', () => {
  it.each<C6State>([
    start,
    { ...start, stage: 'cancel' },
    { ...start, stage: 'squares' },
    { ...start, stage: 'squares', squaresFormed: true },
    { ...start, stage: 'weight', squaresFormed: true },
    { ...practice, stage: 'discovery' },
    practice,
    { ...practice, stage: 'practice-checked', round: 3 },
    { ...practice, stage: 'practice-checked', practiceVarianceAnswered: true },
    { ...practice, stage: 'review', practiceHelped: true, practiceVarianceAnswered: true },
    { ...practice, stage: 'success', practiceVarianceAnswered: true },
    {
      ...practice,
      stage: 'success',
      round: 1,
      practiceHelped: true,
      practiceVarianceAnswered: true,
    },
    {
      ...practice,
      stage: 'success',
      round: 3,
      practiceHelped: true,
      practiceVarianceAnswered: true,
    },
  ])('accepts a reachable $stage snapshot', (state) => {
    expect(isC6State(state)).toBe(true);
    expect(readC6State(state)).toEqual(state);
    expect(copyC6State(state)).not.toBe(state);
  });

  it.each([
    null,
    [],
    {},
    { ...start, stage: 'other' },
    { ...start, round: -1 },
    { ...start, round: 0.5 },
    { ...practice, round: Number.MAX_SAFE_INTEGER },
    { ...practice, round: Infinity },
    { ...start, choiceOffset: 3 },
    { ...start, choiceOffset: '1' },
    { ...start, squaresFormed: true },
    { ...start, practiceHelped: true },
    { ...practice, squaresFormed: false },
    { ...practice, practiceVarianceAnswered: true },
    { ...practice, stage: 'review', practiceVarianceAnswered: true },
    { ...practice, stage: 'success' },
    { ...practice, stage: 'success', practiceHelped: true, practiceVarianceAnswered: true },
    { ...practice, stage: 'success', round: 1, practiceHelped: true },
    { ...practice, stage: 'duplicate' },
    { ...practice, stage: 'average' },
    { ...practice, stage: 'practice-average' },
  ])('rejects malformed or impossible state %j', (state) => {
    expect(isC6State(state)).toBe(false);
    expect(readC6State(state)).toBeNull();
  });

  it.each(['duplicate', 'average'] as const)(
    'reopens the explanation for an old %s draft',
    (stage) => {
      const legacy = {
        ...practice,
        stage,
        duplicated: stage === 'average',
        duplicateViewed: stage === 'average',
      };
      expect(isC6State(legacy)).toBe(false);
      expect(readC6State(legacy)).toEqual({ ...practice, stage: 'discovery' });
      expect(legacy.stage).toBe(stage);
      expect(legacy).toHaveProperty('duplicated');
    },
  );

  it('moves an unfinished old copy practice to the numeric question without answering it', () => {
    const legacy = {
      ...practice,
      stage: 'practice-average',
      duplicated: true,
      duplicateViewed: true,
      round: 2,
      practiceHelped: true,
      choiceOffset: 2,
    };
    expect(readC6State(legacy)).toEqual({
      ...practice,
      stage: 'practice-checked',
      round: 2,
      practiceHelped: true,
      choiceOffset: 2,
    });
  });

  it.each<C6State>([
    start,
    { ...start, stage: 'squares' },
    { ...practice, stage: 'weight' },
    { ...practice, stage: 'discovery' },
    practice,
    { ...practice, stage: 'practice-checked', round: 2, practiceHelped: true },
    {
      ...practice,
      stage: 'review',
      round: 3,
      practiceHelped: true,
      practiceVarianceAnswered: true,
    },
    {
      ...practice,
      stage: 'success',
      round: 3,
      practiceHelped: true,
      practiceVarianceAnswered: true,
    },
  ])('preserves an old reachable $stage state and strips only copy flags', (state) => {
    const copied = [
      'discovery',
      'practice-square',
      'practice-checked',
      'review',
      'success',
    ].includes(state.stage);
    const legacy = { ...state, duplicated: copied, duplicateViewed: copied };
    expect(readC6State(legacy)).toEqual(state);
    expect(readC6State(legacy)).not.toHaveProperty('duplicated');
    expect(readC6State(legacy)).not.toHaveProperty('duplicateViewed');
  });

  it.each([
    { ...practice, stage: 'average', duplicated: false, duplicateViewed: true },
    { ...practice, stage: 'practice-average', duplicated: true, duplicateViewed: false },
    {
      ...practice,
      stage: 'practice-average',
      duplicated: true,
      duplicateViewed: true,
      practiceVarianceAnswered: true,
    },
    { ...practice, stage: 'success', duplicated: true, duplicateViewed: true },
    {
      ...practice,
      stage: 'success',
      duplicated: true,
      duplicateViewed: true,
      practiceVarianceAnswered: true,
      practiceHelped: true,
    },
    { ...start, duplicated: true, duplicateViewed: true },
    { ...practice, duplicated: true },
    { ...practice, duplicateViewed: true },
  ])('rejects incoherent legacy state instead of granting completion %j', (state) => {
    expect(readC6State(state)).toBeNull();
  });
});
