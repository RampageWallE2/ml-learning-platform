import {
  Component,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  computed,
  input,
  output,
  signal
} from '@angular/core';

import {
  DialogueData,
  DialogueMessage
} from './dialogue.types';
import { resolveDialoguePortrait } from './dialogue-characters.data';

const TYPEWRITER_INTERVAL_MS = 22;

@Component({
  selector: 'app-dialogue',
  imports: [],
  templateUrl: './dialogue.html',
  styleUrl: './dialogue.scss'
})
export class Dialogue implements OnChanges, OnDestroy {

  dialogue = input.required<DialogueData>();

  completed = output<void>();

  currentIndex = signal(0);

  displayedText = signal('');

  isTyping = signal(false);

  private typingTimer?: ReturnType<typeof setInterval>;

  currentMessage = computed<DialogueMessage | null>(() =>
    this.dialogue().messages[this.currentIndex()] ?? null
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

  npcPortrait = computed(() =>
    resolveDialoguePortrait(this.npcMessage(), 'npc')
  );

  playerPortrait = computed(() =>
    resolveDialoguePortrait(this.playerMessage(), 'player')
  );

  isLastMessage = computed(() =>
    this.currentIndex() >=
    this.dialogue().messages.length - 1
  );

  progressLabel = computed(() =>
    `${this.currentIndex() + 1} / ${this.dialogue().messages.length}`
  );

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['dialogue']) {
      return;
    }

    this.currentIndex.set(0);

    this.startTypewriter(
      this.dialogue().messages[0]?.text ?? ''
    );
  }

  ngOnDestroy(): void {
    this.stopTypewriter();
  }

  next(): void {
    if (this.isTyping()) {
      this.revealCurrentMessage();
      return;
    }

    if (this.isLastMessage()) {
      this.completed.emit();
      return;
    }

    const nextIndex =
      this.currentIndex() + 1;

    this.currentIndex.set(
      nextIndex
    );

    this.startTypewriter(
      this.dialogue().messages[nextIndex]
        ?.text ?? ''
    );
  }

  private startTypewriter(text: string): void {
    this.stopTypewriter();

    if (
      !text ||
      this.prefersReducedMotion()
    ) {
      this.displayedText.set(text);
      return;
    }

    const characters = Array.from(text);
    let visibleCharacters = 1;

    this.displayedText.set(
      characters.slice(0, visibleCharacters).join('')
    );

    this.isTyping.set(true);

    this.typingTimer = setInterval(() => {
      visibleCharacters += 1;

      this.displayedText.set(
        characters.slice(0, visibleCharacters).join('')
      );

      if (
        visibleCharacters >=
        characters.length
      ) {
        this.stopTypewriter();
      }
    }, TYPEWRITER_INTERVAL_MS);
  }

  private revealCurrentMessage(): void {
    this.stopTypewriter();

    this.displayedText.set(
      this.currentMessage()?.text ?? ''
    );
  }

  private stopTypewriter(): void {
    if (
      this.typingTimer !==
      undefined
    ) {
      clearInterval(
        this.typingTimer
      );

      this.typingTimer =
        undefined;
    }

    this.isTyping.set(false);
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    ).matches ?? false;
  }
}
