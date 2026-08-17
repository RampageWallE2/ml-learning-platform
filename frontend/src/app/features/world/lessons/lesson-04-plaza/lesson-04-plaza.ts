import {
  Component,
  output,
  signal
} from '@angular/core';

type PlazaStage =
  | 'dispersion'
  | 'average'
  | 'distance'
  | 'completed';

type DispersionAnswer = 'A' | 'B';

type AverageAnswer =
  | 'same'
  | 'different-dispersion'
  | 'more-data'
  | 'higher-b';

@Component({
  selector: 'app-lesson-04-plaza',
  imports: [],
  templateUrl: './lesson-04-plaza.html',
  styleUrl: './lesson-04-plaza.scss'
})
export class Lesson04Plaza {

  completed = output<void>();

  // RETO 1 - cosecha de tomates
  readonly tomatoPlotA = [
    42, 43, 44, 45, 46
  ];

  readonly tomatoPlotB = [
    29, 37, 44, 52, 58
  ];

  // RETO 2 - invernaderos
  readonly greenhouseA = [
    72, 74, 75, 76, 78
  ];

  readonly greenhouseB = [
    58, 68, 75, 84, 90
  ];

  readonly greenhouseTotalA = 375;
  readonly greenhouseTotalB = 375;
  readonly greenhouseAverage = 75;

  // RETO 3 - producción de papa
  readonly potatoAverage = 72;
  readonly potatoProduction = 89;
  readonly correctDistance = 17;

  readonly distanceOptions = [
    12,
    15,
    17,
    21
  ];

  stage = signal<PlazaStage>('dispersion');

  dispersionAnswer =
    signal<DispersionAnswer | null>(null);

  averageAnswer =
    signal<AverageAnswer | null>(null);

  distanceAnswer =
    signal<number | null>(null);


  selectDispersion(
    answer: DispersionAnswer
  ): void {

    this.dispersionAnswer.set(answer);

    if (answer === 'B') {
      this.stage.set('average');
    }
  }


  selectAverage(
    answer: AverageAnswer
  ): void {

    this.averageAnswer.set(answer);

    if (answer === 'different-dispersion') {
      this.stage.set('distance');
    }
  }


  selectDistance(answer: number): void {

    this.distanceAnswer.set(answer);

    if (answer === this.correctDistance) {
      this.stage.set('completed');
    }
  }


  finishChallenge(): void {
    this.completed.emit();
  }
}