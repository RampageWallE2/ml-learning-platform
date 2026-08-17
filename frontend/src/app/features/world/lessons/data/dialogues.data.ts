import { DialogueData } from "../../components/dialogue/dialogue.types"

export const DIALOGUES: Record<string, DialogueData> = {

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