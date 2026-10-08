import type Phaser from 'phaser';
import { getLessonPromptContent, type LessonIndicatorStatus } from './lesson-indicator';

type PromptContent = Readonly<{ label: string; status: string; topic: string; action: string }>;

/** Reusable retro ficha for lessons, guidance and zone entrances. */
export class LessonProximityPrompt {
  private readonly container: Phaser.GameObjects.Container;
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly status: Phaser.GameObjects.Text;
  private readonly topic: Phaser.GameObjects.Text;
  private readonly action: Phaser.GameObjects.Text;
  private readonly palette;
  private contentKey = '';
  private frameKey = '';

  constructor(scene: Phaser.Scene) {
    const styles = getComputedStyle(document.documentElement);
    const color = (token: string, fallback: string) => styles.getPropertyValue(token).trim() || fallback;
    this.palette = {
      surface: color('--color-surface', '#f4ebd8'),
      raised: color('--color-surface-raised', '#fffdf8'),
      border: color('--color-earth', '#8b6246'),
      text: color('--color-text', '#28332d'),
      muted: color('--color-text-muted', '#4f5b53'),
      primary: color('--color-primary', '#315b48'),
    };
    const text = (fontSize: number, fontColor: string, fontFamily = 'Inter, sans-serif') =>
      scene.add.text(0, 0, '', {
        fontFamily, fontSize, color: fontColor, fontStyle: 'bold', lineSpacing: 2,
      }).setResolution(2);

    this.frame = scene.add.graphics();
    this.label = text(11, this.palette.muted, '"Courier New", monospace');
    this.status = text(10, this.palette.primary).setOrigin(1, 0);
    this.topic = text(16, this.palette.text);
    this.action = text(12, this.palette.primary);
    this.container = scene.add.container(0, 0, [
      this.frame, this.label, this.status, this.topic, this.action,
    ]).setDepth(1000).setVisible(false);
  }

  show(
    lessonId: string,
    status: LessonIndicatorStatus,
    player: Readonly<{ x: number; y: number }>,
    camera: Phaser.Cameras.Scene2D.Camera,
    touch: boolean,
  ): void {
    this.showContent(getLessonPromptContent(lessonId, status, touch), player, camera);
  }

  /** The intro uses exactly the lesson ficha, including its responsive frame. */
  showIntro(
    anchor: Readonly<{ x: number; y: number }>,
    camera: Phaser.Cameras.Scene2D.Camera,
    touch: boolean,
    nearby: boolean,
  ): void {
    this.showContent({
      label: 'INTRODUCCIÓN', status: nearby ? '' : 'Empieza aquí',
      topic: 'Habla con el supervisor',
      action: nearby ? `${touch ? 'Toca E' : '[E]'} · Conversar` : 'Acércate para empezar',
    }, anchor, camera);
  }

  showClosing(
    anchor: Readonly<{ x: number; y: number }>,
    camera: Phaser.Cameras.Scene2D.Camera,
    touch: boolean,
    nearby: boolean,
    delivered = false,
  ): void {
    this.showContent({
      label: 'CENTRO DE CONTROL', status: nearby ? '' : 'Cierre del turno',
      topic: delivered ? 'Informe entregado' : 'Entrega el informe',
      action: nearby ? `${touch ? 'Toca E' : '[E]'} · ${delivered ? 'Ver cierre' : 'Conversar'}` : 'Vuelve con el supervisor',
    }, anchor, camera);
  }

  showZone(
    destination: string,
    anchor: Readonly<{ x: number; y: number }>,
    camera: Phaser.Cameras.Scene2D.Camera,
    touch: boolean,
  ): void {
    this.showContent({
      label: 'ZONA', status: 'Disponible',
      topic: destination,
      action: `${touch ? 'Toca E' : '[E]'} · Entrar`,
    }, anchor, camera);
  }

  showBlockedZone(
    destination: string,
    anchor: Readonly<{ x: number; y: number }>,
    camera: Phaser.Cameras.Scene2D.Camera,
  ): void {
    this.showContent({
      label: 'ZONA EN PREPARACIÓN', status: '',
      topic: destination,
      action: 'Próximamente podrás explorarla.',
    }, anchor, camera);
  }

  private showContent(
    content: PromptContent,
    player: Readonly<{ x: number; y: number }>,
    camera: Phaser.Cameras.Scene2D.Camera,
  ): void {
    const view = camera.worldView;
    const zoom = camera.zoom;
    if (!Number.isFinite(zoom) || zoom <= 0) { this.hide(); return; }
    const width = Math.min(248, Math.floor(view.width * zoom - 24));
    if (width < 160) { this.hide(); return; }

    const key = JSON.stringify([content, width]);
    if (key !== this.contentKey) {
      this.label.setText(content.label).setPosition(12, 10);
      this.status.setText(content.status.toUpperCase()).setPosition(width - 12, 11);
      this.topic.setWordWrapWidth(width - 24, true).setText(content.topic).setPosition(12, 31);
      this.action.setWordWrapWidth(width - 24, true).setText(content.action).setPosition(12, 31 + this.topic.height + 18);
      this.contentKey = key;
    }

    const height = 31 + this.topic.height + 18 + this.action.height + 10;
    if (height + 32 > view.height * zoom) { this.hide(); return; }
    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
    const x = clamp(player.x - width / (2 * zoom), view.left + 8 / zoom, view.right - (width + 11) / zoom);
    // Flip below the player at the top edge instead of covering the character.
    const below = player.y - (height + 26) / zoom < view.top + 8 / zoom;
    const y = clamp(
      below ? player.y + 26 / zoom : player.y - (height + 26) / zoom,
      view.top + 15 / zoom, view.bottom - (height + 15) / zoom,
    );
    const tipX = Math.round(clamp((player.x - x) * zoom, 14, width - 14));
    this.drawFrame(width, height, tipX, below);
    this.container.setScale(1 / zoom).setPosition(x, y).setVisible(true);
  }

  hide(): void { this.container.setVisible(false); }

  destroy(): void { this.container.destroy(true); }

  private drawFrame(width: number, height: number, tipX: number, below: boolean): void {
    const key = `${width}:${height}:${tipX}:${below}`;
    if (key === this.frameKey) return;
    this.frameKey = key;
    const hex = (value: string) => Number.parseInt(value.replace('#', ''), 16);
    const edge = below ? 0 : height;
    const tip = edge + (below ? -7 : 7);
    this.frame.clear()
      .fillStyle(hex(this.palette.border), 1).fillRect(3, 3, width, height)
      .fillStyle(hex(this.palette.surface), 1).fillRect(0, 0, width, height)
      .lineStyle(1, hex(this.palette.border), 1).strokeRect(0, 0, width, height)
      .fillStyle(hex(this.palette.raised), 1).fillRect(1, 1, width - 2, 2)
      .fillStyle(hex(this.palette.surface), 1)
      .beginPath().moveTo(tipX - 7, edge).lineTo(tipX, tip).lineTo(tipX + 7, edge)
      .closePath().fillPath().strokePath()
      .lineStyle(1, hex(this.palette.border), 0.35)
      .beginPath().moveTo(12, height - this.action.height - 20)
      .lineTo(width - 12, height - this.action.height - 20).strokePath();
  }
}
