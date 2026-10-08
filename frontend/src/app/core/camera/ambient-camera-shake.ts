import type Phaser from 'phaser';

const SHAKE_DURATION_MS = 150;
const MAX_SHAKE_PIXELS = 1.5;
const MIN_AUDIBLE_STRENGTH = 0.15;

/** Short, bounded pulses driven by machinery audio; never move the player. */
export class AmbientCameraShake {
  private readonly motionPreference: MediaQueryList | null;
  private ownsShake = false;
  private destroyed = false;

  constructor(private readonly camera: Phaser.Cameras.Scene2D.Camera) {
    this.motionPreference =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
  }

  update(audibleStrength: number, enabled: boolean): void {
    if (this.destroyed) return;
    if (!this.camera.shakeEffect.isRunning) this.ownsShake = false;

    const { width, height, zoom } = this.camera;
    if (
      !enabled ||
      this.motionPreference?.matches ||
      !Number.isFinite(audibleStrength) ||
      audibleStrength < MIN_AUDIBLE_STRENGTH ||
      !Number.isFinite(width) ||
      width <= 0 ||
      !Number.isFinite(height) ||
      height <= 0 ||
      !Number.isFinite(zoom) ||
      zoom <= 0
    ) {
      this.stop();
      return;
    }

    // Leave any pulse already in progress alone; do not force/restart each frame.
    if (this.camera.shakeEffect.isRunning) return;

    const strength = Math.min(1, audibleStrength);
    // Phaser multiplies intensity by viewport size and zoom. Cap screen movement.
    const intensity = (MAX_SHAKE_PIXELS * strength) / (Math.max(width, height) * zoom);
    this.camera.shake(SHAKE_DURATION_MS, intensity, false);
    this.ownsShake = true;
  }

  stop(): void {
    if (this.ownsShake && this.camera.shakeEffect.isRunning) {
      this.camera.shakeEffect.reset();
    }
    this.ownsShake = false;
  }

  destroy(): void {
    this.stop();
    this.destroyed = true;
  }
}
