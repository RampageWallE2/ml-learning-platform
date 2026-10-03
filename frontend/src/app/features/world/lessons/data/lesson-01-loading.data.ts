import { LessonDefinition } from '../lesson.types';

export const LESSON_01_LOADING: LessonDefinition = {
  id: 'lesson-01',
  steps: [
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-01-loading-intro',
        messages: [
          { speaker: 'npc', characterId: 'loading-supervisor', name: 'Encargado del carguío', text: 'Estoy preparando estos registros para el relevo. Aquí están las cargas de dos grupos de camiones.' },
          { speaker: 'npc', characterId: 'loading-supervisor', name: 'Encargado del carguío', text: 'Necesito señalar en cuál las cargas fueron más parecidas y en cuál hubo mayores diferencias.' },
          { speaker: 'npc', characterId: 'loading-supervisor', name: 'Encargado del carguío', text: 'Ayúdame a compararlas.' }
        ]
      }
    },
    { type: 'exercise', exerciseId: 'loading-spread' },
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-01-loading-end',
        messages: [
          { speaker: 'npc', characterId: 'loading-supervisor', name: 'Encargado del carguío', text: 'Añadiré esa observación al registro. El grupo B tuvo cargas más dispersas.' },
          { speaker: 'player', characterId: 'player', name: 'Tú', text: 'Y tener cargas mayores no significa que estén más dispersas.' },
          { speaker: 'npc', characterId: 'loading-supervisor', name: 'Encargado del carguío', text: 'Exacto. Ahora pasa por control de acarreo: están comparando dos turnos y necesitan revisar si su informe contiene suficiente información.' }
        ]
      }
    }
  ]
};
