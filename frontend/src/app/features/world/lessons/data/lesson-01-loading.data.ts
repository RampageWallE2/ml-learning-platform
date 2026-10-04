import { LessonDefinition } from '../lesson.types';

export const LESSON_01_LOADING: LessonDefinition = {
  id: 'lesson-01',
  steps: [
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-01-loading-intro',
        messages: [
          { speaker: 'npc', characterId: 'loading-supervisor', name: 'Encargado del carguío', text: 'El siguiente turno está por llegar. Estoy revisando cuánto material llevó cada camión.' },
          { speaker: 'npc', characterId: 'loading-supervisor', name: 'Encargado del carguío', text: 'Ayúdame a comparar dos grupos. ¿Sus cargas fueron parecidas o hubo mucha diferencia?' }
        ]
      }
    },
    { type: 'exercise', exerciseId: 'loading-spread' },
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-01-loading-end',
        messages: [
          { speaker: 'npc', characterId: 'loading-supervisor', name: 'Encargado del carguío', text: 'El grupo B tuvo cargas más diferentes entre sí. Lo añadiré al informe del siguiente turno.' },
          { speaker: 'player', characterId: 'player', name: 'Tú', text: 'Y llevar más material no significa que las cargas sean más diferentes.' },
          { speaker: 'npc', characterId: 'loading-supervisor', name: 'Encargado del carguío', text: 'Exacto. Ahora pasa por control de acarreo. Están comparando dos turnos y necesitan tu ayuda para revisar su informe.' }
        ]
      }
    }
  ]
};
