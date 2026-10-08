import { LessonDefinition } from '../lesson.types';

export const LESSON_04_WORKSHOP: LessonDefinition = {
  id: 'lesson-04',
  steps: [
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-04-workshop-intro',
        messages: [
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Encargado del taller',
            text: 'Me comentaron que ayudaste en el botadero. Estoy organizando las revisiones del siguiente turno.',
          },
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Encargado del taller',
            text: 'Estos dos equipos hicieron la misma tarea y tienen el mismo rango.',
          },
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Encargado del taller',
            text: 'El informe dice que, por eso, sus tiempos se repiten igual. Ayúdame a comprobarlo con todos los registros.',
          },
        ],
      },
    },
    { type: 'exercise', exerciseId: 'workshop-range-limits' },
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-04-workshop-end',
        messages: [
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Encargado del taller',
            text: 'Corregiré el informe: ambos rangos son de 4 minutos, pero sus tiempos no se repiten igual.',
          },
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Encargado del taller',
            text: 'En A hubo tres revisiones de 10 minutos y en B solo una.',
          },
          {
            speaker: 'player',
            characterId: 'player',
            name: 'Tú',
            text: 'El rango solo mide la diferencia entre el tiempo menor y el mayor. También necesitamos mirar los demás tiempos.',
          },
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Encargado del taller',
            text: 'Usaré los registros completos para organizar las revisiones, no solo el rango.',
          },
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Encargado del taller',
            text: 'Esto no dice qué equipo trabaja mejor ni explica la causa de las diferencias.',
          },
          {
            speaker: 'npc',
            characterId: 'npc-default',
            name: 'Encargado del taller',
            text: 'Ve a ROM / chancado. Allí necesitan comparar todos los registros.',
          },
        ],
      },
    },
  ],
};
