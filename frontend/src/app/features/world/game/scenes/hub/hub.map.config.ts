import { TilemapSceneConfig } from '../../tiled/tilemap-config.types';

export const HUB_MAP_CONFIG = {
  mapKey: 'hub',

  mapPath: 'assets/game/maps/hub.tmj',

  tilesets: [
    {
      id: 'terrain',
      tiledName: 'terrain',
      textureKey: 'terrain',
      imagePath: 'assets/game/tilesets/terrain/terrain.png',
    },
    {
      id: 'city_props',
      tiledName: 'city_props',
      textureKey: 'city_props',
      imagePath: 'assets/game/tilesets/props/city_props.png',
    },
    {
      id: 'city_terrain2',
      tiledName: 'city_terrain2',
      textureKey: 'city_terrain2',
      imagePath: 'assets/game/tilesets/terrain/city_terrain2.png',
    },
    {
      id: 'garden_fountain_3',
      tiledName: 'garden_fountain_3',
      textureKey: 'garden_fountain_3',
      imagePath: 'assets/game/tilesets/props/garden_fountain_3.png',
    },
    {
      id: 'garden',
      tiledName: 'garden',
      textureKey: 'garden',
      imagePath: 'assets/game/tilesets/buildings/garden.png',
    },
    {
      id: 'character_postman_3',
      tiledName: 'character_postman_3',
      textureKey: 'character_postman_3',
      imagePath: 'assets/game/characters/character_postman_3.png',
    },
    {
      id: 'dog_german_shepherd_dark_brown',
      tiledName: 'dog_german_shepherd_dark_brown',
      textureKey: 'dog_german_shepherd_dark_brown',
      imagePath: 'assets/game/tilesets/animals/dog_german_shepherd_dark_brown.png',
    },
  ],

  layers: [
    {
      name: 'Terrain/Ground',
      tilesets: ['city_terrain2'],
      depth: 0,
    },
    {
      name: 'Terrain/Side_Walk',
      tilesets: ['city_terrain2'],
      depth: 0.1,
    },
    {
      name: 'Structures/Buildings',
      tilesets: ['city_props'],
      depth: 1,
    },
    {
      name: 'Structures/Props_02',
      tilesets: ['garden'],
      depth: 1.1,
    },
    {
      name: 'Structures/Props',
      tilesets: ['city_props', 'garden_fountain_3', 'garden'],
      depth: 1.2,
    },
    {
      name: 'Structures/NPC',
      tilesets: ['character_postman_3', 'dog_german_shepherd_dark_brown'],
      depth: 1.3,
    },
  ],
} satisfies TilemapSceneConfig;
