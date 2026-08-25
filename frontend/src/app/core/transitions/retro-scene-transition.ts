import Phaser from 'phaser';

const TRANSITION_COLOR = 0x090712;
const TRANSITION_DEPTH = 10_000;
const TRANSITION_DURATION = 500;
const BAND_HEIGHT = 16;
const ANIMATION_STEPS = 12;

type TransitionProgress = {
  value: number;
};

export class RetroSceneTransition {
  private readonly graphics: Phaser.GameObjects.Graphics;

  private readonly progress: TransitionProgress = {
    value: 0,
  };

  private playing = false;

  constructor(private readonly scene: Phaser.Scene) {
    this.graphics = this.scene.add.graphics().setScrollFactor(0).setDepth(TRANSITION_DEPTH);

    this.graphics.setVisible(false);

    this.scene.scale.on('resize', this.handleResize);
  }

  isPlaying(): boolean {
    return this.playing;
  }

  playIn(onComplete?: () => void): void {
    if (this.playing) {
      return;
    }

    this.progress.value = 1;
    this.graphics.setVisible(true);
    this.draw();

    this.playTo(0, onComplete);
  }

  playOut(onComplete: () => void): void {
    if (this.playing) {
      return;
    }

    this.progress.value = 0;
    this.graphics.setVisible(true);
    this.draw();

    this.playTo(1, onComplete);
  }

  destroy(): void {
    this.scene.scale.off('resize', this.handleResize);
    this.scene.tweens.killTweensOf(this.progress);

    this.graphics.destroy();

    this.playing = false;
  }

  private playTo(target: number, onComplete?: () => void): void {
    this.playing = true;

    this.scene.tweens.add({
      targets: this.progress,
      value: target,
      duration: TRANSITION_DURATION,
      ease: 'Linear',
      onUpdate: () => {
        this.draw();
      },
      onComplete: () => {
        this.playing = false;

        if (target === 0) {
          this.graphics.clear();
          this.graphics.setVisible(false);
        }

        onComplete?.();
      },
    });
  }

  private draw(): void {
    const width = this.scene.scale.gameSize.width;
    const height = this.scene.scale.gameSize.height;

    const clampedProgress = Phaser.Math.Clamp(this.progress.value, 0, 1);
    const steppedProgress = Math.round(clampedProgress * ANIMATION_STEPS) / ANIMATION_STEPS;
    const bandWidth = Math.ceil(width * steppedProgress);
    const bandCount = Math.ceil(height / BAND_HEIGHT);

    this.graphics.clear();

    if (bandWidth <= 0) {
      return;
    }

    this.graphics.fillStyle(TRANSITION_COLOR, 1);

    for (let index = 0; index < bandCount; index += 1) {
      const x = index % 2 === 0 ? 0 : width - bandWidth;
      const y = index * BAND_HEIGHT;

      this.graphics.fillRect(x, y, bandWidth, BAND_HEIGHT);
    }
  }

  private readonly handleResize = (): void => {
    if (!this.graphics.visible) {
      return;
    }

    this.draw();
  };
}
