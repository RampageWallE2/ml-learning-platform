import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import type { MinimapMapData, MinimapPlayerPosition } from '../../../../core/minimap/minimap.types';
import type { ZoneProgress } from '../../progress/progress.types';

@Component({
  selector: 'app-world-minimap',
  templateUrl: './world-minimap.html',
  styleUrl: './world-minimap.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldMinimap {
  private static nextId = 0;
  readonly panelId = `world-minimap-${++WorldMinimap.nextId}`;
  readonly map = input.required<MinimapMapData>();
  readonly player = input<MinimapPlayerPosition | null>(null);
  readonly zone = input<ZoneProgress | null>(null);
  readonly loadingProgress = input(false);
  readonly returnToSupervisor = input(false);
  readonly introPending = input(false);
  readonly supervisorPoint = computed(() => !this.loadingProgress() && (this.introPending() || this.returnToSupervisor())
    ? this.map().supervisor ?? null : null);
  readonly returnFocusTarget = input<HTMLElement | null>(null);
  private readonly compactMedia = window.matchMedia?.('(max-width: 750px), (max-height: 480px)');
  readonly expanded = signal(!this.compactMedia?.matches);
  private readonly toggleButton = viewChild<ElementRef<HTMLButtonElement>>('toggleButton');

  readonly nextLesson = computed(() => this.loadingProgress() || this.introPending() ? null
    : this.zone()?.lessons.find(lesson => lesson.status !== 'completed') ?? null);
  readonly nextLessonNumber = computed(() => this.map().lessons.find(
    lesson => lesson.lessonId === this.nextLesson()?.lessonId,
  )?.number ?? null);
  readonly markers = computed(() => this.map().lessons.map(lesson => ({
    ...lesson,
    completed: !this.loadingProgress() && !!this.zone()?.lessons.some(item => item.lessonId === lesson.lessonId && item.status === 'completed'),
    current: lesson.lessonId === this.nextLesson()?.lessonId,
  })));
  readonly playerPoint = computed(() => {
    const map = this.map();
    const player = this.player();
    if (!player || player.sceneKey !== map.sceneKey || !Number.isFinite(player.x + player.y + player.heading)) return null;
    const clamp = (value: number, max: number) => Math.min(max, Math.max(0, value));
    return { x: clamp(player.x / map.worldWidth * map.width, map.width),
      y: clamp(player.y / map.worldHeight * map.height, map.height), heading: player.heading };
  });

  constructor() {
    const resize = (event: MediaQueryListEvent) => this.expanded.set(!event.matches);
    this.compactMedia?.addEventListener('change', resize);
    inject(DestroyRef).onDestroy(() => this.compactMedia?.removeEventListener('change', resize));
  }

  toggle(): void {
    this.expanded.update(value => !value);
    if (!this.expanded()) this.returnFocusTarget()?.focus({ preventScroll: true });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || !this.expanded()) return;
    event.preventDefault();
    event.stopPropagation();
    this.expanded.set(false);
    (this.returnFocusTarget() ?? this.toggleButton()?.nativeElement)?.focus({ preventScroll: true });
  }
}
