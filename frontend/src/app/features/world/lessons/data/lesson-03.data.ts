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
            name: 'Encargado del almacén',
            text: 'Así que vienes de la granja. Justo estamos recibiendo el trigo de las parcelas.'
          },
          {
            speaker: 'player',
            name: 'Tú',
            text: 'Me dijeron que estaban revisando los pesos de algunos sacos.'
          },
          {
            speaker: 'npc',
            name: 'Encargado del almacén',
            text: 'Correcto. Antes de mover este lote hacia los silos, pesamos algunos sacos para revisar cómo están llegando.'
          },
          {
            speaker: 'npc',
            name: 'Encargado del almacén',
            text: 'El peso promedio de este grupo es de 50 kg por saco.'
          },
          {
            speaker: 'player',
            name: 'Tú',
            text: '¿Y queremos saber cuáles pesan más o menos?'
          },
          {
            speaker: 'npc',
            name: 'Encargado del almacén',
            text: 'Más que eso. Quiero que observes qué tan lejos está cada saco de esos 50 kg.'
          },
          {
            speaker: 'npc',
            name: 'Encargado del almacén',
            text: 'Ven. Vamos a revisar el lote uno por uno.'
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
            text: 'Ahora entiendo. No todos los sacos están igual de cerca del promedio.'
          },
          {
            speaker: 'npc',
            name: 'Encargado del almacén',
            text: 'Exactamente. El saco de 49 kg está a solo 1 kg del centro, mientras que el de 47 kg está a 3 kg.'
          },
          {
            speaker: 'player',
            name: 'Tú',
            text: 'Entonces puedo usar el promedio como referencia para comparar cada peso.'
          },
          {
            speaker: 'npc',
            name: 'Encargado del almacén',
            text: 'Esa es la idea. Cuanto más lejos se encuentre una medición del centro, mayor será su separación respecto a él.'
          },
          {
            speaker: 'npc',
            name: 'Encargado del almacén',
            text: 'Y si varias mediciones están muy alejadas, empezamos a tener una pista de que el conjunto está más disperso.'
          },
          {
            speaker: 'npc',
            name: 'Encargado del almacén',
            text: 'Ya recorriste el vivero, comparaste la producción de las parcelas y ahora sabes observar cuánto se aleja cada medición de su centro.'
          },
          {
            speaker: 'npc',
            name: 'Encargado del almacén',
            text: 'Antes de continuar, quieren comprobar que puedes usar todas esas ideas juntas. Ve a la siguiente zona y habla con su encargado.'
          }
        ]
      }
    }
  ]
};