import {
  Component,
  computed,
  input,
  output,
  signal
} from '@angular/core';

export type DialogueData = {
  npcId: string;
  dialogueId: string;
};

@Component({
  selector: 'app-dialogue',
  imports: [],
  templateUrl: './dialogue.html',
  styleUrl: './dialogue.scss'
})
export class Dialogue {

  dialogue = input.required<DialogueData>();

  completed = output<void>();

  dialogueStep = signal(0);

  private readonly dialogues: Record<string, string[]> = {
    'intro-01': [
      'Bienvenido. Este pueblo vive de sus cultivos, talleres y producción.',

      'Cada día generamos datos: cantidades producidas, tiempos de trabajo, resultados y también errores.',

      'Machine Learning nos permite encontrar patrones en esos datos y usarlos para tomar mejores decisiones.',

      'Pero antes de construir modelos, hay que aprender a observar los datos y entender qué nos están diciendo.',

      'Empieza por los cultivos. Allí encontrarás tu primera tarea.'
    ]
  };

  currentDialogueText = computed(() => {
    const dialogueId = this.dialogue().dialogueId;

    return this.dialogues[dialogueId]?.[
      this.dialogueStep()
    ] ?? '';
  });

  nextDialogue(): void {
    const dialogueId = this.dialogue().dialogueId;

    const lines =
      this.dialogues[dialogueId] ?? [];

    const nextStep =
      this.dialogueStep() + 1;

    if (nextStep < lines.length) {
      this.dialogueStep.set(nextStep);
      return;
    }

    this.completed.emit();
  }
}