import { LessonDefinition } from '../lesson.types';

export const LESSON_04_WORKSHOP: LessonDefinition = {
  id: 'lesson-04',
  steps: [
    { type: 'dialogue', dialogue: { id: 'lesson-04-workshop-intro', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Encargado del taller', text: 'Me comentaron que ayudaste a medir el rango en el botadero. Aquí tenemos un informe que necesita revisión.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Encargado del taller', text: 'Compara las duraciones de una misma tarea en dos equipos. El informe dice que se comportaron igual porque tienen el mismo rango.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Encargado del taller', text: 'Revisa los registros y comprueba si esa conclusión está justificada.' },
    ] } },
    { type: 'exercise', exerciseId: 'workshop-range-limits' },
    { type: 'dialogue', dialogue: { id: 'lesson-04-workshop-end', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Encargado del taller', text: 'Corregiré el informe: ambos rangos son de 4 minutos, pero A concentra más registros en 10 minutos.' },
      { speaker: 'player', characterId: 'player', name: 'Tú', text: 'El rango describe los extremos, pero no distingue todos los cambios interiores.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Encargado del taller', text: 'Dejemos anotada la siguiente pregunta para continuar la investigación: ¿cómo podemos incorporar cada observación a la comparación?' },
    ] } },
  ],
};
