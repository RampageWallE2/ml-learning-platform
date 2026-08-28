import { TilemapSceneConfig } from '../../tiled/tilemap-config.types';

export const OPEN_PIT_MAP_CONFIG = {
  mapKey: 'open-pit',

  mapPath: 'assets/game/maps/open-pit.tmj',

  tilesets: [
    {
      id: 'terrain',
      tiledName: 'terrain',
      textureKey: 'terrain',
      imagePath: 'assets/game/tilesets/terrain/terrain.png',
    },
    {
      id: 'beach',
      tiledName: 'beach',
      textureKey: 'beach',
      imagePath: 'assets/game/tilesets/props/beach.png',
    },
    {
      id: 'beach_2',
      tiledName: 'beach_2',
      textureKey: 'beach_2',
      imagePath: 'assets/game/tilesets/props/beach_2.png',
    },
    {
      id: 'beach_3',
      tiledName: 'beach_3',
      textureKey: 'beach_3',
      imagePath: 'assets/game/tilesets/props/beach_3.png',
    },
    {
      id: 'heavy_machinery',
      tiledName: 'heavy_machinery',
      textureKey: 'heavy_machinery',
      imagePath: 'assets/game/tilesets/vehicles/heavy_machinery.png',
    },
    {
      id: 'city_props',
      tiledName: 'city_props',
      textureKey: 'city_props',
      imagePath: 'assets/game/tilesets/props/city_props.png',
    },
  ],

  layers: [
    {
      name: 'Terrain/Ground',
      tilesets: ['beach'],
      depth: 0,
    },
    {
      name: 'Pit/Pit_Floor',
      tilesets: ['beach_3'],
      depth: 0.1,
    },
    {
      name: 'Pit/Bench_03',
      tilesets: ['beach_3'],
      depth: 0.2,
    },
    {
      name: 'Pit/Cliff_03_02',
      tilesets: ['beach_3'],
      depth: 0.3,
    },
    {
      name: 'Pit/Cliff_03',
      tilesets: ['beach_3'],
      depth: 0.4,
    },
    {
      name: 'Pit/Bench_02',
      tilesets: ['beach_2'],
      depth: 0.5,
    },
    {
      name: 'Pit/Cliff_02_02',
      tilesets: ['beach', 'beach_2'],
      depth: 0.6,
    },
    {
      name: 'Pit/Cliff_02',
      tilesets: ['terrain', 'beach', 'beach_2'],
      depth: 0.7,
    },
    {
      name: 'Pit/Bench_01',
      tilesets: ['beach'],
      depth: 0.8,
    },
    {
      name: 'Pit/Cliff_01_02',
      tilesets: ['beach'],
      depth: 0.9,
    },
    {
      name: 'Pit/Cliff_01',
      tilesets: ['beach'],
      depth: 1,
    },
    {
      name: 'Pit/Details',
      tilesets: ['beach', 'beach_2', 'beach_3'],
      depth: 1.1,
    },
    {
      name: 'Pit/Vehicles',
      tilesets: ['heavy_machinery'],
      depth: 1.2,
    },
    {
      name: 'Structures/Buildings',
      tilesets: ['city_props'],
      depth: 2,
    },
  ],
} satisfies TilemapSceneConfig;
