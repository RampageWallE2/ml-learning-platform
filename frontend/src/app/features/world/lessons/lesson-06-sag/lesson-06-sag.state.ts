export type C6Stage = 'observe' | 'cancel' | 'squares' | 'weight' | 'duplicate' | 'average' | 'discovery'
  | 'practice-square' | 'practice-average' | 'practice-checked' | 'review' | 'success';
export const C6_MAX_PRACTICE_ROUNDS = 1;

export type C6State = Readonly<{
  stage: C6Stage;
  squaresFormed: boolean;
  duplicated: boolean;
  duplicateViewed: boolean;
  round: number;
  practiceHelped: boolean;
  practiceVarianceAnswered: boolean;
  choiceOffset: number;
}>;

const STAGES: readonly C6Stage[] = ['observe', 'cancel', 'squares', 'weight', 'duplicate', 'average',
  'discovery', 'practice-square', 'practice-average', 'practice-checked', 'review', 'success'];

// Validate reachable combinations, not just field types: a resume must not
// bypass the copy experiment or turn a helped practice into an unaided one.
export function isC6State(value: unknown): value is C6State {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<C6State>;
  if (!STAGES.includes(state.stage as C6Stage)
    || !['squaresFormed', 'duplicated', 'duplicateViewed', 'practiceHelped', 'practiceVarianceAnswered']
      .every(key => typeof (state as Record<string, unknown>)[key] === 'boolean')
    || !Number.isSafeInteger(state.round) || state.round! < 0 || state.round! >= Number.MAX_SAFE_INTEGER
    || !Number.isInteger(state.choiceOffset) || state.choiceOffset! < 0 || state.choiceOffset! > 2) return false;

  const stage = state.stage!;
  const practicing = ['practice-square', 'practice-average', 'practice-checked', 'review', 'success'].includes(stage);
  if (!practicing && (state.round !== 0 || state.practiceHelped || state.practiceVarianceAnswered)) return false;
  if (state.duplicated && !state.duplicateViewed) return false;
  if (['observe', 'cancel'].includes(stage) && state.squaresFormed) return false;
  if (!['observe', 'cancel', 'squares'].includes(stage) && !state.squaresFormed) return false;
  if (['observe', 'cancel', 'squares', 'weight'].includes(stage) && (state.duplicated || state.duplicateViewed)) return false;
  if (['average', 'discovery', 'practice-square', 'practice-average', 'practice-checked', 'review', 'success'].includes(stage)
    && (!state.duplicated || !state.duplicateViewed)) return false;
  if (['practice-square', 'practice-average'].includes(stage) && state.practiceVarianceAnswered) return false;
  if (stage === 'review' && (!state.practiceHelped || !state.practiceVarianceAnswered)) return false;
  // A guided finish still requires a checked variance and the completed copy
  // experiment. Preserve old later-round drafts without demanding a new round.
  if (stage === 'success' && (!state.practiceVarianceAnswered
    || state.practiceHelped && state.round! < C6_MAX_PRACTICE_ROUNDS)) return false;
  return true;
}

export function copyC6State(state: C6State): C6State {
  return {
    stage: state.stage, squaresFormed: state.squaresFormed, duplicated: state.duplicated,
    duplicateViewed: state.duplicateViewed, round: state.round, practiceHelped: state.practiceHelped,
    practiceVarianceAnswered: state.practiceVarianceAnswered, choiceOffset: state.choiceOffset,
  };
}
