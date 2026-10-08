import type Phaser from 'phaser';
import { LESSON_NAMES } from '../../features/world/lessons/lesson-catalog';
import { OPEN_PIT_INTRO } from '../../features/world/lessons/data/open-pit-intro.data';
import { getTiledStringProperty, getTiledRectangle } from '../tiled/tiled.utils';
import type { MinimapMapData, MinimapTerrainKind } from './minimap.types';

const TERRAIN_LAYERS: readonly (readonly [string, MinimapTerrainKind])[] = [
  ['Pit/Pit_Floor', 'pit-floor'],
  ['Pit/Bench_03', 'pit-bench'], ['Pit/Bench_02', 'pit-bench'], ['Pit/Bench_01', 'pit-bench'],
  ['Pit/Cliff_03', 'pit-edge'], ['Pit/Cliff_02', 'pit-edge'], ['Pit/Cliff_01', 'pit-edge'],
  ['Water/Ground', 'water'], ['Water/Ground_2', 'water'],
  ['Waste_Dump/Ground', 'area'], ['Control_Center/Ground', 'area'],
  ['Repair_Shop/Ground', 'area'], ['Processing_Area/Ground', 'area'],
  ['Electrical_Substation/Ground', 'area'], ['Gas_Station/Ground', 'area'], ['Parking/Ground', 'area'],
  ['Roads/Road_Ground', 'road'], ['Roads/Road_Edges', 'road'],
];

/** A static schematic from the loaded map, not another camera or a second map asset. */
export function buildOpenPitMinimap(map: Phaser.Tilemaps.Tilemap): MinimapMapData | null {
  const { widthInPixels: worldWidth, heightInPixels: worldHeight } = map;
  if (!Number.isFinite(worldWidth + worldHeight) || worldWidth <= 0 || worldHeight <= 0) return null;
  const scale = 1000 / Math.max(worldWidth, worldHeight);
  const n = (value: number) => Math.round(value * scale * 10) / 10;
  const terrain: { kind: MinimapTerrainKind; path: string }[] = [];

  for (const [name, kind] of TERRAIN_LAYERS) {
    const layer = map.layers.find(item => item.name === name);
    if (!layer) continue;
    const runs: string[] = [];
    for (let row = 0; row < layer.data.length; row++) {
      const tiles = layer.data[row];
      let start = -1;
      for (let column = 0; column <= tiles.length; column++) {
        if (column < tiles.length && tiles[column]?.index >= 0) {
          if (start === -1) start = column;
        } else if (start !== -1) {
          const x = n(layer.x + start * map.tileWidth);
          const y = n(layer.y + row * map.tileHeight);
          const width = n((column - start) * map.tileWidth);
          const height = n(map.tileHeight);
          runs.push(`M${x},${y}h${width}v${height}h-${width}z`);
          start = -1;
        }
      }
    }
    if (runs.length) terrain.push({ kind, path: runs.join('') });
  }

  const seen = new Set<string>();
  const lessons: MinimapMapData['lessons'][number][] = [];
  let supervisor: MinimapMapData['supervisor'];
  for (const object of map.getObjectLayer('Interactions')?.objects ?? []) {
    if (getTiledStringProperty(object, 'interactionType') === 'dialogue'
      && getTiledStringProperty(object, 'dialogueId') === OPEN_PIT_INTRO.id) {
      const rectangle = getTiledRectangle(object);
      if (rectangle) supervisor = { x: n(rectangle.centerX), y: n(rectangle.centerY) };
    }
    if (getTiledStringProperty(object, 'interactionType') !== 'lesson') continue;
    const lessonId = getTiledStringProperty(object, 'lessonId');
    const rectangle = getTiledRectangle(object);
    if (!lessonId || !LESSON_NAMES[lessonId] || !rectangle || seen.has(lessonId)) continue;
    seen.add(lessonId);
    lessons.push({
      lessonId, number: Number(lessonId.replace('lesson-', '')), name: LESSON_NAMES[lessonId],
      x: n(rectangle.centerX), y: n(rectangle.centerY),
    });
  }
  lessons.sort((a, b) => a.number - b.number);
  return { sceneKey: 'OpenPitScene', worldWidth, worldHeight,
    width: n(worldWidth), height: n(worldHeight), terrain, lessons,
    ...(supervisor ? { supervisor } : {}) };
}
