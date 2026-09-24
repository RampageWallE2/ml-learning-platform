import type Phaser from 'phaser';

export function usesTouchControls(scene: Phaser.Scene): boolean {
  const hasTouch =
    scene.sys.game.device.input.touch || navigator.maxTouchPoints > 0;

  return hasTouch && window.matchMedia('(pointer: coarse)').matches;
}
