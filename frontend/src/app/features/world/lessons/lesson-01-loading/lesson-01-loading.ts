import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';

type Stage = 'compare' | 'justify' | 'discovery' | 'practice' | 'practice-hint' | 'practice-justify' | 'success';
type Group = { name: string; loads: readonly number[] };
type Reason = 'spread' | 'maximum' | 'count';
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
  readonly stage = signal<Stage>('compare');
  readonly feedback = signal('');
  readonly selectedLoad = signal<string | null>(null);
  readonly practiceRound = signal(0);
  readonly ticks = [80, 90, 100, 110, 120];
  readonly practicing = computed(() => ['practice', 'practice-hint', 'practice-justify'].includes(this.stage()));
  readonly groups = computed<readonly Group[]>(() => {
    if (!this.practicing()) return INITIAL;
    if (this.practiceRound() === 0) return [
      { name: 'C', loads: [110, 111, 112] }, { name: 'D', loads: [90, 100, 110] },
    ];
    if (this.practiceRound() === 1) return [
      { name: 'E', loads: [85, 100, 115] }, { name: 'F', loads: [105, 106, 107] },
    ];
    // New comparisons after further hints, always within the same 80–120 t scale.
    const offset = (this.practiceRound() - 2) % 9;
    const wide = { name: 'G', loads: [81 + offset, 95 + offset, 109 + offset] };
    const narrow = { name: 'H', loads: [110 + offset, 111 + offset, 112 + offset] };
    return this.practiceRound() % 2 === 0 ? [narrow, wide] : [wide, narrow];
  });
  readonly correctGroup = computed(() => this.practiceRound() === 0 ? 'D' : this.practiceRound() === 1 ? 'E' : 'G');
  readonly plots = computed(() => this.groups().map(group => ({
    name: group.name,
    points: group.loads.map((tonnes, index) => ({
      id: `${group.name}${index + 1}`, tonnes, x: this.scaleX(tonnes), labelY: 25 + index * 22,
    })),
  })));
  private finished = false;

  scaleX(tonnes: number): number { return 30 + (tonnes - 80) * 12; }

  chooseGroup(name: string): void {
    if (this.stage() === 'compare') {
      if (name !== 'A' && name !== 'B') return;
      if (name === 'B') {
        this.stage.set('justify');
        this.feedback.set('Elegiste el grupo B. ¿Qué observación respalda tu decisión?');
      } else {
        this.feedback.set('Observa el espacio que ocupa cada grupo en la misma escala. ¿Cuál reúne sus cargas en una zona más estrecha?');
      }
    } else if (this.stage() === 'practice') {
      if (!this.groups().some(group => group.name === name)) return;
      if (name === this.correctGroup()) {
        this.stage.set('practice-justify');
        this.feedback.set('Ahora elige la observación que respalda tu respuesta.');
      } else {
        this.practiceHint('Las cargas más altas pueden estar muy próximas entre sí. Compara la separación del conjunto completo. Practiquemos con otros registros.');
      }
    }
  }

  chooseReason(reason: Reason): void {
    if (this.stage() !== 'justify' && this.stage() !== 'practice-justify') return;
    if (reason === 'spread') {
      const initial = this.stage() === 'justify';
      this.stage.set(initial ? 'discovery' : 'success');
      this.selectedLoad.set(null);
      this.feedback.set(initial
        ? 'Exacto. En A las cargas están próximas entre sí; en B están más separadas. A esa separación de los datos la llamamos dispersión.'
        : 'Correcto. Reconociste la dispersión en nuevos registros y la distinguiste del tamaño de las cargas.');
      return;
    }
    const hint = reason === 'maximum'
      ? 'Ese camión es una parte del grupo. Para comparar la dispersión, observa también cómo se distribuyen los demás.'
      : `Ambos grupos tienen ${this.practicing() ? 'tres' : 'cinco'} registros. La diferencia está en sus cargas.`;
    if (this.stage() === 'practice-justify') this.practiceHint(`${hint} Revisaremos otros registros para comprobarlo.`);
    else this.feedback.set(hint);
  }

  startPractice(): void {
    if (this.stage() !== 'discovery' && this.stage() !== 'practice-hint') return;
    if (this.stage() === 'practice-hint') this.practiceRound.update(round => round + 1);
    this.selectedLoad.set(null);
    this.feedback.set('');
    this.stage.set('practice');
  }

  private practiceHint(message: string): void {
    this.stage.set('practice-hint');
    this.feedback.set(message);
  }

  finish(): void {
    if (this.stage() !== 'success' || this.finished) return;
    this.finished = true;
    this.completed.emit();
  }
}
