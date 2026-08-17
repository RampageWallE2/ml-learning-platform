import {
  Component,
  computed,
  output,
  signal
} from '@angular/core';

type GranaryStage =
  | 'center'
  | 'distances'
  | 'completed';

@Component({
  selector: 'app-lesson-03-granary',
  imports: [],
  templateUrl: './lesson-03-granary.html',
  styleUrl: './lesson-03-granary.scss'
})
export class Lesson03Granary {

  completed = output<void>();

  readonly sackWeights = [
    6,
    8,
    10,
    11,
    15
  ];

  readonly average = 10;

  readonly axisTicks = [
    5,
    10,
    15
  ];

  readonly distanceOptions = [
    0,
    1,
    2,
    3,
    4,
    5
  ];

  stage = signal<GranaryStage>('center');

  centerAnswer = signal<number | null>(null);

  currentSackIndex = signal(0);

  distanceAnswer = signal<number | null>(null);


  currentWeight = computed(() =>
    this.sackWeights[
      this.currentSackIndex()
    ]
  );


  currentDistance = computed(() =>
    Math.abs(
      this.currentWeight() -
      this.average
    )
  );


  selectCenter(answer: number): void {

    this.centerAnswer.set(answer);

    if (answer === this.average) {
      this.stage.set('distances');
    }

  }


  selectDistance(answer: number): void {

    this.distanceAnswer.set(answer);

    if (answer !== this.currentDistance()) {
      return;
    }

    const isLast =
      this.currentSackIndex() >=
      this.sackWeights.length - 1;

    if (isLast) {
      this.stage.set('completed');
      return;
    }

    this.currentSackIndex.update(
      index => index + 1
    );

    this.distanceAnswer.set(null);

  }


  getPointX(value: number): number {

    const min = 5;
    const max = 15;

    const start = 40;
    const end = 400;

    return start +
      ((value - min) / (max - min)) *
      (end - start);

  }


  finishLesson(): void {
    this.completed.emit();
  }

}