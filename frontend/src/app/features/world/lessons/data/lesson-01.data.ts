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
            text: 'Estos dos grupos tienen cinco plantones cada uno.'
          },
          {
            speaker: 'player',
            name: 'Tú',
            text: 'Entonces, en cantidad, son iguales.'
          },
          {
            speaker: 'npc',
            name: 'Viverista',
            text: 'Exactamente. En el Grupo A las plantas están aproximadamente a 40 cm unas de otras.'
          },
          {
            speaker: 'npc',
            name: 'Viverista',
            text: 'Quiero aprovechar mejor otra zona del vivero. Reorganiza el Grupo B para que sus plantas queden mucho más extendidas.'
          },
          {
            speaker: 'player',
            name: 'Tú',
            text: 'Entendido. Voy a probar distintas posiciones.'
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
            text: 'Entonces ya puedo reconocer cuándo un grupo está más disperso.'
          },
          {
            speaker: 'npc',
            name: 'Viverista',
            text: 'Exactamente. Pero en el trabajo real no siempre basta con mirar los datos.'
          },
          {
            speaker: 'npc',
            name: 'Viverista',
            text: 'En la granja están comparando la producción de dos parcelas. Dicen que producen prácticamente lo mismo en promedio...'
          },
          {
            speaker: 'npc',
            name: 'Viverista',
            text: '...pero los resultados de una de ellas son mucho menos regulares.'
          },
          {
            speaker: 'npc',
            name: 'Viverista',
            text: 'Ve a hablar con la encargada de la granja. Creo que lo que acabas de aprender te servirá.'
          }
        ]
      }
    }
  ]
};