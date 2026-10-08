import Phaser from 'phaser';
import { PlayerController } from './player.controller';
import { PLAYER_AVATAR } from './player-avatar';

vi.mock('phaser', () => ({ default: { Math: { Vector2: class {
  constructor(public x = 0, public y = 0) {}
  copy(other: { x: number; y: number }) { this.x = other.x; this.y = other.y; return this; }
  lengthSq() { return this.x * this.x + this.y * this.y; }
  normalize() { const length = Math.hypot(this.x, this.y); if (length) { this.x /= length; this.y /= length; } return this; }
  scale(value: number) { this.x *= value; this.y *= value; return this; }
} } } }));

describe('PlayerController — postman avatar', () => {
  function create(registered = new Set<string>()) {
    const sprite = {
      setOrigin: vi.fn(), setCollideWorldBounds: vi.fn(), setBodySize: vi.fn(),
      setOffset: vi.fn(), setDepth: vi.fn(), setFlipX: vi.fn(), setVelocity: vi.fn(),
      anims: { play: vi.fn() },
    };
    const scene = {
      physics: { add: { sprite: vi.fn(() => sprite) } },
      anims: {
        exists: vi.fn((key: string) => registered.has(key)),
        create: vi.fn((config: { key: string; frames: unknown[]; frameRate: number; repeat: number }) => registered.add(config.key)),
        generateFrameNumbers: vi.fn((texture: string, range: { start: number; end: number }) =>
          Array.from({ length: range.end - range.start + 1 }, (_, i) => ({ key: texture, frame: range.start + i }))),
      },
    };
    return { controller: new PlayerController(scene as unknown as Phaser.Scene, { x: 100, y: 200 }), scene, sprite };
  }

  it('starts facing down and preserves the previous feet and collision position', () => {
    const { scene, sprite } = create();
    expect(scene.physics.add.sprite).toHaveBeenCalledWith(100, 200, 'player-postman-3', 75);
    expect(sprite.setOrigin).toHaveBeenCalledWith(0.5, 0.75);
    expect(sprite.setBodySize).toHaveBeenCalledWith(16, 10);
    expect(sprite.setOffset).toHaveBeenCalledWith(8, 52);
    expect(sprite.setCollideWorldBounds).toHaveBeenCalledWith(true);
    expect(sprite.anims.play).toHaveBeenLastCalledWith('player-postman-3-idle-down', true);
    expect(52 + 5 - 64 * 0.75).toBe(20 + 5 - 32 * 0.5);
  });

  it('registers six-frame idle loops from row two and walking loops from row three once across scenes', () => {
    const registered = new Set<string>();
    const { scene } = create(registered);
    expect(scene.anims.create).toHaveBeenCalledTimes(8);
    expect(PLAYER_AVATAR.directions).toEqual({
      right: { idleStart: 57, idleEnd: 62, walkStart: 114, walkEnd: 119 },
      up: { idleStart: 63, idleEnd: 68, walkStart: 120, walkEnd: 125 },
      left: { idleStart: 69, idleEnd: 74, walkStart: 126, walkEnd: 131 },
      down: { idleStart: 75, idleEnd: 80, walkStart: 132, walkEnd: 137 },
    });
    for (const [direction, frames] of Object.entries(PLAYER_AVATAR.directions)) {
      expect(scene.anims.generateFrameNumbers).toHaveBeenCalledWith('player-postman-3', {
        start: frames.walkStart, end: frames.walkEnd,
      });
      expect(scene.anims.generateFrameNumbers).toHaveBeenCalledWith('player-postman-3', {
        start: frames.idleStart, end: frames.idleEnd,
      });
      expect(registered.has(`player-postman-3-walk-${direction}`)).toBe(true);
      expect(registered.has(`player-postman-3-idle-${direction}`)).toBe(true);
    }
    for (const [config] of scene.anims.create.mock.calls) {
      expect(config).toEqual(expect.objectContaining({
        frames: expect.any(Array), frameRate: 8, repeat: -1,
      }));
      expect(config.frames).toHaveLength(6);
    }
    expect(create(registered).scene.anims.create).not.toHaveBeenCalled();
  });

  it('walks in all eight input directions and keeps the last facing direction at rest', () => {
    const { controller, sprite } = create();
    const cases = [
      [0, 1, 'down'], [0, -1, 'up'], [-1, 0, 'left'], [1, 0, 'right'],
      [-1, -1, 'up'], [1, -1, 'up'], [-1, 1, 'down'], [1, 1, 'down'],
    ] as const;
    for (const [x, y, facing] of cases) {
      const direction = new Phaser.Math.Vector2(x, y);
      controller.update(direction);
      expect(sprite.anims.play).toHaveBeenLastCalledWith(`player-postman-3-walk-${facing}`, true);
      const [vx, vy] = sprite.setVelocity.mock.lastCall!;
      expect(Math.hypot(vx, vy)).toBeCloseTo(250);
      expect([direction.x, direction.y]).toEqual([x, y]);
      controller.update(new Phaser.Math.Vector2());
      expect(sprite.setVelocity).toHaveBeenLastCalledWith(0, 0);
      expect(sprite.anims.play).toHaveBeenLastCalledWith(`player-postman-3-idle-${facing}`, true);
    }
    expect(sprite.setFlipX).toHaveBeenCalledWith(false);
    expect(sprite.setFlipX).not.toHaveBeenCalledWith(true);
  });

  it('uses the dominant joystick axis instead of turning upward for a tiny vertical component', () => {
    const { controller, sprite } = create();
    controller.update(new Phaser.Math.Vector2(-1, -0.1));
    expect(sprite.anims.play).toHaveBeenLastCalledWith('player-postman-3-walk-left', true);
    controller.update(new Phaser.Math.Vector2(1, 0.1));
    expect(sprite.anims.play).toHaveBeenLastCalledWith('player-postman-3-walk-right', true);
  });

  it('switches to the matching idle immediately when locked and resumes after unlocking', () => {
    const { controller, sprite } = create();
    controller.update(new Phaser.Math.Vector2(-1, 0));
    controller.lock();
    expect(controller.isLocked()).toBe(true);
    expect(sprite.setVelocity).toHaveBeenLastCalledWith(0, 0);
    expect(sprite.anims.play).toHaveBeenLastCalledWith('player-postman-3-idle-left', true);
    controller.update(new Phaser.Math.Vector2(0, 1));
    expect(sprite.setVelocity).toHaveBeenLastCalledWith(0, 0);
    expect(sprite.anims.play).toHaveBeenLastCalledWith('player-postman-3-idle-left', true);
    controller.unlock();
    controller.update(new Phaser.Math.Vector2(0, 1));
    expect(controller.isLocked()).toBe(false);
    expect(sprite.setVelocity).toHaveBeenLastCalledWith(0, 250);
    expect(sprite.anims.play).toHaveBeenLastCalledWith('player-postman-3-walk-down', true);
  });
});
