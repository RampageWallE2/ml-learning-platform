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
  it.each([false, true])('enters the pit on a confirmed normal visit, but preserves a restored position (%s)', restored => {
    const scene = new MinimapTestScene(); let locked = true;
    Object.assign(scene, {
      restoredPositionApplied: restored,
      playerController: { isLocked: () => locked, sprite: { x: 100, y: 200, anims: {} } },
      time: { now: 0 },
    });
    const map = { widthInPixels: 3840, heightInPixels: 3840, layers: [],
      getObjectLayer: (name: string) => name === 'SpawnPoints'
        ? { objects: [{ name: 'pit-intro-arrival', x: 736, y: 1424 }] } : null,
    } as unknown as Phaser.Tilemaps.Tilemap;
    scene.build(map);
    try {
      gameEvents.emit(GameEvents.LESSON_PROGRESS_CHANGED, { currentLessonId: 'lesson-01', completedLessonIds: [], openPitIntroCompleted: null });
      scene.tick(); expect(scene.teleports).not.toHaveBeenCalled();
      gameEvents.emit(GameEvents.LESSON_PROGRESS_CHANGED, { currentLessonId: 'lesson-01', completedLessonIds: [], openPitIntroCompleted: true });
      scene.tick(); expect(scene.teleports).not.toHaveBeenCalled();
      locked = false; scene.tick(); scene.tick();
      if (restored) expect(scene.teleports).not.toHaveBeenCalled();
      else expect(scene.teleports).toHaveBeenCalledExactlyOnceWith({ x: 736, y: 1424 });
    } finally { scene.close(); }
  });

  it('does not auto-enter with a pending intro or after leaving the scene', () => {
    const scene = new MinimapTestScene();
    Object.assign(scene, {
      playerController: { isLocked: () => false, sprite: { x: 100, y: 200, anims: {} } },
      time: { now: 0 },
    });
    const map = { widthInPixels: 3840, heightInPixels: 3840, layers: [],
      getObjectLayer: (name: string) => name === 'SpawnPoints'
        ? { objects: [{ name: 'pit-intro-arrival', x: 736, y: 1424 }] } : null,
    } as unknown as Phaser.Tilemaps.Tilemap;
    const count = gameEvents.listenerCount(GameEvents.LESSON_PROGRESS_CHANGED);
    scene.build(map);
    gameEvents.emit(GameEvents.LESSON_PROGRESS_CHANGED, { currentLessonId: 'lesson-01', completedLessonIds: [], openPitIntroCompleted: false });
    scene.tick(); expect(scene.teleports).not.toHaveBeenCalled();
    scene.close(); expect(gameEvents.listenerCount(GameEvents.LESSON_PROGRESS_CHANGED)).toBe(count);
    gameEvents.emit(GameEvents.LESSON_PROGRESS_CHANGED, { currentLessonId: 'lesson-01', completedLessonIds: [], openPitIntroCompleted: true });
    scene.tick(); expect(scene.teleports).not.toHaveBeenCalled();
  });

  it('cancels an entry queued during the fade if a fresh server read resets the intro', () => {
    const scene = new MinimapTestScene(); let locked = true;
    Object.assign(scene, {
      playerController: { isLocked: () => locked, sprite: { x: 100, y: 200, anims: {} } }, time: { now: 0 },
    });
    const map = { widthInPixels: 3840, heightInPixels: 3840, layers: [],
      getObjectLayer: (name: string) => name === 'SpawnPoints'
        ? { objects: [{ name: 'pit-intro-arrival', x: 736, y: 1424 }] } : null,
    } as unknown as Phaser.Tilemaps.Tilemap;
    scene.build(map);
    try {
      gameEvents.emit(GameEvents.LESSON_PROGRESS_CHANGED, { currentLessonId: 'lesson-01', completedLessonIds: [], openPitIntroCompleted: true });
      scene.tick();
      gameEvents.emit(GameEvents.LESSON_PROGRESS_CHANGED, { currentLessonId: 'lesson-01', completedLessonIds: [], openPitIntroCompleted: false });
      locked = false; scene.tick(); expect(scene.teleports).not.toHaveBeenCalled();
    } finally { scene.close(); }
  });

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
      playerController: { isLocked: () => false, sprite: { x: 100, y: 200, anims: { currentAnim: { key: 'idle-down' } } } },
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
      scene.tick();
      expect(scene.teleports).toHaveBeenCalledExactlyOnceWith({ x: 736, y: 1424 });
      expect(gameEvents.listenerCount(GameEvents.DIALOGUE_COMPLETED)).toBe(previousListeners + 1);
      scene.close();
      expect(gameEvents.listenerCount(GameEvents.DIALOGUE_COMPLETED)).toBe(previousListeners);
      gameEvents.emit(GameEvents.DIALOGUE_COMPLETED, { dialogueId: 'open-pit-intro', sceneKey: 'OpenPitScene' });
      expect(scene.teleports).toHaveBeenCalledOnce();
    } finally { scene.close(); }
  });
});
