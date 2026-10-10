import type { LessonProgressStatus, ZoneProgress } from '../../progress/progress.types';
import { LEARNING_ZONES } from '../../lessons/lesson-catalog';
import { getWorldProgressPanel, type WorldProgressPanelContext } from './world-progress-panel';

function createZone(
  statuses: readonly LessonProgressStatus[] = ['completed', 'pending', 'current'],
  id = 'zone-01',
): ZoneProgress {
  const completedLessons = statuses.filter((status) => status === 'completed').length;
  return {
    id,
    name: id === 'zone-01' ? 'Open Pit' : 'Zona 2',
    topic: 'Dispersión',
    lessons: statuses.map((status, index) => ({
      lessonId: 'lesson-' + (index + 1),
      name: 'Clase ' + (index + 1),
      objective: 'Objetivo ' + (index + 1),
      status,
    })),
    completedLessons,
    totalLessons: statuses.length,
    percentage: statuses.length ? (completedLessons / statuses.length) * 100 : 0,
    completed: statuses.length > 0 && completedLessons === statuses.length,
  };
}

function context(overrides: Partial<WorldProgressPanelContext> = {}): WorldProgressPanelContext {
  return {
    sceneKey: 'OpenPitScene',
    sceneZone: { zoneId: 'zone-01', name: 'Open Pit' },
    zones: [],
    introActive: false,
    reportReady: false,
    returnToSupervisor: false,
    ...overrides,
  };
}

