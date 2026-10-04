import {
  afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef,
  inject, Injector, output, signal, viewChild,
} from '@angular/core';

type Stage = 'explore' | 'compare' | 'notation' | 'practice' | 'review' | 'report' | 'success';
type Comparison = 'same' | 'lower-closer' | 'higher-farther';
type ReadingId = 'a' | 'b' | 'c';
type Report = 'observed' | 'constant' | 'cause';
type Reading = Readonly<{ id: ReadingId; deviation: number; distance: number }>;

const ORIGINAL = [80, 80, 120, 120] as const;
const PRACTICE_SETS: readonly (readonly number[])[] = [
  [90, 100, 110], [100, 110, 120], [80, 100, 120],
];
const PRACTICE_ORDER = [0, 2, 1] as const;

@Component({
  selector: 'app-lesson-05-crushing',
  templateUrl: './lesson-05-crushing.html',
  styleUrl: './lesson-05-crushing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Lesson05Crushing {
  readonly completed = output<void>();
  readonly stage = signal<Stage>('explore');
  readonly feedback = signal('');
  readonly selected = signal(0);
  readonly round = signal(0);
  readonly solvedCount = signal(0);
  readonly practiceHelped = signal(false);
  readonly original = ORIGINAL;
  readonly ticks = [80, 90, 100, 110, 120];
  readonly distanceOptions = [10, 20, 80];
  readonly practicing = computed(() => ['practice', 'review'].includes(this.stage()));
  readonly values = computed<readonly number[]>(() => this.practicing()
    ? PRACTICE_SETS[this.round() % PRACTICE_SETS.length] : this.original);
  readonly mean = computed(() => this.values().reduce((sum, value) => sum + value, 0) / this.values().length);
  readonly activeIndex = computed<number | null>(() => this.practicing()
    ? PRACTICE_ORDER[Math.min(this.solvedCount(), 2)]
    : this.stage() === 'explore' ? this.selected() : null);
  readonly current = computed(() => this.activeIndex() === null ? null : this.values()[this.activeIndex()!]);
  readonly delta = computed(() => (this.current() ?? this.mean()) - this.mean());
  readonly step = computed(() => this.stage() === 'explore' ? 1 : ['compare', 'notation'].includes(this.stage()) ? 2 : 3);
  readonly plotDescription = computed(() => 'Registros: ' + this.values().join(', ')
    + ' toneladas por hora. Media ' + this.mean() + '. Cada punto representa un registro; los puntos apilados tienen el mismo valor. Escala de 80 a 120.'
    + (this.current() === null ? '' : ' Registro seleccionado: ' + this.current() + '.'));
  readonly points = computed(() => this.values().map((value, index) => ({
    id: index, value, x: this.position(value),
    bottom: 32 + this.values().slice(0, index).filter(previous => previous === value).length * 22,
    active: this.activeIndex() === index,
  })));
  readonly segments = computed(() => {
    const pair = ['compare', 'notation', 'report'].includes(this.stage());
    const values = pair ? [80, 120] : this.current() === null ? [] : [this.current()!];
    return values.map(value => ({
      value, left: this.position(Math.min(value, this.mean())),
      width: Math.abs(this.position(value) - this.position(this.mean())),
      zero: value === this.mean(), above: value > this.mean(),
      label: pair ? '20 t/h' : '',
    }));
  });
  readonly readingChoices = computed<readonly Reading[]>(() => {
    const delta = this.delta();
    const distance = Math.abs(delta);
    const candidates = [
      { deviation: delta, distance },
      { deviation: delta === 0 ? 10 : -delta, distance },
      { deviation: delta, distance: delta === 0 ? 10 : -distance },
    ];
    const offset = (this.solvedCount() + this.round()) % candidates.length;
    return (['a', 'b', 'c'] as const).map((id, index) => ({
      id, ...candidates[(index + offset) % candidates.length],
    }));
  });
  readonly comparisons: readonly { id: Comparison; text: string }[] = [
    { id: 'higher-farther', text: '120 está más lejos porque es un número mayor.' },
    { id: 'same', text: 'Ambos están a 20 de la media, en lados contrarios.' },
    { id: 'lower-closer', text: '80 está más cerca porque es un número menor.' },
  ];
  readonly reports: readonly { id: Report; text: string }[] = [
    { id: 'constant', text: 'La alimentación se mantuvo en 100 t/h durante las cuatro horas.' },
    { id: 'observed', text: 'El promedio fue 100 t/h: hubo dos horas 20 por debajo y dos horas 20 por encima.' },
    { id: 'cause', text: 'Las diferencias demuestran que el chancador falló.' },
  ];
  private readonly injector = inject(Injector);
  private readonly taskHeading = viewChild<ElementRef<HTMLHeadingElement>>('taskHeading');
  private finished = false;

  position(value: number): number { return (value - 80) / 40 * 100; }
  signed(value: number): string { return value < 0 ? '−' + Math.abs(value) : value > 0 ? '+' + value : '0'; }

  select(index: number): void {
    if (this.stage() !== 'explore' || !Number.isInteger(index) || index < 0 || index >= this.original.length) return;
    this.selected.set(index);
    this.feedback.set('');
  }

  answerDistance(answer: number): void {
    if (this.stage() !== 'explore' || !this.distanceOptions.includes(answer)) return;
    if (answer === Math.abs(this.delta())) this.moveTo('compare');
    else this.hint('Mira el tramo entre ' + this.current() + ' y ' + this.mean()
      + ': hay dos pasos de 10. La separación es 20 t/h; no es el valor completo del registro.');
  }

  compare(answer: Comparison): void {
    if (this.stage() !== 'compare' || !this.comparisons.some(choice => choice.id === answer)) return;
    if (answer === 'same') this.moveTo('notation');
    else this.hint('De 80 a 100 hay 20, y de 100 a 120 también hay 20. Estar por debajo o por encima indica el lado, no una separación mayor o menor.');
  }

  startPractice(): void {
    if (this.stage() !== 'notation') return;
    this.solvedCount.set(0);
    this.practiceHelped.set(false);
    this.moveTo('practice');
  }

  chooseReading(answer: ReadingId): void {
    if (this.stage() !== 'practice') return;
    const choice = this.readingChoices().find(choice => choice.id === answer);
    if (!choice) return;
    const delta = this.delta();
    if (choice.distance !== Math.abs(delta)) {
      this.hint(delta === 0
        ? 'Este registro coincide con la media. No hay separación: la desviación y la distancia son 0.'
        : 'La distancia mide cuánto separa el registro de la media. Nunca es negativa: aquí es ' + Math.abs(delta) + ' t/h.');
    } else if (choice.deviation !== delta) {
      this.hint(delta === 0
        ? 'Este registro coincide con la media. No está por debajo ni por encima: la desviación es 0.'
        : 'El registro ' + this.current() + ' está ' + Math.abs(delta) + ' '
          + (delta < 0 ? 'por debajo' : 'por encima') + ' de ' + this.mean()
          + '. Su desviación es ' + this.signed(delta) + ' t/h.');
    } else {
      this.solvedCount.update(count => count + 1);
      this.moveTo(this.solvedCount() < 3 ? 'practice' : this.practiceHelped() ? 'review' : 'report');
    }
  }

  continueAfterHelp(): void {
    if (this.stage() !== 'review') return;
    this.round.update(round => round + 1);
    this.solvedCount.set(0);
    this.practiceHelped.set(false);
    this.moveTo('practice');
  }

  chooseReport(answer: Report): void {
    if (this.stage() !== 'report' || !this.reports.some(choice => choice.id === answer)) return;
    if (answer === 'observed') this.moveTo('success');
    else this.hint(answer === 'constant'
      ? '100 es el promedio, no lo que ocurrió en cada hora. Los registros fueron 80, 80, 120 y 120 t/h.'
      : 'Los registros muestran diferencias, pero no explican su causa. Necesitamos más información para saber por qué cambió la alimentación.');
  }

  private hint(message: string): void {
    if (this.stage() === 'practice') this.practiceHelped.set(true);
    this.feedback.set(message);
  }

  private moveTo(stage: Stage): void {
    this.feedback.set('');
    this.stage.set(stage);
    afterNextRender(() => this.taskHeading()?.nativeElement.focus(), { injector: this.injector });
  }

  finish(): void {
    if (this.stage() !== 'success' || this.finished) return;
    this.finished = true;
    this.completed.emit();
  }
}
