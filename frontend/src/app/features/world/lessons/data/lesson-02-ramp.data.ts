import { LessonDefinition } from '../lesson.types';

export const LESSON_02_RAMP: LessonDefinition = {
  id: 'lesson-02',
  steps: [
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-02-ramp-intro',
        messages: [
          { speaker: 'npc', characterId: 'ramp-controller', name: 'Encargado del control de rampa', text: 'Los camiones que viste abajo pasan por aquí antes de continuar hacia la ruta de acarreo.' },
          { speaker: 'npc', characterId: 'ramp-controller', name: 'Encargado del control de rampa', text: 'Estoy comparando las cargas registradas en dos turnos.' },
          { speaker: 'npc', characterId: 'ramp-controller', name: 'Encargado del control de rampa', text: 'Necesitamos mantener cargas cercanas al objetivo para que la operación sea más regular.' },
          { speaker: 'player', characterId: 'player', name: 'Tú', text: 'Entonces debería fijarme en qué turno mantuvo cargas más parecidas.' },
          { speaker: 'npc', characterId: 'ramp-controller', name: 'Encargado del control de rampa', text: 'Exactamente. Revisa los registros y dime con cuál turno te quedarías si buscas regularidad.' }
        ]
      }
    },
    { type: 'exercise', exerciseId: 'ramp-shift-regularity' },
    {
      type: 'dialogue',
      dialogue: {
        id: 'lesson-02-ramp-end',
        messages: [
          { speaker: 'npc', characterId: 'ramp-controller', name: 'Encargado del control de rampa', text: 'Tiene sentido. El Turno A fue mucho más regular.' },
          { speaker: 'npc', characterId: 'ramp-controller', name: 'Encargado del control de rampa', text: 'Pero ahora mira este dato: ambos turnos tuvieron una carga promedio de 100 toneladas por camión.' },
          { speaker: 'player', characterId: 'player', name: 'Tú', text: '¿Los dos tienen el mismo promedio? Entonces el promedio no muestra la diferencia que acabamos de ver.' },
          { speaker: 'npc', characterId: 'ramp-controller', name: 'Encargado del control de rampa', text: 'Exactamente. El promedio nos dice dónde está el centro de los datos, pero no cuánto cambian alrededor de él.' },
          { speaker: 'npc', characterId: 'ramp-controller', name: 'Encargado del control de rampa', text: 'Los camiones que salen de aquí están teniendo otra irregularidad en sus tiempos de viaje. Sigue la ruta y habla con el encargado del acarreo.' }
        ]
      }
    }
  ]
};
