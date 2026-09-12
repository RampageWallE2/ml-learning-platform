import type Phaser from 'phaser';

import { AmbientAudioManager } from './ambient-audio.manager';

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

function createAmbientPoint(name: string, x: number) {
  return {
    name,
    x,
    y: 100,
    properties: [
      { name: 'soundId', value: 'dump_truck' },
      { name: 'radius', value: 500 },
      { name: 'volume', value: 0.4 },
    ],
  };
}

describe('AmbientAudioManager', () => {
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
