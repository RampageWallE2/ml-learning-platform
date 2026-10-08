import type Phaser from 'phaser';

import { AmbientAudioManager } from './ambient-audio.manager';
import type { TiledObjectLike } from '../tiled/tiled.types';
import type { AmbientSoundConfig } from '../../features/world/game/tiled/tilemap-config.types';

vi.mock('phaser', () => ({
  default: {
    Math: {
      Clamp: (value: number, min: number, max: number) => Math.min(Math.max(value, min), max),
      Linear: (start: number, end: number, amount: number) => start + (end - start) * amount,
    },
  },
}));

type FakeSound = {
  isPlaying: boolean;
  mute: boolean;
  volume: number;
  play: ReturnType<typeof vi.fn>;
  setMute: ReturnType<typeof vi.fn>;
  setVolume: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
};

function createFakeSound(): FakeSound {
  const sound = {
    isPlaying: false,
    mute: false,
    volume: 0,
  } as FakeSound;

  sound.play = vi.fn((config: Phaser.Types.Sound.SoundConfig) => {
    sound.isPlaying = true;
    sound.mute = config.mute ?? sound.mute;
    sound.volume = config.volume ?? sound.volume;

    return true;
  });

  sound.setMute = vi.fn((value: boolean) => {
    sound.mute = value;

    return sound;
  });

  sound.setVolume = vi.fn((value: number) => {
    sound.volume = value;

    return sound;
  });

  sound.stop = vi.fn(() => {
    sound.isPlaying = false;

    return true;
  });

  sound.destroy = vi.fn();

  return sound;
}

function createAmbientPoint(name: string, x: number, soundId = 'dump_truck') {
  return {
    name,
    x,
    y: 100,
    properties: [
      { name: 'soundId', value: soundId },
      { name: 'radius', value: 500 },
      { name: 'volume', value: 0.4 },
    ],
  };
}

