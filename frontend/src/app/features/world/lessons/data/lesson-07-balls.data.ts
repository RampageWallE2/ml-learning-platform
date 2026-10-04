import { LessonDefinition } from '../lesson.types';

export const LESSON_07_BALLS: LessonDefinition = {
  id: 'lesson-07',
  steps: [
    { type: 'dialogue', dialogue: { id: 'lesson-07-balls-intro', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de bolas e hidrociclones', text: 'Leí lo que construiste con el operador del SAG. Aquí necesito usar la varianza para comprobar el informe que recibirá el siguiente turno.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de bolas e hidrociclones', text: 'El borrador dice que dos períodos variaron igual porque ambos tienen media de 100 t/h y rango de 6 t/h. Revisamos la misma alimentación del circuito, en el mismo punto y en condiciones equivalentes.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de bolas e hidrociclones', text: 'Tengo los seis registros de cada período. Calcula sus varianzas y comprueba si esa conclusión se sostiene antes de entregar el informe. La media ya está calculada; no es una meta de producción.' },
    ] } },
    { type: 'exercise', exerciseId: 'balls-apply-variance' },
    { type: 'dialogue', dialogue: { id: 'lesson-07-balls-end', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de bolas e hidrociclones', text: 'Corregiré el informe del relevo. En los registros originales, A tuvo varianza de 3 (t/h)² y B de 6 (t/h)². Sus medias y rangos eran iguales, pero sus dispersiones no.' },
      { speaker: 'player', characterId: 'player', name: 'Tú', text: 'Para A sumé 18 y dividí entre sus 6 registros; para B sumé 36 y dividí entre sus 6 registros. También conté los que aportaban 0. B tuvo más registros alejados de la media.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de bolas e hidrociclones', text: 'Esto describe lo observado. No explica la causa ni basta para decidir cambios en el equipo. Menor variación no significa automáticamente mejor operación.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de bolas e hidrociclones', text: 'Las unidades de la varianza siguen al cuadrado: 3 (t/h)² no es una distancia de 3 t/h. Esa diferencia será importante cuando busquemos una medida más fácil de interpretar.' },
    ] } },
  ],
};
