const WELCOME_KEY_PREFIX = 'exploralab.world-welcome.v1.';
type WelcomeStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** A browser preference only: never a lesson result or confirmed progress. */
export function hasSeenWorldWelcome(
  userId: string,
  storage: WelcomeStorage | null = resolveStorage(),
): boolean {
  if (!userId || !storage) return false;
  try {
    return storage.getItem(WELCOME_KEY_PREFIX + encodeURIComponent(userId)) === 'seen';
  } catch {
    return false;
  }
}

export function rememberWorldWelcome(
  userId: string,
  storage: WelcomeStorage | null = resolveStorage(),
): boolean {
  if (!userId || !storage) return false;
  try {
    storage.setItem(WELCOME_KEY_PREFIX + encodeURIComponent(userId), 'seen');
    return true;
  } catch {
    return false;
  }
}

function resolveStorage(): WelcomeStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}
