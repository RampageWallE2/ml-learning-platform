import type Phaser from 'phaser';
import { getLessonLabel } from './lesson-indicator';

type Point = Readonly<{ x: number; y: number }>;
type View = Readonly<{ left: number; right: number; top: number; bottom: number }>;
export type LessonGuideTarget = Point & Readonly<{ lessonId: string }>;

/**
 * A bearing to the lesson, not a walkable route. World coordinates are used so
 * camera follow and map edits cannot reverse the direction. Size stays in pixels.
 */
export function calculateLessonGuide(
  player: Point,
  target: Point,
  view: View,
  zoom: number,
): Readonly<{ x: number; y: number; angle: number; scale: number }> | null {
  if (
    ![
      player.x,
      player.y,
      target.x,
      target.y,
      view.left,
      view.right,
      view.top,
      view.bottom,
      zoom,
    ].every(Number.isFinite) ||
    zoom <= 0
  )
    return null;
  if (
    target.x >= view.left &&
    target.x <= view.right &&
    target.y >= view.top &&
    target.y <= view.bottom
  )
    return null;
  if (target.x === player.x && target.y === player.y) return null;

  const scale = 1 / zoom;
  const left = view.left + 24 * scale;
  const right = view.right - 24 * scale;
  const top = view.top + 18 * scale;
  const bottom = view.bottom - 42 * scale; // Includes the upright class label.
  if (left > right || top > bottom) return null;

  const angle = Math.atan2(target.y - player.y, target.x - player.x);
  return {
    x: Math.min(right, Math.max(left, player.x + Math.cos(angle) * 48 * scale)),
    y: Math.min(bottom, Math.max(top, player.y + Math.sin(angle) * 48 * scale)),
    angle,
    scale,
  };
}

/** One non-interactive marker, only when the next NPC is outside the camera. */
export class LessonGuide {
  private readonly arrow: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private target: LessonGuideTarget | null = null;

  constructor(scene: Phaser.Scene) {
    this.arrow = scene.add.graphics();
    this.arrow
      .fillStyle(0xd4aa4b)
      .lineStyle(2, 0x18251e)
      .beginPath()
      .moveTo(11, 0)
      .lineTo(-8, -8)
      .lineTo(-4, 0)
      .lineTo(-8, 8)
      .closePath()
      .fillPath()
      .strokePath()
      .setDepth(998);
    this.label = scene.add
      .text(0, 0, '', {
        fontFamily: 'Inter, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#f4ebd8',
        backgroundColor: '#18251e',
        padding: { x: 5, y: 3 },
      })
      .setOrigin(0.5, 0)
      .setDepth(998)
      .setResolution(2);
    this.hide();
  }

  setTarget(target: LessonGuideTarget | null): void {
    this.target = target;
    this.label.setText(target ? getLessonLabel(target.lessonId).replace('CLASE ', 'C') : '');
    this.hide(); // Never show the previous lesson while progress is changing.
  }

  update(player: Point, camera: Phaser.Cameras.Scene2D.Camera, suppressed = false): void {
    const position =
      !suppressed && this.target
        ? calculateLessonGuide(player, this.target, camera.worldView, camera.zoom)
        : null;
    if (!position) {
      this.hide();
      return;
    }
    this.arrow
      .setPosition(position.x, position.y)
      .setScale(position.scale)
      .setRotation(position.angle)
      .setVisible(true);
    this.label
      .setPosition(position.x, position.y + 14 * position.scale)
      .setScale(position.scale)
      .setVisible(true);
  }

  hide(): void {
    this.arrow.setVisible(false);
    this.label.setVisible(false);
  }

  destroy(): void {
    this.target = null;
    this.arrow.destroy();
    this.label.destroy();
  }
}
