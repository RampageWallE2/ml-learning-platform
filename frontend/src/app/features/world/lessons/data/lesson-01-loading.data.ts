import { LessonDefinition } from '../lesson.types';

export const LESSON_01_LOADING: LessonDefinition = {
  id: 'lesson-01',
  steps: [
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-01-loading-intro',
        messages: [
          {
            speaker: 'npc',
            characterId: 'loading-supervisor',
            name: 'Encargado del carguío',
            text: 'El siguiente turno está por llegar. Estoy revisando cuánto material llevó cada camión.',
          },
          {
            speaker: 'npc',
            characterId: 'loading-supervisor',
            name: 'Encargado del carguío',
            text: 'Ayúdame a comparar dos grupos. ¿Sus cargas fueron parecidas o hubo mucha diferencia?',
          },
        ],
      },
    },
    { type: 'exercise', exerciseId: 'loading-spread' },
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-01-loading-end',
        messages: [
          {
            speaker: 'npc',
            characterId: 'loading-supervisor',
            name: 'Encargado del carguío',
            text: 'El grupo B tuvo cargas más diferentes entre sí. Lo añadiré al informe del siguiente turno.',
          },
          {
            speaker: 'player',
            characterId: 'player',
            name: 'Tú',
            text: 'Para comparar los grupos, tengo que mirar todas las cargas, no solo la más grande.',
          },
          {
            speaker: 'npc',
            characterId: 'loading-supervisor',
            name: 'Encargado del carguío',
            text: 'Ahora pasa por control de acarreo. Necesitan tu ayuda para comparar dos turnos.',
          },
        ],
      },
    },
  ],
};
