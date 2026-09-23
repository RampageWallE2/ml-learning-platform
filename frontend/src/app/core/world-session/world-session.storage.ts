import {
  isWorldSceneKey,
  type WorldSessionSnapshot,
} from './world-session.types';

const WORLD_SESSION_STORAGE_KEY = 'exploralab.world-session.v1';

export const WORLD_SESSION_MAX_AGE_MS = 6 * 60 * 60 * 1000;

type SessionStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>;

export function loadWorldSession(
  storage: SessionStorage | null = resolveSessionStorage(),
  now = Date.now(),
): WorldSessionSnapshot | null {
  if (!storage) {
    return null;
  }

  try {
    const serialized = storage.getItem(WORLD_SESSION_STORAGE_KEY);

    if (!serialized) {
      return null;
    }

    const value: unknown = JSON.parse(serialized);

    if (!isWorldSessionSnapshot(value, now)) {
      storage.removeItem(WORLD_SESSION_STORAGE_KEY);
      return null;
    }

    return value;
  } catch {
    try {
      storage.removeItem(WORLD_SESSION_STORAGE_KEY);
    } catch {
      // El navegador tampoco permite limpiar el valor defectuoso.
    }

    return null;
  }
}

export function saveWorldSession(
  snapshot: WorldSessionSnapshot,
  storage: SessionStorage | null = resolveSessionStorage(),
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(WORLD_SESSION_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // La recuperación es opcional. El juego debe continuar si el navegador
    // bloquea o no tiene espacio disponible en sessionStorage.
  }
}

export function clearWorldSession(
  storage: SessionStorage | null = resolveSessionStorage(),
): void {
  try {
    storage?.removeItem(WORLD_SESSION_STORAGE_KEY);
  } catch {
    // No hay nada más que hacer si el almacenamiento no está disponible.
  }
}

function isWorldSessionSnapshot(
  value: unknown,
  now: number,
): value is WorldSessionSnapshot {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<WorldSessionSnapshot>;
  const age = now - (candidate.savedAt ?? Number.NaN);

  return candidate.version === 1
    && isWorldSceneKey(candidate.sceneKey)
    && Number.isFinite(candidate.playerX)
    && Number.isFinite(candidate.playerY)
    && Number.isFinite(candidate.savedAt)
    && age >= 0
    && age <= WORLD_SESSION_MAX_AGE_MS;
}

function resolveSessionStorage(): Storage | null {
  try {
    return globalThis.sessionStorage;
  } catch {
    return null;
  }
}
