import { LessonDefinition } from '../lesson.types';

export const LESSON_03_HAULAGE: LessonDefinition = {
  id: 'lesson-03',
  steps: [
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-03-haulage-intro',
        messages: [
          {
            speaker: 'npc',
            characterId: 'haulage-controller',
            name: 'Encargado del botadero',
            text: 'Bienvenido al botadero. Aquí descargamos el material de descarte, llamado desmonte.',
          },
          {
            speaker: 'npc',
            characterId: 'haulage-controller',
            name: 'Encargado del botadero',
            text: 'Anotamos cuánto dura cada descarga. El equipo que organiza las llegadas del siguiente turno necesita conocer esos tiempos.',
          },
          {
            speaker: 'npc',
            characterId: 'haulage-controller',
            name: 'Encargado del botadero',
            text: 'Estas cinco descargas son del mismo tipo. Ayúdame a preparar un aviso.',
          },
          {
            speaker: 'npc',
            characterId: 'haulage-controller',
            name: 'Encargado del botadero',
            text: 'Busca la más corta, la más larga y cuánto las separa.',
          },
        ],
      },
    },
    { type: 'exercise', exerciseId: 'haulage-range' },
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-03-haulage-end',
        messages: [
          {
            speaker: 'player',
            characterId: 'player',
            name: 'Tú',
            text: 'Las descargas duraron de 11 a 18 minutos. Hubo una diferencia de 7 minutos entre la más corta y la más larga.',
          },
          {
            speaker: 'npc',
            characterId: 'haulage-controller',
            name: 'Encargado del botadero',
            text: 'Añadiré tu aviso al informe del siguiente turno para preparar las llegadas.',
          },
          {
            speaker: 'npc',
            characterId: 'haulage-controller',
            name: 'Encargado del botadero',
            text: 'El rango muestra lo que pasó, pero las próximas descargas pueden durar distinto.',
          },
          {
            speaker: 'player',
            characterId: 'player',
            name: 'Tú',
            text: 'Y estos tiempos no explican por qué hubo diferencias.',
          },
          {
            speaker: 'npc',
            characterId: 'haulage-controller',
            name: 'Encargado del botadero',
            text: 'Ahora ve al taller. Su encargado necesita comparar unos registros del taller que tienen el mismo rango.',
          },
        ],
      },
    },
  ],
};
