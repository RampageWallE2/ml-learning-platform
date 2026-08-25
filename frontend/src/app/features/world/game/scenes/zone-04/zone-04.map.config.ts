import { TilemapSceneConfig } from '../../tiled/tilemap-config.types';

export const ZONE_04_MAP_CONFIG = {
  mapKey: 'zone-04',

  mapPath: 'assets/game/maps/zone-04.tmj',

  tilesets: [
    {
      id: 'terrain',
      tiledName: 'terrain',
      textureKey: 'terrain',
      imagePath: 'assets/game/tilesets/terrain/terrain.png',
    },
  ],

  layers: [
    {
      name: 'Terrain/Ground',
      tilesets: ['terrain'],
      depth: 0,
    },
  ],
} satisfies TilemapSceneConfig;
