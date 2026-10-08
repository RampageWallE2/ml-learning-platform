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

  it('does not try to create the area NPC or camp layers removed in Tiled', () => {
    expect(OPEN_PIT_MAP_CONFIG.layers.some(layer => layer.name.startsWith('Campament/')))
      .toBe(false);
    for (const area of ['Water', 'Pit', 'Electrical_Substation', 'Gas_Station',
      'Repair_Shop', 'Waste_Dump', 'Control_Center', 'Processing_Area']) {
      expect(OPEN_PIT_MAP_CONFIG.layers.some(layer => layer.name === `${area}/NPC`))
        .toBe(false);
    }
  });

  it('renders the new global NPC layer and helmets above their characters', () => {
    expect(OPEN_PIT_MAP_CONFIG.tilesets).toContainEqual({
      id: 'worker_helmet', tiledName: 'worker_helmet', textureKey: 'worker_helmet',
      imagePath: 'assets/game/characters/worker_helmet.png',
    });
    const characters = OPEN_PIT_MAP_CONFIG.layers.find(layer => layer.name === 'NPC/Character')!;
    const accessories = OPEN_PIT_MAP_CONFIG.layers.find(layer => layer.name === 'NPC/Accesories')!;
    expect(characters.tilesets).toEqual(['character_postman_1']);
    expect(accessories.tilesets).toEqual(['worker_helmet']);
    expect(accessories.depth).toBeGreaterThan(characters.depth);
    const environment = OPEN_PIT_MAP_CONFIG.layers.filter(layer => !layer.name.startsWith('NPC/'));
    expect(characters.depth).toBeGreaterThan(Math.max(...environment.map(layer => layer.depth)));
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
      'Water/Buildings',
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
