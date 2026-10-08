import type { WorldSceneKey } from './world-session.types';

// Keep navigational maps open; these destinations have no learning activities yet.
const WORLD_SCENES_IN_PREPARATION = [
  'QuarriesScene',
  'Zone02Scene',
  'Zone03Scene',
  'Zone04Scene',
] as const satisfies readonly WorldSceneKey[];

export function isWorldSceneInPreparation(value: unknown): boolean {
  return typeof value === 'string' && WORLD_SCENES_IN_PREPARATION.some((key) => key === value);
}
