import type Phaser from 'phaser';
import { AmbientCameraShake } from './ambient-camera-shake';

describe('AmbientCameraShake', () => {
  afterEach(() => vi.unstubAllGlobals());

  function create(width = 1000, height = 600, zoom = 1) {
    const motion = { matches: false };
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => motion),
    );
    const effect = {
      isRunning: false,
      reset: vi.fn(() => {
        effect.isRunning = false;
      }),
    };
    const camera = {
      width,
      height,
      zoom,
      shakeEffect: effect,
      shake: vi.fn((_duration: number, _intensity: number, _force: boolean) => {
        effect.isRunning = true;
      }),
    };
    return {
      camera,
      effect,
      motion,
      shake: new AmbientCameraShake(camera as unknown as Phaser.Cameras.Scene2D.Camera),
    };
  }

  it.each([
    [1000, 600, 1],
    [390, 700, 0.65],
    [844, 390, 1.5],
  ])('caps the pulse at 1.5 screen pixels at %s × %s and zoom %s', (width, height, zoom) => {
    const { shake, camera } = create(width, height, zoom);
    shake.update(1, true);
    expect(camera.shake).toHaveBeenCalledOnce();
    const [duration, intensity, force] = camera.shake.mock.calls[0];
    expect(duration).toBe(150);
    expect(force).toBe(false);
    expect(intensity * Math.max(width, height) * zoom).toBeCloseTo(1.5);
  });

  it('scales pulses with sound strength and does not restart them every frame or accumulate sources', () => {
    const { shake, camera, effect } = create();
    shake.update(0.5, true);
    const firstIntensity = camera.shake.mock.calls[0][1];
    shake.update(1, true);
    expect(camera.shake).toHaveBeenCalledOnce();
    effect.isRunning = false;
    shake.update(1, true);
    expect(camera.shake.mock.calls[1][1]).toBeCloseTo(firstIntensity * 2);
    effect.isRunning = false;
    shake.update(5, true);
    expect(camera.shake.mock.calls[2][1]).toBe(camera.shake.mock.calls[1][1]);
  });

  it('stops while reading or away from machinery and can resume after either pause', () => {
    const { shake, camera, effect } = create();
    shake.update(1, true);
    shake.update(1, false);
    expect(effect.reset).toHaveBeenCalledOnce();
    shake.update(1, true);
    expect(camera.shake).toHaveBeenCalledTimes(2);
    shake.update(0, true);
    expect(effect.reset).toHaveBeenCalledTimes(2);
    shake.update(0.1, true);
    expect(camera.shake).toHaveBeenCalledTimes(2);
  });

  it('respects changes to reduced motion without attaching persistent listeners', () => {
    const { shake, motion, effect, camera } = create();
    motion.matches = true;
    shake.update(1, true);
    expect(camera.shake).not.toHaveBeenCalled();
    motion.matches = false;
    shake.update(1, true);
    motion.matches = true;
    shake.update(1, true);
    expect(effect.reset).toHaveBeenCalledOnce();
    expect(window.matchMedia).toHaveBeenCalledExactlyOnceWith('(prefers-reduced-motion: reduce)');
  });

  it('does not start over or reset another camera shake', () => {
    const { shake, effect, camera } = create();
    effect.isRunning = true;
    shake.update(1, true);
    shake.update(0, false);
    shake.destroy();
    expect(camera.shake).not.toHaveBeenCalled();
    expect(effect.reset).not.toHaveBeenCalled();
  });

  it('destroys idempotently and cannot start pulses after shutdown', () => {
    const { shake, camera, effect } = create();
    shake.update(1, true);
    shake.destroy();
    shake.destroy();
    shake.update(1, true);
    expect(effect.reset).toHaveBeenCalledOnce();
    expect(camera.shake).toHaveBeenCalledOnce();
  });

  it('ignores non-finite strength and invalid viewport dimensions', () => {
    const { shake, camera } = create();
    shake.update(Number.NaN, true);
    camera.width = 0;
    shake.update(1, true);
    camera.width = 1000;
    camera.height = Number.NaN;
    shake.update(1, true);
    camera.height = 600;
    camera.zoom = 0;
    shake.update(1, true);
    expect(camera.shake).not.toHaveBeenCalled();
  });
});
