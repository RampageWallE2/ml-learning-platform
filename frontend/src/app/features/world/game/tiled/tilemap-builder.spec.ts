import type Phaser from 'phaser';
import { buildTilemap } from './tilemap.builder';
import type { TilemapSceneConfig } from './tilemap-config.types';

describe('buildTilemap — static world maps', () => {
  it('uses null for empty cells and preserves tileset bindings, layer order and depths', () => {
    const terrain = {} as Phaser.Tilemaps.Tileset;
    const props = {} as Phaser.Tilemaps.Tileset;
    const ground = { setDepth: vi.fn() };
    const buildings = { setDepth: vi.fn() };
    const map = {
      addTilesetImage: vi.fn().mockReturnValueOnce(terrain).mockReturnValueOnce(props),
      createLayer: vi.fn().mockReturnValueOnce(ground).mockReturnValueOnce(buildings),
    };
    const scene = { make: { tilemap: vi.fn(() => map) } };
    const config = {
      mapKey: 'pit',
      mapPath: 'pit.tmj',
      tilesets: [
        {
          id: 'ground',
          tiledName: 'terrain',
          textureKey: 'terrain-image',
          imagePath: 'terrain.png',
        },
        { id: 'props', tiledName: 'city_props', textureKey: 'props-image', imagePath: 'props.png' },
      ],
      layers: [
        { name: 'Terrain/Ground', tilesets: ['ground'], depth: 0 },
        { name: 'Structures/Buildings', tilesets: ['ground', 'props'], depth: 2.5 },
      ],
    } satisfies TilemapSceneConfig;

    const result = buildTilemap(scene as unknown as Phaser.Scene, config);

    expect(scene.make.tilemap).toHaveBeenCalledExactlyOnceWith({ key: 'pit', insertNull: true });
    expect(map.addTilesetImage).toHaveBeenNthCalledWith(1, 'terrain', 'terrain-image');
    expect(map.addTilesetImage).toHaveBeenNthCalledWith(2, 'city_props', 'props-image');
    expect(map.createLayer).toHaveBeenNthCalledWith(1, 'Terrain/Ground', [terrain]);
    expect(map.createLayer).toHaveBeenNthCalledWith(2, 'Structures/Buildings', [terrain, props]);
    expect(ground.setDepth).toHaveBeenCalledExactlyOnceWith(0);
    expect(buildings.setDepth).toHaveBeenCalledExactlyOnceWith(2.5);
    expect(result.map).toBe(map);
    expect([...result.tilesets]).toEqual([
      ['ground', terrain],
      ['props', props],
    ]);
    expect([...result.layers]).toEqual([
      ['Terrain/Ground', ground],
      ['Structures/Buildings', buildings],
    ]);
  });
});
