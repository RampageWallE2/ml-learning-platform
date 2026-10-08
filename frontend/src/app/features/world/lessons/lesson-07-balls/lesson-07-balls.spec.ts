import { TestBed } from '@angular/core/testing';
import { Lesson07Balls } from './lesson-07-balls';
import { C7_BALLS_RECORDS } from '../data/open-pit-original-records';

describe('Lesson07Balls', () => {
  function create() {
    const fixture = TestBed.createComponent(Lesson07Balls);
    fixture.detectChanges();
    return fixture;
  }

  function reachReport(game: Lesson07Balls): void {
    if (game.stage() === 'observe') game.choosePrediction('b');
    for (let index = 0; index < 2; index += 1) {
      game.answerVariance(game.activePeriod().variance);
      game.continueCalculation();
    }
  }

  function click(root: HTMLElement, label: string): void {
    const button = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.replace(/\s+/g, ' ').trim() === label,
    );
    expect(button, 'Button: ' + label).toBeDefined();
    button!.click();
  }

  it('places all active records and the given mean in focused evidence before a calculation', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.primary-evidence')).toBeNull();
    game.choosePrediction('b');
    fixture.detectChanges();
    const primary = root.querySelector('.workbench--focused > .primary-evidence')!;
    expect(primary.getAttribute('role')).toBe('region');
    expect(primary.getAttribute('aria-labelledby')).toBe('balls-records-title');
    expect(primary.querySelector('h4')!.textContent).toContain('Período A');
    expect(primary.querySelector('.mean-summary')!.textContent).toContain('100 t/h');
    expect(primary.querySelectorAll('.record-card')).toHaveLength(6);
    expect(primary.querySelectorAll('.square-cell')).toHaveLength(18);
    expect(primary.querySelector('.totals')!.textContent).toContain('Casillas en total: 18');
    expect(primary.textContent).not.toContain('Varianza:');
    expect(root.textContent).not.toContain('18 ÷ 6');
    expect(game.helped()).toBe(false);
    expect(game.hintLevel()).toBe(0);
    expect(game.solved()).toEqual([]);
    expect(root.querySelector('.data-board .active-records')).toBeNull();
    expect(root.querySelectorAll('.data-point')).toHaveLength(12);
    const options = [...game.options()];
    game.requestHint();
    fixture.detectChanges();
    expect(primary.querySelectorAll('.record--hint')).toHaveLength(2);
    expect(primary.querySelectorAll('.square-cell')).toHaveLength(18);
    expect(game.options()).toEqual(options);
    game.requestHint();
    fixture.detectChanges();
    expect(root.querySelector('.workbench--squares')).not.toBeNull();
    expect(primary.querySelectorAll('.square-cell')).toHaveLength(18);
    expect(primary.querySelector('.totals')!.textContent).toContain('Casillas en total:');
  });

  it('switches the focused evidence to B and returns to the two-period report without duplicate records', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    game.choosePrediction('b');
    game.answerVariance(3);
    fixture.detectChanges();
    expect(root.querySelector('.workbench--checked')).not.toBeNull();
    game.continueCalculation();
    fixture.detectChanges();
    const primary = root.querySelector('.primary-evidence')!;
    expect(primary.querySelector('h4')!.textContent).toContain('Período B');
    expect(primary.querySelectorAll('.record-card')).toHaveLength(6);
    expect(root.querySelectorAll('.record-card')).toHaveLength(6);
    expect(primary.querySelectorAll('.square-cell')).toHaveLength(36);
    expect(root.textContent).not.toContain('36 ÷ 6');
    game.answerVariance(6);
    game.continueCalculation();
    fixture.detectChanges();
    expect(root.querySelector('.primary-evidence, .workbench--focused')).toBeNull();
    expect(root.querySelectorAll('.period-plot')).toHaveLength(2);
    expect(root.querySelectorAll('.variance--solved')).toHaveLength(2);
  });

  it('starts with the report mission and two fully visible datasets, without revealing results or written answers', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    expect(root.textContent).toContain('informe del siguiente turno');
    expect(root.textContent).toContain('El borrador dice que variaron igual');
    expect(root.textContent).toContain('¿En qué período ves más datos lejos del promedio?');
    expect(root.textContent).toContain('A y B son dos momentos de trabajo');
    expect(root.textContent).toContain('Elige tu primera idea');
    expect(root.textContent).toContain('condiciones parecidas');
    expect(root.textContent).toContain('97, 100, 100, 100, 100, 103');
    expect(root.textContent).toContain('97, 97, 100, 100, 103, 103');
    expect(root.textContent).toContain('No es una meta de producción');
    expect(root.querySelectorAll('.data-point')).toHaveLength(12);
    expect(root.querySelectorAll('.variance-summary strong')).toHaveLength(0);
    expect(root.querySelectorAll('.square-cell')).toHaveLength(0);
    for (const result of root.querySelectorAll('.variance-summary'))
      expect(result.textContent).toContain('por calcular');
    expect(root.querySelector('input, textarea, form, select')).toBeNull();
    expect(root.querySelectorAll('button:not([type="button"])')).toHaveLength(0);
    expect(root.textContent).not.toContain('3 (t/h)²');
    expect(root.textContent).not.toContain('6 (t/h)²');
    expect(game.prediction()).toBeNull();
    expect(game.predictionText()).toBe('');
    expect(game.predictions).toEqual([
      { id: 'a', text: 'Período A' },
      { id: 'b', text: 'Período B' },
      { id: 'equal', text: 'Se ven iguales' },
    ]);
    for (const choice of game.predictions) {
      expect(
        [...root.querySelectorAll('button')].some(
          (button) => button.textContent?.trim() === choice.text,
        ),
      ).toBe(true);
    }
    expect(root.querySelectorAll('.record-card')).toHaveLength(0);
    expect(root.querySelector('.totals')).toBeNull();
    expect(root.textContent).not.toContain('18 ÷ 6');
    const context = root.querySelector('.workbench > .evidence-context')!;
    expect(context.getAttribute('aria-label')).toBe(
      'Registros completos y lectura de los gráficos',
    );
    expect(context.querySelectorAll('.record-list')).toHaveLength(2);
    game.periods().forEach((period, index) => {
      expect(context.querySelectorAll('.record-list')[index].textContent).toContain(
        period.values.join(', '),
      );
    });
    expect(root.querySelector('.data-board .record-list')).toBeNull();
  });

  it.each(['a', 'b', 'equal'] as const)(
    'accepts prediction %s as an idea to check, without hinting or marking an error',
    (answer) => {
      const fixture = create();
      const game = fixture.componentInstance;
      const pair = game.pair();
      game.choosePrediction(answer);
      fixture.detectChanges();
      expect(game.prediction()).toBe(answer);
      expect(game.predictionText()).toBe(
        game.predictions.find((choice) => choice.id === answer)!.text,
      );
      expect(game.stage()).toBe('calculate');
      expect(game.pair()).toBe(pair);
      expect(game.activeIndex()).toBe(0);
      expect(game.solved()).toEqual([]);
      expect(game.helped()).toBe(false);
      expect(game.feedback()).toBe('');
      expect(game.hintLevel()).toBe(0);
      expect(fixture.nativeElement.querySelectorAll('.variance--solved')).toHaveLength(0);
      game.choosePrediction(answer === 'a' ? 'b' : 'a');
      expect(game.prediction()).toBe(answer);
      expect(game.helped()).toBe(false);
    },
  );

  it('cannot bypass prediction or use invalid predictions to start calculating', () => {
    const game = create().componentInstance;
    game.startCalculation();
    game.choosePrediction('invalid' as 'a');
    game.choosePrediction(null as unknown as 'a');
    expect(game.stage()).toBe('observe');
    expect(game.prediction()).toBeNull();
    expect(game.solved()).toEqual([]);
    expect(game.helped()).toBe(false);
    expect(game.feedback()).toBe('');
    game.choosePrediction('equal');
    game.startCalculation();
    game.choosePrediction('b');
    expect(game.stage()).toBe('calculate');
    expect(game.prediction()).toBe('equal');
    expect(game.activeIndex()).toBe(0);
    expect(game.helped()).toBe(false);
  });

  it('moves keyboard focus from the prediction to the calculation heading', async () => {
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;
    click(root, 'Se ven iguales');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.prediction()).toBe('equal');
    expect(document.activeElement).toBe(root.querySelector('#balls-task-title'));
    expect(fixture.componentInstance.stage()).toBe('calculate');
  });

  it('computes equal means and ranges but different variances using all six records', () => {
    const game = create().componentInstance;
    const [a, b] = game.periods();
    expect(a.values).toEqual([97, 100, 100, 100, 100, 103]);
    expect(b.values).toEqual([97, 97, 100, 100, 103, 103]);
    expect(a.values).toBe(C7_BALLS_RECORDS[0]); expect(b.values).toBe(C7_BALLS_RECORDS[1]);
    expect([a.mean, b.mean]).toEqual([100, 100]);
    expect([a.range, b.range]).toEqual([6, 6]);
    expect(a.deviations).toEqual([-3, 0, 0, 0, 0, 3]);
    expect(b.deviations).toEqual([-3, -3, 0, 0, 3, 3]);
    expect(a.squares).toEqual([9, 0, 0, 0, 0, 9]);
    expect(b.squares).toEqual([9, 9, 0, 0, 9, 9]);
    expect([a.squareSum, b.squareSum]).toEqual([18, 36]);
    expect([a.variance, b.variance]).toEqual([3, 6]);
    expect([a.zeroCount, b.zeroCount]).toEqual([4, 2]);
  });

  it('keeps both plots on a common linear scale and stacks every repeated value', () => {
    const game = create().componentInstance;
    const [a, b] = game.periods();
    expect(game.bounds()).toEqual({ min: 97, max: 103 });
    expect(game.ticks().map((tick) => game.position(tick))).toEqual([0, 50, 100]);
    expect(game.points(a).map((point) => point.x)).toEqual([0, 50, 50, 50, 50, 100]);
    expect(game.points(a).map((point) => point.bottom)).toEqual([28, 28, 48, 68, 88, 28]);
    expect(game.points(b).map((point) => point.bottom)).toEqual([28, 48, 28, 48, 28, 48]);
    expect(new Set([...game.points(a), ...game.points(b)].map((point) => point.id)).size).toBe(12);
    expect(game.plotDescription(a)).toContain('97, 100, 100, 100, 100, 103');
    expect(game.plotDescription(b)).toContain('Escala de 97 a 103');
  });

  it('uses the shared lesson identity and neutral plot points without marking the initial idea', () => {
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('.lesson-tag__number')?.textContent).toBe('Clase 7');
    expect(root.querySelectorAll('.workbench')).toHaveLength(1);
    expect(root.querySelectorAll('.comparison-plots > .period-plot')).toHaveLength(2);
    expect(root.querySelectorAll('.point--below, .point--above, .point--hint')).toHaveLength(0);
    expect(root.querySelectorAll('.period-plot[aria-current]')).toHaveLength(0);
    expect(root.querySelectorAll('.choices--prediction .btn--answer')).toHaveLength(3);
    expect(root.querySelector('.feedback-region')?.getAttribute('aria-live')).toBe('polite');
    expect(root.querySelector('.feedback-region')?.getAttribute('aria-atomic')).toBe('true');
  });

  it('marks only the period being calculated and clears that marker when reviewing the report', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    game.choosePrediction('b');
    fixture.detectChanges();
    expect(root.querySelectorAll('.period--active[aria-current="true"]')).toHaveLength(1);
    expect(root.querySelector('.period--active .period-heading strong')?.textContent).toBe(
      'Período A',
    );
    expect(root.querySelector('.task-card--calculate')).not.toBeNull();
    expect(root.querySelectorAll('.square-cell')).toHaveLength(18);
    expect(root.querySelectorAll('.variance--solved')).toHaveLength(0);
    game.answerVariance(3);
    fixture.detectChanges();
    expect(root.querySelector('.task-card--calculate')).toBeNull();
    expect(root.querySelector('.period--active .period-heading strong')?.textContent).toBe(
      'Período A',
    );
    game.continueCalculation();
    fixture.detectChanges();
    expect(root.querySelectorAll('.period--active[aria-current="true"]')).toHaveLength(1);
    expect(root.querySelector('.period--active .period-heading strong')?.textContent).toBe(
      'Período B',
    );
    expect(root.querySelectorAll('.value-track')).toHaveLength(2);
    expect(root.querySelectorAll('.variance--solved')).toHaveLength(1);
    expect(root.querySelectorAll('.square-cell')).toHaveLength(36);
    game.answerVariance(6);
    game.continueCalculation();
    fixture.detectChanges();
    expect(root.querySelector('.period--active, .period-plot[aria-current]')).toBeNull();
    expect(root.querySelectorAll('.variance--solved')).toHaveLength(2);
  });

  it('keeps each square and zero contribution attached to its record, including the larger practice squares', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    const verifySquares = () => {
      fixture.detectChanges();
      const cards = Array.from(root.querySelectorAll('.record-card'));
      expect(cards).toHaveLength(game.activePeriod().records.length);
      game.activePeriod().records.forEach((record, index) => {
        const card = cards[index];
        expect(card.querySelector('.record-deviation')?.textContent?.trim()).toBe(
          'Desviación: ' + game.signed(record.deviation),
        );
        expect(card.querySelector('.square-caption')?.textContent?.trim()).toBe(
          `${record.side} × ${record.side} = ${record.square}`,
        );
        expect(card.querySelectorAll('.square-cell')).toHaveLength(record.square);
        if (record.square === 0) {
          expect(card.querySelector('.empty-square')?.textContent).toContain('0 casillas');
          expect(card.querySelector('.square-grid')).toBeNull();
        } else {
          const grid = card.querySelector<HTMLElement>('.square-grid')!;
          expect(grid.style.gridTemplateColumns).toBe(`repeat(${record.side}, 22px)`);
          expect(grid.getAttribute('aria-label')).toContain(record.square + ' casillas');
        }
      });
    };
    game.choosePrediction('b');
    game.answerVariance(3);
    verifySquares();
    game.continueCalculation();
    game.answerVariance(6);
    verifySquares();
    game.continueCalculation();
    game.requestHint();
    game.chooseReport('spread');
    game.continueAfterHelp();
    game.choosePrediction('a');
    game.answerVariance(16);
    verifySquares();
    expect(root.querySelectorAll('.record-card .square-cell')).toHaveLength(64);
    expect(root.querySelector('.empty-square')).toBeNull();
  });

  it('keeps numeric answer labels and hint controls accessible without solving the first hint', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    game.choosePrediction('b');
    fixture.detectChanges();
    expect(root.querySelector('.choices--variance')?.getAttribute('role')).toBe('group');
    expect(root.querySelector('.choices--variance')?.getAttribute('aria-label')).toBe(
      'Opciones de varianza',
    );
    const answers = Array.from(root.querySelectorAll('.choices--variance .btn--answer'));
    expect(answers.map((button) => button.textContent?.replace(/\s+/g, ' ').trim())).toEqual(
      game.options().map((option) => option + ' (t/h)²'),
    );
    expect(root.querySelectorAll('.answer-value small')).toHaveLength(3);
    expect(root.querySelector('.hint-button')?.classList.contains('btn--secondary')).toBe(true);
    game.requestHint();
    fixture.detectChanges();
    expect(root.querySelector('.feedback-region .feedback')).not.toBeNull();
    expect(root.querySelectorAll('.square-cell')).toHaveLength(18);
    expect(root.querySelector('.totals')!.textContent).toContain('Casillas en total: 18');
    expect(root.querySelector('.calculation-card')).toBeNull();
    expect(root.querySelector('.feedback')!.textContent).not.toContain('18 ÷ 6');
    expect(root.querySelectorAll('.choices--variance .btn--answer')).toHaveLength(3);
    expect(root.querySelectorAll('.variance--solved')).toHaveLength(0);
    reachReport(game);
    fixture.detectChanges();
    expect(root.querySelectorAll('.task-card .btn--answer')).toHaveLength(3);
  });

  it('starts a calculation with visible squares and totals but no solved variance or requested help', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    game.choosePrediction('b');
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(game.stage()).toBe('calculate');
    expect(game.activePeriod().id).toBe('a');
    expect(root.textContent).toContain('Suma las casillas y divide entre todos los registros');
    const reminder = root.querySelector('.task-card')!.textContent!.replace(/\s+/g, ' ');
    expect(root.querySelector('.step-prompt')?.textContent).toContain('¿Qué varianza tiene el Período A?');
    expect(root.querySelector<HTMLDetailsElement>('.comparison-review')?.open).toBe(false);
    expect(reminder).toContain('Ese promedio es la varianza. También cuentan los registros con 0 casillas');
    expect(root.querySelectorAll('.record-card')).toHaveLength(6);
    expect(root.querySelector('.totals')!.textContent).toContain('Registros: 6');
    expect(root.querySelector('.totals')!.textContent).toContain('Casillas en total: 18');
    expect(root.querySelectorAll('.square-cell')).toHaveLength(18);
    expect(root.querySelectorAll('.empty-square')).toHaveLength(4);
    expect(root.textContent).not.toContain('18 ÷ 6');
    expect(root.querySelectorAll('.variance--solved')).toHaveLength(0);
    expect([...game.options()].sort((a, b) => a - b)).toEqual([0, 3, 18]);
    expect(game.helped()).toBe(false);
  });

  it('restores visual support on an unsolved calculation without changing saved help or solving a period', () => {
    for (const { round, activeIndex, helped, solved, sum, mean } of [
      { round: 0, activeIndex: 0, helped: false, solved: [], sum: 18, mean: 100 },
      { round: 2, activeIndex: 1, helped: true, solved: ['a'], sum: 36, mean: 104 },
    ]) {
      const fixture = create();
      fixture.componentRef.setInput('initialState', {
        stage: 'calculate', round, prediction: 'b', activeIndex, solved,
        helped, hintLevel: 0, hintFocus: null, choiceOffset: 1,
      });
      fixture.detectChanges();
      const game = fixture.componentInstance;
      const root: HTMLElement = fixture.nativeElement;
      expect(game.stage()).toBe('calculate');
      expect(game.round()).toBe(round);
      expect(game.activePeriod().mean).toBe(mean);
      expect(game.solved()).toEqual(solved);
      expect(game.helped()).toBe(helped);
      expect(game.hintLevel()).toBe(0);
      expect(game.feedback()).toBe('');
      expect(root.querySelectorAll('.square-cell')).toHaveLength(sum);
      expect(root.querySelector('.totals')!.textContent).toContain('Casillas en total: ' + sum);
      expect(root.querySelector('.period--active .variance-summary')!.textContent).toContain('por calcular');
      expect(root.querySelector('.calculation-card')).toBeNull();
      expect(root.textContent).not.toContain(sum + ' ÷ 6');
      fixture.destroy();
    }
  });

  it('ignores invalid and out-of-order actions without recording help or completion', () => {
    const game = create().componentInstance;
    const done = vi.fn();
    game.completed.subscribe(done);
    game.answerVariance(3);
    game.requestHint();
    game.continueCalculation();
    game.chooseReport('spread');
    game.continueAfterHelp();
    game.finish();
    expect(game.stage()).toBe('observe');
    expect(game.solved()).toEqual([]);
    expect(game.feedback()).toBe('');
    expect(done).not.toHaveBeenCalled();
    game.startCalculation();
    expect(game.stage()).toBe('observe');
    game.choosePrediction('b');
    game.answerVariance(-3);
    game.answerVariance(99);
    game.answerVariance(NaN);
    game.continueCalculation();
    game.chooseReport('equal');
    game.startCalculation();
    expect(game.stage()).toBe('calculate');
    expect(game.helped()).toBe(false);
    expect(game.activeIndex()).toBe(0);
    expect(game.feedback()).toBe('');
  });

  it('reveals the complete proof only after a correct answer and waits for explicit continuation', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    game.choosePrediction('b');
    game.answerVariance(3);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(game.stage()).toBe('checked');
    expect(game.activeIndex()).toBe(0);
    expect(game.solved()).toEqual(['a']);
    expect(root.querySelectorAll('.square-cell')).toHaveLength(18);
    expect(root.querySelectorAll('.empty-square')).toHaveLength(4);
    expect(root.querySelectorAll('.record-card')).toHaveLength(6);
    expect(root.querySelector('.variance--solved')?.textContent).toContain('3 (t/h)²');
    expect(root.querySelectorAll('.variance--solved')).toHaveLength(1);
    expect(root.textContent).toContain('18 ÷ 6 = 3');
    expect(root.textContent).toContain('no toneladas de material');
    expect(root.textContent).toContain('No es una distancia de 3 t/h');
    expect(game.helped()).toBe(false);
    game.answerVariance(3);
    game.requestHint();
    expect(game.solved()).toEqual(['a']);
    expect(game.helped()).toBe(false);
  });

  it('moves keyboard focus to the new task heading after answering', async () => {
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;
    const game = fixture.componentInstance;
    game.choosePrediction('b');
    fixture.detectChanges();
    click(root, '3 (t/h)²');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(root.querySelector('#balls-task-title'));
    expect(document.activeElement?.textContent).toContain('Período A: varianza 3');
  });

  it('constructs actual 3-by-3 squares and includes zero contributions in the denominator', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    game.choosePrediction('b');
    game.answerVariance(3);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const squares = root.querySelectorAll<HTMLElement>('.square-grid');
    expect(squares).toHaveLength(2);
    expect(squares[0].style.gridTemplateColumns).toBe('repeat(3, 22px)');
    expect(squares[0].querySelectorAll('.square-cell')).toHaveLength(9);
    expect(squares[0].getAttribute('aria-label')).toContain('9 casillas');
    expect(root.querySelector('.totals')?.textContent).toContain('Registros: 6');
    expect(root.textContent).toContain('También cuenta los 4 que tienen 0 casillas');
    expect(root.querySelectorAll('.data-point')).toHaveLength(12);
  });

  it('distinguishes a zero signed sum from zero variance on the same data', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    game.choosePrediction('b');
    const pair = game.pair();
    game.answerVariance(0);
    fixture.detectChanges();
    expect(game.stage()).toBe('calculate');
    expect(game.pair()).toBe(pair);
    expect(game.solved()).toEqual([]);
    expect(game.helped()).toBe(true);
    expect(game.feedback()).toContain('por debajo o por encima del promedio');
    expect(game.hintLevel()).toBe(1);
    expect(game.hintFocus()).toBe('deviations');
    expect(game.squaresVisible()).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('.square-cell')).toHaveLength(18);
    expect(fixture.nativeElement.querySelectorAll('.record--hint')).toHaveLength(2);
    game.requestHint();
    fixture.detectChanges();
    expect(game.feedback()).toContain('suman 0, aunque los datos son distintos');
    expect(game.squaresVisible()).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('.square-cell')).toHaveLength(18);
    expect(fixture.nativeElement.querySelectorAll('.variance--solved')).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it('distinguishes a square sum from its average and counts records equal to the mean', () => {
    const game = create().componentInstance;
    game.choosePrediction('b');
    const pair = game.pair();
    game.answerVariance(18);
    expect(game.stage()).toBe('calculate');
    expect(game.pair()).toBe(pair);
    expect(game.hintLevel()).toBe(1);
    expect(game.hintFocus()).toBe('count');
    expect(game.feedback()).toContain('Cuenta todas las tarjetas');
    expect(game.squaresVisible()).toBe(true);
    game.requestHint();
    expect(game.feedback()).toContain('total de casillas. Todavía falta dividir');
    expect(game.feedback()).toContain('6 registros');
    expect(game.feedback()).toContain('4 que tienen 0 casillas');
    expect(game.helped()).toBe(true);
  });

  it('offers an optional hint without replacing the current records or solving the task', () => {
    const game = create().componentInstance;
    game.choosePrediction('b');
    const period = game.activePeriod();
    game.requestHint();
    expect(game.activePeriod()).toBe(period);
    expect(game.stage()).toBe('calculate');
    expect(game.helped()).toBe(true);
    expect(game.solved()).toEqual([]);
    expect(game.feedback()).toContain('tarjetas destacadas');
    expect(game.hintShown()).toBe(false);
    expect(game.hintLevel()).toBe(1);
    expect(game.hintFocus()).toBe('deviations');
    game.continueAfterHelp();
    expect(game.round()).toBe(0);
  });

  it('shows an explained calculation only on the second hint without solving or completing the task', async () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    const done = vi.fn();
    game.completed.subscribe(done);
    game.choosePrediction('b');
    fixture.detectChanges();
    const original = game.pair();
    const options = game.options();
    click(root, 'Necesito una pista');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(game.hintLevel()).toBe(1);
    expect(game.helped()).toBe(true);
    expect(root.querySelectorAll('.record--hint')).toHaveLength(2);
    expect(root.querySelectorAll('.point--hint')).toHaveLength(2);
    expect(root.querySelector('.totals')!.textContent).toContain('Casillas en total: 18');
    expect(root.querySelector('.feedback')?.textContent).not.toContain('18 ÷ 6');
    expect(root.querySelector('.feedback')?.textContent).not.toContain('3 (t/h)²');
    expect(document.activeElement).toBe(root.querySelector('.feedback'));
    click(root, 'Ver el cálculo explicado');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(game.hintLevel()).toBe(2);
    expect(game.hintShown()).toBe(true);
    expect(root.querySelectorAll('.square-cell')).toHaveLength(18);
    expect(root.querySelector('.feedback')?.textContent).toContain('18 ÷ 6 = 3 (t/h)²');
    expect(root.querySelector('.hint-button')).toBeNull();
    expect(document.activeElement).toBe(root.querySelector('.feedback'));
    expect(game.stage()).toBe('calculate');
    expect(game.solved()).toEqual([]);
    expect(game.pair()).toBe(original);
    expect(game.options()).toBe(options);
    game.finish();
    expect(done).not.toHaveBeenCalled();
    game.requestHint();
    game.requestHint();
    expect(game.hintLevel()).toBe(2);
    expect(game.options()).toBe(options);
  });

  it('highlights every denominator record, including zero contributions, without solving the first hint', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    game.choosePrediction('b');
    game.answerVariance(18);
    fixture.detectChanges();
    expect(root.querySelectorAll('.record--hint')).toHaveLength(6);
    expect(root.querySelectorAll('.point--hint')).toHaveLength(6);
    expect(
      [...root.querySelectorAll('.hint-marker')].filter(
        (marker) => marker.textContent === 'También cuenta',
      ),
    ).toHaveLength(4);
    expect(root.querySelector('.totals')!.textContent).toContain('Registros: 6');
    expect(root.querySelectorAll('.square-cell')).toHaveLength(18);
    expect(root.querySelector('.feedback')?.textContent).not.toContain('18');
    expect(game.solved()).toEqual([]);
    expect(game.hintLevel()).toBe(1);
    game.answerVariance(0);
    fixture.detectChanges();
    expect(game.hintLevel()).toBe(2);
    expect(game.hintFocus()).toBe('deviations');
    expect(root.querySelector('.feedback')?.textContent).toContain('18 ÷ 6 = 3');
    expect(game.solved()).toEqual([]);
  });

  it('resets the hint ladder for B and the report while preserving the need for fresh independent practice', () => {
    const game = create().componentInstance;
    game.choosePrediction('b');
    game.requestHint();
    game.requestHint();
    game.answerVariance(3);
    expect(game.hintLevel()).toBe(0);
    expect(game.hintFocus()).toBeNull();
    game.continueCalculation();
    expect(game.helped()).toBe(true);
    expect(game.hintLevel()).toBe(0);
    expect(game.hintShown()).toBe(false);
    game.requestHint();
    expect(game.hintLevel()).toBe(1);
    expect(game.squaresVisible()).toBe(true);
    game.answerVariance(6);
    game.continueCalculation();
    expect(game.stage()).toBe('report');
    expect(game.hintLevel()).toBe(0);
    game.chooseReport('spread');
    expect(game.stage()).toBe('review');
    game.continueAfterHelp();
    expect(game.round()).toBe(1);
    expect(game.helped()).toBe(false);
    expect(game.hintLevel()).toBe(0);
    expect(game.hintFocus()).toBeNull();
    expect(game.solved()).toEqual([]);
    expect(game.periods()[0].variance).toBe(16);
  });

  it('offers a first report hint that highlights both variances and a second explanation without selecting a conclusion', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    reachReport(game);
    fixture.detectChanges();
    const choices = game.reportChoices();
    click(root, 'Necesito una pista');
    fixture.detectChanges();
    expect(game.hintLevel()).toBe(1);
    expect(root.querySelectorAll('.variance--hint')).toHaveLength(2);
    expect(root.querySelector('.feedback')?.textContent).not.toContain('Período B');
    expect(game.stage()).toBe('report');
    expect(game.reportChoices()).toBe(choices);
    click(root, 'Ver una explicación');
    fixture.detectChanges();
    expect(root.querySelector('.feedback')?.textContent).toContain('Período B varió más');
    expect(root.querySelector('.hint-button')).toBeNull();
    expect(game.stage()).toBe('report');
    expect(game.solved()).toEqual(['a', 'b']);
    game.chooseReport('spread');
    expect(game.stage()).toBe('review');
  });

  it('uses a context cue rather than a variance cue when the learner equates stability with a better operation', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    reachReport(game);
    game.chooseReport('better');
    fixture.detectChanges();
    expect(root.querySelector('.context-hint')?.textContent).toContain(
      'Todavía no sabemos qué meta debe cumplir el equipo',
    );
    expect(root.querySelector('.variance--hint')).toBeNull();
    expect(game.hintFocus()).toBe('context');
    expect(game.hintLevel()).toBe(1);
    game.requestHint();
    fixture.detectChanges();
    expect(root.querySelector('.context-hint')).toBeNull();
    expect(root.querySelector('.feedback')?.textContent).toContain(
      'Variar menos no significa trabajar mejor',
    );
    expect(game.stage()).toBe('report');
  });

  it.each([0, 0.4, 0.8])(
    'chooses a stable answer order at creation for random seed %s and keeps all three balanced conclusions',
    (seed) => {
      const random = vi.spyOn(Math, 'random').mockReturnValue(seed);
      const fixture = create();
      const game = fixture.componentInstance;
      try {
        game.choosePrediction('b');
        const options = [...game.options()];
        const offset = Math.floor(seed * 3);
        expect(options.indexOf(3)).toBe((1 - offset + 3) % 3);
        game.answerVariance(0);
        game.requestHint();
        expect(game.options()).toEqual(options);
        reachReport(game);
        const choices = [...game.reportChoices()];
        expect(choices.findIndex((choice) => choice.id === 'spread')).toBe((2 - offset + 3) % 3);
        expect(new Set(choices.map((choice) => choice.id)).size).toBe(3);
        for (const choice of choices) expect(choice.text.length).toBeLessThanOrEqual(65);
        expect(
          Math.max(...choices.map((choice) => choice.text.length)) -
            Math.min(...choices.map((choice) => choice.text.length)),
        ).toBeLessThan(20);
        game.chooseReport('equal');
        game.requestHint();
        expect(game.reportChoices()).toEqual(choices);
        game.chooseReport('spread');
        game.continueAfterHelp();
        reachReport(game);
        expect(game.reportChoices().findIndex((choice) => choice.id === 'spread')).toBe(
          (1 - offset + 3) % 3,
        );
        expect(game.reportChoices().find((choice) => choice.id === 'spread')?.text).toContain(
          'El período A varió más',
        );
      } finally {
        fixture.destroy();
        random.mockRestore();
      }
    },
  );

  it('starts B with its own squares but no solved variance and retains the checked A result', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    game.choosePrediction('b');
    game.answerVariance(3);
    game.continueCalculation();
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(game.activePeriod().id).toBe('b');
    expect(game.stage()).toBe('calculate');
    expect([...game.options()].sort((a, b) => a - b)).toEqual([0, 6, 36]);
    expect(root.querySelectorAll('.square-cell')).toHaveLength(36);
    expect(root.querySelector('.totals')!.textContent).toContain('Casillas en total: 36');
    expect(root.textContent).not.toContain('36 ÷ 6');
    expect(root.querySelectorAll('.record-card')).toHaveLength(6);
    expect(root.querySelectorAll('.variance--solved')).toHaveLength(1);
    expect(root.querySelector('.variance--solved')?.textContent).toContain('3 (t/h)²');
    game.answerVariance(36);
    expect(game.feedback()).toContain('Cuenta todas las tarjetas');
    game.requestHint();
    expect(game.feedback()).toContain('2 que tienen 0 casillas');
    game.answerVariance(6);
    fixture.detectChanges();
    expect(root.querySelectorAll('.square-cell')).toHaveLength(36);
    expect(root.querySelectorAll('.empty-square')).toHaveLength(2);
    expect(root.textContent).toContain('36 ÷ 6 = 6');
  });

  it('does not treat a corrected A result as independent evidence or inherit its visible hint into B', () => {
    const game = create().componentInstance;
    game.choosePrediction('b');
    game.requestHint();
    game.answerVariance(3);
    game.continueCalculation();
    expect(game.helped()).toBe(true);
    expect(game.hintShown()).toBe(false);
    expect(game.feedback()).toBe('');
    expect(game.squaresVisible()).toBe(true);
    game.answerVariance(6);
    game.continueCalculation();
    game.chooseReport('spread');
    expect(game.stage()).toBe('review');
  });

  it('requires both checked calculations before evaluating the report', () => {
    const game = create().componentInstance;
    game.choosePrediction('b');
    game.chooseReport('spread');
    expect(game.stage()).toBe('calculate');
    expect(game.solved()).toEqual([]);
    game.answerVariance(3);
    game.chooseReport('spread');
    expect(game.stage()).toBe('checked');
    game.continueCalculation();
    game.chooseReport('spread');
    expect(game.stage()).toBe('calculate');
    game.answerVariance(6);
    game.continueCalculation();
    expect(game.stage()).toBe('report');
    expect(game.solved()).toEqual(['a', 'b']);
  });

  it.each(['a', 'b', 'equal'] as const)(
    'revisits prediction %s in the report without treating the initial idea as a graded answer',
    (answer) => {
      const fixture = create();
      const game = fixture.componentInstance;
      const root: HTMLElement = fixture.nativeElement;
      const done = vi.fn();
      game.completed.subscribe(done);
      game.choosePrediction(answer);
      reachReport(game);
      fixture.detectChanges();
      expect(root.textContent).toContain('Tu idea inicial: ' + game.predictionText());
      expect(root.textContent).toContain('¿Qué aviso explica lo que muestran los datos?');
      expect(game.helped()).toBe(false);
      expect(game.feedback()).toBe('');
      expect(game.prediction()).toBe(answer);
      game.choosePrediction(answer === 'a' ? 'b' : 'a');
      expect(game.prediction()).toBe(answer);
      expect(game.stage()).toBe('report');
      expect(game.reportChoices().find((choice) => choice.id === 'spread')?.text).toBe(
        'El período B varió más: hay más puntos lejos del promedio.',
      );
      game.chooseReport('spread');
      game.finish();
      game.finish();
      expect(game.stage()).toBe('success');
      expect(done).toHaveBeenCalledTimes(1);
    },
  );

  it('rejects the draft that infers equal dispersion from equal means and ranges', () => {
    const game = create().componentInstance;
    reachReport(game);
    const pair = game.pair();
    game.chooseReport('equal');
    expect(game.stage()).toBe('report');
    expect(game.feedback()).toContain('dos varianzas destacadas');
    expect(game.hintLevel()).toBe(1);
    expect(game.hintFocus()).toBe('variances');
    game.requestHint();
    expect(game.feedback()).toContain('varianza fue 6 frente a 3');
    expect(game.feedback()).toContain('más registros lejos del promedio');
    expect(game.pair()).toBe(pair);
    expect(game.helped()).toBe(true);
  });

  it('rejects an unsupported best-operation claim rather than equating low variance with quality', () => {
    const game = create().componentInstance;
    reachReport(game);
    game.chooseReport('better');
    expect(game.stage()).toBe('report');
    expect(game.feedback()).toContain('falta la meta del equipo');
    expect(game.hintLevel()).toBe(1);
    expect(game.hintFocus()).toBe('context');
    game.requestHint();
    expect(game.feedback()).toContain('Variar menos no significa trabajar mejor');
    expect(game.feedback()).toContain(
      'Falta saber qué meta debe cumplir el equipo y en qué condiciones trabaja',
    );
    game.chooseReport('invalid' as 'spread');
    expect(game.stage()).toBe('report');
    game.chooseReport('spread');
    expect(game.stage()).toBe('review');
  });

  it('reaches success after two independent calculations and an evidence-based conclusion', () => {
    const game = create().componentInstance;
    reachReport(game);
    expect(game.helped()).toBe(false);
    expect(game.higherPeriod().id).toBe('b');
    expect(game.reportChoices().find((choice) => choice.id === 'spread')?.text).toBe(
      'El período B varió más: hay más puntos lejos del promedio.',
    );
    game.chooseReport('spread');
    expect(game.stage()).toBe('success');
  });

  it('offers fresh practice only after a supported report has been understood', () => {
    const game = create().componentInstance;
    game.choosePrediction('b');
    game.answerVariance(0);
    const supported = game.pair();
    game.continueAfterHelp();
    expect(game.pair()).toBe(supported);
    reachReport(game);
    game.chooseReport('spread');
    expect(game.stage()).toBe('review');
    expect(game.pair()).toBe(supported);
    game.continueAfterHelp();
    expect(game.stage()).toBe('observe');
    expect(game.round()).toBe(1);
    expect(game.prediction()).toBeNull();
    expect(game.predictionText()).toBe('');
    expect(game.periods()[0].values).toEqual([96, 96, 104, 104]);
    expect(game.periods()[1].values).toEqual([96, 100, 100, 104]);
    expect(game.higherPeriod().id).toBe('a');
    expect(game.solved()).toEqual([]);
    expect(game.helped()).toBe(false);
    expect(game.hintShown()).toBe(false);
    expect(game.feedback()).toBe('');
  });

  it('keeps old practice drafts accurate without demanding any further rounds', () => {
    const means = [100, 104, 104];
    const variances = [
      [16, 8],
      [3, 6],
      [4, 2],
    ];
    const higher = ['a', 'b', 'a'];
    for (let round = 0; round < 9; round += 1) {
      const fixture = create();
      fixture.componentRef.setInput('initialState', {
        stage: 'observe', round: round + 1, prediction: null, activeIndex: 0,
        solved: [], helped: false, hintLevel: 0, hintFocus: null, choiceOffset: 0,
      });
      fixture.detectChanges();
      const game = fixture.componentInstance;
      const periods = game.periods();
      expect(periods.map((period) => period.mean)).toEqual([means[round % 3], means[round % 3]]);
      expect(periods.map((period) => period.variance)).toEqual(variances[round % 3]);
      expect(periods[0].range).toBe(periods[1].range);
      expect(periods[0].values.length).toBe(periods[1].values.length);
      expect(game.higherPeriod().id).toBe(higher[round % 3]);
      for (const period of periods) {
        expect(game.points(period).map((point) => point.x)).toEqual(
          period.values.map((value) => game.position(value)),
        );
        expect(game.plotDescription(period)).toContain('Promedio ' + means[round % 3]);
        expect(period.squareSum / period.values.length).toBe(period.variance);
      }
      expect(new Set(game.options()).size).toBe(3);
      game.choosePrediction('b');
      game.requestHint();
      reachReport(game);
      game.chooseReport('spread');
      expect(game.stage()).toBe('success');
      expect(game.guidedCompletion()).toBe(true);
      game.continueAfterHelp();
      expect(game.round()).toBe(round + 1);
      expect(game.originalPeriods.map((period) => period.variance)).toEqual([3, 6]);
      fixture.destroy();
    }
  });

  it('recognizes an unassisted practice conclusion, including when A is more dispersed', () => {
    const game = create().componentInstance;
    game.choosePrediction('b');
    game.requestHint();
    reachReport(game);
    game.chooseReport('spread');
    game.continueAfterHelp();
    reachReport(game);
    expect(game.higherPeriod().id).toBe('a');
    expect(game.reportChoices().find((choice) => choice.id === 'spread')?.text).toBe(
      'El período A varió más: hay más puntos lejos del promedio.',
    );
    expect(game.helped()).toBe(false);
    game.chooseReport('spread');
    expect(game.stage()).toBe('success');
    expect(game.guidedCompletion()).toBe(false);
  });

  it.each(['calculate', 'report'] as const)('ends with honest guided feedback after help in practice %s', helpStage => {
    const fixture = create();
    const game = fixture.componentInstance;
    const done = vi.fn();
    game.completed.subscribe(done);
    game.choosePrediction('b');
    game.requestHint();
    reachReport(game);
    game.chooseReport('spread');
    game.finish();
    expect(game.stage()).toBe('review');
    expect(done).not.toHaveBeenCalled();
    game.continueAfterHelp();
    expect(game.round()).toBe(1);
    game.choosePrediction('a');
    if (helpStage === 'calculate') {
      game.answerVariance(0);
      game.requestHint();
      game.continueAfterHelp();
      game.finish();
      expect(game.stage()).toBe('calculate');
      expect(game.solved()).toEqual([]);
      expect(done).not.toHaveBeenCalled();
    }
    reachReport(game);
    if (helpStage === 'report') {
      game.chooseReport('better');
      game.requestHint();
    }
    game.finish();
    expect(done).not.toHaveBeenCalled();
    game.chooseReport('spread');
    fixture.detectChanges();
    expect(game.stage()).toBe('success');
    expect(game.round()).toBe(1);
    expect(game.helped()).toBe(true);
    expect(game.guidedCompletion()).toBe(true);
    expect(game.solved()).toEqual(['a', 'b']);
    expect(fixture.nativeElement.querySelector('.completion-card').textContent).toContain('Completaste con ayuda');
    expect(fixture.nativeElement.querySelector('.completion-card').textContent).not.toContain('sin pistas');
    expect(game.originalPeriods.map(period => period.variance)).toEqual([3, 6]);
    game.continueAfterHelp();
    expect(game.stage()).toBe('success');
    expect(game.round()).toBe(1);
    game.finish(); game.finish();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('does not invent zero-contribution observations when all practice values differ from the mean', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    game.choosePrediction('b');
    game.requestHint();
    reachReport(game);
    game.chooseReport('spread');
    game.continueAfterHelp();
    game.choosePrediction('a');
    game.answerVariance(16);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(game.activePeriod().zeroCount).toBe(0);
    expect(root.querySelectorAll('.empty-square')).toHaveLength(0);
    expect(root.querySelectorAll('.square-cell')).toHaveLength(64);
    expect(root.textContent).toContain('Suma las casillas y divide entre los 4 registros.');
    expect(root.textContent).not.toContain('también los 0');
  });

  it('restores the original 3-and-6 evidence in the final report after practice with another mean', () => {
    const fixture = create();
    fixture.componentRef.setInput('initialState', {
      stage: 'observe', round: 2, prediction: null, activeIndex: 0,
      solved: [], helped: false, hintLevel: 0, hintFocus: null, choiceOffset: 0,
    });
    fixture.detectChanges();
    const game = fixture.componentInstance;
    game.choosePrediction('a');
    game.requestHint();
    expect(game.periods()[0].mean).toBe(104);
    reachReport(game);
    game.chooseReport('spread');
    fixture.detectChanges();
    const report = fixture.nativeElement.querySelector('.report-card') as HTMLElement;
    expect(game.periods().map((period) => period.mean)).toEqual([100, 100]);
    expect(game.periods().map((period) => period.variance)).toEqual([3, 6]);
    expect(report.textContent).toContain('97, 100, 100, 100, 100, 103');
    expect(report.textContent).toContain('18 ÷ 6 = 3 (t/h)²');
    expect(report.textContent).toContain('36 ÷ 6 = 6 (t/h)²');
    expect(report.textContent).toContain('En B, cuatro datos estuvieron a 3 t/h del promedio; en A, solo dos');
    expect(report.textContent).toContain('no explica por qué cambió ni qué ajuste hacer');
    expect(report.textContent).toContain('Variar menos no significa trabajar mejor');
    expect(report.textContent).not.toContain('104');
  });

  it('emits completion only once and only after the checked calculations and report', () => {
    const game = create().componentInstance;
    const done = vi.fn();
    game.completed.subscribe(done);
    game.choosePrediction('b');
    game.requestHint();
    reachReport(game);
    game.finish();
    expect(done).not.toHaveBeenCalled();
    game.chooseReport('spread');
    game.finish();
    expect(done).not.toHaveBeenCalled();
    game.continueAfterHelp();
    reachReport(game);
    game.chooseReport('spread');
    game.finish();
    game.finish();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('completes the entire lesson using only rendered buttons', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    const done = vi.fn();
    game.completed.subscribe(done);
    const labels = [
      'Período B',
      '3 (t/h)²',
      'Calcular el período B →',
      '6 (t/h)²',
      'Revisar el informe →',
    ];
    for (const label of labels) {
      click(root, label);
      fixture.detectChanges();
    }
    click(root, game.reportChoices().find((choice) => choice.id === 'spread')!.text);
    fixture.detectChanges();
    click(root, 'Entregar el informe corregido →');
    fixture.detectChanges();
    expect(done).toHaveBeenCalledTimes(1);
    expect(game.stage()).toBe('success');
    expect(root.querySelector('input, textarea, form, select')).toBeNull();
  });

  it('renders the help-recovery path with a fresh prediction and no retained solved results', async () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    click(root, 'Período B');
    fixture.detectChanges();
    click(root, 'Necesito una pista');
    fixture.detectChanges();
    expect(root.textContent).toContain('Primera pista');
    expect(root.querySelectorAll('.data-point')).toHaveLength(12);
    reachReport(game);
    game.chooseReport('spread');
    fixture.detectChanges();
    click(root, 'Probar otros registros →');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.textContent).toContain('Práctica: otros datos');
    expect(root.querySelectorAll('.data-point')).toHaveLength(8);
    expect(root.querySelectorAll('.variance--solved')).toHaveLength(0);
    expect(root.querySelectorAll('.square-cell')).toHaveLength(0);
    expect(root.querySelectorAll('.record-card')).toHaveLength(0);
    expect(game.stage()).toBe('observe');
    expect(game.prediction()).toBeNull();
    expect(document.activeElement).toBe(root.querySelector('#balls-task-title'));
    expect(document.activeElement?.textContent).toContain(
      '¿En qué período ves más datos lejos del promedio?',
    );
    expect(root.textContent).not.toContain('Tu idea inicial:');
    click(root, 'Período A');
    fixture.detectChanges();
    expect(root.querySelectorAll('.record-card')).toHaveLength(4);
    expect(root.querySelectorAll('.square-cell')).toHaveLength(64);
    expect(root.textContent).toContain('Una última práctica');
    expect(root.textContent).not.toContain('sin la pista');
    expect(game.prediction()).toBe('a');
    expect(game.helped()).toBe(false);
    expect(root.textContent).not.toContain('Primera pista');
    reachReport(game);
    fixture.detectChanges();
    expect(root.textContent).toContain('Tu idea inicial: Período A');
    expect(root.textContent).not.toContain('Tu idea inicial: Período B');
    expect(game.reportChoices().find((choice) => choice.id === 'spread')?.text).toBe(
      'El período A varió más: hay más puntos lejos del promedio.',
    );
  });

  it('starts a replay without retained hints, answers, completion or practice data', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    reachReport(game);
    game.chooseReport('spread');
    game.finish();
    fixture.destroy();
    const replay = create().componentInstance;
    expect(replay.stage()).toBe('observe');
    expect(replay.round()).toBe(0);
    expect(replay.activeIndex()).toBe(0);
    expect(replay.solved()).toEqual([]);
    expect(replay.helped()).toBe(false);
    expect(replay.hintShown()).toBe(false);
    expect(replay.hintLevel()).toBe(0);
    expect(replay.hintFocus()).toBeNull();
    expect(replay.feedback()).toBe('');
    expect(replay.periods().map((period) => period.variance)).toEqual([3, 6]);
    expect(replay.prediction()).toBeNull();
    expect(replay.predictionText()).toBe('');
    expect(replay.signed(-3)).toBe('−3');
    expect(replay.signed(3)).toBe('+3');
    expect(replay.signed(0)).toBe('0');
  });
});
