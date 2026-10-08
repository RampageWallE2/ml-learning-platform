import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  OnChanges,
  output,
  signal,
  SimpleChanges,
  viewChild,
} from '@angular/core';
import { LESSON_NAMES } from '../lesson-catalog';
import { calculatePopulationStatistics } from '../lesson-statistics';
import { C6_SAG_RECORDS as ORIGINAL } from '../data/open-pit-original-records';

import {
  C6Stage as Stage,
  C6State,
  C6_MAX_PRACTICE_ROUNDS,
  readC6State,
} from './lesson-06-sag.state';
type Cancellation = 'constant' | 'balanced' | 'missing';
type Weight = 'twice' | 'four' | 'unchanged';

const PRACTICE_SETS: readonly (readonly number[])[] = [
  [99, 99, 101, 101],
  [98, 98, 102, 102],
  [100, 100, 102, 102],
];

@Component({
  selector: 'app-lesson-06-sag',
  imports: [NgTemplateOutlet],
  templateUrl: './lesson-06-sag.html',
  styleUrl: './lesson-06-sag.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Lesson06Sag implements OnChanges {
  readonly title = LESSON_NAMES['lesson-06'];
  readonly completed = output<void>();
  readonly initialState = input<C6State | null>(null);
  readonly stateChanged = output<C6State>();
  readonly stage = signal<Stage>('observe');
  readonly feedback = signal('');
  readonly squaresFormed = signal(false);
  readonly round = signal(0);
  readonly practiceHelped = signal(false);
  readonly needsPractice = computed(
    () => this.practiceHelped() && this.round() < C6_MAX_PRACTICE_ROUNDS,
  );
  readonly guidedCompletion = computed(() => this.stage() === 'success' && this.practiceHelped());
  readonly practiceVarianceAnswered = signal(false);
  readonly original = ORIGINAL;
  readonly ticks = [98, 99, 100, 101, 102];
  readonly squareOptions = [-4, 2, 4];
  readonly practicing = computed(() =>
    ['practice-square', 'practice-checked', 'review'].includes(this.stage()),
  );
  readonly records = computed<readonly number[]>(() =>
    this.practicing() ? PRACTICE_SETS[this.round() % PRACTICE_SETS.length] : this.original,
  );
  private readonly sourceStatistics = computed(() => calculatePopulationStatistics(this.records()));
  readonly mean = computed(() => this.sourceStatistics().mean);
  readonly deviations = computed(() => this.sourceStatistics().deviations);
  readonly deviationSum = computed(() => this.deviations().reduce((sum, value) => sum + value, 0));
  readonly deviationExpression = computed(() =>
    this.deviations()
      .map((value) => (value < 0 ? '−' + Math.abs(value) : String(value)))
      .join(' + '),
  );
  readonly squareSum = computed(() => this.sourceStatistics().squareSum);
  readonly squareExpression = computed(() => this.sourceStatistics().squares.join(' + '));
  readonly variance = computed(() => this.sourceStatistics().variance);
  readonly squaresVisible = computed(
    () => this.squaresFormed() && !['observe', 'cancel', 'practice-square'].includes(this.stage()),
  );
  readonly averageVisible = computed(() =>
    ['discovery', 'practice-checked', 'review'].includes(this.stage()),
  );
  readonly averageSolved = computed(
    () =>
      ['discovery', 'review'].includes(this.stage()) ||
      (this.stage() === 'practice-checked' && this.practiceVarianceAnswered()),
  );
  readonly step = computed(() =>
    ['observe', 'cancel'].includes(this.stage())
      ? 1
      : ['squares', 'weight'].includes(this.stage())
        ? 2
        : 3,
  );
  readonly question = computed(
    () =>
      ({
        observe: '¿Qué pasa al sumar las diferencias?',
        cancel: '¿Todos los datos fueron iguales?',
        squares: this.squaresFormed()
          ? '¿Cuántas casillas tiene este cuadrado?'
          : '¿Por qué usamos cuadrados?',
        weight: 'Si la separación pasa de 1 a 2…',
        discovery: 'La varianza es un promedio de cuadrados',
        'practice-square': '¿Cuántas casillas tendría el cuadrado?',
        'practice-checked': this.practiceVarianceAnswered()
          ? `Exacto: ${this.squareSum()} ÷ ${this.records().length} = ${this.variance()}`
          : '¿Cuántas casillas hay por registro, en promedio?',
        review: 'Los cuadrados también se promedian',
        success: 'Construiste la varianza',
      })[this.stage()],
  );
  readonly showMainRecords = computed(
    () =>
      ['observe', 'cancel'].includes(this.stage()) ||
      (this.stage() === 'squares' && !this.squaresFormed()),
  );
  readonly plotDescription = computed(
    () =>
      'Registros: ' +
      this.records().join(', ') +
      ' toneladas por hora. Promedio ' +
      this.mean() +
      '. Cada punto representa un registro; los puntos uno sobre otro tienen el mismo valor. Escala de 98 a 102.',
  );
  readonly points = computed(() =>
    this.records().map((value, index) => ({
      id: 'record-' + index,
      value,
      deviation: value - this.mean(),
      square: (value - this.mean()) ** 2,
      side: Math.abs(value - this.mean()),
      cells: Array.from({ length: (value - this.mean()) ** 2 }, (_, cell) => cell),
      x: this.position(value),
      bottom:
        28 +
        this.records()
          .slice(0, index)
          .filter((previous) => previous === value).length *
          20,
    })),
  );
  readonly practiceDeviation = computed(() => this.records()[0] - this.mean());
  readonly practiceSquare = computed(() => this.practiceDeviation() ** 2);
  readonly practiceSquareOptions = computed(() => {
    const options = [this.practiceSquare(), -this.practiceSquare(), this.practiceSquare() * 2];
    const offset = (this.round() + 1) % options.length;
    return options.map((_, index) => options[(index + offset) % options.length]);
  });
  readonly cancellations: readonly { id: Cancellation; text: string }[] = [
    { id: 'constant', text: 'Sí. Todos los registros fueron iguales a 100.' },
    { id: 'balanced', text: 'No. Hay datos distintos, aunque la suma dé 0.' },
    { id: 'missing', text: 'No podemos saberlo: faltan datos.' },
  ];
  readonly weights: readonly { id: Weight; text: string }[] = [
    { id: 'twice', text: 'El doble: pasa de 1 a 2 casillas.' },
    { id: 'four', text: 'Cuatro veces: pasa de 1 a 4 casillas.' },
    { id: 'unchanged', text: 'Lo mismo: sigue teniendo 1 casilla.' },
  ];
  // Keep the order fixed within a question, but vary it between attempts and rounds.
  private readonly choiceOffset = signal(Math.floor(Math.random() * 3));
  readonly practiceVarianceOptions = computed(() => {
    const choices = [0, this.variance(), this.squareSum()];
    const offset = (this.choiceOffset() + this.round()) % choices.length;
    return choices.map((_, index) => choices[(index + offset) % choices.length]);
  });
  private readonly injector = inject(Injector);
  private readonly taskHeading = viewChild<ElementRef<HTMLHeadingElement>>('taskHeading');
  private readonly practiceFeedback = viewChild<ElementRef<HTMLDivElement>>('practiceFeedback');
  private finished = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['initialState']) return;
    const state = readC6State(this.initialState());
    if (state) {
      this.stage.set(state.stage);
      this.squaresFormed.set(state.squaresFormed);
      this.round.set(state.round);
      this.practiceHelped.set(state.practiceHelped);
      this.practiceVarianceAnswered.set(state.practiceVarianceAnswered);
      this.choiceOffset.set(state.choiceOffset);
      this.feedback.set('');
      this.finished = false;
    }
    this.publishState();
  }

  private publishState(): void {
    this.stateChanged.emit({
      stage: this.stage(),
      squaresFormed: this.squaresFormed(),
      round: this.round(),
      practiceHelped: this.practiceHelped(),
      practiceVarianceAnswered: this.practiceVarianceAnswered(),
      choiceOffset: this.choiceOffset(),
    });
  }

  position(value: number): number {
    return ((value - 98) / 4) * 100;
  }
  signed(value: number): string {
    return value < 0 ? '−' + Math.abs(value) : value > 0 ? '+' + value : '0';
  }
  cellCount(value: number): string {
    return (
      (value < 0 ? '−' + Math.abs(value) : value) +
      (Math.abs(value) === 1 ? ' casilla' : ' casillas')
    );
  }

  sumChanges(): void {
    if (this.stage() === 'observe') this.moveTo('cancel');
  }

  chooseCancellation(answer: Cancellation): void {
    if (this.stage() !== 'cancel' || !this.cancellations.some((choice) => choice.id === answer))
      return;
    if (answer === 'balanced') this.moveTo('squares');
    else
      this.hint(
        answer === 'constant'
          ? 'Mira los datos: hay 98 y 102, no solo 100. Al sumar −2 y +2 obtenemos 0, pero los datos siguen siendo distintos.'
          : 'Tenemos los cuatro registros. La suma da 0 porque −2 y +2 se compensan, no porque falten datos.',
      );
  }

  formSquares(): void {
    if (this.stage() !== 'squares') return;
    this.squaresFormed.set(true);
    this.feedback.set('');
    this.publishState();
    this.focusTask();
  }

  answerSquare(answer: number): void {
    if (this.stage() !== 'squares' || !this.squaresFormed() || !this.squareOptions.includes(answer))
      return;
    if (answer === 4) this.moveTo('weight');
    else
      this.hint(
        answer < 0
          ? 'El − indica que el dato está por debajo del promedio. El lado mide 2: 2 × 2 = 4 casillas. La cantidad de casillas no puede ser negativa.'
          : 'Cuenta dos filas de dos casillas: 2 × 2 = 4. El lado mide 2, pero hay 4 casillas en total.',
      );
  }

  chooseWeight(answer: Weight): void {
    if (this.stage() !== 'weight' || !this.weights.some((choice) => choice.id === answer)) return;
    if (answer === 'four') this.moveTo('discovery');
    else
      this.hint(
        'Mira los cuadrados: 1 × 1 = 1 casilla y 2 × 2 = 4. El lado se duplicó, pero las casillas pasaron de 1 a 4.',
      );
  }

  startPractice(): void {
    if (this.stage() !== 'discovery') return;
    this.practiceHelped.set(false);
    this.practiceVarianceAnswered.set(false);
    this.moveTo('practice-square');
  }

  answerPracticeSquare(answer: number): void {
    if (this.stage() !== 'practice-square' || !this.practiceSquareOptions().includes(answer))
      return;
    if (answer === this.practiceSquare()) this.moveTo('practice-checked');
    else
      this.hint(
        'El dato está a ' +
          Math.abs(this.practiceDeviation()) +
          ' t/h del promedio. El cuadrado tiene ' +
          Math.abs(this.practiceDeviation()) +
          ' × ' +
          Math.abs(this.practiceDeviation()) +
          ' = ' +
          this.cellCount(this.practiceSquare()) +
          '. Las casillas no pueden ser negativas.',
      );
  }

  answerPracticeVariance(answer: number): void {
    if (
      this.stage() !== 'practice-checked' ||
      this.practiceVarianceAnswered() ||
      !this.practiceVarianceOptions().includes(answer)
    )
      return;
    if (answer === this.variance()) {
      this.practiceVarianceAnswered.set(true);
      this.feedback.set('');
      this.publishState();
      this.focusTask();
    } else
      this.hint(
        answer === 0
          ? '0 sería tener todos los datos iguales al promedio. Aquí hay casillas: suma y divide entre los ' +
              this.records().length +
              ' registros.'
          : answer +
              ' es la suma de casillas, no el promedio. Divide entre los ' +
              this.records().length +
              ' registros.',
      );
  }

  continuePractice(): void {
    if (this.stage() !== 'practice-checked' || !this.practiceVarianceAnswered()) return;
    this.moveTo(this.needsPractice() ? 'review' : 'success');
  }

  continueAfterHelp(): void {
    if (this.stage() !== 'review') return;
    // Old review drafts have already finished their practice. Keep the help
    // flag and offer an explicit finish instead of adding another round.
    if (!this.needsPractice()) {
      this.moveTo('success');
      return;
    }
    this.round.update((round) => round + 1);
    this.practiceHelped.set(false);
    this.practiceVarianceAnswered.set(false);
    this.moveTo('practice-square');
  }

  private hint(message: string): void {
    if (this.practicing()) this.practiceHelped.set(true);
    this.feedback.set(message);
    this.publishState();
    if (this.practicing()) {
      afterNextRender(() => this.practiceFeedback()?.nativeElement.focus(), {
        injector: this.injector,
      });
    }
  }

  private moveTo(stage: Stage): void {
    this.feedback.set('');
    this.stage.set(stage);
    this.publishState();
    this.focusTask();
  }

  private focusTask(): void {
    afterNextRender(() => this.taskHeading()?.nativeElement.focus(), { injector: this.injector });
  }

  finish(): void {
    if (this.stage() !== 'success' || this.finished) return;
    this.finished = true;
    this.publishState();
    this.completed.emit();
  }
}
