import { LessonDefinition } from '../lesson.types';

export const LESSON_01_LOADING: LessonDefinition = {
  id: 'lesson-01',
  steps: [
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-01-loading-intro',
        messages: [
          { speaker: 'npc', name: 'Encargado del carguío', text: 'Estamos terminando de cargar estos camiones antes de enviarlos por la rampa.' },
          { speaker: 'npc', name: 'Encargado del carguío', text: 'Revisé las toneladas que recibió cada unidad y algo me llama la atención.' },
          { speaker: 'player', name: 'Tú', text: '¿Hay algún camión con poca carga?' },
          { speaker: 'npc', name: 'Encargado del carguío', text: 'No quiero que mires solamente un camión. Compara los dos grupos completos.' },
          { speaker: 'npc', name: 'Encargado del carguío', text: 'Observa las toneladas cargadas y dime en cuál grupo las cargas son más irregulares.' }
        ]
      }
    },
    { type: 'exercise', exerciseId: 'loading-spread' },
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-01-loading-end',
        messages: [
          { speaker: 'player', name: 'Tú', text: 'El Grupo B tiene cargas mucho más separadas entre sí.' },
          { speaker: 'npc', name: 'Encargado del carguío', text: 'Exacto. En el Grupo A las cargas se mantienen bastante próximas. En el B cambian mucho más de un camión a otro.' },
          { speaker: 'npc', name: 'Encargado del carguío', text: 'Cuando los valores de un conjunto están más extendidos, decimos que existe mayor dispersión.' },
          { speaker: 'npc', name: 'Encargado del carguío', text: 'Los camiones seguirán ahora por la rampa. Allí están comparando los resultados de dos turnos. Ve a hablar con el encargado del control.' }
        ]
      }
    }
  ]
};
