import Phaser from 'phaser';
import { screenToFixedCameraPoint } from '../camera/camera-zoom';

import {
  calculateMobileControlLayout,
  MOBILE_JOYSTICK_HIT_SIZE,
  type MobileVisibleViewport,
} from './mobile-control-layout';
import { usesTouchControls } from './touch-controls';


export class InputController {

  /* =========================
     TECLADO
     ========================= */

  private cursors?:
    Phaser.Types.Input.Keyboard.CursorKeys;

  private interactionKey?:
    Phaser.Input.Keyboard.Key;


  /* =========================
     MOVIMIENTO MÓVIL
     ========================= */

  private readonly mobileDirection =
    new Phaser.Math.Vector2(
      0,
      0
    );


  private joystickBase?:
    Phaser.GameObjects.Arc;

  private joystickKnob?:
    Phaser.GameObjects.Arc;

  private joystickZone?:
    Phaser.GameObjects.Zone;


  private joystickPointerId:
    number | null = null;


  private readonly joystickRadius =
    36;


  /* =========================
     INTERACCIÓN MÓVIL
     ========================= */

  private mobileInteractButton?:
    Phaser.GameObjects.Arc;

  private mobileInteractText?:
    Phaser.GameObjects.Text;


  /*
   * El botón móvil NO ejecuta
   * ninguna acción del juego.
   *
   * Solamente registra:
   *
   * "el jugador quiere interactuar".
   */
  private mobileInteractRequested =
    false;


  private viewportResizeFrame?: number;


  constructor(
    private readonly scene:
      Phaser.Scene
  ) {

    this.setupKeyboard();


    if (usesTouchControls(this.scene)) {

      this.createMobileJoystick();

      this.createMobileInteractButton();
    }
  }


  /* =========================
     API PÚBLICA
     ========================= */


  /**
   * Obtiene la dirección solicitada
   * por teclado o joystick.
   *
   * No mueve al jugador.
   */
  getDirection(
    out: Phaser.Math.Vector2
  ): Phaser.Math.Vector2 {

    let x = 0;
    let y = 0;


    /* =========================
       TECLADO
       ========================= */

    if (this.cursors) {

      if (
        this.cursors.left.isDown
      ) {
        x = -1;
      }


      if (
        this.cursors.right.isDown
      ) {
        x = 1;
      }


      if (
        this.cursors.up.isDown
      ) {
        y = -1;
      }


      if (
        this.cursors.down.isDown
      ) {
        y = 1;
      }
    }


    /* =========================
       JOYSTICK
       ========================= */

    /*
     * Si existe movimiento desde
     * el joystick, este tiene
     * prioridad sobre el teclado.
     */
    if (
      this.mobileDirection.lengthSq()
      > 0
    ) {

      x =
        this.mobileDirection.x;

      y =
        this.mobileDirection.y;
    }


    return out.set(
      x,
      y
    );
  }


  /**
   * Devuelve true una sola vez
   * cuando el usuario solicita
   * interactuar.
   *
   * Puede provenir de:
   *
   * - tecla E
   * - botón E móvil
   */
  consumeInteract(): boolean {

    const keyboardRequested =
      this.interactionKey
        ? Phaser.Input.Keyboard.JustDown(
            this.interactionKey
          )
        : false;


    const requested =
      keyboardRequested ||
      this.mobileInteractRequested;


    /*
     * Consumimos inmediatamente
     * la petición móvil.
     */
    this.mobileInteractRequested =
      false;


    return requested;
  }


  /**
   * Muestra / habilita el botón E
   * móvil cuando existe algo con
   * lo que se puede interactuar.
   */
  setInteractAvailable(
    available: boolean
  ): void {

    if (
      !this.mobileInteractButton ||
      !this.mobileInteractText
    ) {
      return;
    }


    this.mobileInteractButton.setAlpha(
      available
        ? 1
        : 0
    );


    this.mobileInteractText.setAlpha(
      available
        ? 1
        : 0
    );


    if (
      this.mobileInteractButton.input
    ) {

      this.mobileInteractButton
        .input.enabled =
          available;
    }


    /*
     * Si deja de estar disponible,
     * descartamos cualquier toque
     * anterior.
     */
    if (!available) {

      this.mobileInteractRequested =
        false;
    }
  }


  /**
   * Restablece el input.
   *
   * Será útil cuando el jugador
   * quede bloqueado por un diálogo,
   * una lección o una transición.
   */
  reset(): void {

    this.mobileDirection.set(
      0,
      0
    );


    this.mobileInteractRequested =
      false;


    this.resetMobileJoystick();
  }


