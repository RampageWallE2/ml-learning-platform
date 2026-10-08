import { preloadTilemap } from './tilemap.builder';
import type Phaser from 'phaser';

describe('preloadTilemap — cache-aware resource queue', () => {
  const config = {
    mapKey: 'pit', mapPath: 'pit.tmj', layers: [],
    tilesets: [{ id: 'terrain', tiledName: 'terrain', textureKey: 'terrain', imagePath: 'terrain.png' }],
  };

  it.each([false, true])('queues only resources absent from cache (cached=%s)', cached => {
    const scene = {
      cache: { tilemap: { exists: vi.fn(() => cached) } },
      textures: { exists: vi.fn(() => cached) },
      load: { image: vi.fn(), tilemapTiledJSON: vi.fn() },
    };
    preloadTilemap(scene as unknown as Phaser.Scene, config);
    expect(scene.load.image).toHaveBeenCalledTimes(cached ? 0 : 1);
    expect(scene.load.tilemapTiledJSON).toHaveBeenCalledTimes(cached ? 0 : 1);
  });
});
