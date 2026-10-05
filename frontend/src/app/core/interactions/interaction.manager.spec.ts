import type Phaser from 'phaser';
import { InteractionManager } from './interaction.manager';
import { LessonGuide } from './lesson-guide';
import { gameEvents, GameEvents } from '../../features/world/game/events/game-events';

vi.mock('phaser', async () => {
  const { default: EventEmitter } = await import('eventemitter3');
  return {
    default: {
      Events: { EventEmitter },
      Math: {
        Clamp: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)),
      },
    },
  };
});

const guideCalls = {
  setTarget: vi.spyOn(LessonGuide.prototype, 'setTarget'),
  update: vi.spyOn(LessonGuide.prototype, 'update'),
  hide: vi.spyOn(LessonGuide.prototype, 'hide'),
  destroy: vi.spyOn(LessonGuide.prototype, 'destroy'),
};

describe('InteractionManager — next lesson guide', () => {
  const managers = new Set<InteractionManager>();
  function create(sceneKey = 'OpenPitScene') {
    const text = () =>
      Object.assign(
        Object.fromEntries(
          [
            'setOrigin',
            'setDepth',
            'setResolution',
            'setStroke',
            'setText',
            'setY',
            'setScale',
            'setAlpha',
            'setColor',
            'setBackgroundColor',
            'setVisible',
            'setWordWrapWidth',
            'setPosition',
            'destroy',
          ].map((name) => [name, vi.fn().mockReturnThis()]),
        ),
        {
          style: { wordWrapWidth: 260 },
          displayWidth: 100,
          displayHeight: 30,
        },
      );
    const camera = { worldView: { left: 0, right: 1000, top: 0, bottom: 800 }, zoom: 1 };
    const scene = {
      scene: { key: sceneKey },
      add: {
        text: vi.fn(text),
        graphics: vi.fn(() =>
          Object.fromEntries(
            [
              'fillStyle',
              'lineStyle',
              'beginPath',
              'moveTo',
              'lineTo',
              'closePath',
              'fillPath',
              'strokePath',
              'setDepth',
              'setPosition',
              'setScale',
              'setRotation',
              'setVisible',
              'destroy',
            ].map((name) => [name, vi.fn().mockReturnThis()]),
          ),
        ),
        zone: vi.fn((x: number, y: number, width: number, height: number) => {
          const data = new Map<string, unknown>();
          return {
            x,
            y,
            displayWidth: width,
            displayHeight: height,
            setData: (key: string, value: unknown) => data.set(key, value),
            getData: (key: string) => data.get(key),
            destroy: vi.fn(),
          };
        }),
      },
      physics: { add: { existing: vi.fn() }, overlap: vi.fn(() => false) },
      cameras: { main: camera },
      tweens: { add: vi.fn(() => ({ stop: vi.fn() })) },
    };
    const map = {
      getObjectLayer: () => ({
        objects: [
          {
            name: 'moved-npc',
            x: 2500,
            y: 800,
            width: 120,
            height: 100,
            properties: [
              { name: 'interactionType', value: 'lesson' },
              { name: 'lessonId', value: 'lesson-05' },
            ],
          },
          {
            name: 'other-npc',
            x: 400,
            y: 1600,
            width: 80,
            height: 100,
            properties: [
              { name: 'interactionType', value: 'lesson' },
              { name: 'lessonId', value: 'lesson-06' },
            ],
          },
        ],
      }),
    };
    const player = { x: 500, y: 400 };
    const manager = new InteractionManager(
      scene as unknown as Phaser.Scene,
      map as unknown as Phaser.Tilemaps.Tilemap,
      player as Phaser.Physics.Arcade.Sprite,
      vi.fn(),
    );
    managers.add(manager);
    return { manager, scene, player, camera };
  }
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    for (const manager of managers) manager.destroy();
    managers.clear();
  });

  it('uses Tiled lessonId and rectangle coordinates, not object names or hardcoded positions', () => {
    create();
    gameEvents.emit(GameEvents.LESSON_PROGRESS_CHANGED, {
      currentLessonId: 'lesson-05',
      completedLessonIds: ['lesson-04'],
    });
    expect(guideCalls.setTarget).toHaveBeenLastCalledWith({
      lessonId: 'lesson-05',
      x: 2560,
      y: 850,
    });
    gameEvents.emit(GameEvents.LESSON_PROGRESS_CHANGED, {
      currentLessonId: 'lesson-06',
      completedLessonIds: ['lesson-04', 'lesson-05'],
    });
    expect(guideCalls.setTarget).toHaveBeenLastCalledWith({
      lessonId: 'lesson-06',
      x: 440,
      y: 1650,
    });
  });

  it('does not point at a completed lesson or an unknown destination', () => {
    create();
    for (const progress of [
      { currentLessonId: 'lesson-05', completedLessonIds: ['lesson-05'] },
      { currentLessonId: 'lesson-09', completedLessonIds: [] },
      { currentLessonId: null, completedLessonIds: ['lesson-05', 'lesson-06'] },
    ]) {
      gameEvents.emit(GameEvents.LESSON_PROGRESS_CHANGED, progress);
      expect(guideCalls.setTarget).toHaveBeenLastCalledWith(null);
    }
  });

  it('updates while exploring, hides during player locks and yields to proximity prompts', () => {
    const { manager, player, camera, scene } = create();
    expect(manager.update(false, false)).toBe(false);
    expect(guideCalls.update).toHaveBeenLastCalledWith(player, camera, false);
    guideCalls.hide.mockClear();
    expect(manager.update(false, true)).toBe(false);
    expect(guideCalls.hide).toHaveBeenCalledTimes(1);
    scene.physics.overlap.mockReturnValue(true);
    expect(manager.update(false, false)).toBe(true);
    expect(guideCalls.update).toHaveBeenLastCalledWith(player, camera, true);
  });

  it('does not create a guide on HUB or other zones', () => {
    const { manager, scene } = create('HubScene');
    gameEvents.emit(GameEvents.LESSON_PROGRESS_CHANGED, {
      currentLessonId: 'lesson-05',
      completedLessonIds: [],
    });
    manager.update(false, false);
    expect(scene.add.graphics).not.toHaveBeenCalled();
    expect(guideCalls.setTarget).not.toHaveBeenCalled();
    expect(guideCalls.update).not.toHaveBeenCalled();
  });

  it('destroys the guide and unsubscribes progress updates on scene shutdown', () => {
    const listenerCount = gameEvents.listenerCount(GameEvents.LESSON_PROGRESS_CHANGED);
    const { manager } = create();
    expect(gameEvents.listenerCount(GameEvents.LESSON_PROGRESS_CHANGED)).toBe(listenerCount + 1);
    manager.destroy();
    managers.delete(manager);
    expect(guideCalls.destroy).toHaveBeenCalledTimes(1);
    expect(gameEvents.listenerCount(GameEvents.LESSON_PROGRESS_CHANGED)).toBe(listenerCount);
    gameEvents.emit(GameEvents.LESSON_PROGRESS_CHANGED, {
      currentLessonId: 'lesson-05',
      completedLessonIds: [],
    });
    expect(guideCalls.setTarget).not.toHaveBeenCalled();
  });
});
