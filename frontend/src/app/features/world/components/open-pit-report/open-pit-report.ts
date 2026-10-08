import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { OPEN_PIT_REPORT_NOTES, ReportLessonId } from './open-pit-report.data';

@Component({
  selector: 'app-open-pit-report',
  templateUrl: './open-pit-report.html',
  styleUrl: './open-pit-report.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenPitReport {
  readonly confirmedLessonIds = input<readonly string[]>([]);
  readonly pendingLessonIds = input<readonly string[]>([]);
  readonly loadingProgress = input(false);
  readonly closed = output<void>();
  readonly notes = OPEN_PIT_REPORT_NOTES;
  readonly loadTicks = [80, 90, 100, 110, 120];
  private readonly selection = signal<ReportLessonId | null>(null);

  readonly selectedLessonId = computed(() => this.selection()
    ?? this.notes.filter(note => this.confirmedLessonIds().includes(note.lessonId)).at(-1)?.lessonId
    ?? 'lesson-01');
  readonly selectedNote = computed(() => this.notes.find(note => note.lessonId === this.selectedLessonId())!);
  readonly confirmed = computed(() => this.confirmedLessonIds().includes(this.selectedLessonId()));
  readonly pending = computed(() => this.pendingLessonIds().includes(this.selectedLessonId()));
  private readonly visibleGraph = computed(() => this.confirmed() && !this.loadingProgress() ? this.selectedNote().graph : null);

  readonly loadGraph = computed(() => {
    const graph = this.visibleGraph();
    return graph?.kind === 'loads' ? graph : null;
  });
  readonly rangeGraph = computed(() => {
    const graph = this.visibleGraph();
    return graph?.kind === 'range' ? graph : null;
  });
  readonly workshopGraph = computed(() => {
    const graph = this.visibleGraph();
    return graph?.kind === 'workshop' ? graph : null;
  });
  readonly deviationGraph = computed(() => {
    const graph = this.visibleGraph();
    return graph?.kind === 'deviations' ? graph : null;
  });
  readonly varianceGraph = computed(() => {
    const graph = this.visibleGraph();
    return graph?.kind === 'variance' ? graph : null;
  });
  readonly comparisonGraph = computed(() => {
    const graph = this.visibleGraph();
    return graph?.kind === 'variance-comparison' || graph?.kind === 'goal-comparison' ? graph : null;
  });
  readonly standardDeviationGraph = computed(() => {
    const graph = this.visibleGraph();
    return graph?.kind === 'standard-deviation' ? graph : null;
  });
  readonly comparisonPlots = computed(() => this.comparisonGraph()?.series.map((series, row) => ({
    ...series,
    points: series.values.map((value, index) => ({
      x: this.comparisonPosition(value), y: 94 + row * 78 - this.repeatCount(series.values, index) * 14,
    })),
  })) ?? []);
  readonly standardDeviationPoints = computed(() => {
    const graph = this.standardDeviationGraph();
    return graph?.values.map((value, index) => ({
      x: this.standardDeviationPosition(value), y: 68 - this.repeatCount(graph.values, index) * 16,
      outside: value < graph.lower || value > graph.upper,
    })) ?? [];
  });
  readonly rangePoints = computed(() => {
    const graph = this.rangeGraph();
    return graph?.values.map((value, index) => ({
      x: 32 + (value - graph.min) / graph.range * 336,
      y: 60 - graph.values.slice(0, index).filter(previous => previous === value).length * 14,
    })) ?? [];
  });
  readonly workshopPlots = computed(() => this.workshopGraph()?.series.map((series, row) => ({
    ...series,
    points: series.values.map((value, index) => ({
      x: this.workshopPosition(value),
      y: 50 + row * 62 - this.repeatCount(series.values, index) * 14,
    })),
  })) ?? []);
  readonly deviationPoints = computed(() => {
    const graph = this.deviationGraph();
    return graph?.values.map((value, index) => ({
      x: this.deviationPosition(value), y: 48 - this.repeatCount(graph.values, index) * 16,
    })) ?? [];
  });
  readonly varianceRecords = computed(() => {
    const graph = this.varianceGraph();
    return graph?.values.map((value, index) => {
      const x = 50 + index * 100;
      const side = Math.abs(value - graph.mean);
      return {
        value, x, side, square: graph.squares[index],
        cells: Array.from({ length: graph.squares[index] }, (_, cell) => ({
          x: x - (side * 12 - 2) / 2 + (cell % side) * 12,
          y: 52 + Math.floor(cell / side) * 12,
        })),
      };
    }) ?? [];
  });
  readonly graphDescription = computed(() => {
    const graph = this.visibleGraph();
    if (!graph) return '';
    switch (graph.kind) {
      case 'loads': return graph.series.map(series => `${series.label}: ${series.values.join(', ')} toneladas.`).join(' ')
        + ' Un punto por camión. Ambas líneas usan la misma escala, de 80 a 120 toneladas.';
      case 'range': return `Cinco descargas: ${graph.values.join(', ')} minutos. La más corta fue ${graph.min} y la más larga ${graph.max}; diferencia de ${graph.range} minutos.`;
      case 'workshop': return graph.series.map(series => `${series.label}: ${series.values.join(', ')} minutos; rango de ${series.range} minutos.`).join(' ')
        + ` Un punto por revisión. Los puntos apilados tienen el mismo tiempo. Escala común de ${graph.min} a ${graph.max} minutos.`;
      case 'deviations': return `Cuatro horas: ${graph.values.join(', ')} t/h. Promedio ${graph.mean} t/h. Dos registros están ${graph.mean - graph.min} t/h por debajo y dos, ${graph.max - graph.mean} t/h por encima. Un punto por hora; los repetidos se apilan. Escala de ${graph.min} a ${graph.max} t/h.`;
      case 'variance': return `Cuatro registros del SAG: ${graph.values.join(', ')} t/h. Promedio ${graph.mean} t/h. Cuadrados de sus diferencias: ${graph.squares.join(', ')}. Suma ${graph.sum}, dividida entre los cuatro registros: varianza ${graph.variance} (t/h) al cuadrado. Los dos registros que aportan cero también se cuentan. Las casillas no son toneladas de material.`;
      case 'variance-comparison': return graph.series.map(series => `${series.label}: ${series.values.join(', ')} t/h. Promedio ${series.mean}, rango ${series.range} t/h; varianza ${series.variance} (t/h) al cuadrado.`).join(' ')
        + ` Un punto por hora; los repetidos se apilan. Escala común de ${graph.min} a ${graph.max} t/h. B varió más; no demuestra que A trabajó mejor.`;
      case 'standard-deviation': return `Seis horas: ${graph.values.join(', ')} t/h. Promedio ${graph.mean} t/h; varianza ${graph.variance} (t/h) al cuadrado; desviación estándar ${graph.standardDeviation} t/h. Franja ${graph.lower}–${graph.upper} t/h, incluyendo los extremos; 96 está fuera, con punto hueco. Un punto por hora; los repetidos se apilan. La franja no es un límite de seguridad.`;
      case 'goal-comparison': return graph.series.map(series => `${series.label}: ${series.values.join(', ')} t/h. Promedio ${series.mean} t/h; desviación estándar ${series.standardDeviation} t/h.`).join(' ')
        + ` Un punto por hora; los repetidos se apilan. Escala común de ${graph.min} a ${graph.max} t/h. La meta es un promedio de ${graph.goal} t/h, no el valor de cada registro. A varió menos; B alcanzó la meta de promedio.`;
    }
  });

  onLessonChange(event: Event): void {
    if (!(event.target instanceof HTMLSelectElement)) return;
    const value = event.target.value;
    const note = this.notes.find(note => note.lessonId === value);
    if (note) this.selection.set(note.lessonId);
  }

  statusLabel(lessonId: ReportLessonId): string {
    if (this.loadingProgress()) return 'Consultando progreso';
    if (this.confirmedLessonIds().includes(lessonId)) return 'Nota disponible';
    return this.pendingLessonIds().includes(lessonId) ? 'Pendiente de guardar' : 'Pendiente';
  }

  loadPosition(value: number): number { return 72 + (value - 80) / 40 * 308; }

  workshopPosition(value: number): number {
    const graph = this.workshopGraph();
    return graph ? 84 + (value - graph.min) / (graph.max - graph.min) * 292 : 0;
  }

  deviationPosition(value: number): number {
    const graph = this.deviationGraph();
    return graph ? 32 + (value - graph.min) / (graph.max - graph.min) * 336 : 0;
  }

  comparisonPosition(value: number): number {
    const graph = this.comparisonGraph();
    return graph ? 84 + (value - graph.min) / (graph.max - graph.min) * 292 : 0;
  }

  standardDeviationPosition(value: number): number {
    const graph = this.standardDeviationGraph();
    return graph ? 32 + (value - graph.min) / (graph.max - graph.min) * 336 : 0;
  }

  private repeatCount(values: readonly number[], index: number): number {
    return values.slice(0, index).filter(previous => previous === values[index]).length;
  }
}
