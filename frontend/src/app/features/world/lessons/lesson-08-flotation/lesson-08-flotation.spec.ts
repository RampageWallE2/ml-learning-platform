import { TestBed } from '@angular/core/testing';
import { Lesson08Flotation } from './lesson-08-flotation';
import { LESSON_NAMES } from '../lesson-catalog';

function create() {
  const fixture = TestBed.createComponent(Lesson08Flotation);
  fixture.detectChanges();
  return fixture;
}
function reachBand(game: Lesson08Flotation): void {
  game.startRoot();
  game.answerRoot(game.stats().standardDeviation);
  game.continueToBand();
}
function reachReport(game: Lesson08Flotation): void {
  reachBand(game);
  const stats = game.stats();
  game.selectRecord(
    game.records().findIndex((value) => Math.abs(value - stats.mean) > stats.standardDeviation),
  );
  completeComparison(game);
}
function reachComparison(game: Lesson08Flotation): void {
  reachBand(game);
  const stats = game.stats();
  game.selectRecord(
    game.records().findIndex((value) => Math.abs(value - stats.mean) > stats.standardDeviation),
  );
  game.continueToReport();
}
function completeComparison(game: Lesson08Flotation): void {
  game.continueToReport();
  game.answerComparison('inside');
  game.continueToReport();
}
function click(root: HTMLElement, label: string): void {
  const button = [...root.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.textContent?.replace(/\s+/g, ' ').trim() === label,
  );
  expect(button, label).toBeDefined();
  button!.click();
}

