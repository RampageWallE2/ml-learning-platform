import { Component, input, signal } from '@angular/core';

import { ZoneProgress as ZoneProgressData } from '../../progress/progress.types';

@Component({
  selector: 'app-zone-progress',
  imports: [],
  templateUrl: './zone-progress.html',
  styleUrl: './zone-progress.scss',
})
export class ZoneProgress {
  zone = input.required<ZoneProgressData>();
  expanded = signal(false);
  toggle() : void {
    this.expanded.update(value => !value)
  }
}
