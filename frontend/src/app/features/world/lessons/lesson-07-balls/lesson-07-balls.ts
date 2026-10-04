import {
  afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef,
  inject, Injector, output, signal, viewChild,
} from '@angular/core';

type Stage = 'observe' | 'calculate' | 'checked' | 'report' | 'review' | 'success';
type PeriodId = 'a' | 'b';
type Prediction = PeriodId | 'equal';
type ReportChoice = 'equal' | 'spread' | 'better';
type HintFocus = 'deviations' | 'count' | 'variances' | 'context';
type Pair = readonly [readonly number[], readonly number[]];

const ORIGINAL: Pair = [
  [97, 100, 100, 100, 100, 103],
  [97, 97, 100, 100, 103, 103],
];
const PRACTICE_PAIRS: readonly Pair[] = [
  [[96, 96, 104, 104], [96, 100, 100, 104]],
  [[101, 104, 104, 104, 104, 107], [101, 101, 104, 104, 107, 107]],
  [[102, 102, 106, 106], [102, 104, 104, 106]],
];

function describePeriod(id: PeriodId, values: readonly number[]) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const deviations = values.map(value => value - mean);
  const squares = deviations.map(value => value * value);
  const squareSum = squares.reduce((sum, value) => sum + value, 0);
  return {
    id, name: id === 'a' ? 'Período A' : 'Período B', values, mean, deviations, squares, squareSum,
    range: Math.max(...values) - Math.min(...values),
    variance: squareSum / values.length,
    zeroCount: deviations.filter(value => value === 0).length,
    records: values.map((value, index) => ({
      id: id + '-' + index, value, deviation: deviations[index], square: squares[index],
      side: Math.abs(deviations[index]),
      cells: Array.from({ length: squares[index] }, (_, cell) => cell),
    })),
  };
}
type Period = ReturnType<typeof describePeriod>;

