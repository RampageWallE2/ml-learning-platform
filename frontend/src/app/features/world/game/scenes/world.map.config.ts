import { TilemapSceneConfig } from "../tiled/tilemap-config.types";


export const WORLD_MAP_CONFIG = {

  /* =========================
     MAPA
     ========================= */

  mapKey: 'world',

  mapPath:
    'assets/game/maps/world.tmj',


  /* =========================
     TILESETS
     ========================= */

  tilesets: [

    {
      id: 'terrain',
      tiledName: 'terrain',
      textureKey: 'terrain',
      imagePath:
        'assets/game/tilesets/terrain/terrain.png'
    },

    {
      id: 'trees',
      tiledName: 'trees',
      textureKey: 'trees',
      imagePath:
        'assets/game/tilesets/vegetation/trees.png'
    },

    {
      id: 'propsBuildings',
      tiledName: 'propsBuildings',
      textureKey: 'propsBuildings',
      imagePath:
        'assets/game/tilesets/buildings/propsBuildings.png'
    },

    {
      id: 'crops',
      tiledName: 'crops',
      textureKey: 'crops',
      imagePath:
        'assets/game/tilesets/crops/crops.png'
    },

    {
      id: 'fences',
      tiledName: 'fences',
      textureKey: 'fences',
      imagePath:
        'assets/game/tilesets/fences/fences.png'
    },

    {
      id: 'office',
      tiledName: 'office',
      textureKey: 'office',
      imagePath:
        'assets/game/tilesets/buildings/office.png'
    },

    {
      id: 'generic_buildings',
      tiledName: 'generic_buildings',
      textureKey: 'generic_buildings',
      imagePath:
        'assets/game/tilesets/buildings/generic_buildings.png'
    },

    {
      id: 'fire_station',
      tiledName: 'fire_station',
      textureKey: 'fire_station',
      imagePath:
        'assets/game/tilesets/buildings/fire_station.png'
    },

    {
      id: 'garden',
      tiledName: 'garden',
      textureKey: 'garden',
      imagePath:
        'assets/game/tilesets/buildings/garden.png'
    },

    {
      id: 'villas',
      tiledName: 'villas',
      textureKey: 'villas',
      imagePath:
        'assets/game/tilesets/buildings/villas.png'
    },

    {
      id: 'police_station',
      tiledName: 'police_station',
      textureKey: 'police_station',
      imagePath:
        'assets/game/tilesets/buildings/police_station.png'
    },

    {
      id: 'water_1',
      tiledName: 'water_1',
      textureKey: 'water_1',
      imagePath:
        'assets/game/tilesets/terrain/water/water_1.png'
    },

    {
      id: 'city_terrain',
      tiledName: 'city_terrain',
      textureKey: 'city_terrain',
      imagePath:
        'assets/game/tilesets/terrain/city_terrain.png'
    },

    {
      id: 'city_terrains_global',
      tiledName: 'city_terrains_global',
      textureKey: 'city_terrains_global',
      imagePath:
        'assets/game/tilesets/terrain/city_terrains_global.png'
    },

    {
      id: 'cow_big_white',
      tiledName: 'cow_big_white',
      textureKey: 'cow_big_white',
      imagePath:
        'assets/game/tilesets/animals/cow_big_white.png'
    },

    {
      id: 'dog_german_shepherd_dark_brown',
      tiledName:
        'dog_german_shepherd_dark_brown',
      textureKey:
        'dog_german_shepherd_dark_brown',
      imagePath:
        'assets/game/tilesets/animals/dog_german_shepherd_dark_brown.png'
    },

    {
      id: 'dogshouse',
      tiledName: 'dogshouse',
      textureKey: 'dogshouse',
      imagePath:
        'assets/game/tilesets/animals/dogshouse.png'
    },

    {
      id: 'rabbit_white',
      tiledName: 'rabbit_white',
      textureKey: 'rabbit_white',
      imagePath:
        'assets/game/tilesets/animals/rabbit_white.png'
    },

    {
      id: 'rooster_golden',
      tiledName: 'rooster_golden',
      textureKey: 'rooster_golden',
      imagePath:
        'assets/game/tilesets/animals/rooster_golden.png'
    },

    {
      id: 'character_postman_3',
      tiledName: 'character_postman_3',
      textureKey: 'character_postman_3',
      imagePath:
        'assets/game/characters/character_postman_3.png'
    },

    {
      id: 'farmer_1_chopping',
      tiledName: 'farmer_1_chopping',
      textureKey: 'farmer_1_chopping',
      imagePath:
        'assets/game/characters/farmer_1_chopping.png'
    },

    {
      id: 'farmer_1',
      tiledName: 'farmer_1',
      textureKey: 'farmer_1',
      imagePath:
        'assets/game/characters/farmer_1.png'
    },

    {
      id: 'farmer_2',
      tiledName: 'farmer_2',
      textureKey: 'farmer_2',
      imagePath:
        'assets/game/characters/farmer_2.png'
    },

    {
      id: 'worker_helmet',
      tiledName: 'worker_helmet',
      textureKey: 'worker_helmet',
      imagePath:
        'assets/game/characters/worker_helmet.png'
    },

    {
      id: 'well',
      tiledName: 'well',
      textureKey: 'well',
      imagePath:
        'assets/game/tilesets/props/well.png'
    },

    {
      id: 'worksite_props',
      tiledName: 'worksite_props',
      textureKey: 'worksite_props',
      imagePath:
        'assets/game/tilesets/props/worksite_props.png'
    },

    {
      id: 'military_base',
      tiledName: 'military_base',
      textureKey: 'military_base',
      imagePath:
        'assets/game/tilesets/buildings/military_base.png'
    },

    {
      id: 'beach',
      tiledName: 'beach',
      textureKey: 'beach',
      imagePath:
        'assets/game/tilesets/props/beach.png'
    },

    {
      id: 'city_props',
      tiledName: 'city_props',
      textureKey: 'city_props',
      imagePath:
        'assets/game/tilesets/props/city_props.png'
    },

    {
      id: 'character_postman_1',
      tiledName: 'character_postman_1',
      textureKey: 'character_postman_1',
      imagePath:
        'assets/game/characters/character_postman_1.png'
    },

    {
      id: 'garage_sales',
      tiledName: 'garage_sales',
      textureKey: 'garage_sales',
      imagePath:
        'assets/game/tilesets/buildings/garage_sales.png'
    },

    {
      id: 'vehicles',
      tiledName: 'vehicles',
      textureKey: 'vehicles',
      imagePath:
        'assets/game/tilesets/vehicles/vehicles.png'
    },

    {
      id: 'subway_and_train_station',
      tiledName:
        'subway_and_train_station',
      textureKey:
        'subway_and_train_station',
      imagePath:
        'assets/game/tilesets/props/subway_and_train_station.png'
    }

  ],


  /* =========================
     CAPAS
     ========================= */

  layers: [

    {
      name: 'Terrain/Ground',
      tilesets: [
        'terrain',
        'city_terrains_global'
      ],
      depth: 0
    },

    {
      name: 'Terrain/Paths',
      tilesets: [
        'terrain'
      ],
      depth: 0
    },

    {
      name: 'Terrain/Beach',
      tilesets: [
        'beach',
        'city_terrains_global'
      ],
      depth: 4
    },

    {
      name: 'Terrain/Road',
      tilesets: [
        'city_terrain'
      ],
      depth: 1
    },

    {
      name: 'Terrain/Road_Details',
      tilesets: [
        'city_terrain',
        'city_props'
      ],
      depth: 5
    },

    {
      name: 'Terrain/Farmland',
      tilesets: [
        'terrain'
      ],
      depth: 0
    },

    {
      name: 'Terrain/Ground_Details',
      tilesets: [
        'propsBuildings',
        'worksite_props'
      ],
      depth: 0
    },

    {
      name: 'Terrain/Ground_Details_2',
      tilesets: [
        'propsBuildings'
      ],
      depth: 2
    },


    /* =========================
       ENTIDADES
       ========================= */

    {
      name: 'Entities/Animals',
      tilesets: [
        'cow_big_white',
        'dog_german_shepherd_dark_brown',
        'dogshouse',
        'rabbit_white',
        'rooster_golden'
      ],
      depth: 3
    },

    {
      name: 'Entities/NPCs',
      tilesets: [
        'character_postman_3',
        'farmer_1_chopping',
        'farmer_1',
        'farmer_2'
      ],
      depth: 3
    },


    /* =========================
       STRUCTURES
       ========================= */

    {
      name: 'Structures/Vehicles',
      tilesets: [
        'propsBuildings',
        'worksite_props',
        'vehicles'
      ],
      depth: 3
    },

    {
      name: 'Structures/Props',
      tilesets: [
        'propsBuildings',
        'garden',
        'well',
        'worksite_props',
        'military_base'
      ],
      depth: 4
    },

    {
      name: 'Structures/Props_2',
      tilesets: [
        'propsBuildings',
        'worksite_props'
      ],
      depth: 4
    },

    {
      name: 'Structures/Props_3',
      tilesets: [
        'propsBuildings'
      ],
      depth: 4
    },

    {
      name: 'Structures/Buildings',
      tilesets: [
        'propsBuildings',
        'office',
        'generic_buildings',
        'fire_station',
        'garden',
        'villas',
        'police_station',
        'worksite_props',
        'military_base',
        'city_props'
      ],
      depth: 5
    },

    {
      name: 'Structures/Fences',
      tilesets: [
        'fences',
        'worksite_props',
        'military_base',
        'city_terrains_global'
      ],
      depth: 4
    },

    {
      name:
        'Structures/ControlCenterInterior',

      tilesets: [
        'character_postman_1',
        'garage_sales',
        'propsBuildings'
      ],

      depth: 10
    },

    {
      name:
        'Structures/ControlCenterInterior_2',

      tilesets: [
        'vehicles',
        'garage_sales',
        'propsBuildings',
        'subway_and_train_station'
      ],

      depth: 10
    },


    /* =========================
       NATURALEZA
       ========================= */

    {
      name: 'Nature/Forest_Walls',
      tilesets: ['trees'],
      depth: 7
    },

    {
      name: 'Nature/Trees',
      tilesets: ['trees'],
      depth: 14
    },

    {
      name: 'Nature/Bushes',
      tilesets: ['garden'],
      depth: 2
    },

    {
      name: 'Nature/Trees_2',
      tilesets: ['trees'],
      depth: 14
    },

    {
      name: 'Nature/Crops',
      tilesets: [
        'crops',
        'propsBuildings'
      ],
      depth: 15
    },

    {
      name: 'Nature/Crops_2',
      tilesets: [
        'crops',
        'propsBuildings'
      ],
      depth: 16
    },

    {
      name: 'Nature/Forest_Walls_2',
      tilesets: ['trees'],
      depth: 7
    },

    {
      name: 'Nature/Forest_Walls_3',
      tilesets: ['trees'],
      depth: 8
    },

    {
      name: 'Nature/Forest_Walls_4',
      tilesets: ['trees'],
      depth: 9
    },

    {
      name: 'Nature/Forest_Walls_5',
      tilesets: ['trees'],
      depth: 10
    },


    /* =========================
       UPPER
       ========================= */

    {
      name: 'Upper/Trees',
      tilesets: ['trees'],
      depth: 20
    },

    {
      name:
        'Upper/ControlCenterRoof',

      tilesets: [
        'military_base'
      ],

      depth: 50
    },


    /* =========================
       AGUA
       ========================= */

    {
      name: 'Terrain/Water',

      tilesets: [
        'water_1'
      ],

      depth: 1
    },

    {
      name:
        'Terrain/Water_Details',

      tilesets: [
        'city_terrains_global'
      ],

      depth: 1
    }

  ]

} satisfies TilemapSceneConfig;