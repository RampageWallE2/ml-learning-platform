import { C8State, isC8State } from './lesson-08-flotation.state';

const start: C8State = { stage: 'observe', round: 0, helped: false, selectedRecord: null, comparing: false, choiceOffset: 1 };
const located: C8State = { ...start, stage: 'located', selectedRecord: 0 };

describe('C8 state validation', () => {
  it.each<C8State>([
    start, { ...start, stage: 'root' }, { ...start, stage: 'root', helped: true, round: 1 },
    { ...start, stage: 'checked', round: 2 }, { ...start, stage: 'locate', helped: true },
    located, { ...located, stage: 'locate', comparing: true }, { ...located, comparing: true },
    { ...located, stage: 'report' }, { ...located, stage: 'review', helped: true },
    { ...located, stage: 'success' }, { ...located, stage: 'success', round: 1, selectedRecord: 5 },
    { ...located, stage: 'success', round: 1, selectedRecord: 5, helped: true },
    { ...located, stage: 'success', round: 3, helped: true },
    { ...located, stage: 'report', round: 2, selectedRecord: 5 },
    { ...located, stage: 'locate', round: 3, comparing: true },
  ])('accepts a reachable $stage snapshot in round $round', state => expect(isC8State(state)).toBe(true));

  it.each([
    null, {}, { ...start, stage: 'unknown' }, { ...start, helped: 'false' },
    { ...start, comparing: 0 }, { ...start, round: -1 }, { ...start, round: 0.5 },
    { ...start, round: Number.MAX_SAFE_INTEGER }, { ...start, choiceOffset: -1 },
    { ...start, choiceOffset: 3 }, { ...start, choiceOffset: '1' }, { ...start, round: 1 },
    { ...start, helped: true }, { ...start, selectedRecord: 0 },
    { ...located, selectedRecord: -1 }, { ...located, selectedRecord: 6 },
    { ...located, selectedRecord: 0.5 }, { ...located, selectedRecord: '0' },
    { ...located, selectedRecord: null }, { ...located, selectedRecord: 4 },
    { ...located, stage: 'root' }, { ...located, stage: 'checked' },
    { ...located, stage: 'locate' }, { ...start, stage: 'locate', comparing: true },
    { ...located, stage: 'report', comparing: true }, { ...located, stage: 'review' },
    { ...located, stage: 'success', helped: true }, { ...located, round: 1 },
    { ...located, stage: 'success', round: 1, helped: true, selectedRecord: null },
    { ...located, stage: 'success', round: 1, helped: true, selectedRecord: 0 },
    { ...located, stage: 'success', round: 1, helped: true, selectedRecord: 5, comparing: true },
  ])('rejects a malformed or unreachable snapshot %j', state => expect(isC8State(state)).toBe(false));
});
