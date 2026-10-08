import {
  Component,
  computed,
  effect,
  input,
  output,
  signal
} from '@angular/core';

import {
  ZoneProgress as ZoneProgressData
} from '../../progress/progress.types';


@Component({
  selector: 'app-zone-progress',
  imports: [],
  templateUrl: './zone-progress.html',
  styleUrl: './zone-progress.scss',
})
export class ZoneProgress {

  private static nextPanelId = 0;

  readonly lessonsId = `zone-progress-lessons-${++ZoneProgress.nextPanelId}`;
  readonly reportAvailable = input(false);
  readonly finalTaskPending = input(false);
  readonly reportRequested = output<void>();

  zone =
    input<ZoneProgressData | null>(
      null
    );


  name =
    input.required<string>();


  topic =
    input.required<string>();


  objective =
    input.required<string>();


  expanded =
    signal(false);


  hasLessons = computed(() =>
    (
      this.zone()?.lessons.length ??
      0
    ) > 0
  );


  completed = computed(() =>
    !!this.zone()?.completed && !this.finalTaskPending()
  );


  readonly nextLessonNumber = computed(() => {
    const index = this.zone()?.lessons.findIndex(
      lesson => lesson.status !== 'completed'
    ) ?? -1;

    return index >= 0 ? index + 1 : null;
  });


  constructor() {
    let previousZoneId: string | null | undefined;

    effect(() => {
      const zoneId = this.zone()?.id ?? null;

      if (zoneId !== previousZoneId) {
        this.expanded.set(false);
        previousZoneId = zoneId;
      }
    });
  }


  /* =========================
     EXPANDIR / CONTRAER
     ========================= */

  toggle(): void {

    if (!this.hasLessons()) {
      return;
    }

    this.expanded.update(
      value => !value
    );
  }

}
