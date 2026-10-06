import { C7State, copyC7State, isC7State } from './lesson-07-balls.state';

const initial: C7State = { stage: 'observe', round: 0, prediction: null, activeIndex: 0,
  solved: [], helped: false, hintLevel: 0, hintFocus: null, choiceOffset: 2 };
const calculating: C7State = { ...initial, stage: 'calculate', prediction: 'equal' };
const report: C7State = { ...calculating, stage: 'report', activeIndex: 1, solved: ['a', 'b'] };

describe('C7 — coherent draft state', () => {
  it.each([
    initial, { ...initial, round: 3 }, calculating,
    { ...calculating, helped: true, hintLevel: 1, hintFocus: 'count' },
    { ...calculating, helped: true, hintLevel: 2, hintFocus: 'deviations' },
    { ...calculating, stage: 'checked', solved: ['a'], helped: true },
    { ...calculating, activeIndex: 1, solved: ['a'], helped: true },
    { ...calculating, stage: 'checked', activeIndex: 1, solved: ['a', 'b'] },
    report, { ...report, helped: true, hintLevel: 2, hintFocus: 'context' },
    { ...report, stage: 'review', helped: true }, { ...report, stage: 'success', round: 3 },
    { ...report, stage: 'success', round: 1, helped: true },
    { ...report, stage: 'success', round: 3, helped: true },
  ])('accepts a reachable state: %j', state => expect(isC7State(state)).toBe(true));

  it.each([
    null, [], {}, { ...initial, stage: 'unknown' }, { ...initial, round: -1 },
    { ...initial, round: 0.5 }, { ...initial, round: Number.MAX_SAFE_INTEGER },
    { ...initial, choiceOffset: 3 }, { ...initial, choiceOffset: 0.5 },
    { ...initial, helped: 'false' }, { ...initial, prediction: undefined },
    { ...initial, prediction: 'b' }, { ...initial, solved: ['a'] },
    { ...initial, helped: true }, { ...initial, hintLevel: 1, hintFocus: 'count' },
    { ...calculating, prediction: null }, { ...calculating, activeIndex: 2 },
    { ...calculating, solved: ['b'] }, { ...calculating, activeIndex: 1 },
    { ...calculating, activeIndex: 1, solved: ['b', 'a'] },
    { ...calculating, solved: ['a', 'a'] }, { ...calculating, solved: 'a' },
    { ...calculating, helped: true }, { ...calculating, hintFocus: 'count' },
    { ...calculating, hintLevel: 1, hintFocus: 'deviations' },
    { ...calculating, helped: true, hintLevel: 2, hintFocus: 'variances' },
    { ...calculating, helped: true, hintLevel: 2, hintFocus: null },
    { ...calculating, stage: 'checked' },
    { ...calculating, stage: 'checked', activeIndex: 1, solved: ['a'] },
    { ...report, activeIndex: 0 }, { ...report, solved: ['a'] },
    { ...report, helped: true, hintLevel: 1, hintFocus: 'count' },
    { ...report, stage: 'review' }, { ...report, stage: 'success', helped: true },
    { ...report, stage: 'success', helped: true, hintLevel: 2, hintFocus: 'context' },
    { ...calculating, stage: 'success', round: 1, helped: true },
    { ...report, stage: 'success', round: 1, helped: true, hintLevel: 1, hintFocus: 'variances' },
  ])('rejects an incoherent state: %j', state => expect(isC7State(state)).toBe(false));

  it('copies only the required fields and isolates the solved array', () => {
    const copied = copyC7State({ ...report, feedback: 'not stored', email: 'not stored' } as C7State);
    expect(copied).toEqual(report); expect(copied.solved).not.toBe(report.solved);
  });
});
