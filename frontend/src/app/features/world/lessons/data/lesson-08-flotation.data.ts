import { LessonDefinition } from '../lesson.types';

export const LESSON_08_FLOTATION: LessonDefinition = {
  id: 'lesson-08',
  steps: [
    { type: 'dialogue', dialogue: { id: 'lesson-08-flotation-intro', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de flotación', text: 'Ya calculaste la varianza. El siguiente turno necesita una medida de los cambios que se pueda leer en toneladas por hora.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de flotación', text: 'Estos seis datos muestran cuánto material entra a flotación: 96, 100, 100, 100, 102 y 102 t/h. Se midieron en el mismo lugar y dejando el mismo tiempo entre mediciones. No son los datos del molino.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de flotación', text: 'El promedio es 100 t/h y la varianza es 4 (t/h)². Ese 4 tiene unidades al cuadrado: no podemos llamarlo «4 t/h». Ayúdame a volver a toneladas por hora.' },
    ] } },
    { type: 'exercise', exerciseId: 'flotation-standard-deviation' },
    { type: 'dialogue', dialogue: { id: 'lesson-08-flotation-end', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de flotación', text: 'Guardaré los datos originales: promedio de 100 t/h, varianza de 4 (t/h)² y desviación estándar de 2 t/h. Ahora tenemos una medida en toneladas por hora.' },
      { speaker: 'player', characterId: 'player', name: 'Tú', text: '2 × 2 = 4, por eso √4 = 2. Para calcular la desviación estándar saco la raíz de la varianza, no el promedio de las separaciones.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de flotación', text: 'En los datos originales, 96 queda fuera de la franja de 98 a 102 t/h. En el otro ejemplo estaban todos dentro. La franja no dice si el trabajo está bien o mal ni qué pasará después.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de flotación', text: 'En espesadores usaremos lo aprendido para preparar el informe final. También tendremos una meta: menos cambios no significa siempre un mejor resultado.' },
    ] } },
  ],
};
