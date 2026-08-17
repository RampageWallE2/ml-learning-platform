import {
  Component,
  computed,
  input,
  output,
  signal
} from '@angular/core';

import {
  DialogueData,
  DialogueMessage
} from './dialogue.types';

@Component({
  selector: 'app-dialogue',
  imports: [],
  templateUrl: './dialogue.html',
  styleUrl: './dialogue.scss'
})
export class Dialogue {

  dialogue = input.required<DialogueData>();

  completed = output<void>();

  currentIndex = signal(0);

  currentMessage = computed(() =>
    this.dialogue().messages[this.currentIndex()]
  );

  npcMessage = computed<DialogueMessage | null>(() => {
    const messages = this.dialogue().messages.slice(
      0,
      this.currentIndex() + 1
    );

    return [...messages]
      .reverse()
      .find(message => message.speaker === 'npc')
      ?? null;
  });

  playerMessage = computed<DialogueMessage | null>(() => {
    const messages = this.dialogue().messages.slice(
      0,
      this.currentIndex() + 1
    );

    return [...messages]
      .reverse()
      .find(message => message.speaker === 'player')
      ?? null;
  });

  isLastMessage = computed(() =>
    this.currentIndex() >=
    this.dialogue().messages.length - 1
  );

  next(): void {
    if (this.isLastMessage()) {
      this.completed.emit();
      return;
    }

    this.currentIndex.update(
      index => index + 1
    );
  }
}