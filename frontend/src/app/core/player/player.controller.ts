import Phaser from 'phaser';


type PlayerControllerConfig = {
  x: number;
  y: number;

  texture?: string;
  frame?: number;

  speed?: number;
  depth?: number;
};


type PlayerDirection = | 'down' | 'up' | 'left' | 'right';


export class PlayerController {

  readonly sprite:
    Phaser.Physics.Arcade.Sprite;


  private readonly speed:
    number;


  private readonly velocity =
    new Phaser.Math.Vector2();


  private lastDirection:
    PlayerDirection =
      'down';


  private locked =
    false;


  constructor(
    private readonly scene:
      Phaser.Scene,

    config:
      PlayerControllerConfig
  ) {

    this.speed =
      config.speed ?? 250;


    this.sprite =
      this.scene.physics.add.sprite(
        config.x,
        config.y,
        config.texture ?? 'player',
        config.frame ?? 0
      );


    this.configureBody(
      config.depth ?? 12
    );


    this.createAnimations();


    this.playIdleAnimation();
  }


  /* =========================
     API PÚBLICA
     ========================= */

  update(
    direction:
      Phaser.Math.Vector2
  ): void {

    if (this.locked) {

      this.stop();

      return;
    }


    if (
      direction.lengthSq() === 0
    ) {

      this.stop();

      this.playIdleAnimation();

      return;
    }


    /*
     * Guardamos primero la dirección
     * original para saber qué animación
     * reproducir.
     */
    const x =
      direction.x;

    const y =
      direction.y;


    /*
     * No modificamos el Vector2 recibido.
     *
     * Utilizamos nuestro propio vector
     * para convertir la dirección en
     * velocidad.
     */
    this.velocity
      .copy(direction)
      .normalize()
      .scale(
        this.speed
      );


    this.sprite.setVelocity(
      this.velocity.x,
      this.velocity.y
    );


    this.playWalkAnimation(
      x,
      y
    );
  }


  lock(): void {

    this.locked =
      true;


    this.stop();
  }


  unlock(): void {

    this.locked =
      false;
  }


  isLocked(): boolean {

    return this.locked;
  }


  stop(): void {

    this.sprite.setVelocity(
      0,
      0
    );
  }


  /* =========================
     CONFIGURACIÓN PLAYER
     ========================= */

  private configureBody(
    depth: number
  ): void {

    this.sprite
      .setCollideWorldBounds(
        true
      );


    this.sprite.setBodySize(
      16,
      10
    );


    this.sprite.setOffset(
      8,
      20
    );


    this.sprite.setDepth(
      depth
    );
  }


  /* =========================
     ANIMACIONES
     ========================= */

  private createAnimations():
    void {

    /*
     * Las animaciones pertenecen
     * al AnimationManager global.
     *
     * Cuando tengamos varias Scenes,
     * no queremos volver a registrarlas
     * cada vez que cambiamos de mapa.
     */

    if (
      !this.scene.anims.exists(
        'still'
      )
    ) {

      this.scene.anims.create({
        key: 'still',

        frames:
          this.scene.anims
            .generateFrameNumbers(
              'player',
              {
                start: 0,
                end: 1
              }
            ),

        frameRate: 5,
        repeat: -1
      });
    }


    if (
      !this.scene.anims.exists(
        'still-up'
      )
    ) {

      this.scene.anims.create({
        key: 'still-up',

        frames:
          this.scene.anims
            .generateFrameNumbers(
              'player',
              {
                start: 24,
                end: 25
              }
            ),

        frameRate: 5,
        repeat: -1
      });
    }


    if (
      !this.scene.anims.exists(
        'still-side'
      )
    ) {

      this.scene.anims.create({
        key: 'still-side',

        frames:
          this.scene.anims
            .generateFrameNumbers(
              'player',
              {
                start: 12,
                end: 13
              }
            ),

        frameRate: 5,
        repeat: -1
      });
    }


    if (
      !this.scene.anims.exists(
        'walk-down'
      )
    ) {

      this.scene.anims.create({
        key: 'walk-down',

        frames:
          this.scene.anims
            .generateFrameNumbers(
              'player',
              {
                start: 6,
                end: 11
              }
            ),

        frameRate: 6,
        repeat: -1
      });
    }


    if (
      !this.scene.anims.exists(
        'walk-side'
      )
    ) {

      this.scene.anims.create({
        key: 'walk-side',

        frames:
          this.scene.anims
            .generateFrameNumbers(
              'player',
              {
                start: 18,
                end: 23
              }
            ),

        frameRate: 6,
        repeat: -1
      });
    }


    if (
      !this.scene.anims.exists(
        'walk-up'
      )
    ) {

      this.scene.anims.create({
        key: 'walk-up',

        frames:
          this.scene.anims
            .generateFrameNumbers(
              'player',
              {
                start: 30,
                end: 35
              }
            ),

        frameRate: 6,
        repeat: -1
      });
    }
  }


  /* =========================
     CAMINAR
     ========================= */

  private playWalkAnimation(
    x: number,
    y: number
  ): void {

    if (y < 0) {

      this.sprite.setFlipX(
        false
      );


      this.sprite.anims.play(
        'walk-up',
        true
      );


      this.lastDirection =
        'up';

      return;
    }


    if (y > 0) {

      this.sprite.setFlipX(
        false
      );


      this.sprite.anims.play(
        'walk-down',
        true
      );


      this.lastDirection =
        'down';

      return;
    }


    if (x < 0) {

      this.sprite.setFlipX(
        true
      );


      this.sprite.anims.play(
        'walk-side',
        true
      );


      this.lastDirection =
        'left';

      return;
    }


    if (x > 0) {

      this.sprite.setFlipX(
        false
      );


      this.sprite.anims.play(
        'walk-side',
        true
      );


      this.lastDirection =
        'right';
    }
  }


  /* =========================
     IDLE
     ========================= */

  private playIdleAnimation():
    void {

    switch (
      this.lastDirection
    ) {

      case 'down':

        this.sprite.setFlipX(
          false
        );

        this.sprite.anims.play(
          'still',
          true
        );

        break;


      case 'up':

        this.sprite.setFlipX(
          false
        );

        this.sprite.anims.play(
          'still-up',
          true
        );

        break;


      case 'left':

        this.sprite.setFlipX(
          true
        );

        this.sprite.anims.play(
          'still-side',
          true
        );

        break;


      case 'right':

        this.sprite.setFlipX(
          false
        );

        this.sprite.anims.play(
          'still-side',
          true
        );

        break;
    }
  }

}