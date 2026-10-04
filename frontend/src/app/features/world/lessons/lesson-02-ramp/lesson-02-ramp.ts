import {
  afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef,
  inject, Injector, output, signal, viewChild,
} from '@angular/core';

type Stage = 'learn' | 'report' | 'request' | 'records' | 'discovery' | 'practice' | 'reason' | 'review' | 'success';
type ReportAnswer = 'same' | 'b' | 'unknown';
type RequestAnswer = 'records' | 'drivers' | 'copy';
type Reason = 'summary' | 'always-same' | 'largest';

const TURNS = [
  { id: 'A', values: [98, 101, 100, 99, 102] },
  { id: 'B', values: [80, 120, 90, 110, 100] },
] as const;
const PRACTICE_REPORTS = [
  { ids: ['C', 'D'], mean: 90 },
  { ids: ['E', 'F'], mean: 95 },
  { ids: ['G', 'H'], mean: 105 },
] as const;

@Component({
  selector: 'app-lesson-02-ramp',
  templateUrl: './lesson-02-ramp.html',
  styleUrl: './lesson-02-ramp.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Lesson02Ramp {
  readonly completed = output<void>();
  readonly stage = signal<Stage>('learn');
  readonly feedback = signal('');
  readonly redistributed = signal(false);
  readonly round = signal(0);
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
  readonly showRecords = computed(() => ['records', 'discovery'].includes(this.stage()));
  readonly reports = computed(() => {
    if (!this.practicing()) return this.turns.map(turn => ({ id: turn.id, mean: this.average(turn.values) }));
    const report = PRACTICE_REPORTS[this.round() % PRACTICE_REPORTS.length];
    return report.ids.map(id => ({ id, mean: report.mean }));
  });
  readonly reportChoices = computed<readonly { id: ReportAnswer; text: string }[]>(() => [
    { id: 'same', text: 'Mantener el plan: las cargas fueron parecidas.' },
    { id: 'b', text: 'Cambiar el plan de ' + this.reports()[1].id + ': sus cargas variaron más.' },
    { id: 'unknown', text: 'Pedir las cargas antes de decidir.' },
  ]);
  readonly requests: readonly { id: RequestAnswer; text: string }[] = [
    { id: 'drivers', text: 'Los nombres de los conductores.' },
    { id: 'records', text: 'Cuánto llevó cada camión.' },
    { id: 'copy', text: 'Otra copia del mismo informe.' },
  ];
  readonly reasons: readonly { id: Reason; text: string }[] = [
    { id: 'always-same', text: 'El mismo promedio significa que las cargas se parecen igual.' },
    { id: 'summary', text: 'El promedio no muestra la carga de cada camión.' },
    { id: 'largest', text: 'El promedio es la carga del camión que llevó más.' },
  ];
  readonly plots = computed(() => this.turns.map(turn => ({
    id: turn.id, mean: this.average(turn.values),
    description: 'Turno ' + turn.id + ': cargas de ' + turn.values.join(', ') + ' toneladas. Promedio de ' + this.average(turn.values) + ' toneladas. Escala de 80 a 120.',
    points: turn.values.map((value, index) => ({ id: turn.id + (index + 1), value, x: this.position(value) })),
  })));
  private readonly injector = inject(Injector);
  private readonly taskHeading = viewChild<ElementRef<HTMLHeadingElement>>('taskHeading');
  private finished = false;

  average(values: readonly number[]): number { return values.reduce((sum, value) => sum + value, 0) / values.length; }
  position(value: number): number { return (value - 80) * 2.5; }

  showSharing(): void {
    if (this.stage() !== 'learn' || this.redistributed()) return;
    this.redistributed.set(true);
    this.focusTask();
  }

  startReport(): void {
    if (this.stage() !== 'learn' || !this.redistributed()) return;
    this.moveTo('report');
  }

  assess(answer: ReportAnswer): void {
    if (this.stage() !== 'report' || !this.reportChoices().some(choice => choice.id === answer)) return;
    if (answer === 'unknown') this.moveTo('request');
    else this.feedback.set('Los dos promedios son iguales, pero no vemos cuánto llevó cada camión. Para mantener o cambiar el plan, necesitamos esas cargas.');
  }

  request(answer: RequestAnswer): void {
    if (this.stage() !== 'request' || !this.requests.some(choice => choice.id === answer)) return;
    if (answer === 'records') this.moveTo('records');
    else this.feedback.set(answer === 'drivers'
      ? 'Los nombres dicen quién condujo, no cuánto material llevó cada camión.'
      : 'Otra copia mostraría los mismos promedios. Seguirían faltando las cargas de cada camión.');
  }

  selectLoad(id: string): void {
    if (this.showRecords() && this.plots().some(plot => plot.points.some(point => point.id === id))) this.selectedLoad.set(id);
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
    if (this.stage() !== 'practice' || !this.reportChoices().some(choice => choice.id === answer)) return;
    if (answer === 'unknown') this.moveTo('reason');
    else {
      this.practiceHelped.set(true);
      this.feedback.set('El promedio puede venir de cargas parecidas o de cargas muy diferentes. Antes de decidir sobre el plan, pide cuánto llevó cada camión.');
    }
  }

  explain(answer: Reason): void {
    if (this.stage() !== 'reason' || !this.reasons.some(choice => choice.id === answer)) return;
    if (answer === 'summary') this.moveTo(this.practiceHelped() ? 'review' : 'success');
    else {
      this.practiceHelped.set(true);
      this.feedback.set(answer === 'largest'
        ? 'El promedio resume todas las cargas, no solo la más grande. Pero no muestra cuánto llevó cada camión.'
        : 'Recuerda los turnos A y B: tenían el mismo promedio, pero sus cargas no se parecían igual. Necesitamos ver las cargas.');
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
