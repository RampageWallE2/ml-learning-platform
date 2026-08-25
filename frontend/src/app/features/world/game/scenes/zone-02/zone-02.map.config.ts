import { TilemapSceneConfig } from '../../tiled/tilemap-config.types';

export const ZONE_02_MAP_CONFIG = {
  mapKey: 'zone-02',

  mapPath: 'assets/game/maps/zone-02.tmj',

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
