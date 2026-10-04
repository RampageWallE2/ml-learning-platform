import { LessonDefinition } from '../lesson.types';

export const LESSON_09_THICKENERS: LessonDefinition = {
  id: 'lesson-09',
  steps: [
    { type: 'dialogue', dialogue: { id: 'lesson-09-thickeners-intro', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de espesadores', text: 'Ya reuniste los datos de la ruta. Ayúdame a cerrar el informe del siguiente turno: elegiremos una referencia y qué investigar antes de cambiar los ajustes.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de espesadores', text: 'Comparamos dos períodos de alimentación de espesadores. Hay seis registros por período, tomados en el mismo punto, con la misma frecuencia y en condiciones parecidas. Son datos de esta zona, no de flotación.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de espesadores', text: 'En este ejemplo, la meta es un promedio de 100 toneladas por hora. No exige que cada registro sea 100. Las medidas ya están calculadas. Mira el promedio y cuánto variaron los registros.' },
    ] } },
    { type: 'exercise', exerciseId: 'thickeners-final-report' },
    { type: 'dialogue', dialogue: { id: 'lesson-09-thickeners-end', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de espesadores', text: 'Dejaré los datos originales en el informe. A tuvo promedio de 80 t/h y todos sus registros fueron iguales. B tuvo promedio de 100 t/h, rango de 4 t/h, varianza de 4 (t/h)² y desviación estándar de 2 t/h.' },
      { speaker: 'player', characterId: 'player', name: 'Tú', text: 'A varió menos, pero quedó bajo la meta. Usamos B como referencia para el siguiente turno y buscamos por qué A quedó por debajo. Antes de cambiar ajustes, hay que saber la causa y cuánto pueden variar los registros.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de espesadores', text: 'En la práctica, ambos promedios cumplían la meta y ambos períodos cambiaban. La regla de ese caso era elegir el que varió menos. La práctica no reemplaza los datos originales ni asegura resultados futuros.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de espesadores', text: 'Investigación terminada. Aprendiste a mirar todos los registros y a comparar la meta con la variación. Variar menos o más no significa trabajar mejor. El informe del siguiente turno está listo.' },
    ] } },
  ],
};
