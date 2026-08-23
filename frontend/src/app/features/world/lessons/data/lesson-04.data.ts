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
            name: 'Inspector Salazar',
            text: 'Me dijeron que has estado ayudando en el vivero, la granja y el almacén de trigo.'
          },
          {
            speaker: 'player',
            name: 'Tú',
            text: 'Sí. En cada lugar los datos se comportaban de manera diferente.'
          },
          {
            speaker: 'npc',
            name: 'Inspector Salazar',
            text: 'Justamente por eso quería hablar contigo. Me llegaron tres reportes de esas áreas y necesito revisarlos.'
          },
          {
            speaker: 'npc',
            name: 'Inspector Salazar',
            text: 'Esta vez no voy a decirte qué debes buscar. Observa cada situación y toma una decisión.'
          },
          {
            speaker: 'player',
            name: 'Tú',
            text: 'Entendido.'
          },
          {
            speaker: 'npc',
            name: 'Inspector Salazar',
            text: 'Si puedes interpretar correctamente los tres reportes, estarás listo para continuar hacia el Centro de Operaciones.'
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
            name: 'Inspector Salazar',
            text: 'Muy bien. Los tres reportes están revisados.'
          },
          {
            speaker: 'player',
            name: 'Tú',
            text: 'Entonces ya puedo reconocer cuándo los datos son más variables y comparar cómo se comportan.'
          },
          {
            speaker: 'npc',
            name: 'Inspector Salazar',
            text: 'Sí. Cuando tenemos pocos datos, podemos observarlos uno por uno y entender bastante bien lo que ocurre.'
          },
          {
            speaker: 'npc',
            name: 'Inspector Salazar',
            text: 'Pero acaba de llegar un informe del Centro de Operaciones.'
          },
          {
            speaker: 'npc',
            name: 'Inspector Salazar',
            text: 'Allí las máquinas generan mediciones constantemente. No pueden detenerse a revisar cada lectura de esta manera.'
          },
          {
            speaker: 'player',
            name: 'Tú',
            text: 'Entonces necesitarían resumir toda esa variabilidad.'
          },
          {
            speaker: 'npc',
            name: 'Inspector Salazar',
            text: 'Exactamente. Necesitan una forma de representarla con un número que puedan comparar entre equipos.'
          },
          {
            speaker: 'npc',
            name: 'Inspector Salazar',
            text: 'Ve al Patio de Inspección y habla con el encargado. Están intentando resolver ese problema.'
          }
        ]
      }
    }
  ]
};