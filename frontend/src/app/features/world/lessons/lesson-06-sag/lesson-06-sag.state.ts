export type C6Stage =
  | 'observe'
  | 'cancel'
  | 'squares'
  | 'weight'
  | 'discovery'
  | 'practice-square'
  | 'practice-checked'
  | 'review'
  | 'success';
export const C6_MAX_PRACTICE_ROUNDS = 1;

export type C6State = Readonly<{
  stage: C6Stage;
  squaresFormed: boolean;
  round: number;
  practiceHelped: boolean;
  practiceVarianceAnswered: boolean;
  choiceOffset: number;
}>;

const STAGES: readonly C6Stage[] = [
  'observe',
  'cancel',
  'squares',
  'weight',
  'discovery',
  'practice-square',
  'practice-checked',
  'review',
  'success',
];

// A resumed practice keeps its help and still requires a checked calculation.
export function isC6State(value: unknown): value is C6State {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (['duplicated', 'duplicateViewed'].some((key) => Object.hasOwn(value, key))) return false;
  const state = value as Partial<C6State>;
  if (
    !STAGES.includes(state.stage as C6Stage) ||
    !['squaresFormed', 'practiceHelped', 'practiceVarianceAnswered'].every(
      (key) => typeof (state as Record<string, unknown>)[key] === 'boolean',
    ) ||
    !Number.isSafeInteger(state.round) ||
    state.round! < 0 ||
    state.round! >= Number.MAX_SAFE_INTEGER ||
    !Number.isInteger(state.choiceOffset) ||
    state.choiceOffset! < 0 ||
    state.choiceOffset! > 2
  )
    return false;

  const stage = state.stage!;
  const practicing = ['practice-square', 'practice-checked', 'review', 'success'].includes(stage);
  if (!practicing && (state.round !== 0 || state.practiceHelped || state.practiceVarianceAnswered))
    return false;
  if (['observe', 'cancel'].includes(stage) && state.squaresFormed) return false;
  if (!['observe', 'cancel', 'squares'].includes(stage) && !state.squaresFormed) return false;
  if (stage === 'practice-square' && state.practiceVarianceAnswered) return false;
  if (stage === 'review' && (!state.practiceHelped || !state.practiceVarianceAnswered))
    return false;
  if (
    stage === 'success' &&
    (!state.practiceVarianceAnswered ||
      (state.practiceHelped && state.round! < C6_MAX_PRACTICE_ROUNDS))
  )
    return false;
  return true;
}

export function copyC6State(state: C6State): C6State {
  return {
    stage: state.stage,
    squaresFormed: state.squaresFormed,
    round: state.round,
    practiceHelped: state.practiceHelped,
    practiceVarianceAnswered: state.practiceVarianceAnswered,
    choiceOffset: state.choiceOffset,
  };
}

// Removed copy stages reopen the explanation or the unanswered practice.
// Read without rewriting storage; keep valid results and never grant completion.
export function readC6State(value: unknown): C6State | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const legacy = ['duplicated', 'duplicateViewed'].some((key) => Object.hasOwn(value, key));
  if (!legacy) return isC6State(value) ? copyC6State(value) : null;
  if (!isLegacyC6State(value)) return null;
  const stage: C6Stage =
    value.stage === 'duplicate' || value.stage === 'average'
      ? 'discovery'
      : value.stage === 'practice-average'
        ? 'practice-checked'
        : value.stage;
  const current: C6State = {
    stage,
    squaresFormed: value.squaresFormed,
    round: value.round,
    practiceHelped: value.practiceHelped,
    practiceVarianceAnswered: value.practiceVarianceAnswered,
    choiceOffset: value.choiceOffset,
  };
  return isC6State(current) ? copyC6State(current) : null;
}

type LegacyC6State = Omit<C6State, 'stage'> &
  Readonly<{
    stage: C6Stage | 'duplicate' | 'average' | 'practice-average';
    duplicated: boolean;
    duplicateViewed: boolean;
  }>;

const LEGACY_STAGES: readonly LegacyC6State['stage'][] = [
  'observe',
  'cancel',
  'squares',
  'weight',
  'duplicate',
  'average',
  'discovery',
  'practice-square',
  'practice-average',
  'practice-checked',
  'review',
  'success',
];

function isLegacyC6State(value: unknown): value is LegacyC6State {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const state = value as Partial<LegacyC6State>;
  if (
    !LEGACY_STAGES.includes(state.stage as LegacyC6State['stage']) ||
    ![
      'squaresFormed',
      'duplicated',
      'duplicateViewed',
      'practiceHelped',
      'practiceVarianceAnswered',
    ].every((key) => typeof (state as Record<string, unknown>)[key] === 'boolean') ||
    !Number.isSafeInteger(state.round) ||
    state.round! < 0 ||
    state.round! >= Number.MAX_SAFE_INTEGER ||
    !Number.isInteger(state.choiceOffset) ||
    state.choiceOffset! < 0 ||
    state.choiceOffset! > 2
  )
    return false;

  const stage = state.stage!;
  const practicing = [
    'practice-square',
    'practice-average',
    'practice-checked',
    'review',
    'success',
  ].includes(stage);
  if (!practicing && (state.round !== 0 || state.practiceHelped || state.practiceVarianceAnswered))
    return false;
  if (state.duplicated && !state.duplicateViewed) return false;
  if (['observe', 'cancel'].includes(stage) && state.squaresFormed) return false;
  if (!['observe', 'cancel', 'squares'].includes(stage) && !state.squaresFormed) return false;
  if (
    ['observe', 'cancel', 'squares', 'weight'].includes(stage) &&
    (state.duplicated || state.duplicateViewed)
  )
    return false;
  if (
    [
      'average',
      'discovery',
      'practice-square',
      'practice-average',
      'practice-checked',
      'review',
      'success',
    ].includes(stage) &&
    (!state.duplicated || !state.duplicateViewed)
  )
    return false;
  if (['practice-square', 'practice-average'].includes(stage) && state.practiceVarianceAnswered)
    return false;
  if (stage === 'review' && (!state.practiceHelped || !state.practiceVarianceAnswered))
    return false;
  // A guided finish still requires a checked variance and the completed copy
  // experiment. Preserve old later-round drafts without demanding a new round.
  if (
    stage === 'success' &&
    (!state.practiceVarianceAnswered ||
      (state.practiceHelped && state.round! < C6_MAX_PRACTICE_ROUNDS))
  )
    return false;
  return true;
}
