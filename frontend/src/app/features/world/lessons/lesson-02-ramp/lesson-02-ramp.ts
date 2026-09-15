import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';

type RampStage = 'choose-turn' | 'turn-confirmed' | 'compare-averages' | 'success';
type RampTurn = 'A' | 'B';
type BehaviorAnswer = 'yes' | 'no';

const TURNS = [
  { id: 'A' as const, values: [98, 101, 100, 99, 102] },
  { id: 'B' as const, values: [80, 120, 90, 110, 100] }
] as const;

@Component({
  selector: 'app-lesson-02-ramp',
  templateUrl: './lesson-02-ramp.html',
  styleUrl: './lesson-02-ramp.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Lesson02Ramp {
  readonly completed = output<void>();
  readonly stage = signal<RampStage>('choose-turn');
  readonly selectedTurn = signal<RampTurn | null>(null);
  readonly behaviorAnswer = signal<BehaviorAnswer | null>(null);
  readonly feedback = signal('');
  readonly turns = TURNS;
  readonly scaleTicks = [80, 90, 100, 110, 120];
  readonly target = 100;

  private finished = false;

  chooseTurn(turn: RampTurn): void {
    if (this.stage() !== 'choose-turn') return;

    this.selectedTurn.set(turn);
    if (turn === 'A') {
      this.stage.set('turn-confirmed');
      this.feedback.set('Correcto. Las cargas del Turno A permanecieron mucho más próximas entre sí.');
      return;
    }

    this.feedback.set('Inténtalo nuevamente. Observa qué turno mantiene todas sus cargas más cerca del objetivo de 100 t.');
  }

  revealAverages(): void {
    if (this.stage() !== 'turn-confirmed') return;
    this.stage.set('compare-averages');
    this.feedback.set('');
  }

  answerBehavior(answer: BehaviorAnswer): void {
    if (this.stage() !== 'compare-averages') return;

    this.behaviorAnswer.set(answer);
    if (answer === 'no') {
      this.stage.set('success');
      this.feedback.set('Correcto. Comparten el mismo promedio, pero el Turno B presenta mayor dispersión.');
      return;
    }

    this.feedback.set('Inténtalo nuevamente. El promedio coincide, pero compara cuánto se separan las cargas alrededor de 100 t.');
  }

  average(values: readonly number[]): number {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  position(value: number): number {
    return (value - 80) * 2.5;
  }

  deviationLeft(value: number): number {
    return Math.min(this.position(value), this.position(this.target));
  }

  deviationWidth(value: number): number {
    return Math.abs(this.position(value) - this.position(this.target));
  }

  finish(): void {
    if (this.stage() !== 'success' || this.finished) return;
    this.finished = true;
    this.completed.emit();
  }
}
