import { LessonDefinition } from '../lesson.types';

export const LESSON_07_BALLS: LessonDefinition = {
  id: 'lesson-07',
  steps: [
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-07-balls-intro',
        messages: [
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Operador de bolas e hidrociclones',
            text: 'El siguiente turno recibirá este informe. Ayúdame a comprobarlo con la varianza que aprendiste en el SAG.',
          },
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Operador de bolas e hidrociclones',
            text: 'Estos dos períodos de trabajo tienen promedio de 100 t/h y rango de 6 t/h. El informe dice que variaron igual.',
          },
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Operador de bolas e hidrociclones',
            text: 'Hay seis registros por período, medidos en el mismo lugar y en condiciones parecidas.',
          },
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Operador de bolas e hidrociclones',
            text: 'Mira los puntos y calcula las varianzas. El promedio ya está calculado; no es una meta.',
          },
        ],
      },
    },
    { type: 'exercise', exerciseId: 'balls-apply-variance' },
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-07-balls-end',
        messages: [
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Operador de bolas e hidrociclones',
            text: 'Corregiré el informe: A tuvo varianza de 3 (t/h)² y B de 6 (t/h)².',
          },
          {
            speaker: 'player',
            characterId: 'player',
            name: 'Tú',
            text: 'En A conté 18 casillas y dividí entre 6 registros. En B, 36 entre 6.',
          },
          {
            speaker: 'player',
            characterId: 'player',
            name: 'Tú',
            text: 'También conté los registros con 0 casillas. B tuvo más datos lejos del promedio.',
          },
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Operador de bolas e hidrociclones',
            text: 'El promedio y el rango eran iguales, pero variaron distinto. Variar menos no significa trabajar mejor.',
          },
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Operador de bolas e hidrociclones',
            text: 'Esto muestra lo que pasó, no por qué pasó ni qué ajuste hacer.',
          },
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Operador de bolas e hidrociclones',
            text: 'La varianza sigue en (t/h)²: 3 (t/h)² no significa una separación de 3 t/h.',
          },
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Operador de bolas e hidrociclones',
            text: 'En flotación buscarás una medida que se pueda expresar en toneladas por hora.',
          },
        ],
      },
    },
  ],
};
