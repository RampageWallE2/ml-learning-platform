import { LessonDefinition } from '../lesson.types';

export const LESSON_03_HAULAGE: LessonDefinition = {
  id: 'lesson-03',
  steps: [
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-03-haulage-intro',
        messages: [
          { speaker: 'npc', characterId: 'haulage-controller', name: 'Encargado del botadero', text: 'Bienvenido al botadero. Aquí registramos cuánto duran las descargas de desmonte.' },
          { speaker: 'npc', characterId: 'haulage-controller', name: 'Encargado del botadero', text: 'El equipo que organiza las llegadas del siguiente turno necesita saber cuánto variaron los tiempos de descarga.' },
          { speaker: 'npc', characterId: 'haulage-controller', name: 'Encargado del botadero', text: 'Estas cinco descargas son del mismo tipo. Ayúdame a preparar un aviso: busca la más corta, la más larga y cuánto las separa.' }
        ]
      }
    },
    { type: 'exercise', exerciseId: 'haulage-range' },
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-03-haulage-end',
        messages: [
          { speaker: 'player', characterId: 'player', name: 'Tú', text: 'El aviso está listo: las descargas observadas duraron de 11 a 18 minutos. Hubo una diferencia de 7 minutos entre la más corta y la más larga.' },
          { speaker: 'npc', characterId: 'haulage-controller', name: 'Encargado del botadero', text: 'Añadiré tu aviso al informe del siguiente turno para preparar las llegadas. El rango muestra lo que pasó, pero las próximas descargas pueden durar distinto.' },
          { speaker: 'player', characterId: 'player', name: 'Tú', text: 'Y estos tiempos no explican por qué hubo diferencias.' },
          { speaker: 'npc', characterId: 'haulage-controller', name: 'Encargado del botadero', text: 'Exacto. Ahora ve al taller de mantenimiento: su encargado necesita revisar unos registros del taller que tienen el mismo rango.' }
        ]
      }
    }
  ]
};
