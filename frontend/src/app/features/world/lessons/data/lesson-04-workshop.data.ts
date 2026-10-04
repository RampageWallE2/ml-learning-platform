import { LessonDefinition } from '../lesson.types';

export const LESSON_04_WORKSHOP: LessonDefinition = {
  id: 'lesson-04',
  steps: [
    { type: 'dialogue', dialogue: { id: 'lesson-04-workshop-intro', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Encargado del taller', text: 'Me comentaron que ayudaste a medir el rango en el botadero. Estoy organizando las revisiones del siguiente turno.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Encargado del taller', text: 'Estos dos equipos hicieron la misma tarea. El informe dice que sus tiempos fueron parecidos porque tienen el mismo rango.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Encargado del taller', text: 'Antes de usar esa comparación para organizar las revisiones, ayúdame a comprobarla con todos los registros.' },
    ] } },
    { type: 'exercise', exerciseId: 'workshop-range-limits' },
    { type: 'dialogue', dialogue: { id: 'lesson-04-workshop-end', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Encargado del taller', text: 'Corregiré el informe: ambos rangos son de 4 minutos, pero en A hubo tres revisiones de 10 minutos y en B solo una.' },
      { speaker: 'player', characterId: 'player', name: 'Tú', text: 'El rango describe los extremos. También necesitamos mirar cómo se reparten los demás tiempos.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Encargado del taller', text: 'Usaré los registros completos para organizar las revisiones, no solo el rango. Esto no dice qué equipo trabaja mejor ni explica la causa de las diferencias.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Encargado del taller', text: 'Ve a ROM / chancado y habla con el operador. Allí quieren incorporar cada observación a la comparación, no solo mirar los extremos.' },
    ] } },
  ],
};
