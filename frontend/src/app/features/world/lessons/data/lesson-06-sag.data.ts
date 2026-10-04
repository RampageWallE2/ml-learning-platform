import { LessonDefinition } from '../lesson.types';

export const LESSON_06_SAG: LessonDefinition = {
  id: 'lesson-06',
  steps: [
    { type: 'dialogue', dialogue: { id: 'lesson-06-sag-intro', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador del molino SAG', text: 'Leí tu aviso de chancado. Ya sabemos describir cada registro por separado; ahora necesito un resumen para comparar cómo varió la alimentación en nuestros períodos de operación.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador del molino SAG', text: 'Aquí tengo los registros de cuatro horas: 98, 100, 100 y 102 toneladas por hora. Su promedio es 100.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador del molino SAG', text: 'Los períodos pueden tener distinta cantidad de registros. Ayúdame a construir una medida que considere todos los datos sin confundir más registros con más variación.' },
    ] } },
    { type: 'exercise', exerciseId: 'sag-build-variance' },
    { type: 'dialogue', dialogue: { id: 'lesson-06-sag-end', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador del molino SAG', text: 'Añadiré al informe del relevo que estos cuatro registros tienen media de 100 t/h y varianza de 2 (t/h)². La suma de sus desviaciones da 0, pero sí hubo diferencias.' },
      { speaker: 'player', characterId: 'player', name: 'Tú', text: 'La varianza promedia las desviaciones al cuadrado. Duplicar los mismos datos en una copia aumenta la suma y la cantidad de registros por igual, no la varianza.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador del molino SAG', text: 'Los cuadrados dan más peso a separaciones grandes. Las distancias sin signo también son una opción válida, pero definen otra medida. Nuestro resultado tiene unidades al cuadrado, no es una distancia de 2 t/h.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador del molino SAG', text: 'Este resumen describe los registros revisados; no explica por qué varió la alimentación ni dice si fue adecuada. La siguiente tarea será usar lo construido con otros datos.' },
    ] } },
  ],
};