@Component({
  selector: 'app-lesson-07-balls',
  templateUrl: './lesson-07-balls.html',
  styleUrl: './lesson-07-balls.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Lesson07Balls {
  readonly completed = output<void>();
  readonly stage = signal<Stage>('observe');
  readonly feedback = signal('');
  readonly round = signal(0);
  readonly prediction = signal<Prediction | null>(null);
  readonly predictions: readonly { id: Prediction; text: string }[] = [
    { id: 'a', text: 'Período A' },
    { id: 'b', text: 'Período B' },
    { id: 'equal', text: 'Se ven iguales' },
  ];
  readonly predictionText = computed(() => this.predictions.find(choice => choice.id === this.prediction())?.text ?? '');
  readonly activeIndex = signal(0);
  readonly solved = signal<readonly PeriodId[]>([]);
  readonly helped = signal(false);
  readonly hintLevel = signal<0 | 1 | 2>(0);
  readonly hintFocus = signal<HintFocus | null>(null);
  readonly hintShown = computed(() => this.hintLevel() === 2);
  readonly hintButtonText = computed(() => this.hintLevel() === 0 ? 'Necesito una pista'
    : this.stage() === 'calculate' ? 'Ver el cálculo explicado' : 'Ver una explicación');
  // Choose an order once per attempt; hints and incorrect answers never move the buttons.
  private readonly choiceOffset = Math.floor(Math.random() * 3);
  readonly originalPeriods = [describePeriod('a', ORIGINAL[0]), describePeriod('b', ORIGINAL[1])];
  readonly pair = computed(() => this.stage() === 'success' || this.round() === 0
    ? ORIGINAL : PRACTICE_PAIRS[(this.round() - 1) % PRACTICE_PAIRS.length]);
  readonly periods = computed(() => [describePeriod('a', this.pair()[0]), describePeriod('b', this.pair()[1])]);
  readonly activePeriod = computed(() => this.periods()[this.activeIndex()]);
  readonly bounds = computed(() => ({
    min: Math.min(...this.pair().flat()), max: Math.max(...this.pair().flat()),
  }));
  readonly ticks = computed(() => [this.bounds().min, (this.bounds().min + this.bounds().max) / 2, this.bounds().max]);
  readonly options = computed(() => {
    const period = this.activePeriod();
    const answers = [0, period.variance, period.squareSum];
    const offset = (this.choiceOffset + this.round() + this.activeIndex()) % answers.length;
    return answers.map((_, index) => answers[(index + offset) % answers.length]);
  });
  readonly squaresVisible = computed(() => this.stage() === 'checked'
    || this.stage() === 'calculate' && this.hintShown());
  readonly higherPeriod = computed(() => this.periods()[0].variance > this.periods()[1].variance
    ? this.periods()[0] : this.periods()[1]);
  readonly lowerPeriod = computed(() => this.periods()[0].variance < this.periods()[1].variance
    ? this.periods()[0] : this.periods()[1]);
  readonly reportChoices = computed<readonly { id: ReportChoice; text: string }[]>(() => {
    const choices: { id: ReportChoice; text: string }[] = [
      { id: 'equal', text: 'Variaron igual: tienen el mismo promedio y rango.' },
      { id: 'better', text: 'El período ' + this.lowerPeriod().id.toUpperCase() + ' trabajó mejor: tiene menor varianza.' },
      { id: 'spread', text: 'El período ' + this.higherPeriod().id.toUpperCase() + ' varió más: hay más puntos lejos del promedio.' },
    ];
    const offset = (this.choiceOffset + this.round()) % choices.length;
    return choices.map((_, index) => choices[(index + offset) % choices.length]);
  });
  readonly step = computed(() => this.stage() === 'observe' ? 1
    : ['calculate', 'checked'].includes(this.stage()) ? 2 : 3);
  private readonly injector = inject(Injector);
  private readonly taskHeading = viewChild<ElementRef<HTMLHeadingElement>>('taskHeading');
  private readonly hintMessage = viewChild<ElementRef<HTMLDivElement>>('hintMessage');
  private finished = false;

  position(value: number): number {
    return (value - this.bounds().min) / (this.bounds().max - this.bounds().min) * 100;
  }

  points(period: Period) {
    return period.values.map((value, index) => ({
      id: period.id + '-' + index, x: this.position(value), deviation: value - period.mean,
      bottom: 28 + period.values.slice(0, index).filter(previous => previous === value).length * 20,
    }));
  }

  signed(value: number): string {
    return value < 0 ? '−' + Math.abs(value) : value > 0 ? '+' + value : '0';
  }

  plotDescription(period: Period): string {
    return period.name + ': ' + period.values.join(', ') + ' toneladas por hora. Promedio '
      + period.mean + '. Cada punto es un registro; los apilados tienen el mismo valor. Escala de '
      + this.bounds().min + ' a ' + this.bounds().max + '.';
  }

  isSolved(id: PeriodId): boolean { return this.solved().includes(id); }

  isHintRecord(deviation: number): boolean {
    return this.stage() === 'calculate' && this.hintLevel() === 1
      && (this.hintFocus() === 'count' || this.hintFocus() === 'deviations' && deviation !== 0);
  }

  choosePrediction(answer: Prediction): void {
    if (this.stage() !== 'observe' || this.prediction() !== null
      || !this.predictions.some(choice => choice.id === answer)) return;
    this.prediction.set(answer);
    this.startCalculation();
  }

  startCalculation(): void {
    if (this.stage() === 'observe' && this.prediction() !== null) this.moveTo('calculate');
  }

  answerVariance(answer: number): void {
    if (this.stage() !== 'calculate' || !this.options().includes(answer)) return;
    const period = this.activePeriod();
    if (answer === period.variance) {
      this.solved.update(solved => [...solved, period.id]);
      this.moveTo('checked');
      return;
    }
    this.hint(answer === 0 ? 'deviations' : 'count');
  }

  requestHint(): void {
    if (!['calculate', 'report'].includes(this.stage())) return;
    this.hint(this.hintFocus() ?? (this.stage() === 'calculate' ? 'deviations' : 'variances'));
  }

  continueCalculation(): void {
    if (this.stage() !== 'checked' || !this.isSolved(this.activePeriod().id)) return;
    if (this.activeIndex() === 0) {
      this.activeIndex.set(1);
      this.moveTo('calculate');
    } else if (this.isSolved('a') && this.isSolved('b')) {
      this.moveTo('report');
    }
  }

  chooseReport(answer: ReportChoice): void {
    if (this.stage() !== 'report' || !this.isSolved('a') || !this.isSolved('b')
      || !this.reportChoices().some(choice => choice.id === answer)) return;
    if (answer === 'spread') {
      this.moveTo(this.helped() ? 'review' : 'success');
      return;
    }
    this.hint(answer === 'equal' ? 'variances' : 'context');
  }

  continueAfterHelp(): void {
    if (this.stage() !== 'review') return;
    this.round.update(round => round + 1);
    this.activeIndex.set(0);
    this.solved.set([]);
    this.helped.set(false);
    this.prediction.set(null);
    this.moveTo('observe');
  }

  private hint(focus: HintFocus): void {
    this.helped.set(true);
    this.hintFocus.set(focus);
    this.hintLevel.update(level => level === 0 ? 1 : 2);
    afterNextRender(() => this.hintMessage()?.nativeElement.focus(), { injector: this.injector });
    if (this.hintLevel() === 1) {
      this.feedback.set(focus === 'deviations'
        ? 'Mira las tarjetas destacadas: sus registros no coinciden con el promedio. Compara sus separaciones antes de sumar.'
        : focus === 'count'
          ? 'Cuenta todas las tarjetas, también las que coinciden con el promedio. Estamos buscando un promedio, no solo una suma.'
          : focus === 'variances'
            ? 'Mira las dos varianzas destacadas. Compara esas medidas, no solo el promedio y el rango.'
            : 'Sabemos cuánto varió, pero falta la meta del equipo para decidir qué período fue mejor.');
      return;
    }
    if (this.stage() === 'calculate') {
      const period = this.activePeriod();
      this.feedback.set((focus === 'deviations'
        ? 'Los signos se compensan, pero eso no borra las diferencias. Usamos los cuadrados: lado × lado. '
        : period.squareSum + ' es la suma de cuadrados, no su promedio. ')
        + 'Sumamos ' + period.squareSum + ' y dividimos entre los ' + period.values.length + ' registros'
        + (period.zeroCount > 0 ? ', incluidos los ' + period.zeroCount + ' que coinciden con el promedio' : '')
        + '. La varianza es ' + period.squareSum + ' ÷ ' + period.values.length + ' = ' + period.variance + ' (t/h)².');
    } else {
      this.feedback.set(focus === 'context'
        ? 'Variar menos no significa trabajar mejor. Falta saber qué meta debe cumplir el equipo y en qué condiciones trabaja. Estos datos muestran cambios, no qué ajuste hacer.'
        : this.higherPeriod().name + ' varió más: su varianza fue ' + this.higherPeriod().variance
          + ' frente a ' + this.lowerPeriod().variance + ' (t/h)². Hubo más registros lejos del promedio, aunque el promedio y el rango sean iguales.');
    }
  }

  private moveTo(stage: Stage): void {
    this.feedback.set('');
    this.hintLevel.set(0);
    this.hintFocus.set(null);
    this.stage.set(stage);
    afterNextRender(() => this.taskHeading()?.nativeElement.focus(), { injector: this.injector });
  }

  finish(): void {
    if (this.stage() !== 'success' || this.finished) return;
    this.finished = true;
    this.completed.emit();
  }
}
