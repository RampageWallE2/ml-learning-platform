import {
  afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef,
  inject, Injector, input, OnChanges, output, signal, SimpleChanges, viewChild,
} from '@angular/core';
import { LESSON_NAMES } from '../lesson-catalog';
import { C1Stage as Stage, C1State, C1_MAX_PRACTICE_ROUNDS, c1Groups, c1CorrectGroup, isC1State } from './lesson-01-loading.state';

type Reason = 'spread' | 'maximum' | 'count';

@Component({
  selector: 'app-lesson-01-loading',
  templateUrl: './lesson-01-loading.html',
  styleUrl: './lesson-01-loading.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Lesson01Loading implements OnChanges {
  readonly title = LESSON_NAMES['lesson-01'];
  readonly completed = output<void>();
  readonly initialState = input<C1State | null>(null);
  readonly stateChanged = output<C1State>();
  readonly stage = signal<Stage>('learn');
  readonly feedback = signal('');
  readonly selectedLoad = signal<string | null>(null);
  readonly selectedGroup = signal<string | null>(null);
  readonly practiceRound = signal(0);
  readonly practiceHelped = signal(false);
  readonly needsPractice = computed(() => this.practiceHelped() && this.practiceRound() < C1_MAX_PRACTICE_ROUNDS);
  readonly guidedCompletion = computed(() => this.stage() === 'success' && this.practiceHelped());
  readonly ticks = [80, 90, 100, 110, 120];
  readonly step = computed(() => this.stage() === 'learn' ? 1 : ['compare', 'discovery'].includes(this.stage()) ? 2 : 3);
  readonly practicing = computed(() => ['practice', 'practice-reason', 'practice-review'].includes(this.stage()));
  readonly groups = computed(() => c1Groups(this.stage(), this.practiceRound()));
  readonly correctGroup = computed(() => c1CorrectGroup(this.practiceRound()));
  readonly plots = computed(() => this.groups().map(group => ({
    name: group.name,
    description: `Cargas ${group.name === 'Ejemplo' ? 'del ejemplo' : 'del grupo ' + group.name}: ${group.loads.join(', ')} toneladas. La línea va de 80 a 120 toneladas.`,
    points: group.loads.map((tonnes, index) => ({
      id: `${group.name}${index + 1}`, label: `Camión ${group.name === 'Ejemplo' ? index + 1 : group.name + (index + 1)}`,
      tonnes, x: this.scalePosition(tonnes),
    })),
  })));
  readonly selectedPoint = computed(() => this.plots().flatMap(plot => plot.points).find(point => point.id === this.selectedLoad()));
  private readonly practiceEvidence = computed(() => {
    const groups = c1Groups('practice', this.practiceRound());
    return {
      different: groups.find(group => group.name === this.correctGroup())!,
      similar: groups.find(group => group.name !== this.correctGroup())!,
    };
  });
  readonly evidenceReading = computed(() => {
    const { different, similar } = this.practiceEvidence();
    return different.name + ': ' + different.loads.join(', ') + ' t; '
      + similar.name + ': ' + similar.loads.join(', ') + ' t';
  });
  readonly reasons = computed<readonly { id: Reason; text: string }[]>(() => {
    const { different, similar } = this.practiceEvidence();
    const choices: { id: Reason; text: string }[] = [
      { id: 'maximum', text: different.name + ' llega a ' + Math.max(...different.loads) + ' t y '
        + similar.name + ' a ' + Math.max(...similar.loads) + ' t. Basta mirar esas dos cargas.' },
      { id: 'spread', text: this.evidenceReading() + '. Se parecen menos en ' + different.name + '.' },
      { id: 'count', text: different.name + ': ' + different.loads.length + ' camiones; '
        + similar.name + ': ' + similar.loads.length + ' camiones. La cantidad de camiones explica la diferencia.' },
    ];
    // The round determines the order, so hints and reopening keep it stable.
    const offset = this.practiceRound() % choices.length;
    return choices.map((_, index) => choices[(index + offset) % choices.length]);
  });
  private readonly injector = inject(Injector);
  private readonly taskHeading = viewChild<ElementRef<HTMLHeadingElement>>('taskHeading');
  private finished = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['initialState']) return;
    const state = this.initialState();
    if (state !== null && !isC1State(state)) return;
    if (state) {
      this.stage.set(state.stage); this.selectedLoad.set(state.selectedLoad); this.selectedGroup.set(state.selectedGroup);
      this.practiceRound.set(state.practiceRound); this.practiceHelped.set(state.practiceHelped);
    }
    this.feedback.set(''); this.finished = false; this.publishState();
  }

  private publishState(): void {
    this.stateChanged.emit({ stage: this.stage(), selectedLoad: this.selectedLoad(), selectedGroup: this.selectedGroup(),
      practiceRound: this.practiceRound(), practiceHelped: this.practiceHelped() });
  }

  scalePosition(tonnes: number): number { return (tonnes - 80) * 100 / 40; }

  selectLoad(id: string): void {
    if (this.plots().some(plot => plot.points.some(point => point.id === id))) {
      this.selectedLoad.set(id); this.publishState();
    }
  }

  startComparison(): void {
    if (this.stage() !== 'learn' || !this.selectedPoint()) return;
    this.selectedLoad.set(null);
    this.moveTo('compare');
  }

  chooseGroup(name: string): void {
    if (!this.groups().some(group => group.name === name)) return;
    if (this.stage() === 'compare') {
      if (name === 'B') {
        this.feedback.set('');
        this.moveTo('discovery');
      } else {
        this.feedback.set('Mira todos los puntos. En A están juntos: las cargas se parecen. ¿En qué grupo están más separados?');
      }
    } else if (this.stage() === 'practice') {
      if (name === this.correctGroup()) {
        this.selectedGroup.set(name);
        this.feedback.set('');
        this.moveTo('practice-reason');
      } else {
        this.practiceHelped.set(true);
        this.feedback.set('Un grupo puede llevar más material y tener cargas muy parecidas. Mira la separación entre todos sus puntos.');
        this.publishState();
      }
    }
  }

  chooseReason(reason: Reason): void {
    if (this.stage() !== 'practice-reason' || !this.reasons().some(option => option.id === reason)) return;
    if (reason === 'spread') {
      this.selectedLoad.set(null);
      this.feedback.set('');
      this.moveTo(this.needsPractice() ? 'practice-review' : 'success');
      return;
    }
    this.practiceHelped.set(true);
    this.feedback.set(reason === 'maximum'
      ? 'Un solo camión no cuenta toda la historia. Compara todas las cargas: ' + this.evidenceReading()
        + '. Mira cuánto se parecen dentro de cada grupo.'
      : 'Los dos grupos tienen tres camiones. Lo que cambia es cuánto llevó cada uno: '
        + this.evidenceReading() + '.');
    this.publishState();
  }

  startPractice(): void {
    if (this.stage() !== 'discovery') return;
    this.clearPractice();
    this.moveTo('practice');
  }

  continueAfterHelp(): void {
    if (this.stage() !== 'practice-review') return;
    // Older review drafts have already completed an additional practice.
    // Close only on explicit action, retaining the help flag and their round.
    if (!this.needsPractice()) {
      this.selectedLoad.set(null);
      this.feedback.set('');
      this.moveTo('success');
      return;
    }
    this.practiceRound.update(round => round + 1);
    this.clearPractice();
    this.moveTo('practice');
  }

  private clearPractice(): void {
    this.selectedLoad.set(null);
    this.selectedGroup.set(null);
    this.practiceHelped.set(false);
    this.feedback.set('');
  }

  private moveTo(stage: Stage): void {
    this.stage.set(stage);
    this.publishState();
    afterNextRender(() => this.taskHeading()?.nativeElement.focus(), { injector: this.injector });
  }

  finish(): void {
    if (this.stage() !== 'success' || this.finished) return;
    this.finished = true;
    this.publishState();
    this.completed.emit();
  }
}
