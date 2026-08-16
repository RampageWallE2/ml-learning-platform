import { Component, computed, output, signal } from '@angular/core';

type NurseryPlant = {
  id: number;
  x: number;
  y: number;
};

type NurseryStage =
  | 'intro'
  | 'experiment'
  | 'observation'
  | 'question'
  | 'completed';

type NurseryAnswer =
  | 'separated'
  | 'more'
  | 'together'
  | 'bigger'


@Component({
  selector: 'app-lesson-01-nursery',
  imports: [],
  templateUrl: './lesson-01-nursery.html',
  styleUrl: './lesson-01-nursery.scss'
})
export class Lesson01Nursery {

  completed = output<void>();

readonly referencePlants: NurseryPlant[] = [
  { id: 1, x: 200, y: 110 },
  { id: 2, x: 230, y: 105 },
  { id: 3, x: 260, y: 115 },
  { id: 4, x: 290, y: 105 },
  { id: 5, x: 320, y: 110 }
];

private readonly initialNurseryPlants: NurseryPlant[] = [
  { id: 1, x: 200, y: 110 },
  { id: 2, x: 230, y: 105 },
  { id: 3, x: 260, y: 115 },
  { id: 4, x: 290, y: 105 },
  { id: 5, x: 320, y: 110 }
];


nurseryPlants = signal<NurseryPlant[]>(
  this.initialNurseryPlants.map(plant => ({ ...plant }))
);

introStep = signal(0);

readonly introMessages = [
  'Observa estos dos grupos de plantas.',
  'En el Grupo A las plantas están bastante juntas.',
  'Tu tarea será modificar el Grupo B para que sus plantas estén más separadas.'
];

nextIntro(): void {
  const next = this.introStep() + 1;

  if (next < this.introMessages.length) {
    this.introStep.set(next);
    return;
  }

  this.nurseryStage.set('experiment');
}

nurseryStage = signal<NurseryStage>('intro');

  nurseryAnswer =
    signal<string | null>(null);

  movedPlantsCount = signal(0);

  private draggedPlantId: number | null = null;
  private movedPlantIds = new Set<number>();
  

  private calculateSpread( plants: NurseryPlant[]): number {

    const centerX =
      plants.reduce((sum, plant) => sum + plant.x, 0)
      / plants.length;

    const centerY =
      plants.reduce((sum, plant) => sum + plant.y, 0)
      / plants.length;

    const distances = plants.map(plant => {
      const dx = plant.x - centerX;
      const dy = plant.y - centerY;

      return Math.sqrt(
        dx * dx +
        dy * dy
      );
    });

    return distances.reduce(
      (sum, distance) => sum + distance,
      0
    ) / distances.length;
  }

  private readonly referenceSpread = this.calculateSpread(this.referencePlants);

  nurserySpread = computed(() =>
    this.calculateSpread(
      this.nurseryPlants()
    )
  );

  spreadRatio = computed(() =>
    this.nurserySpread() /
    this.referenceSpread
  );

  spreadFeedback = computed(() => {
    const ratio = this.spreadRatio();

    if (ratio < 1.7) {
      return 'Las plantas siguen bastante juntas.';
    }

    if (ratio < 2.0) {
      return 'Se están separando. Sigue experimentando.';
    }

    if (ratio < 2.8) {
      return 'Ahora el grupo está bastante más extendido.';
    }

    return '¡Bien! El Grupo B está claramente más disperso.';
  });

  continueToQuestion(): void {
    this.nurseryStage.set('question');
  }
  
  canContinue = computed(() =>
    this.spreadRatio() >= 2.8
  );

  finishLesson(): void {
    this.completed.emit();
  }

  startPlantDrag(event: PointerEvent, plantId: number): void {
    event.preventDefault();

    this.draggedPlantId = plantId;
  }

  

  movePlant(event: PointerEvent): void {
    if (this.draggedPlantId === null) {
      return;
    }

    const svg =
      event.currentTarget as SVGSVGElement;

    const point = svg.createSVGPoint();

    point.x = event.clientX;
    point.y = event.clientY;

    const matrix = svg.getScreenCTM();

    if (!matrix) {
      return;
    }

    const svgPoint =
      point.matrixTransform(
        matrix.inverse()
      );

    const plantId = this.draggedPlantId;

    const x = Math.max(
      30,
      Math.min(470, svgPoint.x)
    );

    const y = Math.max(
      35,
      Math.min(185, svgPoint.y)
    );

    this.nurseryPlants.update(plants =>
      plants.map(plant =>
        plant.id === plantId
          ? {
              ...plant,
              x,
              y
            }
          : plant
      )
    );
  }


  
  spreadProgress = computed(() => {
    const ratio = this.spreadRatio();

    const progress =
      ((ratio - 1) / 1.8) * 100;

    return Math.max(
      0,
      Math.min(100, progress)
    );
  });

  

  endPlantDrag(): void {
    this.draggedPlantId = null;
  }

  resetNursery(): void {
    this.nurseryPlants.set(
      this.initialNurseryPlants.map(
        plant => ({ ...plant })
      )
    );

    this.nurseryStage.set('experiment');
    this.nurseryAnswer.set(null);
    this.draggedPlantId = null;
  }

  

finishNurseryExperiment(): void {
  if (!this.canContinue()) {
    return;
  }

  this.nurseryStage.set('observation');
}
  
  answerNursery(answer: string): void {
    this.nurseryAnswer.set(answer);

    if (answer === 'separated') {
      this.nurseryStage.set('completed');
    }
  }


}