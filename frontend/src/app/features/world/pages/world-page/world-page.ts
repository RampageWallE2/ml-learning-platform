import {
  AfterViewInit,
  Component,
  OnDestroy,
  inject,
  signal
} from '@angular/core';

import Phaser from 'phaser';

import {
  gameConfig
} from '../../game/config/game.config';

import {
  gameEvents,
  GameEvents
} from '../../game/events/game-events';

import {
  Dialogue
} from '../../components/dialogue/dialogue';

import {
  DialogueData,
  DialogueRequest
} from '../../components/dialogue/dialogue.types';

import {
  DIALOGUES
} from '../../lessons/data/dialogues.data';

import {
  InteractionPanel
} from '../../components/interaction-panel/interaction-panel';

import {
  LessonRunner
} from '../../components/lessons/lesson-runner/lesson-runner';

import {
  ProgressService
} from '../../progress/progress.service';

import {
  ZoneProgress
} from '../../components/zone-progress/zone-progress';


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
export class WorldPage
  implements AfterViewInit, OnDestroy {

  readonly progress =
    inject(ProgressService);


  private game?: Phaser.Game;


  /* =========================
     LECCIÓN / DIÁLOGO
     ========================= */

  lessonActive =
    signal<LessonData | null>(
      null
    );


  activeDialogue =
    signal<DialogueData | null>(
      null
    );


  /* =========================
     INTRO
     ========================= */

  introCompleted =
    signal(false);


  /* =========================
     AVISO DE BLOQUEO
     ========================= */

  blockedLessonMessage =
    signal<string | null>(
      null
    );


  private blockedNoticeTimer?:
    ReturnType<typeof setTimeout>;


  /* =========================
     COMPLETAR LECCIÓN
     ========================= */

  completeLesson(
    lessonId: string
  ): void {

    console.log(
      'Lección completada:',
      lessonId
    );


    this.progress.completeLesson(
      lessonId
    );


    this.closeLesson();
  }


  /* =========================
     CERRAR LECCIÓN
     ========================= */

  closeLesson(): void {

    this.lessonActive.set(
      null
    );


    gameEvents.emit(
      GameEvents.UNLOCK_PLAYER
    );
  }


  /* =========================
     CERRAR DIÁLOGO
     ========================= */

  closeDialogue(): void {

    const dialogue =
      this.activeDialogue();


    if (
      dialogue?.id ===
      'intro-01'
    ) {

      this.introCompleted.set(
        true
      );
    }


    this.activeDialogue.set(
      null
    );


    gameEvents.emit(
      GameEvents.UNLOCK_PLAYER
    );
  }


  /* =========================
     ABRIR LECCIÓN
     ========================= */

  private readonly handlerOpenLesson = (
    lesson: LessonData
  ): void => {

    /*
     * Primero preguntamos al sistema
     * de progreso si esta actividad
     * puede abrirse.
     */
    if (
      !this.progress.isLessonAvailable(
        lesson.lessonId
      )
    ) {

      const currentLesson =
        this.progress.currentLesson();


      const message =
        currentLesson
          ? `Completa primero: ${currentLesson.name}.`
          : 'Esta actividad todavía no está disponible.';


      this.showBlockedLessonNotice(
        message
      );


      /*
       * IMPORTANTE:
       *
       * No bloqueamos al jugador.
       * La lección simplemente no se abre.
       */
      return;
    }


    /*
     * Si anteriormente apareció un aviso,
     * lo quitamos.
     */
    this.clearBlockedLessonNotice();


    /*
     * La actividad sí está disponible.
     */
    this.lessonActive.set(
      lesson
    );


    gameEvents.emit(
      GameEvents.LOCK_PLAYER
    );
  };


  /* =========================
     ABRIR DIÁLOGO
     ========================= */

  private readonly handlerOpenDialogue = (
    request: DialogueRequest
  ): void => {

    const dialogue =
      DIALOGUES[
        request.dialogueId
      ];


    if (!dialogue) {

      console.log(
        'No existe ningún diálogo:',
        request.dialogueId
      );

      return;
    }


    this.activeDialogue.set(
      dialogue
    );


    gameEvents.emit(
      GameEvents.LOCK_PLAYER
    );
  };


  /* =========================
     MOSTRAR BLOQUEO
     ========================= */

  private showBlockedLessonNotice(
    message: string
  ): void {

    /*
     * Si el jugador vuelve a pulsar E,
     * reiniciamos el tiempo del aviso.
     */
    if (
      this.blockedNoticeTimer
    ) {

      clearTimeout(
        this.blockedNoticeTimer
      );
    }


    this.blockedLessonMessage.set(
      message
    );


    this.blockedNoticeTimer =
      setTimeout(
        () => {

          this.blockedLessonMessage.set(
            null
          );

          this.blockedNoticeTimer =
            undefined;

        },
        3000
      );
  }


  /* =========================
     LIMPIAR BLOQUEO
     ========================= */

  private clearBlockedLessonNotice(): void {

    if (
      this.blockedNoticeTimer
    ) {

      clearTimeout(
        this.blockedNoticeTimer
      );


      this.blockedNoticeTimer =
        undefined;
    }


    this.blockedLessonMessage.set(
      null
    );
  }


  /* =========================
     PHASER
     ========================= */

  ngAfterViewInit(): void {

    gameEvents.on(
      GameEvents.OPEN_LESSON,
      this.handlerOpenLesson
    );


    gameEvents.on(
      GameEvents.OPEN_DIALOGUE,
      this.handlerOpenDialogue
    );


    this.game =
      new Phaser.Game(
        gameConfig
      );
  }


  /* =========================
     DESTRUIR
     ========================= */

  ngOnDestroy(): void {

    gameEvents.off(
      GameEvents.OPEN_LESSON,
      this.handlerOpenLesson
    );


    gameEvents.off(
      GameEvents.OPEN_DIALOGUE,
      this.handlerOpenDialogue
    );


    if (
      this.blockedNoticeTimer
    ) {

      clearTimeout(
        this.blockedNoticeTimer
      );
    }


    this.game?.destroy(
      true
    );
  }

}