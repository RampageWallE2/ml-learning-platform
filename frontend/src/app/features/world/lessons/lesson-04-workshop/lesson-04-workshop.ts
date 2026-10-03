import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';

type Stage = 'ranges' | 'compare' | 'simulation' | 'explain' | 'practice' | 'success';
@Component({
  selector: 'app-lesson-04-workshop',
  templateUrl: './lesson-04-workshop.html',
  styleUrl: './lesson-04-workshop.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Lesson04Workshop {
  readonly completed = output<void>();
  readonly stage = signal<Stage>('ranges');
  readonly feedback = signal('');
  readonly rangeA = signal('');
  readonly rangeB = signal('');
  readonly distance = signal(0);
  readonly practiceC = signal('');
  readonly practiceD = signal('');
  readonly practiceClaim = signal<'same' | 'different' | 'unknown' | null>(null);
  readonly records = [
    { name: 'Equipo A', values: [8, 10, 10, 10, 12] },
    { name: 'Equipo B', values: [8, 8, 10, 12, 12] },
  ];
  readonly practiceRecords = [
    { name: 'C', values: [6, 8, 8, 8, 10] },
    { name: 'D', values: [6, 6, 8, 10, 10] },
  ];
  readonly simulated = computed(() => [8, 10 - this.distance(), 10, 10 + this.distance(), 12]);
  readonly simulatedRange = computed(() => Math.max(...this.simulated()) - Math.min(...this.simulated()));
  readonly simulatedMean = computed(() => this.simulated().reduce((sum, value) => sum + value, 0) / 5);
  readonly ticks = [6, 7, 8, 9, 10, 11, 12, 13, 14];
  readonly plots = computed(() => {
    const groups = this.stage() === 'practice' ? this.practiceRecords : this.records;
    const visible = this.stage() === 'simulation' || this.stage() === 'explain'
      ? [...groups, { name: 'Copia de simulación de A', values: this.simulated() }] : groups;
    return visible.map(group => ({ ...group, points: group.values.map((value, index) => ({
      value, x: this.position(value), y: 24 + index * 22,
    })) }));
  });
  private finished = false;

  position(value: number): number { return 30 + (value - 6) * 60; }

  checkRanges(): void {
    if (this.stage() !== 'ranges') return;
    if (this.rangeA().trim() && this.rangeB().trim() && Number(this.rangeA()) === 4 && Number(this.rangeB()) === 4) {
      this.stage.set('compare');
      this.feedback.set('Ambos rangos son 4 minutos. Ahora contrasta la conclusión del informe con los registros.');
    } else this.feedback.set('Calcula máximo menos mínimo para cada equipo. Expresa ambas respuestas en minutos.');
  }

  compare(answer: 'identical' | 'concentrated'): void {
    if (this.stage() !== 'compare') return;
    if (answer === 'concentrated') {
      this.stage.set('simulation');
      this.feedback.set('A tiene tres registros en 10 minutos. Explora una copia para comprobar qué cambios detecta el rango.');
    } else this.feedback.set('Los extremos coinciden, pero observa cuántos registros hay en 10 minutos en cada equipo.');
  }

  moveInterior(raw: string): void {
    if (this.stage() !== 'simulation') return;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0 || value > 2) return;
    this.distance.set(value);
    this.feedback.set('');
  }

  confirmSimulation(): void {
    if (this.stage() !== 'simulation') return;
    if (this.distance() === 0) {
      this.feedback.set('Construye una distribución distinta moviendo los registros interiores.');
      return;
    }
    this.stage.set('explain');
    this.feedback.set('Cambiaste la distribución. El rango sigue siendo 4 minutos y la media sigue siendo 10 minutos.');
  }

  explain(answer: 'extremes' | 'unchanged' | 'useless'): void {
    if (this.stage() !== 'explain') return;
    if (answer === 'extremes') {
      this.stage.set('practice');
      this.feedback.set('Comprueba la idea con estos nuevos registros de una tarea comparable.');
    } else this.feedback.set(answer === 'unchanged'
      ? 'Dos registros cambiaron de posición. ¿Qué valores permanecieron fijos?'
      : 'El rango sí informa sobre los extremos, aunque no detecte todos los cambios interiores.');
  }

  checkPractice(): void {
    if (this.stage() !== 'practice') return;
    if (!this.practiceC().trim() || !this.practiceD().trim() || Number(this.practiceC()) !== 4 || Number(this.practiceD()) !== 4) {
      this.feedback.set('Revisa el mínimo y el máximo de cada conjunto para calcular sus rangos.');
    } else if (this.practiceClaim() !== 'different') {
      this.feedback.set('Compara también los registros interiores. Un mismo rango no garantiza la misma distribución.');
    } else {
      this.stage.set('success');
      this.feedback.set('Correcto. Ambos rangos son 4 minutos, pero los registros interiores se distribuyen de manera diferente.');
    }
  }

  finish(): void {
    if (this.stage() !== 'success' || this.finished) return;
    this.finished = true;
    this.completed.emit();
  }
}
