import {
  AfterViewInit,
  Component,
  OnDestroy,
  signal
} from '@angular/core';

import Phaser, { Game } from 'phaser';

import { gameConfig } from '../../game/config/game.config';
import {
  gameEvents,
  GameEvents
} from '../../game/events/game-events';

import {
  Dialogue,
  DialogueData
} from '../../components/dialogue/dialogue';

import { Lesson01Nursery } from '../../lessons/lesson-01-nursery/lesson-01-nursery';


type LessonData = {
  lessonId: string;
  step: number;
};


@Component({
  selector: 'app-world-page',
  imports: [
    Lesson01Nursery,
    Dialogue
  ],
  templateUrl: './world-page.html',
  styleUrl: './world-page.scss',
})
export class WorldPage implements AfterViewInit, OnDestroy {

  private game?: Phaser.Game;

  lessonActive = signal<LessonData | null>(null);
  activeDialogue = signal<DialogueData | null>(null);

  introCompleted = signal(false);
  currentObjective = signal<string | null>(null);


  closeLesson(): void {
    this.lessonActive.set(null);
    gameEvents.emit(
      GameEvents.UNLOCK_PLAYER
    )
  }


  closeDialogue(): void {
    const dialogue = this.activeDialogue();

    if (dialogue?.dialogueId === 'intro-01') {
      this.introCompleted.set(true);
      this.currentObjective.set('Investiga los cultivos');
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
    dialogue: DialogueData
  ): void => {
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