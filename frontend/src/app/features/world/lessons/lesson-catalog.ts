import { LESSON_01_LOADING } from './data/lesson-01-loading.data';
import { LESSON_02_RAMP } from './data/lesson-02-ramp.data';
import { LESSON_03_HAULAGE } from './data/lesson-03-haulage.data';
import { LESSON_04_WORKSHOP } from './data/lesson-04-workshop.data';
import { LESSON_05_CRUSHING } from './data/lesson-05-crushing.data';
import { LESSON_06_SAG } from './data/lesson-06-sag.data';
import { LESSON_07_BALLS } from './data/lesson-07-balls.data';
import { LESSON_08_FLOTATION } from './data/lesson-08-flotation.data';
import { LESSON_09_THICKENERS } from './data/lesson-09-thickeners.data';
import { LessonDefinition } from './lesson.types';

export type LessonCatalogEntry = Readonly<{
  lessonId: string;
  name: string;
  objective: string;
  shortObjective: string;
  definition: LessonDefinition;
}>;

export type ZoneCatalogEntry = Readonly<{
  id: string;
  name: string;
  topic: string;
  lessons: readonly LessonCatalogEntry[];
}>;

/**
 * Única fuente de verdad para las lecciones implementadas y disponibles.
 * Las lecciones futuras pueden conservar sus archivos, pero no se registran
 * aquí hasta que su flujo completo esté listo para mostrarse en el juego.
 */
export const LEARNING_ZONES: readonly ZoneCatalogEntry[] = [
  {
    id: 'zone-01',
    name: 'Open Pit',
    topic: 'Dispersión',
    lessons: [
      {
        lessonId: 'lesson-01',
        name: 'Dispersión de los datos',
        objective: 'Ve al fondo del tajo y habla con el encargado del carguío.',
        shortObjective: 'Ve al fondo del tajo',
        definition: LESSON_01_LOADING,
      },
      {
        lessonId: 'lesson-02',
        name: 'Promedio y dispersión',
        objective: 'Ve a la rampa y habla con el encargado del control.',
        shortObjective: 'Ve a la rampa',
        definition: LESSON_02_RAMP,
      },
      {
        lessonId: 'lesson-03',
        name: 'Cálculo del rango',
        objective: 'Ve al botadero de desmonte y habla con su encargado.',
        shortObjective: 'Ve al botadero',
        definition: LESSON_03_HAULAGE,
      },
      {
        lessonId: 'lesson-04',
        name: 'Límites del rango',
        objective: 'Ve al taller de mantenimiento y habla con su encargado.',
        shortObjective: 'Ve al taller',
        definition: LESSON_04_WORKSHOP,
      },
      {
        lessonId: 'lesson-05',
        name: 'Desviación respecto al promedio',
        objective: 'Ve a ROM / chancado y habla con el operador.',
        shortObjective: 'Ve a ROM / chancado',
        definition: LESSON_05_CRUSHING,
      },
      {
        lessonId: 'lesson-06',
        name: 'Cálculo de la varianza',
        objective: 'Ve al molino SAG y habla con el operador.',
        shortObjective: 'Ve al molino SAG',
        definition: LESSON_06_SAG,
      },
      {
        lessonId: 'lesson-07',
        name: 'Comparación de varianzas',
        objective: 'Ve al molino de bolas e hidrociclones y habla con el operador.',
        shortObjective: 'Ve al molino de bolas',
        definition: LESSON_07_BALLS,
      },
      {
        lessonId: 'lesson-08',
        name: 'Desviación estándar',
        objective: 'Ve a flotación y habla con el operador.',
        shortObjective: 'Ve a flotación',
        definition: LESSON_08_FLOTATION,
      },
      {
        lessonId: 'lesson-09',
        name: 'Promedio, dispersión y metas',
        objective: 'Ve a los espesadores y habla con el operador.',
        shortObjective: 'Ve a los espesadores',
        definition: LESSON_09_THICKENERS,
      },
    ],
  },
];

const lessonDefinitions = LEARNING_ZONES.flatMap((zone) => zone.lessons).map(
  (lesson) => [lesson.lessonId, lesson.definition] as const,
);

export const LESSON_DEFINITIONS: Readonly<Record<string, LessonDefinition>> =
  Object.fromEntries(lessonDefinitions);

/** Nombres compartidos por las actividades, el HUD y Mi progreso. */
export const LESSON_NAMES: Readonly<Record<string, string>> = Object.fromEntries(
  LEARNING_ZONES.flatMap((zone) => zone.lessons).map(({ lessonId, name }) => [lessonId, name]),
);

/** Brief map directions; full instructions remain in the same lesson catalog. */
export const LESSON_SHORT_OBJECTIVES: Readonly<Record<string, string>> = Object.fromEntries(
  LEARNING_ZONES.flatMap((zone) => zone.lessons).map(({ lessonId, shortObjective }) => [
    lessonId,
    shortObjective,
  ]),
);
