import Phaser from 'phaser';

import { gameEvents, GameEvents, type SceneLoadingSnapshot } from '../features/world/game/events/game-events';

import { buildTilemap, preloadTilemap } from '../features/world/game/tiled/tilemap.builder';

import {
  TilemapBuildResult,
  TilemapSceneConfig,
} from '../features/world/game/tiled/tilemap-config.types';

import { AmbientAudioManager, preloadAmbientSounds } from './audio/ambient-audio.manager';
import { MOBILE_WORLD_ZOOM } from './camera/camera-zoom';
import { AmbientCameraShake } from './camera/ambient-camera-shake';

import { InputController } from './input/input.controller';
import { usesTouchControls } from './input/touch-controls';

import { InteractionManager } from './interactions/interaction.manager';
import { isWorldSceneInPreparation } from './world-session/world-scene-availability';

import { PlayerController } from './player/player.controller';
import { PLAYER_AVATAR } from './player/player-avatar';

import { createStaticZonesFromLayer, findSpawnPoint } from './tiled/tiled.utils';
import type { TiledPoint } from './tiled/tiled.types';

import { RetroSceneTransition } from './transitions/retro-scene-transition';
import {
  isWorldSceneKey,
  type WorldSessionSnapshot,
} from './world-session/world-session.types';
import { takeWorldSessionRecovery } from './world-session/world-session.registry';

type SceneStartData = {
  spawnId?: string;
};

const CAMERA_FOLLOW_LERP = 0.15;
const CAMERA_DEADZONE_WIDTH = 64;
const CAMERA_DEADZONE_HEIGHT = 48;

/**
 * Coordina el funcionamiento compartido por las escenas del mundo.
 *
 * Cada escena concreta proporciona su configuración de mapa y puede usar
 * los hooks protegidos para añadir únicamente su comportamiento particular.
 */
export abstract class BaseWorldScene extends Phaser.Scene {
  private readonly direction = new Phaser.Math.Vector2();

  private inputController!: InputController;

  private interactionManager!: InteractionManager;

  private ambientAudioManager: AmbientAudioManager | null = null;
  private ambientCameraShake: AmbientCameraShake | null = null;

  private sceneTransition!: RetroSceneTransition;

  protected playerController!: PlayerController;

  private spawnId = 'player-start';

  private loadingFailed = false;
  private loadStarted = 0;
  private loadedMap: Phaser.Tilemaps.Tilemap | null = null;

  private sceneCreated = false;
  protected restoredPositionApplied = false;
  private interactionLocked = false;

  protected constructor(
    sceneKey: string,
    private readonly mapConfig: TilemapSceneConfig,
  ) {
    super(sceneKey);
  }

  init(data: SceneStartData = {}): void {
    this.spawnId = data.spawnId ?? 'player-start';
  }

