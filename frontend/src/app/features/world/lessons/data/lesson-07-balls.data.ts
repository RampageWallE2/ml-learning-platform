import { LessonDefinition } from '../lesson.types';

export const LESSON_07_BALLS: LessonDefinition = {
  id: 'lesson-07',
  steps: [
    { type: 'dialogue', dialogue: { id: 'lesson-07-balls-intro', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de bolas e hidrociclones', text: 'Leí lo que construiste con el operador del SAG. Aquí necesito usar la varianza para comprobar el informe que recibirá el siguiente turno.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de bolas e hidrociclones', text: 'El borrador dice que dos períodos variaron igual porque tienen promedio de 100 t/h y rango de 6 t/h. Medimos la cantidad de material que entra al circuito, en el mismo punto y en condiciones parecidas.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de bolas e hidrociclones', text: 'Tengo seis registros de cada período. Primero mira los puntos. Luego calcula las varianzas y comprueba lo que decía el borrador. El promedio ya está calculado; no es una meta de producción.' },
    ] } },
    { type: 'exercise', exerciseId: 'balls-apply-variance' },
    { type: 'dialogue', dialogue: { id: 'lesson-07-balls-end', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de bolas e hidrociclones', text: 'Corregiré el informe del siguiente turno. En los datos originales, A tuvo varianza de 3 (t/h)² y B de 6 (t/h)². El promedio y el rango eran iguales, pero variaron distinto.' },
      { speaker: 'player', characterId: 'player', name: 'Tú', text: 'Para A sumé 18 y dividí entre sus 6 registros; para B sumé 36 y dividí entre sus 6 registros. También conté los que aportaban 0. B tuvo más registros lejos del promedio.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de bolas e hidrociclones', text: 'Esto muestra lo que pasó, no por qué pasó ni qué ajuste hacer. Variar menos no significa trabajar mejor.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de bolas e hidrociclones', text: 'Las unidades de la varianza siguen al cuadrado: 3 (t/h)² no es una distancia de 3 t/h. Esa diferencia será importante cuando busquemos una medida más fácil de interpretar.' },
    ] } },
  ],
};
