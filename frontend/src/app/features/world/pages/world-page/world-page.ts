import { AfterViewInit, Component, OnDestroy, signal, inject } from '@angular/core';

import Phaser, { Game } from 'phaser';

import { gameConfig } from '../../game/config/game.config';
import { gameEvents, GameEvents } from '../../game/events/game-events';

import { Dialogue } from '../../components/dialogue/dialogue';

import { DialogueData, DialogueRequest } from '../../components/dialogue/dialogue.types';

import { DIALOGUES } from '../../lessons/data/dialogues.data';

import { InteractionPanel } from '../../components/interaction-panel/interaction-panel';

import { LessonRunner } from '../../components/lessons/lesson-runner/lesson-runner';

import { ProgressService } from '../../progress/progress.service';
import { ZoneProgress } from '../../components/zone-progress/zone-progress';



type LessonData = {
  lessonId: string;
  step: number;
};

@Component({
  selector: 'app-world-page',
  imports: [
    LessonRunner,
    Dialogue,
    InteractionPanel,
    ZoneProgress
  ],
  templateUrl: './world-page.html',
  styleUrl: './world-page.scss',
})
export class WorldPage implements AfterViewInit, OnDestroy {

  readonly progress = inject(ProgressService)

  private game?: Phaser.Game;

  lessonActive = signal<LessonData | null>(null);
  activeDialogue = signal<DialogueData | null>(null);

  introCompleted = signal(false);
  currentObjective = signal<string | null>(null);
  lesson01Completed = signal(false);


  completeLesson(lessonId: string): void {
    console.log('Lección completada:', lessonId);
    this.progress.completeLesson(lessonId);
    this.closeLesson();
    
  }

  closeLesson(): void {
    this.lessonActive.set(null);
    gameEvents.emit(
      GameEvents.UNLOCK_PLAYER
    )
  }


  closeDialogue(): void {
    const dialogue = this.activeDialogue();

    if (dialogue?.id === 'intro-01') {
      this.introCompleted.set(true);

      this.currentObjective.set(
        'Investiga los cultivos'
      );
    }

    this.activeDialogue.set(null);

    gameEvents.emit(
      GameEvents.UNLOCK_PLAYER
    );
  }


  private readonly handlerOpenLesson = (lesson: LessonData ): void => {
    this.lessonActive.set(lesson);

    gameEvents.emit (
      GameEvents.LOCK_PLAYER
    )
  };

  private readonly handlerOpenDialogue = (
    request: DialogueRequest
  ): void => {

    const dialogue = DIALOGUES[request.dialogueId] 

    if(!dialogue) {
      console.log('No existe ningun dialogo', dialogue )
    }
    this.activeDialogue.set(dialogue);

    gameEvents.emit(
      GameEvents.LOCK_PLAYER
    );
  };


  ngAfterViewInit(): void {
    gameEvents.on(
      GameEvents.OPEN_LESSON,
      this.handlerOpenLesson
    );

    gameEvents.on(
      GameEvents.OPEN_DIALOGUE,
      this.handlerOpenDialogue
    );

    this.game = new Phaser.Game(gameConfig);
  }


  ngOnDestroy(): void {
    gameEvents.off(
      GameEvents.OPEN_LESSON,
      this.handlerOpenLesson
    );

    gameEvents.off(
      GameEvents.OPEN_DIALOGUE,
      this.handlerOpenDialogue
    );

    this.game?.destroy(true);
  }
}