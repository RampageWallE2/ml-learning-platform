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


  /* =========================
     DATOS DE PRODUCCIÓN
     ========================= */

  readonly parcelA = [
    48,
    50,
    49,
    51,
    52
  ];


  readonly parcelB = [
    30,
    65,
    42,
    68,
    45
  ];


  /*
   * Escala visual del gráfico.
   *
   * No estamos enseñando una nueva
   * operación matemática aquí.
   */
  readonly axisTicks = [
    20,
    30,
    40,
    50,
    60,
    70
  ];


  private readonly axisMin = 20;
  private readonly axisMax = 70;

  private readonly axisStart = 40;
  private readonly axisEnd = 400;


  /* =========================
     PUNTOS DEL GRÁFICO
     ========================= */

  readonly parcelAPoints =
    this.buildPlotPoints(
      this.parcelA
    );


  readonly parcelBPoints =
    this.buildPlotPoints(
      this.parcelB
    );


  /* =========================
     ESTADO DE LA CLASE
     ========================= */

  stage =
    signal<FarmStage>(
      'stability'
    );


  stabilityAnswer =
    signal<StabilityAnswer | null>(
      null
    );


  differenceAnswer =
    signal<DifferenceAnswer | null>(
      null
    );


  /* =========================
     PROMEDIOS
     ========================= */

  averageA = computed(() =>
    this.calculateAverage(
      this.parcelA
    )
  );


  averageB = computed(() =>
    this.calculateAverage(
      this.parcelB
    )
  );


  private calculateAverage(
    values: readonly number[]
  ): number {

    return values.reduce(
      (sum, value) =>
        sum + value,
      0
    ) / values.length;
  }


  /* =========================
     PRIMERA DECISIÓN
     ========================= */

  selectStableParcel(
    answer: StabilityAnswer
  ): void {

    this.stabilityAnswer.set(
      answer
    );


    /*
     * Solo avanzamos cuando el estudiante
     * identifica la Parcela A como la más
     * regular para este contexto.
     */
    if (answer === 'A') {
      this.stage.set(
        'average'
      );
    }
  }


  /* =========================
     SEGUNDA PREGUNTA
     ========================= */

  selectDifference(
    answer: DifferenceAnswer
  ): void {

    this.differenceAnswer.set(
      answer
    );


    /*
     * El estudiante reconoce que A
     * mantiene sus registros más agrupados.
     */
    if (
      answer === 'concentrated'
    ) {

      this.stage.set(
        'completed'
      );
    }
  }


  /* =========================
     POSICIÓN EN EL EJE
     ========================= */

  getPointX(
    value: number
  ): number {

    return (
      this.axisStart +
      (
        (
          value -
          this.axisMin
        ) /
        (
          this.axisMax -
          this.axisMin
        )
      ) *
      (
        this.axisEnd -
        this.axisStart
      )
    );
  }


  /* =========================
     CONSTRUCCIÓN DEL GRÁFICO
     ========================= */

  private buildPlotPoints(
    values: readonly number[]
  ): PlotPoint[] {

    /*
     * Si un mismo valor aparece varias veces,
     * los puntos se apilan verticalmente
     * para que no queden exactamente uno
     * encima de otro.
     */
    const occurrences =
      new Map<number, number>();


    return values.map(
      value => {

        const level =
          occurrences.get(value) ?? 0;


        occurrences.set(
          value,
          level + 1
        );


        return {
          value,

          x: this.getPointX(
            value
          ),

          y:
            70 -
            level * 18
        };
      }
    );
  }


  /* =========================
     FINAL
     ========================= */

  finishLesson(): void {
    this.completed.emit();
  }

}