import { Type } from '@angular/core';
import Phaser from 'phaser';
import { gameEvents, GameEvents } from '../events/game-events';


type TiledProperty = {
  name: string;
  value: string | number | boolean;
};

type WorldTilesets = {
    terrain: Phaser.Tilemaps.Tileset;
    orangeTree: Phaser.Tilemaps.Tileset;
    propsBuildings: Phaser.Tilemaps.Tileset;
    trees: Phaser.Tilemaps.Tileset;
    crops: Phaser.Tilemaps.Tileset;
    fences: Phaser.Tilemaps.Tileset;
}

export class WorldScene extends Phaser.Scene {

    private player!: Phaser.Physics.Arcade.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private interactionKey! : Phaser.Input.Keyboard.Key;
    private currentInteraction: Phaser.GameObjects.Zone | null = null;
    private interactionText! : Phaser.GameObjects.Text;
    private readonly direction = new Phaser.Math.Vector2();         
    private lastDirection: 'down' | 'up' | 'left' | 'right' = 'down';   
    private interactionZones: Phaser.GameObjects.Zone[] = [];
    private isPlayerLocked = false;

    constructor() {
        super('WorldScene');
    }


    private readonly lockPlayer = (): void => {
    this.isPlayerLocked = true;
    this.player.setVelocity(0, 0);
    };

    private readonly unlockPlayer = (): void => {
    this.isPlayerLocked = false;
    };

    preload(): void {
        this.load.spritesheet('player', 'assets/game/characters/character2.png', {frameWidth: 32, frameHeight:32})

        this.load.image('terrain', 'assets/game/tilesets/terrain/terrain.png')
        this.load.image('orangeTree', 'assets/game/tilesets/vegetation/orangeTree.png')
        this.load.image('trees', 'assets/game/tilesets/vegetation/trees.png')
        this.load.image('propsBuildings', 'assets/game/tilesets/buildings/propsBuildings.png')
        this.load.image('crops', 'assets/game/tilesets/crops/crops.png')
        this.load.image('fences', 'assets/game/tilesets/fences/fences.png')
        this.load.tilemapTiledJSON('world', 'assets/game/maps/world.tmj')

    }

    private createTilesets(map: Phaser.Tilemaps.Tilemap) : WorldTilesets{

        const terrain = map.addTilesetImage('terrain', 'terrain');
        const orangeTree = map.addTilesetImage('orangeTree', 'orangeTree');
        const propsBuildings = map.addTilesetImage('propsBuildings', 'propsBuildings');
        const trees = map.addTilesetImage('trees', 'trees');
        const crops = map.addTilesetImage('crops', 'crops');
        const fences = map.addTilesetImage('fences', 'fences');
        

        if (
            !terrain || !orangeTree || !propsBuildings || !trees || !fences || !crops
        ) {
            throw new Error('No se pudo crear la capa water');
        }
        return {
            terrain, orangeTree, propsBuildings, trees, crops, fences
        }
    };

    private createMapLayers( map: Phaser.Tilemaps.Tilemap, tiles: WorldTilesets): Phaser.Tilemaps.TilemapLayer {

        map.createLayer('Terrain/Ground', [
            tiles.terrain,
        ]).setDepth(0);

        map.createLayer('Terrain/Paths', [
            tiles.terrain,
        ]).setDepth(0);

        map.createLayer('Terrain/Farmland', [
            tiles.terrain,
        ]).setDepth(0);

        map.createLayer('Terrain/Ground_Details', [
            tiles.propsBuildings
        ]).setDepth(1);
        
        map.createLayer('Terrain/Ground_Details_2', [
            tiles.propsBuildings
        ]
        ).setDepth(2);
        
        map.createLayer('Structures/Vehicles', [
            tiles.propsBuildings
        ]
        ).setDepth(3);
        
        map.createLayer('Structures/Props', [
            tiles.propsBuildings
        ]
        ).setDepth(4);
        map.createLayer('Structures/Props_2', [
            tiles.propsBuildings
        ]
        ).setDepth(4);
        map.createLayer('Structures/Props_3', [
            tiles.propsBuildings
        ]
        ).setDepth(4);
        map.createLayer('Structures/Buildings', [
            tiles.propsBuildings
        ]
        ).setDepth(3);
        map.createLayer('Structures/Fences', [
            tiles.fences
        ]
        ).setDepth(4);

        map.createLayer('Nature/Forest_Walls', [
            tiles.trees
        ]
        ).setDepth(6)
        
        map.createLayer('Nature/Trees', [
            tiles.trees,
        ]
        ).setDepth(14)
        
        map.createLayer('Nature/Trees_2', [
            tiles.trees,
        ]
        ).setDepth(14)
        
        map.createLayer('Nature/Crops', [
            tiles.crops,
            tiles.propsBuildings
        ]
        ).setDepth(15)
 
        map.createLayer('Nature/Crops_2', [
            tiles.crops,
            tiles.propsBuildings
        ]
        ).setDepth(16)

        map.createLayer('Nature/Forest_Walls_2', [
            tiles.trees
        ]
        ).setDepth(7)
        
        map.createLayer('Nature/Forest_Walls_3', [
            tiles.trees
        ]
        ).setDepth(8)

        map.createLayer('Nature/Forest_Walls_4', [
            tiles.trees
        ]
        ).setDepth(9)

        map.createLayer('Nature/Forest_Walls_5', [
            tiles.trees
        ]
        ).setDepth(10)
                
        const waterLayer = map.createLayer(
            'Terrain/Water',
            [tiles.terrain],
            0,
            0,
            false
        );

        if (!(waterLayer instanceof Phaser.Tilemaps.TilemapLayer)) {
            throw new Error('No se pudo crear la capa Water como TilemapLayer');
        }

        return waterLayer;
    }