describe('getWorldProgressPanel', () => {
  it.each([
    {
      sceneKey: 'HubScene',
      name: 'HUB',
      topic: 'Selección principal',
      objective: 'Elige un ámbito para comenzar tu recorrido.',
      shortObjective: 'Elige dónde empezar',
    },
    {
      sceneKey: 'SurfaceSelectionScene',
      name: 'Minería de Superficie',
      topic: 'Selección de modalidad',
      objective: 'Elige Tajo Abierto / Open Pit para entrar al escenario.',
      shortObjective: 'Entra a Open Pit',
    },
  ])(
    'keeps the existing instruction for $sceneKey',
    ({ sceneKey, name, topic, objective, shortObjective }) => {
      expect(getWorldProgressPanel(context({ sceneKey, zones: [createZone()] }))).toEqual({
        name,
        topic,
        objective,
        shortObjective,
        zone: null,
      });
    },
  );

  it('uses the exploration fallback for an unregistered scene', () => {
    expect(getWorldProgressPanel(context({ sceneKey: 'UnknownScene', sceneZone: null }))).toEqual({
      name: 'Mundo',
      topic: 'Exploración',
      objective: 'Continúa explorando el escenario.',
      shortObjective: 'Explora el escenario',
      zone: null,
    });
  });

  it.each([false, true])(
    'keeps an unconfigured zone separate from report readiness %s',
    (reportReady) => {
      expect(getWorldProgressPanel(context({ reportReady, returnToSupervisor: true }))).toEqual({
        name: 'Open Pit',
        topic: 'Próximamente',
        objective: 'Esta zona todavía no tiene actividades configuradas.',
        shortObjective: 'Zona próximamente',
        zone: null,
      });
    },
  );

  it.each(['pending', 'current'] as const)(
    'selects the first unfinished lesson with status %s',
    (status) => {
      const zone = createZone(['completed', status, 'current']);
      const panel = getWorldProgressPanel(context({ zones: [zone] }));
      expect(panel).toEqual({
        name: zone.name,
        topic: zone.topic,
        objective: 'Objetivo 2',
        shortObjective: 'Objetivo 2',
        zone,
      });
      expect(panel.zone).toBe(zone);
    },
  );

  it('gives an active introduction priority over the next lesson', () => {
    expect(getWorldProgressPanel(context({ zones: [createZone()], introActive: true }))).toEqual({
      name: 'Open Pit',
      topic: 'Introducción',
      objective: 'Habla con el supervisor para empezar.',
      shortObjective: 'Habla con el supervisor',
      zone: null,
    });
  });

  it.each([
    {
      returnToSupervisor: true,
      objective: 'Vuelve al centro de control y entrega el informe al supervisor.',
      shortObjective: 'Entrega el informe',
    },
    {
      returnToSupervisor: false,
      objective: 'Informe entregado. Puedes revisar tus clases y el informe.',
      shortObjective: 'Informe entregado',
    },
  ])(
    'keeps the closing instruction when returnToSupervisor is $returnToSupervisor',
    ({ returnToSupervisor, objective, shortObjective }) => {
      const zone = createZone(['completed', 'completed', 'completed']);
      expect(
        getWorldProgressPanel(
          context({
            zones: [zone],
            introActive: true,
            reportReady: true,
            returnToSupervisor,
          }),
        ),
      ).toEqual({ name: zone.name, topic: 'Cierre del turno', objective, shortObjective, zone });
    },
  );

  it('selects the matching zone rather than the first one', () => {
    const zone = createZone(['pending'], 'zone-02');
    expect(
      getWorldProgressPanel(
        context({
          sceneKey: 'Zone02Scene',
          sceneZone: { zoneId: zone.id, name: zone.name },
          zones: [createZone(), zone],
          reportReady: true,
          returnToSupervisor: true,
        }),
      ),
    ).toEqual({
      name: zone.name,
      topic: zone.topic,
      objective: 'Objetivo 1',
      shortObjective: 'Objetivo 1',
      zone,
    });
  });

  it.each([
    { label: 'completed', statuses: ['completed', 'completed'] as const },
    { label: 'empty', statuses: [] as const },
  ])('preserves the completion fallback for a $label lesson list', ({ statuses }) => {
    const zone = createZone(statuses, 'zone-02');
    expect(
      getWorldProgressPanel(
        context({
          sceneKey: 'Zone02Scene',
          sceneZone: { zoneId: zone.id, name: zone.name },
          zones: [zone],
          reportReady: true,
          returnToSupervisor: true,
        }),
      ),
    ).toEqual({
      name: zone.name,
      topic: zone.topic,
      objective: 'Has completado todas las actividades de esta zona.',
      shortObjective: 'Recorrido completado',
      zone,
    });
  });

  it.each(LEARNING_ZONES[0].lessons.map((lesson, index) => ({ lesson, index })))(
    'uses the authored short direction for $lesson.lessonId without truncating its full objective',
    ({ lesson, index }) => {
      const zone: ZoneProgress = {
        ...createZone(),
        completedLessons: index,
        totalLessons: 9,
        completed: false,
        lessons: LEARNING_ZONES[0].lessons.map((entry, position) => ({
          lessonId: entry.lessonId,
          name: entry.name,
          objective: entry.objective,
          status: position < index ? 'completed' : position === index ? 'current' : 'pending',
        })),
      };
      const panel = getWorldProgressPanel(context({ zones: [zone] }));
      expect(panel.shortObjective).toBe(lesson.shortObjective);
      expect(panel.shortObjective.length).toBeLessThanOrEqual(24);
      expect(panel.objective).toBe(lesson.objective);
      expect(panel.zone).toBe(zone);
    },
  );

  it('does not mutate the supplied progress or retain state between calls', () => {
    const zone = createZone();
    zone.lessons.forEach((lesson) => Object.freeze(lesson));
    Object.freeze(zone.lessons);
    Object.freeze(zone);
    const input = Object.freeze(context({ zones: Object.freeze([zone]) }));
    const saved = structuredClone(input);
    const first = getWorldProgressPanel(input);
    getWorldProgressPanel(context({ introActive: true }));
    expect(getWorldProgressPanel(input)).toEqual(first);
    expect(input).toEqual(saved);
    expect(first.zone).toBe(zone);
  });
});
