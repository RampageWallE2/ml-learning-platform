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
        name: 'Carguío en el fondo del tajo',
        objective: 'Ve al fondo del tajo y habla con el encargado del carguío.',
        definition: LESSON_01_LOADING,
      },
      {
        lessonId: 'lesson-02',
        name: 'Control de turnos en la rampa',
        objective: 'Ve a la rampa y habla con el encargado del control.',
        definition: LESSON_02_RAMP,
      },
      {
        lessonId: 'lesson-03',
        name: 'Tiempos de descarga en el botadero',
        objective: 'Ve al botadero de desmonte y habla con su encargado.',
        definition: LESSON_03_HAULAGE,
      },
      {
        lessonId: 'lesson-04',
        name: 'Mismo rango, ¿mismos datos?',
        objective: 'Ve al taller de mantenimiento y habla con su encargado.',
        definition: LESSON_04_WORKSHOP,
      },
      {
        lessonId: 'lesson-05',
        name: 'Separación de cada dato del promedio',
        objective: 'Ve a ROM / chancado y habla con el operador.',
        definition: LESSON_05_CRUSHING,
      },
      {
        lessonId: 'lesson-06',
        name: 'Construir la varianza en el molino SAG',
        objective: 'Ve al molino SAG y habla con el operador.',
        definition: LESSON_06_SAG,
      },
      {
        lessonId: 'lesson-07',
        name: 'Aplicar la varianza en bolas e hidrociclones',
        objective: 'Ve al molino de bolas e hidrociclones y habla con el operador.',
        definition: LESSON_07_BALLS,
      },
      {
        lessonId: 'lesson-08',
        name: 'Desviación estándar en flotación',
        objective: 'Ve a flotación y habla con el operador.',
        definition: LESSON_08_FLOTATION,
      },
      {
        lessonId: 'lesson-09',
        name: 'Informe final en espesadores',
        objective: 'Ve a los espesadores y habla con el operador.',
        definition: LESSON_09_THICKENERS,
      },
    ],
  },
];

const lessonDefinitions = LEARNING_ZONES.flatMap(zone => zone.lessons).map(
  lesson => [lesson.lessonId, lesson.definition] as const,
);

export const LESSON_DEFINITIONS: Readonly<Record<string, LessonDefinition>> =
  Object.fromEntries(lessonDefinitions);
