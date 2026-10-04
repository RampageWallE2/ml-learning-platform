import {
  afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef,
  inject, Injector, output, signal, viewChild,
} from '@angular/core';

type Stage = 'learn' | 'compare' | 'discovery' | 'practice' | 'practice-reason' | 'practice-review' | 'success';
type Group = { name: string; loads: readonly number[] };
type Reason = 'spread' | 'maximum' | 'count';
const EXAMPLE: readonly Group[] = [{ name: 'Ejemplo', loads: [90, 100, 110] }];
const INITIAL: readonly Group[] = [
  { name: 'A', loads: [98, 102, 100, 101, 99] },
  { name: 'B', loads: [82, 116, 95, 111, 96] },
];

@Component({
  selector: 'app-lesson-01-loading',
  templateUrl: './lesson-01-loading.html',
  styleUrl: './lesson-01-loading.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Lesson01Loading {
  readonly completed = output<void>();
  readonly stage = signal<Stage>('learn');
  readonly feedback = signal('');
  readonly selectedLoad = signal<string | null>(null);
  readonly selectedGroup = signal<string | null>(null);
  readonly practiceRound = signal(0);
  readonly practiceHelped = signal(false);
  readonly ticks = [80, 90, 100, 110, 120];
  readonly step = computed(() => this.stage() === 'learn' ? 1 : ['compare', 'discovery'].includes(this.stage()) ? 2 : 3);
  readonly practicing = computed(() => ['practice', 'practice-reason', 'practice-review'].includes(this.stage()));
  readonly groups = computed<readonly Group[]>(() => {
    if (this.stage() === 'learn') return EXAMPLE;
    if (!this.practicing()) return INITIAL;
    if (this.practiceRound() === 0) return [
      { name: 'C', loads: [110, 111, 112] }, { name: 'D', loads: [90, 100, 110] },
    ];
    if (this.practiceRound() === 1) return [
      { name: 'E', loads: [85, 100, 115] }, { name: 'F', loads: [105, 106, 107] },
    ];
    // A new check comes only AFTER the learner understands the same, supported example.
    const offset = (this.practiceRound() - 2) % 9;
    const wide = { name: 'G', loads: [81 + offset, 95 + offset, 109 + offset] };
    const narrow = { name: 'H', loads: [110 + offset, 111 + offset, 112 + offset] };
    return this.practiceRound() % 2 === 0 ? [narrow, wide] : [wide, narrow];
  });
  readonly correctGroup = computed(() => this.practiceRound() === 0 ? 'D' : this.practiceRound() === 1 ? 'E' : 'G');
  readonly plots = computed(() => this.groups().map(group => ({
    name: group.name,
    description: `Cargas ${group.name === 'Ejemplo' ? 'del ejemplo' : 'del grupo ' + group.name}: ${group.loads.join(', ')} toneladas. La línea va de 80 a 120 toneladas.`,
    points: group.loads.map((tonnes, index) => ({
      id: `${group.name}${index + 1}`, label: `Camión ${group.name === 'Ejemplo' ? index + 1 : group.name + (index + 1)}`,
      tonnes, x: this.scalePosition(tonnes),
    })),
  })));
  readonly selectedPoint = computed(() => this.plots().flatMap(plot => plot.points).find(point => point.id === this.selectedLoad()));
  readonly reasons: readonly { id: Reason; text: string }[] = [
    { id: 'maximum', text: 'Tiene el camión que llevó más material.' },
    { id: 'spread', text: 'Sus cargas son menos parecidas entre sí.' },
    { id: 'count', text: 'Tiene más camiones.' },
  ];
  private readonly injector = inject(Injector);
  private readonly taskHeading = viewChild<ElementRef<HTMLHeadingElement>>('taskHeading');
  private finished = false;

  scalePosition(tonnes: number): number { return (tonnes - 80) * 100 / 40; }

  selectLoad(id: string): void {
    if (this.plots().some(plot => plot.points.some(point => point.id === id))) this.selectedLoad.set(id);
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
      }
    }
  }

  chooseReason(reason: Reason): void {
    if (this.stage() !== 'practice-reason' || !this.reasons.some(option => option.id === reason)) return;
    if (reason === 'spread') {
      this.selectedLoad.set(null);
      this.feedback.set('');
      this.moveTo(this.practiceHelped() ? 'practice-review' : 'success');
      return;
    }
    this.practiceHelped.set(true);
    this.feedback.set(reason === 'maximum'
      ? 'Un solo camión no cuenta toda la historia. Mira si las cargas de todo el grupo se parecen o son diferentes.'
      : 'Los dos grupos tienen tres camiones. Lo que cambia es cuánto llevó cada uno.');
  }

  startPractice(): void {
    if (this.stage() !== 'discovery') return;
    this.clearPractice();
    this.moveTo('practice');
  }

  continueAfterHelp(): void {
    if (this.stage() !== 'practice-review') return;
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
    afterNextRender(() => this.taskHeading()?.nativeElement.focus(), { injector: this.injector });
  }

  finish(): void {
    if (this.stage() !== 'success' || this.finished) return;
    this.finished = true;
    this.completed.emit();
  }
}