describe('Lesson08Flotation', () => {
  it('uses the shared lesson shell and a four-step route without adding extra workspaces', () => {
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('.lesson.flotation-lesson')).not.toBeNull();
    expect(root.querySelector('.lesson-tag__number')?.textContent).toBe('Clase 8');
    expect(root.querySelectorAll('.workbench')).toHaveLength(1);
    expect(root.querySelectorAll('.steps li')).toHaveLength(4);
    expect(root.querySelectorAll('.steps [aria-current="step"]')).toHaveLength(1);
    expect(root.querySelector('.steps [aria-current="step"]')?.textContent).toContain('Mira');
    expect(
      [...root.querySelectorAll('.steps li > span:last-child')].map((label) => label.textContent),
    ).toEqual(['Mira', 'Lado', 'Franja', 'Aviso']);

    fixture.componentInstance.startRoot();
    fixture.detectChanges();
    expect(root.querySelector('.task-card--square')).not.toBeNull();
    expect(root.querySelectorAll('.steps .step--done')).toHaveLength(1);
    expect(root.querySelector('.steps [aria-current="step"]')?.textContent).toContain('Lado');
  });

  it('keeps the mission, records and unsolved measures visible with supporting notes collapsed', () => {
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;
    const notes = root.querySelector<HTMLDetailsElement>('.variance-detail')!;

    expect(root.querySelector('h2')?.textContent).toBe(LESSON_NAMES['lesson-08']);
    expect(root.querySelector('.lesson-header p')?.textContent).toContain('toneladas por hora');
    expect(root.querySelector('.task-card')?.textContent).toContain('El siguiente turno necesita');
    expect(root.querySelector('.task-card .btn--primary')?.textContent).toContain('Volver a t/h');
    expect(root.querySelectorAll('.plot .data-point')).toHaveLength(6);
    expect(root.querySelector('.measure--squared')?.textContent).toContain('4 (t/h)²');
    expect(root.querySelector('.measure--linear')?.textContent).toContain('? t/h');
    expect(root.querySelector('.plot + .records + .muted')?.textContent).toContain(
      'El promedio no es una meta',
    );
    expect(notes.open).toBe(false);
    expect(notes.parentElement?.classList.contains('workbench')).toBe(true);
    expect(notes.previousElementSibling?.classList.contains('task-card')).toBe(true);
    expect(notes.querySelector('summary')?.textContent).toBe('Cómo leer los datos y la varianza');
    expect(notes.textContent).toContain('No son los datos del molino');
    expect(notes.textContent).toContain('24 ÷ 6 =');
    expect(notes.querySelector('.root-proof, .square-grid')).toBeNull();
  });

  it('keeps optional reading notes separate from hints and preserves the active puzzle', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    game.startRoot();
    fixture.detectChanges();
    root.querySelector<HTMLDetailsElement>('.variance-detail')!.open = true;
    fixture.detectChanges();

    expect(game.stage()).toBe('root');
    expect(game.helped()).toBe(false);
    expect(game.feedback()).toBe('');
    expect(game.rootKnown()).toBe(false);
    expect(root.querySelectorAll('.number-choice')).toHaveLength(3);
    expect(root.querySelector('.side-label, .root-proof')).toBeNull();

    reachBand(game);
    fixture.detectChanges();
    expect(root.querySelector('.variance-detail')).toBeNull();
    expect(root.querySelectorAll('.record-choice')).toHaveLength(6);
  });

  it('keeps the square and native numeric choices in the task without revealing the side or root proof', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    game.startRoot();

    for (const side of [2, 3, 4]) {
      fixture.detectChanges();
      const task = root.querySelector('.task-card')!;
      const square = task.querySelector('.square-grid') as HTMLElement;
      const choices = task.querySelector('.number-choices')!;
      expect(game.stats().standardDeviation).toBe(side);
      expect(square.querySelectorAll('.square-cell')).toHaveLength(side * side);
      expect(square.style.gridTemplateColumns).toBe('repeat(' + side + ', 34px)');
      expect(choices.getAttribute('role')).toBe('group');
      expect(choices.getAttribute('aria-label')).toBe('Elige el número');
      expect(choices.querySelectorAll('.btn--answer')).toHaveLength(3);
      expect(
        [...choices.querySelectorAll('button')].map((button) => Number(button.textContent?.trim())),
      ).toEqual(game.options());
      expect(task.querySelector('.hint-button')?.classList.contains('btn--secondary')).toBe(true);
      expect(root.querySelector('.side-label, .root-proof, .band-bound')).toBeNull();
      expect(game.rootKnown()).toBe(false);

      game.requestHint();
      reachReport(game);
      game.chooseReport('observed');
      game.continueAfterHelp();
    }
  });

  it('labels both band boundaries without identifying the outside record before the player chooses it', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    reachBand(game);
    fixture.detectChanges();
    const boundaries = () => [...root.querySelectorAll<HTMLElement>('.band-bound')];
    expect(boundaries().map((label) => label.textContent)).toEqual(['98', '102']);
    expect(boundaries().map((label) => label.style.left)).toEqual(['37.5%', '87.5%']);
    expect(root.querySelectorAll('.point--outside')).toHaveLength(0);
    expect(root.querySelectorAll('.record-choice.btn--answer')).toHaveLength(6);
    expect(root.querySelector('.band-explanation')).toBeNull();

    game.selectRecord(0);
    fixture.detectChanges();
    expect(root.querySelectorAll('.point--outside')).toHaveLength(1);
    expect(root.querySelector('.task-card')?.textContent).toContain(
      'Lo resaltamos con un contorno',
    );
    game.continueToReport();
    fixture.detectChanges();
    expect(boundaries().map((label) => label.textContent)).toEqual(['98', '102']);
    expect(parseFloat(boundaries()[0].style.left)).toBeCloseTo(game.position(98));
    expect(parseFloat(boundaries()[1].style.left)).toBeCloseTo(game.position(102));
    expect(root.querySelectorAll('.point--outside')).toHaveLength(0);
    expect(root.querySelectorAll('.comparison-choice.btn--answer')).toHaveLength(2);
    expect(game.stats().outside).toEqual([]);
  });

  it('keeps shared report choices and readable live hints without changing the current data or completing', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    reachReport(game);
    fixture.detectChanges();
    const records = game.records();
    const choices = root.querySelector('[aria-label="Opciones para el aviso"]')!;
    expect(choices.getAttribute('role')).toBe('group');
    expect(choices.querySelectorAll('.report-choice.btn--answer')).toHaveLength(3);
    expect(
      [...choices.querySelectorAll('button')].map((button) => button.textContent?.trim()),
    ).toEqual(game.reportChoices().map((choice) => choice.text));

    game.chooseReport('units');
    fixture.detectChanges();
    const feedback = root.querySelector('.feedback')!;
    expect(feedback.getAttribute('role')).toBe('status');
    expect(feedback.getAttribute('aria-live')).toBe('polite');
    expect(feedback.getAttribute('aria-atomic')).toBe('true');
    expect(feedback.textContent).toContain('4 (t/h)²');
    expect(game.records()).toBe(records);
    expect(game.stage()).toBe('report');
    game.chooseReport('observed');
    fixture.detectChanges();
    expect(game.stage()).toBe('review');
    expect(root.querySelector('.feedback')).toBeNull();
  });

  it('starts with six plotted records, known variance and no solved standard deviation', () => {
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelectorAll('.data-point')).toHaveLength(6);
    expect(root.querySelector('.measure--squared')?.textContent).toContain('4 (t/h)²');
    expect(root.querySelector('.measure--linear')?.textContent).toContain('? t/h');
    expect(root.querySelector('.spread-band')).toBeNull();
    expect(root.querySelector('.square-grid')).toBeNull();
    expect(root.querySelector('input, textarea, form, select')).toBeNull();
    expect(root.querySelectorAll('button:not([type="button"])')).toHaveLength(0);
    expect(fixture.componentInstance.stage()).toBe('observe');
  });

  it('computes the population variance and root, not the average of absolute distances', () => {
    const game = create().componentInstance;
    const stats = game.stats();
    expect(stats.values).toEqual([96, 100, 100, 100, 102, 102]);
    expect(stats.mean).toBe(100);
    expect(stats.squares).toEqual([16, 0, 0, 0, 4, 4]);
    expect(stats.squareSum).toBe(24);
    expect(stats.variance).toBe(4);
    expect(stats.standardDeviation).toBe(2);
    expect(stats.outside).toEqual([96]);
    expect([stats.lower, stats.upper]).toEqual([98, 102]);
    const meanDistance =
      stats.values.reduce((sum, value) => sum + Math.abs(value - stats.mean), 0) / 6;
    expect(meanDistance).not.toBe(stats.standardDeviation);
  });

  it('uses one linear scale and stacks every repeated observation', () => {
    const game = create().componentInstance;
    expect(game.bounds()).toEqual({ min: 95, max: 103 });
    expect(game.points().map((point) => point.x)).toEqual([12.5, 62.5, 62.5, 62.5, 87.5, 87.5]);
    expect(game.points().map((point) => point.bottom)).toEqual([28, 28, 50, 72, 28, 50]);
    expect(new Set(game.points().map((point) => point.id)).size).toBe(6);
    expect(game.plotDescription()).toContain('96, 100, 100, 100, 102, 102');
    expect(game.plotDescription()).not.toContain('Franja');
  });

  it('shows a real two-by-two visual square without a solved answer', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    game.startRoot();
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelectorAll('.square-cell')).toHaveLength(4);
    expect(root.querySelector('.task-card .square-grid')).toBe(root.querySelector('.square-grid'));
    expect((root.querySelector('.square-grid') as HTMLElement).style.gridTemplateColumns).toBe(
      'repeat(2, 34px)',
    );
    expect(root.querySelector('.side-label')).toBeNull();
    expect(root.querySelector('.root-proof')).toBeNull();
    expect(new Set(game.options())).toEqual(new Set([1, 2, 4]));
    expect(game.rootKnown()).toBe(false);
    expect(game.helped()).toBe(false);
  });

  it('rejects invalid and premature actions without moving, helping or completing', () => {
    const game = create().componentInstance;
    const done = vi.fn();
    game.completed.subscribe(done);
    game.answerRoot(2);
    game.requestHint();
    game.continueToBand();
    game.selectRecord(0);
    game.continueToReport();
    game.chooseReport('observed');
    game.answerComparison('inside');
    game.answerComparison('outside');
    game.continueAfterHelp();
    game.finish();
    expect(game.stage()).toBe('observe');
    expect(game.helped()).toBe(false);
    game.startRoot();
    game.answerRoot(0);
    game.answerRoot(-2);
    game.answerRoot(NaN);
    game.answerRoot(99);
    game.chooseReport('observed');
    game.continueToBand();
    game.selectRecord(0);
    game.answerComparison('inside');
    game.continueToReport();
    game.continueAfterHelp();
    expect(game.stage()).toBe('root');
    expect(game.feedback()).toBe('');
    expect(game.helped()).toBe(false);
    expect(done).not.toHaveBeenCalled();
  });

  it('explains a wrong root on the same data and does not auto-complete it', () => {
    const game = create().componentInstance;
    game.startRoot();
    const records = game.records();
    game.answerRoot(4);
    expect(game.stage()).toBe('root');
    expect(game.records()).toBe(records);
    expect(game.feedback()).toContain('4 × 4 = 16, no 4');
    expect(game.feedback()).toContain('lado del cuadrado');
    expect(game.helped()).toBe(true);
    expect(game.rootKnown()).toBe(false);
    game.answerRoot(1);
    expect(game.feedback()).toContain('1 × 1 = 1, no 4');
  });

  it('offers an optional hint while preserving the exercise and withholding completion', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    game.startRoot();
    const records = game.records();
    game.requestHint();
    fixture.detectChanges();
    expect(game.records()).toBe(records);
    expect(game.stage()).toBe('root');
    expect(game.feedback()).toContain('2 casillas por fila y 2 filas');
    expect(game.helped()).toBe(true);
    expect(fixture.nativeElement.querySelector('[aria-live="polite"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.square-cell')).toHaveLength(4);
  });

  it('reveals the inverse operation and original units only after the correct root', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    game.startRoot();
    game.answerRoot(2);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(game.stage()).toBe('checked');
    expect(game.rootKnown()).toBe(true);
    expect(root.querySelector('.root-proof')?.textContent).toContain('√4 = 2');
    expect(root.querySelector('.side-label')?.textContent).toContain('2 t/h');
    expect(root.textContent).toContain('sacar la raíz cuadrada');
    expect(root.textContent).toContain('no es el promedio simple de las distancias');
    expect(root.querySelector('.spread-band')).toBeNull();
    game.requestHint();
    game.answerRoot(4);
    expect(game.helped()).toBe(false);
    expect(game.stage()).toBe('checked');
  });

  it('moves keyboard focus to the updated task heading', async () => {
    const fixture = create();
    const game = fixture.componentInstance;
    game.startRoot();
    fixture.detectChanges();
    click(fixture.nativeElement, '2');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(
      fixture.nativeElement.querySelector('#flotation-task-title'),
    );
    expect(document.activeElement?.textContent).toContain('2 × 2 = 4');
  });

  it('shows the band and six record choices without revealing the outside record before selection', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    reachBand(game);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(game.stage()).toBe('locate');
    expect(game.rootKnown()).toBe(true);
    expect(game.bandVisible()).toBe(true);
    expect(game.bandExplained()).toBe(false);
    expect(game.selectedRecord()).toBeNull();
    expect(root.querySelector('.data-board')).toBeNull();
    expect(root.querySelectorAll('.plot')).toHaveLength(1);
    expect(root.querySelectorAll('.data-point')).toHaveLength(6);
    expect(root.querySelectorAll('.point--outside')).toHaveLength(0);
    const band = root.querySelector('.spread-band') as HTMLElement;
    expect(band.style.left).toBe('37.5%');
    expect(band.style.width).toBe('50%');
    const plot = root.querySelector('.plot')!;
    const taskCard = root.querySelector('.task-card')!;
    expect(taskCard.querySelector('.plot')).toBe(plot);
    expect(taskCard.querySelector('.record-choices')).not.toBeNull();
    expect(taskCard.querySelectorAll('.record-choice')).toHaveLength(6);
    expect(plot.getAttribute('role')).toBe('img');
    expect(plot.querySelector('button')).toBeNull();
    expect(plot.getAttribute('aria-label')).toContain('Franja de 98 a 102');
    expect(plot.getAttribute('aria-label')).not.toMatch(/registros fuera/i);
    expect(game.plotDescription()).not.toMatch(/registros fuera/i);
    expect(root.querySelector('.band-explanation')).toBeNull();
    expect(root.querySelector('.report-choices')).toBeNull();
    expect(
      [...root.querySelectorAll<HTMLButtonElement>('.record-choice')].map((button) =>
        button.textContent?.replace(/\s+/g, ' ').trim(),
      ),
    ).toEqual(
      game.records().map((value, index) => 'Registro ' + (index + 1) + ' · ' + value + ' t/h'),
    );
    expect(root.querySelectorAll('.record-choice:not([type="button"])')).toHaveLength(0);
  });

  it('requires a record selection after the solved root and pauses on its explanation before the report', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const done = vi.fn();
    game.completed.subscribe(done);
    game.startRoot();
    game.answerRoot(2);
    const records = game.records();
    game.continueToReport();
    game.chooseReport('observed');
    game.finish();
    expect(game.stage()).toBe('checked');
    expect(game.selectedRecord()).toBeNull();
    game.continueToBand();
    game.continueToReport();
    game.chooseReport('observed');
    game.finish();
    expect(game.stage()).toBe('locate');
    expect(done).not.toHaveBeenCalled();
    game.selectRecord(0);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(game.stage()).toBe('located');
    expect(game.selectedRecord()).toBe(0);
    expect(game.records()).toBe(records);
    expect(game.helped()).toBe(false);
    expect(game.bandExplained()).toBe(true);
    expect(root.querySelectorAll('.point--outside')).toHaveLength(1);
    expect(root.querySelector('.band-explanation')?.textContent).toContain('registro de 96 t/h');
    expect(game.plotDescription()).toMatch(/registros fuera: 96/i);
    expect(root.querySelector('.record-choice, .report-choice')).toBeNull();
    game.selectRecord(4);
    game.chooseReport('observed');
    game.finish();
    expect(game.stage()).toBe('located');
    expect(game.selectedRecord()).toBe(0);
    expect(game.helped()).toBe(false);
    expect(done).not.toHaveBeenCalled();
    game.continueToReport();
    fixture.detectChanges();
    expect(game.stage()).toBe('locate');
    expect(game.comparing()).toBe(true);
    expect(game.selectedRecord()).toBe(0);
    expect(game.helped()).toBe(false);
    expect(root.querySelectorAll('.comparison-choice')).toHaveLength(2);
    expect(root.querySelector('.record-choice, .report-choice')).toBeNull();
    game.chooseReport('observed');
    game.finish();
    game.continueToReport();
    expect(game.stage()).toBe('locate');
    expect(done).not.toHaveBeenCalled();
    game.answerComparison('inside');
    fixture.detectChanges();
    expect(game.stage()).toBe('located');
    expect(game.comparing()).toBe(true);
    expect(root.textContent).toContain('Aquí sí están todos dentro');
    game.chooseReport('observed');
    game.finish();
    expect(done).not.toHaveBeenCalled();
    game.continueToReport();
    fixture.detectChanges();
    expect(game.stage()).toBe('report');
    expect(root.querySelectorAll('.report-choice')).toHaveLength(3);
    expect(game.comparing()).toBe(false);
    expect(game.records()).toBe(records);
    expect(game.selectedRecord()).toBe(0);
    expect(done).not.toHaveBeenCalled();
    game.chooseReport('observed');
    game.finish();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('keeps both exact band endpoints inside and accepts records strictly beyond either side', () => {
    const game = create().componentInstance;
    reachBand(game);
    const original = game.records();
    expect(game.records()[4]).toBe(game.stats().upper);
    game.selectRecord(4);
    expect(game.stage()).toBe('locate');
    expect(game.selectedRecord()).toBeNull();
    expect(game.helped()).toBe(true);
    expect(game.records()).toBe(original);
    game.selectRecord(0);
    expect(game.stage()).toBe('located');
    expect(game.records()[game.selectedRecord()!]).toBeLessThan(game.stats().lower);
    completeComparison(game);
    game.chooseReport('observed');
    game.continueAfterHelp();
    reachBand(game);
    expect(game.stats().lower).toBe(97);
    expect(game.records()[0]).toBe(game.stats().lower);
    expect(game.records()[1]).toBe(game.stats().lower);
    game.selectRecord(0);
    game.selectRecord(1);
    expect(game.stage()).toBe('locate');
    expect(game.selectedRecord()).toBeNull();
    expect(game.helped()).toBe(true);
    game.selectRecord(5);
    expect(game.stage()).toBe('located');
    expect(game.selectedRecord()).toBe(5);
    expect(game.records()[5]).toBeGreaterThan(game.stats().upper);
  });

  it('contrasts another distribution with the same mean and standard deviation, with every endpoint inside', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const source = game.records();
    const sourceStats = game.stats();
    reachComparison(game);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(game.stage()).toBe('locate');
    expect(game.comparing()).toBe(true);
    expect(game.records()).toEqual([98, 98, 98, 102, 102, 102]);
    expect(game.sourceRecords()).toBe(source);
    expect(game.selectedRecord()).toBe(0);
    expect(game.stats().mean).toBe(sourceStats.mean);
    expect(game.stats().variance).toBe(sourceStats.variance);
    expect(game.stats().standardDeviation).toBe(sourceStats.standardDeviation);
    expect(game.stats().squareSum).toBe(sourceStats.squareSum);
    expect(game.stats().outside).toEqual([]);
    expect(game.points().map((point) => point.bottom)).toEqual([28, 50, 72, 28, 50, 72]);
    expect(game.points().every((point) => !point.outside)).toBe(true);
    expect(root.querySelectorAll('.data-point')).toHaveLength(6);
    expect(root.querySelectorAll('.comparison-choice')).toHaveLength(2);
    expect(root.querySelectorAll('.comparison-choice:not([type="button"])')).toHaveLength(0);
    expect(root.querySelector('.record-choice, .report-choice, .band-explanation')).toBeNull();
    expect(root.querySelectorAll('.plot')).toHaveLength(1);
    expect(root.querySelector('.task-card .plot')).toBe(root.querySelector('.plot'));
    expect(root.querySelector('.plot')?.getAttribute('aria-label')).toContain(
      'Ejemplo de comparación',
    );
    expect(root.querySelector('.plot')?.getAttribute('aria-label')).toContain(
      'incluidos sus bordes',
    );
    expect(root.querySelector('.plot')?.getAttribute('aria-label')).not.toMatch(/registros fuera/i);
    expect(root.textContent).toContain(
      'Otros datos, el mismo promedio y la misma desviación estándar',
    );
    expect(root.textContent).not.toContain('undefined');
    expect(game.helped()).toBe(false);
    click(root, 'Todos están dentro.');
    fixture.detectChanges();
    expect(game.stage()).toBe('located');
    expect(game.comparing()).toBe(true);
    expect(root.querySelector('.band-explanation')?.textContent).toContain(
      'todos los registros están dentro',
    );
    expect(root.querySelector('.root-proof')?.textContent).toContain(
      '98 y 102 t/h están en los bordes',
    );
    expect(root.querySelectorAll('.point--outside')).toHaveLength(0);
    expect(game.plotDescription()).toContain('Registros fuera: ninguno');
    click(root, 'Preparar el aviso →');
    fixture.detectChanges();
    expect(game.stage()).toBe('report');
    expect(game.comparing()).toBe(false);
    expect(game.records()).toBe(source);
    expect(game.selectedRecord()).toBe(0);
    expect(game.stats().outside).toEqual([96]);
    expect(root.querySelectorAll('.point--outside')).toHaveLength(1);
    expect(root.querySelector('.records')?.textContent).toContain(
      '96 · 100 · 100 · 100 · 102 · 102',
    );
    expect(root.querySelector('.records')?.textContent).not.toContain('98 · 98 · 98');
  });

  it('requires an independent fresh example after a wrong comparison rather than accepting a habitual outside answer', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    reachComparison(game);
    const comparison = game.records();
    const source = game.sourceRecords();
    const done = vi.fn();
    game.completed.subscribe(done);
    game.answerComparison('outside');
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(game.stage()).toBe('locate');
    expect(game.comparing()).toBe(true);
    expect(game.records()).toBe(comparison);
    expect(game.sourceRecords()).toBe(source);
    expect(game.selectedRecord()).toBe(0);
    expect(game.helped()).toBe(true);
    expect(game.feedback()).toContain('98 y 102 t/h');
    expect(game.feedback()).toContain('también cuentan como dentro');
    expect(root.querySelectorAll('.comparison-choice')).toHaveLength(2);
    expect(root.querySelector('.feedback')?.getAttribute('aria-live')).toBe('polite');
    expect(root.textContent).not.toContain('undefined');
    game.continueToReport();
    game.chooseReport('observed');
    game.continueAfterHelp();
    game.finish();
    expect(game.stage()).toBe('locate');
    expect(game.records()).toBe(comparison);
    expect(done).not.toHaveBeenCalled();
    game.answerComparison('inside');
    game.continueToReport();
    game.chooseReport('observed');
    expect(game.stage()).toBe('review');
    expect(game.records()).toBe(source);
    expect(game.comparing()).toBe(false);
    expect(game.selectedRecord()).toBe(0);
    game.finish();
    expect(done).not.toHaveBeenCalled();
    game.continueAfterHelp();
    expect(game.round()).toBe(1);
    expect(game.stage()).toBe('root');
    expect(game.records()).toEqual([97, 97, 100, 100, 100, 106]);
    expect(game.comparing()).toBe(false);
    expect(game.selectedRecord()).toBeNull();
    expect(game.helped()).toBe(false);
    expect(game.feedback()).toBe('');
    reachComparison(game);
    expect(game.records()).toEqual([97, 97, 97, 103, 103, 103]);
    expect(game.stats().outside).toEqual([]);
    expect(game.selectedRecord()).toBe(5);
    game.answerComparison('inside');
    game.continueToReport();
    expect(game.records()).toEqual([97, 97, 100, 100, 100, 106]);
    expect(game.stats().outside).toEqual([106]);
    expect(game.selectedRecord()).toBe(5);
    game.chooseReport('observed');
    fixture.detectChanges();
    expect(game.stage()).toBe('success');
    expect(game.helped()).toBe(false);
    expect(game.records()).toEqual(game.originalStats.values);
    expect(root.querySelector('.report-card')?.textContent).toContain(
      '96 · 100 · 100 · 100 · 102 · 102',
    );
    expect(root.querySelector('.report-card')?.textContent).toContain('todos estaban dentro');
    expect(root.querySelector('.report-card')?.textContent).not.toContain('97 · 97 · 97');
    expect(root.querySelector('.report-card')?.textContent).not.toContain('undefined');
    game.finish();
    game.finish();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('keeps the same-franja comparison accurate across different source means and standard deviations', () => {
    const game = create().componentInstance;
    const expected = [
      [98, 102],
      [97, 103],
      [102, 110],
      [102, 106],
    ];
    for (let round = 0; round < 7; round += 1) {
      const index = round === 0 ? 0 : 1 + ((round - 1) % 3);
      const source = game.records();
      const sourceStats = game.stats();
      reachComparison(game);
      const comparison = game.stats();
      expect([comparison.lower, comparison.upper]).toEqual(expected[index]);
      expect(game.records()).toEqual([
        comparison.lower,
        comparison.lower,
        comparison.lower,
        comparison.upper,
        comparison.upper,
        comparison.upper,
      ]);
      expect(comparison.mean).toBe(sourceStats.mean);
      expect(comparison.variance).toBe(sourceStats.variance);
      expect(comparison.standardDeviation).toBe(sourceStats.standardDeviation);
      expect(comparison.outside).toHaveLength(0);
      expect(game.sourceRecords()).toBe(source);
      const selected = game.selectedRecord();
      game.selectRecord(0);
      game.selectRecord(5);
      expect(game.selectedRecord()).toBe(selected);
      expect(game.helped()).toBe(false);
      game.answerComparison('inside');
      game.continueToReport();
      expect(game.records()).toBe(source);
      expect(game.stats().outside).toHaveLength(1);
      expect(game.selectedRecord()).toBe(selected);
      expect(game.comparing()).toBe(false);
      game.chooseReport('units');
      game.chooseReport('observed');
      game.continueAfterHelp();
    }
  });

  it('ignores invalid record indices and out-of-order or repeated actions without adding help', () => {
    const game = create().componentInstance;
    const done = vi.fn();
    game.completed.subscribe(done);
    game.selectRecord(0);
    game.continueToBand();
    game.continueToReport();
    game.answerComparison('inside');
    expect(game.stage()).toBe('observe');
    expect(game.selectedRecord()).toBeNull();
    game.startRoot();
    game.selectRecord(0);
    game.continueToBand();
    game.answerComparison('inside');
    expect(game.stage()).toBe('root');
    expect(game.selectedRecord()).toBeNull();
    game.answerRoot(2);
    game.selectRecord(0);
    game.continueToReport();
    game.answerComparison('inside');
    expect(game.stage()).toBe('checked');
    expect(game.selectedRecord()).toBeNull();
    game.continueToBand();
    const records = game.records();
    for (const index of [-1, 6, 99, 1.5, NaN, Infinity, '0' as unknown as number])
      game.selectRecord(index);
    game.requestHint();
    game.answerRoot(4);
    game.continueToBand();
    game.continueToReport();
    game.continueAfterHelp();
    game.answerComparison('inside');
    game.answerComparison('outside');
    expect(game.stage()).toBe('locate');
    expect(game.records()).toBe(records);
    expect(game.selectedRecord()).toBeNull();
    expect(game.feedback()).toBe('');
    expect(game.helped()).toBe(false);
    game.selectRecord(0);
    game.selectRecord(4);
    game.continueToBand();
    game.finish();
    expect(game.stage()).toBe('located');
    expect(game.selectedRecord()).toBe(0);
    expect(game.helped()).toBe(false);
    expect(done).not.toHaveBeenCalled();
    game.continueToReport();
    game.selectRecord(1);
    game.continueToBand();
    game.continueToReport();
    game.chooseReport('invalid' as 'observed');
    expect(game.stage()).toBe('locate');
    expect(game.comparing()).toBe(true);
    expect(game.selectedRecord()).toBe(0);
    expect(game.helped()).toBe(false);
    const comparison = game.records();
    for (const answer of ['fake', '', null, undefined, 0] as unknown as ('inside' | 'outside')[])
      game.answerComparison(answer);
    for (let index = 0; index < 6; index += 1) game.selectRecord(index);
    game.chooseReport('observed');
    game.finish();
    expect(game.stage()).toBe('locate');
    expect(game.records()).toBe(comparison);
    expect(game.selectedRecord()).toBe(0);
    expect(game.feedback()).toBe('');
    expect(game.helped()).toBe(false);
    expect(done).not.toHaveBeenCalled();
    game.answerComparison('inside');
    game.answerComparison('outside');
    game.selectRecord(0);
    expect(game.stage()).toBe('located');
    expect(game.feedback()).toBe('');
    expect(game.helped()).toBe(false);
    game.continueToReport();
    game.answerComparison('outside');
    expect(game.stage()).toBe('report');
    expect(game.selectedRecord()).toBe(0);
    expect(game.records()).toBe(records);
    expect(game.comparing()).toBe(false);
    expect(game.feedback()).toBe('');
    expect(game.helped()).toBe(false);
    game.chooseReport('observed');
    game.selectRecord(4);
    game.continueToBand();
    game.continueToReport();
    expect(game.stage()).toBe('success');
    expect(game.helped()).toBe(false);
    game.finish();
    game.finish();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('keeps an incorrect record attempt unsolved and requires the complete fresh flow after help', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    reachBand(game);
    const done = vi.fn();
    game.completed.subscribe(done);
    const records = game.records();
    game.selectRecord(1);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(game.stage()).toBe('locate');
    expect(game.records()).toBe(records);
    expect(game.round()).toBe(0);
    expect(game.selectedRecord()).toBeNull();
    expect(game.helped()).toBe(true);
    expect(game.bandExplained()).toBe(false);
    expect(root.querySelectorAll('.record-choice')).toHaveLength(6);
    expect(root.querySelectorAll('.point--outside')).toHaveLength(0);
    expect(root.querySelector('.band-explanation')).toBeNull();
    expect(root.querySelector('.feedback')?.textContent).not.toContain('96 t/h');
    expect(game.plotDescription()).not.toMatch(/registros fuera/i);
    game.continueToReport();
    game.continueAfterHelp();
    game.finish();
    expect(game.stage()).toBe('locate');
    expect(game.records()).toBe(records);
    expect(done).not.toHaveBeenCalled();
    game.selectRecord(0);
    completeComparison(game);
    game.chooseReport('observed');
    fixture.detectChanges();
    expect(game.stage()).toBe('review');
    expect(game.records()).toBe(records);
    expect(game.selectedRecord()).toBe(0);
    game.finish();
    expect(done).not.toHaveBeenCalled();
    click(root, 'Probar otros registros →');
    fixture.detectChanges();
    expect(game.stage()).toBe('root');
    expect(game.round()).toBe(1);
    expect(game.selectedRecord()).toBeNull();
    expect(game.records()).toEqual([97, 97, 100, 100, 100, 106]);
    expect(game.helped()).toBe(false);
    expect(game.feedback()).toBe('');
    expect(game.rootKnown()).toBe(false);
    expect(game.bandVisible()).toBe(false);
    expect(game.bandExplained()).toBe(false);
    expect(
      root.querySelector('.spread-band, .record-choice, .report-choice, .root-proof'),
    ).toBeNull();
    game.selectRecord(5);
    game.continueToBand();
    game.continueToReport();
    game.chooseReport('observed');
    expect(game.stage()).toBe('root');
    expect(done).not.toHaveBeenCalled();
    reachReport(game);
    expect(game.selectedRecord()).toBe(5);
    game.chooseReport('observed');
    expect(game.stage()).toBe('success');
    expect(game.records()).toEqual(game.originalStats.values);
    game.finish();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('moves focus from the chosen record to its explanation and focuses hints for incorrect attempts', async () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    game.startRoot();
    fixture.detectChanges();
    await fixture.whenStable();
    click(root, 'Necesito una pista');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(root.querySelector('.feedback'));
    expect(document.activeElement?.getAttribute('tabindex')).toBe('-1');
    click(root, '2');
    fixture.detectChanges();
    await fixture.whenStable();
    game.continueToBand();
    fixture.detectChanges();
    await fixture.whenStable();
    const wrongRecord = root.querySelectorAll<HTMLButtonElement>('.record-choice')[4];
    wrongRecord.focus();
    wrongRecord.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(root.querySelector('.feedback'));
    expect(game.stage()).toBe('locate');
    const outsideRecord = root.querySelectorAll<HTMLButtonElement>('.record-choice')[0];
    outsideRecord.focus();
    outsideRecord.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.contains(outsideRecord)).toBe(false);
    expect(document.activeElement).toBe(root.querySelector('#flotation-task-title'));
    expect(game.stage()).toBe('located');
    expect(root.querySelector('.feedback')).toBeNull();
    click(root, 'Comparar otro ejemplo →');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(root.querySelector('#flotation-task-title'));
    expect(document.activeElement?.textContent).toContain('¿Aquí también hay alguno fuera?');
    click(root, 'Hay alguno fuera.');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(game.stage()).toBe('locate');
    expect(game.comparing()).toBe(true);
    expect(document.activeElement).toBe(root.querySelector('.feedback'));
    expect(document.activeElement?.getAttribute('role')).toBe('status');
    expect(document.activeElement?.textContent).toContain('bordes de la franja');
    click(root, 'Todos están dentro.');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(game.stage()).toBe('located');
    expect(root.querySelector('.feedback')).toBeNull();
    expect(document.activeElement).toBe(root.querySelector('#flotation-task-title'));
    expect(document.activeElement?.textContent).toContain('Aquí sí están todos dentro');
    click(root, 'Preparar el aviso →');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(root.querySelector('#flotation-task-title'));
    expect(game.comparing()).toBe(false);
    expect(game.records()).toEqual(game.originalStats.values);
    click(root, game.reportChoices().find((choice) => choice.id === 'units')!.text);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(root.querySelector('.feedback'));
    expect(game.stage()).toBe('report');
  });

  it.each([
    { random: 0, observedPosition: 2 },
    { random: 0.4, observedPosition: 1 },
    { random: 0.8, observedPosition: 0 },
  ])(
    'rotates concise report choices from random $random and keeps their order stable within each attempt',
    ({ random, observedPosition }) => {
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(random);
      try {
        const fixture = create();
        const game = fixture.componentInstance;
        const positions: number[] = [];
        for (let round = 0; round < 3; round += 1) {
          reachReport(game);
          fixture.detectChanges();
          const choices = game.reportChoices();
          const order = choices.map((choice) => choice.id);
          positions.push(order.indexOf('observed'));
          expect(order.indexOf('observed')).toBe((observedPosition - round + 3) % 3);
          expect(new Set(order).size).toBe(3);
          const lengths = choices.map((choice) => choice.text.length);
          expect(Math.max(...lengths) - Math.min(...lengths)).toBeLessThanOrEqual(15);
          expect(Math.max(...lengths)).toBeLessThan(100);
          const root: HTMLElement = fixture.nativeElement;
          expect(
            [...root.querySelectorAll('.report-choice')].map((choice) =>
              choice.textContent?.trim(),
            ),
          ).toEqual(choices.map((choice) => choice.text));
          fixture.detectChanges();
          expect(game.reportChoices()).toBe(choices);
          game.chooseReport('units');
          fixture.detectChanges();
          expect(game.reportChoices()).toBe(choices);
          expect(
            [...root.querySelectorAll('.report-choice')].map((choice) =>
              choice.textContent?.trim(),
            ),
          ).toEqual(choices.map((choice) => choice.text));
          game.chooseReport('invalid' as 'observed');
          fixture.detectChanges();
          expect(game.reportChoices().map((choice) => choice.id)).toEqual(order);
          game.chooseReport('observed');
          game.continueAfterHelp();
        }
        expect(new Set(positions).size).toBe(3);
      } finally {
        randomSpy.mockRestore();
      }
    },
  );

  it('keeps the actual outlying record visible rather than forcing it into the one-sigma band', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    reachReport(game);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelectorAll('.data-point')).toHaveLength(6);
    expect(root.querySelectorAll('.point--outside')).toHaveLength(1);
    const band = root.querySelector('.spread-band') as HTMLElement;
    expect(band.style.left).toBe('37.5%');
    expect(band.style.width).toBe('50%');
    expect(root.textContent).toContain('registro de 96 t/h');
    expect(root.textContent).toContain('No es una zona de «bien o mal»');
    expect(game.plotDescription()).toMatch(/registros fuera: 96/i);
    expect(game.bandVisible()).toBe(true);
  });

  it('rejects confusing squared units with original units on the current records', () => {
    const game = create().componentInstance;
    reachReport(game);
    const records = game.records();
    game.chooseReport('units');
    expect(game.stage()).toBe('report');
    expect(game.records()).toBe(records);
    expect(game.feedback()).toContain('4 (t/h)²');
    expect(game.feedback()).toContain('raíz es 2 t/h');
    expect(game.helped()).toBe(true);
  });

  it('rejects treating one sigma as a range containing every observation', () => {
    const game = create().componentInstance;
    reachReport(game);
    const records = game.records();
    game.chooseReport('inside');
    expect(game.stage()).toBe('report');
    expect(game.records()).toBe(records);
    expect(game.feedback()).toContain('registro de 96 t/h');
    expect(game.feedback()).toContain('puede contener todos los registros o dejar alguno fuera');
    game.chooseReport('fake' as 'observed');
    expect(game.stage()).toBe('report');
    game.chooseReport('observed');
    expect(game.stage()).toBe('review');
  });

  it('allows an unassisted root and evidence-based explanation to finish', () => {
    const game = create().componentInstance;
    reachReport(game);
    game.chooseReport('observed');
    expect(game.stage()).toBe('success');
    expect(game.helped()).toBe(false);
    expect(game.stats().standardDeviation).toBe(2);
  });

  it('requires a fresh example after a supported root or explanation', () => {
    const game = create().componentInstance;
    game.startRoot();
    game.requestHint();
    const records = game.records();
    game.continueAfterHelp();
    expect(game.records()).toBe(records);
    reachReport(game);
    game.chooseReport('observed');
    expect(game.stage()).toBe('review');
    game.finish();
    expect(game.records()).toBe(records);
    game.continueAfterHelp();
    expect(game.stage()).toBe('root');
    expect(game.round()).toBe(1);
    expect(game.records()).toEqual([97, 97, 100, 100, 100, 106]);
    expect(game.stats().variance).toBe(9);
    expect(game.stats().standardDeviation).toBe(3);
    expect(game.feedback()).toBe('');
    expect(game.helped()).toBe(false);
    expect(game.rootKnown()).toBe(false);
    expect(game.bandVisible()).toBe(false);
    expect(game.bandExplained()).toBe(false);
    expect(game.selectedRecord()).toBeNull();
    expect(game.comparing()).toBe(false);
  });

  it('keeps fresh squares, units, options and counterexamples accurate across repeated practice', () => {
    const game = create().componentInstance;
    game.startRoot();
    const roots = [2, 3, 4, 2];
    const means = [100, 100, 106, 104];
    for (let round = 0; round < 10; round++) {
      const index = round === 0 ? 0 : 1 + ((round - 1) % 3);
      const stats = game.stats();
      expect(stats.mean).toBe(means[index]);
      expect(stats.standardDeviation).toBe(roots[index]);
      expect(stats.squareSum / stats.values.length).toBe(stats.variance);
      expect(game.cells()).toHaveLength(stats.variance);
      expect(new Set(game.options()).size).toBe(3);
      expect(game.options()).toContain(stats.standardDeviation);
      expect(stats.outside).toHaveLength(1);
      expect(
        game
          .points()
          .filter((point) => point.outside)
          .map((point) => point.value),
      ).toEqual(stats.outside);
      game.requestHint();
      reachReport(game);
      game.chooseReport('observed');
      game.continueAfterHelp();
    }
    expect(game.originalStats.mean).toBe(100);
    expect(game.originalStats.variance).toBe(4);
  });

  it('restores original evidence after practice with a different mean and root', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    game.startRoot();
    for (let attempt = 0; attempt < 2; attempt++) {
      game.requestHint();
      reachReport(game);
      game.chooseReport('observed');
      game.continueAfterHelp();
    }
    expect(game.stats().mean).toBe(106);
    expect(game.stats().standardDeviation).toBe(4);
    reachReport(game);
    game.chooseReport('observed');
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(game.stats().mean).toBe(100);
    expect(game.stats().standardDeviation).toBe(2);
    expect(root.querySelector('.report-card')?.textContent).toContain(
      '96 · 100 · 100 · 100 · 102 · 102',
    );
    expect(root.textContent).toContain('fuera de la franja de 98 a 102');
    expect(root.textContent).toContain('Menos cambios no significa siempre un mejor resultado');
    expect(root.textContent).toContain('En el ejemplo de comparación, todos estaban dentro');
    expect(root.textContent).toContain('Hay que revisar cada grupo de datos');
    expect(root.textContent).not.toContain('undefined');
    expect(root.textContent).not.toContain('114');
  });

  it('emits completion only once after unassisted success, never during helped review', () => {
    const game = create().componentInstance;
    const done = vi.fn();
    game.completed.subscribe(done);
    game.startRoot();
    game.requestHint();
    reachReport(game);
    game.chooseReport('observed');
    game.finish();
    expect(done).not.toHaveBeenCalled();
    game.continueAfterHelp();
    reachReport(game);
    game.chooseReport('observed');
    game.finish();
    game.finish();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('completes the entire simple puzzle through rendered buttons', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    const done = vi.fn();
    game.completed.subscribe(done);
    for (const label of ['Volver a t/h →', '2', 'Revisar la franja →']) {
      click(root, label);
      fixture.detectChanges();
    }
    expect(game.stage()).toBe('locate');
    expect(done).not.toHaveBeenCalled();
    click(root, 'Registro 1 · 96 t/h');
    fixture.detectChanges();
    expect(game.stage()).toBe('located');
    expect(done).not.toHaveBeenCalled();
    click(root, 'Comparar otro ejemplo →');
    fixture.detectChanges();
    expect(game.stage()).toBe('locate');
    expect(game.comparing()).toBe(true);
    expect(done).not.toHaveBeenCalled();
    expect(root.querySelector('.record-choice')).toBeNull();
    click(root, 'Todos están dentro.');
    fixture.detectChanges();
    expect(game.stage()).toBe('located');
    expect(game.comparing()).toBe(true);
    click(root, 'Preparar el aviso →');
    fixture.detectChanges();
    expect(game.stage()).toBe('report');
    expect(game.comparing()).toBe(false);
    expect(done).not.toHaveBeenCalled();
    click(root, game.reportChoices().find((choice) => choice.id === 'observed')!.text);
    fixture.detectChanges();
    click(root, 'Entregar la explicación →');
    fixture.detectChanges();
    expect(done).toHaveBeenCalledTimes(1);
    expect(root.querySelector('input, textarea, form, select')).toBeNull();
  });

  it('renders fresh practice without inherited results, feedback or band', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    game.startRoot();
    game.requestHint();
    reachReport(game);
    game.chooseReport('observed');
    fixture.detectChanges();
    click(root, 'Probar otros registros →');
    fixture.detectChanges();
    expect(root.textContent).toContain('Ensayo: otros registros');
    expect(root.querySelectorAll('.square-cell')).toHaveLength(9);
    expect(root.querySelector('.root-proof')).toBeNull();
    expect(root.querySelector('.spread-band')).toBeNull();
    expect(root.querySelector('.measure--linear')?.textContent).toContain('? t/h');
    expect(root.textContent).not.toContain('Una pista');
  });

  it('starts a replay without old help, answers, completion or practice records', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    reachReport(game);
    game.chooseReport('observed');
    game.finish();
    fixture.destroy();
    const replay = create().componentInstance;
    expect(replay.stage()).toBe('observe');
    expect(replay.round()).toBe(0);
    expect(replay.helped()).toBe(false);
    expect(replay.feedback()).toBe('');
    expect(replay.stats().variance).toBe(4);
    expect(replay.rootKnown()).toBe(false);
    expect(replay.comparing()).toBe(false);
    expect(replay.selectedRecord()).toBeNull();
  });
});
