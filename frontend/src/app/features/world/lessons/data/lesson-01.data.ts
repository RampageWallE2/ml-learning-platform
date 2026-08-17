import { LessonDefinition } from '../lesson.types';

export const LESSON_01: LessonDefinition = {
  id: 'lesson-01',

  steps: [
    {
      type: 'dialogue',

      dialogue: {
        id: 'lesson-01-intro',

        messages: [
          {
            speaker: 'npc',
            name: 'Viverista',
            text: 'Estas plantas pertenecen a dos grupos del vivero.'
          },
          {
            speaker: 'player',
            name: 'Tú',
            text: 'A simple vista parecen bastante parecidas.'
          },
          {
            speaker: 'npc',
            name: 'Viverista',
            text: 'Fíjate menos en las plantas y más en el espacio que hay entre ellas.'
          },
          {
            speaker: 'npc',
            name: 'Viverista',
            text: 'Experimenta con el Grupo B. Mueve sus plantas hasta que queden mucho más separadas que las del Grupo A.'
          }
        ]
      }
    },

    {
      type: 'exercise',
      exerciseId: 'nursery-spread'
    },

    {
      type: 'dialogue',

      dialogue: {
        id: 'lesson-01-end',

        messages: [
          {
            speaker: 'player',
            name: 'Tú',
            text: 'Ahora el Grupo B ocupa mucho más espacio.'
          },
          {
            speaker: 'npc',
            name: 'Viverista',
            text: 'Exacto. Sus elementos están más separados entre sí.'
          },
          {
            speaker: 'npc',
            name: 'Viverista',
            text: 'A esta característica la llamamos dispersión.'
          },
          {
            speaker: 'npc',
            name: 'Viverista',
            text: 'Cuando los elementos están más extendidos, decimos que existe una mayor dispersión.'
          }
        ]
      }
    }
  ]
};