import {
  afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef,
  inject, Injector, input, OnChanges, output, signal, SimpleChanges, viewChild,
} from '@angular/core';
import { LESSON_NAMES } from '../lesson-catalog';
import { C2Stage as Stage, C2State, C2_TURNS as TURNS, C2_PRACTICE_REPORTS as PRACTICE_REPORTS, isC2State } from './lesson-02-ramp.state';

type ReportAnswer = 'same' | 'a' | 'b' | 'unknown';
type RequestAnswer = 'records' | 'drivers' | 'copy';
type Reason = 'summary' | 'always-same' | 'largest';


@Component({
  selector: 'app-lesson-02-ramp',
  templateUrl: './lesson-02-ramp.html',
  styleUrl: './lesson-02-ramp.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Lesson02Ramp implements OnChanges {
  readonly title = LESSON_NAMES['lesson-02'];
  readonly completed = output<void>();
  readonly initialState = input<C2State | null>(null);
  readonly stateChanged = output<C2State>();
  readonly stage = signal<Stage>('learn');
  readonly feedback = signal('');
  readonly redistributed = signal(false);
  readonly round = signal(0);
  readonly practiceCase = signal(0);
  readonly practiceHelped = signal(false);
  readonly selectedLoad = signal<string | null>(null);
  readonly turns = TURNS;
  readonly example = [90, 100, 110] as const;
  readonly exampleTotal = this.example.reduce((sum, value) => sum + value, 0);
  readonly exampleMean = this.average(this.example);
  readonly exampleLoads = computed(() => this.redistributed() ? this.example.map(() => this.exampleMean) : this.example);
  readonly ticks = [80, 90, 100, 110, 120];
  readonly step = computed(() => this.stage() === 'learn' ? 1 : ['report', 'request', 'records', 'discovery'].includes(this.stage()) ? 2 : 3);
  readonly practicing = computed(() => ['practice', 'reason', 'review'].includes(this.stage()));
  readonly showRecords = computed(() => ['records', 'discovery'].includes(this.stage()) || this.practicing() && this.practiceCase() === 1);
  readonly practiceTurns = computed(() => {
    const report = PRACTICE_REPORTS[this.round() % PRACTICE_REPORTS.length];
    return report.ids.map((id, index) => ({ id, values: report.values[index] }));
  });
  readonly reports = computed(() => {
    if (!this.practicing()) return this.turns.map(turn => ({ id: turn.id, mean: this.average(turn.values) }));
    return this.practiceTurns().map(turn => ({ id: turn.id, mean: this.average(turn.values) }));
  });
  readonly reportChoices = computed<readonly { id: ReportAnswer; text: string }[]>(() => [
    { id: 'same', text: 'Las cargas se parecen igual en los dos turnos.' },
    { id: 'b', text: 'En ' + this.reports()[1].id + ', las cargas son más diferentes.' },
    { id: 'unknown', text: 'Falta ver la carga de cada camión.' },
  ]);
  readonly practiceChoices = computed<readonly { id: ReportAnswer; text: string }[]>(() => [
    { id: 'a', text: 'En el turno ' + this.reports()[0].id + '.' },
    { id: 'b', text: 'En el turno ' + this.reports()[1].id + '.' },
    { id: 'unknown', text: 'Todavía falta ver las cargas.' },
  ]);
  readonly correctPracticeAnswer = computed<ReportAnswer>(() => this.practiceCase() === 0
    ? 'unknown'
    : PRACTICE_REPORTS[this.round() % PRACTICE_REPORTS.length].different);
  readonly requests: readonly { id: RequestAnswer; text: string }[] = [
    { id: 'drivers', text: 'Los nombres de los conductores.' },
    { id: 'records', text: 'Cuánto llevó cada camión.' },
    { id: 'copy', text: 'Otra copia del mismo informe.' },
  ];
  readonly reasons: readonly { id: Reason; text: string }[] = [
    { id: 'always-same', text: 'Porque los dos promedios son iguales.' },
    { id: 'summary', text: 'Porque vemos cuánto llevó cada camión.' },
    { id: 'largest', text: 'Porque basta con mirar el camión más cargado.' },
  ];
  readonly plots = computed(() => (this.practicing() ? this.practiceTurns() : this.turns).map(turn => ({
    id: turn.id, mean: this.average(turn.values),
    description: 'Turno ' + turn.id + ': cargas de ' + turn.values.join(', ') + ' toneladas. Promedio de ' + this.average(turn.values) + ' toneladas. Escala de 80 a 120.',
    points: turn.values.map((value, index) => ({ id: turn.id + (index + 1), value, x: this.position(value) })),
  })));
  private readonly injector = inject(Injector);
  private readonly taskHeading = viewChild<ElementRef<HTMLHeadingElement>>('taskHeading');
  private readonly practiceFeedback = viewChild<ElementRef<HTMLDivElement>>('practiceFeedback');
  private finished = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['initialState']) return;
    const state = this.initialState();
    if (state !== null && !isC2State(state)) return;
    if (state) {
      this.stage.set(state.stage); this.redistributed.set(state.redistributed); this.round.set(state.round);
      this.practiceCase.set(state.practiceCase); this.practiceHelped.set(state.practiceHelped); this.selectedLoad.set(state.selectedLoad);
    }
    this.feedback.set(''); this.finished = false; this.publishState();
  }

  private publishState(): void {
    this.stateChanged.emit({ stage: this.stage(), redistributed: this.redistributed(), round: this.round(),
      practiceCase: this.practiceCase(), practiceHelped: this.practiceHelped(), selectedLoad: this.selectedLoad() });
  }

  average(values: readonly number[]): number { return values.reduce((sum, value) => sum + value, 0) / values.length; }
  position(value: number): number { return (value - 80) * 2.5; }

  showSharing(): void {
    if (this.stage() !== 'learn' || this.redistributed()) return;
    this.redistributed.set(true);
    this.publishState();
    this.focusTask();
  }

  startReport(): void {
    if (this.stage() !== 'learn' || !this.redistributed()) return;
    this.moveTo('report');
  }

  assess(answer: ReportAnswer): void {
    if (this.stage() !== 'report' || !this.reportChoices().some(choice => choice.id === answer)) return;
    if (answer === 'unknown') this.moveTo('request');
    else this.feedback.set('Los dos promedios son iguales. ¿Eso nos dice cuánto llevó cada camión? Mira qué información falta antes de decidir.');
  }

  request(answer: RequestAnswer): void {
    if (this.stage() !== 'request' || !this.requests.some(choice => choice.id === answer)) return;
    if (answer === 'records') this.moveTo('records');
    else this.feedback.set(answer === 'drivers'
      ? 'Los nombres dicen quién condujo, no cuánto material llevó cada camión.'
      : 'Otra copia mostraría los mismos promedios. Seguirían faltando las cargas de cada camión.');
  }

  selectLoad(id: string): void {
    if (this.showRecords() && this.plots().some(plot => plot.points.some(point => point.id === id))) {
      this.selectedLoad.set(id); this.publishState();
    }
  }

  compare(answer: 'a' | 'b' | 'same'): void {
    if (this.stage() !== 'records') return;
    if (answer === 'b') this.moveTo('discovery');
    else if (answer === 'a' || answer === 'same') {
      this.feedback.set('El promedio es el mismo. Pero mira todos los puntos: en A están juntos y en B están más separados.');
    }
  }

  startPractice(): void {
    if (this.stage() !== 'discovery') return;
    this.clearPractice();
    this.moveTo('practice');
  }

  answerPractice(answer: ReportAnswer): void {
    if (this.stage() !== 'practice' || !this.practiceChoices().some(choice => choice.id === answer)) return;
    if (answer === this.correctPracticeAnswer()) {
      if (this.practiceCase() === 0) {
        this.practiceCase.set(1);
        this.moveTo('practice');
      } else this.moveTo('reason');
    } else {
      this.hint(this.practiceCase() === 0
        ? 'Solo ves los promedios. ¿Puedes saber con eso cuánto llevó cada camión?'
        : answer === 'unknown'
          ? 'Aquí ya están todas las cargas. Mira los puntos: ¿en qué turno están más separados?'
          : 'Compara los dos grupos de puntos en la misma escala. Busca las cargas que están más separadas.');
    }
  }

  explain(answer: Reason): void {
    if (this.stage() !== 'reason' || !this.reasons.some(choice => choice.id === answer)) return;
    if (answer === 'summary') this.moveTo(this.practiceHelped() ? 'review' : 'success');
    else {
      this.hint(answer === 'largest'
        ? 'Una sola carga no muestra cómo fue todo el turno. Mira todos los camiones.'
        : 'Los promedios ya eran iguales antes. ¿Qué información nueva muestran ahora las hojas?');
    }
  }

  continueAfterHelp(): void {
    if (this.stage() !== 'review') return;
    this.round.update(round => round + 1);
    this.clearPractice();
    this.moveTo('practice');
  }

  private clearPractice(): void {
    this.selectedLoad.set(null);
    this.practiceHelped.set(false);
    this.practiceCase.set(0);
  }

  private hint(message: string): void {
    this.practiceHelped.set(true);
    this.feedback.set(message);
    this.publishState();
    afterNextRender(() => this.practiceFeedback()?.nativeElement.focus(), { injector: this.injector });
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
