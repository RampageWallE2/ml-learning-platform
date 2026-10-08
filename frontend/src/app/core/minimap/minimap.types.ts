export type MinimapTerrainKind = 'pit-floor' | 'pit-bench' | 'pit-edge' | 'water' | 'area' | 'road';

export type MinimapMapData = Readonly<{
  sceneKey: string;
  worldWidth: number;
  worldHeight: number;
  width: number;
  height: number;
  terrain: readonly Readonly<{ kind: MinimapTerrainKind; path: string }>[];
  lessons: readonly Readonly<{ lessonId: string; number: number; name: string; x: number; y: number }>[];
  supervisor?: Readonly<{ x: number; y: number }>;
}>;

export type MinimapPlayerPosition = Readonly<{
  sceneKey: string;
  x: number;
  y: number;
  heading: number;
}>;
