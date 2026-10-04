import { LessonDefinition } from '../lesson.types';

export const LESSON_08_FLOTATION: LessonDefinition = {
  id: 'lesson-08',
  steps: [
    { type: 'dialogue', dialogue: { id: 'lesson-08-flotation-intro', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de flotación', text: 'Ya aprendiste a calcular la varianza. Aquí necesitamos explicar cuánto cambian los registros para que el siguiente turno lo entienda.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de flotación', text: 'Estos son nuestros seis registros de alimentación, medidos en el mismo punto y a intervalos iguales: 96, 100, 100, 100, 102 y 102 t/h. Son datos de flotación, no del molino.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de flotación', text: 'El promedio es 100 t/h y la varianza es 4 (t/h)². Ese 4 tiene unidades al cuadrado: no podemos llamarlo «4 t/h». Ayúdame a volver a toneladas por hora.' },
    ] } },
    { type: 'exercise', exerciseId: 'flotation-standard-deviation' },
    { type: 'dialogue', dialogue: { id: 'lesson-08-flotation-end', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de flotación', text: 'Guardaré los datos originales: promedio de 100 t/h, varianza de 4 (t/h)² y desviación estándar de 2 t/h. La raíz de la varianza nos devuelve a toneladas por hora.' },
      { speaker: 'player', characterId: 'player', name: 'Tú', text: '2 × 2 = 4, por eso √4 = 2. La desviación estándar sale de la varianza; no es el promedio simple de las distancias al promedio.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de flotación', text: 'En estos datos, la franja va de 98 a 102 t/h y el registro de 96 queda fuera. En el ejemplo de comparación estaban todos dentro. Hay que mirar cada grupo: la franja no indica si el trabajo está bien o mal, ni cómo serán los próximos registros.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de flotación', text: 'En espesadores usaremos lo aprendido para preparar el informe final. También tendremos una meta: menos cambios no significa siempre un mejor resultado.' },
    ] } },
  ],
};
