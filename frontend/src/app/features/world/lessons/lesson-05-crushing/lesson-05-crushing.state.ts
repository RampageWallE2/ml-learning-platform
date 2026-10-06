export type C5Stage = 'explore' | 'compare' | 'notation' | 'practice' | 'review' | 'report' | 'success';
export type C5State = Readonly<{ stage: C5Stage; selected: number; round: number; solvedCount: number; practiceHelped: boolean }>;

export function isC5State(value: unknown): value is C5State {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<C5State>;
  if (!['explore', 'compare', 'notation', 'practice', 'review', 'report', 'success'].includes(state.stage!)
    || !Number.isInteger(state.selected) || state.selected! < 0 || state.selected! > 3
    || !Number.isSafeInteger(state.round) || state.round! < 0 || state.round! > Number.MAX_SAFE_INTEGER - 3
    || !Number.isInteger(state.solvedCount) || state.solvedCount! < 0 || state.solvedCount! > 3
    || typeof state.practiceHelped !== 'boolean') return false;
  if (['explore', 'compare', 'notation'].includes(state.stage!)) return state.round === 0 && state.solvedCount === 0 && !state.practiceHelped;
  if (state.stage === 'practice') return state.solvedCount! < 3;
  if (state.solvedCount !== 3) return false;
  return state.stage === 'review' ? state.practiceHelped : !state.practiceHelped;
}
export function copyC5State(state: C5State): C5State {
  return { stage: state.stage, selected: state.selected, round: state.round,
    solvedCount: state.solvedCount, practiceHelped: state.practiceHelped };
}
