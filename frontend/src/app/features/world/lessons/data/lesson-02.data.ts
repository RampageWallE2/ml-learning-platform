import { LessonDefinition } from '../lesson.types';

export const LESSON_02: LessonDefinition = {
  id: 'lesson-02',

  steps: [
    {
      type: 'dialogue',

      dialogue: {
        id: 'lesson-02-intro',

        messages: [
          {
            speaker: 'npc',
            name: 'Granjero',
            text: 'Estas dos parcelas tuvieron un promedio de producción muy parecido.'
          },
          {
            speaker: 'player',
            name: 'Tú',
            text: 'Entonces, ¿las dos están funcionando igual?'
          },
          {
            speaker: 'npc',
            name: 'Granjero',
            text: 'Eso parece si miramos solamente el promedio.'
          },
          {
            speaker: 'npc',
            name: 'Granjero',
            text: 'Pero observa lo que produjo cada parcela durante varios días.'
          }
        ]
      }
    },

    {
      type: 'exercise',
      exerciseId: 'farm-stability'
    },

    {
      type: 'dialogue',

      dialogue: {
        id: 'lesson-02-end',

        messages: [
          {
            speaker: 'player',
            name: 'Tú',
            text: 'Ahora entiendo. Tener el mismo promedio no significa que los datos se comporten igual.'
          },
          {
            speaker: 'npc',
            name: 'Granjero',
            text: 'Exactamente. El promedio nos habla del centro, pero no nos dice cuánto cambian los valores alrededor de él.'
          },
          {
            speaker: 'npc',
            name: 'Granjero',
            text: 'Por eso también necesitamos observar la dispersión.'
          }
        ]
      }
    }
  ]
};