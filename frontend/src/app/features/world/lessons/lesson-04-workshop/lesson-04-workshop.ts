import {
  afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef,
  inject, Injector, input, OnChanges, output, signal, SimpleChanges, viewChild,
} from '@angular/core';
import { LESSON_NAMES } from '../lesson-catalog';
import { calculateRange } from '../lesson-statistics';
import { C4_WORKSHOP_RECORDS as RECORDS, type OpenPitRecordGroup as RecordGroup } from '../data/open-pit-original-records';
import { C4Stage as Stage, C4State, C4_MAX_PRACTICE_ROUNDS, readC4State } from './lesson-04-workshop.state';

type Comparison = 'a' | 'b' | 'same';
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
  readonly round = signal(0);
  readonly practiceHelped = signal(false);
  readonly needsPractice = computed(() => this.practiceHelped() && this.round() < C4_MAX_PRACTICE_ROUNDS);
  readonly guidedCompletion = computed(() => this.stage() === 'success' && this.practiceHelped());
  readonly records = RECORDS;
  readonly ticks = [6, 7, 8, 9, 10, 11, 12, 13, 14];
  readonly practicing = computed(() => ['practice', 'evidence', 'review'].includes(this.stage()));
  readonly practiceRecords = computed(() => PRACTICE_SETS[this.round() % PRACTICE_SETS.length]);
  readonly step = computed(() => this.stage() === 'compare' ? 1 : this.stage() === 'discovery' ? 2 : 3);
  readonly groups = computed<readonly RecordGroup[]>(() => this.practicing() ? this.practiceRecords() : this.records);
  readonly plots = computed(() => this.groups().map(group => {
    return {
      ...group,
      minimum: Math.min(...group.values),
      maximum: Math.max(...group.values),
      range: this.range(group.values),
      description: group.name + ': ' + group.values.join(', ') + ' minutos. Cada punto es una revisión; los puntos uno sobre otro tienen el mismo tiempo. Escala común de 6 a 14 minutos. Rango de ' + this.range(group.values) + ' minutos.',
      points: group.values.map((value, index) => ({
        id: group.id + '-' + (index + 1), value, x: this.position(value),
        bottom: 14 + group.values.slice(0, index).filter(previous => previous === value).length * 20,
        pinned: this.stage() === 'discovery' && (index === 0 || index === group.values.length - 1),
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
  private finished = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['initialState']) return;
    const initial = this.initialState();
    const state = initial === null ? null : readC4State(initial);
    if (initial !== null && state === null) return;
    if (state) {
      this.stage.set(state.stage); this.round.set(state.round); this.practiceHelped.set(state.practiceHelped);
    }
    this.feedback.set(''); this.finished = false; this.publishState();
  }

  private publishState(): void {
    this.stateChanged.emit({ stage: this.stage(), round: this.round(), practiceHelped: this.practiceHelped() });
  }

  position(value: number): number { return (value - 6) / 8 * 100; }
  range(values: readonly number[]): number { return calculateRange(values); }

  compare(answer: Comparison): void {
    if (this.stage() !== 'compare' || !this.compareChoices.some(choice => choice.id === answer)) return;
    if (answer === 'a') this.moveTo('discovery');
    else this.hint('Mira los puntos de 10 minutos: en A hay tres y en B hay uno. El tiempo menor y el mayor son iguales en ambos, pero los demás tiempos no.');
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
    afterNextRender(() => this.taskHeading()?.nativeElement.focus(), { injector: this.injector });
  }

  finish(): void {
    if (this.stage() !== 'success' || this.finished) return;
    this.finished = true;
    this.publishState();
    this.completed.emit();
  }
}
