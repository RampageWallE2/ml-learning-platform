import { Type } from '@angular/core';
import Phaser from 'phaser';
import { gameEvents, GameEvents } from '../events/game-events';


type TiledProperty = {
  name: string;
  value: string | number | boolean;
};

type WorldTilesets = {
    terrain: Phaser.Tilemaps.Tileset;
    propsBuildings: Phaser.Tilemaps.Tileset;
    trees: Phaser.Tilemaps.Tileset;
    crops: Phaser.Tilemaps.Tileset;
    fences: Phaser.Tilemaps.Tileset;

    
    water_1: Phaser.Tilemaps.Tileset;
    city_terrain: Phaser.Tilemaps.Tileset;
    city_terrains_global: Phaser.Tilemaps.Tileset;
    well : Phaser.Tilemaps.Tileset;
    // city_props: Phaser.Tilemaps.Tileset;
    
    office: Phaser.Tilemaps.Tileset;
    generic_buildings: Phaser.Tilemaps.Tileset;
    fire_station: Phaser.Tilemaps.Tileset;
    garden: Phaser.Tilemaps.Tileset;
    villas: Phaser.Tilemaps.Tileset
    police_station: Phaser.Tilemaps.Tileset

    cow_big_white: Phaser.Tilemaps.Tileset
    dog_german_shepherd_dark_brown: Phaser.Tilemaps.Tileset
    dogshouse: Phaser.Tilemaps.Tileset
    rabbit_white: Phaser.Tilemaps.Tileset
    rooster_golden: Phaser.Tilemaps.Tileset
    
    
    character_postman_3: Phaser.Tilemaps.Tileset
    farmer_1_chopping: Phaser.Tilemaps.Tileset
    farmer_1: Phaser.Tilemaps.Tileset
    farmer_2: Phaser.Tilemaps.Tileset
    worker_helmet: Phaser.Tilemaps.Tileset
    
    worksite_props: Phaser.Tilemaps.Tileset

    military_base: Phaser.Tilemaps.Tileset
    beach: Phaser.Tilemaps.Tileset
    city_props: Phaser.Tilemaps.Tileset
    character_postman_1: Phaser.Tilemaps.Tileset
    garage_sales: Phaser.Tilemaps.Tileset
    vehicles: Phaser.Tilemaps.Tileset
    subway_and_train_station: Phaser.Tilemaps.Tileset

    

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
    private mobileDirection = new Phaser.Math.Vector2(0, 0);

    private joystickBase?: Phaser.GameObjects.Arc;
    private joystickKnob?: Phaser.GameObjects.Arc;
    private joystickZone?: Phaser.GameObjects.Zone;

    private joystickPointerId: number | null = null;

    private readonly joystickRadius = 45;
    
    private mobileInteractButton?: Phaser.GameObjects.Arc;
    private mobileInteractText?: Phaser.GameObjects.Text;
    
    constructor() {
        super('WorldScene');
    }

    private controlCenterInterior?: Phaser.GameObjects.Zone;

    private controlCenterRoof?:
        Phaser.Tilemaps.TilemapLayer |
        Phaser.Tilemaps.TilemapGPULayer;

    private isInsideControlCenter = false;


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
        this.load.image('trees', 'assets/game/tilesets/vegetation/trees.png')
        this.load.image('propsBuildings', 'assets/game/tilesets/buildings/propsBuildings.png')
        this.load.image('crops', 'assets/game/tilesets/crops/crops.png')
        this.load.image('fences', 'assets/game/tilesets/fences/fences.png')

        this.load.image('office', 'assets/game/tilesets/buildings/office.png')
        this.load.image('generic_buildings', 'assets/game/tilesets/buildings/generic_buildings.png')
        this.load.image('fire_station', 'assets/game/tilesets/buildings/fire_station.png')
        this.load.image('garden', 'assets/game/tilesets/buildings/garden.png')
        this.load.image('villas', 'assets/game/tilesets/buildings/villas.png')
        this.load.image('police_station', 'assets/game/tilesets/buildings/police_station.png')
        
        this.load.image('water_1', 'assets/game/tilesets/terrain/water/water_1.png')
        this.load.image('city_terrain', 'assets/game/tilesets/terrain/city_terrain.png')
        this.load.image('city_terrains_global', 'assets/game/tilesets/terrain/city_terrains_global.png')
        
        
        this.load.image('cow_big_white', 'assets/game/tilesets/animals/cow_big_white.png')
        this.load.image('dog_german_shepherd_dark_brown', 'assets/game/tilesets/animals/dog_german_shepherd_dark_brown.png')
        this.load.image('dogshouse', 'assets/game/tilesets/animals/dogshouse.png')
        this.load.image('rabbit_white', 'assets/game/tilesets/animals/rabbit_white.png')
        this.load.image('rooster_golden', 'assets/game/tilesets/animals/rooster_golden.png')
        
        this.load.image('character_postman_3', 'assets/game/characters/character_postman_3.png')
        this.load.image('farmer_1_chopping', 'assets/game/characters/farmer_1_chopping.png')
        this.load.image('farmer_1', 'assets/game/characters/farmer_1.png')
        this.load.image('farmer_2', 'assets/game/characters/farmer_2.png')
        this.load.image('worker_helmet', 'assets/game/characters/worker_helmet.png')
        
        this.load.image('well', 'assets/game/tilesets/props/well.png')
        this.load.image('worksite_props', 'assets/game/tilesets/props/worksite_props.png')
        
        this.load.image('military_base', 'assets/game/tilesets/buildings/military_base.png')
        this.load.image('beach', 'assets/game/tilesets/props/beach.png')
        this.load.image('city_props', 'assets/game/tilesets/props/city_props.png')
        this.load.image('character_postman_1', 'assets/game/characters/character_postman_1.png')
        this.load.image('garage_sales', 'assets/game/tilesets/buildings/garage_sales.png')
        this.load.image('vehicles', 'assets/game/tilesets/vehicles/vehicles.png')
        this.load.image('subway_and_train_station', 'assets/game/tilesets/props/subway_and_train_station.png')
        

        this.load.tilemapTiledJSON('world', 'assets/game/maps/world.tmj')

    }

    private createTilesets(map: Phaser.Tilemaps.Tilemap) : WorldTilesets{

        const terrain = map.addTilesetImage('terrain', 'terrain');
        const propsBuildings = map.addTilesetImage('propsBuildings', 'propsBuildings');
        const trees = map.addTilesetImage('trees', 'trees');
        const crops = map.addTilesetImage('crops', 'crops');
        const fences = map.addTilesetImage('fences', 'fences');

        const water_1 = map.addTilesetImage('water_1', 'water_1');
        const city_terrain = map.addTilesetImage('city_terrain', 'city_terrain');
        const city_terrains_global = map.addTilesetImage('city_terrains_global', 'city_terrains_global');
        
        const office = map.addTilesetImage('office', 'office');
        const generic_buildings = map.addTilesetImage('generic_buildings', 'generic_buildings');
        const fire_station = map.addTilesetImage('fire_station', 'fire_station');
        const garden = map.addTilesetImage('garden', 'garden');

        const villas = map.addTilesetImage('villas', 'villas');
        const police_station = map.addTilesetImage('police_station', 'police_station');        
        
        const cow_big_white = map.addTilesetImage('cow_big_white', 'cow_big_white');        
        const dog_german_shepherd_dark_brown = 
        map.addTilesetImage('dog_german_shepherd_dark_brown', 'dog_german_shepherd_dark_brown');        
        const dogshouse = map.addTilesetImage('dogshouse', 'dogshouse');        
        const rabbit_white = map.addTilesetImage('rabbit_white', 'rabbit_white');        
        const rooster_golden = map.addTilesetImage('rooster_golden', 'rooster_golden');        
        
        const character_postman_3 = map.addTilesetImage('character_postman_3', 'character_postman_3');       
        const farmer_1_chopping = map.addTilesetImage('farmer_1_chopping', 'farmer_1_chopping');       
        const farmer_1 = map.addTilesetImage('farmer_1', 'farmer_1');       
        const farmer_2 = map.addTilesetImage('farmer_2', 'farmer_2');       
        const worker_helmet = map.addTilesetImage('worker_helmet', 'worker_helmet');       
        
        const worksite_props = map.addTilesetImage('worksite_props', 'worksite_props');       
        
        const military_base = map.addTilesetImage('military_base', 'military_base');      
        const beach = map.addTilesetImage('beach', 'beach');      
        const city_props = map.addTilesetImage('city_props', 'city_props');      
        const character_postman_1 = map.addTilesetImage('character_postman_1', 'character_postman_1');      
        const garage_sales = map.addTilesetImage('garage_sales', 'garage_sales');      
        const vehicles = map.addTilesetImage('vehicles', 'vehicles');      
        const subway_and_train_station = map.addTilesetImage('subway_and_train_station', 'subway_and_train_station');      


        const well = map.addTilesetImage('well', 'well');       
        
        if (
            !terrain || !propsBuildings || !trees || !fences || 
            !crops || !water_1 || !city_terrains_global || !city_terrain ||
            !office || !generic_buildings || !fire_station || !garden || 
            !villas || !police_station || !cow_big_white || !dog_german_shepherd_dark_brown ||
            !dogshouse || !rabbit_white || !rooster_golden || !character_postman_3 ||
            !farmer_1_chopping || !farmer_1 || !farmer_2 || !worker_helmet || !well || 
            !worksite_props || !military_base || !beach || !city_props || !character_postman_1 ||
            !garage_sales || !vehicles || !subway_and_train_station
        ) {
            throw new Error('No se pudo crear la capa water');
        }
        return {
            terrain, propsBuildings, trees, crops, fences, 
            water_1, city_terrains_global, city_terrain,
            office, generic_buildings, fire_station, garden,
            villas, police_station, cow_big_white, dog_german_shepherd_dark_brown,
            dogshouse, rabbit_white, rooster_golden, character_postman_3, farmer_1_chopping,
            farmer_1, farmer_2, worker_helmet, well, worksite_props, military_base, beach,
            city_props, character_postman_1, garage_sales, vehicles, subway_and_train_station
        }
    };

    private createMapLayers( map: Phaser.Tilemaps.Tilemap, tiles: WorldTilesets): Phaser.Tilemaps.TilemapLayer {

        
        map.createLayer('Terrain/Ground', [
            tiles.terrain,
            tiles.city_terrains_global
        ]).setDepth(0);

        map.createLayer('Terrain/Paths', [
            tiles.terrain,
        ]).setDepth(0);

        map.createLayer('Terrain/Beach', [ 
            tiles.beach,
            tiles.city_terrains_global,
            // tiles.terrain
        ]).setDepth(4);

        map.createLayer('Terrain/Road', [
            tiles.city_terrain,
        ]).setDepth(1);
        
        map.createLayer('Terrain/Road_Details', [
            tiles.city_terrain,
            tiles.city_props
        ]).setDepth(5);

        map.createLayer('Terrain/Farmland', [
            tiles.terrain,
        ]).setDepth(0);

        map.createLayer('Terrain/Ground_Details', [
            tiles.propsBuildings,
            tiles.worksite_props,
            tiles.propsBuildings
        ]).setDepth(0);
        
        map.createLayer('Terrain/Ground_Details_2', [
            tiles.propsBuildings
        ]
        ).setDepth(2);
        
        map.createLayer('Entities/Animals', [
            tiles.cow_big_white,
            tiles.dog_german_shepherd_dark_brown, 
            tiles.dogshouse,
            tiles.rabbit_white,
            tiles.rooster_golden,
        ]
        ).setDepth(3);

        map.createLayer('Entities/NPCs', [
            tiles.character_postman_3,
            tiles.farmer_1_chopping, 
            tiles.farmer_1,
            tiles.farmer_2
        ]
        ).setDepth(3);

        map.createLayer('Structures/Vehicles', [
            tiles.propsBuildings,
            tiles.worksite_props,
            tiles.vehicles
        ]
        ).setDepth(3);
        
        map.createLayer('Structures/Props', [
            tiles.propsBuildings,
            tiles.garden,
            tiles.well,
            tiles.worksite_props,
            tiles.military_base
        ]
        ).setDepth(4);
        map.createLayer('Structures/Props_2', [
            tiles.propsBuildings,
            tiles.worksite_props
        ]
        ).setDepth(4);
        map.createLayer('Structures/Props_3', [
            tiles.propsBuildings
        ]
        ).setDepth(4);
        
        map.createLayer('Structures/Buildings', [
            tiles.propsBuildings,
            tiles.office,
            tiles.generic_buildings,
            tiles.fire_station,
            tiles.garden, 
            tiles.villas,
            tiles.police_station,
            tiles.worksite_props,
            tiles.military_base,
            tiles.city_props
        ]
        ).setDepth(5);

        map.createLayer('Structures/Fences', [
            tiles.fences,
            tiles.worksite_props,
            tiles.military_base,
            tiles.city_terrains_global
        ]
        ).setDepth(4);

        map.createLayer('Structures/ControlCenterInterior', [
            tiles.character_postman_1,
            tiles.garage_sales,
            tiles.propsBuildings
        ]).setDepth(10);
        
        map.createLayer('Structures/ControlCenterInterior_2', [
            tiles.vehicles,
            tiles.garage_sales,
            tiles.propsBuildings,
            tiles.subway_and_train_station
        ]).setDepth(10);
        
        map.createLayer('Nature/Forest_Walls', [
            tiles.trees
        ]
        ).setDepth(7)
        
        map.createLayer('Nature/Trees', [
            tiles.trees,
        ]
        ).setDepth(14)

        map.createLayer('Nature/Bushes', [
            tiles.garden,
        ]
        ).setDepth(2)
        
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

        map.createLayer('Upper/Trees', [
            tiles.trees
        ]
        ).setDepth(20)

        const controlCenterRoof = map.createLayer('Upper/ControlCenterRoof', [
            tiles.military_base
        ]).setDepth(50)


        if (!controlCenterRoof) {
            throw new Error('No se pudo crear ControlCenterRoof');
        }

        this.controlCenterRoof = controlCenterRoof;
    
        const waterLayer = map.createLayer(
            'Terrain/Water',
            [tiles.water_1]
        ).setDepth(1);

        map.createLayer(
            'Terrain/Water_Details',
            [tiles.city_terrains_global]
        ).setDepth(1);

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


    private handlerInteractions(): void {

    if (this.isPlayerLocked) {
        this.currentInteraction = null;
        this.interactionText.setVisible(false);
        this.updateMobileInteractButtonState();
        return;
    }

    this.currentInteraction = null;
    this.interactionText.setVisible(false);

    for (const zone of this.interactionZones) {

        if (this.physics.overlap(this.player, zone)) {

            this.currentInteraction = zone;

            this.interactionText
                .setPosition(
                    this.player.x - 40,
                    this.player.y - 45
                )
                .setVisible(true);

            break;
        }
    }

    this.updateMobileInteractButtonState();

    if (
        this.currentInteraction &&
        Phaser.Input.Keyboard.JustDown(this.interactionKey)
    ) {
        this.triggerInteraction();
    }
    }

    private triggerInteraction(): void {

        if (!this.currentInteraction) {
            return;
        }

        if (this.isPlayerLocked) {
            return;
        }

        const type =
            this.currentInteraction.getData('interactionType');

        console.log(
            'Interacción:',
            this.currentInteraction.getData('interactionName')
        );

        console.log('Tipo:', type);

        if (type === 'lesson') {

            const lesson = {
                lessonId:
                    this.currentInteraction.getData('lessonId'),

                step:
                    this.currentInteraction.getData('step')
            };

            console.log('Lección:', lesson);

            gameEvents.emit(
                GameEvents.OPEN_LESSON,
                lesson
            );
        }

        if (type === 'dialogue') {

            const dialogue = {
                npcId:
                    this.currentInteraction.getData('npcId'),

                dialogueId:
                    this.currentInteraction.getData('dialogueId')
            };

            console.log('Phaser emite:', dialogue);

            gameEvents.emit(
                GameEvents.OPEN_DIALOGUE,
                dialogue
            );
        }
    }

    private createMobileInteractButton(): void {

    this.mobileInteractButton = this.add.circle(
        0,
        0,
        40,
        0x000000,
        0.4
    );

    this.mobileInteractButton
        .setScrollFactor(0)
        .setDepth(1000)
        .setInteractive();


    this.mobileInteractText = this.add.text(
        0,
        0,
        'E',
        {
            fontSize: '24px',
            color: '#ffffff'
        }
    );

    this.mobileInteractText
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(1001);


    this.mobileInteractButton.on(
        'pointerdown',
        () => {
            this.triggerInteraction();
        }
    );

    // Lo coloca correctamente apenas se crea
    this.repositionMobileControls();
}

    private handlerMovement(): void {

    if (this.isPlayerLocked) {
        this.player.setVelocity(0, 0);
        return;
    }

    const speed = 250;

    let x = 0;
    let y = 0;

    // =========================
    // TECLADO
    // =========================

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

    // =========================
    // MÓVIL
    // =========================

    if (this.mobileDirection.lengthSq() > 0) {
        x = this.mobileDirection.x;
        y = this.mobileDirection.y;
    }

    // =========================
    // MOVIMIENTO
    // =========================

    this.direction.set(x, y);

    if (this.direction.lengthSq() > 0) {

        this.direction
            .normalize()
            .scale(speed);

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


private createMobileJoystick(): void {

    this.joystickBase = this.add.circle(
        0,
        0,
        55,
        0x000000,
        0.25
    );

    this.joystickBase
        .setScrollFactor(0)
        .setDepth(1000);


    this.joystickKnob = this.add.circle(
        0,
        0,
        25,
        0xffffff,
        0.55
    );

    this.joystickKnob
        .setScrollFactor(0)
        .setDepth(1001);


    this.joystickZone = this.add.zone(
        0,
        0,
        160,
        160
    );

    this.joystickZone
        .setScrollFactor(0)
        .setDepth(1002)
        .setInteractive();


    this.joystickZone.on(
        'pointerdown',
        (pointer: Phaser.Input.Pointer) => {

            this.joystickPointerId = pointer.id;

            this.updateMobileJoystick(pointer);
        }
    );


    this.input.on(
        'pointermove',
        (pointer: Phaser.Input.Pointer) => {

            if (pointer.id !== this.joystickPointerId) {
                return;
            }

            this.updateMobileJoystick(pointer);
        }
    );


    this.input.on(
        'pointerup',
        (pointer: Phaser.Input.Pointer) => {

            if (pointer.id !== this.joystickPointerId) {
                return;
            }

            this.resetMobileJoystick();
        }
    );


    // Posición inicial
    this.repositionMobileControls();


    // Si cambia el tamaño/orientación
    this.scale.on(
        'resize',
        this.repositionMobileControls,
        this
    );
}

// private repositionMobileControls(): void {

//     if (
//         !this.joystickBase ||
//         !this.joystickKnob ||
//         !this.joystickZone
//     ) {
//         return;
//     }

//     const width = this.scale.gameSize.width;
//     const height = this.scale.gameSize.height;

//     const joystickX = 90;
//     const joystickY = height - 90;

//     this.joystickBase.setPosition(
//         joystickX,
//         joystickY
//     );

//     this.joystickKnob.setPosition(
//         joystickX,
//         joystickY
//     );

//     this.joystickZone.setPosition(
//         joystickX,
//         joystickY
//     );

//     // Por si cambia el tamaño mientras lo estás tocando
//     this.mobileDirection.set(0, 0);
//     this.joystickPointerId = null;
// }


private repositionMobileControls(): void {

    const width = this.scale.gameSize.width;
    const height = this.scale.gameSize.height;


    // =========================
    // JOYSTICK
    // =========================

    if (
        this.joystickBase &&
        this.joystickKnob &&
        this.joystickZone
    ) {

        const joystickX = 90;
        const joystickY = height - 90;

        this.joystickBase.setPosition(
            joystickX,
            joystickY
        );

        this.joystickKnob.setPosition(
            joystickX,
            joystickY
        );

        this.joystickZone.setPosition(
            joystickX,
            joystickY
        );

        this.mobileDirection.set(0, 0);
        this.joystickPointerId = null;
    }


    // =========================
    // BOTÓN E
    // =========================

    if (
        this.mobileInteractButton &&
        this.mobileInteractText
    ) {

        const buttonX = width - 90;
        const buttonY = height - 90;

        this.mobileInteractButton.setPosition(
            buttonX,
            buttonY
        );

        this.mobileInteractText.setPosition(
            buttonX,
            buttonY
        );
    }
}

    private updateMobileJoystick(
        pointer: Phaser.Input.Pointer
    ): void {

        if (!this.joystickBase || !this.joystickKnob) {
            return;
        }

        const dx = pointer.x - this.joystickBase.x;
        const dy = pointer.y - this.joystickBase.y;

        const distance = Math.sqrt(
            dx * dx + dy * dy
        );

        // Zona muerta en el centro
        if (distance < 8) {

            this.mobileDirection.set(0, 0);

            this.joystickKnob.setPosition(
                this.joystickBase.x,
                this.joystickBase.y
            );

            return;
        }

        const normalizedX = dx / distance;
        const normalizedY = dy / distance;

        this.mobileDirection.set(
            normalizedX,
            normalizedY
        );

        const knobDistance = Math.min(
            distance,
            this.joystickRadius
        );

        this.joystickKnob.setPosition(
            this.joystickBase.x + normalizedX * knobDistance,
            this.joystickBase.y + normalizedY * knobDistance
        );
    }

    private resetMobileJoystick(): void {

        this.joystickPointerId = null;

        this.mobileDirection.set(0, 0);

        if (!this.joystickBase || !this.joystickKnob) {
            return;
        }

        this.joystickKnob.setPosition(
            this.joystickBase.x,
            this.joystickBase.y
        );
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

    private isMobileDevice(): boolean {

        const hasTouch =
            this.sys.game.device.input.touch ||
            navigator.maxTouchPoints > 0;

        const coarsePointer =
            window.matchMedia('(pointer: coarse)').matches;

        return hasTouch && coarsePointer;
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


    private createInteriorZones(map: Phaser.Tilemaps.Tilemap): void {

        const objectLayer = map.getObjectLayer('InteriorZones');

        if (!objectLayer) {
            throw new Error('No existe InteriorZones');
        }

        const interiorObject = objectLayer.objects.find(
            object => object.name === 'control-center-interior'
        );

        if (!interiorObject) {
            throw new Error(
                'No existe control-center-interior en Tiled'
            );
        }

        const x = interiorObject.x ?? 0;
        const y = interiorObject.y ?? 0;
        const width = interiorObject.width ?? 0;
        const height = interiorObject.height ?? 0;

        this.controlCenterInterior = this.add.zone(
            x + width / 2,
            y + height / 2,
            width,
            height,
        );

        this.add.rectangle(
        x + width / 2,
        y + height / 2,
        width,
        height,
        0xff0000,
        0.3
    );
    }


    private updateControlCenterInterior(): void {

        if (!this.controlCenterInterior) {
            return;
        }

        const playerBounds = this.player.getBounds();
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

    private updateMobileInteractButtonState(): void {
        
        if (
            !this.mobileInteractButton ||
            !this.mobileInteractText
        ) {
            return;
        }

        const isActive =
            this.currentInteraction !== null &&
            !this.isPlayerLocked;

        // Apariencia
        this.mobileInteractButton.setAlpha(
            isActive ? 1 : 0.0
        );

        this.mobileInteractText.setAlpha(
            isActive ? 1 : 0.0
        );

        // Activar / desactivar realmente el botón
        if (this.mobileInteractButton.input) {
            this.mobileInteractButton.input.enabled = isActive;
        }
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

    const map = this.createMap();

    const tilesets = this.createTilesets(map);
    const waterLayer = this.createMapLayers(map, tilesets);
    this.createPlayer(map);
    this.createPlayerAnimations();


    if (this.isMobileDevice()) {
        this.createMobileJoystick();
        this.createMobileInteractButton();
    }

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

    this.createInteriorZones(map);

}

    override update(): void {
        this.handlerMovement();
        this.handlerInteractions();
        this.updateControlCenterInterior();

    }
}