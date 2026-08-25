import Phaser from 'phaser';

import { gameEvents, GameEvents } from '../features/world/game/events/game-events';

import { buildTilemap, preloadTilemap } from '../features/world/game/tiled/tilemap.builder';

import {
  TilemapBuildResult,
  TilemapSceneConfig,
} from '../features/world/game/tiled/tilemap-config.types';

import { InputController } from './input/input.controller';

import { InteractionManager } from './interactions/interaction.manager';

import { PlayerController } from './player/player.controller';

import { createStaticZonesFromLayer, findSpawnPoint } from './tiled/tiled.utils';

type SceneStartData = {
  spawnId?: string;
};

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

  protected playerController!: PlayerController;

  private spawnId = 'player-start';

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
    if (!this.textures.exists('player')) {
      this.load.spritesheet('player', 'assets/game/characters/character2.png', {
        frameWidth: 32,
        frameHeight: 32,
      });
    }

    preloadTilemap(this, this.mapConfig);
  }

  create(): void {
    gameEvents.on(GameEvents.LOCK_PLAYER, this.lockPlayer);

    gameEvents.on(GameEvents.UNLOCK_PLAYER, this.unlockPlayer);

    const buildResult = buildTilemap(this, this.mapConfig);

    this.createPlayerController(buildResult.map);

    this.inputController = new InputController(this);

    this.interactionManager = new InteractionManager(
      this,
      buildResult.map,
      this.playerController.sprite,
    );

    this.setupCollisions(buildResult.map);

    this.setupCamera(buildResult.map);

    this.onSceneCreated(buildResult);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  override update(): void {
    this.inputController.getDirection(this.direction);

    const interactRequested = this.inputController.consumeInteract();

    this.playerController.update(this.direction);

    const interactionAvailable = this.interactionManager.update(
      interactRequested,
      this.playerController.isLocked(),
    );

    this.inputController.setInteractAvailable(interactionAvailable);

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

  private createPlayerController(map: Phaser.Tilemaps.Tilemap): void {
    const spawn = findSpawnPoint(map, this.spawnId);

    this.playerController = new PlayerController(this, {
      x: spawn.x,
      y: spawn.y,
      texture: 'player',
      speed: 250,
      depth: 12,
    });
  }

  private setupCollisions(map: Phaser.Tilemaps.Tilemap): void {
    const collisionZones = createStaticZonesFromLayer(this, map, 'Collision');

    this.physics.add.collider(this.playerController.sprite, collisionZones);

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
  }

  private setupCamera(map: Phaser.Tilemaps.Tilemap): void {
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    this.cameras.main.startFollow(this.playerController.sprite);
  }

  private readonly lockPlayer = (): void => {
    this.playerController?.lock();

    this.inputController?.reset();

    this.inputController?.setInteractAvailable(false);
  };

  private readonly unlockPlayer = (): void => {
    this.playerController?.unlock();
  };

  private handleShutdown(): void {
    gameEvents.off(GameEvents.LOCK_PLAYER, this.lockPlayer);

    gameEvents.off(GameEvents.UNLOCK_PLAYER, this.unlockPlayer);

    this.onSceneShutdown();

    this.inputController?.destroy();

    this.interactionManager?.destroy();
  }
}
