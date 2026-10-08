import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef,
  inject, Injector, input, OnChanges, output, signal, SimpleChanges, viewChild,
} from '@angular/core';
import { LESSON_NAMES } from '../lesson-catalog';
import { calculatePopulationStatistics, calculateRange } from '../lesson-statistics';
import { C7_BALLS_RECORDS as ORIGINAL } from '../data/open-pit-original-records';
import { C7Stage as Stage, C7PeriodId as PeriodId, C7Prediction as Prediction,
  C7HintFocus as HintFocus, C7State, C7_MAX_PRACTICE_ROUNDS, isC7State } from './lesson-07-balls.state';

type ReportChoice = 'equal' | 'spread' | 'lower';
type Pair = readonly [readonly number[], readonly number[]];

const PRACTICE_PAIRS: readonly Pair[] = [
  [[96, 96, 104, 104], [96, 100, 100, 104]],
  [[101, 104, 104, 104, 104, 107], [101, 101, 104, 104, 107, 107]],
  [[102, 102, 106, 106], [102, 104, 104, 106]],
];

function describePeriod(id: PeriodId, values: readonly number[]) {
  const { mean, deviations, squares, squareSum, variance } = calculatePopulationStatistics(values);
  return {
    id, name: id === 'a' ? 'Período A' : 'Período B', values, mean, deviations, squares, squareSum,
    range: calculateRange(values),
    variance,
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
  imports: [NgTemplateOutlet],
  templateUrl: './lesson-07-balls.html',
  styleUrl: './lesson-07-balls.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Lesson07Balls implements OnChanges {
  readonly title = LESSON_NAMES['lesson-07'];
  readonly completed = output<void>();
  readonly initialState = input<C7State | null>(null);
  readonly stateChanged = output<C7State>();
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
  readonly needsPractice = computed(() => this.helped() && this.round() < C7_MAX_PRACTICE_ROUNDS);
  readonly guidedCompletion = computed(() => this.stage() === 'success' && this.helped());
  readonly hintLevel = signal<0 | 1 | 2>(0);
  readonly hintFocus = signal<HintFocus | null>(null);
  readonly hintShown = computed(() => this.hintLevel() === 2);
  readonly hintButtonText = computed(() => this.hintLevel() === 0 ? 'Necesito una pista'
    : this.stage() === 'calculate' ? 'Ver el cálculo explicado' : 'Ver una explicación');
  // Choose an order once per attempt; hints and incorrect answers never move the buttons.
  private readonly choiceOffset = signal(Math.floor(Math.random() * 3));
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
    const offset = (this.choiceOffset() + this.round() + this.activeIndex()) % answers.length;
    return answers.map((_, index) => answers[(index + offset) % answers.length]);
  });
  // C7 compares variances; the squares support the calculation, not a memory test.
  readonly squaresVisible = computed(() => ['calculate', 'checked'].includes(this.stage()));
  readonly higherPeriod = computed(() => this.periods()[0].variance > this.periods()[1].variance
    ? this.periods()[0] : this.periods()[1]);
  readonly lowerPeriod = computed(() => this.periods()[0].variance < this.periods()[1].variance
    ? this.periods()[0] : this.periods()[1]);
  readonly reportChoices = computed<readonly { id: ReportChoice; text: string }[]>(() => {
    const choices: { id: ReportChoice; text: string }[] = [
      { id: 'equal', text: 'Variaron igual: tienen el mismo promedio y rango.' },
      { id: 'lower', text: 'El período ' + this.lowerPeriod().id.toUpperCase() + ' varió más que el ' + this.higherPeriod().id.toUpperCase() + '.' },
      { id: 'spread', text: 'El período ' + this.higherPeriod().id.toUpperCase() + ' varió más: tiene mayor varianza.' },
    ];
    const offset = (this.choiceOffset() + this.round()) % choices.length;
    return choices.map((_, index) => choices[(index + offset) % choices.length]);
  });
  readonly step = computed(() => this.stage() === 'observe' ? 1
    : ['calculate', 'checked'].includes(this.stage()) ? 2 : 3);
  readonly question = computed(() => ({
    observe: '¿En qué período ves más datos lejos del promedio?',
    calculate: `¿Qué varianza tiene el ${this.activePeriod().name}?`,
    checked: `${this.activePeriod().name}: varianza ${this.activePeriod().variance} (t/h)²`,
    report: '¿Qué período tuvo más variación en sus registros?',
    review: this.needsPractice() ? 'Una práctica más' : 'Cerramos el ejemplo con ayuda',
    success: 'El informe ya muestra la diferencia',
  })[this.stage()]);
  private readonly injector = inject(Injector);
  private readonly taskHeading = viewChild<ElementRef<HTMLHeadingElement>>('taskHeading');
  private readonly hintMessage = viewChild<ElementRef<HTMLDivElement>>('hintMessage');
  private finished = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['initialState']) return;
    const state = this.initialState();
    if (state !== null && !isC7State(state)) return;
    if (state) {
      this.stage.set(state.stage); this.round.set(state.round); this.prediction.set(state.prediction);
      this.activeIndex.set(state.activeIndex); this.solved.set([...state.solved]);
      this.helped.set(state.helped); this.hintLevel.set(state.hintLevel); this.hintFocus.set(state.hintFocus);
      this.choiceOffset.set(state.choiceOffset);
    }
    this.finished = false;
    this.feedback.set(state?.hintFocus ? this.hintFeedback(state.hintFocus) : '');
    this.publishState();
  }

  private publishState(): void {
    this.stateChanged.emit({ stage: this.stage(), round: this.round(), prediction: this.prediction(),
      activeIndex: this.activeIndex(), solved: [...this.solved()], helped: this.helped(),
      hintLevel: this.hintLevel(), hintFocus: this.hintFocus(), choiceOffset: this.choiceOffset() });
  }

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
      + period.mean + '. Cada punto es un registro; los puntos uno sobre otro tienen el mismo valor. Escala de '
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
      this.moveTo(this.needsPractice() ? 'review' : 'success');
      return;
    }
    // Both incorrect choices now compare variation. Keep older context hints readable on resume.
    this.hint('variances');
  }

  continueAfterHelp(): void {
    if (this.stage() !== 'review') return;
    // Older drafts may already be in a later review. Close explicitly rather
    // than silently restarting their completed practice or marking it unaided.
    if (!this.needsPractice()) {
      this.moveTo('success');
      return;
    }
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
    this.feedback.set(this.hintFeedback(focus));
    this.publishState();
    afterNextRender(() => this.hintMessage()?.nativeElement.focus(), { injector: this.injector });
  }

  // Rebuild the same explanation on resume without storing UI text or using another hint.
  private hintFeedback(focus: HintFocus): string {
    if (this.hintLevel() === 1) {
      return focus === 'deviations'
        ? 'Mira las tarjetas destacadas: sus datos están por debajo o por encima del promedio. ¿Cuánto se separan de él?'
        : focus === 'count'
          ? 'Cuenta todas las tarjetas, también las que tienen el mismo valor que el promedio. Después de sumar, hay que dividir entre todos los registros.'
          : focus === 'variances'
            ? 'Compara las dos varianzas destacadas. ¿Cuál es mayor? El promedio y el rango no muestran toda la diferencia.'
            : 'Sabemos cuánto varió, pero falta la meta del equipo para decidir qué período fue mejor.';
    }
    if (this.stage() === 'calculate') {
      const period = this.activePeriod();
      return (focus === 'deviations'
        ? 'Las diferencias con + y − suman 0, aunque los datos son distintos. Multiplica cada diferencia por sí misma para contar las casillas. '
        : period.squareSum + ' es el total de casillas. Todavía falta dividir. ')
        + 'El total es ' + period.squareSum + '. Lo dividimos entre los ' + period.values.length + ' registros'
        + (period.zeroCount > 0 ? ', también los ' + period.zeroCount + ' que tienen 0 casillas' : '')
        + '. La varianza es ' + period.squareSum + ' ÷ ' + period.values.length + ' = ' + period.variance + ' (t/h)².';
    } else {
      return focus === 'context'
        ? 'Variar menos no significa trabajar mejor. Falta saber qué meta debe cumplir el equipo y en qué condiciones trabaja. Estos datos muestran cambios, no qué ajuste hacer.'
        : this.higherPeriod().name + ' varió más: su varianza fue ' + this.higherPeriod().variance
          + ' frente a ' + this.lowerPeriod().variance + ' (t/h)². Hubo más registros lejos del promedio, aunque el promedio y el rango sean iguales.';
    }
  }

  private moveTo(stage: Stage): void {
    this.feedback.set('');
    this.hintLevel.set(0);
    this.hintFocus.set(null);
    this.stage.set(stage);
    this.publishState();
    afterNextRender(() => this.taskHeading()?.nativeElement.focus(), { injector: this.injector });
  }

  finish(): void {
    if (this.stage() !== 'success' || this.finished) return;
    this.finished = true;
    this.publishState();
    this.completed.emit();
  }
}
