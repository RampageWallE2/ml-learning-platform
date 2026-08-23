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
            name: 'Encargado de la granja',
            text: 'Así que vienes del vivero. Me dijeron que estuviste comparando cómo se distribuían distintos grupos.'
          },
          {
            speaker: 'player',
            name: 'Tú',
            text: 'Sí. Aprendí que algunos grupos pueden estar mucho más dispersos que otros.'
          },
          {
            speaker: 'npc',
            name: 'Encargado de la granja',
            text: 'Entonces quizá puedas ayudarme con esto.'
          },
          {
            speaker: 'npc',
            name: 'Encargado de la granja',
            text: 'Tenemos dos parcelas de trigo. Durante los últimos cinco días registramos cuántos kilogramos produjo cada una.'
          },
          {
            speaker: 'npc',
            name: 'Encargado de la granja',
            text: 'Necesito una producción relativamente constante para cumplir pedidos diarios cercanos a 50 kg. Observa los registros y dime con cuál confiarías más.'
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
            text: 'Entonces dos parcelas pueden tener el mismo promedio y aun así comportarse de manera muy diferente.'
          },
          {
            speaker: 'npc',
            name: 'Encargado de la granja',
            text: 'Exactamente. Por eso no deberíamos tomar decisiones mirando solamente el promedio.'
          },
          {
            speaker: 'npc',
            name: 'Encargado de la granja',
            text: 'De hecho, en el almacén tenemos otro problema.'
          },
          {
            speaker: 'npc',
            name: 'Encargado de la granja',
            text: 'Están revisando sacos que deberían tener un peso parecido, pero algunos están quedando por encima y otros por debajo del valor esperado.'
          },
          {
            speaker: 'npc',
            name: 'Encargado de la granja',
            text: 'Ve a hablar con el encargado del almacén. Tal vez puedas ayudarlo a interpretar esas diferencias.'
          }
        ]
      }
    }
  ]
};