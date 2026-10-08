const INTRO_KEY_PREFIX = 'exploralab.open-pit-intro.v1.';
type IntroStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** A per-account browser preference, not a completed lesson or a learning result. */
export function hasCompletedOpenPitIntro(
  userId: string,
  storage: IntroStorage | null = resolveStorage(),
): boolean {
  if (!userId || !storage) return false;
  try {
    return storage.getItem(INTRO_KEY_PREFIX + encodeURIComponent(userId)) === 'completed';
  } catch {
    return false;
  }
}

export function rememberOpenPitIntro(
  userId: string,
  storage: IntroStorage | null = resolveStorage(),
): boolean {
  if (!userId || !storage) return false;
  try {
    storage.setItem(INTRO_KEY_PREFIX + encodeURIComponent(userId), 'completed');
    return true;
  } catch {
    return false;
  }
}

function resolveStorage(): IntroStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}
