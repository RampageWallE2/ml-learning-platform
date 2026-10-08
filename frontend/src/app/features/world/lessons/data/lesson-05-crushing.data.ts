import { LessonDefinition } from '../lesson.types';

export const LESSON_05_CRUSHING: LessonDefinition = {
  id: 'lesson-05',
  steps: [
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-05-crushing-intro',
        messages: [
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Operador de chancado',
            text: 'Como viste en el taller, no basta mirar el dato mayor y el menor.',
          },
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Operador de chancado',
            text: 'Aquí llamamos alimentación al material que entra a la máquina. El siguiente turno necesita saber cuánto entró en cada hora.',
          },
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Operador de chancado',
            text: 'El promedio fue 100 toneladas por hora. Los registros de cuatro horas fueron 80, 80, 120 y 120 toneladas por hora.',
          },
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Operador de chancado',
            text: 'Ayúdame a decir cuánto estuvo cada dato por debajo o por encima del promedio.',
          },
        ],
      },
    },
    { type: 'exercise', exerciseId: 'crushing-deviations' },
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-05-crushing-end',
        messages: [
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Operador de chancado',
            text: 'Añadiré tu aviso: dos horas estuvieron 20 t/h por debajo del promedio y dos, 20 t/h por encima.',
          },
          {
            speaker: 'player',
            characterId: 'player',
            name: 'Tú',
            text: 'Uso − para indicar por debajo y + para indicar por encima. Esa diferencia con signo se llama desviación.',
          },
          {
            speaker: 'player',
            characterId: 'player',
            name: 'Tú',
            text: 'La separación es 20 t/h en ambos casos. Si el dato es igual al promedio, la desviación y la separación son 0.',
          },
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Operador de chancado',
            text: 'Los datos no explican por qué entraron cantidades distintas ni si cumplen una meta.',
          },
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Operador de chancado',
            text: 'El promedio resume lo que pasó; no es una meta.',
          },
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Operador de chancado',
            text: 'Ahora falta una cosa: ¿cómo resumimos todas estas separaciones con un solo número?',
          },
        ],
      },
    },
  ],
};
