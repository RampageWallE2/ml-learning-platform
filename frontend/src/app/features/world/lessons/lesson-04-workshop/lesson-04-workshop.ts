import {
  afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef,
  inject, Injector, input, OnChanges, output, signal, SimpleChanges, viewChild,
} from '@angular/core';
import { LESSON_NAMES } from '../lesson-catalog';
import { calculateRange } from '../lesson-statistics';
import { C4_WORKSHOP_RECORDS as RECORDS, type OpenPitRecordGroup as RecordGroup } from '../data/open-pit-original-records';
import { C4Stage as Stage, C4ExperimentMode as ExperimentMode, C4RangePrediction as RangePrediction,
  C4State, C4_MAX_PRACTICE_ROUNDS, isC4State } from './lesson-04-workshop.state';

type Comparison = 'a' | 'b' | 'same';
type Explanation = 'extremes' | 'unchanged' | 'useless';
type Claim = 'same' | 'different' | 'unknown';
type Evidence = 'a' | 'b' | 'range';
const PRACTICE_SETS: readonly (readonly RecordGroup[])[] = [
  [
    { id: 'C', name: 'Equipo C', values: [6, 8, 8, 8, 10] },
    { id: 'D', name: 'Equipo D', values: [6, 6, 8, 10, 10] },
  ],
  [
    { id: 'E', name: 'Equipo E', values: [8, 8, 11, 14, 14] },
    { id: 'F', name: 'Equipo F', values: [8, 11, 11, 11, 14] },
  ],
  [
    { id: 'G', name: 'Equipo G', values: [6, 7, 7, 7, 8] },
    { id: 'H', name: 'Equipo H', values: [6, 6, 7, 8, 8] },
  ],
];

