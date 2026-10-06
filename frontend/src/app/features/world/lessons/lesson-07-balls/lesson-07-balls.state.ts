export type C7Stage = 'observe' | 'calculate' | 'checked' | 'report' | 'review' | 'success';
export type C7PeriodId = 'a' | 'b';
export type C7Prediction = C7PeriodId | 'equal';
export type C7HintFocus = 'deviations' | 'count' | 'variances' | 'context';
export const C7_MAX_PRACTICE_ROUNDS = 1;

export type C7State = Readonly<{
  stage: C7Stage;
  round: number;
  prediction: C7Prediction | null;
  activeIndex: number;
  solved: readonly C7PeriodId[];
  helped: boolean;
  hintLevel: 0 | 1 | 2;
  hintFocus: C7HintFocus | null;
  choiceOffset: number;
}>;

const STAGES: readonly C7Stage[] = ['observe', 'calculate', 'checked', 'report', 'review', 'success'];

export function isC7State(value: unknown): value is C7State {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<C7State>;
  if (!STAGES.includes(state.stage as C7Stage)
    || !Number.isSafeInteger(state.round) || state.round! < 0 || state.round! > Number.MAX_SAFE_INTEGER - 3
    || !['a', 'b', 'equal', null].includes(state.prediction!)
    || (state.activeIndex !== 0 && state.activeIndex !== 1)
    || !Array.isArray(state.solved) || typeof state.helped !== 'boolean'
    || ![0, 1, 2].includes(state.hintLevel!)
    || !Number.isInteger(state.choiceOffset) || state.choiceOffset! < 0 || state.choiceOffset! > 2) return false;

  const solved = state.solved;
  const none = solved.length === 0;
  const first = solved.length === 1 && solved[0] === 'a';
  const both = solved.length === 2 && solved[0] === 'a' && solved[1] === 'b';
  if (state.hintLevel === 0) {
    if (state.hintFocus !== null) return false;
  } else {
    if (!state.helped) return false;
    if (state.stage === 'calculate') {
      if (state.hintFocus !== 'deviations' && state.hintFocus !== 'count') return false;
    } else if (state.stage === 'report') {
      if (state.hintFocus !== 'variances' && state.hintFocus !== 'context') return false;
    } else return false;
  }

  if (state.stage === 'observe') {
    return state.prediction === null && state.activeIndex === 0 && none && !state.helped && state.hintLevel === 0;
  }
  if (state.prediction === null) return false;
  if (state.stage === 'calculate') {
    return state.activeIndex === 0 ? none && (!state.helped || state.hintLevel! > 0) : first;
  }
  if (state.stage === 'checked') return state.activeIndex === 0 ? first : both;
  if (state.activeIndex !== 1 || !both) return false;
  if (state.stage === 'review') return state.helped;
  // A guided finish still requires both checked calculations and the report.
  // Keep old multi-round drafts readable; they never require another round.
  if (state.stage === 'success') return !state.helped || state.round! >= C7_MAX_PRACTICE_ROUNDS;
  return true;
}

export function copyC7State(state: C7State): C7State {
  return { stage: state.stage, round: state.round, prediction: state.prediction,
    activeIndex: state.activeIndex, solved: [...state.solved], helped: state.helped,
    hintLevel: state.hintLevel, hintFocus: state.hintFocus, choiceOffset: state.choiceOffset };
}
