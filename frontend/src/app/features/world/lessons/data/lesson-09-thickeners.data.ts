import { LessonDefinition } from '../lesson.types';

export const LESSON_09_THICKENERS: LessonDefinition = {
  id: 'lesson-09',
  steps: [
    { type: 'dialogue', dialogue: { id: 'lesson-09-thickeners-intro', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de espesadores', text: 'Llegaste con las evidencias de la ruta. Para cerrar el informe del relevo, ayúdame a elegir una referencia y señalar qué debemos investigar antes de cambiar la operación.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de espesadores', text: 'Aquí comparamos dos períodos de alimentación de espesadores: seis registros por período, medidos en el mismo punto y a intervalos iguales, en condiciones equivalentes. Son nuestros propios datos, no los de flotación.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de espesadores', text: 'La meta ficticia de este caso es una media de 100 toneladas por hora. No exige que cada registro sea 100. Las medidas ya están calculadas: necesitamos interpretar la media y la dispersión juntas.' },
    ] } },
    { type: 'exercise', exerciseId: 'thickeners-final-report' },
    { type: 'dialogue', dialogue: { id: 'lesson-09-thickeners-end', messages: [
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de espesadores', text: 'Dejaré los datos originales en el informe: A tuvo media de 80 t/h y dispersión 0. B tuvo media de 100 t/h, rango de 4 t/h, varianza de 4 (t/h)² y desviación estándar de 2 t/h.' },
      { speaker: 'player', characterId: 'player', name: 'Tú', text: 'A varió menos, pero quedó bajo la meta. Tomamos B como referencia para el relevo e investigamos por qué A quedó por debajo. Antes de cambiar ajustes, necesitamos conocer las causas y los límites de variación aceptables.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de espesadores', text: 'En el ensayo, ambas medias cumplían la meta y el criterio indicado era preferir menor variación. Entonces sí elegimos el período más estable. Ese ensayo no reemplaza los registros originales ni garantiza resultados futuros.' },
      { speaker: 'npc', characterId: 'npc-default', name: 'Operador de espesadores', text: 'Investigación cerrada: aprendiste a mirar los registros, no solo sus resúmenes, y a considerar objetivo y dispersión juntos. Ni menor ni mayor dispersión significan automáticamente una mejor operación. El informe del relevo está listo.' },
    ] } },
  ],
};
