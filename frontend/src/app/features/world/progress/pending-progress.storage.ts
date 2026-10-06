type PendingStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type PendingSnapshot = {
  version: 1;
  userId: string;
  lessonIds: string[];
};

const KEY_PREFIX = 'exploralab.pending-progress.v1.';

export function loadPendingProgress(
  userId: string,
  knownLessonIds: readonly string[],
  storage: PendingStorage | null = resolveStorage(),
): { lessonIds: string[]; available: boolean } {
  if (!storage) return { lessonIds: [], available: false };

  const key = storageKey(userId);
  try {
    const serialized = storage.getItem(key);
    if (!serialized) return { lessonIds: [], available: true };

    const value: unknown = JSON.parse(serialized);
    if (!isSnapshot(value, userId)) {
      storage.removeItem(key);
      return { lessonIds: [], available: true };
    }

    const known = new Set(knownLessonIds);
    return {
      lessonIds: [...new Set(value.lessonIds.filter(id => known.has(id)))],
      available: true,
    };
  } catch {
    // A malformed record must not prevent loading the server's progress.
    try { storage.removeItem(key); } catch { /* Storage may be blocked. */ }
    return { lessonIds: [], available: false };
  }
}

export function savePendingProgress(
  userId: string,
  lessonIds: readonly string[],
  storage: PendingStorage | null = resolveStorage(),
): boolean {
  if (!storage) return false;
  try {
    if (lessonIds.length === 0) {
      storage.removeItem(storageKey(userId));
    } else {
      const snapshot: PendingSnapshot = {
        version: 1, userId, lessonIds: [...new Set(lessonIds)],
      };
      const serialized = JSON.stringify(snapshot);
      storage.setItem(storageKey(userId), serialized);
      return storage.getItem(storageKey(userId)) === serialized;
    }
    return true;
  } catch {
    // The caller must disclose that recovery after reload is unavailable.
    return false;
  }
}

function storageKey(userId: string): string {
  return KEY_PREFIX + encodeURIComponent(userId);
}

function isSnapshot(value: unknown, userId: string): value is PendingSnapshot {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PendingSnapshot>;
  return candidate.version === 1 && candidate.userId === userId
    && Array.isArray(candidate.lessonIds)
    && candidate.lessonIds.every(id => typeof id === 'string');
}

function resolveStorage(): Storage | null {
  try { return globalThis.localStorage; } catch { return null; }
}
