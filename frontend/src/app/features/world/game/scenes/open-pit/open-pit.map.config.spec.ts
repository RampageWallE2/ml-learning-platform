import { OPEN_PIT_MAP_CONFIG } from './open-pit.map.config';

describe('OPEN_PIT_MAP_CONFIG', () => {
  it('uses the current ground texture and renders the new outer cliffs and dump tiles', () => {
    expect(OPEN_PIT_MAP_CONFIG.layers.find(layer => layer.name === 'Terrain/Ground')?.tilesets)
      .toEqual(['terrain']);
    expect(OPEN_PIT_MAP_CONFIG.tilesets).toContainEqual({
      id: 'beach_outside',
      tiledName: 'beach_outside',
      textureKey: 'beach_outside',
      imagePath: 'assets/game/tilesets/props/beach_outside.png',
    });
    for (const name of ['Pit/Cliff_01', 'Waste_Dump/Ground', 'Waste_Dump/Dirt']) {
      expect(OPEN_PIT_MAP_CONFIG.layers.find(layer => layer.name === name)?.tilesets)
        .toContain('beach_outside');
    }
  });

  it('does not try to create the camp layers removed in Tiled', () => {
    expect(OPEN_PIT_MAP_CONFIG.layers.some(layer => layer.name.startsWith('Campament/')))
      .toBe(false);
  });

  it('registers the textures used by the updated water area and terrain details', () => {
    expect(OPEN_PIT_MAP_CONFIG.tilesets).toEqual(expect.arrayContaining([
      {
        id: 'camping',
        tiledName: 'camping',
        textureKey: 'camping',
        imagePath: 'assets/game/tilesets/props/camping.png',
      },
      {
        id: 'city_terrains_global',
        tiledName: 'city_terrains_global',
        textureKey: 'city_terrains_global',
        imagePath: 'assets/game/tilesets/terrain/city_terrains_global.png',
      },
    ]));
  });

  it('renders all water layers in the order authored in Tiled', () => {
    const layers = OPEN_PIT_MAP_CONFIG.layers.filter(layer => layer.name.startsWith('Water/'));
    expect(layers.map(layer => layer.name)).toEqual([
      'Water/Ground', 'Water/Ground_2', 'Water/Props', 'Water/Props_2',
      'Water/Buildings', 'Water/NPC',
    ]);
    expect(layers.slice(0, 4).map(layer => layer.tilesets)).toEqual([
      ['camping'], ['camping'], ['camping'], ['camping'],
    ]);
    for (let index = 1; index < layers.length; index++) {
      expect(layers[index].depth).toBeGreaterThan(layers[index - 1].depth);
    }
  });

  it('includes the tilesets used for terrain and pit details', () => {
    expect(OPEN_PIT_MAP_CONFIG.layers.find(layer => layer.name === 'Terrain/Details')?.tilesets)
      .toEqual(['beach', 'worksite_props', 'terrain2', 'city_terrains_global']);
    expect(OPEN_PIT_MAP_CONFIG.layers.find(layer => layer.name === 'Pit/Details')?.tilesets)
      .toContain('worksite_props');
  });

  it('only references registered tilesets and keeps layer names unique', () => {
    const ids = new Set(OPEN_PIT_MAP_CONFIG.tilesets.map(tileset => tileset.id));
    const names = OPEN_PIT_MAP_CONFIG.layers.map(layer => layer.name);
    expect(new Set(names).size).toBe(names.length);
    for (const layer of OPEN_PIT_MAP_CONFIG.layers) {
      for (const tileset of layer.tilesets) {
        expect(ids.has(tileset)).toBe(true);
      }
    }
  });
});
