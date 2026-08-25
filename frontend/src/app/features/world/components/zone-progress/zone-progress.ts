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
    this.zone()?.completed ??
    false
  );


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
