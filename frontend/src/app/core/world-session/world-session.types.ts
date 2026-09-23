export const WORLD_SCENE_KEYS = [
  'HubScene',
  'SurfaceSelectionScene',
  'OpenPitScene',
  'QuarriesScene',
  'Zone02Scene',
  'Zone03Scene',
  'Zone04Scene',
] as const;

export type WorldSceneKey = (typeof WORLD_SCENE_KEYS)[number];

export type WorldSessionSnapshot = Readonly<{
  version: 1;
  sceneKey: WorldSceneKey;
  playerX: number;
  playerY: number;
  savedAt: number;
}>;

export const WORLD_SESSION_REGISTRY_KEY = 'world-session-recovery';

export function isWorldSceneKey(value: unknown): value is WorldSceneKey {
  return typeof value === 'string' && WORLD_SCENE_KEYS.some((key) => key === value);
}
