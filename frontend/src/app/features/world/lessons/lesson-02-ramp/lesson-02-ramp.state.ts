export type C2Stage = 'learn' | 'report' | 'request' | 'records' | 'discovery' | 'practice' | 'reason' | 'review' | 'success';
export type C2State = Readonly<{ stage: C2Stage; redistributed: boolean; round: number; practiceCase: number;
  practiceHelped: boolean; selectedLoad: string | null }>;
export const C2_TURNS = [
  { id: 'A', values: [98, 101, 100, 99, 102] }, { id: 'B', values: [80, 120, 90, 110, 100] },
] as const;
export const C2_PRACTICE_REPORTS = [
  { ids: ['C', 'D'], values: [[88, 89, 90, 91, 92], [80, 85, 90, 95, 100]], different: 'b' },
  { ids: ['E', 'F'], values: [[85, 90, 95, 100, 105], [93, 94, 95, 96, 97]], different: 'a' },
  { ids: ['G', 'H'], values: [[103, 104, 105, 106, 107], [95, 100, 105, 110, 115]], different: 'b' },
] as const;

export function isC2State(value: unknown): value is C2State {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<C2State>;
  if (!['learn', 'report', 'request', 'records', 'discovery', 'practice', 'reason', 'review', 'success'].includes(state.stage!)
    || !Number.isSafeInteger(state.round) || state.round! < 0 || state.round! >= Number.MAX_SAFE_INTEGER
    || typeof state.redistributed !== 'boolean' || typeof state.practiceHelped !== 'boolean'
    || state.practiceCase !== 0 && state.practiceCase !== 1
    || state.selectedLoad !== null && typeof state.selectedLoad !== 'string') return false;
  if (state.stage !== 'learn' && !state.redistributed) return false;
  const practicing = ['practice', 'reason', 'review', 'success'].includes(state.stage!);
  if (!practicing && (state.round !== 0 || state.practiceCase !== 0 || state.practiceHelped)) return false;
  if (state.selectedLoad !== null) {
    if (practicing) {
      const report = C2_PRACTICE_REPORTS[state.round! % C2_PRACTICE_REPORTS.length];
      if (state.practiceCase !== 1 || !report.ids.some((id, index) => report.values[index].some((_, i) => id + (i + 1) === state.selectedLoad))) return false;
    } else if (!['records', 'discovery'].includes(state.stage!) || !C2_TURNS.some(turn => turn.values.some((_, i) => turn.id + (i + 1) === state.selectedLoad))) return false;
  }
  if (['reason', 'review', 'success'].includes(state.stage!) && state.practiceCase !== 1) return false;
  if (state.stage === 'review') return state.practiceHelped;
  if (state.stage === 'success') return !state.practiceHelped;
  return true;
}
export function copyC2State(state: C2State): C2State {
  return { stage: state.stage, redistributed: state.redistributed, round: state.round,
    practiceCase: state.practiceCase, practiceHelped: state.practiceHelped, selectedLoad: state.selectedLoad };
}
