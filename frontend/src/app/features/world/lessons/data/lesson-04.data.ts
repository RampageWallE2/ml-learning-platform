import { LessonDefinition } from '../lesson.types';

export const LESSON_04: LessonDefinition = {
  id: 'lesson-04',

  steps: [
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-04-intro',

        messages: [
          {
            speaker: 'npc',
            name: 'Coordinadora',
            text: 'Has recorrido el vivero, la granja y el granero.'
          },
          {
            speaker: 'npc',
            name: 'Coordinadora',
            text: 'Antes de continuar tu camino, quiero comprobar qué aprendiste sobre la dispersión.'
          },
          {
            speaker: 'player',
            name: 'Tú',
            text: 'Adelante.'
          },
          {
            speaker: 'npc',
            name: 'Coordinadora',
            text: 'Tendrás que superar tres desafíos.'
          }
        ]
      }
    },

    {
      type: 'exercise',
      exerciseId: 'plaza-challenge'
    },

    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-04-final',

        messages: [
          {
            speaker: 'npc',
            name: 'Coordinadora',
            text: 'Excelente. Ya puedes reconocer cuándo los datos están dispersos y entender por qué el promedio no siempre cuenta toda la historia.'
          },
          {
            speaker: 'player',
            name: 'Tú',
            text: 'Y también puedo medir qué tan lejos está un valor de su centro.'
          },
          {
            speaker: 'npc',
            name: 'Coordinadora',
            text: 'Exactamente. Estás preparado para continuar.'
          }
        ]
      }
    }
  ]
};