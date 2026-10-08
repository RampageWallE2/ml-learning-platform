import type { DialogueData } from '../../components/dialogue/dialogue.types';

export const OPEN_PIT_INTRO: DialogueData = {
  id: 'open-pit-intro',
  messages: [
    {
      speaker: 'npc',
      characterId: 'open-pit-guide',
      name: 'Supervisor del turno',
      text: 'Bienvenido a Open Pit. Antes del siguiente turno, revisaremos los registros de cada área.',
    },
    { speaker: 'player', characterId: 'player', name: 'Tú', text: '¿Qué tengo que hacer?' },
    {
      speaker: 'npc',
      characterId: 'open-pit-guide',
      name: 'Supervisor del turno',
      text: 'Habla con los encargados y compara sus registros. En cada clase recogerás una pista para el informe final.',
    },
    {
      speaker: 'npc',
      characterId: 'open-pit-guide',
      name: 'Supervisor del turno',
      text: 'Con esas pistas decidiremos qué conviene revisar en el siguiente turno.',
    },
    {
      speaker: 'npc',
      characterId: 'open-pit-guide',
      name: 'Supervisor del turno',
      text: 'Empezaremos dentro del tajo. Te llevo cerca del encargado del carguío; acércate a él para iniciar la primera clase.',
    },
  ],
};