  preload(): void {
    this.loadingFailed = false;
    this.loadStarted = performance.now();
    this.sceneCreated = false;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.handleShutdown, this);
    this.load.on(Phaser.Loader.Events.PROGRESS, this.handleLoadProgress);
    this.load.once(Phaser.Loader.Events.COMPLETE, this.handleLoadComplete);
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, this.handleLoadError);
    this.reportLoading('loading', 0);

    if (!this.textures.exists(PLAYER_AVATAR.texture)) {
      this.load.spritesheet(PLAYER_AVATAR.texture, PLAYER_AVATAR.path, {
        frameWidth: PLAYER_AVATAR.frameWidth,
        frameHeight: PLAYER_AVATAR.frameHeight,
        endFrame: PLAYER_AVATAR.endFrame,
      });
    }

    preloadTilemap(this, this.mapConfig);

    // Optional ambience loads only after the map's first render.
  }

  create(): void {
    // Keep the error screen visible rather than constructing an incomplete map.
    if (this.loadingFailed) return;

    try {
      this.createReadyScene();
    } catch (error) {
      this.loadingFailed = true;
      this.lockPlayer();
      this.reportLoading('error', this.load.progress);
      console.warn(`World scene construction failed in "${this.scene.key}". Reload the map to retry.`, error);
    }
  }

  private createReadyScene(): void {

    this.interactionLocked = false;
    gameEvents.on(GameEvents.LOCK_PLAYER, this.lockForInteraction);

    gameEvents.on(GameEvents.UNLOCK_PLAYER, this.unlockFromInteraction);

    const buildResult = buildTilemap(this, this.mapConfig);
    this.loadedMap = buildResult.map;

    this.createPlayerController(buildResult.map);

    this.initializeAmbientAudio(buildResult.map);

    this.setupCamera(buildResult.map);
    this.ambientCameraShake = this.mapConfig.ambientSounds?.length
      ? new AmbientCameraShake(this.cameras.main) : null;

    this.inputController = new InputController(this);

    this.sceneTransition = new RetroSceneTransition(this);

    this.interactionManager = new InteractionManager(
      this,
      buildResult.map,
      this.playerController.sprite,
      this.startSceneTransition,
    );

    this.setupCollisions(buildResult.map);

    this.onSceneCreated(buildResult);

    gameEvents.emit(GameEvents.SCENE_CHANGED, this.scene.key);

    this.lockPlayer();

    this.sceneTransition.playIn(this.unlockPlayer);

    this.sceneCreated = true;
    // Resource completion alone does not mean the map has been built and drawn.
    this.game.events.once(Phaser.Core.Events.POST_RENDER, this.handleSceneRendered);
  }

  override update(_time: number, delta: number): void {
    if (!this.sceneCreated) return;

    this.inputController.getDirection(this.direction);

    const interactRequested = this.inputController.consumeInteract();

    this.playerController.update(this.direction);

    this.ambientAudioManager?.update(delta);
    this.ambientCameraShake?.update(
      this.ambientAudioManager?.audibleStrength ?? 0,
      !this.playerController.isLocked() && !this.sceneTransition.isPlaying(),
    );

    const interactionAvailable = this.interactionManager.update(
      interactRequested,
      this.playerController.isLocked(),
    );

    this.inputController.setInteractAvailable(
      interactionAvailable && !this.sceneTransition.isPlaying(),
    );

    this.onSceneUpdated();
  }

  /**
   * Hook para la configuración particular de una escena después de crear
   * el mapa, el jugador y los sistemas compartidos.
   */
  protected onSceneCreated(_buildResult: TilemapBuildResult): void {}

  /**
   * Hook para la actualización particular de una escena.
   */
  protected onSceneUpdated(): void {}

  /**
   * Hook para limpiar recursos particulares de una escena.
   */
  protected onSceneShutdown(): void {}

  /** Moves within the current map while keeping input locked through the retro transition. */
  protected teleportPlayer(position: TiledPoint): void {
    if (!this.sceneCreated || this.sceneTransition.isPlaying() || !Number.isFinite(position.x + position.y)) return;
    this.lockPlayer();
    this.sceneTransition.playOut(() => {
      const body = this.playerController.sprite.body as Phaser.Physics.Arcade.Body;
      body.reset(position.x, position.y);
      this.cameras.main.centerOn(position.x, position.y);
      this.sceneTransition.playIn(this.unlockPlayer);
    });
  }

  getSessionSnapshot(): WorldSessionSnapshot | null {
    if (!this.sceneCreated || !isWorldSceneKey(this.scene.key) || !this.playerController?.sprite) {
      return null;
    }

    return {
      version: 1,
      sceneKey: this.scene.key,
      playerX: this.playerController.sprite.x,
      playerY: this.playerController.sprite.y,
      savedAt: Date.now(),
    };
  }

  private createPlayerController(map: Phaser.Tilemaps.Tilemap): void {
    const restoredSession = this.takeRestoredSession();
    this.restoredPositionApplied = restoredSession !== null;
    const spawn = restoredSession
      ? {
          x: Phaser.Math.Clamp(restoredSession.playerX, 0, map.widthInPixels),
          y: Phaser.Math.Clamp(restoredSession.playerY, 0, map.heightInPixels),
        }
      : findSpawnPoint(map, this.spawnId);

    this.playerController = new PlayerController(this, {
      x: spawn.x,
      y: spawn.y,
      texture: PLAYER_AVATAR.texture,
      speed: 250,
      depth: 12,
    });
  }

  private takeRestoredSession(): WorldSessionSnapshot | null {
    return takeWorldSessionRecovery(
      this.registry,
      this.scene.key,
    );
  }

  private setupCollisions(map: Phaser.Tilemaps.Tilemap): void {
    const collisionZones = createStaticZonesFromLayer(this, map, 'Collision');

    this.physics.add.collider(this.playerController.sprite, collisionZones);

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
  }

  private setupCamera(map: Phaser.Tilemaps.Tilemap): void {
    const camera = this.cameras.main;

    camera.setZoom(usesTouchControls(this) ? MOBILE_WORLD_ZOOM : 1);
    camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    camera.startFollow(
      this.playerController.sprite,
      true,
      CAMERA_FOLLOW_LERP,
      CAMERA_FOLLOW_LERP,
    );
    camera.setDeadzone(CAMERA_DEADZONE_WIDTH, CAMERA_DEADZONE_HEIGHT);
  }

  private readonly lockPlayer = (): void => {
    this.playerController?.lock();
    this.ambientCameraShake?.stop();

    this.inputController?.reset();

    this.inputController?.setInteractAvailable(false);
  };

  private readonly unlockPlayer = (): void => {
    if (!this.interactionLocked) this.playerController?.unlock();
  };

  private readonly lockForInteraction = (): void => {
    this.interactionLocked = true;
    this.lockPlayer();
  };

  private readonly unlockFromInteraction = (): void => {
    this.interactionLocked = false;
    // Closing a modal must not end a scene transition early.
    if (!this.sceneTransition?.isPlaying()) this.unlockPlayer();
  };

  private reportLoading(phase: SceneLoadingSnapshot['phase'], progress: number): void {
    const snapshot: SceneLoadingSnapshot = { sceneKey: this.scene.key, phase, progress };
    gameEvents.emit(GameEvents.SCENE_LOADING, snapshot);
  }

  private readonly handleLoadProgress = (progress: number): void => {
    if (!this.loadingFailed && !this.sceneCreated) this.reportLoading('loading', progress);
  };

  private readonly handleLoadComplete = (): void => {
    if (!this.loadingFailed && !this.sceneCreated) this.reportLoading('preparing', 1);
  };

  private readonly handleLoadError = (file?: { type: string; key: string }): void => {
    if (file?.type === 'audio' && this.mapConfig.ambientSounds?.some(sound => sound.id === file.key)) {
      console.warn('Optional ambient audio could not be loaded. The map remains playable.');
      return;
    }
    this.loadingFailed = true;
    this.reportLoading('error', this.load.progress);
  };

  private readonly handleSceneRendered = (): void => {
    if (!this.sceneCreated || this.loadingFailed) return;
    this.reportLoading('ready', 1);
    const metric = `exploralab:scene-load:${this.scene.key}`;
    performance.clearMeasures(metric);
    performance.measure(metric, { start: this.loadStarted, end: performance.now() });
    if (this.mapConfig.ambientSounds?.some(sound => !this.cache.audio.exists(sound.id))) {
      this.load.once(Phaser.Loader.Events.COMPLETE, this.handleAmbientLoaded);
      preloadAmbientSounds(this, this.mapConfig.ambientSounds);
      this.load.start();
    }
  };

  private cachedAmbientSounds() {
    return this.mapConfig.ambientSounds?.filter(sound => this.cache.audio.exists(sound.id)) ?? [];
  }

  private readonly handleAmbientLoaded = (): void => {
    if (!this.sceneCreated || this.loadingFailed || !this.loadedMap) return;
    this.initializeAmbientAudio(this.loadedMap);
  };

  private initializeAmbientAudio(map: Phaser.Tilemaps.Tilemap): void {
    const previousManager = this.ambientAudioManager;
    this.ambientAudioManager = null;
    try {
      previousManager?.destroy();
      this.ambientAudioManager = new AmbientAudioManager(
        this, map, this.playerController.sprite, this.cachedAmbientSounds(),
      );
    } catch (error) {
      // Optional ambience must not prevent movement or map interactions.
      console.warn(`Optional ambient audio initialization failed in "${this.scene.key}". The map remains playable.`, error);
    }
  }

  private readonly startSceneTransition = (targetScene: string, targetSpawn?: string): void => {
    if (this.sceneTransition.isPlaying()) {
      return;
    }

    // ScenePlugin.start queues the current scene's stop before starting its target.
    if (!isWorldSceneKey(targetScene) || !this.scene.get(targetScene)) {
      console.warn(`Scene transition from "${this.scene.key}" rejected: destination "${targetScene}" is not a registered world scene.`);
      return;
    }

    if (isWorldSceneInPreparation(targetScene)) {
      return;
    }

    this.lockPlayer();

    this.sceneTransition.playOut(() => {
      this.scene.start(targetScene, {
        spawnId: targetSpawn,
      });
    });
  };

  private handleShutdown(): void {
    this.sceneCreated = false;
    this.loadedMap = null;
    this.load.off(Phaser.Loader.Events.PROGRESS, this.handleLoadProgress);
    this.load.off(Phaser.Loader.Events.COMPLETE, this.handleLoadComplete);
    this.load.off(Phaser.Loader.Events.COMPLETE, this.handleAmbientLoaded);
    this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, this.handleLoadError);
    this.game.events.off(Phaser.Core.Events.POST_RENDER, this.handleSceneRendered);
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.handleShutdown, this);

    gameEvents.off(GameEvents.LOCK_PLAYER, this.lockForInteraction);

    gameEvents.off(GameEvents.UNLOCK_PLAYER, this.unlockFromInteraction);

    this.runShutdownCleanup('scene hook', () => this.onSceneShutdown());
    this.runShutdownCleanup('input controls', () => this.inputController?.destroy());
    this.runShutdownCleanup('interactions', () => this.interactionManager?.destroy());
    this.runShutdownCleanup('ambient audio', () => this.ambientAudioManager?.destroy());
    this.runShutdownCleanup('ambient camera shake', () => {
      const shake = this.ambientCameraShake;
      this.ambientCameraShake = null;
      shake?.destroy();
    });
    this.runShutdownCleanup('scene transition', () => this.sceneTransition?.destroy());
  }

  private runShutdownCleanup(resource: string, cleanup: () => void): void {
    try {
      cleanup();
    } catch (error) {
      // Attempt the remaining teardown steps even if one resource fails.
      console.warn(`Failed to clean up ${resource} in "${this.scene.key}".`, error);
    }
  }
}
