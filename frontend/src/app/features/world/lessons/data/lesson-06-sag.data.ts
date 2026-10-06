import { LessonDefinition } from '../lesson.types';

export const LESSON_06_SAG: LessonDefinition = {
  id: 'lesson-06',
  steps: [
    { type: 'dialogue', dialogue: { id: 'lesson-06-sag-intro', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador del molino SAG', text: 'Leí tu aviso de chancado. Ayúdame a explicar al siguiente turno cuánto se separan del promedio los datos de este molino.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador del molino SAG', text: 'Aquí tengo los registros de cuatro horas: 98, 100, 100 y 102 toneladas por hora. Su promedio es 100.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador del molino SAG', text: 'Cada registro corresponde a una hora. Usemos los cuatro, incluso los que están justo en el promedio. Contar más datos no significa que sean más distintos.' },
    ] } },
    { type: 'exercise', exerciseId: 'sag-build-variance' },
    { type: 'dialogue', dialogue: { id: 'lesson-06-sag-end', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador del molino SAG', text: 'El siguiente turno recibirá este resumen: promedio de 100 t/h y varianza de 2 (t/h)². Los datos eran distintos, aunque sus diferencias sumaran 0.' },
      { speaker: 'player', characterId: 'player', name: 'Tú', text: 'Para obtener la varianza, multiplicamos cada diferencia por sí misma, sumamos y dividimos entre todos los registros. Repetir los mismos datos en una copia no cambia el resultado.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador del molino SAG', text: 'Los cuadrados hacen que las separaciones grandes cuenten más. También podríamos usar distancias sin signo, pero sería otra medida. Ojo: 2 (t/h)² no significa 2 t/h.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador del molino SAG', text: 'Sabemos cuánto se separan los datos, pero no por qué ni si el molino trabajó bien. En la siguiente tarea compararás otros datos.' },
    ] } },
  ],
};
