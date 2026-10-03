import { LessonDefinition } from '../lesson.types';

export const LESSON_02_RAMP: LessonDefinition = {
  id: 'lesson-02',
  steps: [
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-02-ramp-intro',
        messages: [
          { speaker: 'npc', characterId: 'ramp-controller', name: 'Encargado del control de rampa', text: 'Me llegó tu observación sobre las cargas del tajo. Aquí estoy preparando el informe de dos turnos.' },
          { speaker: 'npc', characterId: 'ramp-controller', name: 'Encargado del control de rampa', text: 'Ambos registran un promedio de 100 toneladas por camión. ¿Podemos afirmar que sus cargas fueron igual de uniformes?' }
        ]
      }
    },
    { type: 'exercise', exerciseId: 'ramp-shift-regularity' },
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-02-ramp-end',
        messages: [
          { speaker: 'npc', characterId: 'ramp-controller', name: 'Encargado del control de rampa', text: 'Completaré el informe con esa diferencia. Los promedios coincidían, pero faltaba describir las cargas.' },
          { speaker: 'player', characterId: 'player', name: 'Tú', text: 'Necesitábamos los registros para comparar su dispersión.' },
          { speaker: 'npc', characterId: 'ramp-controller', name: 'Encargado del control de rampa', text: 'En el botadero necesitan expresar con un número la separación entre sus tiempos de descarga. Habla con el encargado del botadero.' }
        ]
      }
    }
  ]
};
