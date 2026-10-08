import Phaser from 'phaser';
import { BaseWorldScene } from './base-world.scene';
import { AmbientAudioManager } from './audio/ambient-audio.manager';
import { gameEvents, GameEvents, type SceneLoadingSnapshot } from '../features/world/game/events/game-events';
import type { TiledObjectLike, TiledPoint } from './tiled/tiled.types';
import { WORLD_SCENE_KEYS, type WorldSceneKey } from './world-session/world-session.types';

vi.mock('phaser', async () => {
  const { default: EventEmitter } = await import('eventemitter3');
  return { default: {
    Events: { EventEmitter }, Scene: class {}, Math: {
      Vector2: class {},
      Clamp: (value: number, min: number, max: number) => Math.min(Math.max(value, min), max),
      Linear: (start: number, end: number, amount: number) => start + (end - start) * amount,
    },
    Scenes: { Events: { SHUTDOWN: 'shutdown', DESTROY: 'destroy' } },
    Loader: { Events: { PROGRESS: 'progress', COMPLETE: 'complete', FILE_LOAD_ERROR: 'loaderror' } },
    Core: { Events: { POST_RENDER: 'postrender' } },
  } };
});

class TestWorldScene extends BaseWorldScene {
  constructor(ambientSounds = false) {
    super('OpenPitScene', { mapKey: 'test', mapPath: 'test.tmj', tilesets: [], layers: [],
      ambientSounds: ambientSounds ? [{ id: 'ambience', audioPath: 'ambient.ogg' }] : [],
    });
  }
  moveWithinMap(point: TiledPoint) { this.teleportPlayer(point); }
}

