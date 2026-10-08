import { DialogueData } from "../../components/dialogue/dialogue.types"
import { OPEN_PIT_INTRO } from './open-pit-intro.data';
import { OPEN_PIT_CLOSING } from './open-pit-closing.data';

export const DIALOGUES: Record<string, DialogueData> = {

  [OPEN_PIT_INTRO.id]: OPEN_PIT_INTRO,
  [OPEN_PIT_CLOSING.id]: OPEN_PIT_CLOSING,

  'intro-01': {
    id: 'intro-01',

    messages: [
      {
        speaker: 'npc',
        name: 'Guía del pueblo',
        text: 'Bienvenido. Este pueblo vive de sus cultivos, talleres y producción.'
      },
      {
        speaker: 'npc',
        name: 'Guía del pueblo',
        text: 'Cada día generamos datos: cantidades, tiempos, resultados y también errores.'
      },
      {
        speaker: 'npc',
        name: 'Guía del pueblo',
        text: 'Machine Learning nos ayuda a encontrar patrones en esos datos y apoyar nuestras decisiones.'
      },
      {
        speaker: 'npc',
        name: 'Guía del pueblo',
        text: 'Pero antes de construir modelos, debemos aprender a observar los datos y entender qué nos están diciendo.'
      },
      {
        speaker: 'npc',
        name: 'Guía del pueblo',
        text: 'Empieza investigando los cultivos.'
      }
    ]
  }

};
