import { LessonDefinition } from '../lesson.types';

export const LESSON_06_SAG: LessonDefinition = {
  id: 'lesson-06',
  steps: [
    { type: 'dialogue', dialogue: { id: 'lesson-06-sag-intro', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador del molino SAG', text: 'Leí tu aviso de chancado. Ayúdame a explicar al siguiente turno cuánto se separan del promedio los datos de este molino.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador del molino SAG', text: 'Aquí tengo los registros de cuatro horas: 98, 100, 100 y 102 toneladas por hora. Su promedio es 100.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador del molino SAG', text: 'Cada registro corresponde a una hora. Vamos a resumir sus diferencias con un promedio. Usemos los cuatro registros, incluso los que están justo en el promedio.' },
    ] } },
    { type: 'exercise', exerciseId: 'sag-build-variance' },
    { type: 'dialogue', dialogue: { id: 'lesson-06-sag-end', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador del molino SAG', text: 'El siguiente turno recibirá este resumen: promedio de 100 t/h y varianza de 2 (t/h)². Los datos eran distintos, aunque sus diferencias sumaran 0.' },
      { speaker: 'player', characterId: 'player', name: 'Tú', text: 'Para obtener la varianza, multiplicamos cada diferencia por sí misma. Los cuadrados suman 8 y tenemos 4 registros: 8 dividido entre 4 da 2.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador del molino SAG', text: 'Los cuadrados hacen que las separaciones grandes cuenten más. También podríamos usar distancias sin signo, pero sería otra medida. Ojo: 2 (t/h)² no significa 2 t/h.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador del molino SAG', text: 'Sabemos cuánto se separan los datos, pero no por qué ni si el molino trabajó bien. En la siguiente tarea compararás otros datos.' },
    ] } },
  ],
};
