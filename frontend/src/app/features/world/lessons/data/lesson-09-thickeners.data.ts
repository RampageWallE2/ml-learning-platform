import { LessonDefinition } from '../lesson.types';

export const LESSON_09_THICKENERS: LessonDefinition = {
  id: 'lesson-09',
  steps: [
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-09-thickeners-intro',
        messages: [
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Operador de espesadores',
            text: 'Ayúdame a terminar el informe. Elegiremos un ejemplo para comparar el siguiente turno y qué investigar antes de cambiar ajustes.',
          },
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Operador de espesadores',
            text: 'Comparamos dos períodos de trabajo, con seis registros por período. Son datos de espesadores, no de flotación.',
          },
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Operador de espesadores',
            text: 'Se midieron en el mismo lugar y dejando el mismo tiempo entre mediciones, en condiciones parecidas.',
          },
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Operador de espesadores',
            text: 'En este ejemplo, la meta es un promedio de 100 toneladas por hora. No exige que cada registro sea 100.',
          },
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Operador de espesadores',
            text: 'Las medidas ya están calculadas. Mira el promedio y cuánto variaron los registros.',
          },
        ],
      },
    },
    { type: 'exercise', exerciseId: 'thickeners-final-report' },
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-09-thickeners-end',
        messages: [
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Operador de espesadores',
            text: 'Guardaré los datos originales. A tuvo promedio de 80 t/h, con todos sus datos iguales.',
          },
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Operador de espesadores',
            text: 'B tuvo promedio de 100 t/h y desviación estándar de 2 t/h.',
          },
          {
            speaker: 'player',
            characterId: 'player',
            name: 'Tú',
            text: 'B cumplió la meta. Lo usamos como ejemplo para comparar el siguiente turno.',
          },
          {
            speaker: 'player',
            characterId: 'player',
            name: 'Tú',
            text: 'Investigaremos por qué A quedó por debajo y los límites permitidos antes de cambiar ajustes.',
          },
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Operador de espesadores',
            text: 'En la práctica, ambos cumplían la meta. Para ese caso elegimos el que varió menos.',
          },
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Operador de espesadores',
            text: 'Esos datos no reemplazan los del informe ni aseguran qué pasará después.',
          },
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Operador de espesadores',
            text: 'Variar menos no basta: también hay que revisar la meta.',
          },
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Operador de espesadores',
            text: 'Ahora vuelve al centro de control y entrega el informe al supervisor con lo que encontraste en cada área.',
          },
        ],
      },
    },
  ],
};
