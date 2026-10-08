import { calculatePopulationStatistics } from '../lesson-statistics';

export type C8Stage = 'observe' | 'root' | 'checked' | 'locate' | 'located' | 'report' | 'review' | 'success';

export const C8_MAX_PRACTICE_ROUNDS = 1;

export type C8State = Readonly<{
  stage: C8Stage;
  round: number;
  helped: boolean;
  selectedRecord: number | null;
  comparing: boolean;
  choiceOffset: number;
}>;

// Shared with the exercise so validation uses the same records, not a second
// hand-maintained list of correct selections. These are unchanged lesson data.
export const C8_ORIGINAL = [96, 100, 100, 100, 102, 102] as const;
export const C8_PRACTICE: readonly (readonly number[])[] = [
  [97, 97, 100, 100, 100, 106],
  [102, 102, 106, 106, 106, 114],
  [100, 104, 104, 104, 106, 106],
];

const STAGES: readonly C8Stage[] = ['observe', 'root', 'checked', 'locate', 'located', 'report', 'review', 'success'];

export function isC8State(value: unknown): value is C8State {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<C8State>;
  if (!STAGES.includes(state.stage as C8Stage)
    || !Number.isSafeInteger(state.round) || state.round! < 0 || state.round! >= Number.MAX_SAFE_INTEGER
    || typeof state.helped !== 'boolean' || typeof state.comparing !== 'boolean'
    || !Number.isInteger(state.choiceOffset) || state.choiceOffset! < 0 || state.choiceOffset! > 2
    || (state.selectedRecord !== null && !Number.isInteger(state.selectedRecord))) return false;

  if (state.stage === 'observe') {
    return state.round === 0 && !state.helped && !state.comparing && state.selectedRecord === null;
  }
  if (state.comparing && state.stage !== 'locate' && state.stage !== 'located') return false;
  if (state.stage === 'root' || state.stage === 'checked' || state.stage === 'locate' && !state.comparing) {
    return !state.comparing && state.selectedRecord === null;
  }

  // The selection belongs to this attempt's source data, even when the graph
  // shows the comparison or success restores the original report's records.
  const records = state.round === 0 ? C8_ORIGINAL : C8_PRACTICE[(state.round! - 1) % C8_PRACTICE.length];
  const index = state.selectedRecord;
  if (index === null || index === undefined || index < 0 || index >= records.length) return false;
  const { mean, standardDeviation } = calculatePopulationStatistics(records);
  if (Math.abs(records[index] - mean) <= standardDeviation) return false;
  if (state.stage === 'review' && !state.helped) return false;
  // A guided finish is valid only after the additional practice. Keep older
  // later-round drafts compatible without asking for another attempt.
  if (state.stage === 'success' && state.helped && state.round! < C8_MAX_PRACTICE_ROUNDS) return false;
  return true;
}

export function copyC8State(state: C8State): C8State {
  return { stage: state.stage, round: state.round, helped: state.helped,
    selectedRecord: state.selectedRecord, comparing: state.comparing, choiceOffset: state.choiceOffset };
}
