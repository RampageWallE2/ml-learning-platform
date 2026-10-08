import Phaser from 'phaser';

import {
  gameEvents,
  GameEvents,
  LessonProgressSnapshot,
  OpenLessonRequest,
  type DialogueCompletedRequest,
} from '../../features/world/game/events/game-events';
import { OPEN_PIT_INTRO } from '../../features/world/lessons/data/open-pit-intro.data';
import { OPEN_PIT_CLOSING } from '../../features/world/lessons/data/open-pit-closing.data';
import { hasAllOpenPitLessons } from '../../features/world/progress/open-pit-closure.storage';

import {
  getObjectLayerOrThrow,
  getTiledStringProperty,
  getTiledRectangle
} from '../tiled/tiled.utils';

import {
  getLessonIndicatorCopy,
  getLessonStatus,
} from './lesson-indicator';

import { LessonGuide } from './lesson-guide';
import { LessonProximityPrompt } from './lesson-proximity-prompt';
import { usesTouchControls } from '../input/touch-controls';
import { isWorldSceneInPreparation } from '../world-session/world-scene-availability';


type InteractionType =
  | 'lesson'
  | 'dialogue'
  | 'transition';


const TRANSITION_DESTINATIONS: Readonly<Record<string, string>> = {
  HubScene: 'HUB',
  SurfaceSelectionScene: 'Minería de Superficie',
  OpenPitScene: 'Tajo Abierto / Open Pit',
  QuarriesScene: 'Canteras',
  Zone02Scene: 'Zona 2',
  Zone03Scene: 'Zona 3',
  Zone04Scene: 'Zona 4',
};

type SceneTransitionHandler = (
  targetScene: string,
  targetSpawn?: string
) => void;

type LessonIndicator = {
  lessonId: string;
  text: Phaser.GameObjects.Text;
  baseY: number;
  animation?: Phaser.Tweens.Tween;
};


export class InteractionManager {

  private readonly interactionZones:
    Phaser.GameObjects.Zone[] = [];


  private readonly lessonIndicators:
    LessonIndicator[] = [];


  private lessonProgress: LessonProgressSnapshot = {
    currentLessonId: null,
    completedLessonIds: [],
  };


  private currentInteraction:
    Phaser.GameObjects.Zone | null = null;


  private readonly interactionText:
    Phaser.GameObjects.Text;

  private readonly lessonGuide: LessonGuide | null;
  private readonly lessonPrompt: LessonProximityPrompt;
  private readonly touch: boolean;
  private introZone: Phaser.GameObjects.Zone | null = null;
  private introPrompt: LessonProximityPrompt | null = null;
  private introPending = false;

