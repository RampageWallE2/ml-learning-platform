import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';

type HaulageStage =
  | 'find-min'
  | 'min-found'
  | 'find-max'
  | 'max-found'
  | 'measure-range'
  | 'formula'
  | 'practice-range'
  | 'practice-meaning'
  | 'success';

type TripRecord = Readonly<{ id: string; time: number }>;

const TRIPS: readonly TripRecord[] = [
  { id: 'trip-1', time: 11 },
  { id: 'trip-2', time: 12 },
  { id: 'trip-3', time: 11 },
  { id: 'trip-4', time: 18 },
  { id: 'trip-5', time: 12 }
];

const PRACTICE_TRIPS: readonly TripRecord[] = [
  { id: 'practice-1', time: 14 },
  { id: 'practice-2', time: 10 },
  { id: 'practice-3', time: 12 },
  { id: 'practice-4', time: 15 },
  { id: 'practice-5', time: 11 }
];

@Component({
  selector: 'app-lesson-03-haulage',
  templateUrl: './lesson-03-haulage.html',
  styleUrl: './lesson-03-haulage.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Lesson03Haulage {
  readonly completed = output<void>();
  readonly stage = signal<HaulageStage>('find-min');
  readonly selectedRecordId = signal<string | null>(null);
  readonly rangeAnswer = signal<number | null>(null);
  readonly feedback = signal('');

  readonly trips = TRIPS;
  readonly practiceTrips = PRACTICE_TRIPS;
  readonly axisTicks = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
  readonly rangeOptions = [5, 7, 8, 18];
  readonly rulerEnd = signal(11);
  readonly practiceAnswer = signal('');
  readonly plotPoints = [
    { time: 11, count: 2 },
    { time: 12, count: 2 },
    { time: 18, count: 1 }
  ];

  private finished = false;

  selectFastest(recordId: string): void {
    if (this.stage() !== 'find-min') return;
    const trip = this.findTrip(this.trips, recordId);
    if (!trip) return;

    this.selectedRecordId.set(recordId);
    if (trip.time === 11) {
      this.stage.set('min-found');
      this.feedback.set('Correcto. El tiempo mínimo registrado es 11 min.');
      return;
    }

    this.feedback.set('Inténtalo nuevamente. La descarga más corta es la que necesitó menos minutos.');
  }

  continueToMaximum(): void {
    if (this.stage() !== 'min-found') return;
    this.stage.set('find-max');
    this.selectedRecordId.set(null);
    this.feedback.set('');
  }

  selectSlowest(recordId: string): void {
    if (this.stage() !== 'find-max') return;
    const trip = this.findTrip(this.trips, recordId);
    if (!trip) return;

    this.selectedRecordId.set(recordId);
    if (trip.time === 18) {
      this.stage.set('max-found');
      this.feedback.set('Correcto. El tiempo máximo registrado es 18 min.');
      return;
    }

    this.feedback.set('Inténtalo nuevamente. La descarga más larga es la que necesitó más minutos.');
  }

  continueToRange(): void {
    if (this.stage() !== 'max-found') return;
    this.stage.set('measure-range');
    this.selectedRecordId.set(null);
    this.feedback.set('');
  }

  answerRange(answer: number): void {
    if (this.stage() !== 'measure-range') return;
    if (this.rulerEnd() !== 18) {
      this.feedback.set('Extiende primero la regla desde el mínimo hasta el máximo observado.');
      return;
    }
    this.rangeAnswer.set(answer);
    if (answer === 7) {
      this.stage.set('formula');
      this.feedback.set('Correcto. Entre 11 y 18 hay una separación de 7 minutos.');
      return;
    }

    this.feedback.set(answer === 18
      ? '18 min es el máximo. Buscamos su separación respecto al mínimo.'
      : 'Cuenta los intervalos desde 11 hasta 18, no las marcas incluyendo ambos extremos.');
  }

  moveRuler(value: string): void {
    if (this.stage() !== 'measure-range') return;
    const end = Number(value);
    if (!Number.isInteger(end) || end < 11 || end > 18) return;
    this.rulerEnd.set(end);
    this.feedback.set('');
  }

  continueToPractice(): void {
    if (this.stage() !== 'formula') return;
    this.stage.set('practice-range');
    this.rangeAnswer.set(null);
    this.feedback.set('');
  }

  answerPracticeRange(): void {
    if (this.stage() !== 'practice-range') return;
    const answer = Number(this.practiceAnswer());
    if (!this.practiceAnswer().trim() || !Number.isFinite(answer)) {
      this.feedback.set('Escribe el rango en minutos.');
      return;
    }
    this.rangeAnswer.set(answer);
    if (answer === 5) {
      this.stage.set('practice-meaning');
      this.feedback.set('Ahora explica qué representa ese resultado.');
    } else {
      this.feedback.set(answer === 15
        ? 'Ese es el máximo. El rango expresa una separación entre dos valores.'
        : 'Revisa los dos extremos del conjunto y la diferencia entre ellos.');
    }
  }

  explainRange(answer: 'separation' | 'maximum' | 'every'): void {
    if (this.stage() !== 'practice-meaning') return;
    if (answer === 'separation') {
      this.stage.set('success');
      this.feedback.set('Correcto. Hay 5 minutos de separación entre la descarga más corta y la más larga de este conjunto.');
    } else {
      this.feedback.set(answer === 'maximum'
        ? 'El rango no es la duración máxima: compara el máximo con el mínimo.'
        : 'Las descargas tienen duraciones distintas. El rango describe la separación entre sus extremos.');
    }
  }

  position(value: number): number {
    return ((value - 10) / 9) * 100;
  }

  finish(): void {
    if (this.stage() !== 'success' || this.finished) return;
    this.finished = true;
    this.completed.emit();
  }

  private findTrip(records: readonly TripRecord[], recordId: string): TripRecord | undefined {
    return records.find(record => record.id === recordId);
  }
}
