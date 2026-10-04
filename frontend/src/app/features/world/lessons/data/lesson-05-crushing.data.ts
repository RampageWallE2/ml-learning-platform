import { LessonDefinition } from '../lesson.types';

export const LESSON_05_CRUSHING: LessonDefinition = {
  id: 'lesson-05',
  steps: [
    { type: 'dialogue', dialogue: { id: 'lesson-05-crushing-intro', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de chancado', text: 'En el taller vimos que no basta mirar el dato mayor y el menor. Necesito un aviso claro de alimentación para el siguiente turno.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de chancado', text: 'El resumen dice 100 toneladas por hora. Estos son los registros de cuatro horas: 80, 80, 120 y 120 toneladas por hora.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de chancado', text: 'Ayúdame a decir cuánto estuvo cada dato por debajo o por encima del promedio. Así el siguiente turno sabrá qué pasó en cada hora.' },
    ] } },
    { type: 'exercise', exerciseId: 'crushing-deviations' },
    { type: 'dialogue', dialogue: { id: 'lesson-05-crushing-end', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de chancado', text: 'Añadiré tu aviso al informe del relevo: el promedio fue 100 t/h, con dos horas 20 t/h por debajo y dos horas 20 t/h por encima.' },
      { speaker: 'player', characterId: 'player', name: 'Tú', text: 'La desviación lleva − si el dato queda por debajo y + si queda por encima. La separación es 20 t/h en ambos lados. Si el dato está justo en el promedio, ambas son cero.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de chancado', text: 'Estos datos no dicen por qué cambió la alimentación ni si cumple una meta. El promedio es un resumen, no una meta de producción.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de chancado', text: 'Ahora falta una cosa: ¿cómo resumimos todas estas separaciones con un solo número?' },
    ] } },
  ],
};
