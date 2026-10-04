import Phaser from 'phaser';
import { BaseWorldScene } from './base-world.scene';
import { gameEvents, GameEvents } from '../features/world/game/events/game-events';

vi.mock('phaser', async () => {
  const { default: EventEmitter } = await import('eventemitter3');
  return { default: {
    Events: { EventEmitter }, Scene: class {}, Math: { Vector2: class {} },
    Scenes: { Events: { SHUTDOWN: 'shutdown', DESTROY: 'destroy' } },
    Loader: { Events: { PROGRESS: 'progress', COMPLETE: 'complete', FILE_LOAD_ERROR: 'loaderror' } },
    Core: { Events: { POST_RENDER: 'postrender' } },
  } };
});

class TestWorldScene extends BaseWorldScene {
  constructor() { super('OpenPitScene', { mapKey: 'test', mapPath: 'test.tmj', tilesets: [], layers: [] }); }
}

describe('BaseWorldScene — loading lifecycle', () => {
  let scene: TestWorldScene;
  let loading: Phaser.Events.EventEmitter & { progress: number; spritesheet: ReturnType<typeof vi.fn> };
  let lifecycle: Phaser.Events.EventEmitter;
  let renderEvents: Phaser.Events.EventEmitter;
  let received: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scene = new TestWorldScene();
    loading = Object.assign(new Phaser.Events.EventEmitter(), {
      progress: 0, spritesheet: vi.fn(), tilemapTiledJSON: vi.fn(),
    });
    lifecycle = new Phaser.Events.EventEmitter();
    renderEvents = new Phaser.Events.EventEmitter();
    Object.assign(scene, {
      scene: { key: 'OpenPitScene' }, load: loading, events: lifecycle,
      game: { events: renderEvents }, textures: { exists: () => true },
    });
    received = vi.fn();
    gameEvents.on(GameEvents.SCENE_LOADING, received);
  });

  afterEach(() => {
    lifecycle.emit(Phaser.Scenes.Events.SHUTDOWN);
    gameEvents.off(GameEvents.SCENE_LOADING, received);
  });

  it('reports resource progress but does not announce ready just because downloads finished', () => {
    scene.preload();
    expect(received).toHaveBeenLastCalledWith({ sceneKey: 'OpenPitScene', phase: 'loading', progress: 0 });
    loading.emit(Phaser.Loader.Events.PROGRESS, .35);
    expect(received).toHaveBeenLastCalledWith({ sceneKey: 'OpenPitScene', phase: 'loading', progress: .35 });
    loading.emit(Phaser.Loader.Events.COMPLETE);
    expect(received).toHaveBeenLastCalledWith({ sceneKey: 'OpenPitScene', phase: 'preparing', progress: 1 });
    renderEvents.emit(Phaser.Core.Events.POST_RENDER);
    expect(received).not.toHaveBeenCalledWith(expect.objectContaining({ phase: 'ready' }));
  });

  it('keeps a failed load in the error state and does not create or update an incomplete scene', () => {
    scene.preload(); loading.progress = .5;
    loading.emit(Phaser.Loader.Events.FILE_LOAD_ERROR);
    expect(received).toHaveBeenLastCalledWith({ sceneKey: 'OpenPitScene', phase: 'error', progress: .5 });
    const calls = received.mock.calls.length;
    loading.emit(Phaser.Loader.Events.PROGRESS, 1);
    loading.emit(Phaser.Loader.Events.COMPLETE);
    scene.create(); renderEvents.emit(Phaser.Core.Events.POST_RENDER);
    expect(() => scene.update(0, 16)).not.toThrow();
    expect(received).toHaveBeenCalledTimes(calls);
    expect(scene.getSessionSnapshot()).toBeNull();
  });

  it('cleans up loader and render listeners on shutdown and can load again', () => {
    scene.preload();
    expect(loading.listenerCount(Phaser.Loader.Events.PROGRESS)).toBe(1);
    lifecycle.emit(Phaser.Scenes.Events.SHUTDOWN);
    expect(loading.listenerCount(Phaser.Loader.Events.PROGRESS)).toBe(0);
    expect(loading.listenerCount(Phaser.Loader.Events.FILE_LOAD_ERROR)).toBe(0);
    expect(renderEvents.listenerCount(Phaser.Core.Events.POST_RENDER)).toBe(0);
    scene.preload();
    expect(loading.listenerCount(Phaser.Loader.Events.PROGRESS)).toBe(1);
    expect(lifecycle.listenerCount(Phaser.Scenes.Events.SHUTDOWN)).toBe(1);
  });

  it('also cleans up when the game is destroyed during loading', () => {
    scene.preload(); lifecycle.emit(Phaser.Scenes.Events.DESTROY);
    expect(loading.listenerCount(Phaser.Loader.Events.PROGRESS)).toBe(0);
    expect(loading.listenerCount(Phaser.Loader.Events.COMPLETE)).toBe(0);
    expect(lifecycle.listenerCount(Phaser.Scenes.Events.SHUTDOWN)).toBe(0);
  });
});
