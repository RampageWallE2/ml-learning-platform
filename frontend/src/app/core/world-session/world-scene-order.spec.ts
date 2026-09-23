import { WORLD_SCENE_KEYS } from './world-session.types';
import { orderWorldSceneKeys } from './world-scene-order';

describe('orderWorldSceneKeys', () => {
  it('starts in the hub by default', () => {
    expect(orderWorldSceneKeys()[0]).toBe('HubScene');
  });

  it('places the restored scene first', () => {
    expect(orderWorldSceneKeys('OpenPitScene')[0]).toBe('OpenPitScene');
  });

  it('keeps every world scene exactly once', () => {
    const orderedScenes = orderWorldSceneKeys('OpenPitScene');

    expect(orderedScenes).toHaveLength(WORLD_SCENE_KEYS.length);
    expect(new Set(orderedScenes).size).toBe(WORLD_SCENE_KEYS.length);
  });
});
