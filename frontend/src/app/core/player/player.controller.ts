import Phaser from 'phaser';
import { PLAYER_AVATAR, type PlayerDirection } from './player-avatar';


type PlayerControllerConfig = {
  x: number;
  y: number;

  texture?: string;
  frame?: number;

  speed?: number;
  depth?: number;
};


export class PlayerController {

  readonly sprite:
    Phaser.Physics.Arcade.Sprite;


  private readonly speed:
    number;

  private readonly texture: string;


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

    this.texture = config.texture ?? PLAYER_AVATAR.texture;


    this.sprite =
      this.scene.physics.add.sprite(
        config.x,
        config.y,
        this.texture,
        config.frame ?? PLAYER_AVATAR.directions.down.idleStart
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
    this.playIdleAnimation();
  }


  /* =========================
     CONFIGURACIÓN PLAYER
     ========================= */

  private configureBody(
    depth: number
  ): void {

    // Keep the feet and the collision body at the previous world position.
    // The new 64 px frame is taller; its origin stays 16 px above the bottom.
    this.sprite.setOrigin(0.5, 0.75);

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
      52
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

    // Global animation keys are scoped to the texture and reused across scenes.
    for (const direction of Object.keys(PLAYER_AVATAR.directions) as PlayerDirection[]) {
      const frames = PLAYER_AVATAR.directions[direction];
      for (const state of ['idle', 'walk'] as const) {
        const key = this.animationKey(state, direction);
        if (this.scene.anims.exists(key)) continue;
        this.scene.anims.create({
          key,
          frames: this.scene.anims.generateFrameNumbers(this.texture, {
            start: state === 'idle' ? frames.idleStart : frames.walkStart,
            end: state === 'idle' ? frames.idleEnd : frames.walkEnd,
          }),
          frameRate: 8,
          repeat: -1,
        });
      }
    }
  }

  private animationKey(state: 'idle' | 'walk', direction: PlayerDirection): string {
    return `${this.texture}-${state}-${direction}`;
  }


  /* =========================
     CAMINAR
     ========================= */

  private playWalkAnimation(
    x: number,
    y: number
  ): void {

    // The sheet has four views. Use the dominant axis for diagonal/joystick input.
    this.lastDirection = Math.abs(x) > Math.abs(y)
      ? x < 0 ? 'left' : 'right'
      : y < 0 ? 'up' : 'down';
    this.sprite.setFlipX(false);
    this.sprite.anims.play(this.animationKey('walk', this.lastDirection), true);
  }


  /* =========================
     IDLE
     ========================= */

  private playIdleAnimation():
    void {

    // The second row supplies a six-frame idle loop for each facing direction.
    this.sprite.setFlipX(false);
    this.sprite.anims.play(this.animationKey('idle', this.lastDirection), true);
  }

}
