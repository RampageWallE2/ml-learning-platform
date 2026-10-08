import { LEARNING_ZONES } from '../lessons/lesson-catalog';

const CLOSURE_KEY_PREFIX = 'exploralab.open-pit-closure.v1.';
const lessonIds = LEARNING_ZONES.find(zone => zone.id === 'zone-01')?.lessons.map(lesson => lesson.lessonId) ?? [];
type ClosureStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Only server-confirmed lessons qualify; pending saves are not passed here. */
export function hasAllOpenPitLessons(completedLessonIds: readonly string[]): boolean {
  const completed = new Set(completedLessonIds);
  return lessonIds.length > 0 && lessonIds.every(id => completed.has(id));
}

/** Browser-only narrative preference, not a learning result or server progress. */
export function hasDeliveredOpenPitReport(userId: string, storage: ClosureStorage | null = resolveStorage()): boolean {
  if (!userId || !storage) return false;
  try { return storage.getItem(CLOSURE_KEY_PREFIX + encodeURIComponent(userId)) === 'delivered'; }
  catch { return false; }
}

export function rememberOpenPitReport(userId: string, storage: ClosureStorage | null = resolveStorage()): boolean {
  if (!userId || !storage) return false;
  try { storage.setItem(CLOSURE_KEY_PREFIX + encodeURIComponent(userId), 'delivered'); return true; }
  catch { return false; }
}

function resolveStorage(): ClosureStorage | null {
  try { return typeof window === 'undefined' ? null : window.localStorage; }
  catch { return null; }
}
