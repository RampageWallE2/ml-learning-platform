import { C6State, isC6State } from './lesson-06-sag.state';

const start: C6State = { stage: 'observe', squaresFormed: false, duplicated: false,
  duplicateViewed: false, round: 0, practiceHelped: false, practiceVarianceAnswered: false, choiceOffset: 1 };
const practice: C6State = { ...start, stage: 'practice-square', squaresFormed: true, duplicated: true, duplicateViewed: true };

describe('C6 state validation', () => {
  it.each<C6State>([
    start, { ...start, stage: 'cancel' }, { ...start, stage: 'squares' },
    { ...start, stage: 'squares', squaresFormed: true }, { ...start, stage: 'weight', squaresFormed: true },
    { ...start, stage: 'duplicate', squaresFormed: true },
    { ...start, stage: 'duplicate', squaresFormed: true, duplicateViewed: true },
    { ...practice, stage: 'average' }, { ...practice, stage: 'discovery' }, practice,
    { ...practice, stage: 'practice-average', round: 2, practiceHelped: true },
    { ...practice, stage: 'practice-checked', round: 3 },
    { ...practice, stage: 'practice-checked', practiceVarianceAnswered: true },
    { ...practice, stage: 'review', practiceHelped: true, practiceVarianceAnswered: true },
    { ...practice, stage: 'success', practiceVarianceAnswered: true },
    { ...practice, stage: 'success', round: 1, practiceHelped: true, practiceVarianceAnswered: true },
    { ...practice, stage: 'success', round: 3, practiceHelped: true, practiceVarianceAnswered: true },
  ])('accepts a reachable $stage snapshot', state => expect(isC6State(state)).toBe(true));

  it.each([
    null, {}, { ...start, stage: 'other' }, { ...start, round: -1 }, { ...start, round: 0.5 },
    { ...practice, round: Number.MAX_SAFE_INTEGER }, { ...practice, round: Infinity },
    { ...start, choiceOffset: 3 }, { ...start, choiceOffset: '1' }, { ...start, squaresFormed: true },
    { ...start, practiceHelped: true }, { ...start, duplicated: true },
    { ...practice, duplicateViewed: false }, { ...practice, squaresFormed: false },
    { ...practice, stage: 'practice-average', practiceVarianceAnswered: true },
    { ...practice, stage: 'review', practiceVarianceAnswered: true },
    { ...practice, stage: 'success' },
    { ...practice, stage: 'success', practiceHelped: true, practiceVarianceAnswered: true },
    { ...practice, stage: 'success', round: 1, practiceHelped: true },
    { ...practice, stage: 'success', round: 1, practiceHelped: true, practiceVarianceAnswered: true, duplicateViewed: false },
  ])('rejects malformed or impossible state %j', state => expect(isC6State(state)).toBe(false));
});
