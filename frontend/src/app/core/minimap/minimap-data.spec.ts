import type Phaser from 'phaser';
import { buildOpenPitMinimap } from './minimap-data';

describe('minimap data from Tiled', () => {
  function create() {
    const lesson = { x: 64, y: 96, width: 32, height: 32, name: 'arbitrary-npc-name', properties: [
      { name: 'interactionType', value: 'lesson' }, { name: 'lessonId', value: 'lesson-01' },
    ] };
    const map = {
      widthInPixels: 320, heightInPixels: 320, tileWidth: 32, tileHeight: 32,
      layers: [{ name: 'Roads/Road_Ground', x: 0, y: 0,
        data: [[{ index: -1 }, { index: 2 }, { index: 3 }, { index: -1 }, { index: 2 }]] }],
      getObjectLayer: () => ({ objects: [lesson, { ...lesson }, { ...lesson, properties: [
        { name: 'interactionType', value: 'lesson' }, { name: 'lessonId', value: 'unavailable' },
      ] }] }),
    };
    return { lesson, source: map, map: map as unknown as Phaser.Tilemaps.Tilemap };
  }

  it('uses lessonId and the real interaction rectangle, follows map edits and ignores duplicates or unavailable classes', () => {
    const { map, lesson } = create();
    const data = buildOpenPitMinimap(map)!;
    expect(data.lessons).toEqual([{ lessonId: 'lesson-01', number: 1, name: 'Dispersión de los datos', x: 250, y: 350 }]);
    lesson.x = 160;
    expect(buildOpenPitMinimap(map)!.lessons[0].x).toBe(550);
    expect(data.lessons[0].x).toBe(250);
  });

  it('derives the supervisor marker from the intro dialogue rectangle, not its object name', () => {
    const { map, source } = create();
    const intro = { name: 'renamed-supervisor', x: 160, y: 224, width: 32, height: 32, properties: [
      { name: 'interactionType', value: 'dialogue' }, { name: 'dialogueId', value: 'open-pit-intro' },
    ] };
    source.getObjectLayer = () => ({ objects: [intro] });
    expect(buildOpenPitMinimap(map)?.supervisor).toEqual({ x: 550, y: 750 });
    intro.x = 192;
    expect(buildOpenPitMinimap(map)?.supervisor).toEqual({ x: 650, y: 750 });
  });

  it('merges actual road tiles into short SVG paths rather than one DOM node per tile', () => {
    const { map } = create();
    expect(buildOpenPitMinimap(map)!.terrain).toEqual([
      { kind: 'road', path: 'M100,0h200v100h-200zM400,0h100v100h-100z' },
    ]);
  });

  it('preserves the map aspect ratio and safely rejects invalid bounds', () => {
    const { map, source } = create();
    source.heightInPixels = 640;
    expect(buildOpenPitMinimap(map)).toEqual(expect.objectContaining({ width: 500, height: 1000 }));
    source.widthInPixels = 0;
    expect(buildOpenPitMinimap(map)).toBeNull();
  });
});
