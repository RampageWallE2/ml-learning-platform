import type { ZoneProgress } from '../../progress/progress.types';
import { LESSON_SHORT_OBJECTIVES } from '../../lessons/lesson-catalog';

export type SceneZoneMetadata = Readonly<{
  zoneId: string;
  name: string;
}>;

export type WorldProgressPanel = Readonly<{
  name: string;
  topic: string;
  objective: string;
  shortObjective: string;
  zone: ZoneProgress | null;
}>;

export type WorldProgressPanelContext = Readonly<{
  sceneKey: string;
  sceneZone: SceneZoneMetadata | null;
  zones: readonly ZoneProgress[];
  introActive: boolean;
  reportReady: boolean;
  returnToSupervisor: boolean;
}>;

/** Selects the objective to display without changing progress or the world. */
export function getWorldProgressPanel({
  sceneKey,
  sceneZone,
  zones,
  introActive,
  reportReady,
  returnToSupervisor,
}: WorldProgressPanelContext): WorldProgressPanel {
  if (introActive && !reportReady) {
    return {
      name: 'Open Pit',
      topic: 'Introducción',
      objective: 'Habla con el supervisor para empezar.',
      shortObjective: 'Habla con el supervisor',
      zone: null,
    };
  }

  if (sceneKey === 'HubScene') {
    return {
      name: 'HUB',
      topic: 'Selección principal',
      objective: 'Elige un ámbito para comenzar tu recorrido.',
      shortObjective: 'Elige dónde empezar',
      zone: null,
    };
  }

  if (sceneKey === 'SurfaceSelectionScene') {
    return {
      name: 'Minería de Superficie',
      topic: 'Selección de modalidad',
      objective: 'Elige Tajo Abierto / Open Pit para entrar al escenario.',
      shortObjective: 'Entra a Open Pit',
      zone: null,
    };
  }

  if (!sceneZone) {
    return {
      name: 'Mundo',
      topic: 'Exploración',
      objective: 'Continúa explorando el escenario.',
      shortObjective: 'Explora el escenario',
      zone: null,
    };
  }

  const zone = zones.find((item) => item.id === sceneZone.zoneId) ?? null;
  if (!zone) {
    return {
      name: sceneZone.name,
      topic: 'Próximamente',
      objective: 'Esta zona todavía no tiene actividades configuradas.',
      shortObjective: 'Zona próximamente',
      zone: null,
    };
  }

  const nextLesson = zone.lessons.find((lesson) => lesson.status !== 'completed');
  if (sceneKey === 'OpenPitScene' && reportReady) {
    return {
      name: zone.name,
      topic: 'Cierre del turno',
      objective: returnToSupervisor
        ? 'Vuelve al centro de control y entrega el informe al supervisor.'
        : 'Informe entregado. Puedes revisar tus clases y el informe.',
      shortObjective: returnToSupervisor ? 'Entrega el informe' : 'Informe entregado',
      zone,
    };
  }

  return {
    name: zone.name,
    topic: zone.topic,
    objective: nextLesson?.objective ?? 'Has completado todas las actividades de esta zona.',
    shortObjective: nextLesson
      ? (LESSON_SHORT_OBJECTIVES[nextLesson.lessonId] ?? nextLesson.objective)
      : 'Recorrido completado',
    zone,
  };
}
