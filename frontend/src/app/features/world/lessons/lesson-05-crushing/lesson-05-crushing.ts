import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';

type Stage = 'mean' | 'records' | 'compare' | 'practice' | 'interpret' | 'success';
@Component({
  selector: 'app-lesson-05-crushing',
  templateUrl: './lesson-05-crushing.html',
  styleUrl: './lesson-05-crushing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Lesson05Crushing {
  readonly completed = output<void>();
  readonly stage = signal<Stage>('mean');
  readonly feedback = signal('');
  readonly meanInput = signal('');
  readonly selected = signal<number | null>(null);
  readonly side = signal<'below' | 'equal' | 'above' | null>(null);
  readonly deviation = signal('');
  readonly distance = signal('');
  readonly solved = signal<number[]>([]);
  readonly practicing = computed(() => this.stage() === 'practice' || this.stage() === 'interpret');
  readonly values = computed(() => this.practicing() ? [90, 100, 110] : [80, 80, 120, 120]);
  readonly ticks = [80, 90, 100, 110, 120];
  readonly current = computed(() => this.selected() === null ? null : this.values()[this.selected()!]);
  readonly allSolved = computed(() => this.solved().length === this.values().length);
  readonly segmentLeft = computed(() => this.position(Math.min(this.current() ?? 100, 100)));
  readonly segmentWidth = computed(() => Math.abs(this.position(this.current() ?? 100) - this.position(100)));
  private finished = false;

  position(value: number): number { return 30 + (value - 80) * 12; }

  checkMean(): void {
    if (this.stage() !== 'mean') return;
    if (this.meanInput().trim() && Number(this.meanInput()) === 100) {
      this.stage.set('records');
      this.feedback.set('La media es 100 t/h. Selecciona cada registro para compararlo con ella.');
    } else this.feedback.set('Suma los cuatro registros y divide entre cuatro. Puedes consultar la ayuda.');
  }

  select(index: number): void {
    if (!['records', 'practice'].includes(this.stage()) || !Number.isInteger(index) || index < 0 || index >= this.values().length || this.solved().includes(index)) return;
    this.selected.set(index); this.side.set(null); this.deviation.set(''); this.distance.set(''); this.feedback.set('');
  }

  checkRecord(): void {
    if (!['records', 'practice'].includes(this.stage()) || this.selected() === null) return;
    const index = this.selected()!;
    if (this.solved().includes(index)) return;
    const delta = this.values()[index] - 100;
    const expectedSide = delta < 0 ? 'below' : delta > 0 ? 'above' : 'equal';
    if (this.side() !== expectedSide) {
      this.feedback.set('Compara el valor con 100: ¿está por debajo, coincide o está por encima?');
    } else if (!this.deviation().trim() || Number(this.deviation()) !== delta) {
      this.feedback.set('La desviación es dato menos media. Por debajo es negativa; por encima, positiva; si coinciden, es cero.');
    } else if (!this.distance().trim() || Number(this.distance()) !== Math.abs(delta)) {
      this.feedback.set('La distancia mide la longitud de la separación. Nunca es negativa y vale cero cuando el registro coincide con la media.');
    } else {
      this.solved.update(indices => [...indices, index]);
      this.selected.set(null);
      this.feedback.set(`Registro ${index + 1}: desviación ${delta > 0 ? '+' : ''}${delta} t/h y distancia ${Math.abs(delta)} t/h.`);
    }
  }

  continueRecords(): void {
    if (!this.allSolved()) return;
    if (this.stage() === 'records') { this.stage.set('compare'); this.feedback.set(''); }
    else if (this.stage() === 'practice') { this.stage.set('interpret'); this.feedback.set(''); }
  }

  compare(answer: 'same-distance' | 'negative-shorter'): void {
    if (this.stage() !== 'compare') return;
    if (answer === 'same-distance') {
      this.solved.set([]); this.selected.set(null); this.stage.set('practice');
      this.feedback.set('Ahora aplica la idea a nuevos registros: 90, 100 y 110 t/h. Su media también es 100 t/h.');
    } else this.feedback.set('Los segmentos de 80 a 100 y de 100 a 120 tienen igual longitud. El signo señala el lado, no una distancia menor.');
  }

  interpret(answer: 'direction' | 'negative-distance' | 'different-distance'): void {
    if (this.stage() !== 'interpret') return;
    if (answer === 'direction') {
      this.stage.set('success');
      this.feedback.set('Correcto. −10 y +10 indican lados distintos y la misma distancia de 10 t/h. En la media, ambas medidas son cero.');
    } else this.feedback.set('Distingue el lado de la media de la longitud del segmento: las distancias de 90 y 110 a 100 son iguales y no negativas.');
  }

  finish(): void {
    if (this.stage() !== 'success' || this.finished) return;
    this.finished = true; this.completed.emit();
  }
}
