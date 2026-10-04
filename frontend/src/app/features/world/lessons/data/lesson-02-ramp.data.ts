import { LessonDefinition } from '../lesson.types';

export const LESSON_02_RAMP: LessonDefinition = {
  id: 'lesson-02',
  steps: [
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-02-ramp-intro',
        messages: [
          { speaker: 'npc', characterId: 'ramp-controller', name: 'Encargado del control de rampa', text: 'Me llegó tu observación sobre las cargas del tajo. Estoy preparando el plan de carga del siguiente turno.' },
          { speaker: 'npc', characterId: 'ramp-controller', name: 'Encargado del control de rampa', text: 'Para organizar las entregas, el área que recibe el mineral pide cargas cercanas a 100 toneladas.' },
          { speaker: 'npc', characterId: 'ramp-controller', name: 'Encargado del control de rampa', text: 'Estos dos turnos tienen un promedio de 100. ¿Eso basta para mantener el plan? Ayúdame antes de cerrarlo.' }
        ]
      }
    },
    { type: 'exercise', exerciseId: 'ramp-shift-regularity' },
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-02-ramp-end',
        messages: [
          { speaker: 'npc', characterId: 'ramp-controller', name: 'Encargado del control de rampa', text: 'No cerraré el plan solo con los promedios. Revisaré qué ocurrió con las cargas de B antes de mantenerlo.' },
          { speaker: 'player', characterId: 'player', name: 'Tú', text: 'El promedio era 100 en ambos, pero en B las cargas fueron más diferentes. Eso no explica por qué pasó.' },
          { speaker: 'npc', characterId: 'ramp-controller', name: 'Encargado del control de rampa', text: 'Exacto. Completaré el informe con las cargas de cada camión y consultaré al equipo antes de decidir cambios.' },
          { speaker: 'npc', characterId: 'ramp-controller', name: 'Encargado del control de rampa', text: 'El relevo también necesita revisar los tiempos de descarga del desmonte. Habla con el encargado del botadero.' }
        ]
      }
    }
  ]
};
