import type Phaser from 'phaser';
import { OpenPitScene } from './open-pit.scene';
import { gameEvents, GameEvents } from '../../events/game-events';
import type { TiledPoint } from '../../../../../core/tiled/tiled.types';

vi.mock('phaser', async () => {
  const { default: EventEmitter } = await import('eventemitter3');
  return { default: { Scene: class {}, Math: { Vector2: class {} }, Events: { EventEmitter } } };
});

class MinimapTestScene extends OpenPitScene {
  readonly teleports = vi.fn();
  protected override teleportPlayer(point: TiledPoint) { this.teleports(point); }
  build(map: Phaser.Tilemaps.Tilemap) { this.onSceneCreated({ map, layers: new Map(), tilesets: new Map() }); }
  tick() { this.onSceneUpdated(); }
  close() { this.onSceneShutdown(); }
}

describe('Open Pit minimap event bridge', () => {
  it('publishes map coordinates once, limits player updates to five per second and clears on shutdown', () => {
    const scene = new MinimapTestScene();
    const sprite = { x: 100, y: 200, anims: { currentAnim: { key: 'player-postman-3-idle-down' } } };
    const time = { now: 0 };
    Object.assign(scene, { playerController: { sprite }, time });
    const map = { widthInPixels: 3840, heightInPixels: 3840, layers: [],
      getObjectLayer: (name: string) => name === 'SpawnPoints'
        ? { objects: [{ name: 'pit-intro-arrival', x: 800, y: 1408 }] } : null,
    } as unknown as Phaser.Tilemaps.Tilemap;
    const mapped = vi.fn(); const moved = vi.fn();
    gameEvents.on(GameEvents.MINIMAP_MAP_CHANGED, mapped);
    gameEvents.on(GameEvents.MINIMAP_PLAYER_CHANGED, moved);
    try {
      scene.build(map);
      expect(mapped).toHaveBeenCalledOnce();
      expect(moved).toHaveBeenLastCalledWith({ sceneKey: 'OpenPitScene', x: 100, y: 200, heading: 180 });
      sprite.x = 150; time.now = 100; scene.tick(); expect(moved).toHaveBeenCalledTimes(1);
      time.now = 200; scene.tick(); expect(moved).toHaveBeenCalledTimes(2);
      time.now = 400; scene.tick(); expect(moved).toHaveBeenCalledTimes(2);
      sprite.anims.currentAnim.key = 'player-postman-3-idle-left'; time.now = 600; scene.tick();
      expect(moved).toHaveBeenLastCalledWith({ sceneKey: 'OpenPitScene', x: 150, y: 200, heading: 270 });
      expect(mapped).toHaveBeenCalledOnce();
      scene.close(); expect(mapped).toHaveBeenLastCalledWith(null);
      sprite.x = 400; time.now = 800; scene.tick(); expect(moved).toHaveBeenCalledTimes(3);
    } finally {
      scene.close();
      gameEvents.off(GameEvents.MINIMAP_MAP_CHANGED, mapped);
      gameEvents.off(GameEvents.MINIMAP_PLAYER_CHANGED, moved);
    }
  });

  it('handles only the completed Open Pit intro, reads its Tiled arrival point and removes the listener on exit', () => {
    const scene = new MinimapTestScene();
    Object.assign(scene, {
      playerController: { sprite: { x: 100, y: 200, anims: { currentAnim: { key: 'idle-down' } } } },
      time: { now: 0 },
    });
    const map = { widthInPixels: 3840, heightInPixels: 3840, layers: [],
      getObjectLayer: (name: string) => name === 'SpawnPoints'
        ? { objects: [{ name: 'pit-intro-arrival', x: 736, y: 1424 }] } : null,
    } as unknown as Phaser.Tilemaps.Tilemap;
    const previousListeners = gameEvents.listenerCount(GameEvents.DIALOGUE_COMPLETED);
    scene.build(map);
    try {
      gameEvents.emit(GameEvents.DIALOGUE_COMPLETED, { dialogueId: 'intro-01', sceneKey: 'OpenPitScene' });
      gameEvents.emit(GameEvents.DIALOGUE_COMPLETED, { dialogueId: 'open-pit-intro', sceneKey: 'HubScene' });
      expect(scene.teleports).not.toHaveBeenCalled();
      gameEvents.emit(GameEvents.DIALOGUE_COMPLETED, { dialogueId: 'open-pit-intro', sceneKey: 'OpenPitScene' });
      expect(scene.teleports).toHaveBeenCalledExactlyOnceWith({ x: 736, y: 1424 });
      expect(gameEvents.listenerCount(GameEvents.DIALOGUE_COMPLETED)).toBe(previousListeners + 1);
      scene.close();
      expect(gameEvents.listenerCount(GameEvents.DIALOGUE_COMPLETED)).toBe(previousListeners);
      gameEvents.emit(GameEvents.DIALOGUE_COMPLETED, { dialogueId: 'open-pit-intro', sceneKey: 'OpenPitScene' });
      expect(scene.teleports).toHaveBeenCalledOnce();
    } finally { scene.close(); }
  });
});
