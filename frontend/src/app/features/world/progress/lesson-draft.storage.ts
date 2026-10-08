import { C1State, copyC1State, isC1State } from '../lessons/lesson-01-loading/lesson-01-loading.state';
import { C2State, copyC2State, isC2State } from '../lessons/lesson-02-ramp/lesson-02-ramp.state';
import { C3State, copyC3State, isC3State } from '../lessons/lesson-03-haulage/lesson-03-haulage.state';
import { C4State, copyC4State, isC4State, readC4State } from '../lessons/lesson-04-workshop/lesson-04-workshop.state';
import { C5State, copyC5State, isC5State } from '../lessons/lesson-05-crushing/lesson-05-crushing.state';
import { C6State, copyC6State, isC6State } from '../lessons/lesson-06-sag/lesson-06-sag.state';
import { C7State, copyC7State, isC7State } from '../lessons/lesson-07-balls/lesson-07-balls.state';
import { C8State, copyC8State, isC8State } from '../lessons/lesson-08-flotation/lesson-08-flotation.state';
import { C9State, copyC9State, isC9State } from '../lessons/lesson-09-thickeners/lesson-09-thickeners.state';

type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type DraftExercises = {
  'lesson-01': C1State; 'lesson-02': C2State; 'lesson-03': C3State;
  'lesson-04': C4State; 'lesson-05': C5State; 'lesson-06': C6State;
  'lesson-07': C7State; 'lesson-08': C8State; 'lesson-09': C9State;
};
export type DraftLessonId = keyof DraftExercises;
export type LessonExerciseState = DraftExercises[DraftLessonId];
const validators: { [Id in DraftLessonId]: (value: unknown) => value is DraftExercises[Id] } = {
  'lesson-01': isC1State, 'lesson-02': isC2State, 'lesson-03': isC3State,
  'lesson-04': isC4State, 'lesson-05': isC5State, 'lesson-06': isC6State,
  'lesson-07': isC7State, 'lesson-08': isC8State, 'lesson-09': isC9State,
};
const copiers: { [Id in DraftLessonId]: (value: DraftExercises[Id]) => DraftExercises[Id] } = {
  'lesson-01': copyC1State, 'lesson-02': copyC2State, 'lesson-03': copyC3State,
  'lesson-04': copyC4State, 'lesson-05': copyC5State, 'lesson-06': copyC6State,
  'lesson-07': copyC7State, 'lesson-08': copyC8State, 'lesson-09': copyC9State,
};
export function isLessonExerciseState<Id extends DraftLessonId>(id: Id, value: unknown): value is DraftExercises[Id] {
  return isDraftLessonId(id) && validators[id](value);
}
export type DraftContentFor<Id extends DraftLessonId> = Readonly<{ step: 0 | 1 | 2; exercise: DraftExercises[Id] | null }>;
export type DraftFor<Id extends DraftLessonId> = DraftContentFor<Id> & Readonly<{
  version: 1;
  lessonVersion: 1;
  userId: string;
  lessonId: Id;
}>;
export type C6DraftContent = DraftContentFor<'lesson-06'>;
export type C6Draft = DraftFor<'lesson-06'>;
export type C7DraftContent = DraftContentFor<'lesson-07'>;
export type C7Draft = DraftFor<'lesson-07'>;
export type C8DraftContent = DraftContentFor<'lesson-08'>;
export type C8Draft = DraftFor<'lesson-08'>;
export type LessonDraft = { [Id in DraftLessonId]: DraftFor<Id> }[DraftLessonId];
export type DraftReadResult<Draft = C6Draft> = Readonly<{ draft: Draft | null; available: boolean; discarded: boolean }>;

export function isDraftLessonId(lessonId: string): lessonId is DraftLessonId {
  return Object.hasOwn(validators, lessonId);
}