    private createMap(): Phaser.Tilemaps.Tilemap {
        return this.make.tilemap({
            key: 'world'
        })
    }

    private createMapCollisions(map: Phaser.Tilemaps.Tilemap): Phaser.GameObjects.Zone[] {
        const collisionLayer = map.getObjectLayer('Collision');
        
        if (!collisionLayer) {
            throw new Error('No se encontro la capa Collision')
        }
        const zones : Phaser.GameObjects.Zone[] = [];

        collisionLayer.objects.forEach(object => {
            const width = object.width ?? 0;
            const height = object.height ?? 0;

            if (
                object.x === undefined ||
                object.y === undefined ||
                width <= 0 ||
                height <= 0
            ) {
                return;
            };

            const zone = this.add.zone(
                object.x + width / 2,
                object.y + height / 2,
                width,
                height
            )

            this.physics.add.existing(zone, true);
            zones.push(zone)
        })

        return zones


    }

    private createInteractions(map: Phaser.Tilemaps.Tilemap): Phaser.GameObjects.Zone[] {

        const interactionLayer = map.getObjectLayer('Interactions');

        const lesson = interactionLayer?.objects[0];

        console.log({
        name: lesson?.name,
        x: lesson?.x,
        y: lesson?.y,
        width: lesson?.width,
        height: lesson?.height
        });

        if (!interactionLayer) {
            throw new Error('No se encontró la capa Interactions');
        }

        const zones: Phaser.GameObjects.Zone[] = [];

        interactionLayer.objects.forEach(object => {

            const width = object.width ?? 0;
            const height = object.height ?? 0;

            if (
            object.x === undefined ||
            object.y === undefined ||
            width <= 0 ||
            height <= 0
            ) {
            return;
            }

            const zone = this.add.zone(
            object.x + width / 2,
            object.y + height / 2,
            width,
            height
            );

            const getProperty = (name: string) =>
            object.properties?.find(
                (property: TiledProperty) => property.name === name
            )?.value;
                

            zone.setData('interactionName', object.name ?? '');

            zone.setData('interactionType', getProperty('interactionType'));

            zone.setData(
                'lessonId',
                getProperty('lessonId')
            );

            zone.setData(
                'step',
                getProperty('step')
            )

            zone.setData('npcId', getProperty('npcId'));

            zone.setData('dialogueId', getProperty('dialogueId'));

            this.physics.add.existing(zone, true);

            zones.push(zone);
        });

        return zones;
    }

    private createPlayerAnimations() : void 
    {
        this.anims.create({
            key: 'still',
            frames: this.anims.generateFrameNumbers('player', {
            start: 0,
            end: 1
            }),
            frameRate: 5,
            repeat: -1
        });

        this.anims.create({
            key: 'still-up',
            frames: this.anims.generateFrameNumbers('player', {
            start: 24,
            end: 25
            }),
            frameRate: 5,
            repeat: -1
        });

        this.anims.create({
            key: 'still-side',
            frames: this.anims.generateFrameNumbers('player', {
            start: 12,
            end: 13
            }),
            frameRate: 5,
            repeat: -1
        });

        this.anims.create({
            key: 'walk-down',
            frames: this.anims.generateFrameNumbers('player', {
            start: 6,
            end: 11
            }),
            frameRate: 6,
            repeat: -1
        });

        this.anims.create({
            key: 'walk-side',
            frames: this.anims.generateFrameNumbers('player', {
            start: 18,
            end: 23
            }),
            frameRate: 6,
            repeat: -1
        });

        this.anims.create({
            key: 'walk-up',
            frames: this.anims.generateFrameNumbers('player', {
            start: 30,
            end: 35
            }),
            frameRate: 6,
            repeat: -1
        });

    }

    private playWalkAnimation(x: number, y: number): void {
        if (y < 0) {
            this.player.setFlipX(false);
            this.player.anims.play('walk-up', true);
            this.lastDirection = 'up';

        } else if (y > 0) {
            this.player.setFlipX(false);
            this.player.anims.play('walk-down', true);
            this.lastDirection = 'down';

        } else if (x < 0) {
            this.player.setFlipX(true);
            this.player.anims.play('walk-side', true);
            this.lastDirection = 'left';

        } else if (x > 0) {
            this.player.setFlipX(false);
            this.player.anims.play('walk-side', true);
            this.lastDirection = 'right';
        }
    }

