import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';

type Stage = 'report' | 'request' | 'records' | 'discovery' | 'practice' | 'reason' | 'hint' | 'success';
@Component({
  selector: 'app-lesson-02-ramp',
  templateUrl: './lesson-02-ramp.html',
  styleUrl: './lesson-02-ramp.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Lesson02Ramp {
  readonly completed = output<void>();
  readonly stage = signal<Stage>('report');
  readonly feedback = signal('');
  readonly round = signal(0);
  readonly turns = [
    { id: 'A', values: [98, 101, 100, 99, 102] },
    { id: 'B', values: [80, 120, 90, 110, 100] },
  ];
  readonly practicing = computed(() => ['practice', 'reason', 'hint'].includes(this.stage()));
  readonly practiceMean = computed(() => 90 + this.round() * 5);
  readonly showRecords = computed(() => ['records', 'discovery'].includes(this.stage()));
  private finished = false;

  average(values: readonly number[]): number { return values.reduce((sum, value) => sum + value, 0) / values.length; }
  position(value: number): number { return (value - 80) * 2.5; }

  assess(answer: 'same' | 'b' | 'unknown'): void {
    if (this.stage() !== 'report') return;
    if (answer === 'unknown') {
      this.stage.set('request');
      this.feedback.set('El informe todavía no permite comparar la dispersión. Decide qué información necesitas.');
    } else {
      this.feedback.set('El informe muestra el promedio, pero no las cargas individuales. ¿Qué información respalda tu conclusión sobre su separación?');
    }
  }

  request(answer: 'records' | 'drivers' | 'decimals'): void {
    if (this.stage() !== 'request') return;
    if (answer === 'records') {
      this.stage.set('records');
      this.feedback.set('Registros recibidos. Compara las cargas de los dos turnos.');
    } else {
      this.feedback.set(answer === 'drivers'
        ? 'Los nombres identifican a los conductores, pero no muestran cuánto se separan las cargas.'
        : 'Escribir estos mismos promedios con más decimales no muestra las diferencias entre las cargas.');
    }
  }

  compare(answer: 'same' | 'spread' | 'mean'): void {
    if (this.stage() !== 'records') return;
    if (answer === 'spread') {
      this.stage.set('discovery');
      this.feedback.set('Los promedios coinciden, pero las cargas del turno B están más separadas. Los registros aportaron información que faltaba en el informe.');
    } else {
      this.feedback.set(answer === 'mean'
        ? 'Ambas medias son 100 t. Observa la separación de las cargas, no solo la mayor carga.'
        : 'Las medias coinciden. ¿También coincide el espacio que ocupan las cargas en las escalas?');
    }
  }

  startPractice(): void {
    if (this.stage() !== 'discovery' && this.stage() !== 'hint') return;
    if (this.stage() === 'hint') this.round.update(value => value + 1);
    this.stage.set('practice');
    this.feedback.set('');
  }

  answerPractice(answer: 'yes' | 'unknown'): void {
    if (this.stage() !== 'practice') return;
    if (answer === 'unknown') {
      this.stage.set('reason');
      this.feedback.set('Elige la razón que respalda esa conclusión.');
    } else this.hint();
  }

  explain(answer: 'center' | 'always-different' | 'always-same'): void {
    if (this.stage() !== 'reason') return;
    if (answer === 'center') {
      this.stage.set('success');
      this.feedback.set('Correcto. Medias iguales no garantizan dispersiones iguales ni diferentes. Necesitamos información adicional.');
    } else this.hint();
  }

  private hint(): void {
    this.stage.set('hint');
    this.feedback.set('Dos conjuntos con la misma media pueden tener igual o distinta dispersión. La media por sí sola no permite decidirlo. Compruébalo con otros informes.');
  }

  finish(): void {
    if (this.stage() !== 'success' || this.finished) return;
    this.finished = true;
    this.completed.emit();
  }
}
