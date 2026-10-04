import {
  afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef,
  inject, Injector, output, signal, viewChild,
} from '@angular/core';

type Stage = 'extremes' | 'measure' | 'discovery' | 'practice-extremes' | 'practice-range' | 'practice-meaning' | 'review' | 'success';
type Meaning = 'separation' | 'maximum' | 'every';
type TripRecord = Readonly<{ id: string; time: number }>;

const TRIPS: readonly TripRecord[] = [
  { id: 'trip-1', time: 11 }, { id: 'trip-2', time: 12 },
  { id: 'trip-3', time: 11 }, { id: 'trip-4', time: 18 }, { id: 'trip-5', time: 12 },
];
const PRACTICE_SETS: readonly (readonly TripRecord[])[] = [
  [14, 10, 12, 15, 11], [13, 9, 15, 11, 12], [12, 8, 16, 11, 13],
].map((times, round) => times.map((time, index) => ({ id: 'practice-' + round + '-' + (index + 1), time })));

@Component({
  selector: 'app-lesson-03-haulage',
  templateUrl: './lesson-03-haulage.html',
  styleUrl: './lesson-03-haulage.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Lesson03Haulage {
  readonly completed = output<void>();
  readonly stage = signal<Stage>('extremes');
  readonly feedback = signal('');
  readonly selectedMinId = signal<string | null>(null);
  readonly selectedMaxId = signal<string | null>(null);
  readonly round = signal(0);
  readonly practiceHelped = signal(false);
  readonly trips = TRIPS;
  readonly barMaximum = 20;
  readonly practiceTrips = computed(() => PRACTICE_SETS[this.round() % PRACTICE_SETS.length]);
  readonly practicing = computed(() => this.stage().startsWith('practice-') || this.stage() === 'review');
  readonly records = computed(() => this.practicing() ? this.practiceTrips() : this.trips);
  readonly minimum = computed(() => Math.min(...this.records().map(record => record.time)));
  readonly maximum = computed(() => Math.max(...this.records().map(record => record.time)));
  readonly separation = computed(() => this.maximum() - this.minimum());
  readonly selecting = computed(() => ['extremes', 'practice-extremes'].includes(this.stage()));
  readonly extremesFound = computed(() => this.selectedMinId() !== null && this.selectedMaxId() !== null);
  readonly showMeasure = computed(() => ['measure', 'discovery', 'review'].includes(this.stage()));
  readonly step = computed(() => this.stage() === 'extremes' ? 1 : ['measure', 'discovery'].includes(this.stage()) ? 2 : 3);
  readonly selectionTask = computed(() => this.extremesFound() ? 'Encontraste los dos extremos' : this.selectedMinId() ? 'Selecciona la descarga más larga' : 'Selecciona la descarga más corta');
  readonly axisTicks = computed(() => Array.from({ length: this.separation() + 1 }, (_, index) => this.minimum() + index));
  readonly intervals = computed(() => this.axisTicks().slice(0, -1));
  readonly rangeOptions = computed(() => [this.separation() - 1, this.separation(), this.separation() + 1, this.maximum()]);
  readonly meanings = computed<readonly { id: Meaning; text: string }[]>(() => [
    { id: 'maximum', text: 'La descarga más larga duró ' + this.separation() + ' minutos.' },
    { id: 'separation', text: 'Hubo ' + this.separation() + ' minutos de separación entre la más corta y la más larga.' },
    { id: 'every', text: 'Todas las descargas duraron ' + this.separation() + ' minutos.' },
  ]);
  readonly diagramDescription = computed(() => 'Descargas observadas: ' + this.records().map(record => record.time).join(', ') + ' minutos. La más corta duró ' + this.minimum() + ' y la más larga ' + this.maximum() + ' minutos. Entre ellas hay ' + this.separation() + ' tramos de un minuto.');
  private readonly injector = inject(Injector);
  private readonly taskHeading = viewChild<ElementRef<HTMLHeadingElement>>('taskHeading');
  private finished = false;

  barHeight(time: number): number { return time / this.barMaximum * 100; }
  bridgePosition(time: number): number { return 30 + (time - this.minimum()) / this.separation() * 500; }

  selectTrip(id: string): void {
    if (!this.selecting() || this.extremesFound()) return;
    const record = this.records().find(trip => trip.id === id);
    if (!record) return;
    const findingMin = this.selectedMinId() === null;
    if (record.time !== (findingMin ? this.minimum() : this.maximum())) {
      this.hint(findingMin
        ? 'Busca la barra más baja: la descarga que necesitó menos minutos.'
        : 'Busca la barra más alta: la descarga que necesitó más minutos. No importa cuántas veces se repita un tiempo.');
      return;
    }
    this.feedback.set('');
    if (findingMin) this.selectedMinId.set(id);
    else this.selectedMaxId.set(id);
    if (this.stage() === 'practice-extremes' && this.extremesFound()) this.moveTo('practice-range');
    else this.focusTask();
  }

  showSeparation(): void {
    if (this.stage() !== 'extremes' || !this.extremesFound()) return;
    this.moveTo('measure');
  }

  answerRange(answer: number): void {
    if (!['measure', 'practice-range'].includes(this.stage()) || !this.rangeOptions().includes(answer)) return;
    if (answer === this.separation()) {
      this.moveTo(this.stage() === 'measure' ? 'discovery' : 'practice-meaning');
      return;
    }
    this.hint(answer === this.maximum()
      ? answer + ' minutos es la duración más larga, no la separación. Compara los dos extremos.'
      : answer === this.separation() + 1
        ? 'Cuenta los espacios de un minuto entre los extremos, no las marcas incluyendo los dos extremos.'
        : 'Busca cuánto hay desde la duración más corta hasta la más larga. Puedes contar los espacios de un minuto.');
  }

  startPractice(): void {
    if (this.stage() !== 'discovery') return;
    this.resetSelection();
    this.moveTo('practice-extremes');
  }

  explainRange(answer: Meaning): void {
    if (this.stage() !== 'practice-meaning' || !this.meanings().some(meaning => meaning.id === answer)) return;
    if (answer === 'separation') this.moveTo(this.practiceHelped() ? 'review' : 'success');
    else this.hint(answer === 'maximum'
      ? 'La más larga duró ' + this.maximum() + ' minutos. El rango dice cuánto la separa de la más corta.'
      : 'Los registros tienen tiempos distintos. El rango no dice cuánto duraron todas las descargas.');
  }

  continueAfterHelp(): void {
    if (this.stage() !== 'review') return;
    this.round.update(round => round + 1);
    this.resetSelection();
    this.moveTo('practice-extremes');
  }

  private resetSelection(): void {
    this.selectedMinId.set(null);
    this.selectedMaxId.set(null);
    this.practiceHelped.set(false);
  }

  private hint(message: string): void {
    if (this.practicing()) this.practiceHelped.set(true);
    this.feedback.set(message);
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