  /**
   * Limpia listeners cuando la
   * Scene deja de ejecutarse.
   *
   * Esto será especialmente
   * importante con HUB + ZoneScenes.
   */
  destroy(): void {

    this.scene.input.off(
      'pointermove',
      this.handlePointerMove
    );


    this.scene.input.off(
      'pointerup',
      this.handlePointerUp
    );


    this.scene.scale.off(
      'resize',
      this.handleResize
    );


    window.visualViewport?.removeEventListener(
      'resize',
      this.handleViewportResize
    );


    if (
      this.viewportResizeFrame !==
      undefined
    ) {
      cancelAnimationFrame(
        this.viewportResizeFrame
      );

      this.viewportResizeFrame =
        undefined;
    }


    this.joystickZone?.off(
      'pointerdown',
      this.handleJoystickPointerDown
    );


    this.mobileInteractButton?.off(
      'pointerdown',
      this.handleMobileInteract
    );


    this.joystickBase?.destroy();
    this.joystickKnob?.destroy();
    this.joystickZone?.destroy();

    this.mobileInteractButton?.destroy();
    this.mobileInteractText?.destroy();


    this.joystickBase =
      undefined;

    this.joystickKnob =
      undefined;

    this.joystickZone =
      undefined;

    this.mobileInteractButton =
      undefined;

    this.mobileInteractText =
      undefined;


    this.mobileDirection.set(
      0,
      0
    );


    this.joystickPointerId =
      null;

    this.mobileInteractRequested =
      false;
  }


  /* =========================
     TECLADO
     ========================= */

