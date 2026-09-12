import Phaser from 'phaser';

import { AmbientSoundConfig } from '../../features/world/game/tiled/tilemap-config.types';

import { getObjectLayerOrThrow, getTiledProperty } from '../tiled/tiled.utils';
import { TiledObjectLike } from '../tiled/tiled.types';

const AMBIENT_SOUND_LAYER = 'Ambient_Sounds';
const DEFAULT_RADIUS = 400;
const DEFAULT_VOLUME = 0.4;
const VOLUME_RESPONSE_PER_SECOND = 6;
const SILENCE_THRESHOLD = 0.001;
const STARTUP_MUTE_DURATION_MS = 100;
const MAX_VOLUME_DELTA_MS = 50;

type AdjustableSound = Phaser.Sound.BaseSound & {
  readonly mute: boolean;
  readonly volume: number;
  setMute(value: boolean): AdjustableSound;
  setVolume(value: number): AdjustableSound;
};

type AmbientSoundPoint = {
  x: number;
  y: number;
  radius: number;
  maxVolume: number;
};

type AmbientSoundChannel = {
  sound: AdjustableSound;
  points: AmbientSoundPoint[];
  startupMuteRemaining: number;
};

export function preloadAmbientSounds(
  scene: Phaser.Scene,
  configs: readonly AmbientSoundConfig[] = [],
): void {
  for (const config of configs) {
    if (!scene.cache.audio.exists(config.id)) {
      scene.load.audio(config.id, config.audioPath);
    }
  }
}

/**
 * Reproduce sonidos ambientales definidos como puntos en Tiled y ajusta su
 * volumen según la distancia entre cada punto y el jugador.
 */
export class AmbientAudioManager {
  private readonly channels: AmbientSoundChannel[];

  constructor(
    private readonly scene: Phaser.Scene,
    map: Phaser.Tilemaps.Tilemap,
    private readonly player: Phaser.Physics.Arcade.Sprite,
    configs: readonly AmbientSoundConfig[] = [],
  ) {
    this.channels = this.createChannels(map, configs);
  }

  update(delta: number): void {
    const volumeDelta = Phaser.Math.Clamp(delta, 0, MAX_VOLUME_DELTA_MS);
    const response = 1 - Math.exp(-VOLUME_RESPONSE_PER_SECOND * volumeDelta / 1000);

    for (const channel of this.channels) {
      const targetVolume = this.calculateTargetVolume(channel.points);

      if (
        targetVolume > SILENCE_THRESHOLD &&
        !channel.sound.isPlaying &&
        !this.scene.sound.locked
      ) {
        channel.sound.setMute(true);
        channel.sound.setVolume(0);
        channel.startupMuteRemaining = STARTUP_MUTE_DURATION_MS;

        channel.sound.play({
          loop: true,
          mute: true,
          volume: 0,
        });
      }

      if (!channel.sound.isPlaying) {
        continue;
      }

      if (channel.startupMuteRemaining > 0) {
        channel.startupMuteRemaining = Math.max(
          channel.startupMuteRemaining - volumeDelta,
          0,
        );

        if (Math.abs(channel.sound.volume) > SILENCE_THRESHOLD) {
          channel.sound.setVolume(0);
        }

        if (channel.startupMuteRemaining === 0) {
          channel.sound.setMute(false);
        }

        continue;
      }

      const nextVolume = Phaser.Math.Linear(channel.sound.volume, targetVolume, response);
      const resolvedVolume = Math.abs(nextVolume - targetVolume) <= SILENCE_THRESHOLD
        ? targetVolume
        : nextVolume;

      if (Math.abs(channel.sound.volume - resolvedVolume) > SILENCE_THRESHOLD) {
        channel.sound.setVolume(resolvedVolume);
      }

      if (targetVolume === 0 && resolvedVolume <= SILENCE_THRESHOLD) {
        channel.sound.stop();
      }
    }
  }

  destroy(): void {
    for (const channel of this.channels) {
      channel.sound.destroy();
    }

    this.channels.length = 0;
  }

  private createChannels(
    map: Phaser.Tilemaps.Tilemap,
    configs: readonly AmbientSoundConfig[],
  ): AmbientSoundChannel[] {
    if (configs.length === 0) {
      return [];
    }

    const objectLayer = getObjectLayerOrThrow(map, AMBIENT_SOUND_LAYER);
    const objectsBySoundId = this.groupObjectsBySoundId(objectLayer.objects);
    const configuredIds = new Set<string>();

    return configs.map(config => {
      if (configuredIds.has(config.id)) {
        throw new Error(`El sonido ambiental "${config.id}" está configurado más de una vez`);
      }

      configuredIds.add(config.id);

      const objects = objectsBySoundId.get(config.id) ?? [];

      if (objects.length === 0) {
        throw new Error(
          `No se encontró el punto de sonido "${config.id}" en "${AMBIENT_SOUND_LAYER}"`,
        );
      }

      const sound = this.scene.sound.add(config.id, {
        loop: true,
        volume: 0,
      }) as AdjustableSound;

      return {
        sound,
        points: objects.map(object => this.createPoint(config.id, object)),
        startupMuteRemaining: 0,
      };
    });
  }

  private createPoint(
    soundId: string,
    object: TiledObjectLike,
  ): AmbientSoundPoint {
    if (object.x === undefined || object.y === undefined) {
      throw new Error(`El punto de sonido "${object.name ?? soundId}" no tiene coordenadas`);
    }

    const radius = getTiledProperty<number>(object, 'radius') ?? DEFAULT_RADIUS;
    const maxVolume = getTiledProperty<number>(object, 'volume') ?? DEFAULT_VOLUME;

    if (!Number.isFinite(radius) || radius <= 0) {
      throw new Error(`El sonido "${object.name ?? soundId}" debe tener un radius mayor que 0`);
    }

    if (!Number.isFinite(maxVolume) || maxVolume < 0 || maxVolume > 1) {
      throw new Error(`El sonido "${object.name ?? soundId}" debe tener un volume entre 0 y 1`);
    }

    return {
      x: object.x,
      y: object.y,
      radius,
      maxVolume,
    };
  }

  private groupObjectsBySoundId(
    objects: readonly TiledObjectLike[],
  ): Map<string, TiledObjectLike[]> {
    const groupedObjects = new Map<string, TiledObjectLike[]>();

    for (const object of objects) {
      const soundId = this.getSoundId(object);

      if (!soundId) {
        continue;
      }

      const group = groupedObjects.get(soundId) ?? [];

      group.push(object);
      groupedObjects.set(soundId, group);
    }

    return groupedObjects;
  }

  private getSoundId(object: TiledObjectLike): string | undefined {
    return getTiledProperty<string>(object, 'soundId') ?? object.name;
  }

  private calculateTargetVolume(points: readonly AmbientSoundPoint[]): number {
    let targetVolume = 0;

    for (const point of points) {
      const offsetX = this.player.x - point.x;
      const offsetY = this.player.y - point.y;
      const distanceSquared = offsetX * offsetX + offsetY * offsetY;
      const radiusSquared = point.radius * point.radius;

      if (distanceSquared >= radiusSquared) {
        continue;
      }

      const proximity = 1 - Math.sqrt(distanceSquared) / point.radius;

      targetVolume = Math.max(targetVolume, proximity * point.maxVolume);
    }

    return targetVolume;
  }
}
