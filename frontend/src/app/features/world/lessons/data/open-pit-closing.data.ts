import type { DialogueData } from '../../components/dialogue/dialogue.types';

export const OPEN_PIT_CLOSING: DialogueData = {
  id: 'open-pit-closing',
  messages: [
    {
      speaker: 'npc', characterId: 'open-pit-guide', name: 'Supervisor del turno',
      text: 'Ya regresaste al centro de control. Entreguemos lo que encontraste a quienes vienen en el siguiente turno.',
    },
    {
      speaker: 'player', characterId: 'player', name: 'Tú',
      text: 'Un promedio puede esconder diferencias. Por eso revisamos los registros de cada área, no solo su resumen.',
    },
    {
      speaker: 'npc', characterId: 'open-pit-guide', name: 'Supervisor del turno',
      text: 'En espesadores, B alcanzó la meta. Usaremos B como ejemplo y revisaremos por qué A quedó bajo. Variar menos no basta para elegir.',
    },
    {
      speaker: 'npc', characterId: 'open-pit-guide', name: 'Supervisor del turno',
      text: 'Estos registros no explican por sí solos las causas. Antes de cambiar ajustes, hay que investigar. El siguiente turno puede ser distinto.',
    },
    {
      speaker: 'npc', characterId: 'open-pit-guide', name: 'Supervisor del turno',
      text: 'Gracias. Cada área conserva sus propias medidas en el informe. Consúltalo en «Ver recorrido → Informe del turno». También puedes volver a practicar las clases.',
    },
  ],
};
