import { TilemapSceneConfig } from '../../tiled/tilemap-config.types';

export const OPEN_PIT_MAP_CONFIG = {
  mapKey: 'open-pit',

  mapPath: 'assets/game/maps/open-pit.tmj',

  ambientSounds: [
    {
      id: 'mill',
      audioPath: 'assets/game/audio/ambient/mill.mp3',
    },
    {
      id: 'excavator',
      audioPath: 'assets/game/audio/ambient/excavator.mp3',
    },
    {
      id: 'dump_truck',
      audioPath: 'assets/game/audio/ambient/dump_truck.mp3',
    },
  ],

  tilesets: [
    {
      id: 'worksite_props',
      tiledName: 'worksite_props',
      textureKey: 'worksite_props',
      imagePath: 'assets/game/tilesets/props/worksite_props.png',
    },
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
    {
      id: 'terrain2',
      tiledName: 'terrain2',
      textureKey: 'terrain2',
      imagePath: 'assets/game/tilesets/terrain/terrain2.png',
    },
    {
      id: 'military_base',
      tiledName: 'military_base',
      textureKey: 'military_base',
      imagePath: 'assets/game/tilesets/buildings/military_base.png',
    },
    {
      id: 'city_terrain',
      tiledName: 'city_terrain',
      textureKey: 'city_terrain',
      imagePath: 'assets/game/tilesets/terrain/city_terrain.png',
    },
    {
      id: 'conveyor_belt_2',
      tiledName: 'conveyor_belt_2',
      textureKey: 'conveyor_belt_2',
      imagePath: 'assets/game/tilesets/dirt/conveyor_belt_2.png',
    },
    {
      id: 'crusher_2',
      tiledName: 'crusher_2',
      textureKey: 'crusher_2',
      imagePath: 'assets/game/tilesets/dirt/crusher_2.png',
    },
    {
      id: 'hopper_2',
      tiledName: 'hopper_2',
      textureKey: 'hopper_2',
      imagePath: 'assets/game/tilesets/dirt/hopper_2.png',
    },
    {
      id: 'crushed_material_2',
      tiledName: 'crushed_material_2',
      textureKey: 'crushed_material_2',
      imagePath: 'assets/game/tilesets/dirt/crushed_material_2.png',
    },
    {
      id: 'pile_1_2',
      tiledName: 'pile_1_2',
      textureKey: 'pile_1_2',
      imagePath: 'assets/game/tilesets/dirt/pile_1_2.png',
    },
    {
      id: 'pile_2_2',
      tiledName: 'pile_2_2',
      textureKey: 'pile_2_2',
      imagePath: 'assets/game/tilesets/dirt/pile_2_2.png',
    },
    {
      id: 'pile_3_2',
      tiledName: 'pile_3_2',
      textureKey: 'pile_3_2',
      imagePath: 'assets/game/tilesets/dirt/pile_3_2.png',
    },
    {
      id: 'dump_truck_2',
      tiledName: 'dump_truck_2',
      textureKey: 'dump_truck_2',
      imagePath: 'assets/game/tilesets/vehicles/dump_truck_2.png',
    },
    {
      id: 'conections',
      tiledName: 'conections',
      textureKey: 'conections',
      imagePath: 'assets/game/tilesets/buildings/conections.png',
    },
    {
      id: 'dump_truck_4',
      tiledName: 'dump_truck_4',
      textureKey: 'dump_truck_4',
      imagePath: 'assets/game/tilesets/vehicles/dump_truck_4.png',
    },
    {
      id: 'dump_truck_3',
      tiledName: 'dump_truck_3',
      textureKey: 'dump_truck_3',
      imagePath: 'assets/game/tilesets/vehicles/dump_truck_3.png',
    },
    {
      id: 'auto_repair_shop',
      tiledName: 'auto_repair_shop',
      textureKey: 'auto_repair_shop',
      imagePath: 'assets/game/tilesets/buildings/auto_repair_shop.png',
    },
    {
      id: 'electrical_substation',
      tiledName: 'electrical_substation',
      textureKey: 'electrical_substation',
      imagePath: 'assets/game/tilesets/buildings/electrical_substation.png',
    },
    {
      id: 'modular_camp',
      tiledName: 'modular_camp',
      textureKey: 'modular_camp',
      imagePath: 'assets/game/tilesets/buildings/modular_camp.png',
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
      tilesets: ['heavy_machinery', 'dump_truck_2'],
      depth: 1.2,
    },
    {
      name: 'Roads/Road_Ground',
      tilesets: ['terrain2'],
      depth: 1.3,
    },
    {
      name: 'Roads/Road_Edges',
      tilesets: ['terrain2', 'beach'],
      depth: 1.4,
    },
    {
      name: 'Roads/Road_Details',
      tilesets: ['terrain2'],
      depth: 1.5,
    },
    {
      name: 'Roads/Road_Props',
      tilesets: ['terrain2', 'worksite_props', 'city_props'],
      depth: 1.6,
    },
    {
      name: 'Electrical_Substation/Buildings',
      tilesets: ['electrical_substation', 'modular_camp'],
      depth: 1.7,
    },
    {
      name: 'Repair_Shop/Buildings',
      tilesets: ['auto_repair_shop'],
      depth: 1.8,
    },
    {
      name: 'Structures/Buildings',
      tilesets: ['city_props'],
      depth: 2,
    },
    {
      name: 'Waste_Dump/Ground',
      tilesets: ['beach', 'beach_2'],
      depth: 2.1,
    },
    {
      name: 'Waste_Dump/Dirt',
      tilesets: ['beach', 'beach_2'],
      depth: 2.2,
    },
    {
      name: 'Waste_Dump/Vehicles',
      tilesets: ['heavy_machinery'],
      depth: 2.3,
    },
    {
      name: 'Control_Center/Ground',
      tilesets: ['city_terrain'],
      depth: 2.4,
    },
    {
      name: 'Control_Center/Buildings',
      tilesets: ['military_base'],
      depth: 2.5,
    },
    {
      name: 'Control_Center/Props',
      tilesets: ['city_props'],
      depth: 2.6,
    },
    {
      name: 'Processing_Area/Ground',
      tilesets: ['city_terrain', 'terrain2'],
      depth: 2.7,
    },
    {
      name: 'Processing_Area/Details',
      tilesets: ['beach'],
      depth: 2.8,
    },
    {
      name: 'Processing_Area/Belt',
      tilesets: ['conveyor_belt_2'],
      depth: 2.9,
    },
    {
      name: 'Processing_Area/Pile',
      tilesets: ['crushed_material_2', 'pile_1_2', 'pile_2_2', 'pile_3_2'],
      depth: 3,
    },
    {
      name: 'Processing_Area/Pile_2',
      tilesets: ['crushed_material_2', 'pile_3_2'],
      depth: 3.1,
    },
    {
      name: 'Processing_Area/Buildings',
      tilesets: ['city_props', 'conections'],
      depth: 3.2,
    },
    {
      name: 'Processing_Area/Crusher',
      tilesets: ['crusher_2'],
      depth: 3.3,
    },
    {
      name: 'Processing_Area/Hopper',
      tilesets: ['hopper_2'],
      depth: 3.4,
    },
    {
      name: 'Processing_Area/Props',
      tilesets: ['worksite_props', 'city_props'],
      depth: 3.5,
    },
    {
      name: 'Processing_Area/Vehicles_2',
      tilesets: ['heavy_machinery'],
      depth: 3.6,
    },
    {
      name: 'Processing_Area/Vehicles',
      tilesets: [
        'city_terrain',
        'dump_truck_2',
        'dump_truck_3',
        'dump_truck_4',
        'heavy_machinery',
      ],
      depth: 3.7,
    },
  ],
} satisfies TilemapSceneConfig;
