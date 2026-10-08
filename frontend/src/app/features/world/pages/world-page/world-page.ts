import {
  AfterViewInit,
  Component,
  DestroyRef,
  OnDestroy,
  computed,
  effect,
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
import { AuthService } from '../../../../core/auth/auth.service';
import { WorldHelp } from '../../components/world-help/world-help';
import { OpenPitReport } from '../../components/open-pit-report/open-pit-report';
import { WorldMinimap } from '../../components/world-minimap/world-minimap';
import { hasSeenWorldWelcome, rememberWorldWelcome } from '../../components/world-help/world-welcome.storage';

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
  type SceneLoadingSnapshot,
  type MinimapMapData,
  type MinimapPlayerPosition,
  type IntroGuidanceSnapshot
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
import { hasCompletedOpenPitIntro, rememberOpenPitIntro } from '../../progress/open-pit-intro.storage';
import { OPEN_PIT_INTRO } from '../../lessons/data/open-pit-intro.data';
import { OPEN_PIT_CLOSING } from '../../lessons/data/open-pit-closing.data';
import { hasAllOpenPitLessons, hasDeliveredOpenPitReport, rememberOpenPitReport } from '../../progress/open-pit-closure.storage';

import {
  ZoneProgress
} from '../../components/zone-progress/zone-progress';

import {
  AccountMenu
} from '../../../../shared/ui/account-menu/account-menu';
import { getWorldProgressPanel, type SceneZoneMetadata } from './world-progress-panel';


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
    WorldHelp,
    OpenPitReport,
    WorldMinimap,
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
  private readonly auth = inject(AuthService);


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

  readonly helpOpen = signal(false);
  readonly minimap = signal<MinimapMapData | null>(null);
  readonly minimapPlayer = signal<MinimapPlayerPosition | null>(null);
  readonly minimapAvailable = computed(() => this.activeSceneKey() === 'OpenPitScene'
    && this.minimap()?.sceneKey === 'OpenPitScene' && !this.loadingScene());
  readonly firstWelcome = signal(false);
  readonly helpTouchControls = signal(false);
  readonly helpReturnFocus = signal<HTMLElement | null>(null);
  readonly reportOpen = signal(false);
  private readonly introGuidance = signal<IntroGuidanceSnapshot | null>(null);
  private reportOwnerId: string | null = null;
  private helpOwnerId: string | null = null;
  private readonly dismissedWelcomeOwners = new Set<string>();
  private readonly completedIntroOwners = new Set<string>();
  private readonly deliveredReportOwners = signal<ReadonlySet<string>>(new Set());
  private closingDialogueOwnerId: string | null = null;

  readonly openPitReportReady = computed(() => hasAllOpenPitLessons(
    this.progress.zoneProgress().find(zone => zone.id === 'zone-01')?.lessons
      .filter(lesson => lesson.status === 'completed').map(lesson => lesson.lessonId) ?? [],
  ));
  readonly openPitReportDelivered = computed(() => {
    const owner = this.auth.user()?.id;
    return !!owner && (this.deliveredReportOwners().has(owner) || hasDeliveredOpenPitReport(owner));
  });
  readonly returnToSupervisor = computed(() => this.openPitReportReady() && !this.openPitReportDelivered());

  readonly reportAvailable = computed(() => this.activeSceneKey() === 'OpenPitScene'
    && this.progressPanel().zone?.id === 'zone-01');
  readonly reportConfirmedLessonIds = computed(() => {
    if (!this.reportOpen() || this.auth.user()?.id !== this.reportOwnerId) return [];
    return this.progress.zoneProgress().find(zone => zone.id === 'zone-01')?.lessons
      .filter(lesson => lesson.status === 'completed').map(lesson => lesson.lessonId) ?? [];
  });
  readonly reportPendingLessonIds = computed(() => this.reportOpen() && this.auth.user()?.id === this.reportOwnerId
    ? this.progress.pendingLessonIds() : []);

  readonly helpNextStep = computed(() => {
    switch (this.sceneLoading().sceneKey) {
      case 'HubScene':
        return 'Acércate al acceso de Minería de Superficie. Allí podrás entrar a Tajo Abierto / Open Pit.';
      case 'SurfaceSelectionScene':
        return 'Acércate al acceso de Tajo Abierto / Open Pit para entrar al escenario.';
      case 'OpenPitScene': {
        if (this.introGuidance()?.active) return 'Habla con el supervisor para empezar. Sigue la señal «Supervisor».';
        const zone = this.progressPanel().zone;
        if (zone) return this.progressPanel().objective;
        return 'Para empezar C1, ve al fondo del tajo y busca al encargado del carguío. Sigue la señal C1.';
      }
      default:
        return 'Las lecciones disponibles están en Open Pit. Vuelve al HUB y entra por Minería de Superficie.';
    }
  });

  constructor() {
    effect(() => {
      const userId = this.auth.user()?.id ?? null;
      if (this.helpOpen() && userId !== this.helpOwnerId) this.closeWorldHelp();
      if (this.reportOpen() && userId !== this.reportOwnerId) this.closeReport();
      if (this.activeDialogue()?.id === OPEN_PIT_CLOSING.id && userId !== this.closingDialogueOwnerId) this.closeDialogue();
      if (!userId || this.loadingScene() || this.helpOpen() || this.reportOpen() || this.lessonActive() || this.activeDialogue()) return;
      if (!this.dismissedWelcomeOwners.has(userId) && !hasSeenWorldWelcome(userId)) {
        this.openWorldHelp(true);
      }
    });
  }

  openWorldHelp(firstVisit = false): void {
    const owner = this.auth.user();
    if (!owner || this.loadingScene() || this.helpOpen() || this.reportOpen() || this.lessonActive() || this.activeDialogue()) return;
    this.helpOwnerId = owner.id;
    this.firstWelcome.set(firstVisit);
    const focused = document.activeElement;
    this.helpReturnFocus.set(focused instanceof HTMLElement && focused.matches('.account-menu__trigger') ? focused : null);
    const hasTouch = this.game?.device?.input.touch || navigator.maxTouchPoints > 0;
    this.helpTouchControls.set(!!hasTouch && !!window.matchMedia?.('(pointer: coarse)').matches);
    this.helpOpen.set(true);
    gameEvents.emit(GameEvents.LOCK_PLAYER);
  }

  closeWorldHelp(): void {
    if (!this.helpOpen()) return;
    if (this.firstWelcome() && this.helpOwnerId && this.auth.user()?.id === this.helpOwnerId) {
      // Avoid another popup in this visit even if browser storage is blocked.
      this.dismissedWelcomeOwners.add(this.helpOwnerId);
      rememberWorldWelcome(this.helpOwnerId);
    }
    this.helpOpen.set(false);
    this.helpOwnerId = null;
    if (!this.lessonActive() && !this.activeDialogue() && !this.reportOpen()) gameEvents.emit(GameEvents.UNLOCK_PLAYER);
  }

  openReport(): void {
    const owner = this.auth.user();
    if (!owner || !this.reportAvailable() || this.loadingScene() || this.reportOpen()
      || this.helpOpen() || this.lessonActive() || this.activeDialogue()) return;
    this.reportOwnerId = owner.id;
    this.reportOpen.set(true);
    gameEvents.emit(GameEvents.LOCK_PLAYER);
  }

  closeReport(): void {
    if (!this.reportOpen()) return;
    this.reportOpen.set(false);
    this.reportOwnerId = null;
    if (!this.lessonActive() && !this.activeDialogue() && !this.helpOpen()) gameEvents.emit(GameEvents.UNLOCK_PLAYER);
  }

  reloadWorld(): void {
    window.location.reload();
  }

  private readonly handlerSceneLoading = (snapshot: SceneLoadingSnapshot): void => {
    if (snapshot.phase !== 'ready') {
      this.minimap.set(null);
      this.minimapPlayer.set(null);
    }
    this.sceneLoading.set({
      ...snapshot,
      progress: Number.isFinite(snapshot.progress)
        ? Math.min(1, Math.max(0, snapshot.progress)) : 0,
    });
  };

  private readonly handlerMinimapMap = (map: MinimapMapData | null): void => {
    this.minimap.set(map);
    this.minimapPlayer.set(null);
  };

  private readonly handlerMinimapPlayer = (player: MinimapPlayerPosition): void => {
    if (player.sceneKey === this.minimap()?.sceneKey && Number.isFinite(player.x + player.y + player.heading)) {
      this.minimapPlayer.set(player);
    }
  };


  /* =========================
     ESCENARIO ACTUAL
     ========================= */

  private readonly activeSceneKey =
    signal('HubScene');


  readonly progressPanel = computed(() => {
    const sceneKey = this.activeSceneKey();
    const intro = this.introGuidance();
    return getWorldProgressPanel({
      sceneKey,
      sceneZone: SCENE_ZONES[sceneKey] ?? null,
      zones: this.progress.zoneProgress(),
      introActive: intro?.sceneKey === sceneKey && intro.active,
      reportReady: this.openPitReportReady(),
      returnToSupervisor: sceneKey === 'OpenPitScene' && this.returnToSupervisor(),
    });
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
    this.closingDialogueOwnerId = null;


    gameEvents.emit(
      GameEvents.UNLOCK_PLAYER
    );
  }

  completeDialogue(): void {
    const dialogue = this.activeDialogue();
    if (!dialogue) return;
    const sceneKey = this.activeSceneKey();
    const userId = this.auth.user()?.id;
    if (sceneKey === 'OpenPitScene' && dialogue.id === OPEN_PIT_INTRO.id && userId) {
      // Keep it dismissed during this visit even when browser storage is blocked.
      this.completedIntroOwners.add(userId);
      rememberOpenPitIntro(userId);
    }
    const delivered = sceneKey === 'OpenPitScene' && dialogue.id === OPEN_PIT_CLOSING.id
      && !!userId && userId === this.closingDialogueOwnerId && this.openPitReportReady();
    if (delivered) {
      this.deliveredReportOwners.update(owners => new Set([...owners, userId]));
      rememberOpenPitReport(userId);
    }
    this.closeDialogue();
    if (delivered) this.publishLessonProgress();
    gameEvents.emit(GameEvents.DIALOGUE_COMPLETED, { dialogueId: dialogue.id, sceneKey });
  }


  /* =========================
     ABRIR LECCIÓN
     ========================= */

  private readonly handlerOpenLesson = (
    lesson: OpenLessonRequest
  ): void => {

    if (this.helpOpen() || this.reportOpen()) return;

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

    if (this.helpOpen() || this.reportOpen()) return;

    if (this.activeSceneKey() === 'OpenPitScene' && request.dialogueId === OPEN_PIT_INTRO.id
      && !this.openPitReportReady() && hasAllOpenPitLessons([
        ...this.progress.zoneProgress().find(zone => zone.id === 'zone-01')?.lessons
          .filter(lesson => lesson.status === 'completed').map(lesson => lesson.lessonId) ?? [],
        ...this.progress.pendingLessonIds(),
      ])) {
      this.showBlockedLessonNotice('Falta guardar la última clase antes de entregar el informe. Usa Reintentar.');
      return;
    }

    const dialogueId = this.activeSceneKey() === 'OpenPitScene'
      && request.dialogueId === OPEN_PIT_INTRO.id && this.openPitReportReady()
      ? OPEN_PIT_CLOSING.id : request.dialogueId;
    if (dialogueId === OPEN_PIT_CLOSING.id && (!this.openPitReportReady() || this.activeSceneKey() !== 'OpenPitScene')) {
      this.showBlockedLessonNotice('Completa y guarda las clases antes de entregar el informe.');
      return;
    }
    const dialogue = DIALOGUES[dialogueId];


    if (!dialogue) {

      console.warn(
        'No existe ningún diálogo:',
        request.dialogueId
      );

      return;
    }


    this.closingDialogueOwnerId = dialogueId === OPEN_PIT_CLOSING.id ? this.auth.user()?.id ?? null : null;
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

    if (sceneKey !== this.minimap()?.sceneKey) {
      this.minimap.set(null);
      this.minimapPlayer.set(null);
    }


    this.publishLessonProgress();
    if (this.helpOpen() || this.reportOpen()) gameEvents.emit(GameEvents.LOCK_PLAYER);
  };

  private readonly handlerIntroGuidance = (guidance: IntroGuidanceSnapshot): void => {
    const userId = this.auth.user()?.id;
    if (guidance.sceneKey === 'OpenPitScene' && guidance.active && userId
      && (this.openPitReportReady() || this.completedIntroOwners.has(userId) || hasCompletedOpenPitIntro(userId))) {
      this.introGuidance.set({ ...guidance, active: false });
      gameEvents.emit(GameEvents.INTRO_GUIDANCE_DISMISSED, guidance.sceneKey);
      return;
    }
    this.introGuidance.set(guidance);
  };


  /* =========================
     SINCRONIZAR PROGRESO
     CON PHASER
     ========================= */

  private publishLessonProgress(): void {

    const zones =
      this.progress.zoneProgress();


    const snapshot: LessonProgressSnapshot = {
      openPitReportDelivered: this.openPitReportDelivered(),
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
    gameEvents.on(GameEvents.MINIMAP_MAP_CHANGED, this.handlerMinimapMap);
    gameEvents.on(GameEvents.MINIMAP_PLAYER_CHANGED, this.handlerMinimapPlayer);
    gameEvents.on(GameEvents.INTRO_GUIDANCE_CHANGED, this.handlerIntroGuidance);

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
    gameEvents.off(GameEvents.MINIMAP_MAP_CHANGED, this.handlerMinimapMap);
    gameEvents.off(GameEvents.MINIMAP_PLAYER_CHANGED, this.handlerMinimapPlayer);
    gameEvents.off(GameEvents.INTRO_GUIDANCE_CHANGED, this.handlerIntroGuidance);

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
