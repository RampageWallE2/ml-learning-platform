import {
  Component,
  computed,
  output,
  signal
} from '@angular/core';

type FarmStage =
  | 'stability'
  | 'average'
  | 'completed';

type StabilityAnswer =
  | 'A'
  | 'B';

type DifferenceAnswer =
  | 'concentrated'
  | 'more-data'
  | 'higher-average'
  | 'same';

type PlotPoint = {
  value: number;
  x: number;
  y: number;
};

@Component({
  selector: 'app-lesson-02-farm',
  imports: [],
  templateUrl: './lesson-02-farm.html',
  styleUrl: './lesson-02-farm.scss'
})
export class Lesson02Farm {

  completed = output<void>();

  readonly parcelA = [9, 10, 10, 11, 10];
  readonly parcelB = [3, 17, 8, 14, 8];

  readonly axisTicks = [0, 5, 10, 15, 20];

  readonly parcelAPoints =
    this.buildPlotPoints(this.parcelA);

  readonly parcelBPoints =
    this.buildPlotPoints(this.parcelB);

  stage = signal<FarmStage>('stability');

  stabilityAnswer =
    signal<StabilityAnswer | null>(null);

  differenceAnswer =
    signal<DifferenceAnswer | null>(null);

  averageA = computed(() =>
    this.calculateAverage(this.parcelA)
  );

  averageB = computed(() =>
    this.calculateAverage(this.parcelB)
  );

  private calculateAverage(values: number[]): number {
    return values.reduce(
      (sum, value) => sum + value,
      0
    ) / values.length;
  }

  selectStableParcel(answer: StabilityAnswer): void {
    this.stabilityAnswer.set(answer);

    if (answer === 'A') {
      this.stage.set('average');
    }
  }

  selectDifference(answer: DifferenceAnswer): void {
    this.differenceAnswer.set(answer);

    if (answer === 'concentrated') {
      this.stage.set('completed');
    }
  }
  getPointX(value: number): number {
    const min = 0;
    const max = 20;

    const axisStart = 40;
    const axisEnd = 400;

    return axisStart +
      ((value - min) / (max - min)) *
      (axisEnd - axisStart);
  }

  private buildPlotPoints(
    values: readonly number[]
  ): PlotPoint[] {

    const occurrences = new Map<number, number>();

    return values.map(value => {
      const level = occurrences.get(value) ?? 0;

      occurrences.set(value, level + 1);

      return {
        value,
        x: this.getPointX(value),
        y: 70 - level * 18
      };
    });
  }

  finishLesson(): void {
    this.completed.emit();
  }
}