import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';

type HaulageStage =
  | 'find-min'
  | 'min-found'
  | 'find-max'
  | 'max-found'
  | 'measure-range'
  | 'formula'
  | 'practice-min'
  | 'practice-max'
  | 'practice-range'
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
  readonly rangeOptions = [5, 6, 7, 8];
  readonly practiceRangeOptions = [3, 4, 5, 6];
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

    this.feedback.set('Inténtalo nuevamente. El viaje más rápido es el que necesitó menos minutos.');
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

    this.feedback.set('Inténtalo nuevamente. El viaje más lento es el que necesitó más minutos.');
  }

  continueToRange(): void {
    if (this.stage() !== 'max-found') return;
    this.stage.set('measure-range');
    this.selectedRecordId.set(null);
    this.feedback.set('');
  }

  answerRange(answer: number): void {
    if (this.stage() !== 'measure-range') return;
    this.rangeAnswer.set(answer);
    if (answer === 7) {
      this.stage.set('formula');
      this.feedback.set('Correcto. Entre 11 y 18 hay una separación de 7 minutos.');
      return;
    }

    this.feedback.set('Inténtalo nuevamente. Cuenta los espacios desde 11 hasta 18, no los números escritos.');
  }

  continueToPractice(): void {
    if (this.stage() !== 'formula') return;
    this.stage.set('practice-min');
    this.rangeAnswer.set(null);
    this.feedback.set('');
  }

  selectPracticeExtreme(recordId: string): void {
    const currentStage = this.stage();
    if (currentStage !== 'practice-min' && currentStage !== 'practice-max') return;
    const trip = this.findTrip(this.practiceTrips, recordId);
    if (!trip) return;

    this.selectedRecordId.set(recordId);
    const expected = currentStage === 'practice-min' ? 10 : 15;
    if (trip.time !== expected) {
      this.feedback.set(
        currentStage === 'practice-min'
          ? 'Busca el menor tiempo del nuevo conjunto.'
          : 'Ahora busca el mayor tiempo del nuevo conjunto.'
      );
      return;
    }

    if (currentStage === 'practice-min') {
      this.stage.set('practice-max');
      this.selectedRecordId.set(null);
      this.feedback.set('Mínimo encontrado: 10 min. Ahora selecciona el máximo.');
      return;
    }

    this.stage.set('practice-range');
    this.selectedRecordId.set(null);
    this.feedback.set('Extremos encontrados: mínimo 10 min y máximo 15 min.');
  }

  answerPracticeRange(answer: number): void {
    if (this.stage() !== 'practice-range') return;
    this.rangeAnswer.set(answer);
    if (answer === 5) {
      this.stage.set('success');
      this.feedback.set('Correcto. El rango del nuevo conjunto es 5 min.');
      return;
    }

    this.feedback.set('Inténtalo nuevamente. Resta el mínimo 10 al máximo 15.');
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
