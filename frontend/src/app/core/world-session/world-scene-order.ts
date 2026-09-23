import {
  WORLD_SCENE_KEYS,
  type WorldSceneKey,
} from './world-session.types';

export function orderWorldSceneKeys(
  initialScene: WorldSceneKey = 'HubScene',
): readonly WorldSceneKey[] {
  return [
    initialScene,
    ...WORLD_SCENE_KEYS.filter((key) => key !== initialScene),
  ];
}
