import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { ZoneProgress as ZoneProgressData } from '../../progress/progress.types';

@Component({
  selector: 'app-zone-progress',
  imports: [],
  templateUrl: './zone-progress.html',
  styleUrl: './zone-progress.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown.escape)': 'collapse($event)' },
})
export class ZoneProgress {
  private static nextPanelId = 0;

  readonly lessonsId = `zone-progress-lessons-${++ZoneProgress.nextPanelId}`;
  readonly reportAvailable = input(false);
  readonly finalTaskPending = input(false);
  readonly reportRequested = output<void>();
  readonly shortObjective = input<string | null>(null);
  private readonly toggleButton = viewChild<ElementRef<HTMLButtonElement>>('toggleButton');

  zone = input<ZoneProgressData | null>(null);

  name = input.required<string>();

  topic = input.required<string>();

  objective = input.required<string>();

  expanded = signal(false);

  hasLessons = computed(() => (this.zone()?.lessons.length ?? 0) > 0);

  completed = computed(() => !!this.zone()?.completed && !this.finalTaskPending());

  readonly nextLessonNumber = computed(() => {
    const index = this.zone()?.lessons.findIndex((lesson) => lesson.status !== 'completed') ?? -1;

    return index >= 0 ? index + 1 : null;
  });

  constructor() {
    let previousContext: string | undefined;

    effect(() => {
      const context = JSON.stringify([this.zone()?.id ?? null, this.name()]);

      if (context !== previousContext) {
        this.expanded.set(false);
        previousContext = context;
      }
    });
  }

  /* =========================
     EXPANDIR / CONTRAER
     ========================= */

  toggle(): void {
    this.expanded.update((value) => !value);
  }

  collapse(event: Event): void {
    if (!this.expanded()) return;
    event.preventDefault();
    event.stopPropagation();
    this.expanded.set(false);
    this.toggleButton()?.nativeElement.focus();
  }
}
