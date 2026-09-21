import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AccountMenu } from '../../../../auth/components/account-menu/account-menu';
import { ProgressService } from '../../progress.service';


@Component({
  selector: 'app-progress-page',
  imports: [
    RouterLink,
    AccountMenu
  ],
  templateUrl: './progress-page.html',
  styleUrl: './progress-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgressPage implements OnInit {

  private readonly progress =
    inject(ProgressService);


  readonly loading =
    signal(true);


  readonly loadError =
    signal<string | null>(null);


  readonly openPit =
    computed(() =>
      this.progress.zoneProgress()
        .find(zone => zone.id === 'zone-01') ??
      null
    );


  readonly nextLesson =
    computed(() =>
      this.openPit()?.lessons.find(
        lesson => lesson.status === 'current'
      ) ?? null
    );


  ngOnInit(): void {
    this.loadProgress();
  }


  retry(): void {
    this.loadProgress();
  }


  private loadProgress(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.progress.loadProgress()
      .pipe(
        finalize(() =>
          this.loading.set(false)
        )
      )
      .subscribe({
        error: () => {
          this.loadError.set(
            'No pudimos cargar tu progreso. Comprueba la conexión e inténtalo nuevamente.'
          );
        }
      });
  }
}
