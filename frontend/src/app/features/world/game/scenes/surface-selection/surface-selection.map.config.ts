import { TilemapSceneConfig } from '../../tiled/tilemap-config.types';

export const SURFACE_SELECTION_MAP_CONFIG = {
  mapKey: 'surface-selection',

  mapPath: 'assets/game/maps/surface-selection.tmj',

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
      id: 'dog_german_shepherd_dark_brown',
      tiledName: 'dog_german_shepherd_dark_brown',
      textureKey: 'dog_german_shepherd_dark_brown',
      imagePath: 'assets/game/tilesets/animals/dog_german_shepherd_dark_brown.png',
    },
    {
      id: 'character_postman_1',
      tiledName: 'character_postman_1',
      textureKey: 'character_postman_1',
      imagePath: 'assets/game/characters/character_postman_1.png',
    },
    {
      id: 'character_postman_3',
      tiledName: 'character_postman_3',
      textureKey: 'character_postman_3',
      imagePath: 'assets/game/characters/character_postman_3.png',
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
      name: 'Structures/Props',
      tilesets: ['city_props', 'character_postman_3'],
      depth: 1.1,
    },
    {
      name: 'Structures/NPC',
      tilesets: ['character_postman_1', 'dog_german_shepherd_dark_brown'],
      depth: 1.2,
    },
  ],
} satisfies TilemapSceneConfig;
