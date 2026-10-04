import { LessonDefinition } from '../lesson.types';

export const LESSON_06_SAG: LessonDefinition = {
  id: 'lesson-06',
  steps: [
    { type: 'dialogue', dialogue: { id: 'lesson-06-sag-intro', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador del molino SAG', text: 'Leí tu aviso de chancado. Ya sabemos comparar cada registro con el promedio. Ahora necesito resumir cuánto cambió la cantidad de material que recibió el molino.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador del molino SAG', text: 'Aquí tengo los registros de cuatro horas: 98, 100, 100 y 102 toneladas por hora. Su promedio es 100.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador del molino SAG', text: 'A veces tenemos más registros y otras veces menos. Ayúdame a usar todos los datos sin confundir más registros con más cambios.' },
    ] } },
    { type: 'exercise', exerciseId: 'sag-build-variance' },
    { type: 'dialogue', dialogue: { id: 'lesson-06-sag-end', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador del molino SAG', text: 'Añadiré al informe del siguiente turno que estos cuatro registros tienen promedio de 100 t/h y varianza de 2 (t/h)². Sus diferencias respecto al promedio suman 0, pero sí hubo cambios.' },
      { speaker: 'player', characterId: 'player', name: 'Tú', text: 'La varianza promedia las desviaciones al cuadrado. Duplicar los mismos datos en una copia aumenta la suma y la cantidad de registros por igual, no la varianza.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador del molino SAG', text: 'Con cuadrados, las separaciones grandes cuentan más. También podríamos usar distancias sin signo, pero sería otra medida. Aquí las unidades están al cuadrado: no es una distancia de 2 t/h.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador del molino SAG', text: 'Este resumen muestra los cambios, no por qué ocurrieron ni si fueron adecuados. En la siguiente tarea usarás la varianza con otros datos.' },
    ] } },
  ],
};
