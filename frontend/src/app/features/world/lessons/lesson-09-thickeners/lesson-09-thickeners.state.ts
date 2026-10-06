export type C9Stage = 'spread' | 'goal' | 'recommend' | 'transfer-intro' | 'transfer' | 'review' | 'success';
export type C9FeedbackKind = 'none' | 'hint' | 'adjust' | 'answer';
export type C9State = Readonly<{ stage: C9Stage; round: number; helped: boolean; answered: boolean; feedbackKind: C9FeedbackKind }>;

export function isC9State(value: unknown): value is C9State {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<C9State>;
  if (!['spread', 'goal', 'recommend', 'transfer-intro', 'transfer', 'review', 'success'].includes(state.stage!)
    || !Number.isSafeInteger(state.round) || state.round! < 0 || state.round! >= Number.MAX_SAFE_INTEGER
    || typeof state.helped !== 'boolean' || typeof state.answered !== 'boolean'
    || !['none', 'hint', 'adjust', 'answer'].includes(state.feedbackKind!)) return false;
  const interactive = ['spread', 'goal', 'recommend', 'transfer'].includes(state.stage!);
  if (!interactive && (state.answered || state.feedbackKind !== 'none')) return false;
  if (state.answered !== (state.feedbackKind === 'answer')) return false;
  if ((state.feedbackKind === 'hint' || state.feedbackKind === 'adjust') && !state.helped) return false;
  if (state.feedbackKind === 'adjust' && state.stage !== 'recommend') return false;
  if (state.stage === 'review') return state.helped;
  if (state.stage === 'success') return !state.helped;
  return true;
}
export function copyC9State(state: C9State): C9State {
  return { stage: state.stage, round: state.round, helped: state.helped, answered: state.answered, feedbackKind: state.feedbackKind };
}
