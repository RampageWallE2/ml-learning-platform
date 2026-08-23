import {
  Component,
  computed,
  output,
  signal
} from '@angular/core';


type GranaryStage =
  | 'distances'
  | 'interpretation'
  | 'completed';


type InterpretationAnswer =
  | 'farther'
  | 'closer'
  | 'same'
  | 'heavier';


@Component({
  selector: 'app-lesson-03-granary',
  imports: [],
  templateUrl: './lesson-03-granary.html',
  styleUrl: './lesson-03-granary.scss'
})
export class Lesson03Granary {

  completed = output<void>();


  /* =========================
     DATOS DEL LOTE
     ========================= */

  readonly sackWeights = [
    47,
    49,
    50,
    52,
    52
  ];


  readonly average = 50;


  readonly axisTicks = [
    46,
    47,
    48,
    49,
    50,
    51,
    52,
    53
  ];


  readonly distanceOptions = [
    0,
    1,
    2,
    3,
    4,
    5
  ];


  /* =========================
     ESTADO
     ========================= */

  stage =
    signal<GranaryStage>(
      'distances'
    );


  currentSackIndex =
    signal(0);


  distanceAnswer =
    signal<number | null>(
      null
    );


  interpretationAnswer =
    signal<InterpretationAnswer | null>(
      null
    );


  /* =========================
     SACO ACTUAL
     ========================= */

  currentWeight = computed(() =>
    this.sackWeights[
      this.currentSackIndex()
    ]
  );


  /*
   * Internamente usamos Math.abs()
   * porque estamos trabajando con
   * distancia, no con desviaciones
   * positivas o negativas.
   */
  currentDistance = computed(() =>
    Math.abs(
      this.currentWeight() -
      this.average
    )
  );


  /* =========================
     DISTANCIAS COMPLETAS
     ========================= */

  readonly sackDistances =
    this.sackWeights.map(
      weight => ({
        weight,
        distance:
          Math.abs(
            weight -
            this.average
          )
      })
    );


  /* =========================
     RESPUESTA DE CADA SACO
     ========================= */

  selectDistance(
    answer: number
  ): void {

    this.distanceAnswer.set(
      answer
    );


    if (
      answer !==
      this.currentDistance()
    ) {
      return;
    }


    const isLast =
      this.currentSackIndex() >=
      this.sackWeights.length - 1;


    if (isLast) {

      this.stage.set(
        'interpretation'
      );

      return;
    }


    this.currentSackIndex.update(
      index =>
        index + 1
    );


    this.distanceAnswer.set(
      null
    );
  }


  /* =========================
     INTERPRETACIÓN
     ========================= */

  selectInterpretation(
    answer: InterpretationAnswer
  ): void {

    this.interpretationAnswer.set(
      answer
    );


    if (
      answer === 'farther'
    ) {

      this.stage.set(
        'completed'
      );
    }
  }


  /* =========================
     RECTA NUMÉRICA
     ========================= */

  getPointX(
    value: number
  ): number {

    const min = 46;
    const max = 53;

    const start = 40;
    const end = 400;


    return (
      start +
      (
        (
          value - min
        ) /
        (
          max - min
        )
      ) *
      (
        end - start
      )
    );
  }


  /* =========================
     FINAL
     ========================= */

  finishLesson(): void {

    this.completed.emit();
  }

}