  private get closingReady(): boolean {
    return hasAllOpenPitLessons(this.lessonProgress.completedLessonIds);
  }


  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: Phaser.Tilemaps.Tilemap,
    private readonly player: Phaser.Physics.Arcade.Sprite,
    private readonly requestSceneTransition:
      SceneTransitionHandler
  ) {

    this.interactionText =
      this.createInteractionText();

    this.lessonPrompt = new LessonProximityPrompt(this.scene);
    this.touch = usesTouchControls(this.scene);


    this.createInteractions();

    this.lessonGuide = this.scene.scene.key === 'OpenPitScene'
      ? new LessonGuide(this.scene) : null;

    // The HUD can immediately dismiss guidance already completed by this account.
    gameEvents.on(GameEvents.INTRO_GUIDANCE_DISMISSED, this.handleIntroGuidanceDismissed);
    this.initializeIntroGuidance();
    gameEvents.on(GameEvents.DIALOGUE_COMPLETED, this.handleDialogueCompleted);


    gameEvents.on(
      GameEvents.LESSON_PROGRESS_CHANGED,
      this.handleLessonProgressChanged
    );
  }


  /* =========================
     API PÚBLICA
     ========================= */

  /**
   * Actualiza la interacción cercana.
   *
   * Retorna true cuando existe
   * una interacción disponible.
   */
  update(
    interactRequested: boolean,
    playerLocked: boolean
  ): boolean {

    /* =========================
       BLOQUEADO
       ========================= */

    if (playerLocked) {

      this.lessonGuide?.hide();
      this.introPrompt?.hide();

      this.clearCurrentInteraction();

      return false;
    }


    /* =========================
       BUSCAR INTERACCIÓN
       ========================= */

    this.findCurrentInteraction();

    this.updateIntroIndicator();


    const nearby = this.currentInteraction !== null;
    const available = nearby && !this.isTransitionInPreparation(this.currentInteraction);

    // Do not compete with a nearby interaction prompt or an open activity.
    this.lessonGuide?.update(this.player, this.scene.cameras.main, nearby);


    /* =========================
       EJECUTAR
       ========================= */

    if (
      available &&
      interactRequested
    ) {

      this.triggerCurrentInteraction();
    }


    return available;
  }


  destroy(): void {

    gameEvents.off(GameEvents.DIALOGUE_COMPLETED, this.handleDialogueCompleted);
    gameEvents.off(GameEvents.INTRO_GUIDANCE_DISMISSED, this.handleIntroGuidanceDismissed);
    this.introPrompt?.destroy();
    if (this.introZone) this.publishIntroGuidance(false);

    gameEvents.off(
      GameEvents.LESSON_PROGRESS_CHANGED,
      this.handleLessonProgressChanged
    );

    this.interactionText.destroy();
    this.lessonPrompt.destroy();

    this.lessonGuide?.destroy();


    for (
      const indicator
      of this.lessonIndicators
    ) {

      indicator.animation?.stop();

      indicator.text.destroy();
    }


    this.lessonIndicators.length = 0;


    for (
      const zone
      of this.interactionZones
    ) {

      zone.destroy();
    }


    this.interactionZones.length = 0;

    this.currentInteraction = null;
  }


  /* =========================
     CREACIÓN
     ========================= */

  private createInteractions(): void {

    const interactionLayer =
      getObjectLayerOrThrow(
        this.map,
        'Interactions'
      );


    for (
      const object
      of interactionLayer.objects
    ) {

      const rectangle =
        getTiledRectangle(
          object
        );


      if (!rectangle) {
        continue;
      }

      const interactionType = getTiledStringProperty(object, 'interactionType');
      // Tiled can contain draft objects; do not offer an action we cannot execute.
      if (interactionType !== 'lesson' && interactionType !== 'dialogue' && interactionType !== 'transition') {
        continue;
      }

      const zone =
        this.scene.add.zone(
          rectangle.centerX,
          rectangle.centerY,
          rectangle.width,
          rectangle.height
        );


      /* =========================
         DATOS GENERALES
         ========================= */

      zone.setData(
        'interactionName',
        object.name ?? ''
      );


      zone.setData(
        'interactionType',
        interactionType
      );


      /* =========================
         LECCIÓN
         ========================= */

      const lessonId =
        getTiledStringProperty(
          object,
          'lessonId'
        );


      zone.setData(
        'lessonId',
        lessonId
      );


      /* =========================
         DIÁLOGO
         ========================= */

      zone.setData(
        'npcId',
        getTiledStringProperty(
          object,
          'npcId'
        )
      );


      zone.setData(
        'dialogueId',
        getTiledStringProperty(
          object,
          'dialogueId'
        )
      );


      /* =========================
         TRANSICIÓN
         ========================= */

      zone.setData(
        'targetScene',
        getTiledStringProperty(
          object,
          'targetScene'
        )
      );


      zone.setData(
        'targetSpawn',
        getTiledStringProperty(
          object,
          'targetSpawn'
        )
      );


      this.scene.physics.add.existing(
        zone,
        true
      );


      this.interactionZones.push(
        zone
      );


      if (
        interactionType === 'lesson' &&
        lessonId
      ) {

        const indicator =
          this.createLessonIndicator(
            zone,
            lessonId
          );


        zone.setData(
          'lessonIndicator',
          indicator
        );
      }
    }
  }


  /* =========================
     DETECTAR INTERACCIÓN
     ========================= */

  private findCurrentInteraction():
    void {

    this.clearCurrentInteraction();


    for (
      const zone
      of this.interactionZones
    ) {

      const overlapping =
        this.scene.physics.overlap(
          this.player,
          zone
        );


      if (!overlapping) {
        continue;
      }


      this.currentInteraction =
        zone;


      this.getLessonIndicator(
        zone
      )?.text.setVisible(false);


      this.showInteractionText();


      break;
    }
  }


  private clearCurrentInteraction():
    void {

    if (this.currentInteraction) {

      this.getLessonIndicator(
        this.currentInteraction
      )?.text.setVisible(true);
    }

    this.currentInteraction =
      null;


    this.interactionText.setVisible(
      false
    );
    this.lessonPrompt.hide();
    this.introPrompt?.hide();
  }


  /* =========================
     UI
     ========================= */

  private initializeIntroGuidance(): void {
    if (this.scene.scene.key !== 'OpenPitScene') return;
    this.introZone = this.interactionZones.find(zone => zone.getData('dialogueId') === OPEN_PIT_INTRO.id) ?? null;
    if (!this.introZone) return;

    // A recovered position is not evidence that the account finished the intro.
    // The next server snapshot decides whether guidance remains active.
    this.introPending = true;

    this.introPrompt = new LessonProximityPrompt(this.scene);
    this.publishIntroGuidance(this.introPending);
    this.updateGuideTarget();
  }

  private updateIntroIndicator(): void {
    if (!this.introZone || !this.introPrompt || this.currentInteraction === this.introZone) return;
    const camera = this.scene.cameras.main;
    const view = camera.worldView;
    const zone = this.introZone;
    const onScreen = zone.x >= view.left && zone.x <= view.right && zone.y >= view.top && zone.y <= view.bottom;
    if (this.closingReady && !this.lessonProgress.openPitReportDelivered && onScreen && !this.currentInteraction) {
      this.introPrompt.showClosing(zone, camera, this.touch, false);
    } else if (this.introPending && onScreen && !this.currentInteraction) {
      this.introPrompt.showIntro(zone, camera, this.touch, false);
    } else this.introPrompt.hide();
  }

  private publishIntroGuidance(active: boolean): void {
    gameEvents.emit(GameEvents.INTRO_GUIDANCE_CHANGED, { sceneKey: this.scene.scene.key, active });
  }

  private readonly handleDialogueCompleted = (request: DialogueCompletedRequest): void => {
    if (request.sceneKey !== this.scene.scene.key || request.dialogueId !== OPEN_PIT_INTRO.id || !this.introPending) return;
    this.dismissIntroGuidance();
  };

  private readonly handleIntroGuidanceDismissed = (sceneKey: string): void => {
    if (sceneKey === this.scene.scene.key && this.introPending) this.dismissIntroGuidance();
  };

  private dismissIntroGuidance(): void {
    this.introPending = false;
    this.introPrompt?.hide();
    this.publishIntroGuidance(false);
    this.updateGuideTarget();
  }

  private createLessonIndicator(
    zone: Phaser.GameObjects.Zone,
    lessonId: string
  ): LessonIndicator {

    const baseY =
      zone.y -
      zone.displayHeight / 2 -
      10;


    const text =
      this.scene.add.text(
        zone.x,
        baseY,
        '',
        {
          fontFamily: '"Courier New", monospace',
          fontSize: '14px',
          fontStyle: 'bold',
          color: '#d8d1bc',
          backgroundColor: '#191814',
          align: 'center',
          padding: { x: 8, y: 5 },
          lineSpacing: 2,
        }
      );


    text
      .setOrigin(0.5, 1)
      .setDepth(999)
      .setStroke('#080805', 3);


    const indicator: LessonIndicator = {
      lessonId,
      text,
      baseY,
    };


    this.lessonIndicators.push(
      indicator
    );


    this.updateLessonIndicator(
      indicator
    );


    return indicator;
  }


  private updateLessonIndicator(
    indicator: LessonIndicator
  ): void {

    indicator.animation?.stop();

    indicator.animation = undefined;


    const status =
      getLessonStatus(
        indicator.lessonId,
        this.lessonProgress
      );


    indicator.text
      .setText(
        getLessonIndicatorCopy(
          indicator.lessonId,
          status
        )
      )
      .setY(indicator.baseY)
      .setScale(1)
      .setAlpha(
        status === 'pending'
          ? 0.72
          : 1
      );


    if (status === 'current') {

      indicator.text
        .setColor('#f8d66d')
        .setBackgroundColor('#211b0b')
        .setStroke('#080805', 4)
        .setScale(1.06);


      indicator.animation =
        this.scene.tweens.add({
          targets: indicator.text,
          y: indicator.baseY - 5,
          duration: 700,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.inOut',
        });


      return;
    }


    if (status === 'completed') {

      indicator.text
        .setColor('#a6d7a0')
        .setBackgroundColor('#132016')
        .setStroke('#071009', 3);


      return;
    }


    indicator.text
      .setColor('#d8d1bc')
      .setBackgroundColor('#191814')
      .setStroke('#080805', 3);
  }


  private getLessonIndicator(
    zone: Phaser.GameObjects.Zone
  ): LessonIndicator | undefined {

    return zone.getData(
      'lessonIndicator'
    ) as LessonIndicator | undefined;
  }

  private createInteractionText():
    Phaser.GameObjects.Text {

    const text =
      this.scene.add.text(
        0,
        0,
        'Presiona E',
        {
          fontSize: '16px',
          color: '#ffffff',
          backgroundColor: '#202018',
          align: 'center',
          padding: { x: 8, y: 6 },
          wordWrap: { width: 260, useAdvancedWrap: true },
        }
      );


    text
      .setOrigin(0.5, 1)
      .setVisible(false)
      .setDepth(1000);


    return text;
  }


  private showInteractionText():
    void {

    const zone = this.currentInteraction;

    if (!zone) {
      return;
    }

    const interactionType = zone.getData('interactionType') as InteractionType | undefined;
    const isTransition = interactionType === 'transition';
    const targetScene = zone.getData('targetScene') as string | undefined;
    const destination = targetScene
      ? TRANSITION_DESTINATIONS[targetScene] ?? targetScene
      : undefined;
    const view = this.scene.cameras.main.worldView;
    const wrapWidth = Math.max(1, Math.min(260, view.width - 40));

    if (this.interactionText.style.wordWrapWidth !== wrapWidth) {
      this.interactionText.setWordWrapWidth(wrapWidth, true);
    }

    const lessonId = zone.getData('lessonId') as string | undefined;
    const lessonStatus = lessonId
      ? getLessonStatus(lessonId, this.lessonProgress)
      : undefined;
    if (interactionType === 'lesson' && lessonId && lessonStatus) {
      this.interactionText.setVisible(false);
      this.lessonPrompt.show(lessonId, lessonStatus, this.player, this.scene.cameras.main, this.touch);
      return;
    }
    if (zone === this.introZone) {
      this.interactionText.setVisible(false);
      if (this.closingReady) {
        this.introPrompt?.showClosing(this.player, this.scene.cameras.main, this.touch, true, !!this.lessonProgress.openPitReportDelivered);
      } else this.introPrompt?.showIntro(this.player, this.scene.cameras.main, this.touch, true);
      return;
    }
    if (isTransition && destination) {
      this.interactionText.setVisible(false);
      if (this.isTransitionInPreparation(zone)) {
        this.lessonPrompt.showBlockedZone(destination, this.player, this.scene.cameras.main);
      } else {
        this.lessonPrompt.showZone(destination, this.player, this.scene.cameras.main, this.touch);
      }
      return;
    }
    this.lessonPrompt.hide();
    this.interactionText.setText('Presiona E');

    // Keep the sector label visible when a wide zone exceeds a mobile viewport.
    const x = isTransition ? zone.x : this.player.x;
    const y = isTransition
      ? zone.y - zone.displayHeight / 2 - 8
      : this.player.y - 30;
    const halfWidth = this.interactionText.displayWidth / 2;

    this.interactionText
      .setPosition(
        Phaser.Math.Clamp(x, view.left + halfWidth + 8, view.right - halfWidth - 8),
        Phaser.Math.Clamp(y, view.top + this.interactionText.displayHeight + 8, view.bottom - 8)
      )
      .setVisible(true);
  }


  private readonly handleLessonProgressChanged = (
    progress: LessonProgressSnapshot
  ): void => {

    this.lessonProgress = {
      openPitIntroCompleted: progress.openPitIntroCompleted,
      openPitReportDelivered: progress.openPitReportDelivered,
      currentLessonId:
        progress.currentLessonId,
      completedLessonIds: [
        ...progress.completedLessonIds
      ],
    };

    if (this.introZone && typeof progress.openPitIntroCompleted === 'boolean') {
      const pending = !progress.openPitIntroCompleted;
      if (pending !== this.introPending) {
        this.introPending = pending;
        this.introPrompt?.hide();
        this.publishIntroGuidance(pending);
      }
    }
    this.updateGuideTarget();


    for (
      const indicator
      of this.lessonIndicators
    ) {

      this.updateLessonIndicator(
        indicator
      );
    }


    if (this.currentInteraction) {
      this.showInteractionText();
    }
  };

  private updateGuideTarget(): void {
    if (this.closingReady && !this.lessonProgress.openPitReportDelivered && this.introZone) {
      this.lessonGuide?.setTarget({ label: 'Centro de control', x: this.introZone.x, y: this.introZone.y });
      return;
    }
    if (this.introPending && this.introZone) {
      this.lessonGuide?.setTarget({ label: 'Supervisor', x: this.introZone.x, y: this.introZone.y });
      return;
    }
    const target = this.interactionZones.find(zone =>
      zone.getData('interactionType') === 'lesson'
      && zone.getData('lessonId') === this.lessonProgress.currentLessonId
      && getLessonStatus(zone.getData('lessonId'), this.lessonProgress) === 'current'
    );
    this.lessonGuide?.setTarget(target ? {
      lessonId: target.getData('lessonId'), x: target.x, y: target.y,
    } : null);
  }


  /* =========================
     EJECUTAR INTERACCIÓN
     ========================= */

  private triggerCurrentInteraction():
    void {

    if (!this.currentInteraction) {
      return;
    }


    const type =
      this.currentInteraction
        .getData(
          'interactionType'
        ) as InteractionType | undefined;


    switch (type) {

      case 'lesson':

        this.triggerLesson();

        break;


      case 'dialogue':

        this.triggerDialogue();

        break;


      case 'transition':

        this.triggerTransition();

        break;


      default:

        console.warn(
          'Tipo de interacción desconocido:',
          type
        );
    }
  }


  /* =========================
     LECCIÓN
     ========================= */

  private triggerLesson(): void {

    if (!this.currentInteraction) {
      return;
    }


    const lessonId =
      this.currentInteraction
        .getData(
          'lessonId'
        ) as string | undefined;


    if (!lessonId) {

      console.warn(
        'La interacción lesson no tiene lessonId'
      );

      return;
    }


    const request: OpenLessonRequest = {
      lessonId
    };


    gameEvents.emit(
      GameEvents.OPEN_LESSON,
      request
    );
  }


  /* =========================
     DIÁLOGO
     ========================= */

  private triggerDialogue(): void {

    if (!this.currentInteraction) {
      return;
    }


    const npcId =
      this.currentInteraction
        .getData(
          'npcId'
        );


    const dialogueId = this.currentInteraction === this.introZone && this.closingReady
      ? OPEN_PIT_CLOSING.id
      : this.currentInteraction
        .getData(
          'dialogueId'
        );


    if (!dialogueId) {

      console.warn(
        'La interacción dialogue no tiene dialogueId'
      );

      return;
    }


    gameEvents.emit(
      GameEvents.OPEN_DIALOGUE,
      {
        npcId,
        dialogueId
      }
    );
  }


  /* =========================
     TRANSICIÓN
     ========================= */

  private isTransitionInPreparation(zone: Phaser.GameObjects.Zone | null): boolean {
    return zone?.getData('interactionType') === 'transition'
      && isWorldSceneInPreparation(zone.getData('targetScene'));
  }

  private triggerTransition(): void {

    if (!this.currentInteraction) {
      return;
    }


    const targetScene =
      this.currentInteraction
        .getData(
          'targetScene'
        ) as string | undefined;


    const targetSpawn =
      this.currentInteraction
        .getData(
          'targetSpawn'
        ) as string | undefined;


    if (!targetScene) {

      console.warn(
        'La interacción transition no tiene targetScene'
      );

      return;
    }


    this.requestSceneTransition(
      targetScene,
      targetSpawn
    );
  }

}
