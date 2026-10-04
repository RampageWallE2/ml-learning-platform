import {
  afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef,
  inject, Injector, output, signal, viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

type Stage = 'observe' | 'root' | 'checked' | 'locate' | 'located' | 'report' | 'review' | 'success';
type ReportChoice = 'units' | 'inside' | 'observed';

const ORIGINAL = [96, 100, 100, 100, 102, 102] as const;
const PRACTICE: readonly (readonly number[])[] = [
  [97, 97, 100, 100, 100, 106],
  [102, 102, 106, 106, 106, 114],
  [100, 104, 104, 104, 106, 106],
];

function describe(values: readonly number[]) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const squares = values.map(value => (value - mean) ** 2);
  const squareSum = squares.reduce((sum, value) => sum + value, 0);
  const variance = squareSum / values.length;
  const standardDeviation = Math.sqrt(variance);
  return {
    values, mean, squares, squareSum, variance, standardDeviation,
    lower: mean - standardDeviation, upper: mean + standardDeviation,
    outside: values.filter(value => Math.abs(value - mean) > standardDeviation),
  };
}

@Component({
  selector: 'app-lesson-08-flotation',
  imports: [NgTemplateOutlet],
  templateUrl: './lesson-08-flotation.html',
  styleUrl: './lesson-08-flotation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Lesson08Flotation {
  readonly completed = output<void>();
  readonly stage = signal<Stage>('observe');
  readonly feedback = signal('');
  readonly round = signal(0);
  readonly helped = signal(false);
  readonly selectedRecord = signal<number | null>(null);
  readonly comparing = signal(false);
  readonly sourceRecords = computed<readonly number[]>(() => this.stage() === 'success' || this.round() === 0
    ? ORIGINAL : PRACTICE[(this.round() - 1) % PRACTICE.length]);
  readonly comparisonRecords = computed(() => {
    const stats = describe(this.sourceRecords());
    return [stats.lower, stats.lower, stats.lower, stats.upper, stats.upper, stats.upper];
  });
  readonly records = computed<readonly number[]>(() => this.comparing()
    ? this.comparisonRecords() : this.sourceRecords());
  readonly stats = computed(() => describe(this.records()));
  readonly originalStats = describe(ORIGINAL);
  readonly rootKnown = computed(() => ['checked', 'locate', 'located', 'report', 'review', 'success'].includes(this.stage()));
  readonly bandVisible = computed(() => ['locate', 'located', 'report', 'review', 'success'].includes(this.stage()));
  readonly bandExplained = computed(() => ['located', 'report', 'review', 'success'].includes(this.stage()));
  readonly step = computed(() => this.stage() === 'observe' ? 1
    : ['root', 'checked'].includes(this.stage()) ? 2
      : ['locate', 'located'].includes(this.stage()) ? 3 : 4);
  readonly bounds = computed(() => ({
    min: Math.min(...this.records(), this.stats().lower) - 1,
    max: Math.max(...this.records(), this.stats().upper) + 1,
  }));
  readonly ticks = computed(() => [Math.min(...this.records()), this.stats().mean, Math.max(...this.records())]);
  readonly cells = computed(() => Array.from({ length: this.stats().variance }, (_, index) => index));
  // Keep the order stable during an attempt; change it on replay and new practice.
  private readonly choiceOffset = Math.floor(Math.random() * 3);
  readonly options = computed(() => {
    const stats = this.stats();
    const choices = [stats.standardDeviation === 4 ? 2 : 1, stats.standardDeviation, stats.variance];
    const offset = (this.choiceOffset + this.round()) % choices.length;
    return choices.map((_, index) => choices[(index + offset) % choices.length]);
  });
  readonly reportChoices = computed<readonly { id: ReportChoice; text: string }[]>(() => {
    const stats = this.stats();
    const choices: { id: ReportChoice; text: string }[] = [
      { id: 'units', text: 'La desviación estándar es ' + stats.variance + ' t/h: uso la varianza sin cambiarla.' },
      { id: 'inside', text: 'La desviación estándar es ' + stats.standardDeviation + ' t/h: todos los registros están dentro.' },
      { id: 'observed', text: 'La desviación estándar es ' + stats.standardDeviation + ' t/h: hay un registro fuera de la franja.' },
    ];
    const offset = (this.choiceOffset + this.round()) % choices.length;
    return choices.map((_, index) => choices[(index + offset) % choices.length]);
  });
  private readonly injector = inject(Injector);
  private readonly taskHeading = viewChild<ElementRef<HTMLHeadingElement>>('taskHeading');
  private readonly feedbackPanel = viewChild<ElementRef<HTMLDivElement>>('feedbackPanel');
  private finished = false;

  position(value: number): number {
    return (value - this.bounds().min) / (this.bounds().max - this.bounds().min) * 100;
  }

  readonly points = computed(() => this.records().map((value, index) => ({
    id: index, value, x: this.position(value),
    bottom: 28 + this.records().slice(0, index).filter(previous => previous === value).length * 22,
    outside: Math.abs(value - this.stats().mean) > this.stats().standardDeviation,
  })));

  plotDescription(): string {
    const stats = this.stats();
    return (this.comparing() ? 'Ejemplo de comparación. ' : 'Alimentación de flotación: ')
      + this.records().join(', ') + ' toneladas por hora. Promedio '
      + stats.mean + '. Cada punto es un registro; los apilados tienen el mismo valor.'
      + (this.bandVisible() ? ' Franja de ' + stats.lower + ' a ' + stats.upper
        + ' toneladas por hora, incluidos sus bordes. No indica si el trabajo está bien o mal.' : '')
      + (this.bandExplained() ? ' Registros fuera: ' + (stats.outside.join(', ') || 'ninguno') + '.' : '');
  }

  startRoot(): void {
    if (this.stage() === 'observe') this.moveTo('root');
  }

  answerRoot(answer: number): void {
    if (this.stage() !== 'root' || !this.options().includes(answer)) return;
    if (answer === this.stats().standardDeviation) {
      this.moveTo('checked');
    } else {
      this.hint(answer + ' × ' + answer + ' = ' + answer * answer + ', no '
        + this.stats().variance + '. Busca el lado del cuadrado, no el total de casillas. Puedes contarlas por fila.');
    }
  }

  requestHint(): void {
    if (this.stage() !== 'root') return;
    const side = this.stats().standardDeviation;
    this.hint('Hay ' + side + ' casillas por fila y ' + side + ' filas. '
      + side + ' × ' + side + ' = ' + this.stats().variance
      + '. El total representa la varianza; el lado nos devuelve a t/h.');
  }

  continueToBand(): void {
    if (this.stage() === 'checked') this.moveTo('locate');
  }

  selectRecord(index: number): void {
    if (this.stage() !== 'locate' || this.comparing() || !Number.isInteger(index) || index < 0 || index >= this.records().length) return;
    const value = this.records()[index];
    const stats = this.stats();
    if (Math.abs(value - stats.mean) > stats.standardDeviation) {
      this.selectedRecord.set(index);
      this.moveTo('located');
      return;
    }
    this.hint(value === stats.lower || value === stats.upper
      ? value + ' t/h está en el borde de la franja. Los bordes también están dentro. Busca un valor menor que '
        + stats.lower + ' o mayor que ' + stats.upper + ' t/h.'
      : value + ' t/h está dentro de la franja. Busca un valor menor que '
        + stats.lower + ' o mayor que ' + stats.upper + ' t/h.');
  }

  continueToReport(): void {
    if (this.stage() !== 'located') return;
    if (!this.comparing()) {
      this.comparing.set(true);
      this.moveTo('locate');
    } else {
      this.comparing.set(false);
      this.moveTo('report');
    }
  }

  answerComparison(answer: 'inside' | 'outside'): void {
    if (this.stage() !== 'locate' || !this.comparing() || !['inside', 'outside'].includes(answer)) return;
    if (answer === 'inside') {
      this.moveTo('located');
    } else {
      const stats = this.stats();
      this.hint('Los puntos están en ' + stats.lower + ' y ' + stats.upper
        + ' t/h. Son los bordes de la franja y también cuentan como dentro. Aquí no hay ninguno fuera.');
    }
  }

  chooseReport(answer: ReportChoice): void {
    if (this.stage() !== 'report' || !this.reportChoices().some(choice => choice.id === answer)) return;
    if (answer === 'observed') {
      this.moveTo(this.helped() ? 'review' : 'success');
      return;
    }
    const stats = this.stats();
    this.hint(answer === 'units'
      ? 'La varianza es ' + stats.variance + ' (t/h)². Su raíz es ' + stats.standardDeviation
        + ' t/h: cambia el valor y vuelven las unidades originales.'
      : 'Mira el registro de ' + stats.outside[0] + ' t/h: está fuera de '
        + stats.lower + ' a ' + stats.upper
        + '. La franja puede contener todos los registros o dejar alguno fuera: hay que mirar los datos.');
  }

  continueAfterHelp(): void {
    if (this.stage() !== 'review') return;
    this.round.update(round => round + 1);
    this.helped.set(false);
    this.selectedRecord.set(null);
    this.comparing.set(false);
    this.moveTo('root');
  }

  finish(): void {
    if (this.stage() !== 'success' || this.finished) return;
    this.finished = true;
    this.completed.emit();
  }

  private hint(message: string): void {
    this.helped.set(true);
    this.feedback.set(message);
    afterNextRender(() => this.feedbackPanel()?.nativeElement.focus(), { injector: this.injector });
  }

  private moveTo(stage: Stage): void {
    this.feedback.set('');
    this.stage.set(stage);
    afterNextRender(() => this.taskHeading()?.nativeElement.focus(), { injector: this.injector });
  }
}
