import { LessonDefinition } from '../lesson.types';

export const LESSON_03_HAULAGE: LessonDefinition = {
  id: 'lesson-03',
  steps: [
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-03-haulage-intro',
        messages: [
          { speaker: 'npc', name: 'Encargado del acarreo', text: 'Bienvenido al puesto de control. Desde aquí registramos cuánto tardan los camiones en recorrer este tramo.' },
          { speaker: 'npc', name: 'Encargado del acarreo', text: 'Normalmente llegan con tiempos bastante parecidos, pero hoy uno de los viajes tardó mucho más.' },
          { speaker: 'player', name: 'Tú', text: '¿Quieres saber qué tan distintos fueron los tiempos?' },
          { speaker: 'npc', name: 'Encargado del acarreo', text: 'Exactamente. Ya sabes reconocer cuándo los datos están dispersos. Ahora quiero algo más concreto.' },
          { speaker: 'npc', name: 'Encargado del acarreo', text: 'Busca primero el viaje más rápido y el más lento.' }
        ]
      }
    },
    { type: 'exercise', exerciseId: 'haulage-range' },
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-03-haulage-end',
        messages: [
          { speaker: 'player', name: 'Tú', text: 'Entonces entre el tiempo más corto y el más largo hay una diferencia de 7 minutos.' },
          { speaker: 'npc', name: 'Encargado del acarreo', text: 'Correcto. Esa diferencia entre el máximo y el mínimo se llama rango.' },
          { speaker: 'npc', name: 'Encargado del acarreo', text: 'Es una forma rápida de medir qué tan separados están los extremos de nuestros datos.' },
          { speaker: 'player', name: 'Tú', text: 'Entonces ahora ya no solo puedo decir que los tiempos varían. También puedo expresar parte de esa variación con un número.' },
          { speaker: 'npc', name: 'Encargado del acarreo', text: 'Exactamente. Pero recuerda: el rango solo mira los dos extremos. Todavía queda mucho por entender sobre lo que ocurre entre ellos.' },
          { speaker: 'npc', name: 'Encargado del acarreo', text: 'Estos camiones continúan hacia el área ROM y chancado. Sigue la ruta.' }
        ]
      }
    }
  ]
};
