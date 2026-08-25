import { TilemapSceneConfig } from '../../tiled/tilemap-config.types';

export const QUARRIES_MAP_CONFIG = {
  mapKey: 'quarries',

  mapPath: 'assets/game/maps/quarries.tmj',

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
    }
  ],

  layers: [
    {
      name: 'Terrain/Ground',
      tilesets: ['terrain'],
      depth: 0,
    },
    {
      name: 'Structures/Buildings',
      tilesets: ['city_props'],
      depth: 2,
    }
  ],
} satisfies TilemapSceneConfig;
