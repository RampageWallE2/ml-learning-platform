import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';

type LoadingStage = 'order-a' | 'order-b' | 'compare' | 'success';
type Load = { id: string; tonnes: number };

const GROUPS = [
  { name: 'A', loads: [98, 102, 100, 101, 99] },
  { name: 'B', loads: [82, 116, 95, 111, 96] }
] as const;

function initialLoads(group: 0 | 1): Load[] {
  return GROUPS[group].loads.map((tonnes, index) => ({
    id: `${GROUPS[group].name}${index + 1}`, tonnes
  }));
}

@Component({
  selector: 'app-lesson-01-loading',
  templateUrl: './lesson-01-loading.html',
  styleUrl: './lesson-01-loading.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Lesson01Loading {
  readonly completed = output<void>();
  readonly stage = signal<LoadingStage>('order-a');
  readonly loads = signal(initialLoads(0));
  readonly orderAccepted = signal(false);
  readonly feedback = signal('');
  readonly draggedId = signal<string | null>(null);
  readonly dropIndex = signal<number | null>(null);
  readonly ordering = computed(() => this.stage() === 'order-a' || this.stage() === 'order-b');
  readonly groupName = computed(() => this.stage() === 'order-a' ? 'A' : 'B');
  readonly ticks = [80, 90, 100, 110, 120];

  // Every position uses the same 80–120 t scale. Stagger only the labels vertically.
  readonly plots = GROUPS.map(group => ({
    name: group.name,
    values: [...group.loads].sort((a, b) => a - b),
    points: [...group.loads].sort((a, b) => a - b).map((tonnes, index) => ({
      tonnes, x: this.scaleX(tonnes), labelY: 30 + index * 21
    }))
  }));

  private pointerId: number | null = null;
  private finished = false;

  scaleX(tonnes: number): number {
    return 30 + (tonnes - 80) * 12;
  }

  moveLoad(from: number, to: number): void {
    if (!this.ordering() || this.orderAccepted() || from === to ||
        from < 0 || to < 0 || from >= this.loads().length || to >= this.loads().length) return;

    const next = [...this.loads()];
    const [load] = next.splice(from, 1);
    next.splice(to, 0, load);
    this.loads.set(next);
    this.feedback.set('');
  }

  startDrag(event: PointerEvent, id: string): void {
    if (event.button !== 0 || !event.isPrimary || this.pointerId !== null ||
        !this.ordering() || this.orderAccepted()) return;

    event.preventDefault();
    const handle = event.currentTarget as HTMLElement;
    handle.focus();
    handle.setPointerCapture(event.pointerId);
    this.pointerId = event.pointerId;
    this.draggedId.set(id);
    this.dropIndex.set(this.loads().findIndex(load => load.id === id));
  }

  drag(event: PointerEvent): void {
    if (event.pointerId !== this.pointerId) return;

    const handle = event.currentTarget as HTMLElement;
    const list = handle.closest('.load-list');
    const target = handle.ownerDocument.elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-load-index]');
    this.dropIndex.set(target && list?.contains(target) ? Number(target.dataset['loadIndex']) : null);
  }

  endDrag(event: PointerEvent): void {
    if (event.pointerId !== this.pointerId) return;
    this.drag(event);
    const from = this.loads().findIndex(load => load.id === this.draggedId());
    const to = this.dropIndex();
    this.cancelDrag();
    if (to !== null) this.moveLoad(from, to);
  }

  cancelDrag(): void {
    this.pointerId = null;
    this.draggedId.set(null);
    this.dropIndex.set(null);
  }

  checkOrder(): void {
    if (!this.ordering() || this.orderAccepted()) return;
    this.cancelDrag();
    const loads = this.loads();
    const sorted = loads.every((load, index) => index === 0 || loads[index - 1].tonnes <= load.tonnes);
    this.orderAccepted.set(sorted);
    this.feedback.set(sorted
      ? `Correcto. El Grupo ${this.groupName()} está ordenado de menor a mayor carga.`
      : 'Inténtalo nuevamente. Revisa cada par: la carga de la izquierda debe ser menor que la siguiente. En móvil, lee de arriba hacia abajo.');
  }

  continueOrder(): void {
    if (!this.orderAccepted() || !this.ordering()) return;
    this.cancelDrag();
    if (this.stage() === 'order-a') {
      this.loads.set(initialLoads(1));
      this.stage.set('order-b');
    } else {
      this.stage.set('compare');
    }
    this.orderAccepted.set(false);
    this.feedback.set('');
  }

  chooseGroup(group: 'A' | 'B'): void {
    if (this.stage() !== 'compare') return;
    if (group === 'B') {
      this.stage.set('success');
      this.feedback.set('Correcto. Los valores del Grupo B están mucho más extendidos.');
    } else {
      this.feedback.set('Inténtalo nuevamente. Observa en cuál grupo las cargas ocupan una parte más amplia de la escala.');
    }
  }

  finish(): void {
    if (this.stage() !== 'success' || this.finished) return;
    this.finished = true;
    this.completed.emit();
  }
}
