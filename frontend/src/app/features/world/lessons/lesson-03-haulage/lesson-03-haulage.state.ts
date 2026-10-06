export type C3Stage = 'extremes' | 'measure' | 'discovery' | 'practice-extremes' | 'practice-range' | 'practice-meaning' | 'review' | 'success';
export type C3TripRecord = Readonly<{ id: string; time: number }>;
export type C3State = Readonly<{ stage: C3Stage; selectedMinId: string | null; selectedMaxId: string | null;
  round: number; practiceHelped: boolean }>;
export const C3_TRIPS: readonly C3TripRecord[] = [
  { id: 'trip-1', time: 11 }, { id: 'trip-2', time: 12 },
  { id: 'trip-3', time: 11 }, { id: 'trip-4', time: 18 }, { id: 'trip-5', time: 12 },
];
export const C3_PRACTICE_SETS: readonly (readonly C3TripRecord[])[] = [
  [14, 10, 12, 15, 11], [13, 9, 15, 11, 12], [12, 8, 16, 11, 13],
].map((times, round) => times.map((time, index) => ({ id: 'practice-' + round + '-' + (index + 1), time })));

export function isC3State(value: unknown): value is C3State {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<C3State>;
  if (!['extremes', 'measure', 'discovery', 'practice-extremes', 'practice-range', 'practice-meaning', 'review', 'success'].includes(state.stage!)
    || !Number.isSafeInteger(state.round) || state.round! < 0 || state.round! >= Number.MAX_SAFE_INTEGER
    || typeof state.practiceHelped !== 'boolean') return false;
  const original = ['extremes', 'measure', 'discovery'].includes(state.stage!);
  if (original && (state.round !== 0 || state.practiceHelped)) return false;
  // Success displays the original report, but these IDs belong to the completed practice.
  const records = original ? C3_TRIPS : C3_PRACTICE_SETS[state.round! % C3_PRACTICE_SETS.length];
  const min = records.find(record => record.id === state.selectedMinId);
  const max = records.find(record => record.id === state.selectedMaxId);
  if (state.selectedMinId !== null && (!min || min.time !== Math.min(...records.map(record => record.time)))) return false;
  if (state.selectedMaxId !== null && (!max || !min || max.time !== Math.max(...records.map(record => record.time)))) return false;
  if (state.stage === 'extremes') return true;
  if (state.stage === 'practice-extremes') return state.selectedMaxId === null;
  if (!min || !max) return false;
  if (state.stage === 'review') return state.practiceHelped;
  if (state.stage === 'success') return !state.practiceHelped;
  return true;
}
export function copyC3State(state: C3State): C3State {
  return { stage: state.stage, selectedMinId: state.selectedMinId, selectedMaxId: state.selectedMaxId,
    round: state.round, practiceHelped: state.practiceHelped };
}
