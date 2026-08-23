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


type DispersionAnswer =
  | 'A'
  | 'B';


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


  /* =========================
     REPORTE 1 — VIVERO
     ALTURA DE PLANTONES
     ========================= */

  readonly nurseryGroupA = [
    28,
    29,
    30,
    31,
    32
  ];


  readonly nurseryGroupB = [
    18,
    24,
    30,
    36,
    42
  ];


  /* =========================
     REPORTE 2 — GRANJA
     PRODUCCIÓN DIARIA
     ========================= */

  readonly farmPlotA = [
    48,
    49,
    50,
    51,
    52
  ];


  readonly farmPlotB = [
    32,
    41,
    50,
    59,
    68
  ];


  readonly farmAverage = 50;


  /* =========================
     REPORTE 3 — ALMACÉN
     PESO DEL TRIGO
     ========================= */

  readonly sackAverage = 50;

  readonly inspectedSackWeight = 46;

  readonly correctDistance = 4;


  readonly distanceOptions = [
    2,
    4,
    46,
    50
  ];


  /* =========================
     ESTADO
     ========================= */

  stage =
    signal<PlazaStage>(
      'dispersion'
    );


  dispersionAnswer =
    signal<DispersionAnswer | null>(
      null
    );


  averageAnswer =
    signal<AverageAnswer | null>(
      null
    );


  distanceAnswer =
    signal<number | null>(
      null
    );


  /* =========================
     REPORTE 1
     ========================= */

  selectDispersion(
    answer: DispersionAnswer
  ): void {

    this.dispersionAnswer.set(
      answer
    );


    if (answer === 'B') {

      this.stage.set(
        'average'
      );
    }
  }


  /* =========================
     REPORTE 2
     ========================= */

  selectAverage(
    answer: AverageAnswer
  ): void {

    this.averageAnswer.set(
      answer
    );


    if (
      answer ===
      'different-dispersion'
    ) {

      this.stage.set(
        'distance'
      );
    }
  }


  /* =========================
     REPORTE 3
     ========================= */

  selectDistance(
    answer: number
  ): void {

    this.distanceAnswer.set(
      answer
    );


    if (
      answer ===
      this.correctDistance
    ) {

      this.stage.set(
        'completed'
      );
    }
  }


  /* =========================
     FINAL
     ========================= */

  finishChallenge(): void {

    this.completed.emit();
  }

}