@Component({
  selector: 'app-lesson-04-workshop',
  templateUrl: './lesson-04-workshop.html',
  styleUrl: './lesson-04-workshop.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Lesson04Workshop implements OnChanges {
  readonly title = LESSON_NAMES['lesson-04'];
  readonly completed = output<void>();
  readonly initialState = input<C4State | null>(null);
  readonly stateChanged = output<C4State>();
  readonly stage = signal<Stage>('compare');
  readonly feedback = signal('');
  readonly experimentMode = signal<ExperimentMode>('together');
  readonly rangePrediction = signal<RangePrediction | null>(null);
  readonly separatedViewed = signal(false);
  readonly round = signal(0);
  readonly practiceHelped = signal(false);
  readonly needsPractice = computed(() => this.practiceHelped() && this.round() < C4_MAX_PRACTICE_ROUNDS);
  readonly guidedCompletion = computed(() => this.stage() === 'success' && this.practiceHelped());
  readonly records = RECORDS;
  readonly ticks = [6, 7, 8, 9, 10, 11, 12, 13, 14];
  readonly practicing = computed(() => ['practice', 'evidence', 'review'].includes(this.stage()));
  readonly experimentVisible = computed(() => ['predict', 'experiment', 'explain', 'discovery'].includes(this.stage()));
  readonly practiceRecords = computed(() => PRACTICE_SETS[this.round() % PRACTICE_SETS.length]);
  readonly simulated = computed(() => this.experimentMode() === 'together' ? [8, 10, 10, 10, 12] : [8, 8, 10, 12, 12]);
  readonly simulatedRange = computed(() => this.range(this.simulated()));
  readonly step = computed(() => this.stage() === 'compare' ? 1 : this.experimentVisible() ? 2 : 3);
  readonly groups = computed<readonly RecordGroup[]>(() => this.practicing() ? this.practiceRecords() : this.experimentVisible() ? [
    { ...this.records[0], name: 'Original de A' },
    { id: 'copy', name: 'Copia de A · experimento', values: this.simulated() },
  ] : this.records);
  readonly plots = computed(() => this.groups().map(group => {
    // Keep unchanged copy records anchored; stack the two moving records above them.
    const stackOrder = group.id === 'copy' ? [0, 4, 2, 1, 3] : group.values.map((_, index) => index);
    return {
      ...group,
      minimum: Math.min(...group.values),
      maximum: Math.max(...group.values),
      range: this.range(group.values),
      description: group.name + ': ' + group.values.join(', ') + ' minutos. Cada punto es una revisión; los puntos uno sobre otro tienen el mismo tiempo. Escala común de 6 a 14 minutos. Rango de ' + this.range(group.values) + ' minutos.',
      points: group.values.map((value, index) => ({
        id: group.id + '-' + (index + 1), value, x: this.position(value),
        bottom: 14 + stackOrder.slice(0, stackOrder.indexOf(index)).filter(previous => group.values[previous] === value).length * 20,
        movable: group.id === 'copy' && (index === 1 || index === 3),
        pinned: this.experimentVisible() && (index === 0 || index === 4),
      })),
    };
  }));
  readonly center = computed(() => {
    const values = this.practiceRecords()[0].values;
    return (Math.min(...values) + Math.max(...values)) / 2;
  });
  readonly centerCounts = computed(() => this.practiceRecords().map(group => group.values.filter(value => value === this.center()).length));
  readonly concentratedSide = computed<Evidence>(() => this.centerCounts()[0] > this.centerCounts()[1] ? 'a' : 'b');
  readonly concentratedGroup = computed(() => this.practiceRecords()[this.concentratedSide() === 'a' ? 0 : 1]);
  readonly compareChoices: readonly { id: Comparison; text: string }[] = [
    { id: 'same', text: 'Cada tiempo aparece la misma cantidad de veces en A y B.' },
    { id: 'a', text: 'En A hay más revisiones de 10 minutos que en B.' },
    { id: 'b', text: 'En B hay más revisiones de 10 minutos que en A.' },
  ];
  readonly predictions: readonly { id: RangePrediction; text: string }[] = [
    { id: 'increase', text: 'Será mayor' },
    { id: 'same', text: 'Seguirá igual' },
    { id: 'decrease', text: 'Será menor' },
  ];
  readonly predictionText = computed(() => this.predictions.find(choice => choice.id === this.rangePrediction())?.text ?? '');
  readonly predictionOutcome = computed(() => {
    if (this.experimentMode() !== 'apart' || !this.rangePrediction()) return '';
    const result = 'El rango sigue siendo ' + this.simulatedRange() + ' minutos.';
    return this.rangePrediction() === 'same' ? 'Tu idea coincide con lo que pasó. ' + result
      : 'Pensabas que sería ' + (this.rangePrediction() === 'increase' ? 'mayor' : 'menor') + '. ' + result;
  });
  readonly explanations: readonly { id: Explanation; text: string }[] = [
    { id: 'unchanged', text: 'Porque ningún tiempo cambió.' },
    { id: 'extremes', text: 'Porque el tiempo menor y el mayor siguen siendo 8 y 12.' },
    { id: 'useless', text: 'Porque el rango no sirve para nada.' },
  ];
  readonly claims: readonly { id: Claim; text: string }[] = [
    { id: 'same', text: 'Mantener: con el mismo rango, cada tiempo se repite igual.' },
    { id: 'different', text: 'Corregir: el rango es igual, pero los tiempos no se repiten igual.' },
    { id: 'unknown', text: 'No podemos comparar, aunque vemos todos los tiempos.' },
  ];
  readonly evidenceChoices = computed<readonly { id: Evidence; text: string }[]>(() => [
    { id: 'a', text: 'En ' + this.practiceRecords()[0].id + ' hay más revisiones de ' + this.center() + ' minutos que en ' + this.practiceRecords()[1].id + '.' },
    { id: 'b', text: 'En ' + this.practiceRecords()[1].id + ' hay más revisiones de ' + this.center() + ' minutos que en ' + this.practiceRecords()[0].id + '.' },
    { id: 'range', text: 'Los dos equipos tienen el mismo rango.' },
  ]);
  private readonly injector = inject(Injector);
  private readonly taskHeading = viewChild<ElementRef<HTMLHeadingElement>>('taskHeading');
  private readonly separateButton = viewChild<ElementRef<HTMLButtonElement>>('separateButton');
  private finished = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['initialState']) return;
    const state = this.initialState();
    if (state !== null && !isC4State(state)) return;
    if (state) {
      this.stage.set(state.stage); this.experimentMode.set(state.experimentMode); this.rangePrediction.set(state.rangePrediction);
      this.separatedViewed.set(state.separatedViewed); this.round.set(state.round); this.practiceHelped.set(state.practiceHelped);
    }
    this.feedback.set(''); this.finished = false; this.publishState();
  }

  private publishState(): void {
    this.stateChanged.emit({ stage: this.stage(), experimentMode: this.experimentMode(), rangePrediction: this.rangePrediction(),
      separatedViewed: this.separatedViewed(), round: this.round(), practiceHelped: this.practiceHelped() });
  }

  position(value: number): number { return (value - 6) / 8 * 100; }
  range(values: readonly number[]): number { return calculateRange(values); }

  compare(answer: Comparison): void {
    if (this.stage() !== 'compare' || !this.compareChoices.some(choice => choice.id === answer)) return;
    if (answer === 'a') this.moveTo('predict');
    else this.hint('Mira los puntos de 10 minutos: en A hay tres y en B hay uno. El tiempo menor y el mayor son iguales en ambos, pero los demás tiempos no.');
  }

  predictRange(answer: RangePrediction): void {
    if (this.stage() !== 'predict' || !this.predictions.some(choice => choice.id === answer)) return;
    this.rangePrediction.set(answer);
    this.moveTo('experiment');
  }

  setExperiment(mode: ExperimentMode): void {
    if (this.stage() !== 'experiment' || !this.rangePrediction() || !['together', 'apart'].includes(mode)) return;
    this.experimentMode.set(mode);
    if (mode === 'apart') this.separatedViewed.set(true);
    this.feedback.set('');
    this.publishState();
  }

  showChanges(): void {
    if (this.stage() !== 'experiment' || !this.rangePrediction()) return;
    if (!this.separatedViewed() || this.experimentMode() !== 'apart') {
      this.hint('Pulsa «Separar tiempos» para ver cómo cambian los dos puntos de la copia.');
      return;
    }
    this.moveTo('explain');
  }

  explain(answer: Explanation): void {
    if (this.stage() !== 'explain' || !this.explanations.some(choice => choice.id === answer)) return;
    if (answer === 'extremes') this.moveTo('discovery');
    else this.hint(answer === 'unchanged'
      ? 'Dos tiempos de la copia cambiaron de lugar: de 10 a 8 y a 12. Lo que se mantuvo fue el tiempo menor y el mayor.'
      : 'El rango sí muestra cuánto separa al tiempo menor del mayor. No muestra cómo son los demás tiempos.');
  }

  startPractice(): void {
    if (this.stage() !== 'discovery') return;
    this.practiceHelped.set(false);
    this.moveTo('practice');
  }

  chooseClaim(answer: Claim): void {
    if (this.stage() !== 'practice' || !this.claims.some(choice => choice.id === answer)) return;
    if (answer === 'different') this.moveTo('evidence');
    else this.hint(answer === 'same'
      ? 'El mismo rango solo dice que hay la misma diferencia entre el tiempo menor y el mayor. Mira también los demás puntos.'
      : 'Sí tenemos los datos para comparar. Cuenta los puntos que están uno sobre otro en cada tiempo.');
  }

  chooseEvidence(answer: Evidence): void {
    if (this.stage() !== 'evidence' || !this.evidenceChoices().some(choice => choice.id === answer)) return;
    if (answer === this.concentratedSide()) this.moveTo(this.needsPractice() ? 'review' : 'success');
    else this.hint(answer === 'range'
      ? 'Eso es cierto, pero no muestra la diferencia entre los demás tiempos. Busca en qué equipo hay más revisiones de ' + this.center() + ' minutos.'
      : 'Cuenta los puntos en ' + this.center() + ' minutos: hay ' + this.centerCounts()[0] + ' en ' + this.practiceRecords()[0].id + ' y ' + this.centerCounts()[1] + ' en ' + this.practiceRecords()[1].id + '.');
  }

  continueAfterHelp(): void {
    if (this.stage() !== 'review') return;
    // Preserve an older resolved review and close only on explicit action.
    if (!this.needsPractice()) {
      this.moveTo('success');
      return;
    }
    this.round.update(round => round + 1);
    this.practiceHelped.set(false);
    this.moveTo('practice');
  }

  private hint(message: string): void {
    if (this.practicing()) this.practiceHelped.set(true);
    this.feedback.set(message);
    this.publishState();
  }

  private moveTo(stage: Stage): void {
    this.feedback.set('');
    this.stage.set(stage);
    this.publishState();
    this.focusTask();
  }

  private focusTask(): void {
    afterNextRender(() => {
      const target = this.stage() === 'experiment' ? this.separateButton() : this.taskHeading();
      target?.nativeElement.focus();
      if (this.stage() === 'experiment') {
        target?.nativeElement.scrollIntoView?.({ block: 'center', inline: 'nearest', behavior: 'instant' });
      }
    }, { injector: this.injector });
  }

  finish(): void {
    if (this.stage() !== 'success' || this.finished) return;
    this.finished = true;
    this.publishState();
    this.completed.emit();
  }
}
