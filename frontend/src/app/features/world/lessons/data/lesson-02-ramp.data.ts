import { LessonDefinition } from '../lesson.types';

export const LESSON_02_RAMP: LessonDefinition = {
  id: 'lesson-02',
  steps: [
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-02-ramp-intro',
        messages: [
          { speaker: 'npc', characterId: 'ramp-controller', name: 'Encargado del control de rampa', text: 'Ya vi lo que encontraste en el tajo. Estoy preparando las cargas del siguiente turno.' },
          { speaker: 'npc', characterId: 'ramp-controller', name: 'Encargado del control de rampa', text: 'Quienes reciben el mineral necesitan cargas cercanas a 100 toneladas.' },
          { speaker: 'npc', characterId: 'ramp-controller', name: 'Encargado del control de rampa', text: 'Estos dos turnos tienen un promedio de 100. ¿Con eso sabemos si las cargas se parecen? Ayúdame a revisar el informe antes de decidir.' }
        ]
      }
    },
    { type: 'exercise', exerciseId: 'ramp-shift-regularity' },
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-02-ramp-end',
        messages: [
          { speaker: 'npc', characterId: 'ramp-controller', name: 'Encargado del control de rampa', text: 'No decidiré solo con los promedios. Revisaré qué pasó con las cargas de B.' },
          { speaker: 'player', characterId: 'player', name: 'Tú', text: 'El promedio era 100 en ambos, pero en B las cargas fueron más diferentes. Eso no explica por qué pasó.' },
          { speaker: 'npc', characterId: 'ramp-controller', name: 'Encargado del control de rampa', text: 'Exacto. Añadiré las cargas que faltan al informe y hablaré con el equipo antes de cambiar el plan.' },
          { speaker: 'npc', characterId: 'ramp-controller', name: 'Encargado del control de rampa', text: 'El siguiente turno también necesita saber cuánto demora descargar el material de descarte. Habla con el encargado del botadero.' }
        ]
      }
    }
  ]
};
