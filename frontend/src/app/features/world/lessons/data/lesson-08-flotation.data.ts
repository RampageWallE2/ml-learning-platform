import { LessonDefinition } from '../lesson.types';

export const LESSON_08_FLOTATION: LessonDefinition = {
  id: 'lesson-08',
  steps: [
    { type: 'dialogue', dialogue: { id: 'lesson-08-flotation-intro', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de flotación', text: 'Ya comprobaste la varianza con el operador de bolas e hidrociclones. Aquí necesito aclarar cómo explicamos la dispersión en el informe del relevo.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de flotación', text: 'Estos son nuestros seis registros de alimentación, medidos en el mismo punto y a intervalos iguales: 96, 100, 100, 100, 102 y 102 t/h. Son datos de flotación, no del molino.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de flotación', text: 'La media es 100 t/h y la varianza ya calculada es 4 (t/h)². Pero escribir «variación de 4 t/h» sería incorrecto. Ayúdame a dar una explicación en las mismas unidades que los registros para el siguiente turno.' },
    ] } },
    { type: 'exercise', exerciseId: 'flotation-standard-deviation' },
    { type: 'dialogue', dialogue: { id: 'lesson-08-flotation-end', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de flotación', text: 'Añadiré al informe los datos originales: media de 100 t/h, varianza de 4 (t/h)² y desviación estándar de 2 t/h. La raíz de la varianza devuelve las unidades originales.' },
      { speaker: 'player', characterId: 'player', name: 'Tú', text: '2 × 2 = 4, por eso √4 = 2. Esta medida sale de la varianza; no es el promedio simple de las distancias a la media.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de flotación', text: 'La franja de una desviación estándar a cada lado de la media va de 98 a 102 t/h, pero el registro de 96 está fuera. No tiene que contener todos los datos, no es un límite operativo y no predice los registros futuros.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de flotación', text: 'Ahora el informe tiene una medida de dispersión en unidades comprensibles. En espesadores reuniremos las medidas aprendidas con un objetivo operativo explícito: menor dispersión no significa automáticamente mejor operación.' },
    ] } },
  ],
};
