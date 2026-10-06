import {
  afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef,
  inject, Injector, input, OnChanges, output, signal, SimpleChanges, viewChild,
} from '@angular/core';
import { LESSON_NAMES } from '../lesson-catalog';
import { C3Stage as Stage, C3State, C3_TRIPS as TRIPS, C3_PRACTICE_SETS as PRACTICE_SETS, isC3State } from './lesson-03-haulage.state';

type Meaning = 'separation' | 'maximum' | 'every';

@Component({
  selector: 'app-lesson-03-haulage',
  templateUrl: './lesson-03-haulage.html',
  styleUrl: './lesson-03-haulage.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Lesson03Haulage implements OnChanges {
  readonly title = LESSON_NAMES['lesson-03'];
  readonly completed = output<void>();
  readonly initialState = input<C3State | null>(null);
  readonly stateChanged = output<C3State>();
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
  readonly selectionTask = computed(() => this.extremesFound() ? 'Encontraste la más corta y la más larga' : this.selectedMinId() ? 'Selecciona la descarga más larga' : 'Selecciona la descarga más corta');
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

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['initialState']) return;
    const state = this.initialState();
    if (state !== null && !isC3State(state)) return;
    if (state) {
      this.stage.set(state.stage); this.selectedMinId.set(state.selectedMinId); this.selectedMaxId.set(state.selectedMaxId);
      this.round.set(state.round); this.practiceHelped.set(state.practiceHelped);
    }
    this.feedback.set(''); this.finished = false; this.publishState();
  }

  private publishState(): void {
    this.stateChanged.emit({ stage: this.stage(), selectedMinId: this.selectedMinId(), selectedMaxId: this.selectedMaxId(),
      round: this.round(), practiceHelped: this.practiceHelped() });
  }

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
    else { this.publishState(); this.focusTask(); }
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
      ? answer + ' minutos es lo que duró la descarga más larga. Busca la diferencia entre la más corta y la más larga.'
      : answer === this.separation() + 1
        ? 'Cuenta los espacios de un minuto entre el tiempo menor y el mayor. Cuenta los espacios, no las marcas.'
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
    this.publishState();
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
