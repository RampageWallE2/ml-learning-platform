import {
  afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef,
  inject, Injector, output, signal, viewChild,
} from '@angular/core';
import { LESSON_NAMES } from '../lesson-catalog';

type Stage = 'spread' | 'goal' | 'recommend' | 'transfer-intro' | 'transfer' | 'review' | 'success';
type PeriodId = 'A' | 'B';
type PeriodChoice = PeriodId | 'same';
type Recommendation = 'reference' | 'stable' | 'adjust';
type Records = Readonly<{ goal: number; A: readonly number[]; B: readonly number[] }>;

const ORIGINAL: Records = { goal: 100, A: [80, 80, 80, 80, 80, 80], B: [98, 98, 98, 102, 102, 102] };
const PRACTICE: readonly Records[] = [
  { goal: 120, A: [117, 117, 120, 120, 120, 126], B: [100, 100, 100, 100, 100, 100] },
  { goal: 90, A: [70, 70, 70, 70, 70, 70], B: [88, 88, 88, 92, 92, 92] },
];
const TRANSFER: readonly Records[] = [
  { goal: 100, A: [99, 99, 99, 101, 101, 101], B: [98, 98, 98, 102, 102, 102] },
  { goal: 104, A: [102, 102, 102, 106, 106, 106], B: [103, 103, 103, 105, 105, 105] },
  { goal: 120, A: [119, 119, 119, 121, 121, 121], B: [117, 117, 120, 120, 120, 126] },
];

function describe(id: PeriodId, values: readonly number[], goal: number) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return { id, values, mean, variance, range: Math.max(...values) - Math.min(...values),
    standardDeviation: Math.sqrt(variance), goalDistance: Math.abs(mean - goal) };
}

function summarize(records: Records) {
  return [describe('A', records.A, records.goal), describe('B', records.B, records.goal)] as const;
}