    private handlerInteractions() : void {

        if (this.isPlayerLocked) {
            this.interactionText.setVisible(false);
            return;
        }
        this.currentInteraction = null;
        this.interactionText.setVisible(false);


        for (const zone of this.interactionZones) {

            if (this.physics.overlap(this.player, zone)) {

                this.currentInteraction = zone

                this.interactionText
                .setPosition(
                    this.player.x - 40,
                    this.player.y - 45
                )
                .setVisible(true);

                break;
            }
        }
   
        if ( this.currentInteraction && Phaser.Input.Keyboard.JustDown(this.interactionKey)) {

            const type = this.currentInteraction.getData('interactionType');
                console.log('Interacción:', this.currentInteraction.getData('interactionName'));
                console.log('Tipo:', type);

                if (type === 'lesson') {

                    const lesson = {
                        lessonId : this.currentInteraction.getData('lessonId'),
                        step : this.currentInteraction.getData('step')
                    }
                    
                    console.log('Leccion ', lesson);

                    gameEvents.emit(
                        GameEvents.OPEN_LESSON,
                        lesson
                    );
                }

                if (type === 'dialogue') {
                    const dialogue  = {
                        npcId : this.currentInteraction.getData('npcId'),
                        dialogueId : this.currentInteraction.getData('dialogueId')
                    }
                    console.log('Phaser emite', dialogue)
                    gameEvents.emit(
                        GameEvents.OPEN_DIALOGUE,
                        dialogue
                    )

                }
            }
    }

    private handlerMovement() : void {
        
        if (this.isPlayerLocked) {
            this.player.setVelocity(0, 0);
            return;
        }

        const speed = 200;

        let x = 0;
        let y = 0;

        if (this.cursors.left.isDown) {
            x = -1;
        }

        if (this.cursors.right.isDown) {
            x = 1;
        }

        if (this.cursors.up.isDown) {
            y = -1;
        }

        if (this.cursors.down.isDown) {
            y = 1;
        }

        this.direction.set(x, y);

        if (this.direction.lengthSq() > 0) {
            this.direction.normalize().scale(speed);

            this.player.setVelocity(
            this.direction.x,
            this.direction.y
            );

            this.playWalkAnimation(x, y);

        } else {
            this.player.setVelocity(0, 0);

            this.playIdleAnimation();
        }
    }

    private playIdleAnimation(): void {
        switch (this.lastDirection) {

            case 'down':
            this.player.setFlipX(false);
            this.player.anims.play('still', true);
            break;

            case 'up':
            this.player.setFlipX(false);
            this.player.anims.play('still-up', true);
            break;

            case 'left':
            this.player.setFlipX(true);
            this.player.anims.play('still-side', true);
            break;

            case 'right':
            this.player.setFlipX(false);
            this.player.anims.play('still-side', true);
            break;
        }
    }



    private createPlayer(map: Phaser.Tilemaps.Tilemap): void {
        const spawnLayer = map.getObjectLayer('SpawnPoints');

        const playerSpawn = spawnLayer?.objects.find(
            object => object.name === 'player-start'
        );

        if (
            !playerSpawn ||
            playerSpawn.x === undefined ||
            playerSpawn.y === undefined
        ) {
            throw new Error('No se encontró player-start');
        }

        this.player = this.physics.add.sprite(
            playerSpawn.x,
            playerSpawn.y,
            'player',
            0
        );

        
        this.player.setCollideWorldBounds(true);
        this.player.setBodySize(16, 10);
        this.player.setOffset(8, 20);
        this.player.setDepth(12)
        console.log('Player:', this.player.depth);
    }



    private setupInput() : void{
        this.cursors = this.input.keyboard!.createCursorKeys();

        this.interactionKey = this.input.keyboard!.addKey(
            Phaser.Input.Keyboard.KeyCodes.E
        );
    }

    private setupCamera(map: Phaser.Tilemaps.Tilemap): void{
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.startFollow(this.player);
    }

    private setCollisions(map: Phaser.Tilemaps.Tilemap, water: Phaser.Tilemaps.TilemapLayer): void{
        const collisionZones = this.createMapCollisions(map);
        
        this.physics.add.collider(
            this.player,
            collisionZones
        );
        
        this.physics.world.setBounds(
            0,
            0,
            map.widthInPixels,
            map.heightInPixels
        );

    }

    private setupInteractionUI ():void {
        this.interactionText = this.add.text(
            0,
            0,
            'Presiona E',
            {
            fontSize: '18px',
            color: '#ffffff',
            backgroundColor: '#000000'
            }
        );
        
        this.interactionText
            .setVisible(false)
            .setDepth(1000);
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

    const map = this.createMap();

    const tilesets = this.createTilesets(map);
    const waterLayer = this.createMapLayers(map, tilesets);
    this.createPlayer(map);
    this.createPlayerAnimations();

    //PLAYER

    // INTERACCIONES
    this.interactionZones = this.createInteractions(map);

    // COLISIONES
    this.setCollisions(map, waterLayer);

    // INPUT
    this.setupInput();

    // INTERACCIONES
    this.setupInteractionUI();

    // CÁMARA
    this.setupCamera(map);
}

    override update(): void {
        this.handlerMovement();
        this.handlerInteractions();
    }
}