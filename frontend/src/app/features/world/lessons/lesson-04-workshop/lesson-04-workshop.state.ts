export type C4Stage = 'compare' | 'predict' | 'experiment' | 'explain' | 'discovery' | 'practice' | 'evidence' | 'review' | 'success';
export type C4ExperimentMode = 'together' | 'apart';
export type C4RangePrediction = 'increase' | 'same' | 'decrease';
export type C4State = Readonly<{ stage: C4Stage; experimentMode: C4ExperimentMode;
  rangePrediction: C4RangePrediction | null; separatedViewed: boolean; round: number; practiceHelped: boolean }>;
export const C4_MAX_PRACTICE_ROUNDS = 1;

export function isC4State(value: unknown): value is C4State {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<C4State>;
  if (!['compare', 'predict', 'experiment', 'explain', 'discovery', 'practice', 'evidence', 'review', 'success'].includes(state.stage!)
    || !['together', 'apart'].includes(state.experimentMode!)
    || !['increase', 'same', 'decrease', null].includes(state.rangePrediction!)
    || typeof state.separatedViewed !== 'boolean' || typeof state.practiceHelped !== 'boolean'
    || !Number.isSafeInteger(state.round) || state.round! < 0 || state.round! >= Number.MAX_SAFE_INTEGER) return false;
  const practicing = ['practice', 'evidence', 'review', 'success'].includes(state.stage!);
  if (!practicing && (state.round !== 0 || state.practiceHelped)) return false;
  if (['compare', 'predict'].includes(state.stage!)) {
    return state.rangePrediction === null && !state.separatedViewed && state.experimentMode === 'together';
  }
  if (state.rangePrediction === null || state.experimentMode === 'apart' && !state.separatedViewed) return false;
  if (state.stage === 'experiment') return true;
  if (!state.separatedViewed || state.experimentMode !== 'apart') return false;
  if (state.stage === 'review') return state.practiceHelped;
  if (state.stage === 'success') return !state.practiceHelped || state.round! >= C4_MAX_PRACTICE_ROUNDS;
  return true;
}
export function copyC4State(state: C4State): C4State {
  return { stage: state.stage, experimentMode: state.experimentMode, rangePrediction: state.rangePrediction,
    separatedViewed: state.separatedViewed, round: state.round, practiceHelped: state.practiceHelped };
}