  private setupKeyboard(): void {

    const keyboard =
      this.scene.input.keyboard;


    /*
     * En un dispositivo sin teclado
     * Phaser puede no disponer del
     * KeyboardPlugin.
     */
    if (!keyboard) {
      return;
    }


    this.cursors =
      keyboard.createCursorKeys();


    this.interactionKey =
      keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.E
      );
  }


  /* =========================
     JOYSTICK
     ========================= */

  private createMobileJoystick(): void {

    this.joystickBase =
      this.scene.add.circle(
        0,
        0,
        44,
        0x315b48,
        0.26
      );


    this.joystickBase
      .setStrokeStyle(1, 0x8b6246, 0.6)
      .setScrollFactor(0)
      .setDepth(1000);


    this.joystickKnob =
      this.scene.add.circle(
        0,
        0,
        20,
        0xf4ebd8,
        0.85
      );


    this.joystickKnob
      .setScrollFactor(0)
      .setDepth(1001);


    this.joystickZone =
      this.scene.add.zone(
        0,
        0,
        MOBILE_JOYSTICK_HIT_SIZE,
        MOBILE_JOYSTICK_HIT_SIZE
      );


    this.joystickZone
      .setScrollFactor(0)
      .setDepth(1002)
      .setInteractive();


    this.joystickZone.on(
      'pointerdown',
      this.handleJoystickPointerDown
    );


    this.scene.input.on(
      'pointermove',
      this.handlePointerMove
    );


    this.scene.input.on(
      'pointerup',
      this.handlePointerUp
    );


    this.scene.scale.on(
      'resize',
      this.handleResize
    );


    window.visualViewport?.addEventListener(
      'resize',
      this.handleViewportResize
    );


    this.repositionMobileControls();
  }


  /* =========================
     BOTÓN E
     ========================= */

  private createMobileInteractButton():
    void {

    this.mobileInteractButton =
      this.scene.add.circle(
        0,
        0,
        32,
        0x315b48,
        0.9
      );


    this.mobileInteractButton
      .setStrokeStyle(1, 0x8b6246, 1)
      .setScrollFactor(0)
      .setDepth(1000)
      .setInteractive();


    this.mobileInteractText =
      this.scene.add.text(
        0,
        0,
        'E',
        {
          fontFamily: 'Inter, sans-serif',
          fontSize: '20px',
          color: '#f4ebd8'
        }
      );


    this.mobileInteractText
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1001);


    this.mobileInteractButton.on(
      'pointerdown',
      this.handleMobileInteract
    );


    /*
     * Comienza oculto porque todavía
     * no sabemos si existe una
     * interacción cercana.
     */
    this.setInteractAvailable(
      false
    );


    this.repositionMobileControls();
  }


  /* =========================
     EVENTOS MÓVILES
     ========================= */

  private readonly handleJoystickPointerDown = (
      pointer: Phaser.Input.Pointer
    ): void => {

      this.joystickPointerId =
        pointer.id;


      this.updateMobileJoystick(
        pointer
      );
    };


  private readonly handlePointerMove = (
      pointer: Phaser.Input.Pointer
    ): void => {

      if (
        pointer.id !==
        this.joystickPointerId
      ) {
        return;
      }


      this.updateMobileJoystick(
        pointer
      );
    };


  private readonly handlePointerUp = (
      pointer: Phaser.Input.Pointer
    ): void => {

      if (
        pointer.id !==
        this.joystickPointerId
      ) {
        return;
      }


      this.resetMobileJoystick();


      this.repositionMobileControls();
    };


  private readonly handleMobileInteract = (): void => {

      this.mobileInteractRequested =
        true;
    };


  private readonly handleResize = (): void => {

      this.repositionMobileControls();
    };


  private readonly handleViewportResize = (): void => {
    if (
      this.viewportResizeFrame !==
      undefined
    ) {
      cancelAnimationFrame(
        this.viewportResizeFrame
      );
    }


    this.viewportResizeFrame =
      requestAnimationFrame(() => {
        this.viewportResizeFrame =
          undefined;

        this.repositionMobileControls();
      });
  };


  /* =========================
     ACTUALIZAR JOYSTICK
     ========================= */

  private updateMobileJoystick(
    pointer: Phaser.Input.Pointer
  ): void {

    if (
      !this.joystickBase ||
      !this.joystickKnob
    ) {
      return;
    }


    const zoom = this.scene.cameras.main.zoom;
    const point = screenToFixedCameraPoint(
      pointer.x,
      pointer.y,
      this.scene.scale.gameSize.width,
      this.scene.scale.gameSize.height,
      zoom
    );


    const dx = point.x - this.joystickBase.x;


    const dy = point.y - this.joystickBase.y;


    const distance =
      Math.sqrt(
        dx * dx +
        dy * dy
      );


    /*
     * Zona muerta.
     */
    if (
      distance < 8 / zoom
    ) {

      this.mobileDirection.set(
        0,
        0
      );


      this.joystickKnob.setPosition(
        this.joystickBase.x,
        this.joystickBase.y
      );


      return;
    }


    const normalizedX =
      dx / distance;


    const normalizedY =
      dy / distance;


    this.mobileDirection.set(
      normalizedX,
      normalizedY
    );


    const knobDistance =
      Math.min(
        distance,
        this.joystickRadius / zoom
      );


    this.joystickKnob.setPosition(

      this.joystickBase.x +
        normalizedX *
        knobDistance,

      this.joystickBase.y +
        normalizedY *
        knobDistance

    );
  }


  /* =========================
     RESET JOYSTICK
     ========================= */

  private resetMobileJoystick():
    void {

    this.joystickPointerId =
      null;


    this.mobileDirection.set(
      0,
      0
    );


    if (
      !this.joystickBase ||
      !this.joystickKnob
    ) {
      return;
    }


    this.joystickKnob.setPosition(
      this.joystickBase.x,
      this.joystickBase.y
    );
  }


  /* =========================
     RESPONSIVE
     ========================= */

  private repositionMobileControls():
    void {

    const width =
      this.scene.scale.gameSize.width;


    const height =
      this.scene.scale.gameSize.height;


    const layout =
      calculateMobileControlLayout(
        width,
        height,
        this.getVisibleViewport(
          width,
          height
        )
      );


    const zoom = this.scene.cameras.main.zoom;
    const joystickPosition = screenToFixedCameraPoint(
      layout.joystickX,
      layout.controlsY,
      width,
      height,
      zoom
    );
    const interactPosition = screenToFixedCameraPoint(
      layout.interactButtonX,
      layout.controlsY,
      width,
      height,
      zoom
    );


    /* =========================
       JOYSTICK
       ========================= */

    if (
      this.joystickBase &&
      this.joystickKnob &&
      this.joystickZone
    ) {

      if (this.joystickPointerId === null) {
        this.joystickBase.setPosition(
          joystickPosition.x,
          joystickPosition.y
        );


        this.joystickKnob.setPosition(
          joystickPosition.x,
          joystickPosition.y
        );


        this.joystickZone.setPosition(
          joystickPosition.x,
          joystickPosition.y
        );
      }


      this.joystickBase.setScale(1 / zoom);
      this.joystickKnob.setScale(1 / zoom);
      this.joystickZone.setScale(1 / zoom);
    }


    /* =========================
       BOTÓN INTERACCIÓN
       ========================= */

    if (
      this.mobileInteractButton &&
      this.mobileInteractText
    ) {

      this.mobileInteractButton
        .setPosition(
          interactPosition.x,
          interactPosition.y
        );


      this.mobileInteractText
        .setPosition(
          interactPosition.x,
          interactPosition.y
        );


      this.mobileInteractButton.setScale(1 / zoom);
      this.mobileInteractText.setScale(1 / zoom);
    }
  }


  private getVisibleViewport(
    gameWidth: number,
    gameHeight: number
  ): MobileVisibleViewport | undefined {

    const viewport =
      window.visualViewport;


    if (!viewport) {
      return undefined;
    }


    const widthScale =
      window.innerWidth > 0
        ? gameWidth / window.innerWidth
        : 1;


    const heightScale =
      window.innerHeight > 0
        ? gameHeight / window.innerHeight
        : 1;


    return {
      width:
        viewport.width *
        widthScale,
      height:
        viewport.height *
        heightScale,
      offsetLeft:
        viewport.offsetLeft *
        widthScale,
      offsetTop:
        viewport.offsetTop *
        heightScale
    };
  }


}
