import Phaser from 'phaser';


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
    45;


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


  constructor(
    private readonly scene:
      Phaser.Scene
  ) {

    this.setupKeyboard();


    if (
      this.isMobileDevice()
    ) {

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
        55,
        0x000000,
        0.25
      );


    this.joystickBase
      .setScrollFactor(0)
      .setDepth(1000);


    this.joystickKnob =
      this.scene.add.circle(
        0,
        0,
        25,
        0xffffff,
        0.55
      );


    this.joystickKnob
      .setScrollFactor(0)
      .setDepth(1001);


    this.joystickZone =
      this.scene.add.zone(
        0,
        0,
        160,
        160
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
        40,
        0x000000,
        0.4
      );


    this.mobileInteractButton
      .setScrollFactor(0)
      .setDepth(1000)
      .setInteractive();


    this.mobileInteractText =
      this.scene.add.text(
        0,
        0,
        'E',
        {
          fontSize: '24px',
          color: '#ffffff'
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
    };


  private readonly handleMobileInteract = (): void => {

      this.mobileInteractRequested =
        true;
    };


  private readonly handleResize = (): void => {

      this.repositionMobileControls();
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


    const dx =
      pointer.x -
      this.joystickBase.x;


    const dy =
      pointer.y -
      this.joystickBase.y;


    const distance =
      Math.sqrt(
        dx * dx +
        dy * dy
      );


    /*
     * Zona muerta.
     */
    if (
      distance < 8
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
        this.joystickRadius
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


    /* =========================
       JOYSTICK
       ========================= */

    if (
      this.joystickBase &&
      this.joystickKnob &&
      this.joystickZone
    ) {

      const joystickX =
        90;

      const joystickY =
        height - 90;


      this.joystickBase.setPosition(
        joystickX,
        joystickY
      );


      this.joystickKnob.setPosition(
        joystickX,
        joystickY
      );


      this.joystickZone.setPosition(
        joystickX,
        joystickY
      );


      this.mobileDirection.set(
        0,
        0
      );


      this.joystickPointerId =
        null;
    }


    /* =========================
       BOTÓN INTERACCIÓN
       ========================= */

    if (
      this.mobileInteractButton &&
      this.mobileInteractText
    ) {

      const buttonX =
        width - 90;

      const buttonY =
        height - 90;


      this.mobileInteractButton
        .setPosition(
          buttonX,
          buttonY
        );


      this.mobileInteractText
        .setPosition(
          buttonX,
          buttonY
        );
    }
  }


  /* =========================
     DETECTAR MÓVIL
     ========================= */

  private isMobileDevice():
    boolean {

    const hasTouch =
      this.scene.sys.game
        .device.input.touch ||
      navigator.maxTouchPoints > 0;


    const coarsePointer =
      window
        .matchMedia(
          '(pointer: coarse)'
        )
        .matches;


    return (
      hasTouch &&
      coarsePointer
    );
  }

}