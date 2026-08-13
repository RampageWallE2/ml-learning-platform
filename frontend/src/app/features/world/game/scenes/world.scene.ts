import { Type } from '@angular/core';
import Phaser from 'phaser';
import { gameEvents, GameEvents } from '../events/game-events';

type WorldTilesets = {
    trees: Phaser.Tilemaps.Tileset;
    shrub: Phaser.Tilemaps.Tileset;
    path: Phaser.Tilemaps.Tileset;
    water: Phaser.Tilemaps.Tileset;
    wood: Phaser.Tilemaps.Tileset;
    ruins: Phaser.Tilemaps.Tileset;
    mushrooms: Phaser.Tilemaps.Tileset;
    rocks: Phaser.Tilemaps.Tileset;
}

export class WorldScene extends Phaser.Scene {

    private player!: Phaser.Physics.Arcade.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private interactionKey! : Phaser.Input.Keyboard.Key;
    private currentInteraction : string | null = null;
    private interactionText! : Phaser.GameObjects.Text;
    private readonly direction = new Phaser.Math.Vector2();         
    private lastDirection: 'down' | 'up' | 'left' | 'right' = 'down';   
    private interactionZones: Phaser.GameObjects.Zone[] = [];

    constructor() {
        super('WorldScene');
    }

    preload(): void {
        this.load.spritesheet('player', 'assets/game/characters/character2.png', {frameWidth: 32, frameHeight:32})
        this.load.image('trees', 'assets/game/tilesets/trees.png');
        this.load.image('shrub', 'assets/game/tilesets/shrub.png');
        this.load.image('path', 'assets/game/tilesets/path.png');
        this.load.image('water', 'assets/game/tilesets/water.png');
        this.load.image('wood', 'assets/game/tilesets/wood.png');
        this.load.image('ruins', 'assets/game/tilesets/ruins.png');
        this.load.image('mushrooms', 'assets/game/tilesets/mushrooms.png')
        this.load.image('rocks', 'assets/game/tilesets/rocks.png')
        this.load.tilemapTiledJSON('world', 'assets/game/maps/world.tmj')

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

            zone.setData('interactionName', object.name ?? '');

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
        this.currentInteraction = null;
        this.interactionText.setVisible(false);


        for (const zone of this.interactionZones) {

            if (this.physics.overlap(this.player, zone)) {

                this.currentInteraction =
                zone.getData('interactionName');

                this.interactionText
                .setPosition(
                    this.player.x - 40,
                    this.player.y - 45
                )
                .setVisible(true);

                break;
            }
        }


        if (this.currentInteraction && Phaser.Input.Keyboard.JustDown(this.interactionKey)) {
            gameEvents.emit(
                GameEvents.OPEN_LESSON,
                this.currentInteraction
            );
        }
    }

    private handlerMovement() : void {
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

    private createTilesets(map: Phaser.Tilemaps.Tilemap) : WorldTilesets{

        const mushrooms = map.addTilesetImage('mushrooms','mushrooms');
        const ruins = map. addTilesetImage('ruins', 'ruins');
        const water = map.addTilesetImage('water', 'water');
        const trees = map.addTilesetImage('trees', 'trees');
        const shrub = map.addTilesetImage('shrub', 'shrub');
        const path = map.addTilesetImage('path', 'path');
        const rocks = map.addTilesetImage('rocks', 'rocks');
        const wood = map.addTilesetImage('wood', 'wood');

        if (
            !mushrooms || !ruins || !water || !trees || 
            !shrub || !path || !rocks || !wood
        ) {
            throw new Error('No se pudo crear la capa water');
        }
        
        return {
            mushrooms, ruins, water, trees, shrub, path, rocks, wood
        }
    };

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
        this.player.setDepth(10)
        console.log('Player:', this.player.depth);
    }

    private createMapLayers( map: Phaser.Tilemaps.Tilemap, tiles: WorldTilesets): Phaser.Tilemaps.TilemapLayer {

        map.createLayer('Ground', [
            tiles.trees,
            tiles.shrub,
            tiles.path
        ]);

        const waterLayer = map.createLayer(
            'Water',
            [tiles.water],
            0,
            0,
            false
        );

        if (!(waterLayer instanceof Phaser.Tilemaps.TilemapLayer)) {
            throw new Error('No se pudo crear la capa Water como TilemapLayer');
        }

        map.createLayer('Ornamental_plants', [
            tiles.mushrooms,
            tiles.trees
        ]);

        map.createLayer('Aquatic_plants', [
            tiles.water
        ]);

        map.createLayer('Path', [
            tiles.path,
            tiles.wood
        ]);

        map.createLayer('Rocks', [
            tiles.rocks,
            tiles.path
        ]);

        map.createLayer('Buildings', [
            tiles.ruins
        ]);

        const treesUpperLayer = map.createLayer('Trees_upper', [
            tiles.trees,
            tiles.wood
        ]);

        const treesLowerLayer = map.createLayer('Trees_lower', [
            tiles.trees,
            tiles.wood
        ]);
        const buildingsLowerLayer = map.createLayer('Buildings_lower', [
            tiles.ruins,
        ]);

        buildingsLowerLayer?.setDepth(11)
        treesUpperLayer?.setDepth(20)

        console.log('Trees upper:', treesUpperLayer?.depth);

        return waterLayer;
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