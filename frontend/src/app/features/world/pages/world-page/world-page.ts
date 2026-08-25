import {
  AfterViewInit,
  Component,
  OnDestroy,
  computed,
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


type SceneZoneMetadata = {
  zoneId: string;
  name: string;
};


const SCENE_ZONES: Record<
  string,
  SceneZoneMetadata
> = {
  Zone01Scene: {
    zoneId: 'zone-01',
    name: 'Zona 1'
  },
  Zone02Scene: {
    zoneId: 'zone-02',
    name: 'Zona 2'
  },
  Zone03Scene: {
    zoneId: 'zone-03',
    name: 'Zona 3'
  },
  Zone04Scene: {
    zoneId: 'zone-04',
    name: 'Zona 4'
  }
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
     ESCENARIO ACTUAL
     ========================= */

  private readonly activeSceneKey =
    signal('HubScene');


  readonly progressPanel =
    computed(() => {

      const sceneKey =
        this.activeSceneKey();


      if (sceneKey === 'HubScene') {
        return {
          name: 'HUB',
          topic: 'Centro de rutas',
          objective:
            'Elige una zona para comenzar tu recorrido.',
          zone: null
        };
      }


      const sceneZone =
        SCENE_ZONES[sceneKey];


      if (!sceneZone) {
        return {
          name: 'Mundo',
          topic: 'Exploración',
          objective:
            'Continúa explorando el escenario.',
          zone: null
        };
      }


      const zone =
        this.progress.zoneProgress()
          .find(
            item =>
              item.id ===
              sceneZone.zoneId
          ) ?? null;


      if (!zone) {
        return {
          name: sceneZone.name,
          topic: 'Próximamente',
          objective:
            'Esta zona todavía no tiene actividades configuradas.',
          zone: null
        };
      }


      const nextLesson =
        zone.lessons.find(
          lesson =>
            lesson.status !==
            'completed'
        );


      return {
        name: zone.name,
        topic: zone.topic,
        objective:
          nextLesson?.objective ??
          'Has completado todas las actividades de esta zona.',
        zone
      };
    });


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
     CAMBIO DE ESCENARIO
     ========================= */

  private readonly handlerSceneChanged = (
    sceneKey: string
  ): void => {

    this.activeSceneKey.set(
      sceneKey
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


    gameEvents.on(
      GameEvents.SCENE_CHANGED,
      this.handlerSceneChanged
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


    gameEvents.off(
      GameEvents.SCENE_CHANGED,
      this.handlerSceneChanged
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