// Keep the C6 API, storage key and version compatible with existing drafts.
export function loadC6Draft(userId: string, storage: DraftStorage | null = resolveStorage()): DraftReadResult {
  return loadLessonDraft(userId, 'lesson-06', storage);
}
export function saveC6Draft(userId: string, content: C6DraftContent, storage: DraftStorage | null = resolveStorage()): boolean {
  return saveLessonDraft(userId, 'lesson-06', content, storage);
}
export function clearC6Draft(userId: string, storage: DraftStorage | null = resolveStorage()): boolean {
  return clearLessonDraft(userId, 'lesson-06', storage);
}

export function loadLessonDraft<Id extends DraftLessonId>(
  userId: string, lessonId: Id, storage: DraftStorage | null = resolveStorage(),
): DraftReadResult<DraftFor<Id>> {
  if (!storage) return { draft: null, available: false, discarded: false };
  try {
    const raw = storage.getItem(key(userId, lessonId));
    if (!raw) return { draft: null, available: true, discarded: false };
    let value: unknown;
    try { value = JSON.parse(raw); } catch { value = null; }
    if (lessonId === 'lesson-04' && value && typeof value === 'object') {
      const draft = value as Record<string, unknown>;
      if (draft['exercise'] !== null) {
        const exercise = readC4State(draft['exercise']);
        value = exercise ? { ...draft, exercise } : null;
      }
    }
    if (!isDraft(value, userId, lessonId)) {
      storage.removeItem(key(userId, lessonId));
      return { draft: null, available: true, discarded: true };
    }
    return { draft: makeDraft(userId, lessonId, value), available: true, discarded: false };
  } catch {
    return { draft: null, available: false, discarded: false };
  }
}

export function saveLessonDraft<Id extends DraftLessonId>(
  userId: string, lessonId: Id, content: DraftContentFor<Id>, storage: DraftStorage | null = resolveStorage(),
): boolean {
  if (!storage || !isContent(content, lessonId)) return false;
  try {
    const serialized = JSON.stringify(makeDraft(userId, lessonId, content));
    storage.setItem(key(userId, lessonId), serialized);
    return storage.getItem(key(userId, lessonId)) === serialized;
  } catch { return false; }
}

export function clearLessonDraft(userId: string, lessonId: DraftLessonId, storage: DraftStorage | null = resolveStorage()): boolean {
  if (!storage) return false;
  try {
    storage.removeItem(key(userId, lessonId));
    return storage.getItem(key(userId, lessonId)) === null;
  } catch { return false; }
}

function isContent<Id extends DraftLessonId>(value: unknown, lessonId: Id): value is DraftContentFor<Id> {
  if (!isDraftLessonId(lessonId) || !value || typeof value !== 'object') return false;
  const draft = value as Partial<DraftContentFor<Id>>;
  if (draft.step === 0) return draft.exercise === null;
  if (draft.step === 1 && draft.exercise === null) return true;
  const validState = isLessonExerciseState(lessonId, draft.exercise);
  return validState && (draft.step === 1 || draft.step === 2 && draft.exercise?.stage === 'success');
}

function isDraft<Id extends DraftLessonId>(value: unknown, userId: string, lessonId: Id): value is DraftFor<Id> {
  if (!isContent(value, lessonId)) return false;
  const draft = value as Partial<DraftFor<Id>>;
  return draft.version === 1 && draft.lessonVersion === 1 && draft.userId === userId && draft.lessonId === lessonId;
}

function makeDraft<Id extends DraftLessonId>(userId: string, lessonId: Id, content: DraftContentFor<Id>): DraftFor<Id> {
  const exercise = content.exercise === null ? null : copiers[lessonId](content.exercise);
  return { version: 1, lessonVersion: 1, userId, lessonId, step: content.step,
    exercise };
}

function key(userId: string, lessonId: DraftLessonId): string {
  return 'exploralab.lesson-draft.v1.' + encodeURIComponent(userId) + '.' + lessonId;
}
function resolveStorage(): Storage | null { try { return globalThis.localStorage; } catch { return null; } }
