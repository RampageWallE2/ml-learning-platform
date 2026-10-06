import {
  AfterViewInit,
  Component,
  DestroyRef,
  OnDestroy,
  computed,
  inject,
  signal
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import {
  finalize
} from 'rxjs';

import Phaser from 'phaser';

import {
  createGameConfig
} from '../../game/config/game.config';

import { BaseWorldScene } from '../../../../core/base-world.scene';

import {
  clearWorldSession,
  loadWorldSession,
} from '../../../../core/world-session/world-session.storage';

import {
  WorldSessionLifecycle,
} from '../../../../core/world-session/world-session.lifecycle';

import {
  gameEvents,
  GameEvents,
  LessonProgressSnapshot,
  OpenLessonRequest,
  type SceneLoadingSnapshot
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
import { LessonDraftService } from '../../progress/lesson-draft.service';
import { isDraftLessonId } from '../../progress/lesson-draft.storage';

import {
  ZoneProgress
} from '../../components/zone-progress/zone-progress';

import {
  AccountMenu
} from '../../../../shared/ui/account-menu/account-menu';


type SceneZoneMetadata = {
  zoneId: string;
  name: string;
};


const SCENE_ZONES: Record<
  string,
  SceneZoneMetadata
> = {
  OpenPitScene: {
    zoneId: 'zone-01',
    name: 'Open Pit'
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
    NgTemplateOutlet,
    LessonRunner,
    Dialogue,
    InteractionPanel,
    ZoneProgress,
    AccountMenu
  ],

  templateUrl: './world-page.html',
  styleUrl: './world-page.scss',
})
export class WorldPage
  implements AfterViewInit, OnDestroy {

  readonly progress =
    inject(ProgressService);

  private readonly drafts = inject(LessonDraftService);


  private readonly destroyRef =
    inject(DestroyRef);


  private game?: Phaser.Game;


  private worldSessionLifecycle?:
    WorldSessionLifecycle;

  private readonly restoredSession = loadWorldSession();

  readonly sceneLoading = signal<SceneLoadingSnapshot>({
    sceneKey: this.restoredSession?.sceneKey ?? 'HubScene', phase: 'loading', progress: 0,
  });

  readonly loadingScene = computed(() => this.sceneLoading().phase !== 'ready');
  readonly sceneLoadingPercentage = computed(() => Math.round(this.sceneLoading().progress * 100));
  readonly loadingSceneName = computed(() => {
    const key = this.sceneLoading().sceneKey;
    if (key === 'HubScene') return 'HUB';
    if (key === 'SurfaceSelectionScene') return 'Minería de Superficie';
    if (key === 'QuarriesScene') return 'Canteras';
    return SCENE_ZONES[key]?.name ?? 'escenario';
  });

  reloadWorld(): void {
    window.location.reload();
  }

  private readonly handlerSceneLoading = (snapshot: SceneLoadingSnapshot): void => {
    this.sceneLoading.set({
      ...snapshot,
      progress: Number.isFinite(snapshot.progress)
        ? Math.min(1, Math.max(0, snapshot.progress)) : 0,
    });
  };


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
          topic: 'Selección principal',
          objective:
            'Elige un ámbito para comenzar tu recorrido.',
          zone: null
        };
      }


      if (sceneKey === 'SurfaceSelectionScene') {
        return {
          name: 'Minería de Superficie',
          topic: 'Selección de modalidad',
          objective:
            'Elige Tajo Abierto / Open Pit para entrar al escenario.',
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
    signal<OpenLessonRequest | null>(
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
     SINCRONIZACIÓN DE PROGRESO
     ========================= */

  readonly loadingProgress =
    signal(false);


  readonly savingLesson =
    signal(false);


  readonly progressSyncError =
    signal<string | null>(
      null
    );


  readonly lessonSaved = signal(false);

  readonly pendingSaveMessage = computed(() => {
    if (!this.progress.pendingLessonIds().length) return null;
    return this.progress.pendingStorageAvailable()
      ? 'Terminaste la clase. Falta guardarla en tu cuenta. Puedes cerrar la clase; no necesitas repetirla.'
      : 'Terminaste la clase, pero este navegador no pudo conservar el pendiente. No recargues ni cierres esta página antes de reintentar.';
  });

  private readonly progressBodyRefused = signal(false);
  readonly progressSyncMessage = computed(() => {
    const pending = this.pendingSaveMessage();
    // Never hide the warning that closing/reloading may lose an unpersisted result.
    if (pending && !this.progress.pendingStorageAvailable()) return pending;
    return this.progressBodyRefused() && this.progressSyncError()
      ? this.progressSyncError()
      : pending ?? this.progressSyncError();
  });
  readonly progressSyncBusy = computed(() =>
    this.loadingProgress() || this.savingLesson() || this.progress.syncingPending());
  readonly hasProgressNotice = computed(() =>
    !!this.progressSyncMessage() || this.savingLesson() || this.progress.syncingPending() || this.lessonSaved());


  /* =========================
     COMPLETAR LECCIÓN
     ========================= */

  completeLesson(
    lessonId: string
  ): void {

    if (
      this.savingLesson()
    ) {
      return;
    }


    this.lessonSaved.set(false);


    this.progressSyncError.set(
      null
    );


    this.savingLesson.set(
      true
    );


    const draftOwner = this.drafts.currentUser();
    this.progress.completeLesson(
      lessonId
    ).pipe(
      takeUntilDestroyed(
        this.destroyRef
      ),
      finalize(
        () =>
          this.savingLesson.set(
            false
          )
      )
    ).subscribe({
      next: () => {

        this.drafts.clearConfirmed(lessonId, draftOwner);

        this.lessonSaved.set(true);


        this.savingLesson.set(
          false
        );


        this.publishLessonProgress();


        this.closeLesson();
      },
      error: (error: unknown) => {

        this.recordProgressError(error,
          'No se pudo guardar tu progreso. Comprueba la conexión e inténtalo nuevamente.'
        );
      }
    });
  }


  retryProgressSync(): void {
    if (this.progressSyncBusy()) return;
    // Read the server first: a lost response may hide a successful save.
    this.loadProgress();
  }


  /* =========================
     CERRAR LECCIÓN
     ========================= */

  closeLesson(): void {

    if (
      this.savingLesson()
    ) {
      return;
    }


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
    lesson: OpenLessonRequest
  ): void => {

    // The result is already recorded locally. Retry it instead of replaying
    // the activity, while still waiting for server confirmation to unlock.
    if (this.progress.pendingLessonIds().includes(lesson.lessonId)) {
      this.retryProgressSync();
      return;
    }

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

    this.lessonSaved.set(false);


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

      console.warn(
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


    this.publishLessonProgress();
  };


  /* =========================
     SINCRONIZAR PROGRESO
     CON PHASER
     ========================= */

  private publishLessonProgress(): void {

    const zones =
      this.progress.zoneProgress();


    const snapshot: LessonProgressSnapshot = {
      currentLessonId:
        this.progress.currentLesson()
          ?.lessonId ?? null,
      completedLessonIds:
        zones.flatMap(
          zone =>
            zone.lessons
              .filter(
                lesson =>
                  lesson.status ===
                  'completed'
              )
              .map(
                lesson =>
                  lesson.lessonId
              )
        ),
    };


    gameEvents.emit(
      GameEvents.LESSON_PROGRESS_CHANGED,
      snapshot
    );
  }


  /* =========================
     CARGAR PROGRESO GUARDADO
     ========================= */

  private loadProgress(): void {

    if (
      this.loadingProgress()
    ) {
      return;
    }


    const pendingBeforeLoad = [...this.progress.pendingLessonIds()];
    const draftOwner = this.drafts.currentUser();
    this.lessonSaved.set(false);


    this.progressSyncError.set(
      null
    );


    this.loadingProgress.set(
      true
    );


    this.progress.loadProgress().pipe(
      takeUntilDestroyed(
        this.destroyRef
      ),
      finalize(
        () =>
          this.loadingProgress.set(
            false
          )
      )
    ).subscribe({
      next: () => {
        // Reconcile this attempt's pending completion, not an older confirmed
        // result: a student may be halfway through replaying a completed lesson.
        for (const lessonId of pendingBeforeLoad) {
          if (isDraftLessonId(lessonId) && this.progress.isLessonCompleted(lessonId)) {
            this.drafts.clearConfirmed(lessonId, draftOwner);
          }
        }
        this.publishLessonProgress();
        if (pendingBeforeLoad.length && !this.progress.pendingLessonIds().length) {
          this.lessonSaved.set(true);
          const activeId = this.lessonActive()?.lessonId;
          if (activeId && pendingBeforeLoad.includes(activeId) && this.progress.isLessonCompleted(activeId)) {
            this.closeLesson();
          }
        }
      },
      error: (error: unknown) => {
        this.recordProgressError(error,
          'No se pudo recuperar tu progreso guardado. Puedes volver a intentarlo.'
        );
      }
    });
  }


  /* =========================
     MOSTRAR BLOQUEO
     ========================= */

  private recordProgressError(error: unknown, fallback: string): void {
    const bodyRefused = error instanceof HttpErrorResponse && error.status === 413;
    const sizeMessage = this.progress.pendingLessonIds().length
      ? 'El envío es demasiado grande. No se pudo guardar; tu avance sigue pendiente.'
      : 'El envío es demasiado grande. No se pudo completar la solicitud.';
    this.progressBodyRefused.set(bodyRefused);
    this.progressSyncError.set(bodyRefused
      ? sizeMessage
      : fallback);
  }

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
    gameEvents.on(GameEvents.SCENE_LOADING, this.handlerSceneLoading);

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


    const restoredSession =
      this.restoredSession;


    clearWorldSession();


    this.game =
      new Phaser.Game(
        createGameConfig(
          restoredSession
        )
      );


    this.worldSessionLifecycle =
      new WorldSessionLifecycle(
        this.captureWorldSession
      );


    this.worldSessionLifecycle.start();


    this.loadProgress();
  }


  /* =========================
     DESTRUIR
     ========================= */

  ngOnDestroy(): void {
    gameEvents.off(GameEvents.SCENE_LOADING, this.handlerSceneLoading);

    this.worldSessionLifecycle?.stop();

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


  private readonly captureWorldSession = () => {

    const activeWorldScene =
      this.game?.scene
        .getScenes(true)
        .find(
          scene =>
            scene instanceof
            BaseWorldScene
        );


    const snapshot =
      activeWorldScene
        ?.getSessionSnapshot();


    return snapshot ?? null;
  };

}
