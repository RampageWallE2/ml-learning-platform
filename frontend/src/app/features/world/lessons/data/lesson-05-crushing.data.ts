import { LessonDefinition } from '../lesson.types';

export const LESSON_05_CRUSHING: LessonDefinition = {
  id: 'lesson-05',
  steps: [
    { type: 'dialogue', dialogue: { id: 'lesson-05-crushing-intro', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de chancado', text: 'No basta mirar el dato mayor y el menor, como viste en el taller. Aquí llamamos alimentación al material que entra a la máquina. El siguiente turno necesita saber cuánto entró en cada hora.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de chancado', text: 'El resumen dice 100 toneladas por hora. Estos son los registros de cuatro horas: 80, 80, 120 y 120 toneladas por hora.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de chancado', text: 'Ayúdame a decir cuánto estuvo cada dato por debajo o por encima del promedio. Así el siguiente turno sabrá qué pasó en cada hora.' },
    ] } },
    { type: 'exercise', exerciseId: 'crushing-deviations' },
    { type: 'dialogue', dialogue: { id: 'lesson-05-crushing-end', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de chancado', text: 'Añadiré tu aviso al informe del siguiente turno: el promedio fue 100 t/h. Dos horas estuvieron 20 t/h por debajo y dos, 20 t/h por encima.' },
      { speaker: 'player', characterId: 'player', name: 'Tú', text: 'Uso − para indicar por debajo y + para indicar por encima. Eso se llama desviación. La separación es 20 t/h en ambos casos. Si el dato es igual al promedio, las dos son 0.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de chancado', text: 'Los datos no explican por qué entraron cantidades distintas ni si cumplen una meta. El promedio resume lo que pasó; no es una meta.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de chancado', text: 'Ahora falta una cosa: ¿cómo resumimos todas estas separaciones con un solo número?' },
    ] } },
  ],
};
