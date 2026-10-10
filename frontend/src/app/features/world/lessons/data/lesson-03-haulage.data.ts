import { LessonDefinition } from '../lesson.types';

export const LESSON_03_HAULAGE: LessonDefinition = {
  id: 'lesson-03',
  steps: [
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-03-haulage-intro',
        messages: [
          {
            speaker: 'npc',
            characterId: 'haulage-controller',
            name: 'Encargado del botadero',
            text: 'Bienvenido al botadero. Aquí descargamos el material de descarte, llamado desmonte.',
            kind: 'context',
          },
          {
            speaker: 'npc',
            characterId: 'haulage-controller',
            name: 'Encargado del botadero',
            text: 'Anotamos cuánto dura cada descarga. El equipo que organiza las llegadas del siguiente turno necesita conocer esos tiempos.',
            kind: 'context',
          },
          {
            speaker: 'npc',
            characterId: 'haulage-controller',
            name: 'Encargado del botadero',
            text: 'Estas cinco descargas son del mismo tipo. Ayúdame a preparar un aviso.',
            kind: 'context',
          },
          {
            speaker: 'npc',
            characterId: 'haulage-controller',
            name: 'Encargado del botadero',
            text: 'Busca la más corta, la más larga y cuánto las separa.',
            kind: 'task',
          },
        ],
      },
    },
    { type: 'exercise', exerciseId: 'haulage-range' },
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-03-haulage-end',
        nextDestination: 'Taller de mantenimiento',
        completionLabel: 'Volver al mapa',
        messages: [
          {
            speaker: 'player',
            characterId: 'player',
            name: 'Tú',
            text: 'La diferencia entre la descarga más corta y la más larga fue de 7 minutos.',
            kind: 'finding',
            facts: [
              { label: 'Más corta', value: '11 min' },
              { label: 'Más larga', value: '18 min' },
              { label: 'Diferencia', value: '7 min' },
            ],
          },
          {
            speaker: 'npc',
            characterId: 'haulage-controller',
            name: 'Encargado del botadero',
            text: 'Añadiré tu aviso al informe del siguiente turno para preparar las llegadas.',
          },
          {
            speaker: 'npc',
            characterId: 'haulage-controller',
            name: 'Encargado del botadero',
            text: 'El rango muestra lo que pasó, pero las próximas descargas pueden durar distinto.',
            kind: 'reminder',
          },
          {
            speaker: 'player',
            characterId: 'player',
            name: 'Tú',
            text: 'Y estos tiempos no explican por qué hubo diferencias.',
            kind: 'reminder',
          },
          {
            speaker: 'npc',
            characterId: 'haulage-controller',
            name: 'Encargado del botadero',
            text: 'Habla con el encargado para comparar registros del taller que tienen el mismo rango.',
            kind: 'task',
          },
        ],
      },
    },
  ],
};
