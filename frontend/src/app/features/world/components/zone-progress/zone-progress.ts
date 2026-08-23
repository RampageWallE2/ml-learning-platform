import {
  Component,
  computed,
  input,
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

  zone =
    input.required<ZoneProgressData>();


  expanded =
    signal(false);


  /* =========================
     LECCIÓN ACTUAL
     ========================= */

  currentLesson = computed(() =>
    this.zone().lessons.find(
      lesson =>
        lesson.status === 'current'
    ) ?? null
  );


  /* =========================
     OBJETIVO ACTUAL
     ========================= */

  currentObjective = computed(() =>
    this.currentLesson()?.objective ??
    null
  );


  /* =========================
     EXPANDIR / CONTRAER
     ========================= */

  toggle(): void {

    this.expanded.update(
      value => !value
    );
  }

}