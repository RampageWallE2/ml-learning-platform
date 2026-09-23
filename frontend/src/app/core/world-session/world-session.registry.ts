import {
  WORLD_SESSION_REGISTRY_KEY,
  type WorldSessionSnapshot,
} from './world-session.types';

type SessionRegistry = Readonly<{
  get: (key: string) => unknown;
  remove: (key: string) => unknown;
}>;

export function takeWorldSessionRecovery(
  registry: SessionRegistry,
  sceneKey: string,
): WorldSessionSnapshot | null {
  const snapshot = registry.get(
    WORLD_SESSION_REGISTRY_KEY,
  ) as WorldSessionSnapshot | undefined;

  if (!snapshot || snapshot.sceneKey !== sceneKey) {
    return null;
  }

  registry.remove(WORLD_SESSION_REGISTRY_KEY);
  return snapshot;
}
