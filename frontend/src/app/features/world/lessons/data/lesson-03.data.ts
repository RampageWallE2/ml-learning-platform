import { LessonDefinition } from '../lesson.types';

export const LESSON_03: LessonDefinition = {
  id: 'lesson-03',

  steps: [
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-03-intro',

        messages: [
          {
            speaker: 'npc',
            name: 'Encargado',
            text: 'Estos sacos de grano tienen pesos diferentes.'
          },
          {
            speaker: 'npc',
            name: 'Encargado',
            text: 'Sabemos que su peso promedio es importante, pero también queremos saber cuánto se aleja cada saco de ese centro.'
          },
          {
            speaker: 'player',
            name: 'Tú',
            text: 'Entonces primero tengo que encontrar el centro de los datos.'
          },
          {
            speaker: 'npc',
            name: 'Encargado',
            text: 'Exactamente. Empieza observando los pesos de los cinco sacos.'
          }
        ]
      }
    },

    {
      type: 'exercise',
      exerciseId: 'granary-distance'
    },

    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-03-final',

        messages: [
          {
            speaker: 'player',
            name: 'Tú',
            text: 'Ahora puedo ver cuánto se aleja cada peso del promedio.'
          },
          {
            speaker: 'npc',
            name: 'Encargado',
            text: 'Exactamente. Algunos valores están muy cerca del centro y otros están bastante más lejos.'
          },
          {
            speaker: 'npc',
            name: 'Encargado',
            text: 'Observar esas distancias nos permite empezar a medir la dispersión.'
          }
        ]
      }
    }
  ]
};