import { LessonDefinition } from '../lesson.types';

export const LESSON_05_CRUSHING: LessonDefinition = {
  id: 'lesson-05',
  steps: [
    { type: 'dialogue', dialogue: { id: 'lesson-05-crushing-intro', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de chancado', text: 'Desde el taller nos recuerdan que no basta mirar los extremos. Necesito completar el aviso de alimentación para el siguiente turno.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de chancado', text: 'El resumen dice 100 toneladas por hora. Estos son los registros de cuatro horas: 80, 80, 120 y 120 toneladas por hora.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de chancado', text: 'Ayúdame a describir cuánto estuvo cada registro por debajo o por encima del promedio. Así el siguiente turno tendrá la información completa.' },
    ] } },
    { type: 'exercise', exerciseId: 'crushing-deviations' },
    { type: 'dialogue', dialogue: { id: 'lesson-05-crushing-end', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de chancado', text: 'Añadiré tu aviso al informe del relevo: el promedio fue 100 t/h, con dos horas 20 t/h por debajo y dos horas 20 t/h por encima.' },
      { speaker: 'player', characterId: 'player', name: 'Tú', text: 'Las desviaciones son −20 y +20 t/h. El signo indica el lado; las cuatro distancias son 20 t/h. Cuando un registro coincide con la media, ambas son cero.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de chancado', text: 'Estos registros no explican por qué cambió la alimentación ni si fue adecuada. El promedio es un resumen, no una meta de producción.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de chancado', text: 'La siguiente pregunta para nuestra investigación será: ¿cómo resumimos todas estas desviaciones con una sola medida?' },
    ] } },
  ],
};