describe('AmbientAudioManager', () => {
  afterEach(() => vi.restoreAllMocks());

  const configs: readonly AmbientSoundConfig[] = [
    { id: 'dump_truck', audioPath: 'truck.mp3' },
    { id: 'mill', audioPath: 'mill.mp3' },
    { id: 'excavator', audioPath: 'excavator.mp3' },
  ];

  function constructionFixture(objects: readonly TiledObjectLike[] = configs.map(config =>
    createAmbientPoint(config.id, 100, config.id))) {
    const sounds: FakeSound[] = [];
    const liveSounds = new Set<FakeSound>();
    const allocateSound = (_id: string, _config: Phaser.Types.Sound.SoundConfig) => {
      const sound = createFakeSound();
      sound.destroy.mockImplementation(() => { liveSounds.delete(sound); });
      sounds.push(sound);
      liveSounds.add(sound);
      return sound;
    };
    const addSound = vi.fn(allocateSound);
    const soundManager = { add: addSound, locked: false, mute: false };
    const scene = { sound: soundManager } as unknown as Phaser.Scene;
    const map = { getObjectLayer: () => ({ objects }) } as unknown as Phaser.Tilemaps.Tilemap;
    const player = { x: 100, y: 100 } as Phaser.Physics.Arcade.Sprite;
    return { sounds, liveSounds, allocateSound, addSound, player, soundManager,
      create: (configuration: readonly AmbientSoundConfig[] = configs) =>
        new AmbientAudioManager(scene, map, player, configuration) };
  }

  it('reports actual audible proximity after the startup guard and fades out when leaving a machine', () => {
    const fixture = constructionFixture([createAmbientPoint('truck', 100)]);
    const manager = fixture.create(configs.slice(0, 1));
    expect(manager.audibleStrength).toBe(0);
    manager.update(16);
    manager.update(50);
    manager.update(50);
    expect(manager.audibleStrength).toBe(0);
    for (let index = 0; index < 30; index++) manager.update(50);
    const near = manager.audibleStrength;
    expect(near).toBeGreaterThan(0.98);
    expect(near).toBeLessThanOrEqual(1);
    fixture.player.x = 350;
    for (let index = 0; index < 30; index++) manager.update(50);
    expect(manager.audibleStrength).toBeCloseTo(0.5, 1);
    expect(manager.audibleStrength).toBeLessThan(near);
    fixture.player.x = 2000;
    for (let index = 0; index < 30; index++) manager.update(50);
    expect(manager.audibleStrength).toBeLessThan(0.05);
    manager.destroy();
    expect(manager.audibleStrength).toBe(0);
  });

  it('uses the strongest audible channel, caps its strength and ignores muted, locked or silent audio', () => {
    const fixture = constructionFixture();
    const manager = fixture.create();
    for (const sound of fixture.sounds) { sound.isPlaying = true; sound.volume = 0.2; }
    expect(manager.audibleStrength).toBe(0.5);
    fixture.sounds[0].volume = 1;
    expect(manager.audibleStrength).toBe(1);
    fixture.sounds[0].mute = true;
    expect(manager.audibleStrength).toBe(0.5);
    fixture.soundManager.mute = true;
    expect(manager.audibleStrength).toBe(0);
    fixture.soundManager.mute = false; fixture.soundManager.locked = true;
    expect(manager.audibleStrength).toBe(0);
    fixture.soundManager.locked = false;
    for (const sound of fixture.sounds) sound.isPlaying = false;
    expect(manager.audibleStrength).toBe(0);
    fixture.sounds[1].isPlaying = true; fixture.sounds[1].volume = Number.NaN;
    expect(manager.audibleStrength).toBe(0);
    manager.destroy();
  });

  const invalidPointCases: readonly [string, TiledObjectLike, string][] = [
    ['a numeric property with the wrong type', {
      ...createAmbientPoint('mill', 100, 'mill'),
      properties: [{ name: 'soundId', value: 'mill' }, { name: 'volume', value: '0.4' }],
    }, 'debe ser un número finito'],
    ['a radius outside its range', {
      ...createAmbientPoint('mill', 100, 'mill'),
      properties: [{ name: 'soundId', value: 'mill' }, { name: 'radius', value: 0 }],
    }, 'radius mayor que 0'],
    ['missing coordinates', { ...createAmbientPoint('mill', 100, 'mill'), x: undefined }, 'no tiene coordenadas'],
  ];

  it.each(invalidPointCases)('validates every point before allocating audio when a later point has %s', (_, invalidPoint, message) => {
    const fixture = constructionFixture([createAmbientPoint('truck', 100), invalidPoint]);
    expect(() => fixture.create(configs.slice(0, 2))).toThrow(message);
    expect(fixture.addSound).not.toHaveBeenCalled();
    expect(fixture.liveSounds.size).toBe(0);
  });

  it('rejects duplicate configurations before allocating the first sound', () => {
    const fixture = constructionFixture();
    expect(() => fixture.create([configs[0], configs[0]])).toThrow('configurado más de una vez');
    expect(fixture.addSound).not.toHaveBeenCalled();
  });

  it('rejects a missing later sound point before allocating the first sound', () => {
    const fixture = constructionFixture([createAmbientPoint('truck', 100)]);
    expect(() => fixture.create(configs)).toThrow('No se encontró el punto de sonido "mill"');
    expect(fixture.addSound).not.toHaveBeenCalled();
  });

  it('destroys all sounds from a partial construction without touching unrelated audio', () => {
    const fixture = constructionFixture();
    const unrelatedSound = createFakeSound();
    fixture.liveSounds.add(unrelatedSound);
    const failure = new Error('Audio allocation failed');
    fixture.addSound.mockImplementationOnce(fixture.allocateSound)
      .mockImplementationOnce(fixture.allocateSound)
      .mockImplementationOnce(() => { throw failure; });
    let receivedError: unknown;
    try { fixture.create(); } catch (error) { receivedError = error; }
    expect(receivedError).toBe(failure);
    expect(fixture.sounds).toHaveLength(2);
    for (const sound of fixture.sounds) {
      expect(sound.destroy).toHaveBeenCalledOnce();
      expect(sound.play).not.toHaveBeenCalled();
    }
    expect(fixture.liveSounds).toEqual(new Set([unrelatedSound]));
    expect(unrelatedSound.destroy).not.toHaveBeenCalled();
  });

  it('continues cleanup and preserves the allocation error if one destructor also fails', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fixture = constructionFixture();
    const failure = new Error('Audio allocation failed');
    const cleanupFailure = new Error('Audio cleanup failed');
    fixture.addSound.mockImplementationOnce((id, soundConfig) => {
      const sound = fixture.allocateSound(id, soundConfig);
      sound.destroy.mockImplementation(() => { throw cleanupFailure; });
      return sound;
    }).mockImplementationOnce(fixture.allocateSound)
      .mockImplementationOnce(() => { throw failure; });
    let receivedError: unknown;
    try { fixture.create(); } catch (error) { receivedError = error; }
    expect(receivedError).toBe(failure);
    expect(fixture.sounds[0].destroy).toHaveBeenCalledOnce();
    expect(fixture.sounds[1].destroy).toHaveBeenCalledOnce();
    expect(fixture.liveSounds.has(fixture.sounds[1])).toBe(false);
    expect(warning).toHaveBeenCalledOnce();
    expect(warning.mock.calls[0][1]).toBe(cleanupFailure);
  });

  it.each([0, 1, 2])('continues normal teardown when sound %i fails and does not destroy it twice', failedIndex => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fixture = constructionFixture();
    const manager = fixture.create();
    const unrelatedSound = createFakeSound();
    fixture.liveSounds.add(unrelatedSound);
    const failure = new Error('Sound teardown failed', { cause: new Error('Device unavailable') });
    const failedSound = fixture.sounds[failedIndex];
    failedSound.destroy.mockImplementation(() => { throw failure; });

    expect(() => manager.destroy()).not.toThrow();
    for (const sound of fixture.sounds) expect(sound.destroy).toHaveBeenCalledOnce();
    expect(fixture.liveSounds).toEqual(new Set([failedSound, unrelatedSound]));
    expect(unrelatedSound.destroy).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledExactlyOnceWith('Failed to destroy ambient audio.', failure);
    expect(warning.mock.calls[0][1].cause).toBe(failure.cause);

    expect(() => manager.destroy()).not.toThrow();
    expect(() => manager.update(16)).not.toThrow();
    for (const sound of fixture.sounds) {
      expect(sound.destroy).toHaveBeenCalledOnce();
      expect(sound.play).not.toHaveBeenCalled();
    }
    expect(warning).toHaveBeenCalledOnce();
  });

  it('attempts every sound and keeps each original error when several destructors fail', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fixture = constructionFixture();
    const manager = fixture.create();
    const firstFailure = new Error('First sound failed');
    const lastFailure = { reason: 'Third-party sound failure' };
    fixture.sounds[0].destroy.mockImplementation(() => { throw firstFailure; });
    fixture.sounds[2].destroy.mockImplementation(() => { throw lastFailure; });

    expect(() => manager.destroy()).not.toThrow();
    for (const sound of fixture.sounds) expect(sound.destroy).toHaveBeenCalledOnce();
    expect(fixture.liveSounds.has(fixture.sounds[1])).toBe(false);
    expect(warning).toHaveBeenCalledTimes(2);
    expect(warning.mock.calls[0][1]).toBe(firstFailure);
    expect(warning.mock.calls[1][1]).toBe(lastFailure);
    manager.destroy();
    expect(warning).toHaveBeenCalledTimes(2);
  });

  it('keeps valid multi-channel audio playable and destroys each sound only once', () => {
    const fixture = constructionFixture();
    const manager = fixture.create();
    expect(fixture.addSound.mock.calls.map(call => call[0])).toEqual(configs.map(config => config.id));
    manager.update(16);
    for (const sound of fixture.sounds) expect(sound.play).toHaveBeenCalledOnce();
    manager.destroy();
    manager.destroy();
    expect(fixture.liveSounds.size).toBe(0);
    for (const sound of fixture.sounds) expect(sound.destroy).toHaveBeenCalledOnce();
  });

  it('uses one playback channel for duplicated points with the same soundId', () => {
    const sound = createFakeSound();
    const addSound = vi.fn(() => sound);
    const scene = {
      sound: {
        add: addSound,
        locked: false,
      },
    } as unknown as Phaser.Scene;
    const map = {
      getObjectLayer: () => ({
        objects: [
          createAmbientPoint('dump_truck_01', 100),
          createAmbientPoint('dump_truck_02', 900),
        ],
      }),
    } as unknown as Phaser.Tilemaps.Tilemap;
    const player = { x: 900, y: 100 } as Phaser.Physics.Arcade.Sprite;

    const manager = new AmbientAudioManager(scene, map, player, [
      {
        id: 'dump_truck',
        audioPath: 'assets/game/audio/ambient/dump_truck.mp3',
      },
    ]);

    expect(addSound).toHaveBeenCalledTimes(1);
    expect(addSound).toHaveBeenCalledWith('dump_truck', {
      loop: true,
      volume: 0,
    });

    manager.update(16);
    manager.update(50);
    manager.update(50);
    manager.update(16);

    expect(sound.volume).toBeGreaterThan(0);
  });

  it('starts muted and fades in only after the startup guard', () => {
    const sound = createFakeSound();
    const scene = {
      sound: {
        add: vi.fn(() => sound),
        locked: false,
      },
    } as unknown as Phaser.Scene;
    const map = {
      getObjectLayer: () => ({
        objects: [createAmbientPoint('dump_truck_01', 100)],
      }),
    } as unknown as Phaser.Tilemaps.Tilemap;
    const player = { x: 100, y: 100 } as Phaser.Physics.Arcade.Sprite;
    const manager = new AmbientAudioManager(scene, map, player, [
      {
        id: 'dump_truck',
        audioPath: 'assets/game/audio/ambient/dump_truck.mp3',
      },
    ]);

    manager.update(16);

    expect(sound.play).toHaveBeenCalledWith({
      loop: true,
      mute: true,
      volume: 0,
    });
    expect(sound.mute).toBe(true);
    expect(sound.volume).toBe(0);

    manager.update(50);
    manager.update(50);

    expect(sound.mute).toBe(false);
    expect(sound.volume).toBe(0);

    manager.update(16);

    expect(sound.volume).toBeGreaterThan(0);
    expect(sound.volume).toBeLessThanOrEqual(0.4);
  });
});