@Component({
  selector: 'app-lesson-09-thickeners',
  templateUrl: './lesson-09-thickeners.html',
  styleUrl: './lesson-09-thickeners.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Lesson09Thickeners {
  readonly title = LESSON_NAMES['lesson-09'];
  readonly completed = output<void>();
  readonly stage = signal<Stage>('spread');
  readonly round = signal(0);
  readonly helped = signal(false);
  readonly answered = signal(false);
  readonly feedback = signal('');
  readonly isTransfer = computed(() => ['transfer-intro', 'transfer', 'review'].includes(this.stage()));
  readonly mainRecords = computed(() => this.round() === 0 || this.stage() === 'success'
    ? ORIGINAL : PRACTICE[(this.round() - 1) % PRACTICE.length]);
  readonly records = computed(() => this.isTransfer() ? TRANSFER[this.round() % TRANSFER.length] : this.mainRecords());
  readonly periods = computed(() => summarize(this.records()));
  readonly originalPeriods = summarize(ORIGINAL);
  readonly lessSpread = computed(() => this.periods().reduce((a, b) => a.variance < b.variance ? a : b).id);
  readonly closerToGoal = computed(() => summarize(this.mainRecords()).reduce((a, b) => a.goalDistance < b.goalDistance ? a : b).id);
  readonly step = computed(() => this.stage() === 'spread' ? 1 : this.stage() === 'goal' ? 2
    : this.stage() === 'recommend' ? 3 : 4);
  readonly ticks = computed(() => {
    const all = [...this.records().A, ...this.records().B, this.records().goal];
    const min = Math.min(...all); const max = Math.max(...all);
    // Aim for three intervals, using simple marks even when the records change.
    const interval = Math.max(1, (max - min) / 3);
    const magnitude = 10 ** Math.floor(Math.log10(interval));
    const step = [1, 2, 5, 10].map(value => value * magnitude)
      .find(value => value >= interval)!;
    const first = Math.floor(min / step) * step;
    const last = Math.ceil(max / step) * step;
    return Array.from({ length: Math.round((last - first) / step) + 1 },
      (_, index) => first + index * step);
  });
  readonly bounds = computed(() => {
    const all = [...this.records().A, ...this.records().B, this.records().goal];
    const padding = Math.max(2, (Math.max(...all) - Math.min(...all)) * .12);
    const ticks = this.ticks();
    return { min: ticks[0] - padding, max: ticks[ticks.length - 1] + padding };
  });
  readonly plots = computed(() => this.periods().map(period => ({ ...period,
    points: period.values.map((value, index) => ({ id: index, value, x: this.position(value),
      bottom: 28 + period.values.slice(0, index).filter(previous => previous === value).length * 20 })),
  })));
  readonly question = computed(() => ({
    spread: '¿Cuál varió menos?', goal: '¿Cuál se acercó a la meta?', recommend: '¿Qué dirías al siguiente turno?',
    'transfer-intro': '¿Y si ambos cumplen?', transfer: 'Elige una referencia',
    review: 'Prueba con otros registros', success: 'Informe listo para el siguiente turno',
  })[this.stage()]);
  readonly choices = computed<readonly { id: PeriodChoice; text: string }[]>(() => [
    { id: 'A', text: this.stage() === 'transfer' ? 'Usar A como referencia' : 'Período A' },
    { id: 'B', text: this.stage() === 'transfer' ? 'Usar B como referencia' : 'Período B' },
    { id: 'same', text: this.stage() === 'transfer' ? 'Da igual: el mismo promedio basta' : 'Los dos por igual' },
  ]);
  readonly recommendations = computed<readonly { id: Recommendation; text: string }[]>(() => {
    const choices: { id: Recommendation; text: string }[] = [
      { id: 'stable', text: 'Elegir ' + (this.closerToGoal() === 'A' ? 'B' : 'A') + ': no cambió, así que es mejor.' },
      { id: 'reference', text: 'Usar ' + this.closerToGoal() + ' como referencia y buscar por qué el otro quedó bajo la meta.' },
      { id: 'adjust', text: 'Cambiar los ajustes ya: todos los registros deben ser ' + this.mainRecords().goal + ' t/h.' },
    ];
    return choices.map((_, index) => choices[(index + this.round()) % choices.length]);
  });
  private readonly injector = inject(Injector);
  private readonly taskHeading = viewChild<ElementRef<HTMLHeadingElement>>('taskHeading');
  private finished = false;

  position(value: number): number {
    return (value - this.bounds().min) / (this.bounds().max - this.bounds().min) * 100;
  }

  plotDescription(id: PeriodId): string {
    const period = this.periods().find(period => period.id === id)!;
    return 'Período ' + id + ': ' + period.values.join(', ') + ' t/h. Promedio ' + period.mean
      + ', meta de promedio ' + this.records().goal + ', rango ' + period.range
      + ', varianza ' + period.variance + ' (t/h) al cuadrado, desviación estándar '
      + period.standardDeviation + ' t/h. Misma escala que el otro período. Cada punto es un registro; los apilados tienen el mismo valor.';
  }

  choosePeriod(answer: PeriodChoice): void {
    if (!['spread', 'goal', 'transfer'].includes(this.stage()) || this.answered()
      || !this.choices().some(choice => choice.id === answer)) return;
    const expected = this.stage() === 'goal' ? this.closerToGoal() : this.lessSpread();
    if (answer !== expected) { this.requestHint(); return; }
    const period = this.periods().find(period => period.id === expected)!;
    this.answered.set(true);
    this.feedback.set(this.stage() === 'spread'
      ? expected + ' no cambió entre registros: su rango y su desviación estándar son 0. Eso no dice si cumple la meta.'
      : this.stage() === 'goal'
        ? 'El promedio de ' + expected + ' es ' + period.mean + ' t/h, igual a la meta. El promedio del otro período quedó por debajo.'
        : 'Ambos promedios cumplen la meta y ambos períodos tuvieron cambios. Para este caso elegimos ' + expected
          + ': su desviación estándar es menor (' + period.standardDeviation + ' t/h). Varió menos, pero eso no garantiza el siguiente turno.');
  }

  chooseRecommendation(answer: Recommendation): void {
    if (this.stage() !== 'recommend' || this.answered()
      || !this.recommendations().some(choice => choice.id === answer)) return;
    if (answer !== 'reference') {
      this.requestHint();
      if (answer === 'adjust') this.feedback.set('La meta es para el promedio, no para cada registro. Estos datos no dicen qué ajuste hacer. Primero hay que buscar las causas.');
      return;
    }
    this.answered.set(true);
    this.feedback.set('La referencia es ' + this.closerToGoal()
      + ' en estos registros. Antes de cambiar ajustes, necesitamos saber por qué hubo cambios y qué tanto pueden variar. Esto no asegura el resultado del próximo turno.');
  }

  requestHint(): void {
    if (this.answered() || !['spread', 'goal', 'recommend', 'transfer'].includes(this.stage())) return;
    this.helped.set(true);
    this.feedback.set(this.stage() === 'spread'
      ? 'Mira los puntos apilados: todos tienen el mismo valor. En ese período, rango y desviación estándar son 0.'
      : this.stage() === 'goal'
        ? 'Compara el promedio de cada período con la línea de meta, no solo cuánto varió. ¿Qué promedio coincide con ' + this.records().goal + ' t/h?'
        : this.stage() === 'recommend'
          ? 'No cambiar no basta: un período puede variar poco y quedar bajo la meta. Usa los datos para elegir una referencia. Primero hay que buscar las causas, antes de ajustar.'
          : 'Ambos promedios cumplen y ambos períodos cambian. Compara sus desviaciones estándar: la menor indica menos variación. El mismo promedio no basta.');
  }

  continue(): void {
    if (!this.answered()) return;
    if (this.stage() === 'spread') this.moveTo('goal');
    else if (this.stage() === 'goal') this.moveTo('recommend');
    else if (this.stage() === 'recommend') this.moveTo('transfer-intro');
    else if (this.stage() === 'transfer') this.moveTo(this.helped() ? 'review' : 'success');
  }

  startTransfer(): void {
    if (this.stage() === 'transfer-intro') this.moveTo('transfer');
  }

  continueAfterHelp(): void {
    if (this.stage() !== 'review') return;
    this.round.update(round => round + 1);
    this.helped.set(false);
    this.moveTo('spread');
  }

  finish(): void {
    if (this.stage() !== 'success' || this.finished) return;
    this.finished = true;
    this.completed.emit();
  }

  private moveTo(stage: Stage): void {
    this.answered.set(false);
    this.feedback.set('');
    this.stage.set(stage);
    afterNextRender(() => {
      const heading = this.taskHeading()?.nativeElement;
      heading?.focus();
      if (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 860px)').matches) {
        heading?.scrollIntoView({ block: 'start' });
      }
    }, { injector: this.injector });
  }
}
