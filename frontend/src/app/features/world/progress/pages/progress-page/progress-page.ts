import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';

import { SiteHeader } from '../../../../../shared/ui/site-header/site-header';
import { ProgressService } from '../../progress.service';

@Component({
  selector: 'app-progress-page',
  imports: [RouterLink, SiteHeader],
  templateUrl: './progress-page.html',
  styleUrl: './progress-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressPage {
  private readonly progress = inject(ProgressService);
  private readonly route = inject(ActivatedRoute);
  private readonly routeParams = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly reloadVersion = signal(0);

  readonly zoneId = computed(() => this.routeParams().get('zoneId'));
  readonly scenarios = this.progress.zoneProgress;

  readonly loading = signal(true);

  readonly loadError = signal<string | null>(null);

  readonly selectedZone = computed(
    () => this.scenarios().find((zone) => zone.id === this.zoneId()) ?? null,
  );

  readonly nextLesson = computed(
    () => this.selectedZone()?.lessons.find((lesson) => lesson.status === 'current') ?? null,
  );

  constructor() {
    effect((onCleanup) => {
      const zoneId = this.zoneId();
      this.reloadVersion();

      // Recargar solo al elegir un escenario o reintentar, no al actualizar sus datos.
      const request = untracked(() =>
        zoneId && this.selectedZone() ? this.loadProgress() : null,
      );

      if (request) {
        onCleanup(() => request.unsubscribe());
      } else {
        this.loading.set(false);
        this.loadError.set(null);
      }
    });
  }

  retry(): void {
    this.reloadVersion.update((version) => version + 1);
  }

  private loadProgress(): Subscription {
    this.loading.set(true);
    this.loadError.set(null);

    return this.progress
      .loadProgress()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        error: () => {
          this.loadError.set(
            'No pudimos cargar tu progreso. Comprueba la conexión e inténtalo nuevamente.',
          );
        },
      });
  }
}
