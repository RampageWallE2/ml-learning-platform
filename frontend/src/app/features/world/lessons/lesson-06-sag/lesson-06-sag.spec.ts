import { TestBed } from '@angular/core/testing';
import { Lesson06Sag } from './lesson-06-sag';

describe('Lesson06Sag', () => {
  function create() {
    const fixture = TestBed.createComponent(Lesson06Sag);
    fixture.detectChanges();
    return fixture;
  }

  function reachDuplicate(game: Lesson06Sag): void {
    game.sumChanges(); game.chooseCancellation('balanced'); game.formSquares();
    game.answerSquare(4); game.chooseWeight('four');
  }

  function reachDiscovery(game: Lesson06Sag): void {
    reachDuplicate(game); game.setDuplicated(true); game.compareCopy();
    game.chooseSummary('per-record');
  }

  function reachPractice(game: Lesson06Sag): void {
    reachDiscovery(game); game.startPractice();
  }

  function solvePractice(game: Lesson06Sag): void {
    game.answerPracticeSquare(game.practiceSquare()); game.choosePracticeSummary('same');
    game.answerPracticeVariance(game.variance());
    game.continuePractice();
  }

  function click(root: HTMLElement, label: string): void {
    const button = Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.replace(/\s+/g, ' ').trim() === label);
    expect(button, 'Button: ' + label).toBeDefined();
    button!.click();
  }

  it('starts with a purpose, all four records and the given mean, without written answers', () => {
    const fixture = create(); const root: HTMLElement = fixture.nativeElement;
    expect(root.textContent).toContain('resumir cuánto cambió la cantidad de material que recibió el molino');
    expect(root.textContent).toContain('Promedio: 100 t/h');
    expect(root.textContent).toContain('no una meta de producción');
    expect(root.textContent).not.toMatch(/varianza/i);
    expect(root.querySelectorAll('.data-point')).toHaveLength(4);
    expect(root.querySelectorAll('.record-card')).toHaveLength(4);
    expect(root.querySelector('input, textarea, form, select')).toBeNull();
    expect(root.querySelectorAll('button:not([type="button"])')).toHaveLength(0);
  });

  it('computes original deviations, squares and variance including the zero deviations', () => {
    const game = create().componentInstance;
    expect(game.original).toEqual([98, 100, 100, 102]);
    expect(game.mean()).toBe(100);
    expect(game.deviations()).toEqual([-2, 0, 0, 2]);
    expect(game.deviationSum()).toBe(0);
    expect(game.deviationExpression()).toBe('−2 + 0 + 0 + 2');
    expect(game.points().map(point => point.square)).toEqual([4, 0, 0, 4]);
    expect(game.sourceSquareSum()).toBe(8);
    expect(game.variance()).toBe(2);
  });

  it('uses a labelled close-up linear scale and stacks rather than hiding equal values', () => {
    const game = create().componentInstance;
    expect(game.ticks.map(tick => game.position(tick))).toEqual([0, 25, 50, 75, 100]);
    expect(game.points().map(point => point.x)).toEqual([0, 50, 50, 100]);
    expect(game.points().map(point => point.bottom)).toEqual([28, 28, 48, 28]);
    expect(new Set(game.points().map(point => point.id)).size).toBe(4);
    expect(game.plotDescription()).toContain('98, 100, 100, 102');
    expect(game.plotDescription()).toContain('Promedio 100');
    expect(game.plotDescription()).toContain('Escala de 98 a 102');
  });

  it('ignores invalid and out-of-order actions without completing or changing data', () => {
    const game = create().componentInstance; const done = vi.fn(); game.completed.subscribe(done);
    game.chooseCancellation('balanced'); game.formSquares(); game.answerSquare(4); game.chooseWeight('four');
    game.setDuplicated(true); game.compareCopy(); game.chooseSummary('per-record'); game.startPractice();
    game.answerPracticeSquare(1); game.choosePracticeSummary('same'); game.answerPracticeVariance(1);
    game.continuePractice();
    game.continueAfterHelp(); game.finish();
    expect(game.stage()).toBe('observe'); expect(game.feedback()).toBe('');
    expect(game.values()).toEqual([98, 100, 100, 102]); expect(done).not.toHaveBeenCalled();
    game.sumChanges(); game.chooseCancellation('invalid' as 'balanced');
    expect(game.stage()).toBe('cancel'); expect(game.feedback()).toBe('');
    game.chooseCancellation('balanced'); game.answerSquare(4); game.formSquares(); game.answerSquare(NaN);
    expect(game.stage()).toBe('squares'); expect(game.feedback()).toBe('');
    game.answerSquare(4); game.chooseWeight('invalid' as 'four');
    expect(game.stage()).toBe('weight');
    game.chooseWeight('four'); game.setDuplicated('true' as unknown as boolean);
    expect(game.duplicated()).toBe(false);
  });

  it('shows cancellation without deleting the values and explains mistakes on the same example', () => {
    const fixture = create(); const game = fixture.componentInstance;
    game.sumChanges(); fixture.detectChanges();
    const original = game.values();
    expect(fixture.nativeElement.textContent).toContain('−2 + 0 + 0 + 2 = 0');
    expect(fixture.nativeElement.querySelectorAll('.data-point')).toHaveLength(4);
    game.chooseCancellation('constant'); fixture.detectChanges();
    expect(game.feedback()).toContain('hay 98 y 102');
    expect(game.stage()).toBe('cancel'); expect(game.values()).toBe(original);
    game.chooseCancellation('missing');
    expect(game.feedback()).toContain('Tenemos los cuatro registros');
    expect(game.values()).toBe(original);
    game.chooseCancellation('balanced');
    expect(game.stage()).toBe('squares'); expect(game.feedback()).toBe('');
    expect(game.practiceHelped()).toBe(false);
  });

  it('accepts unsigned distances as another measure rather than claiming squares are the only solution', () => {
    const fixture = create(); const game = fixture.componentInstance;
    game.sumChanges(); game.chooseCancellation('balanced'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Las distancias sin signo también evitan que un menos borre un más');
    expect(fixture.nativeElement.textContent).toContain('las separaciones grandes cuentan más');
    expect(fixture.nativeElement.querySelectorAll('.square-cell')).toHaveLength(0);
    expect(fixture.nativeElement.textContent).not.toMatch(/varianza/i);
  });

  it('constructs two 2-by-2 squares and retains both zero-contribution observations', () => {
    const fixture = create(); const game = fixture.componentInstance;
    game.sumChanges(); game.chooseCancellation('balanced'); game.formSquares(); fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelectorAll('.record-card')).toHaveLength(4);
    expect(root.querySelectorAll('.record-card .square-cell')).toHaveLength(8);
    expect(root.querySelectorAll('.empty-square')).toHaveLength(2);
    const squares = root.querySelectorAll<HTMLElement>('.record-card .square-grid');
    expect(squares).toHaveLength(2);
    expect(squares[0].style.gridTemplateColumns).toBe('repeat(2, 22px)');
    expect(squares[0].getAttribute('aria-label')).toContain('4 casillas');
    expect(root.querySelector('.totals')?.textContent).toContain('Registros: 4');
    expect(root.textContent).toContain('su registro también se cuenta');
    expect(game.variance()).toBe(2);
  });

  it('corrects a negative square and an unsquared distance without changing the source', () => {
    const game = create().componentInstance;
    game.sumChanges(); game.chooseCancellation('balanced'); game.formSquares();
    const values = game.values();
    game.answerSquare(-4);
    expect(game.feedback()).toContain('No puede tener menos de 0 casillas');
    expect(game.stage()).toBe('squares'); expect(game.values()).toBe(values);
    game.answerSquare(2);
    expect(game.feedback()).toContain('dos filas de dos casillas');
    expect(game.stage()).toBe('squares'); expect(game.values()).toBe(values);
    game.answerSquare(4); expect(game.stage()).toBe('weight');
  });

  it('moves keyboard focus to the question when the square-construction button disappears', async () => {
    const fixture = create(); const game = fixture.componentInstance;
    game.sumChanges(); game.chooseCancellation('balanced'); fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const form = Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.includes('Formar los cuadrados'))!;
    form.focus(); form.click(); fixture.detectChanges(); await fixture.whenStable();
    expect(document.activeElement).toBe(root.querySelector('#sag-task-title'));
    expect(document.activeElement?.textContent).toContain('¿Cuánto aporta la desviación −2?');
  });

  it('contrasts 1 with 4 before asking how the square weights a doubled separation', () => {
    const fixture = create(); const game = fixture.componentInstance;
    game.sumChanges(); game.chooseCancellation('balanced'); game.formSquares(); game.answerSquare(4);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.weight-demo .square-cell')).toHaveLength(5);
    expect(fixture.nativeElement.textContent).toContain('1 × 1 = 1');
    expect(fixture.nativeElement.textContent).toContain('2 × 2 = 4');
    game.chooseWeight('twice'); expect(game.stage()).toBe('weight');
    expect(game.feedback()).toContain('el aporte pasó de 1 a 4');
    game.chooseWeight('unchanged'); expect(game.stage()).toBe('weight');
    game.chooseWeight('four'); expect(game.stage()).toBe('duplicate');
  });

  it('duplicates each source observation without altering mean, proportions or variance', () => {
    const fixture = create(); const game = fixture.componentInstance;
    reachDuplicate(game); game.setDuplicated(true); fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(game.values()).toEqual([98, 98, 100, 100, 100, 100, 102, 102]);
    expect(game.mean()).toBe(100); expect(game.deviationSum()).toBe(0);
    expect(game.squareSum()).toBe(16); expect(game.sourceSquareSum()).toBe(8);
    expect(game.variance()).toBe(2);
    expect(root.querySelectorAll('.data-point')).toHaveLength(8);
    expect(root.querySelectorAll('.record-card')).toHaveLength(8);
    expect(root.querySelectorAll('.record-card .square-cell')).toHaveLength(16);
    expect(root.querySelectorAll('.empty-square')).toHaveLength(4);
    expect(game.points().map(point => point.bottom)).toEqual([28, 48, 28, 48, 68, 88, 28, 48]);
    expect(new Set(game.points().map(point => point.id)).size).toBe(8);
    expect(root.textContent).toContain('no son nuevas mediciones');
    expect(root.textContent).toContain('Repetimos cada registro dos veces');
    expect(root.textContent).toContain('Ningún valor cambió');
    expect(game.plotDescription()).toContain('Copia de experimento');
  });

  it('lets the player undo and repeat the experiment while retaining the original evidence', () => {
    const game = create().componentInstance;
    reachDuplicate(game); const original = game.values();
    game.setDuplicated(true); game.setDuplicated(false);
    expect(game.values()).toBe(original); expect(game.squareSum()).toBe(8);
    expect(game.points().map(point => point.id)).toEqual(['record-0', 'record-1', 'record-2', 'record-3']);
    expect(game.duplicateViewed()).toBe(true);
    game.setDuplicated(true); expect(game.squareSum()).toBe(16);
    expect(game.original).toEqual([98, 100, 100, 102]);
  });

  it('requires seeing the actual copy before comparing summaries', () => {
    const fixture = create(); const game = fixture.componentInstance;
    reachDuplicate(game); fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const compare = Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.includes('Comparar los resúmenes'))!;
    expect(compare.disabled).toBe(true);
    game.compareCopy(); expect(game.stage()).toBe('duplicate');
    expect(game.feedback()).toContain('No son nuevas mediciones');
    game.setDuplicated(true); game.setDuplicated(false); game.compareCopy();
    expect(game.stage()).toBe('duplicate');
    game.setDuplicated(true); fixture.detectChanges(); expect(compare.disabled).toBe(false);
    compare.click(); fixture.detectChanges(); expect(game.stage()).toBe('average');
  });

  it('corrects sum-only and signed-sum reasoning on the same duplicated observations', () => {
    const game = create().componentInstance;
    reachDuplicate(game); game.setDuplicated(true); game.compareCopy();
    const copied = game.values();
    game.chooseSummary('total');
    expect(game.feedback()).toContain('el doble de registros');
    expect(game.stage()).toBe('average'); expect(game.values()).toBe(copied);
    game.chooseSummary('signed');
    expect(game.feedback()).toContain('conservamos los cuadrados y los promediamos');
    expect(game.stage()).toBe('average');
    game.chooseSummary('invalid' as 'total'); expect(game.values()).toBe(copied);
    game.chooseSummary('per-record'); expect(game.stage()).toBe('discovery');
  });

  it('names variance after constructing it and shows the denominator and squared units accurately', () => {
    const fixture = create(); const game = fixture.componentInstance;
    reachDiscovery(game); fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.textContent).toContain('Ese promedio se llama varianza');
    expect(root.textContent).toContain('8 ÷ 4 = 2');
    expect(root.textContent).toContain('16 ÷ 8 = 2');
    expect(root.textContent).toContain('incluidos los que tienen separación 0');
    expect(root.textContent).toContain('2 (t/h)²');
    expect(root.textContent).toContain('No es una distancia de 2 t/h');
    expect(root.querySelectorAll('.data-point')).toHaveLength(4);
    expect(game.values()).toEqual([98, 100, 100, 102]);
  });

  it('keeps the guided comparison unsolved until discovery, including after a guided hint', () => {
    const fixture = create(); const game = fixture.componentInstance;
    reachDuplicate(game); game.setDuplicated(true); game.compareCopy(); fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const comparison = root.querySelector('.comparison-box')!;
    expect(comparison.textContent).toContain('4 registros · suma 8');
    expect(comparison.textContent).toContain('8 registros · suma 16');
    expect(comparison.querySelectorAll('b')).toHaveLength(0);
    expect(game.comparisonSolved()).toBe(false);
    game.chooseSummary('total'); fixture.detectChanges();
    expect(game.stage()).toBe('average'); expect(game.comparisonSolved()).toBe(false);
    expect(comparison.querySelectorAll('b')).toHaveLength(0);
    game.chooseSummary('per-record'); fixture.detectChanges();
    expect(game.comparisonSolved()).toBe(true);
    expect(Array.from(comparison.querySelectorAll('b'), result => result.textContent))
      .toEqual(['8 ÷ 4 = 2', '16 ÷ 8 = 2']);
  });

  it('starts fresh practice without inheriting help and hides the square answer initially', () => {
    const fixture = create(); const game = fixture.componentInstance;
    game.sumChanges(); game.chooseCancellation('constant'); game.chooseCancellation('balanced');
    game.formSquares(); game.answerSquare(-4); game.answerSquare(4); game.chooseWeight('four');
    game.setDuplicated(true); game.compareCopy(); game.chooseSummary('per-record'); game.startPractice();
    fixture.detectChanges();
    expect(game.values()).toEqual([99, 99, 101, 101]); expect(game.mean()).toBe(100);
    expect(game.deviations()).toEqual([-1, -1, 1, 1]);
    expect(game.variance()).toBe(1); expect(game.practiceHelped()).toBe(false);
    expect(game.practiceVarianceAnswered()).toBe(false);
    expect(game.feedback()).toBe(''); expect(game.round()).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('.square-cell')).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('¿Cuánto aporta −1 al cuadrado?');
    expect(fixture.nativeElement.querySelectorAll('.data-point')).toHaveLength(4);
  });

  it('shows practice records, sums and counts without revealing quotients or an explanation before an answer', () => {
    const fixture = create(); const game = fixture.componentInstance;
    reachPractice(game); game.answerPracticeSquare(1); fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const comparison = root.querySelector('.comparison-box')!;
    expect(root.querySelectorAll('.record-card')).toHaveLength(4);
    expect(Array.from(root.querySelectorAll('.record-card strong'), record => record.textContent))
      .toEqual(['99 t/h', '99 t/h', '101 t/h', '101 t/h']);
    expect(root.querySelector('.mean-summary')?.textContent).toContain('Promedio: 100 t/h');
    expect(comparison.textContent).toContain('4 registros · suma 4');
    expect(comparison.textContent).toContain('8 registros · suma 8');
    expect(comparison.querySelectorAll('b')).toHaveLength(0);
    expect(game.comparisonSolved()).toBe(false);
    expect(root.textContent).not.toContain('÷');
    expect(root.textContent).not.toContain('1 (t/h)²');
    expect(root.textContent).not.toContain('se duplican juntas');
    expect(root.textContent).not.toContain('mismo promedio');
    expect(Array.from(root.querySelectorAll('.task-card .answer-choice'), choice => choice.textContent?.trim()).sort())
      .toEqual(['Se duplica', 'Se mantiene igual', 'Se vuelve cero'].sort());
    game.choosePracticeSummary('invalid' as 'same'); fixture.detectChanges();
    expect(game.stage()).toBe('practice-average'); expect(game.feedback()).toBe('');
    expect(game.practiceHelped()).toBe(false); expect(game.comparisonSolved()).toBe(false);
    expect(comparison.querySelectorAll('b')).toHaveLength(0);
    expect(root.textContent).not.toContain('÷');
  });

  it('asks for the whole-data average on the same practice board without revealing it first', () => {
    const fixture = create(); const game = fixture.componentInstance;
    const done = vi.fn(); game.completed.subscribe(done);
    reachPractice(game); game.answerPracticeSquare(1); const records = game.records();
    game.choosePracticeSummary('same'); fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(game.stage()).toBe('practice-checked'); expect(game.practicing()).toBe(true);
    expect(game.comparisonVisible()).toBe(true); expect(game.comparisonSolved()).toBe(false);
    expect(game.records()).toBe(records); expect(game.values()).toEqual([99, 99, 101, 101]);
    expect(game.mean()).toBe(100); expect(game.variance()).toBe(1); expect(game.round()).toBe(0);
    expect(game.practiceVarianceAnswered()).toBe(false);
    expect(root.querySelector('#sag-task-title')?.textContent?.trim()).toBe('¿Cuál es el promedio de estos aportes?');
    expect(root.querySelector('.task-card')?.textContent).toContain('operador');
    expect(root.querySelector('.task-card')?.textContent).toContain('suman 4');
    expect(root.querySelector('.task-card')?.textContent).toContain('4 registros');
    expect(game.practiceVarianceOptions().slice().sort((a, b) => a - b)).toEqual([0, 1, 4]);
    expect(Array.from(root.querySelectorAll('.variance-choices button'), choice => choice.textContent?.trim()).sort())
      .toEqual(['0', '1', '4']);
    expect(root.querySelectorAll('.comparison-box b')).toHaveLength(0);
    expect(root.textContent).not.toContain('÷');
    expect(root.textContent).not.toContain('1 (t/h)²');
    expect(root.querySelector('input, textarea, form, select')).toBeNull();
    expect(root.querySelector('.completion-card, .report-card')).toBeNull();
    expect(Array.from(root.querySelectorAll('button')).some(button => button.textContent?.includes('Continuar'))).toBe(false);
    game.continuePractice(); game.finish(); expect(done).not.toHaveBeenCalled();
    expect(game.stage()).toBe('practice-checked');

    click(root, '1'); fixture.detectChanges();
    expect(game.stage()).toBe('practice-checked'); expect(game.records()).toBe(records);
    expect(game.practiceVarianceAnswered()).toBe(true); expect(game.practiceHelped()).toBe(false);
    expect(game.comparisonSolved()).toBe(true);
    expect(root.querySelector('#sag-task-title')?.textContent?.trim()).toBe('Exacto: 4 ÷ 4 = 1');
    expect(root.querySelector('.task-card')?.textContent).toContain('1 (t/h)²');
    expect(Array.from(root.querySelectorAll('.comparison-box b'), result => result.textContent))
      .toEqual(['4 ÷ 4 = 1', '8 ÷ 8 = 1']);
    expect(root.querySelector('.task-card .answer-choice')).toBeNull();
    expect(root.querySelector('.completion-card, .report-card')).toBeNull();
    game.finish(); expect(done).not.toHaveBeenCalled();
    click(root, 'Continuar →'); fixture.detectChanges();
    expect(game.stage()).toBe('success'); expect(done).not.toHaveBeenCalled();
    click(root, 'Entregar el hallazgo →'); fixture.detectChanges();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('moves keyboard focus to the numeric question and its checked answer as choices disappear', async () => {
    const fixture = create(); const game = fixture.componentInstance;
    reachPractice(game); game.answerPracticeSquare(1); fixture.detectChanges(); await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const answer = Array.from(root.querySelectorAll<HTMLButtonElement>('.task-card .answer-choice'))
      .find(button => button.textContent?.trim() === 'Se mantiene igual')!;
    answer.focus(); answer.click(); fixture.detectChanges(); await fixture.whenStable();
    expect(root.contains(answer)).toBe(false);
    expect(document.activeElement).toBe(root.querySelector('#sag-task-title'));
    expect(document.activeElement?.textContent?.trim()).toBe('¿Cuál es el promedio de estos aportes?');
    expect(game.stage()).toBe('practice-checked');
    const numericAnswer = Array.from(root.querySelectorAll<HTMLButtonElement>('.variance-choices button'))
      .find(button => button.textContent?.trim() === '1')!;
    numericAnswer.focus(); numericAnswer.click(); fixture.detectChanges(); await fixture.whenStable();
    expect(root.contains(numericAnswer)).toBe(false);
    expect(document.activeElement).toBe(root.querySelector('#sag-task-title'));
    expect(document.activeElement?.textContent?.trim()).toBe('Exacto: 4 ÷ 4 = 1');
    expect(game.stage()).toBe('practice-checked'); expect(game.practiceVarianceAnswered()).toBe(true);
  });

  it.each([
    { answer: 0, explanation: '0 sería no tener separación en ningún registro' },
    { answer: 4, explanation: '4 es la suma. Para obtener el promedio' },
  ])('corrects numeric answer $answer on the same data and requires an unaided retry', ({ answer, explanation }) => {
    const fixture = create(); const game = fixture.componentInstance;
    const done = vi.fn(); game.completed.subscribe(done);
    reachPractice(game); game.answerPracticeSquare(1); game.choosePracticeSummary('same'); fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement; const records = game.records();
    const choices = game.practiceVarianceOptions();
    click(root, String(answer)); fixture.detectChanges();
    expect(game.stage()).toBe('practice-checked'); expect(game.practiceVarianceAnswered()).toBe(false);
    expect(game.feedback()).toContain(explanation); expect(game.feedback()).toContain('4 registros');
    expect(game.practiceHelped()).toBe(true); expect(game.records()).toBe(records);
    expect(game.values()).toEqual([99, 99, 101, 101]); expect(game.mean()).toBe(100);
    expect(game.practiceVarianceOptions()).toBe(choices); expect(game.comparisonSolved()).toBe(false);
    expect(root.querySelectorAll('.variance-choices button')).toHaveLength(3);
    expect(root.querySelectorAll('.comparison-box b')).toHaveLength(0);
    game.continuePractice(); game.continueAfterHelp(); game.finish();
    expect(game.stage()).toBe('practice-checked'); expect(game.round()).toBe(0); expect(done).not.toHaveBeenCalled();

    click(root, '1'); fixture.detectChanges();
    expect(game.practiceVarianceAnswered()).toBe(true); expect(game.feedback()).toBe('');
    expect(game.records()).toBe(records); expect(game.practiceHelped()).toBe(true);
    click(root, 'Continuar →'); fixture.detectChanges();
    expect(game.stage()).toBe('review'); expect(game.records()).toBe(records);
    click(root, 'Probar otros registros →'); fixture.detectChanges();
    expect(game.stage()).toBe('practice-square'); expect(game.round()).toBe(1);
    expect(game.values()).toEqual([98, 98, 102, 102]); expect(game.practiceVarianceAnswered()).toBe(false);
    expect(game.practiceHelped()).toBe(false); expect(game.feedback()).toBe('');
    game.answerPracticeSquare(4); game.choosePracticeSummary('same'); fixture.detectChanges();
    expect(root.querySelector('.task-card')?.textContent).toContain('suman 16');
    expect(game.practiceVarianceOptions().slice().sort((a, b) => a - b)).toEqual([0, 4, 16]);
    expect(root.querySelectorAll('.comparison-box b')).toHaveLength(0);
    click(root, '4'); fixture.detectChanges();
    expect(root.querySelector('#sag-task-title')?.textContent?.trim()).toBe('Exacto: 16 ÷ 4 = 4');
    expect(root.querySelector('.task-card')?.textContent).toContain('4 (t/h)²');
    click(root, 'Continuar →'); fixture.detectChanges();
    expect(game.stage()).toBe('success'); expect(done).not.toHaveBeenCalled();
    click(root, 'Entregar el hallazgo →'); fixture.detectChanges();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('explains a practice mistake without replacing its records', () => {
    const fixture = create(); const game = fixture.componentInstance;
    reachPractice(game); const records = game.records(); game.answerPracticeSquare(-1); fixture.detectChanges();
    expect(game.stage()).toBe('practice-square'); expect(game.practiceHelped()).toBe(true);
    expect(game.records()).toBe(records); expect(game.feedback()).toContain('1 × 1 = 1 casilla');
    expect(fixture.nativeElement.textContent).toContain('Una pista');
    expect(fixture.nativeElement.querySelector('[aria-live="polite"]')).not.toBeNull();
    game.continueAfterHelp(); expect(game.records()).toBe(records);
    game.answerPracticeSquare(1); expect(game.stage()).toBe('practice-average');
    expect(game.feedback()).toBe('');
  });

  it('focuses practice hints after each type of mistake while guided hints retain button focus', async () => {
    const fixture = create(); const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    game.sumChanges(); fixture.detectChanges(); await fixture.whenStable();
    const guidedAnswer = Array.from(root.querySelectorAll<HTMLButtonElement>('.task-card .answer-choice'))
      .find(button => button.textContent?.includes('Sí. Todos los registros'))!;
    guidedAnswer.focus(); guidedAnswer.click(); fixture.detectChanges(); await fixture.whenStable();
    expect(root.querySelector('.feedback')).not.toBeNull();
    expect(document.activeElement).toBe(guidedAnswer);

    reachPractice(game); fixture.detectChanges(); await fixture.whenStable();
    const squareAnswer = Array.from(root.querySelectorAll<HTMLButtonElement>('.task-card .answer-choice'))
      .find(button => button.textContent?.trim() === '−1 casilla')!;
    squareAnswer.focus(); squareAnswer.click(); fixture.detectChanges(); await fixture.whenStable();
    expect(document.activeElement).toBe(root.querySelector('.feedback'));
    expect(document.activeElement?.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement?.textContent).toContain('1 × 1 = 1 casilla');
    expect(game.stage()).toBe('practice-square');

    click(root, '1 casilla'); fixture.detectChanges(); await fixture.whenStable();
    expect(root.querySelector('.feedback')).toBeNull();
    const summaryAnswer = Array.from(root.querySelectorAll<HTMLButtonElement>('.task-card .answer-choice'))
      .find(button => button.textContent?.trim() === 'Se duplica')!;
    summaryAnswer.focus(); summaryAnswer.click(); fixture.detectChanges(); await fixture.whenStable();
    expect(document.activeElement).toBe(root.querySelector('.feedback'));
    expect(document.activeElement?.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement?.textContent).toContain('se duplican juntas');
    expect(game.stage()).toBe('practice-average');

    click(root, 'Se mantiene igual'); fixture.detectChanges(); await fixture.whenStable();
    const varianceAnswer = Array.from(root.querySelectorAll<HTMLButtonElement>('.variance-choices button'))
      .find(button => button.textContent?.trim() === '4')!;
    varianceAnswer.focus(); varianceAnswer.click(); fixture.detectChanges(); await fixture.whenStable();
    expect(document.activeElement).toBe(root.querySelector('.feedback'));
    expect(document.activeElement?.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement?.textContent).toContain('4 es la suma');
    expect(game.stage()).toBe('practice-checked'); expect(game.practiceVarianceAnswered()).toBe(false);
  });

  it('checks both duplication and cancellation misconceptions in practice', () => {
    const game = create().componentInstance;
    reachPractice(game); game.answerPracticeSquare(1); const records = game.records();
    game.choosePracticeSummary('double');
    expect(game.feedback()).toContain('se duplican juntas'); expect(game.stage()).toBe('practice-average');
    game.choosePracticeSummary('zero');
    expect(game.feedback()).toContain('no se vuelven 0'); expect(game.records()).toBe(records);
    game.choosePracticeSummary('same'); expect(game.stage()).toBe('practice-checked');
    expect(game.records()).toBe(records);
    game.answerPracticeVariance(1);
    game.continuePractice(); expect(game.stage()).toBe('review');
    expect(game.records()).toBe(records);
  });

  it('explains a wrong summary without revealing the numeric average and requires another unaided round', () => {
    const fixture = create(); const game = fixture.componentInstance;
    const done = vi.fn(); game.completed.subscribe(done);
    reachPractice(game); game.answerPracticeSquare(1); const records = game.records();
    game.choosePracticeSummary('double'); fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(game.stage()).toBe('practice-average'); expect(game.practiceHelped()).toBe(true);
    expect(game.records()).toBe(records); expect(game.round()).toBe(0);
    expect(game.comparisonSolved()).toBe(false);
    expect(root.querySelectorAll('.comparison-box b')).toHaveLength(0);
    expect(root.textContent).not.toContain('÷');
    expect(root.textContent).not.toContain('1 (t/h)²');
    expect(root.querySelector('.task-card .choices')?.querySelectorAll('button')).toHaveLength(3);
    const feedback = game.feedback();
    game.choosePracticeSummary('invalid' as 'same'); game.continuePractice(); game.continueAfterHelp(); game.finish();
    expect(game.stage()).toBe('practice-average'); expect(game.feedback()).toBe(feedback);
    expect(game.records()).toBe(records); expect(game.round()).toBe(0); expect(done).not.toHaveBeenCalled();
    game.choosePracticeSummary('same'); fixture.detectChanges();
    expect(game.stage()).toBe('practice-checked'); expect(game.records()).toBe(records);
    expect(game.practiceHelped()).toBe(true); expect(game.feedback()).toBe('');
    game.continueAfterHelp(); game.finish(); expect(game.stage()).toBe('practice-checked');
    expect(root.querySelectorAll('.comparison-box b')).toHaveLength(0);
    click(root, '1'); fixture.detectChanges();
    click(root, 'Continuar →'); fixture.detectChanges();
    expect(game.stage()).toBe('review'); expect(game.records()).toBe(records); expect(game.round()).toBe(0);
    game.continuePractice(); game.finish(); expect(done).not.toHaveBeenCalled();
    click(root, 'Probar otros registros →'); fixture.detectChanges();
    expect(game.stage()).toBe('practice-square'); expect(game.round()).toBe(1);
    expect(game.values()).toEqual([98, 98, 102, 102]); expect(game.practiceHelped()).toBe(false);
    game.answerPracticeSquare(4); game.choosePracticeSummary('same');
    expect(game.stage()).toBe('practice-checked'); game.finish(); expect(done).not.toHaveBeenCalled();
    game.answerPracticeVariance(4);
    game.continuePractice(); expect(game.stage()).toBe('success');
    game.finish(); expect(done).toHaveBeenCalledTimes(1);
  });

  it.each([
    { random: 0, samePosition: 2 },
    { random: 0.4, samePosition: 1 },
    { random: 0.8, samePosition: 0 },
  ])('rotates short practice choices from random $random, keeping each round stable', ({ random, samePosition }) => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(random);
    try {
      const fixture = create(); const game = fixture.componentInstance; reachPractice(game);
      const positions: number[] = [];
      const texts = new Map([
        ['double', 'Se duplica'], ['zero', 'Se vuelve cero'], ['same', 'Se mantiene igual'],
      ]);
      for (let round = 0; round < 3; round += 1) {
        game.answerPracticeSquare(game.practiceSquare()); fixture.detectChanges();
        const choices = game.practiceSummaries();
        const order = choices.map(choice => choice.id);
        const position = order.indexOf('same'); positions.push(position);
        expect(position).toBe((samePosition - round + 3) % 3);
        expect(new Set(order).size).toBe(3);
        expect(choices.map(choice => choice.text)).toEqual(order.map(id => texts.get(id)));
        const root: HTMLElement = fixture.nativeElement;
        expect(game.comparisonSolved()).toBe(false);
        expect(root.querySelectorAll('.comparison-box b')).toHaveLength(0);
        expect(root.querySelector('.comparison-box')?.textContent)
          .toContain('4 registros · suma ' + game.sourceSquareSum());
        expect(root.querySelector('.comparison-box')?.textContent)
          .toContain('8 registros · suma ' + game.sourceSquareSum() * 2);
        expect(root.textContent).not.toContain('÷');
        expect(root.textContent).not.toContain(game.variance() + ' (t/h)²');
        expect(Array.from(root.querySelectorAll('.task-card .answer-choice'), choice => choice.textContent?.trim()))
          .toEqual(choices.map(choice => choice.text));
        fixture.detectChanges(); expect(game.practiceSummaries()).toBe(choices);
        game.choosePracticeSummary('double'); fixture.detectChanges();
        expect(game.practiceSummaries()).toBe(choices);
        expect(Array.from(root.querySelectorAll('.task-card .answer-choice'), choice => choice.textContent?.trim()))
          .toEqual(choices.map(choice => choice.text));
        game.choosePracticeSummary('invalid' as 'same'); fixture.detectChanges();
        expect(game.practiceSummaries().map(choice => choice.id)).toEqual(order);
        game.choosePracticeSummary('same'); fixture.detectChanges();
        const numericChoices = game.practiceVarianceOptions();
        const numericOffset = (Math.floor(random * 3) + round) % 3;
        const numericSource = [0, game.variance(), game.sourceSquareSum()];
        expect(numericChoices).toEqual(numericSource.map((_, index) => numericSource[(index + numericOffset) % 3]));
        expect(Array.from(root.querySelectorAll('.variance-choices button'), choice => Number(choice.textContent?.trim())))
          .toEqual(numericChoices);
        game.answerPracticeVariance(game.sourceSquareSum()); fixture.detectChanges();
        expect(game.practiceVarianceOptions()).toBe(numericChoices);
        expect(Array.from(root.querySelectorAll('.variance-choices button'), choice => Number(choice.textContent?.trim())))
          .toEqual(numericChoices);
        game.answerPracticeVariance(game.variance());
        game.continuePractice(); game.continueAfterHelp();
      }
      expect(new Set(positions).size).toBe(3);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('offers new records only after solving a supported example', () => {
    const game = create().componentInstance;
    reachPractice(game); game.answerPracticeSquare(-1);
    const supported = game.records(); game.continueAfterHelp(); expect(game.records()).toBe(supported);
    solvePractice(game); expect(game.stage()).toBe('review'); expect(game.records()).toBe(supported);
    game.continueAfterHelp();
    expect(game.stage()).toBe('practice-square'); expect(game.values()).toEqual([98, 98, 102, 102]);
    expect(game.variance()).toBe(4); expect(game.sourceSquareSum()).toBe(16);
    expect(game.practiceHelped()).toBe(false); expect(game.feedback()).toBe('');
    expect(game.practiceVarianceAnswered()).toBe(false);
    solvePractice(game); expect(game.stage()).toBe('success');
  });

  it('keeps replacement means, squares, choices and plots correct over repeated supported rounds', () => {
    const game = create().componentInstance; reachPractice(game);
    const expected = [[99, 99, 101, 101], [98, 98, 102, 102], [100, 100, 102, 102]];
    for (let round = 0; round < 9; round += 1) {
      const values = expected[round % 3]; const mean = values.reduce((sum, value) => sum + value, 0) / 4;
      const squareSum = values.reduce((sum, value) => sum + (value - mean) ** 2, 0);
      expect(game.values()).toEqual(values); expect(game.mean()).toBe(mean);
      expect(game.sourceSquareSum()).toBe(squareSum); expect(game.variance()).toBe(squareSum / 4);
      expect(game.points().map(point => point.x)).toEqual(values.map(value => game.position(value)));
      expect(game.plotDescription()).toContain('Promedio ' + mean);
      expect(new Set(game.practiceSquareOptions()).size).toBe(3);
      expect(game.practiceSquareOptions()).toContain(game.practiceSquare());
      expect(new Set(game.practiceVarianceOptions()).size).toBe(3);
      expect(game.practiceVarianceOptions().slice().sort((a, b) => a - b))
        .toEqual([0, squareSum / 4, squareSum].sort((a, b) => a - b));
      expect(game.practiceVarianceAnswered()).toBe(false);
      game.answerPracticeSquare(-game.practiceSquare()); solvePractice(game);
      expect(game.stage()).toBe('review'); game.continueAfterHelp();
    }
    expect(game.original).toEqual([98, 100, 100, 102]);
  });

  it('does not count invalid practice answers as pedagogical mistakes', () => {
    const game = create().componentInstance; reachPractice(game);
    game.answerPracticeVariance(1);
    game.answerPracticeSquare(99); game.answerPracticeSquare(NaN);
    expect(game.stage()).toBe('practice-square'); expect(game.practiceHelped()).toBe(false);
    game.answerPracticeSquare(1); game.choosePracticeSummary('invalid' as 'same');
    expect(game.stage()).toBe('practice-average'); expect(game.practiceHelped()).toBe(false);
    expect(game.feedback()).toBe(''); game.choosePracticeSummary('same');
    expect(game.stage()).toBe('practice-checked'); expect(game.practiceHelped()).toBe(false);
    game.answerPracticeVariance(99); game.answerPracticeVariance(NaN); game.answerPracticeVariance(Infinity);
    expect(game.practiceVarianceAnswered()).toBe(false); expect(game.practiceHelped()).toBe(false);
    expect(game.feedback()).toBe('');
    game.continuePractice();
    expect(game.stage()).toBe('practice-checked');
    game.answerPracticeVariance(1); game.continuePractice();
    expect(game.stage()).toBe('success');
  });

  it('guards continuation and repeated answers so only a checked practice can proceed', () => {
    const game = create().componentInstance; const done = vi.fn(); game.completed.subscribe(done);
    game.continuePractice(); expect(game.stage()).toBe('observe');
    reachDiscovery(game); game.continuePractice(); expect(game.stage()).toBe('discovery');
    game.startPractice(); const records = game.records();
    game.continuePractice(); game.choosePracticeSummary('same');
    expect(game.stage()).toBe('practice-square'); expect(game.records()).toBe(records);
    game.answerPracticeSquare(1); game.continuePractice();
    game.choosePracticeSummary('invalid' as 'same');
    expect(game.stage()).toBe('practice-average'); expect(game.comparisonSolved()).toBe(false);
    expect(game.feedback()).toBe(''); expect(game.practiceHelped()).toBe(false);
    game.choosePracticeSummary('same');
    game.choosePracticeSummary('double'); game.choosePracticeSummary('same'); game.answerPracticeSquare(-1);
    game.continueAfterHelp(); game.startPractice(); game.finish();
    expect(game.stage()).toBe('practice-checked'); expect(game.records()).toBe(records);
    expect(game.round()).toBe(0); expect(game.feedback()).toBe('');
    expect(game.practiceHelped()).toBe(false); expect(done).not.toHaveBeenCalled();
    game.continuePractice();
    expect(game.stage()).toBe('practice-checked'); expect(game.practiceVarianceAnswered()).toBe(false);
    game.answerPracticeVariance(1); game.answerPracticeVariance(4); game.answerPracticeVariance(0);
    expect(game.practiceVarianceAnswered()).toBe(true); expect(game.practiceHelped()).toBe(false);
    expect(game.feedback()).toBe('');
    game.continuePractice();
    expect(game.stage()).toBe('success'); expect(game.values()).toEqual([98, 100, 100, 102]);
    game.continuePractice(); game.continueAfterHelp(); game.choosePracticeSummary('zero');
    expect(game.stage()).toBe('success'); expect(game.round()).toBe(0);
    expect(game.feedback()).toBe(''); expect(game.practiceHelped()).toBe(false);
    game.finish(); game.finish(); expect(done).toHaveBeenCalledTimes(1);
  });

  it('restores original evidence in the final report even after practice with another mean', () => {
    const fixture = create(); const game = fixture.componentInstance; reachPractice(game);
    for (let index = 0; index < 2; index += 1) {
      game.answerPracticeSquare(-game.practiceSquare()); solvePractice(game); game.continueAfterHelp();
    }
    expect(game.mean()).toBe(101); expect(game.values()).toEqual([100, 100, 102, 102]);
    const records = game.records();
    game.answerPracticeSquare(1); fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('.comparison-box')?.textContent).toContain('4 registros · suma 4');
    expect(root.querySelector('.comparison-box')?.textContent).toContain('8 registros · suma 8');
    expect(root.querySelectorAll('.comparison-box b')).toHaveLength(0);
    game.choosePracticeSummary('same'); fixture.detectChanges();
    expect(game.stage()).toBe('practice-checked'); expect(game.records()).toBe(records);
    expect(game.round()).toBe(2); expect(game.mean()).toBe(101); expect(game.variance()).toBe(1);
    expect(game.values()).toEqual([100, 100, 102, 102]);
    expect(root.querySelector('.mean-summary')?.textContent).toContain('Promedio: 101 t/h');
    expect(root.querySelectorAll('.comparison-box b')).toHaveLength(0);
    game.answerPracticeVariance(1); fixture.detectChanges();
    expect(Array.from(root.querySelectorAll('.comparison-box b'), result => result.textContent))
      .toEqual(['4 ÷ 4 = 1', '8 ÷ 8 = 1']);
    expect(root.querySelector('.report-card')).toBeNull();
    game.continuePractice(); fixture.detectChanges();
    const report = fixture.nativeElement.querySelector('.report-card') as HTMLElement;
    expect(game.stage()).toBe('success'); expect(game.mean()).toBe(100);
    expect(game.values()).toEqual([98, 100, 100, 102]); expect(game.variance()).toBe(2);
    expect(report.textContent).toContain('98, 100, 100 y 102');
    expect(report.textContent).toContain('Promedio: 100 t/h · Varianza: 2 (t/h)²');
    expect(report.textContent).toContain('4 registros');
    expect(report.textContent).toContain('No explica por qué');
    expect(report.textContent).toContain('ni dice si fue la adecuada');
    expect(report.textContent).toContain('no es una distancia de 2 t/h');
  });

  it('requires independent practice and emits completion only once', () => {
    const game = create().componentInstance; const done = vi.fn(); game.completed.subscribe(done);
    reachDiscovery(game); game.finish(); expect(done).not.toHaveBeenCalled();
    game.startPractice(); game.answerPracticeSquare(-1); solvePractice(game);
    game.finish(); expect(done).not.toHaveBeenCalled();
    game.continueAfterHelp(); solvePractice(game); game.finish(); game.finish();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('completes the entire lesson through rendered native buttons', () => {
    const fixture = create(); const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement; const done = vi.fn(); game.completed.subscribe(done);
    const labels = [
      'Sumar desviaciones →',
      'No. Hubo diferencias, pero los signos se compensaron.',
      'Formar los cuadrados →', '4 casillas',
      'Cuatro veces: pasa de 1 a 4 casillas.', 'Duplicar en una copia',
      'Comparar los resúmenes →', 'Comparar el promedio de cuadrados por registro.',
      'Comprobar con otros datos →', '1 casilla',
      'Se mantiene igual', '1', 'Continuar →',
      'Entregar el hallazgo →',
    ];
    for (const label of labels) { click(root, label); fixture.detectChanges(); }
    expect(done).toHaveBeenCalledTimes(1); expect(game.stage()).toBe('success');
    expect(root.querySelector('input, textarea, form, select')).toBeNull();
  });

  it('renders the guided recovery path with new data and no hidden progress', () => {
    const fixture = create(); const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement; reachPractice(game); fixture.detectChanges();
    click(root, '−1 casilla'); fixture.detectChanges();
    expect(root.querySelectorAll('.record-card')).toHaveLength(4);
    click(root, '1 casilla'); fixture.detectChanges();
    click(root, 'Se mantiene igual'); fixture.detectChanges();
    expect(game.stage()).toBe('practice-checked');
    click(root, '1'); fixture.detectChanges();
    click(root, 'Continuar →');
    fixture.detectChanges();
    expect(root.textContent).toContain('Cuadrados y promedio trabajan juntos');
    click(root, 'Probar otros registros →'); fixture.detectChanges();
    expect(root.textContent).toContain('¿Cuánto aporta −2 al cuadrado?');
    click(root, '4 casillas'); fixture.detectChanges();
    click(root, 'Se mantiene igual'); fixture.detectChanges();
    expect(game.stage()).toBe('practice-checked');
    click(root, '4'); fixture.detectChanges();
    click(root, 'Continuar →');
    fixture.detectChanges();
    expect(game.stage()).toBe('success');
  });

  it('starts a replay cleanly without completion, duplication or practice help', () => {
    const fixture = create(); const game = fixture.componentInstance;
    reachPractice(game); solvePractice(game); game.finish(); fixture.destroy();
    const replay = create().componentInstance;
    expect(replay.stage()).toBe('observe'); expect(replay.values()).toEqual([98, 100, 100, 102]);
    expect(replay.duplicated()).toBe(false); expect(replay.duplicateViewed()).toBe(false);
    expect(replay.squaresFormed()).toBe(false); expect(replay.practiceHelped()).toBe(false);
    expect(replay.practiceVarianceAnswered()).toBe(false);
    expect(replay.round()).toBe(0); expect(replay.feedback()).toBe('');
    expect(replay.signed(-2)).toBe('−2'); expect(replay.signed(2)).toBe('+2'); expect(replay.signed(0)).toBe('0');
  });
});