describe('BaseWorldScene — loading lifecycle', () => {
  let scene: TestWorldScene;
  let loading: Phaser.Events.EventEmitter & { progress: number; spritesheet: ReturnType<typeof vi.fn> };
  let lifecycle: Phaser.Events.EventEmitter;
  let renderEvents: Phaser.Events.EventEmitter;
  let received: ReturnType<typeof vi.fn<(snapshot: SceneLoadingSnapshot) => void>>;

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
      cache: { tilemap: { exists: () => false }, audio: { exists: () => false } },
    });
    received = vi.fn();
    gameEvents.on(GameEvents.SCENE_LOADING, received);
  });

  afterEach(() => {
    lifecycle.emit(Phaser.Scenes.Events.SHUTDOWN);
    gameEvents.off(GameEvents.SCENE_LOADING, received);
    vi.restoreAllMocks();
  });

  function createAmbientScene(objects: TiledObjectLike[] | null, initiallyCached = false) {
    scene = new TestWorldScene(true);
    let cached = initiallyCached;
    const layer = objects === null ? null : { objects };
    const map = { getObjectLayer: () => layer } as unknown as Phaser.Tilemaps.Tilemap;
    const sound = {
      isPlaying: false, volume: 0, mute: true,
      play: vi.fn(), setMute: vi.fn(), setVolume: vi.fn(), stop: vi.fn(), destroy: vi.fn(),
    };
    const addSound = vi.fn(() => sound);
    const player = {
      sprite: { x: 100, y: 100 }, lock: vi.fn(), unlock: vi.fn(),
      update: vi.fn(), isLocked: vi.fn(() => false),
    };
    Object.assign(scene, {
      scene: { key: 'OpenPitScene' }, events: lifecycle,
      load: Object.assign(loading, { audio: vi.fn(), start: vi.fn() }),
      game: { events: renderEvents }, textures: { exists: () => true },
      cache: { tilemap: { exists: () => false }, audio: { exists: () => cached } },
      sound: { add: addSound, locked: false },
      playerController: player,
      inputController: {
        getDirection: vi.fn(), consumeInteract: vi.fn(() => true),
        reset: vi.fn(), setInteractAvailable: vi.fn(), destroy: vi.fn(),
      },
      interactionManager: { update: vi.fn(() => true), destroy: vi.fn() },
      sceneTransition: { isPlaying: vi.fn(() => false), destroy: vi.fn() },
    });
    scene.preload();
    // Simulate a built map; the ambient manager and loader callbacks remain real.
    Reflect.set(scene, 'ambientAudioManager', initiallyCached ? null
      : new AmbientAudioManager(scene, map, player.sprite as Phaser.Physics.Arcade.Sprite));
    if (initiallyCached) Reflect.get(scene, 'initializeAmbientAudio').call(scene, map);
    Object.assign(scene, { sceneCreated: true, loadedMap: map });
    renderEvents.once(Phaser.Core.Events.POST_RENDER, Reflect.get(scene, 'handleSceneRendered'));
    renderEvents.emit(Phaser.Core.Events.POST_RENDER);
    return { sound, addSound, player, completeDownload: () => {
      cached = true;
      loading.emit(Phaser.Loader.Events.COMPLETE);
    } };
  }

  const ambientPoint = (volume: number | string = 0.4): TiledObjectLike => ({
    name: 'ambience', x: 100, y: 100,
    properties: [{ name: 'soundId', value: 'ambience' }, { name: 'volume', value: volume }],
  });

  it.each([
    ['missing layer', null, 'No se encontró la capa'],
    ['missing sound point', [], 'No se encontró el punto de sonido'],
    ['invalid volume', [ambientPoint('loud')], 'debe ser un número finito'],
  ] as const)('keeps a ready map playable after background audio has a %s', (_, objects, message) => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { player, completeDownload } = createAmbientScene(objects === null ? null : [...objects]);
    expect(received).toHaveBeenLastCalledWith({ sceneKey: 'OpenPitScene', phase: 'ready', progress: 1 });
    const callsBeforeAudio = received.mock.calls.length;
    const locksBeforeAudio = player.lock.mock.calls.length;

    expect(completeDownload).not.toThrow();
    expect(warning).toHaveBeenCalledOnce();
    const [context, cause] = warning.mock.calls[0];
    expect(context).toContain('OpenPitScene');
    expect(cause).toBeInstanceOf(Error);
    expect((cause as Error).message).toContain(message);
    expect(received).toHaveBeenCalledTimes(callsBeforeAudio);
    expect(scene.getSessionSnapshot()?.sceneKey).toBe('OpenPitScene');
    expect(() => scene.update(0, 16)).not.toThrow();
    expect(player.update).toHaveBeenCalledOnce();
    expect(Reflect.get(scene, 'interactionManager').update).toHaveBeenCalledWith(true, false);
    expect(Reflect.get(scene, 'inputController').setInteractAvailable).toHaveBeenCalledWith(true);
    expect(player.lock).toHaveBeenCalledTimes(locksBeforeAudio);
    lifecycle.emit(Phaser.Scenes.Events.SHUTDOWN);
    expect(loading.listenerCount(Phaser.Loader.Events.COMPLETE)).toBe(0);
  });

  it('also treats invalid cached audio as optional in the shared initializer', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { player } = createAmbientScene([ambientPoint(2)], true);
    expect(received).toHaveBeenLastCalledWith({ sceneKey: 'OpenPitScene', phase: 'ready', progress: 1 });
    expect(received).not.toHaveBeenCalledWith(expect.objectContaining({ phase: 'error' }));
    expect(warning).toHaveBeenCalledOnce();
    expect(() => scene.update(0, 16)).not.toThrow();
    expect(player.update).toHaveBeenCalledOnce();
  });

  it('initializes valid downloaded audio and destroys it when the scene stops', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { sound, addSound, completeDownload } = createAmbientScene([ambientPoint()]);
    expect(addSound).not.toHaveBeenCalled();
    completeDownload();
    expect(addSound).toHaveBeenCalledOnce();
    expect(() => scene.update(0, 16)).not.toThrow();
    expect(sound.play).toHaveBeenCalledOnce();
    expect(warning).not.toHaveBeenCalled();
    lifecycle.emit(Phaser.Scenes.Events.SHUTDOWN);
    expect(sound.destroy).toHaveBeenCalledOnce();
  });

  it('ignores background audio completion after the scene stops', () => {
    const { addSound, completeDownload } = createAmbientScene([ambientPoint()]);
    lifecycle.emit(Phaser.Scenes.Events.SHUTDOWN);
    expect(completeDownload).not.toThrow();
    expect(addSound).not.toHaveBeenCalled();
    expect(() => scene.update(0, 16)).not.toThrow();
  });

  it('loads the complete postman frames even if the old player texture is already cached', () => {
    Object.assign(scene, { textures: { exists: (key: string) => key === 'player' } });
    scene.preload();
    expect(loading.spritesheet).toHaveBeenCalledWith(
      'player-postman-3', 'assets/game/characters/character_postman_3.png',
      { frameWidth: 32, frameHeight: 64, endFrame: 137 },
    );
  });

  it('reuses the postman texture when another world scene has already loaded it', () => {
    scene.preload();
    expect(loading.spritesheet).not.toHaveBeenCalled();
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

  it('logs the original construction error with its scene without changing the failure state', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const cause = new Error('Missing tileset');
    const failure = new Error('The map could not be constructed', { cause });
    const build = vi.fn(() => { throw failure; });
    const player = { lock: vi.fn(), unlock: vi.fn() };
    const input = { reset: vi.fn(), setInteractAvailable: vi.fn(), destroy: vi.fn() };
    Object.assign(scene, { make: { tilemap: build }, playerController: player, inputController: input });
    scene.preload();
    loading.progress = .75;

    expect(() => scene.create()).not.toThrow();
    expect(warning).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('OpenPitScene'), failure);
    expect(warning.mock.calls[0][1].cause).toBe(cause);
    expect(warning.mock.calls[0][1].stack).toBe(failure.stack);
    expect(received).toHaveBeenLastCalledWith({ sceneKey: 'OpenPitScene', phase: 'error', progress: .75 });
    expect(player.lock).toHaveBeenCalledOnce();
    expect(player.unlock).not.toHaveBeenCalled();
    expect(input.reset).toHaveBeenCalledOnce();
    expect(input.setInteractAvailable).toHaveBeenCalledWith(false);
    expect(() => scene.update(0, 16)).not.toThrow();
    expect(scene.getSessionSnapshot()).toBeNull();

    loading.emit(Phaser.Loader.Events.PROGRESS, 1);
    loading.emit(Phaser.Loader.Events.COMPLETE);
    renderEvents.emit(Phaser.Core.Events.POST_RENDER);
    scene.create();
    expect(build).toHaveBeenCalledOnce();
    expect(warning).toHaveBeenCalledOnce();
    expect(received).not.toHaveBeenCalledWith(expect.objectContaining({ phase: 'ready' }));
  });

  it.each([
    ['text', 'Third-party construction failure'],
    ['an object', { reason: 'Third-party construction failure' }],
  ] as const)('preserves a thrown value containing %s without assuming it is an Error', (_, failure) => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    Object.assign(scene, { make: { tilemap: () => { throw failure; } } });
    scene.preload();
    expect(() => scene.create()).not.toThrow();
    expect(warning).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('OpenPitScene'), failure);
    expect(warning.mock.calls[0][1]).toBe(failure);
    expect(received).toHaveBeenLastCalledWith({ sceneKey: 'OpenPitScene', phase: 'error', progress: 0 });
  });

  it('does not queue optional audio while loading essential map resources', () => {
    scene = new TestWorldScene(true);
    const audio = vi.fn();
    Object.assign(scene, {
      scene: { key: 'OpenPitScene' }, load: Object.assign(loading, { audio }), events: lifecycle,
      game: { events: renderEvents },
      textures: { exists: () => true }, cache: { tilemap: { exists: () => false } },
    });
    scene.preload();
    expect(audio).not.toHaveBeenCalled();
    loading.emit(Phaser.Loader.Events.FILE_LOAD_ERROR, { type: 'audio', key: 'ambience' });
    expect(received).not.toHaveBeenCalledWith(expect.objectContaining({ phase: 'error' }));
  });

  it('does not replace a ready map with progress from background downloads', () => {
    scene.preload();
    Object.assign(scene, { sceneCreated: true });
    const calls = received.mock.calls.length;
    loading.emit(Phaser.Loader.Events.PROGRESS, .1);
    loading.emit(Phaser.Loader.Events.COMPLETE);
    expect(received).toHaveBeenCalledTimes(calls);
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

  const cleanupResources = ['scene hook', 'input controls', 'interactions', 'ambient audio', 'scene transition'] as const;

  it.each(cleanupResources)('continues shutdown after %s fails without leaving lifecycle listeners', failedResource => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const failure = new Error('Resource cleanup failed');
    const attempted: string[] = [];
    const cleanups = cleanupResources.map(resource => vi.fn(() => {
      attempted.push(resource);
      if (resource === failedResource) throw failure;
    }));
    scene.preload();
    Object.assign(scene, {
      sceneCreated: true, loadedMap: {},
      onSceneShutdown: cleanups[0],
      inputController: { destroy: cleanups[1] },
      interactionManager: { destroy: cleanups[2] },
      ambientAudioManager: { destroy: cleanups[3] },
      sceneTransition: { destroy: cleanups[4] },
    });
    const lockListenersBefore = gameEvents.listenerCount(GameEvents.LOCK_PLAYER);
    const unlockListenersBefore = gameEvents.listenerCount(GameEvents.UNLOCK_PLAYER);
    gameEvents.on(GameEvents.LOCK_PLAYER, Reflect.get(scene, 'lockForInteraction'));
    gameEvents.on(GameEvents.UNLOCK_PLAYER, Reflect.get(scene, 'unlockFromInteraction'));
    renderEvents.once(Phaser.Core.Events.POST_RENDER, Reflect.get(scene, 'handleSceneRendered'));

    expect(() => lifecycle.emit(Phaser.Scenes.Events.SHUTDOWN)).not.toThrow();
    expect(attempted).toEqual(cleanupResources);
    for (const cleanup of cleanups) expect(cleanup).toHaveBeenCalledOnce();
    expect(warning).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining(failedResource), failure,
    );
    expect(warning.mock.calls[0][0]).toContain('OpenPitScene');
    expect(scene.getSessionSnapshot()).toBeNull();
    expect(Reflect.get(scene, 'loadedMap')).toBeNull();
    for (const event of [Phaser.Loader.Events.PROGRESS, Phaser.Loader.Events.COMPLETE, Phaser.Loader.Events.FILE_LOAD_ERROR]) {
      expect(loading.listenerCount(event)).toBe(0);
    }
    expect(renderEvents.listenerCount(Phaser.Core.Events.POST_RENDER)).toBe(0);
    expect(lifecycle.listenerCount(Phaser.Scenes.Events.SHUTDOWN)).toBe(0);
    expect(lifecycle.listenerCount(Phaser.Scenes.Events.DESTROY)).toBe(0);
    expect(gameEvents.listenerCount(GameEvents.LOCK_PLAYER)).toBe(lockListenersBefore);
    expect(gameEvents.listenerCount(GameEvents.UNLOCK_PLAYER)).toBe(unlockListenersBefore);

    lifecycle.emit(Phaser.Scenes.Events.SHUTDOWN);
    lifecycle.emit(Phaser.Scenes.Events.DESTROY);
    for (const cleanup of cleanups) expect(cleanup).toHaveBeenCalledOnce();
    expect(warning).toHaveBeenCalledOnce();
  });

  it('records simultaneous cleanup failures and still attempts the final transition', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const failures = [new Error('Hook failed'), 'Input failed', { reason: 'Audio failed' }];
    const cleanups = cleanupResources.map((_, index) => vi.fn(() => {
      if (index === 0) throw failures[0];
      if (index === 1) throw failures[1];
      if (index === 3) throw failures[2];
    }));
    scene.preload();
    Object.assign(scene, {
      onSceneShutdown: cleanups[0],
      inputController: { destroy: cleanups[1] },
      interactionManager: { destroy: cleanups[2] },
      ambientAudioManager: { destroy: cleanups[3] },
      sceneTransition: { destroy: cleanups[4] },
    });
    expect(() => lifecycle.emit(Phaser.Scenes.Events.DESTROY)).not.toThrow();
    for (const cleanup of cleanups) expect(cleanup).toHaveBeenCalledOnce();
    expect(warning).toHaveBeenCalledTimes(3);
    for (const [index, failure] of failures.entries()) {
      expect(warning.mock.calls[index][1]).toBe(failure);
      expect(warning.mock.calls[index][0]).toContain('OpenPitScene');
    }
    expect(lifecycle.listenerCount(Phaser.Scenes.Events.SHUTDOWN)).toBe(0);
  });

  it('uses the real audio manager to finish scene teardown after a sound destructor fails', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { sound } = createAmbientScene([ambientPoint()], true);
    const transition = Reflect.get(scene, 'sceneTransition');
    const input = Reflect.get(scene, 'inputController');
    const interactions = Reflect.get(scene, 'interactionManager');
    const failure = new Error('Native sound destructor failed');
    sound.destroy.mockImplementation(() => { throw failure; });

    expect(() => lifecycle.emit(Phaser.Scenes.Events.SHUTDOWN)).not.toThrow();
    expect(sound.destroy).toHaveBeenCalledOnce();
    expect(input.destroy).toHaveBeenCalledOnce();
    expect(interactions.destroy).toHaveBeenCalledOnce();
    expect(transition.destroy).toHaveBeenCalledOnce();
    expect(warning).toHaveBeenCalledExactlyOnceWith('Failed to destroy ambient audio.', failure);
    expect(() => scene.update(0, 16)).not.toThrow();
    Reflect.get(scene, 'ambientAudioManager').destroy();
    expect(sound.destroy).toHaveBeenCalledOnce();
    expect(warning).toHaveBeenCalledOnce();
  });

  it('does not let an entrance animation unlock a player while help is still open', () => {
    const player = { lock: vi.fn(), unlock: vi.fn() };
    const input = { reset: vi.fn(), setInteractAvailable: vi.fn() };
    Object.assign(scene, { playerController: player, inputController: input });
    Reflect.get(scene, 'lockForInteraction')();
    Reflect.get(scene, 'unlockPlayer')();
    expect(player.lock).toHaveBeenCalledOnce();
    expect(input.reset).toHaveBeenCalledOnce();
    expect(input.setInteractAvailable).toHaveBeenCalledWith(false);
    expect(player.unlock).not.toHaveBeenCalled();
    Reflect.get(scene, 'unlockFromInteraction')();
    expect(player.unlock).toHaveBeenCalledOnce();
  });

  it('waits for the entrance transition when help closes before the animation finishes', () => {
    const player = { lock: vi.fn(), unlock: vi.fn() };
    const playing = vi.fn(() => true);
    Object.assign(scene, { playerController: player, sceneTransition: { isPlaying: playing } });
    Reflect.get(scene, 'lockForInteraction')();
    Reflect.get(scene, 'unlockFromInteraction')();
    expect(player.unlock).not.toHaveBeenCalled();
    playing.mockReturnValue(false);
    Reflect.get(scene, 'unlockPlayer')();
    expect(player.unlock).toHaveBeenCalledOnce();
  });

  function createSceneTransition(registeredKeys: readonly WorldSceneKey[] = WORLD_SCENE_KEYS) {
    let finishFade: (() => void) | undefined;
    const get = vi.fn((key: string) => registeredKeys.some(registered => registered === key)
      ? { key } : null);
    const start = vi.fn();
    const player = { lock: vi.fn(), unlock: vi.fn() };
    const input = { reset: vi.fn(), setInteractAvailable: vi.fn() };
    const isPlaying = vi.fn(() => false);
    const playOut = vi.fn((callback: () => void) => { finishFade = callback; });
    Object.assign(scene, {
      scene: { key: 'OpenPitScene', get, start },
      playerController: player, inputController: input,
      sceneTransition: { isPlaying, playOut },
    });
    return {
      get, start, player, input, isPlaying, playOut,
      request: (target: string, spawn?: string) => Reflect.get(scene, 'startSceneTransition')(target, spawn),
      finishFade: () => finishFade?.(),
    };
  }

  it.each(['HubScnee', '', 'hubscene', ' HubScene', 'UnrelatedScene'])(
    'rejects an unknown destination "%s" without locking or leaving the current map', target => {
      const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const transition = createSceneTransition();
      transition.request(target, 'from-open-pit');
      expect(transition.get).not.toHaveBeenCalled();
      expect(transition.player.lock).not.toHaveBeenCalled();
      expect(transition.player.unlock).not.toHaveBeenCalled();
      expect(transition.input.reset).not.toHaveBeenCalled();
      expect(transition.input.setInteractAvailable).not.toHaveBeenCalled();
      expect(transition.playOut).not.toHaveBeenCalled();
      transition.finishFade();
      expect(transition.start).not.toHaveBeenCalled();
      expect(warning).toHaveBeenCalledExactlyOnceWith(
        `Scene transition from "OpenPitScene" rejected: destination "${target}" is not a registered world scene.`,
      );
      expect(received).not.toHaveBeenCalled();
    },
  );

  it('rejects a known destination absent from Phaser and permits a subsequent valid transition', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const transition = createSceneTransition(['HubScene']);
    transition.request('QuarriesScene');
    expect(transition.get).toHaveBeenCalledExactlyOnceWith('QuarriesScene');
    expect(transition.player.lock).not.toHaveBeenCalled();
    expect(transition.input.reset).not.toHaveBeenCalled();
    expect(transition.input.setInteractAvailable).not.toHaveBeenCalled();
    expect(transition.playOut).not.toHaveBeenCalled();
    expect(transition.start).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledOnce();
    expect(warning.mock.calls[0][0]).toContain('QuarriesScene');

    transition.request('HubScene', 'from-open-pit');
    expect(transition.player.lock).toHaveBeenCalledOnce();
    expect(transition.start).not.toHaveBeenCalled();
    transition.finishFade();
    expect(transition.start).toHaveBeenCalledExactlyOnceWith('HubScene', { spawnId: 'from-open-pit' });
    expect(warning).toHaveBeenCalledOnce();
  });

  it.each(['HubScene', 'SurfaceSelectionScene', 'OpenPitScene'])('allows available destination %s only after the exit fade', target => {
    const transition = createSceneTransition();
    transition.request(target, 'from-open-pit');
    expect(transition.get).toHaveBeenCalledExactlyOnceWith(target);
    expect(transition.player.lock).toHaveBeenCalledOnce();
    expect(transition.input.reset).toHaveBeenCalledOnce();
    expect(transition.input.setInteractAvailable).toHaveBeenCalledExactlyOnceWith(false);
    expect(transition.playOut).toHaveBeenCalledOnce();
    expect(transition.start).not.toHaveBeenCalled();
    transition.finishFade();
    expect(transition.start).toHaveBeenCalledExactlyOnceWith(target, { spawnId: 'from-open-pit' });
    expect(transition.player.unlock).not.toHaveBeenCalled();
  });

  it.each(['QuarriesScene', 'Zone02Scene', 'Zone03Scene', 'Zone04Scene'])(
    'blocks registered destination %s while in preparation without locking or fading', target => {
      const transition = createSceneTransition();
      transition.request(target, 'from-hub');
      expect(transition.get).toHaveBeenCalledExactlyOnceWith(target);
      expect(transition.player.lock).not.toHaveBeenCalled();
      expect(transition.player.unlock).not.toHaveBeenCalled();
      expect(transition.input.reset).not.toHaveBeenCalled();
      expect(transition.input.setInteractAvailable).not.toHaveBeenCalled();
      expect(transition.playOut).not.toHaveBeenCalled();
      transition.finishFade();
      expect(transition.start).not.toHaveBeenCalled();
      expect(received).not.toHaveBeenCalled();

      transition.request('SurfaceSelectionScene', 'from-open-pit');
      transition.finishFade();
      expect(transition.start).toHaveBeenCalledExactlyOnceWith('SurfaceSelectionScene', { spawnId: 'from-open-pit' });
    },
  );

  it('preserves the default destination spawn when none is specified', () => {
    const transition = createSceneTransition();
    transition.request('HubScene');
    transition.finishFade();
    expect(transition.start).toHaveBeenCalledExactlyOnceWith('HubScene', { spawnId: undefined });
  });

  it('ignores a request during an existing transition without checking or replacing its destination', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const transition = createSceneTransition();
    transition.request('HubScene', 'from-open-pit');
    transition.isPlaying.mockReturnValue(true);
    transition.request('HubScnee');
    expect(transition.get).toHaveBeenCalledExactlyOnceWith('HubScene');
    expect(transition.player.lock).toHaveBeenCalledOnce();
    expect(transition.playOut).toHaveBeenCalledOnce();
    expect(warning).not.toHaveBeenCalled();
    transition.finishFade();
    expect(transition.start).toHaveBeenCalledExactlyOnceWith('HubScene', { spawnId: 'from-open-pit' });
  });

  it('keeps input locked during a local teleport, resets the physics body and moves the camera without restarting', () => {
    let exitFinished: () => void = () => {};
    let entryFinished: () => void = () => {};
    const body = { reset: vi.fn() };
    const player = { sprite: { body }, lock: vi.fn(), unlock: vi.fn() };
    const input = { reset: vi.fn(), setInteractAvailable: vi.fn() };
    const camera = { centerOn: vi.fn() };
    const start = vi.fn();
    Object.assign(scene, {
      sceneCreated: true, playerController: player, inputController: input,
      cameras: { main: camera }, scene: { key: 'OpenPitScene', start },
      sceneTransition: {
        isPlaying: () => false,
        playOut: (callback: () => void) => { exitFinished = callback; },
        playIn: (callback: () => void) => { entryFinished = callback; },
      },
    });
    scene.moveWithinMap({ x: 800, y: 1408 });
    expect(player.lock).toHaveBeenCalledOnce();
    expect(input.reset).toHaveBeenCalledOnce();
    expect(body.reset).not.toHaveBeenCalled();
    exitFinished();
    expect(body.reset).toHaveBeenCalledWith(800, 1408);
    expect(camera.centerOn).toHaveBeenCalledWith(800, 1408);
    expect(start).not.toHaveBeenCalled();
    expect(player.unlock).not.toHaveBeenCalled();
    entryFinished();
    expect(player.unlock).toHaveBeenCalledOnce();
  });

  it('ignores a local teleport during loading, an existing transition or an invalid destination', () => {
    const player = { lock: vi.fn() };
    const playing = vi.fn(() => false);
    Object.assign(scene, { playerController: player, sceneTransition: { isPlaying: playing } });
    scene.moveWithinMap({ x: 800, y: 1408 });
    Object.assign(scene, { sceneCreated: true });
    playing.mockReturnValue(true); scene.moveWithinMap({ x: 800, y: 1408 });
    playing.mockReturnValue(false); scene.moveWithinMap({ x: Number.NaN, y: 1408 });
    expect(player.lock).not.toHaveBeenCalled();
  });
});
