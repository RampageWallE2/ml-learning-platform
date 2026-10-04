import Phaser from 'phaser';

import { gameEvents, GameEvents, type SceneLoadingSnapshot } from '../features/world/game/events/game-events';

import { buildTilemap, preloadTilemap } from '../features/world/game/tiled/tilemap.builder';

import {
  TilemapBuildResult,
  TilemapSceneConfig,
} from '../features/world/game/tiled/tilemap-config.types';

import { AmbientAudioManager, preloadAmbientSounds } from './audio/ambient-audio.manager';
import { MOBILE_WORLD_ZOOM } from './camera/camera-zoom';

import { InputController } from './input/input.controller';
import { usesTouchControls } from './input/touch-controls';

import { InteractionManager } from './interactions/interaction.manager';

import { PlayerController } from './player/player.controller';

import { createStaticZonesFromLayer, findSpawnPoint } from './tiled/tiled.utils';

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

  private ambientAudioManager!: AmbientAudioManager;

  private sceneTransition!: RetroSceneTransition;

  protected playerController!: PlayerController;

  private spawnId = 'player-start';

  private loadingFailed = false;

  private sceneCreated = false;

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
    this.sceneCreated = false;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.handleShutdown, this);
    this.load.on(Phaser.Loader.Events.PROGRESS, this.handleLoadProgress);
    this.load.once(Phaser.Loader.Events.COMPLETE, this.handleLoadComplete);
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, this.handleLoadError);
    this.reportLoading('loading', 0);

    if (!this.textures.exists('player')) {
      this.load.spritesheet('player', 'assets/game/characters/character2.png', {
        frameWidth: 32,
        frameHeight: 32,
      });
    }

    preloadTilemap(this, this.mapConfig);

    preloadAmbientSounds(this, this.mapConfig.ambientSounds);
  }

  create(): void {
    // Keep the error screen visible rather than constructing an incomplete map.
    if (this.loadingFailed) return;

    gameEvents.on(GameEvents.LOCK_PLAYER, this.lockPlayer);

    gameEvents.on(GameEvents.UNLOCK_PLAYER, this.unlockPlayer);

    const buildResult = buildTilemap(this, this.mapConfig);

    this.createPlayerController(buildResult.map);

    this.ambientAudioManager = new AmbientAudioManager(
      this,
      buildResult.map,
      this.playerController.sprite,
      this.mapConfig.ambientSounds,
    );

    this.setupCamera(buildResult.map);

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

    this.ambientAudioManager.update(delta);

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
    const spawn = restoredSession
      ? {
          x: Phaser.Math.Clamp(restoredSession.playerX, 0, map.widthInPixels),
          y: Phaser.Math.Clamp(restoredSession.playerY, 0, map.heightInPixels),
        }
      : findSpawnPoint(map, this.spawnId);

    this.playerController = new PlayerController(this, {
      x: spawn.x,
      y: spawn.y,
      texture: 'player',
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

    this.inputController?.reset();

    this.inputController?.setInteractAvailable(false);
  };

  private readonly unlockPlayer = (): void => {
    this.playerController?.unlock();
  };

  private reportLoading(phase: SceneLoadingSnapshot['phase'], progress: number): void {
    const snapshot: SceneLoadingSnapshot = { sceneKey: this.scene.key, phase, progress };
    gameEvents.emit(GameEvents.SCENE_LOADING, snapshot);
  }

  private readonly handleLoadProgress = (progress: number): void => {
    if (!this.loadingFailed) this.reportLoading('loading', progress);
  };

  private readonly handleLoadComplete = (): void => {
    if (!this.loadingFailed) this.reportLoading('preparing', 1);
  };

  private readonly handleLoadError = (): void => {
    this.loadingFailed = true;
    this.reportLoading('error', this.load.progress);
  };

  private readonly handleSceneRendered = (): void => {
    if (this.sceneCreated && !this.loadingFailed) this.reportLoading('ready', 1);
  };

  private readonly startSceneTransition = (targetScene: string, targetSpawn?: string): void => {
    if (this.sceneTransition.isPlaying()) {
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
    this.load.off(Phaser.Loader.Events.PROGRESS, this.handleLoadProgress);
    this.load.off(Phaser.Loader.Events.COMPLETE, this.handleLoadComplete);
    this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, this.handleLoadError);
    this.game.events.off(Phaser.Core.Events.POST_RENDER, this.handleSceneRendered);
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.handleShutdown, this);

    gameEvents.off(GameEvents.LOCK_PLAYER, this.lockPlayer);

    gameEvents.off(GameEvents.UNLOCK_PLAYER, this.unlockPlayer);

    this.onSceneShutdown();

    this.inputController?.destroy();

    this.interactionManager?.destroy();

    this.ambientAudioManager?.destroy();

    this.sceneTransition?.destroy();
  }
}
