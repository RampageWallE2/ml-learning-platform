import Phaser from 'phaser';
import { gameEvents, GameEvents } from '../events/game-events';
import { InputController } from '../../../../core/input/input.controller';
import { PlayerController } from '../../../../core/player/player.controller';
import {
  createStaticZonesFromLayer,
  findSpawnPoint,
  getObjectLayerOrThrow,
  getTiledRectangle
} from '../../../../core/tiled/tiled.utils';
import { InteractionManager } from '../../../../core/interactions/interaction.manager';


import { preloadTilemap } from '../tiled/tilemap.builder';
import { WORLD_MAP_CONFIG } from './world.map.config';
import { buildTilemap } from '../tiled/tilemap.builder';

export class WorldScene extends Phaser.Scene {

    private readonly direction = new Phaser.Math.Vector2();         

    private interactionManager! : InteractionManager;
    private inputController!: InputController;
    private playerController! : PlayerController;

    constructor() {
        super('WorldScene');
    }

    private controlCenterInterior?: Phaser.GameObjects.Zone;

    private controlCenterRoof?:
        Phaser.Tilemaps.TilemapLayer |
        Phaser.Tilemaps.TilemapGPULayer;

    private isInsideControlCenter = false;

    private handleShutdown(): void {

        gameEvents.off(
            GameEvents.LOCK_PLAYER,
            this.lockPlayer
        );


        gameEvents.off(
            GameEvents.UNLOCK_PLAYER,
            this.unlockPlayer
        );

        this.inputController?.destroy();
        
        this.interactionManager?.destroy();
    }

    private readonly lockPlayer = (): void => {

        this.playerController?.lock();


        this.inputController?.reset();


        this.inputController?.setInteractAvailable(false);
    };

    private readonly unlockPlayer = (): void => {
        this.playerController?.unlock();
    };

    preload(): void {

        /* =========================
            PLAYER
            ========================= */

        this.load.spritesheet(
            'player',
            'assets/game/characters/character2.png',
            {
            frameWidth: 32,
            frameHeight: 32
            }
        );


        /* =========================
            MAPA LEGACY
            ========================= */

        preloadTilemap(
            this,
            WORLD_MAP_CONFIG
        );
    }

    private createPlayerController(map: Phaser.Tilemaps.Tilemap): void {
        
        const spawn = findSpawnPoint(map);


        this.playerController = new PlayerController( this, {
                x: spawn.x,
                y: spawn.y,

                texture: 'player',

                speed: 250,

                depth: 12
            }
        );
    }

    private setupCamera(map: Phaser.Tilemaps.Tilemap): void{
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.startFollow(this.playerController.sprite);
    }

    private setCollisions( map: Phaser.Tilemaps.Tilemap): void {

        const collisionZones =
            createStaticZonesFromLayer(
            this,
            map,
            'Collision'
            );


        this.physics.add.collider(
            this.playerController.sprite,
            collisionZones
        );


        this.physics.world.setBounds(
            0,
            0,
            map.widthInPixels,
            map.heightInPixels
        );
    }



    private createInteriorZones( map: Phaser.Tilemaps.Tilemap ): void {

        const objectLayer = getObjectLayerOrThrow( map, 'InteriorZones');

        const interiorObject = objectLayer.objects.find(
            object =>
                object.name ===
                'control-center-interior'
            );


        if (!interiorObject) {

            throw new Error(
            'No existe control-center-interior en Tiled'
            );
        }


        const rectangle = getTiledRectangle( interiorObject );


        if (!rectangle) {

            throw new Error(
            'control-center-interior no tiene dimensiones válidas'
            );
        }


        this.controlCenterInterior =
            this.add.zone(
            rectangle.centerX,
            rectangle.centerY,
            rectangle.width,
            rectangle.height
            );
    }

    private updateControlCenterInterior(): void {

        if (!this.controlCenterInterior) {
            return;
        }

        const playerBounds = this.playerController.sprite.getBounds();
        const interiorBounds = this.controlCenterInterior.getBounds();

        const isInside = Phaser.Geom.Intersects.RectangleToRectangle(
            playerBounds,
            interiorBounds
        );

        if (isInside && !this.isInsideControlCenter) {
            console.log('ENTRÓ AL CENTRO DE CONTROL');

            this.controlCenterRoof?.setAlpha(0.15);
        }

        if (!isInside && this.isInsideControlCenter) {
            console.log('SALIÓ DEL CENTRO DE CONTROL');

            this.controlCenterRoof?.setAlpha(1);
        }

        this.isInsideControlCenter = isInside;
    }


    private enterControlCenter(): void {
        this.controlCenterRoof?.setVisible(false);
    }

    private exitControlCenter(): void {
        this.controlCenterRoof?.setVisible(true);
    }

    create(): void {

        gameEvents.on(
            GameEvents.LOCK_PLAYER,
            this.lockPlayer
        );


        gameEvents.on(
            GameEvents.UNLOCK_PLAYER,
            this.unlockPlayer
        );


        const { map, layers } = buildTilemap(this, WORLD_MAP_CONFIG);

        const controlCenterRoof = layers.get( 'Upper/ControlCenterRoof');

        if (!controlCenterRoof) {
            throw new Error(
                'No se encontró Upper/ControlCenterRoof'
            );
        }

        this.controlCenterRoof = controlCenterRoof;


        this.createPlayerController( map );

        this.inputController = new InputController( this);

        this.interactionManager = new InteractionManager( this, map, this.playerController.sprite);

        this.setCollisions(map);

        this.setupCamera(
            map
        );

        this.createInteriorZones(
            map
        );

        this.events.once(
            Phaser.Scenes.Events.SHUTDOWN,
            this.handleShutdown,
            this
        );
    }

    override update(): void {

        /* =========================
        INPUT
        ========================= */
        this.inputController.getDirection(this.direction);

        const interactRequested = this.inputController.consumeInteract();
        
        /* =========================
        PLAYER
        ========================= */
        this.playerController.update(this.direction);

        /* =========================
        INTERACCIONES
        ========================= */

        const interactionAvailable = this.interactionManager.update(interactRequested,this.playerController.isLocked());

        this.inputController.setInteractAvailable(interactionAvailable);

        /* =========================
        LEGACY
        ========================= */
        this.updateControlCenterInterior();

    }
}