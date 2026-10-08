import type { DialogueData } from '../../components/dialogue/dialogue.types';

export const OPEN_PIT_INTRO: DialogueData = {
  id: 'open-pit-intro',
  messages: [
    {
      speaker: 'npc', characterId: 'open-pit-guide', name: 'Supervisor del turno',
      text: 'Bienvenido a Open Pit. Antes del siguiente turno, necesitamos revisar cómo cambian las cargas, los tiempos y los resultados en cada área.',
    },
    {
      speaker: 'player', characterId: 'player', name: 'Tú',
      text: '¿Qué tengo que hacer?',
    },
    {
      speaker: 'npc', characterId: 'open-pit-guide', name: 'Supervisor del turno',
      text: 'Habla con los encargados y compara sus registros. En cada clase recogerás una pista para el informe final. Esas pistas nos ayudarán a decidir qué conviene revisar en el siguiente turno.',
    },
    {
      speaker: 'npc', characterId: 'open-pit-guide', name: 'Supervisor del turno',
      text: 'Empezaremos dentro del tajo, con las cargas de los camiones. Te llevo a un punto libre cerca del encargado del carguío. Acércate a él para iniciar la primera clase.',
    },
  ],
};
