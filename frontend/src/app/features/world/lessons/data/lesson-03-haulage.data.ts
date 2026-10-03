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
          { speaker: 'npc', characterId: 'haulage-controller', name: 'Encargado del botadero', text: 'Estoy preparando el informe del relevo con cinco descargas comparables.' },
          { speaker: 'player', characterId: 'player', name: 'Tú', text: '¿Quieres saber qué tan distintos fueron los tiempos?' },
          { speaker: 'npc', characterId: 'haulage-controller', name: 'Encargado del botadero', text: 'Exactamente. Ya sabes reconocer cuándo los datos están dispersos. Ahora quiero algo más concreto.' },
          { speaker: 'npc', characterId: 'haulage-controller', name: 'Encargado del botadero', text: 'Busca primero la descarga más corta y la más larga.' }
        ]
      }
    },
    { type: 'exercise', exerciseId: 'haulage-range' },
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-03-haulage-end',
        messages: [
          { speaker: 'player', characterId: 'player', name: 'Tú', text: 'Entonces entre el tiempo más corto y el más largo hay una diferencia de 7 minutos.' },
          { speaker: 'npc', characterId: 'haulage-controller', name: 'Encargado del botadero', text: 'Correcto. Esa diferencia entre el máximo y el mínimo se llama rango.' },
          { speaker: 'npc', characterId: 'haulage-controller', name: 'Encargado del botadero', text: 'Es una forma rápida de medir qué tan separados están los extremos de nuestros datos.' },
          { speaker: 'player', characterId: 'player', name: 'Tú', text: 'Entonces ahora ya no solo puedo decir que los tiempos varían. También puedo expresar parte de esa variación con un número.' },
          { speaker: 'npc', characterId: 'haulage-controller', name: 'Encargado del botadero', text: 'Anotaré que las descargas observadas estuvieron entre 11 y 18 minutos, con un rango de 7 minutos.' },
          { speaker: 'npc', characterId: 'haulage-controller', name: 'Encargado del botadero', text: 'El informe de esta visita está listo. Ve al taller de mantenimiento: su encargado necesita revisar unos registros del taller que tienen el mismo rango.' }
        ]
      }
    }
  ]
};
