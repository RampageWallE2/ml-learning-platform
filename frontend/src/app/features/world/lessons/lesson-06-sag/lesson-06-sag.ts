import {
  afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef,
  inject, Injector, output, signal, viewChild,
} from '@angular/core';

type Stage = 'observe' | 'cancel' | 'squares' | 'weight' | 'duplicate' | 'average' | 'discovery'
  | 'practice-square' | 'practice-average' | 'practice-checked' | 'review' | 'success';
type Cancellation = 'constant' | 'balanced' | 'missing';
type Weight = 'twice' | 'four' | 'unchanged';
type Summary = 'total' | 'per-record' | 'signed';
type PracticeSummary = 'same' | 'double' | 'zero';

const ORIGINAL = [98, 100, 100, 102] as const;
const PRACTICE_SETS: readonly (readonly number[])[] = [
  [99, 99, 101, 101], [98, 98, 102, 102], [100, 100, 102, 102],
];

@Component({
  selector: 'app-lesson-06-sag',
  templateUrl: './lesson-06-sag.html',
  styleUrl: './lesson-06-sag.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Lesson06Sag {
  readonly completed = output<void>();
  readonly stage = signal<Stage>('observe');
  readonly feedback = signal('');
  readonly squaresFormed = signal(false);
  readonly duplicated = signal(false);
  readonly duplicateViewed = signal(false);
  readonly round = signal(0);
  readonly practiceHelped = signal(false);
  readonly original = ORIGINAL;
  readonly ticks = [98, 99, 100, 101, 102];
  readonly squareOptions = [-4, 2, 4];
  readonly practicing = computed(() => ['practice-square', 'practice-average', 'practice-checked', 'review'].includes(this.stage()));
  readonly comparingCopy = computed(() => ['duplicate', 'average'].includes(this.stage()));
  readonly records = computed<readonly number[]>(() => this.practicing()
    ? PRACTICE_SETS[this.round() % PRACTICE_SETS.length] : this.original);
  readonly values = computed<readonly number[]>(() => this.comparingCopy() && this.duplicated()
    ? this.records().flatMap(value => [value, value]) : this.records());
  readonly mean = computed(() => this.records().reduce((sum, value) => sum + value, 0) / this.records().length);
  readonly deviations = computed(() => this.values().map(value => value - this.mean()));
  readonly deviationSum = computed(() => this.deviations().reduce((sum, value) => sum + value, 0));
  readonly deviationExpression = computed(() => this.deviations()
    .map(value => value < 0 ? '−' + Math.abs(value) : String(value)).join(' + '));
  readonly squareSum = computed(() => this.deviations().reduce((sum, value) => sum + value * value, 0));
  readonly sourceSquareSum = computed(() => this.records().reduce((sum, value) => sum + (value - this.mean()) ** 2, 0));
  readonly variance = computed(() => this.sourceSquareSum() / this.records().length);
  readonly squaresVisible = computed(() => this.squaresFormed()
    && !['observe', 'cancel', 'practice-square'].includes(this.stage()));
  readonly comparisonVisible = computed(() => ['average', 'discovery', 'practice-average', 'practice-checked', 'review'].includes(this.stage()));
  readonly comparisonSolved = computed(() => ['discovery', 'practice-checked', 'review'].includes(this.stage())
    || this.stage() === 'practice-average' && this.feedback() !== '');
  readonly step = computed(() => ['observe', 'cancel'].includes(this.stage()) ? 1
    : ['squares', 'weight'].includes(this.stage()) ? 2 : 3);
  readonly plotDescription = computed(() => (this.comparingCopy() && this.duplicated() ? 'Copia de experimento. ' : '')
    + 'Registros: ' + this.values().join(', ') + ' toneladas por hora. Media ' + this.mean()
    + '. Cada punto representa un registro; los puntos apilados tienen el mismo valor. Escala de 98 a 102.');
  readonly points = computed(() => this.values().map((value, index) => ({
    id: (this.comparingCopy() && this.duplicated() ? 'copy-' : 'record-') + index,
    value, deviation: value - this.mean(), square: (value - this.mean()) ** 2,
    side: Math.abs(value - this.mean()),
    cells: Array.from({ length: (value - this.mean()) ** 2 }, (_, cell) => cell),
    x: this.position(value),
    bottom: 28 + this.values().slice(0, index).filter(previous => previous === value).length * 20,
  })));
  readonly practiceDeviation = computed(() => this.records()[0] - this.mean());
  readonly practiceSquare = computed(() => this.practiceDeviation() ** 2);
  readonly practiceSquareOptions = computed(() => {
    const options = [this.practiceSquare(), -this.practiceSquare(), this.practiceSquare() * 2];
    const offset = (this.round() + 1) % options.length;
    return options.map((_, index) => options[(index + offset) % options.length]);
  });
  readonly cancellations: readonly { id: Cancellation; text: string }[] = [
    { id: 'constant', text: 'Sí. Todos los registros fueron iguales a 100.' },
    { id: 'balanced', text: 'No. Hubo diferencias, pero los signos se compensaron.' },
    { id: 'missing', text: 'No podemos saberlo porque faltan los registros.' },
  ];
  readonly weights: readonly { id: Weight; text: string }[] = [
    { id: 'twice', text: 'El doble: pasa de 1 a 2 casillas.' },
    { id: 'four', text: 'Cuatro veces: pasa de 1 a 4 casillas.' },
    { id: 'unchanged', text: 'Lo mismo: sigue aportando 1 casilla.' },
  ];
  readonly summaries: readonly { id: Summary; text: string }[] = [
    { id: 'total', text: 'Comparar solo las sumas: 16 significa más dispersión que 8.' },
    { id: 'per-record', text: 'Comparar el promedio de cuadrados por registro.' },
    { id: 'signed', text: 'Volver a la suma de desviaciones: 0 significa que no hubo cambios.' },
  ];
  // Keep the order fixed within a question, but vary it between attempts and rounds.
  private readonly choiceOffset = Math.floor(Math.random() * 3);
  readonly practiceSummaries = computed<readonly { id: PracticeSummary; text: string }[]>(() => {
    const choices: { id: PracticeSummary; text: string }[] = [
      { id: 'double', text: 'Se duplica' },
      { id: 'zero', text: 'Se vuelve cero' },
      { id: 'same', text: 'Se mantiene igual' },
    ];
    const offset = (this.choiceOffset + this.round()) % choices.length;
    return choices.map((_, index) => choices[(index + offset) % choices.length]);
  });
  private readonly injector = inject(Injector);
  private readonly taskHeading = viewChild<ElementRef<HTMLHeadingElement>>('taskHeading');
  private readonly practiceFeedback = viewChild<ElementRef<HTMLDivElement>>('practiceFeedback');
  private finished = false;

  position(value: number): number { return (value - 98) / 4 * 100; }
  signed(value: number): string { return value < 0 ? '−' + Math.abs(value) : value > 0 ? '+' + value : '0'; }
  cellCount(value: number): string { return (value < 0 ? '−' + Math.abs(value) : value) + (Math.abs(value) === 1 ? ' casilla' : ' casillas'); }

  sumChanges(): void {
    if (this.stage() === 'observe') this.moveTo('cancel');
  }

  chooseCancellation(answer: Cancellation): void {
    if (this.stage() !== 'cancel' || !this.cancellations.some(choice => choice.id === answer)) return;
    if (answer === 'balanced') this.moveTo('squares');
    else this.hint(answer === 'constant'
      ? 'Los registros siguen a la vista: hay 98 y 102, no solo 100. El −2 y el +2 se compensaron al sumarlos; eso no borra las diferencias.'
      : 'Tenemos los cuatro registros. El 0 viene de sumar cambios en lados contrarios, no de que falten datos.');
  }

  formSquares(): void {
    if (this.stage() !== 'squares') return;
    this.squaresFormed.set(true);
    this.feedback.set('');
    this.focusTask();
  }

  answerSquare(answer: number): void {
    if (this.stage() !== 'squares' || !this.squaresFormed() || !this.squareOptions.includes(answer)) return;
    if (answer === 4) this.moveTo('weight');
    else this.hint(answer < 0
      ? 'El signo − indica el lado de la media. La separación es 2; un cuadrado de 2 por 2 tiene 4 casillas, no un área negativa.'
      : 'Cuenta dos filas de dos casillas. Multiplicamos 2 × 2: son 4 casillas, no 2.');
  }

  chooseWeight(answer: Weight): void {
    if (this.stage() !== 'weight' || !this.weights.some(choice => choice.id === answer)) return;
    if (answer === 'four') this.moveTo('duplicate');
    else this.hint('Con separación 1, el cuadrado tiene 1 × 1 = 1 casilla. Con separación 2, tiene 2 × 2 = 4. La separación se duplicó, pero el aporte pasó de 1 a 4.');
  }

  setDuplicated(value: boolean): void {
    if (this.stage() !== 'duplicate' || typeof value !== 'boolean') return;
    this.duplicated.set(value);
    if (value) this.duplicateViewed.set(true);
    this.feedback.set('');
  }

  compareCopy(): void {
    if (this.stage() !== 'duplicate') return;
    if (!this.duplicateViewed() || !this.duplicated()) {
      this.hint('Pulsa «Duplicar en una copia» para comparar 4 registros con 8. No son nuevas mediciones.');
      return;
    }
    this.moveTo('average');
  }

  chooseSummary(answer: Summary): void {
    if (this.stage() !== 'average' || !this.summaries.some(choice => choice.id === answer)) return;
    if (answer === 'per-record') this.moveTo('discovery');
    else this.hint(answer === 'total'
      ? 'La copia repite los mismos valores en las mismas proporciones. La suma creció porque contamos el doble de registros, no porque se separen más de la media.'
      : 'Las desviaciones siguen compensándose. Para medir la dispersión, conservamos los cuadrados y los promediamos.');
  }

  startPractice(): void {
    if (this.stage() !== 'discovery') return;
    this.practiceHelped.set(false);
    this.moveTo('practice-square');
  }

  answerPracticeSquare(answer: number): void {
    if (this.stage() !== 'practice-square' || !this.practiceSquareOptions().includes(answer)) return;
    if (answer === this.practiceSquare()) this.moveTo('practice-average');
    else this.hint('La desviación es ' + this.signed(this.practiceDeviation()) + ' t/h. Su separación es '
      + Math.abs(this.practiceDeviation()) + ': el cuadrado tiene '
      + Math.abs(this.practiceDeviation()) + ' × ' + Math.abs(this.practiceDeviation()) + ' = '
      + this.cellCount(this.practiceSquare()) + '. El aporte no es negativo.');
  }

  choosePracticeSummary(answer: PracticeSummary): void {
    if (this.stage() !== 'practice-average' || !this.practiceSummaries().some(choice => choice.id === answer)) return;
    if (answer === 'same') this.moveTo('practice-checked');
    else this.hint(answer === 'double'
      ? 'La suma y la cantidad de registros se duplican juntas. El promedio de cuadrados sigue siendo ' + this.variance() + ' (t/h)².'
      : 'La suma de desviaciones da 0, pero la varianza promedia sus cuadrados. Aquí es ' + this.variance() + ' (t/h)², no 0.');
  }

  continuePractice(): void {
    if (this.stage() !== 'practice-checked') return;
    this.moveTo(this.practiceHelped() ? 'review' : 'success');
  }

  continueAfterHelp(): void {
    if (this.stage() !== 'review') return;
    this.round.update(round => round + 1);
    this.practiceHelped.set(false);
    this.moveTo('practice-square');
  }

  private hint(message: string): void {
    if (this.practicing()) this.practiceHelped.set(true);
    this.feedback.set(message);
    if (this.practicing()) {
      afterNextRender(() => this.practiceFeedback()?.nativeElement.focus(), { injector: this.injector });
    }
  }

  private moveTo(stage: Stage): void {
    this.feedback.set('');
    this.stage.set(stage);
    this.focusTask();
  }

  private focusTask(): void {
    afterNextRender(() => this.taskHeading()?.nativeElement.focus(), { injector: this.injector });
  }

  finish(): void {
    if (this.stage() !== 'success' || this.finished) return;
    this.finished = true;
    this.completed.emit();
  }
}
