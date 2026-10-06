export type C1Stage = 'learn' | 'compare' | 'discovery' | 'practice' | 'practice-reason' | 'practice-review' | 'success';
export type C1Group = Readonly<{ name: string; loads: readonly number[] }>;
export type C1State = Readonly<{ stage: C1Stage; selectedLoad: string | null; selectedGroup: string | null;
  practiceRound: number; practiceHelped: boolean }>;
export const C1_MAX_PRACTICE_ROUNDS = 1;

export function c1Groups(stage: C1Stage, round: number): readonly C1Group[] {
  if (stage === 'learn') return [{ name: 'Ejemplo', loads: [90, 100, 110] }];
  if (!['practice', 'practice-reason', 'practice-review'].includes(stage)) return [
    { name: 'A', loads: [98, 102, 100, 101, 99] }, { name: 'B', loads: [82, 116, 95, 111, 96] },
  ];
  if (round === 0) return [{ name: 'C', loads: [110, 111, 112] }, { name: 'D', loads: [90, 100, 110] }];
  if (round === 1) return [{ name: 'E', loads: [85, 100, 115] }, { name: 'F', loads: [105, 106, 107] }];
  const offset = (round - 2) % 9;
  const wide = { name: 'G', loads: [81 + offset, 95 + offset, 109 + offset] };
  const narrow = { name: 'H', loads: [110 + offset, 111 + offset, 112 + offset] };
  return round % 2 === 0 ? [narrow, wide] : [wide, narrow];
}
export function c1CorrectGroup(round: number): string { return round === 0 ? 'D' : round === 1 ? 'E' : 'G'; }

export function isC1State(value: unknown): value is C1State {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<C1State>;
  if (!['learn', 'compare', 'discovery', 'practice', 'practice-reason', 'practice-review', 'success'].includes(state.stage!)
    || !Number.isSafeInteger(state.practiceRound) || state.practiceRound! < 0 || state.practiceRound! >= Number.MAX_SAFE_INTEGER
    || typeof state.practiceHelped !== 'boolean'
    || state.selectedLoad !== null && typeof state.selectedLoad !== 'string') return false;
  if (state.selectedLoad !== null && !c1Groups(state.stage!, state.practiceRound!).some(group =>
    group.loads.some((_, index) => group.name + (index + 1) === state.selectedLoad))) return false;
  if (['learn', 'compare', 'discovery'].includes(state.stage!)) {
    return state.practiceRound === 0 && !state.practiceHelped && state.selectedGroup === null;
  }
  if (state.stage === 'practice') return state.selectedGroup === null;
  if (state.selectedGroup !== c1CorrectGroup(state.practiceRound!)) return false;
  if (state.stage === 'practice-review') return state.practiceHelped;
  if (state.stage === 'success') return !state.practiceHelped || state.practiceRound! >= C1_MAX_PRACTICE_ROUNDS;
  return true;
}
export function copyC1State(state: C1State): C1State {
  return { stage: state.stage, selectedLoad: state.selectedLoad, selectedGroup: state.selectedGroup,
    practiceRound: state.practiceRound, practiceHelped: state.practiceHelped };
}
