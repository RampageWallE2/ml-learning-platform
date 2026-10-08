export type C4Stage = 'compare' | 'discovery' | 'practice' | 'evidence' | 'review' | 'success';
export type C4State = Readonly<{ stage: C4Stage; round: number; practiceHelped: boolean }>;
export const C4_MAX_PRACTICE_ROUNDS = 1;

export function isC4State(value: unknown): value is C4State {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const state = value as Partial<C4State>;
  if (!state.stage || !['compare', 'discovery', 'practice', 'evidence', 'review', 'success'].includes(state.stage)
    || typeof state.practiceHelped !== 'boolean' || typeof state.round !== 'number'
    || !Number.isSafeInteger(state.round) || state.round < 0 || state.round >= Number.MAX_SAFE_INTEGER) return false;
  if (state.stage === 'compare' || state.stage === 'discovery') return state.round === 0 && !state.practiceHelped;
  if (state.stage === 'review') return state.practiceHelped;
  if (state.stage === 'success') return !state.practiceHelped || state.round >= C4_MAX_PRACTICE_ROUNDS;
  return true;
}

export function copyC4State(state: C4State): C4State {
  return { stage: state.stage, round: state.round, practiceHelped: state.practiceHelped };
}

// Read-only compatibility: old experiment drafts resume at the explanation,
// not at a removed activity. Practice and successful results keep their place.
export function readC4State(value: unknown): C4State | null {
  if (!value || typeof value !== 'object') return null;
  const legacy = ['experimentMode', 'rangePrediction', 'separatedViewed'].some(key => Object.hasOwn(value, key));
  if (!legacy) return isC4State(value) ? copyC4State(value) : null;
  if (!isLegacyC4State(value)) return null;
  const stage = ['predict', 'experiment', 'explain'].includes(value.stage) ? 'discovery' : value.stage;
  const current = { stage, round: value.round, practiceHelped: value.practiceHelped };
  return isC4State(current) ? copyC4State(current) : null;
}

type LegacyC4State = Readonly<{
  stage: C4Stage | 'predict' | 'experiment' | 'explain';
  experimentMode: 'together' | 'apart';
  rangePrediction: 'increase' | 'same' | 'decrease' | null;
  separatedViewed: boolean;
  round: number;
  practiceHelped: boolean;
}>;

function isLegacyC4State(value: unknown): value is LegacyC4State {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const state = value as Partial<LegacyC4State>;
  if (!state.stage || !['compare', 'predict', 'experiment', 'explain', 'discovery', 'practice', 'evidence', 'review', 'success'].includes(state.stage)
    || !state.experimentMode || !['together', 'apart'].includes(state.experimentMode)
    || state.rangePrediction === undefined || !['increase', 'same', 'decrease', null].includes(state.rangePrediction)
    || typeof state.separatedViewed !== 'boolean' || typeof state.practiceHelped !== 'boolean'
    || typeof state.round !== 'number' || !Number.isSafeInteger(state.round)
    || state.round < 0 || state.round >= Number.MAX_SAFE_INTEGER) return false;
  const practicing = ['practice', 'evidence', 'review', 'success'].includes(state.stage);
  if (!practicing && (state.round !== 0 || state.practiceHelped)) return false;
  if (state.stage === 'compare' || state.stage === 'predict') {
    return state.rangePrediction === null && !state.separatedViewed && state.experimentMode === 'together';
  }
  if (state.rangePrediction === null || state.experimentMode === 'apart' && !state.separatedViewed) return false;
  if (state.stage === 'experiment') return true;
  if (!state.separatedViewed || state.experimentMode !== 'apart') return false;
  if (state.stage === 'review') return state.practiceHelped;
  if (state.stage === 'success') return !state.practiceHelped || state.round >= C4_MAX_PRACTICE_ROUNDS;
  return true;
}
