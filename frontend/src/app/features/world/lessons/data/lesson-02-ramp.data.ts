import { LessonDefinition } from '../lesson.types';

export const LESSON_02_RAMP: LessonDefinition = {
  id: 'lesson-02',
  steps: [
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-02-ramp-intro',
        messages: [
          {
            speaker: 'npc',
            characterId: 'ramp-controller',
            name: 'Encargado del control de rampa',
            text: 'Ya vi lo que encontraste en el tajo. Estoy preparando las cargas del siguiente turno.',
          },
          {
            speaker: 'npc',
            characterId: 'ramp-controller',
            name: 'Encargado del control de rampa',
            text: 'Quienes reciben el mineral necesitan cargas cercanas a 100 toneladas.',
          },
          {
            speaker: 'npc',
            characterId: 'ramp-controller',
            name: 'Encargado del control de rampa',
            text: 'Los dos turnos tienen un promedio de 100 toneladas. ¿Basta ese resumen para elegir?',
          },
          {
            speaker: 'npc',
            characterId: 'ramp-controller',
            name: 'Encargado del control de rampa',
            text: 'Ayúdame a revisar el informe antes de decidir.',
          },
        ],
      },
    },
    { type: 'exercise', exerciseId: 'ramp-shift-regularity' },
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-02-ramp-end',
        nextDestination: 'Botadero de desmonte',
        completionLabel: 'Volver al mapa',
        messages: [
          {
            speaker: 'npc',
            characterId: 'ramp-controller',
            name: 'Encargado del control de rampa',
            text: 'No decidiré solo con los promedios. En B las cargas fueron más diferentes, aunque ambos promedios eran 100.',
          },
          {
            speaker: 'player',
            characterId: 'player',
            name: 'Tú',
            text: 'Eso no explica por qué pasó.',
          },
          {
            speaker: 'npc',
            characterId: 'ramp-controller',
            name: 'Encargado del control de rampa',
            text: 'Añadiré las cargas que faltan al informe y hablaré con el equipo antes de cambiar el plan.',
          },
          {
            speaker: 'npc',
            characterId: 'ramp-controller',
            name: 'Encargado del control de rampa',
            text: 'Habla con el encargado para revisar cuánto demora descargar el material de descarte.',
          },
        ],
      },
    },
  ],
};
