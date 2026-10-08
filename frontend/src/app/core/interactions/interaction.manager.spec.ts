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
  function create(sceneKey = 'OpenPitScene', includeDraftIntro = false, includeIntro = false, recoveredInsidePit = false,
    transition?: { targetScene: string; touch?: boolean }) {
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
          height: 30,
        },
      );
    const camera = { worldView: { left: 0, right: 1000, top: 0, bottom: 800, width: 1000, height: 800 }, zoom: 1 };
    const scene = {
      scene: { key: sceneKey },
      sys: { game: { device: { input: { touch: transition?.touch ?? false } } } },
      add: {
        text: vi.fn(text),
        container: vi.fn(() => Object.fromEntries(
          ['setDepth', 'setVisible', 'setScale', 'setPosition', 'destroy']
            .map(name => [name, vi.fn().mockReturnThis()]),
        )),
        graphics: vi.fn(() =>
          Object.fromEntries(
            [
              'fillStyle',
              'clear',
              'fillRect',
              'strokeRect',
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
      physics: {
        add: { existing: vi.fn() },
        overlap: vi.fn<(player: unknown, zone: { getData: (key: string) => unknown }) => boolean>(() => false),
      },
      cameras: { main: camera },
      tweens: { add: vi.fn(() => ({ stop: vi.fn() })) },
    };
    const map = {
      getObjectLayer: (name: string) => name === 'SpawnPoints' ? ({ objects: [
        { name: 'player-start', x: 500, y: 400 },
        { name: 'from-surface-selection', x: 520, y: 400 },
      ] }) : ({
        objects: [
          ...(transition ? [{
            name: 'portal', x: 100, y: 150, width: 120, height: 100,
            properties: [
              { name: 'interactionType', value: 'transition' },
              { name: 'targetScene', value: transition.targetScene },
              { name: 'targetSpawn', value: 'from-test' },
            ],
          }] : []),
          ...(includeIntro ? [{
            name: 'intro', x: 1500, y: 3270, width: 180, height: 162,
            properties: [
              { name: 'interactionType', value: 'dialogue' },
              { name: 'dialogueId', value: 'open-pit-intro' },
              { name: 'npcId', value: 'open-pit-guide' },
            ],
          }] : []),
          ...(includeDraftIntro ? [{
            name: 'intro', x: 1500, y: 3270, width: 180, height: 162,
            properties: [{ name: 'interactionType', value: 'Intro' }],
          }] : []),
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
    const player = recoveredInsidePit ? { x: 800, y: 1408 } : { x: 500, y: 400 };
    const requestSceneTransition = vi.fn();
    const manager = new InteractionManager(
      scene as unknown as Phaser.Scene,
      map as unknown as Phaser.Tilemaps.Tilemap,
      player as Phaser.Physics.Arcade.Sprite,
      requestSceneTransition,
    );
    managers.add(manager);
    return { manager, scene, player, camera, requestSceneTransition };
  }
  it('guides the final return to the authored intro zone and reuses it without triggering the intro', () => {
    const { manager, scene } = create('OpenPitScene', false, true);
    const completedLessonIds = Array.from({ length: 9 }, (_, index) => `lesson-0${index + 1}`);
    gameEvents.emit(GameEvents.LESSON_PROGRESS_CHANGED, { currentLessonId: 'lesson-09', completedLessonIds: completedLessonIds.slice(0, -1) });
    expect(guideCalls.setTarget).not.toHaveBeenLastCalledWith({ label: 'Centro de control', x: 1590, y: 3351 });
    gameEvents.emit(GameEvents.LESSON_PROGRESS_CHANGED, { currentLessonId: null, completedLessonIds });
    expect(guideCalls.setTarget).toHaveBeenLastCalledWith({ label: 'Centro de control', x: 1590, y: 3351 });
    const open = vi.fn(); gameEvents.on(GameEvents.OPEN_DIALOGUE, open);
    try {
      scene.physics.overlap.mockReturnValue(true);
      manager.update(true, false);
      expect(open).toHaveBeenLastCalledWith({ dialogueId: 'open-pit-closing', npcId: 'open-pit-guide' });
      gameEvents.emit(GameEvents.LESSON_PROGRESS_CHANGED, { currentLessonId: null, completedLessonIds, openPitReportDelivered: true });
      expect(guideCalls.setTarget).toHaveBeenLastCalledWith(null);
      manager.update(true, false);
      expect(open).toHaveBeenLastCalledWith({ dialogueId: 'open-pit-closing', npcId: 'open-pit-guide' });
    } finally { gameEvents.off(GameEvents.OPEN_DIALOGUE, open); }
  });

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

  it('prioritizes the intro on entry, keeps it after cancellation and returns to the lesson only on completion', () => {
    const guidance = vi.fn();
    gameEvents.on(GameEvents.INTRO_GUIDANCE_CHANGED, guidance);
    try {
      const { manager, scene } = create('OpenPitScene', false, true);
      gameEvents.emit(GameEvents.LESSON_PROGRESS_CHANGED, { currentLessonId: 'lesson-05', completedLessonIds: [] });
      expect(guidance).toHaveBeenLastCalledWith({ sceneKey: 'OpenPitScene', active: true });
      expect(guideCalls.setTarget).toHaveBeenLastCalledWith({ label: 'Supervisor', x: 1590, y: 3351 });
      gameEvents.emit(GameEvents.UNLOCK_PLAYER); // Closing the dialogue is not completion.
      for (const request of [
        { sceneKey: 'HubScene', dialogueId: 'open-pit-intro' },
        { sceneKey: 'OpenPitScene', dialogueId: 'intro-01' },
      ]) gameEvents.emit(GameEvents.DIALOGUE_COMPLETED, request);
      expect(guidance).toHaveBeenCalledTimes(1);
      scene.physics.overlap.mockReturnValue(true);
      manager.update(false, false);
      expect(scene.add.text.mock.results[scene.add.text.mock.results.length - 2].value.setText)
        .toHaveBeenLastCalledWith('Habla con el supervisor');
      expect(scene.add.text.mock.results[scene.add.text.mock.results.length - 1].value.setText)
        .toHaveBeenLastCalledWith('[E] · Conversar');
      gameEvents.emit(GameEvents.DIALOGUE_COMPLETED, { sceneKey: 'OpenPitScene', dialogueId: 'open-pit-intro' });
      expect(guidance).toHaveBeenLastCalledWith({ sceneKey: 'OpenPitScene', active: false });
      expect(guideCalls.setTarget).toHaveBeenLastCalledWith({ lessonId: 'lesson-05', x: 2560, y: 850 });
    } finally { gameEvents.off(GameEvents.INTRO_GUIDANCE_CHANGED, guidance); }
  });

  it('does not send a recovered player inside the pit back to the introduction', () => {
    create('OpenPitScene', false, true, true);
    gameEvents.emit(GameEvents.LESSON_PROGRESS_CHANGED, { currentLessonId: 'lesson-05', completedLessonIds: [] });
    expect(guideCalls.setTarget).toHaveBeenLastCalledWith({ lessonId: 'lesson-05', x: 2560, y: 850 });
  });

  it('accepts previously completed guidance during construction and keeps the next lesson instead', () => {
    const dismissSeenIntro = ({ sceneKey, active }: { sceneKey: string; active: boolean }) => {
      if (active) gameEvents.emit(GameEvents.INTRO_GUIDANCE_DISMISSED, sceneKey);
    };
    gameEvents.on(GameEvents.INTRO_GUIDANCE_CHANGED, dismissSeenIntro);
    try {
      const { manager } = create('OpenPitScene', false, true);
      gameEvents.emit(GameEvents.LESSON_PROGRESS_CHANGED, { currentLessonId: 'lesson-05', completedLessonIds: [] });
      manager.update(false, false);
      expect(guideCalls.setTarget).not.toHaveBeenCalledWith(expect.objectContaining({ label: 'Supervisor' }));
      expect(guideCalls.setTarget).toHaveBeenLastCalledWith({ lessonId: 'lesson-05', x: 2560, y: 850 });
    } finally { gameEvents.off(GameEvents.INTRO_GUIDANCE_CHANGED, dismissSeenIntro); }
  });

  it('ignores draft Tiled interaction types instead of offering a button with no action', () => {
    const { scene } = create('OpenPitScene', true);
    expect(scene.add.zone).toHaveBeenCalledTimes(2);
    expect(scene.add.zone).not.toHaveBeenCalledWith(1590, 3351, 180, 162);
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
    expect(scene.add.graphics).toHaveBeenCalledTimes(1); // Only the proximity ficha, not a guide.
    expect(guideCalls.setTarget).not.toHaveBeenCalled();
    expect(guideCalls.update).not.toHaveBeenCalled();
  });

  it('shows the topic ficha on proximity, preserves the E action and hides it when locked', () => {
    const { manager, scene } = create();
    const prompt = scene.add.container.mock.results[0].value;
    const topic = scene.add.text.mock.results[3].value;
    scene.physics.overlap.mockReturnValue(true);
    const opened = vi.fn();
    gameEvents.on(GameEvents.OPEN_LESSON, opened);
    try {
      manager.update(true, false);
      expect(topic.setText).toHaveBeenLastCalledWith('Desviación respecto al promedio');
      expect(prompt.setVisible).toHaveBeenLastCalledWith(true);
      expect(opened).toHaveBeenCalledWith({ lessonId: 'lesson-05' });
      manager.update(false, true);
      expect(prompt.setVisible).toHaveBeenLastCalledWith(false);
    } finally {
      gameEvents.off(GameEvents.OPEN_LESSON, opened);
    }
  });

  it.each([
    ['QuarriesScene', 'Canteras'],
    ['Zone02Scene', 'Zona 2'],
    ['Zone03Scene', 'Zona 3'],
    ['Zone04Scene', 'Zona 4'],
  ])('shows a preparation notice for %s and never requests entry', (targetScene, label) => {
    const { manager, scene, player, camera, requestSceneTransition } = create('OpenPitScene', false, false, false, { targetScene });
    const oldNotice = scene.add.text.mock.results[0].value;
    const notice = scene.add.container.mock.results[0].value;
    const heading = scene.add.text.mock.results[1].value;
    const topic = scene.add.text.mock.results[3].value;
    const footer = scene.add.text.mock.results[4].value;
    scene.physics.overlap.mockReturnValue(true);
    for (const interactRequested of [false, true, true]) {
      expect(manager.update(interactRequested, false)).toBe(false);
      expect(heading.setText).toHaveBeenLastCalledWith('ZONA EN PREPARACIÓN');
      expect(topic.setText).toHaveBeenLastCalledWith(label);
      expect(footer.setText).toHaveBeenLastCalledWith('Próximamente podrás explorarla.');
      expect(notice.setVisible).toHaveBeenLastCalledWith(true);
      expect(oldNotice.setVisible).toHaveBeenLastCalledWith(false);
    }
    expect(requestSceneTransition).not.toHaveBeenCalled();
    // Hide the next-lesson guide while the preparation notice occupies its place.
    expect(guideCalls.update).toHaveBeenLastCalledWith(player, camera, true);
    scene.physics.overlap.mockReturnValue(false);
    expect(manager.update(false, false)).toBe(false);
    expect(notice.setVisible).toHaveBeenLastCalledWith(false);
  });

  it('returns no available mobile action at a zone in preparation and hides its notice when locked', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    try {
      const { manager, scene, requestSceneTransition } = create('SurfaceSelectionScene', false, false, false,
        { targetScene: 'QuarriesScene', touch: true });
      const notice = scene.add.container.mock.results[0].value;
      const topic = scene.add.text.mock.results[3].value;
      const footer = scene.add.text.mock.results[4].value;
      scene.physics.overlap.mockReturnValue(true);
      expect(manager.update(true, false)).toBe(false);
      expect(topic.setText).toHaveBeenLastCalledWith('Canteras');
      expect(footer.setText).toHaveBeenLastCalledWith('Próximamente podrás explorarla.');
      expect(notice.setVisible).toHaveBeenLastCalledWith(true);
      expect(requestSceneTransition).not.toHaveBeenCalled();
      expect(manager.update(true, true)).toBe(false);
      expect(notice.setVisible).toHaveBeenLastCalledWith(false);
    } finally { vi.unstubAllGlobals(); }
  });

  it.each([
    ['HubScene', 'HUB'],
    ['SurfaceSelectionScene', 'Minería de Superficie'],
    ['OpenPitScene', 'Tajo Abierto / Open Pit'],
  ])('preserves the entry prompt and transition to %s', (targetScene, label) => {
    const { manager, scene, requestSceneTransition } = create('HubScene', false, false, false, { targetScene });
    const oldNotice = scene.add.text.mock.results[0].value;
    const notice = scene.add.container.mock.results[0].value;
    const heading = scene.add.text.mock.results[1].value;
    const status = scene.add.text.mock.results[2].value;
    const topic = scene.add.text.mock.results[3].value;
    const action = scene.add.text.mock.results[4].value;
    scene.physics.overlap.mockReturnValue(true);
    expect(manager.update(true, false)).toBe(true);
    expect(heading.setText).toHaveBeenLastCalledWith('ZONA');
    expect(status.setText).toHaveBeenLastCalledWith('DISPONIBLE');
    expect(topic.setText).toHaveBeenLastCalledWith(label);
    expect(action.setText).toHaveBeenLastCalledWith('[E] · Entrar');
    expect(notice.setVisible).toHaveBeenLastCalledWith(true);
    expect(oldNotice.setVisible).toHaveBeenLastCalledWith(false);
    expect(requestSceneTransition).toHaveBeenCalledExactlyOnceWith(targetScene, 'from-test');
    scene.physics.overlap.mockReturnValue(false);
    expect(manager.update(false, false)).toBe(false);
    expect(notice.setVisible).toHaveBeenLastCalledWith(false);
  });

  it('shows the available zone ficha with the touch action and preserves mobile entry', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    try {
      const { manager, scene, requestSceneTransition } = create('SurfaceSelectionScene', false, false, false,
        { targetScene: 'OpenPitScene', touch: true });
      const notice = scene.add.container.mock.results[0].value;
      const action = scene.add.text.mock.results[4].value;
      scene.physics.overlap.mockReturnValue(true);
      expect(manager.update(true, false)).toBe(true);
      expect(action.setText).toHaveBeenLastCalledWith('Toca E · Entrar');
      expect(notice.setVisible).toHaveBeenLastCalledWith(true);
      expect(requestSceneTransition).toHaveBeenCalledExactlyOnceWith('OpenPitScene', 'from-test');
      expect(manager.update(true, true)).toBe(false);
      expect(notice.setVisible).toHaveBeenLastCalledWith(false);
      expect(requestSceneTransition).toHaveBeenCalledOnce();
    } finally { vi.unstubAllGlobals(); }
  });

  it('keeps a lesson available after leaving a zone in preparation', () => {
    const { manager, scene, requestSceneTransition } = create('OpenPitScene', false, false, false, { targetScene: 'Zone02Scene' });
    scene.physics.overlap.mockReturnValue(true);
    expect(manager.update(true, false)).toBe(false);
    scene.physics.overlap.mockImplementation((_, zone) => zone.getData('lessonId') === 'lesson-05');
    const opened = vi.fn();
    gameEvents.on(GameEvents.OPEN_LESSON, opened);
    try {
      expect(manager.update(true, false)).toBe(true);
      expect(opened).toHaveBeenCalledExactlyOnceWith({ lessonId: 'lesson-05' });
      expect(scene.add.text.mock.results[3].value.setText).toHaveBeenLastCalledWith('Desviación respecto al promedio');
      expect(scene.add.text.mock.results[4].value.setText).toHaveBeenLastCalledWith('[E] · Iniciar');
      expect(requestSceneTransition).not.toHaveBeenCalled();
    } finally { gameEvents.off(GameEvents.OPEN_LESSON, opened); }
  });

  it('destroys the guide and unsubscribes progress updates on scene shutdown', () => {
    const listenerCount = gameEvents.listenerCount(GameEvents.LESSON_PROGRESS_CHANGED);
    const dialogueCount = gameEvents.listenerCount(GameEvents.DIALOGUE_COMPLETED);
    const introDismissCount = gameEvents.listenerCount(GameEvents.INTRO_GUIDANCE_DISMISSED);
    const { manager } = create();
    expect(gameEvents.listenerCount(GameEvents.LESSON_PROGRESS_CHANGED)).toBe(listenerCount + 1);
    manager.destroy();
    managers.delete(manager);
    expect(guideCalls.destroy).toHaveBeenCalledTimes(1);
    expect(gameEvents.listenerCount(GameEvents.LESSON_PROGRESS_CHANGED)).toBe(listenerCount);
    expect(gameEvents.listenerCount(GameEvents.DIALOGUE_COMPLETED)).toBe(dialogueCount);
    expect(gameEvents.listenerCount(GameEvents.INTRO_GUIDANCE_DISMISSED)).toBe(introDismissCount);
    gameEvents.emit(GameEvents.LESSON_PROGRESS_CHANGED, {
      currentLessonId: 'lesson-05',
      completedLessonIds: [],
    });
    expect(guideCalls.setTarget).not.toHaveBeenCalled();
  });
});
