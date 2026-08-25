import { TilemapSceneConfig } from '../../tiled/tilemap-config.types';

export const ZONE_01_MAP_CONFIG = {
  mapKey: 'zone-01',

  mapPath: 'assets/game/maps/zone-01.tmj',

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
