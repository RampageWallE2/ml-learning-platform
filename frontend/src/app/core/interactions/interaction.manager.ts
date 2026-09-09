import Phaser from 'phaser';

import { gameEvents, GameEvents } from '../../features/world/game/events/game-events';

import {
  getObjectLayerOrThrow,
  getTiledProperty,
  getTiledRectangle
} from '../tiled/tiled.utils';


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


export class InteractionManager {

  private readonly interactionZones:
    Phaser.GameObjects.Zone[] = [];


  private currentInteraction:
    Phaser.GameObjects.Zone | null = null;


  private readonly interactionText:
    Phaser.GameObjects.Text;


  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: Phaser.Tilemaps.Tilemap,
    private readonly player: Phaser.Physics.Arcade.Sprite,
    private readonly requestSceneTransition:
      SceneTransitionHandler
  ) {

    this.interactionText =
      this.createInteractionText();


    this.createInteractions();
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

      this.clearCurrentInteraction();

      return false;
    }


    /* =========================
       BUSCAR INTERACCIÓN
       ========================= */

    this.findCurrentInteraction();


    const available =
      this.currentInteraction !== null;


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


  hasActiveInteraction(): boolean {

    return (
      this.currentInteraction !== null
    );
  }


  destroy(): void {

    this.interactionText.destroy();


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
        getTiledProperty<string>(
          object,
          'interactionType'
        )
      );


      /* =========================
         LECCIÓN
         ========================= */

      zone.setData(
        'lessonId',
        getTiledProperty<string>(
          object,
          'lessonId'
        )
      );


      /*
       * Lo mantenemos temporalmente
       * por compatibilidad con el
       * contrato actual de OPEN_LESSON.
       *
       * Luego podremos eliminar "step".
       */
      zone.setData(
        'step',
        getTiledProperty<number>(
          object,
          'step'
        )
      );


      /* =========================
         DIÁLOGO
         ========================= */

      zone.setData(
        'npcId',
        getTiledProperty<string>(
          object,
          'npcId'
        )
      );


      zone.setData(
        'dialogueId',
        getTiledProperty<string>(
          object,
          'dialogueId'
        )
      );


      /* =========================
         TRANSICIÓN
         ========================= */

      zone.setData(
        'targetScene',
        getTiledProperty<string>(
          object,
          'targetScene'
        )
      );


      zone.setData(
        'targetSpawn',
        getTiledProperty<string>(
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


      this.showInteractionText();


      break;
    }
  }


  private clearCurrentInteraction():
    void {

    this.currentInteraction =
      null;


    this.interactionText.setVisible(
      false
    );
  }


  /* =========================
     UI
     ========================= */

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

    const isTransition = zone.getData('interactionType') === 'transition';
    const targetScene = zone.getData('targetScene') as string | undefined;
    const destination = targetScene
      ? TRANSITION_DESTINATIONS[targetScene] ?? targetScene
      : undefined;
    const view = this.scene.cameras.main.worldView;
    const wrapWidth = Math.max(1, Math.min(260, view.width - 40));

    if (this.interactionText.style.wordWrapWidth !== wrapWidth) {
      this.interactionText.setWordWrapWidth(wrapWidth, true);
    }

    this.interactionText.setText(
      isTransition && destination
        ? `Ir a ${destination}\nPulsa E para entrar`
        : 'Presiona E'
    );

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
        );


    const step =
      this.currentInteraction
        .getData(
          'step'
        );


    if (!lessonId) {

      console.warn(
        'La interacción lesson no tiene lessonId'
      );

      return;
    }


    gameEvents.emit(
      GameEvents.OPEN_LESSON,
      {
        lessonId,
        step
      }
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


    const dialogueId =
      this.currentInteraction
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
