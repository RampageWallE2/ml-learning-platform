import { LessonDefinition } from '../lesson.types';

export const LESSON_05_CRUSHING: LessonDefinition = {
  id: 'lesson-05',
  steps: [
    { type: 'dialogue', dialogue: { id: 'lesson-05-crushing-intro', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de chancado', text: 'Desde el taller nos enviaron una pregunta: ¿cómo incorporar cada observación a la comparación?' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de chancado', text: 'Aquí tengo cuatro registros de alimentación. Quiero describir cómo se separa cada uno de su media, no solamente mirar los extremos.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de chancado', text: 'Encuentra la media y compara cada registro con ella.' },
    ] } },
    { type: 'exercise', exerciseId: 'crushing-deviations' },
    { type: 'dialogue', dialogue: { id: 'lesson-05-crushing-end', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de chancado', text: 'Anotaré que los cuatro registros iniciales están a 20 t/h de la media, en lados distintos.' },
      { speaker: 'player', characterId: 'player', name: 'Tú', text: 'El signo de la desviación indica el lado. La distancia mide la separación sin signo negativo.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de chancado', text: 'La siguiente pregunta para nuestra investigación será: ¿cómo resumimos todas estas desviaciones con una sola medida?' },
    ] } },
  ],
};
