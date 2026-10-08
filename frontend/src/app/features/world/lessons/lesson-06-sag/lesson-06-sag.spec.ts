import { TestBed } from '@angular/core/testing';
import { Lesson06Sag } from './lesson-06-sag';

describe('Lesson06Sag', () => {
  function create() {
    const fixture = TestBed.createComponent(Lesson06Sag);
    fixture.detectChanges();
    return fixture;
  }

  function createPractice(round: number, choiceOffset = 0) {
    const fixture = create();
    fixture.componentRef.setInput('initialState', {
      stage: 'practice-square',
      squaresFormed: true,
      round,
      practiceHelped: false,
      practiceVarianceAnswered: false,
      choiceOffset,
    });
    fixture.detectChanges();
    return fixture;
  }

  function reachDiscovery(game: Lesson06Sag): void {
    game.sumChanges();
    game.chooseCancellation('balanced');
    game.formSquares();
    game.answerSquare(4);
    game.chooseWeight('four');
  }

  function reachPractice(game: Lesson06Sag): void {
    reachDiscovery(game);
    game.startPractice();
  }

  function solvePractice(game: Lesson06Sag): void {
    game.answerPracticeSquare(game.practiceSquare());

    game.answerPracticeVariance(game.variance());
    game.continuePractice();
  }

  function click(root: HTMLElement, label: string): void {
    const button = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.replace(/\s+/g, ' ').trim() === label,
    );
    expect(button, 'Button: ' + label).toBeDefined();
    button!.click();
  }

  it('starts with a purpose, all four records and the given mean, without written answers', () => {
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.textContent).toContain(
      'ayudar al siguiente turno a entender las diferencias entre los datos del molino',
    );
    expect(root.textContent).toContain('Promedio: 100 t/h');
    expect(root.textContent).toContain('no una meta de producción');
    expect(root.querySelector('.workbench')!.textContent).not.toMatch(/varianza/i);
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
    expect(game.points().map((point) => point.square)).toEqual([4, 0, 0, 4]);
    expect(game.squareSum()).toBe(8);
    expect(game.variance()).toBe(2);
  });

  it('zooms one record without replacing the full records or excluding zeros', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    game.sumChanges();
    game.chooseCancellation('balanced');
    fixture.detectChanges();
    expect(root.querySelector('.record-focus')).toBeNull();
    game.formSquares();
    fixture.detectChanges();
    expect(root.querySelector('.workbench > .record-focus')).not.toBeNull();
    expect(
      Array.from(root.querySelectorAll('.focus-reading dd'), (value) => value.textContent?.trim()),
    ).toEqual(['98 t/h', '100 t/h', '−2 t/h']);
    expect(root.querySelector('.focus-square')?.getAttribute('aria-label')).toBe(
      '2 filas de 2 casillas',
    );
    expect(root.querySelectorAll('.focus-cell')).toHaveLength(4);
    expect(root.querySelectorAll('.point--focus')).toHaveLength(1);
    expect(root.querySelectorAll('.record--focus')).toHaveLength(1);
    expect(root.querySelectorAll('.record-card')).toHaveLength(4);
    expect(root.querySelectorAll('.record-card .square-cell')).toHaveLength(8);
    expect(root.querySelectorAll('.record-card .empty-square')).toHaveLength(2);
    expect(root.querySelector('.totals')?.textContent).toContain('Registros: 4');
    expect(root.querySelector('.record--focus .record-separation')?.textContent).toBe(
      'Separación: 2',
    );
  });

  it('keeps practice zoom unsolved when recovering any existing practice round', () => {
    for (let round = 0; round < 3; round += 1) {
      const fixture = createPractice(round);
      const game = fixture.componentInstance;
      const root: HTMLElement = fixture.nativeElement;
      fixture.detectChanges();
      expect(
        Array.from(root.querySelectorAll('.focus-reading dd'), (value) =>
          value.textContent?.trim(),
        ),
      ).toEqual([
        game.records()[0] + ' t/h',
        game.mean() + ' t/h',
        game.signed(game.deviations()[0]) + ' t/h',
      ]);
      expect(root.querySelector('.focus-caption')?.textContent).toContain(
        'Separación: ' + Math.abs(game.deviations()[0]),
      );
      expect(root.querySelector('.focus-caption')?.textContent).toContain(
        'Multiplica esa separación por sí misma',
      );
      expect(root.querySelectorAll('.record-card')).toHaveLength(4);
      expect(
        root.querySelectorAll('.focus-cell, .square-cell, .square-caption, .comparison-box b'),
      ).toHaveLength(0);
      expect(root.textContent).not.toContain('÷');
      expect(root.querySelectorAll('.point--focus, .record--focus')).toHaveLength(2);
      game.answerPracticeSquare(-game.practiceSquare());
      solvePractice(game);
      game.continueAfterHelp();
      fixture.destroy();
    }
  });

  it('keeps optional reading help closed and gives each stage one primary demonstration', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    const notes = root.querySelector<HTMLDetailsElement>('.workbench > .reading-notes')!;
    expect(notes.open).toBe(false);
    expect(notes.querySelector('summary')?.textContent).toBe('Cómo leer los registros');
    expect(notes.textContent).toContain('Los puntos uno sobre otro tienen el mismo valor');
    expect(root.querySelectorAll('.primary-evidence')).toHaveLength(0);
    const steps = [
      () => game.sumChanges(),
      () => {
        game.chooseCancellation('balanced');
        game.formSquares();
      },
      () => game.answerSquare(4),
      () => game.chooseWeight('four'),
    ];
    for (const next of steps) {
      next();
      fixture.detectChanges();
      expect(root.querySelectorAll('.workbench > .primary-evidence')).toHaveLength(1);
      expect(root.querySelector('.task-card .primary-evidence')).toBeNull();
      expect(root.querySelector('.workbench > .data-board') !== null).toBe(game.showMainRecords());
      if (!game.showMainRecords()) {
        expect(root.querySelector<HTMLDetailsElement>('.records-review')?.open).toBe(false);
        expect(root.querySelector('.records-review .data-board')).not.toBeNull();
      }
      expect(notes.open).toBe(false);
    }
  });

  it('uses the shared lesson identity and neutral points on both sides of the mean', () => {
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('.lesson-tag__number')?.textContent).toBe('Clase 6');
    expect(root.querySelectorAll('.workbench')).toHaveLength(1);
    expect(root.querySelectorAll('.workbench > .data-board')).toHaveLength(1);
    expect(root.querySelectorAll('.workbench > .task-card')).toHaveLength(1);
    expect(root.querySelectorAll('.point--below, .point--above')).toHaveLength(0);
    expect(root.querySelector('.value-track')?.getAttribute('aria-label')).toBe(
      fixture.componentInstance.plotDescription(),
    );
    expect(root.querySelector('.axis-label')?.textContent).toContain('Escala cercana: 98 a 102');
    expect(root.querySelector('.step--active')?.getAttribute('aria-current')).toBe('step');
  });

  it('keeps every original square attached to its signed difference, including both zeros', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    reachDiscovery(game);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const cards = Array.from(root.querySelectorAll('.record-card'));
    expect(cards).toHaveLength(4);
    game.points().forEach((point, index) => {
      const card = cards[index];
      expect(card.querySelector('.record-deviation')?.textContent?.trim()).toBe(
        'Desviación: ' + game.signed(point.deviation),
      );
      expect(card.querySelector('.square-caption')?.textContent?.trim()).toBe(
        `${point.side} × ${point.side} = ${point.square}`,
      );
      expect(card.querySelectorAll('.square-cell')).toHaveLength(point.square);
      if (point.square === 0) {
        expect(card.querySelector('.empty-square')?.textContent).toContain('0 casillas');
      } else {
        expect(card.querySelector('.square-grid')?.getAttribute('aria-label')).toContain(
          game.cellCount(point.square),
        );
      }
    });
  });

  it('uses shared answer controls without exposing the practice square or quotient early', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    const verifyAnswers = () => {
      const answers = Array.from(root.querySelectorAll('.answer-choice'));
      expect(answers.length).toBeGreaterThan(0);
      expect(answers.every((answer) => answer.classList.contains('btn--answer'))).toBe(true);
    };
    game.sumChanges();
    fixture.detectChanges();
    verifyAnswers();
    reachDiscovery(game);
    game.startPractice();
    fixture.detectChanges();
    verifyAnswers();
    expect(root.querySelectorAll('.choices--square button')).toHaveLength(3);
    expect(root.querySelector('.square-grid, .square-caption, .comparison-box b')).toBeNull();
    game.answerPracticeSquare(game.practiceSquare());
    fixture.detectChanges();
    verifyAnswers();
    expect(root.querySelector('.comparison-box b')).toBeNull();

    fixture.detectChanges();
    verifyAnswers();
    expect(root.querySelectorAll('.variance-choices button')).toHaveLength(3);
    expect(root.querySelector('.comparison-box b')).toBeNull();
    expect(root.textContent).not.toContain('÷');
  });

  it('uses a labelled close-up linear scale and stacks rather than hiding equal values', () => {
    const game = create().componentInstance;
    expect(game.ticks.map((tick) => game.position(tick))).toEqual([0, 25, 50, 75, 100]);
    expect(game.points().map((point) => point.x)).toEqual([0, 50, 50, 100]);
    expect(game.points().map((point) => point.bottom)).toEqual([28, 28, 48, 28]);
    expect(new Set(game.points().map((point) => point.id)).size).toBe(4);
    expect(game.plotDescription()).toContain('98, 100, 100, 102');
    expect(game.plotDescription()).toContain('Promedio 100');
    expect(game.plotDescription()).toContain('Escala de 98 a 102');
  });

  it('ignores invalid and out-of-order actions without completing or changing data', () => {
    const game = create().componentInstance;
    const done = vi.fn();
    game.completed.subscribe(done);
    game.chooseCancellation('balanced');
    game.formSquares();
    game.answerSquare(4);
    game.chooseWeight('four');

    game.startPractice();
    game.answerPracticeSquare(1);

    game.answerPracticeVariance(1);
    game.continuePractice();
    game.continueAfterHelp();
    game.finish();
    expect(game.stage()).toBe('observe');
    expect(game.feedback()).toBe('');
    expect(game.records()).toEqual([98, 100, 100, 102]);
    expect(done).not.toHaveBeenCalled();
    game.sumChanges();
    game.chooseCancellation('invalid' as 'balanced');
    expect(game.stage()).toBe('cancel');
    expect(game.feedback()).toBe('');
    game.chooseCancellation('balanced');
    game.answerSquare(4);
    game.formSquares();
    game.answerSquare(NaN);
    expect(game.stage()).toBe('squares');
    expect(game.feedback()).toBe('');
    game.answerSquare(4);
    game.chooseWeight('invalid' as 'four');
    expect(game.stage()).toBe('weight');
    game.chooseWeight('four');
  });

  it('shows cancellation without deleting the values and explains mistakes on the same example', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    game.sumChanges();
    fixture.detectChanges();
    const original = game.records();
    expect(fixture.nativeElement.textContent).toContain('−2 + 0 + 0 + 2 = 0');
    expect(fixture.nativeElement.querySelectorAll('.data-point')).toHaveLength(4);
    game.chooseCancellation('constant');
    fixture.detectChanges();
    expect(game.feedback()).toContain('hay 98 y 102');
    expect(game.stage()).toBe('cancel');
    expect(game.records()).toBe(original);
    game.chooseCancellation('missing');
    expect(game.feedback()).toContain('Tenemos los cuatro registros');
    expect(game.records()).toBe(original);
    game.chooseCancellation('balanced');
    expect(game.stage()).toBe('squares');
    expect(game.feedback()).toBe('');
    expect(game.practiceHelped()).toBe(false);
  });

  it('accepts unsigned distances as another measure rather than claiming squares are the only solution', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    game.sumChanges();
    game.chooseCancellation('balanced');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'También podríamos sumar las distancias sin signo',
    );
    expect(fixture.nativeElement.textContent).toContain('Sería otra medida');
    expect(fixture.nativeElement.querySelectorAll('.square-cell')).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('.workbench').textContent).toMatch(/varianza/i);
  });

  it('explains the purpose of squaring in visible instructions before drawing any squares', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    game.sumChanges();
    game.chooseCancellation('balanced');
    fixture.detectChanges();
    const task = root.querySelector('.task-card')!;
    const instructions = Array.from(task.querySelectorAll(':scope > p'), (paragraph) =>
      paragraph.textContent!.replace(/\s+/g, ' ').trim(),
    ).join(' ');
    expect(root.querySelector('#sag-task-title')?.textContent).toBe('¿Por qué usamos cuadrados?');
    expect(instructions).toContain('−2 y +2 se compensaron');
    expect(instructions).toContain('98 y 102 sí son distintos');
    expect(instructions).toContain('multiplicamos cada diferencia por sí misma');
    expect(instructions).toContain('Eso se llama elevar al cuadrado');
    expect(instructions).toContain('no una superficie del molino');
    expect(task.querySelector<HTMLDetailsElement>('details')?.open).toBe(false);
    expect(task.querySelector('summary')?.textContent).toBe(
      '¿Es la única forma de resumir las diferencias?',
    );
    expect(root.querySelectorAll('.square-cell, .focus-cell')).toHaveLength(0);
    expect(root.querySelectorAll('.record-card')).toHaveLength(4);
    expect(game.squaresFormed()).toBe(false);
    expect(game.variance()).toBe(2);
    expect(task.querySelector('.btn--primary')?.textContent?.trim()).toBe(
      'Ver la multiplicación con casillas →',
    );
  });

  it('connects the same signed differences to equal positive squares before comparing their size', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    game.sumChanges();
    game.chooseCancellation('balanced');
    game.formSquares();
    fixture.detectChanges();
    const explanation = root.querySelector('.task-card')!.textContent!.replace(/\s+/g, ' ');
    expect(explanation).toContain('(−2) × (−2) = 4');
    expect(explanation).toContain('2 × 2 = 4');
    expect(explanation).toContain('aporta lo mismo si la separación es igual');
    expect(root.querySelectorAll('.focus-cell')).toHaveLength(4);
    game.answerSquare(4);
    fixture.detectChanges();
    expect(root.querySelector('.task-kicker')?.textContent).toBe(
      'Las separaciones grandes cuentan más',
    );
    expect(root.querySelector('.task-card')?.textContent).toContain(
      'Una separación de 1 aporta 1 casilla; una de 2 aporta 4',
    );
    expect(game.stage()).toBe('weight');
  });

  it('constructs two 2-by-2 squares and retains both zero-contribution observations', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    game.sumChanges();
    game.chooseCancellation('balanced');
    game.formSquares();
    fixture.detectChanges();
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
    game.sumChanges();
    game.chooseCancellation('balanced');
    game.formSquares();
    const values = game.records();
    game.answerSquare(-4);
    expect(game.feedback()).toContain('La cantidad de casillas no puede ser negativa');
    expect(game.stage()).toBe('squares');
    expect(game.records()).toBe(values);
    game.answerSquare(2);
    expect(game.feedback()).toContain('dos filas de dos casillas');
    expect(game.stage()).toBe('squares');
    expect(game.records()).toBe(values);
    game.answerSquare(4);
    expect(game.stage()).toBe('weight');
  });

  it('moves keyboard focus to the question when the square-construction button disappears', async () => {
    const fixture = create();
    const game = fixture.componentInstance;
    game.sumChanges();
    game.chooseCancellation('balanced');
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const form = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
      button.textContent?.includes('Ver la multiplicación con casillas'),
    )!;
    form.focus();
    form.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(root.querySelector('#sag-task-title'));
    expect(document.activeElement?.textContent).toContain('¿Cuántas casillas tiene este cuadrado?');
  });

  it('contrasts 1 with 4 before asking how the square weights a doubled separation', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    game.sumChanges();
    game.chooseCancellation('balanced');
    game.formSquares();
    game.answerSquare(4);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.weight-demo .square-cell')).toHaveLength(5);
    expect(fixture.nativeElement.textContent).toContain('1 × 1 = 1');
    expect(fixture.nativeElement.textContent).toContain('2 × 2 = 4');
    game.chooseWeight('twice');
    expect(game.stage()).toBe('weight');
    expect(game.feedback()).toContain('las casillas pasaron de 1 a 4');
    game.chooseWeight('unchanged');
    expect(game.stage()).toBe('weight');
    game.chooseWeight('four');
    expect(game.stage()).toBe('discovery');
  });

  it('explains the average using the original squares and leaves duplication optional', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    reachDiscovery(game);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const evidence = root.querySelector('.workbench > .primary-evidence')!;
    expect(evidence.textContent).toContain('4 + 0 + 0 + 4 = 8');
    expect(evidence.textContent).toContain('8 ÷ 4 = 2');
    const task = root.querySelector('.task-card')!;
    const visible = Array.from(task.querySelectorAll(':scope > p'), (p) =>
      p.textContent!.replace(/\s+/g, ' ').trim(),
    ).join(' ');
    expect(visible).toContain('dividimos entre los 4 registros');
    expect(visible).toContain('dos registros que aportan 0');
    expect(visible).toContain('se llama varianza');
    expect(visible).toContain('2 (t/h)²');
    expect(visible).toContain('no una distancia de 2 t/h');
    const optional = task.querySelector<HTMLDetailsElement>('details')!;
    expect(optional.open).toBe(false);
    expect(optional.textContent).toContain('No son nuevas mediciones');
    expect(optional.textContent).toContain('16 ÷ 8 = 2');
    expect(root.querySelector('.comparison-box')).toBeNull();
    expect(task.querySelectorAll('button')).toHaveLength(1);
    expect(task.querySelector('button')?.textContent?.trim()).toBe('Practicar con otros datos →');
    expect(game.records()).toEqual([98, 100, 100, 102]);
  });

  it('starts fresh practice without inheriting help and hides the square answer initially', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    game.sumChanges();
    game.chooseCancellation('constant');
    game.chooseCancellation('balanced');
    game.formSquares();
    game.answerSquare(-4);
    game.answerSquare(4);
    game.chooseWeight('four');

    game.startPractice();
    fixture.detectChanges();
    expect(game.records()).toEqual([99, 99, 101, 101]);
    expect(game.mean()).toBe(100);
    expect(game.deviations()).toEqual([-1, -1, 1, 1]);
    expect(game.variance()).toBe(1);
    expect(game.practiceHelped()).toBe(false);
    expect(game.practiceVarianceAnswered()).toBe(false);
    expect(game.feedback()).toBe('');
    expect(game.round()).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('.square-cell')).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('¿Cuántas casillas tendría el cuadrado?');
    expect(fixture.nativeElement.querySelectorAll('.data-point')).toHaveLength(4);
  });

  it('shows the practice squares and all four records without revealing the average before an answer', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    reachPractice(game);
    game.answerPracticeSquare(1);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(game.stage()).toBe('practice-checked');
    expect(root.querySelector('.primary-evidence')?.textContent).toContain('1 + 1 + 1 + 1 = 4');
    expect(root.querySelector('.primary-evidence')?.textContent).toContain('registros: 4');
    expect(root.querySelectorAll('.record-card')).toHaveLength(4);
    expect(root.querySelectorAll('.variance-choices button')).toHaveLength(3);
    expect(root.textContent).not.toContain('÷');
    expect(root.textContent).not.toContain('1 (t/h)²');
    expect(root.querySelector('.comparison-box')).toBeNull();
    const records = game.records();
    game.answerPracticeVariance(Number.NaN);
    fixture.detectChanges();
    expect(game.records()).toBe(records);
    expect(game.feedback()).toBe('');
    expect(game.practiceHelped()).toBe(false);
    expect(game.averageSolved()).toBe(false);
  });

  it('asks for the whole-data average on the same practice board without revealing it first', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const done = vi.fn();
    game.completed.subscribe(done);
    reachPractice(game);
    game.answerPracticeSquare(1);
    const records = game.records();

    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(game.stage()).toBe('practice-checked');
    expect(game.practicing()).toBe(true);
    expect(game.averageVisible()).toBe(true);
    expect(game.averageSolved()).toBe(false);
    expect(game.records()).toBe(records);
    expect(game.records()).toEqual([99, 99, 101, 101]);
    expect(game.mean()).toBe(100);
    expect(game.variance()).toBe(1);
    expect(game.round()).toBe(0);
    expect(game.practiceVarianceAnswered()).toBe(false);
    expect(root.querySelector('#sag-task-title')?.textContent?.trim()).toBe(
      '¿Cuántas casillas hay por registro, en promedio?',
    );
    expect(root.querySelector('.task-card')?.textContent).toContain('operador');
    expect(root.querySelector('.task-card')?.textContent).toContain('suman 4');
    expect(root.querySelector('.task-card')?.textContent).toContain('4 registros');
    expect(root.querySelector('.task-card')?.textContent).toContain(
      'Divide la suma entre todos los registros',
    );
    expect(root.querySelector('.variance-choices')?.getAttribute('aria-label')).toBe(
      'Elige la cantidad promedio de casillas por registro',
    );
    expect(
      game
        .practiceVarianceOptions()
        .slice()
        .sort((a, b) => a - b),
    ).toEqual([0, 1, 4]);
    expect(
      Array.from(root.querySelectorAll('.variance-choices button'), (choice) =>
        choice.textContent?.trim(),
      ).sort(),
    ).toEqual(['0', '1', '4']);
    expect(root.querySelectorAll('.comparison-box b')).toHaveLength(0);
    expect(root.textContent).not.toContain('÷');
    expect(root.textContent).not.toContain('1 (t/h)²');
    expect(root.querySelector('input, textarea, form, select')).toBeNull();
    expect(root.querySelector('.conclusion-header, .lesson-conclusion')).toBeNull();
    expect(
      Array.from(root.querySelectorAll('button')).some((button) =>
        button.textContent?.includes('Continuar'),
      ),
    ).toBe(false);
    game.continuePractice();
    game.finish();
    expect(done).not.toHaveBeenCalled();
    expect(game.stage()).toBe('practice-checked');

    click(root, '1');
    fixture.detectChanges();
    expect(game.stage()).toBe('practice-checked');
    expect(game.records()).toBe(records);
    expect(game.practiceVarianceAnswered()).toBe(true);
    expect(game.practiceHelped()).toBe(false);
    expect(game.averageSolved()).toBe(true);
    expect(root.querySelector('#sag-task-title')?.textContent?.trim()).toBe('Exacto: 4 ÷ 4 = 1');
    expect(root.querySelector('.task-card')?.textContent).toContain('1 (t/h)²');
    expect(
      Array.from(
        root.querySelectorAll('.primary-evidence strong'),
        (result) => result.textContent,
      ).filter((text) => text?.includes('÷')),
    ).toEqual(['4 ÷ 4 = 1']);
    expect(root.querySelector('.task-card .answer-choice')).toBeNull();
    expect(root.querySelector('.conclusion-header, .lesson-conclusion')).toBeNull();
    game.finish();
    expect(done).not.toHaveBeenCalled();
    click(root, 'Continuar →');
    fixture.detectChanges();
    expect(game.stage()).toBe('success');
    expect(done).not.toHaveBeenCalled();
    click(root, 'Entregar el hallazgo →');
    fixture.detectChanges();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('focuses the average question and checked answer when their buttons disappear', async () => {
    const fixture = create();
    const game = fixture.componentInstance;
    reachPractice(game);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    click(root, '1 casilla');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(root.querySelector('#sag-task-title'));
    expect(document.activeElement?.textContent?.trim()).toBe(
      '¿Cuántas casillas hay por registro, en promedio?',
    );
    const answer = Array.from(
      root.querySelectorAll<HTMLButtonElement>('.variance-choices button'),
    ).find((button) => button.textContent?.trim() === '1')!;
    answer.focus();
    answer.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.contains(answer)).toBe(false);
    expect(document.activeElement?.textContent?.trim()).toBe('Exacto: 4 ÷ 4 = 1');
    expect(game.practiceVarianceAnswered()).toBe(true);
  });

  it.each([
    { answer: 0, explanation: '0 sería tener todos los datos iguales al promedio' },
    { answer: 4, explanation: '4 es la suma de casillas, no el promedio' },
  ])(
    'corrects numeric answer $answer on the same data and requires an unaided retry',
    ({ answer, explanation }) => {
      const fixture = create();
      const game = fixture.componentInstance;
      const done = vi.fn();
      game.completed.subscribe(done);
      reachPractice(game);
      game.answerPracticeSquare(1);

      fixture.detectChanges();
      const root: HTMLElement = fixture.nativeElement;
      const records = game.records();
      const choices = game.practiceVarianceOptions();
      click(root, String(answer));
      fixture.detectChanges();
      expect(game.stage()).toBe('practice-checked');
      expect(game.practiceVarianceAnswered()).toBe(false);
      expect(game.feedback()).toContain(explanation);
      expect(game.feedback()).toContain('4 registros');
      expect(game.practiceHelped()).toBe(true);
      expect(game.records()).toBe(records);
      expect(game.records()).toEqual([99, 99, 101, 101]);
      expect(game.mean()).toBe(100);
      expect(game.practiceVarianceOptions()).toBe(choices);
      expect(game.averageSolved()).toBe(false);
      expect(root.querySelectorAll('.variance-choices button')).toHaveLength(3);
      expect(root.querySelectorAll('.comparison-box b')).toHaveLength(0);
      game.continuePractice();
      game.continueAfterHelp();
      game.finish();
      expect(game.stage()).toBe('practice-checked');
      expect(game.round()).toBe(0);
      expect(done).not.toHaveBeenCalled();

      click(root, '1');
      fixture.detectChanges();
      expect(game.practiceVarianceAnswered()).toBe(true);
      expect(game.feedback()).toBe('');
      expect(game.records()).toBe(records);
      expect(game.practiceHelped()).toBe(true);
      click(root, 'Continuar →');
      fixture.detectChanges();
      expect(game.stage()).toBe('review');
      expect(game.records()).toBe(records);
      click(root, 'Probar otros registros →');
      fixture.detectChanges();
      expect(game.stage()).toBe('practice-square');
      expect(game.round()).toBe(1);
      expect(game.records()).toEqual([98, 98, 102, 102]);
      expect(game.practiceVarianceAnswered()).toBe(false);
      expect(game.practiceHelped()).toBe(false);
      expect(game.feedback()).toBe('');
      game.answerPracticeSquare(4);

      fixture.detectChanges();
      expect(root.querySelector('.task-card')?.textContent).toContain('suman 16');
      expect(
        game
          .practiceVarianceOptions()
          .slice()
          .sort((a, b) => a - b),
      ).toEqual([0, 4, 16]);
      expect(root.querySelectorAll('.comparison-box b')).toHaveLength(0);
      click(root, '4');
      fixture.detectChanges();
      expect(root.querySelector('#sag-task-title')?.textContent?.trim()).toBe('Exacto: 16 ÷ 4 = 4');
      expect(root.querySelector('.task-card')?.textContent).toContain('4 (t/h)²');
      click(root, 'Continuar →');
      fixture.detectChanges();
      expect(game.stage()).toBe('success');
      expect(done).not.toHaveBeenCalled();
      click(root, 'Entregar el hallazgo →');
      fixture.detectChanges();
      expect(done).toHaveBeenCalledTimes(1);
    },
  );

  it('explains a practice mistake without replacing its records', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    reachPractice(game);
    const records = game.records();
    game.answerPracticeSquare(-1);
    fixture.detectChanges();
    expect(game.stage()).toBe('practice-square');
    expect(game.practiceHelped()).toBe(true);
    expect(game.records()).toBe(records);
    expect(game.feedback()).toContain('1 × 1 = 1 casilla');
    expect(fixture.nativeElement.textContent).toContain('Una pista');
    expect(fixture.nativeElement.querySelector('[aria-live="polite"]')).not.toBeNull();
    game.continueAfterHelp();
    expect(game.records()).toBe(records);
    game.answerPracticeSquare(1);
    expect(game.stage()).toBe('practice-checked');
    expect(game.feedback()).toBe('');
  });

  it('offers new records only after solving a supported example', () => {
    const game = create().componentInstance;
    reachPractice(game);
    game.answerPracticeSquare(-1);
    const supported = game.records();
    game.continueAfterHelp();
    expect(game.records()).toBe(supported);
    solvePractice(game);
    expect(game.stage()).toBe('review');
    expect(game.records()).toBe(supported);
    game.continueAfterHelp();
    expect(game.stage()).toBe('practice-square');
    expect(game.records()).toEqual([98, 98, 102, 102]);
    expect(game.variance()).toBe(4);
    expect(game.squareSum()).toBe(16);
    expect(game.practiceHelped()).toBe(false);
    expect(game.feedback()).toBe('');
    expect(game.practiceVarianceAnswered()).toBe(false);
    solvePractice(game);
    expect(game.stage()).toBe('success');
    expect(game.guidedCompletion()).toBe(false);
  });

  it.each(['square', 'variance'] as const)(
    'allows an honest guided finish after help in the additional practice %s',
    (helpStep) => {
      const fixture = create();
      const game = fixture.componentInstance;
      const done = vi.fn();
      game.completed.subscribe(done);
      reachPractice(game);
      game.answerPracticeSquare(-1);
      solvePractice(game);
      expect(game.stage()).toBe('review');
      game.finish();
      expect(done).not.toHaveBeenCalled();
      game.continueAfterHelp();
      expect(game.round()).toBe(1);
      if (helpStep === 'square') game.answerPracticeSquare(-4);
      game.answerPracticeSquare(4);
      game.continuePractice();
      game.continueAfterHelp();
      game.finish();
      expect(game.stage()).toBe('practice-checked');
      expect(done).not.toHaveBeenCalled();

      if (helpStep === 'variance') game.answerPracticeVariance(16);
      game.continuePractice();
      game.finish();
      expect(game.stage()).toBe('practice-checked');
      expect(game.practiceVarianceAnswered()).toBe(false);
      expect(done).not.toHaveBeenCalled();
      game.answerPracticeVariance(4);
      game.finish();
      expect(done).not.toHaveBeenCalled();
      game.continuePractice();
      fixture.detectChanges();
      expect(game.stage()).toBe('success');
      expect(game.round()).toBe(1);
      expect(game.practiceHelped()).toBe(true);
      expect(game.practiceVarianceAnswered()).toBe(true);
      expect(game.guidedCompletion()).toBe(true);
      expect(fixture.nativeElement.querySelector('.conclusion-header').textContent).toContain(
        'Completaste con ayuda',
      );
      expect(game.records()).toEqual([98, 100, 100, 102]);
      expect(game.variance()).toBe(2);
      game.continueAfterHelp();
      expect(game.stage()).toBe('success');
      expect(game.round()).toBe(1);
      game.finish();
      game.finish();
      expect(done).toHaveBeenCalledTimes(1);
    },
  );

  it('keeps old practice drafts accurate without demanding more than one additional round', () => {
    const expected = [
      [99, 99, 101, 101],
      [98, 98, 102, 102],
      [100, 100, 102, 102],
    ];
    for (let round = 0; round < 9; round += 1) {
      const fixture = createPractice(round);
      const game = fixture.componentInstance;
      const values = expected[round % 3];
      const mean = values.reduce((sum, value) => sum + value, 0) / 4;
      const squareSum = values.reduce((sum, value) => sum + (value - mean) ** 2, 0);
      expect(game.records()).toEqual(values);
      expect(game.mean()).toBe(mean);
      expect(game.squareSum()).toBe(squareSum);
      expect(game.variance()).toBe(squareSum / 4);
      expect(game.points().map((point) => point.x)).toEqual(
        values.map((value) => game.position(value)),
      );
      expect(game.plotDescription()).toContain('Promedio ' + mean);
      expect(new Set(game.practiceSquareOptions()).size).toBe(3);
      expect(game.practiceSquareOptions()).toContain(game.practiceSquare());
      expect(new Set(game.practiceVarianceOptions()).size).toBe(3);
      expect(
        game
          .practiceVarianceOptions()
          .slice()
          .sort((a, b) => a - b),
      ).toEqual([0, squareSum / 4, squareSum].sort((a, b) => a - b));
      expect(game.practiceVarianceAnswered()).toBe(false);
      game.answerPracticeSquare(-game.practiceSquare());
      solvePractice(game);
      expect(game.stage()).toBe(round === 0 ? 'review' : 'success');
      game.continueAfterHelp();
      expect(game.stage()).toBe(round === 0 ? 'practice-square' : 'success');
      expect(game.round()).toBe(round === 0 ? 1 : round);
      expect(game.guidedCompletion()).toBe(round > 0);
      expect(game.original).toEqual([98, 100, 100, 102]);
      fixture.destroy();
    }
  });

  it('does not count invalid practice answers as pedagogical mistakes', () => {
    const game = create().componentInstance;
    reachPractice(game);
    game.answerPracticeVariance(1);
    game.answerPracticeSquare(99);
    game.answerPracticeSquare(NaN);
    expect(game.stage()).toBe('practice-square');
    expect(game.practiceHelped()).toBe(false);
    game.answerPracticeSquare(1);

    expect(game.stage()).toBe('practice-checked');
    expect(game.practiceHelped()).toBe(false);
    expect(game.feedback()).toBe('');

    expect(game.stage()).toBe('practice-checked');
    expect(game.practiceHelped()).toBe(false);
    game.answerPracticeVariance(99);
    game.answerPracticeVariance(NaN);
    game.answerPracticeVariance(Infinity);
    expect(game.practiceVarianceAnswered()).toBe(false);
    expect(game.practiceHelped()).toBe(false);
    expect(game.feedback()).toBe('');
    game.continuePractice();
    expect(game.stage()).toBe('practice-checked');
    game.answerPracticeVariance(1);
    game.continuePractice();
    expect(game.stage()).toBe('success');
  });

  it('guards early continuation and repeated answers until the practice average is checked', () => {
    const game = create().componentInstance;
    const done = vi.fn();
    game.completed.subscribe(done);
    reachPractice(game);
    game.continuePractice();
    game.answerPracticeVariance(game.variance());
    expect(game.stage()).toBe('practice-square');
    expect(game.practiceVarianceAnswered()).toBe(false);
    game.answerPracticeSquare(game.practiceSquare());
    game.continuePractice();
    game.finish();
    expect(game.stage()).toBe('practice-checked');
    expect(done).not.toHaveBeenCalled();
    game.answerPracticeVariance(game.variance());
    game.answerPracticeVariance(0);
    expect(game.practiceHelped()).toBe(false);
    expect(game.practiceVarianceAnswered()).toBe(true);
    game.continuePractice();
    game.continuePractice();
    game.finish();
    game.finish();
    expect(done).toHaveBeenCalledOnce();
  });

  it('restores original evidence in the final report even after practice with another mean', () => {
    const fixture = createPractice(2);
    const game = fixture.componentInstance;
    expect(game.mean()).toBe(101);
    expect(game.records()).toEqual([100, 100, 102, 102]);
    const records = game.records();
    game.answerPracticeSquare(1);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelectorAll('.comparison-box b')).toHaveLength(0);

    fixture.detectChanges();
    expect(game.stage()).toBe('practice-checked');
    expect(game.records()).toBe(records);
    expect(game.round()).toBe(2);
    expect(game.mean()).toBe(101);
    expect(game.variance()).toBe(1);
    expect(game.records()).toEqual([100, 100, 102, 102]);
    expect(root.querySelector('.mean-summary')?.textContent).toContain('Promedio: 101 t/h');
    expect(root.querySelectorAll('.comparison-box b')).toHaveLength(0);
    game.answerPracticeVariance(1);
    fixture.detectChanges();
    expect(
      Array.from(
        root.querySelectorAll('.primary-evidence strong'),
        (result) => result.textContent,
      ).filter((text) => text?.includes('÷')),
    ).toEqual(['4 ÷ 4 = 1']);
    expect(root.querySelector('.lesson-conclusion')).toBeNull();
    game.continuePractice();
    fixture.detectChanges();
    const report = fixture.nativeElement.querySelector('.lesson-conclusion') as HTMLElement;
    expect(game.stage()).toBe('success');
    expect(game.mean()).toBe(100);
    expect(game.records()).toEqual([98, 100, 100, 102]);
    expect(game.variance()).toBe(2);
    expect(report.textContent).toContain('98, 100, 100 y 102');
    expect(Array.from(report.querySelectorAll('.conclusion-facts > div')).map(value => [value.querySelector('dt')!.textContent, value.querySelector('dd')!.textContent?.trim()])).toEqual([['Promedio', '100 t/h'], ['Varianza', '2 (t/h)²']]);
    expect(report.textContent).toContain('4 registros');
    expect(report.textContent).toContain('No explica por qué');
    expect(report.textContent).toContain('ni dice si la cantidad');
    expect(report.textContent).toContain('de material fue la adecuada');
    expect(report.textContent).toContain('no es una distancia de 2 t/h');
  });

  it('requires the checked practice before completion and emits only once', () => {
    const game = create().componentInstance;
    const done = vi.fn();
    game.completed.subscribe(done);
    reachDiscovery(game);
    game.finish();
    expect(done).not.toHaveBeenCalled();
    game.startPractice();
    game.answerPracticeSquare(-1);
    solvePractice(game);
    game.finish();
    expect(done).not.toHaveBeenCalled();
    game.continueAfterHelp();
    solvePractice(game);
    game.finish();
    game.finish();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('completes the entire lesson through rendered native buttons', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    const done = vi.fn();
    game.completed.subscribe(done);
    const labels = [
      'Sumar diferencias →',
      'No. Hay datos distintos, aunque la suma dé 0.',
      'Ver la multiplicación con casillas →',
      '4 casillas',
      'Cuatro veces: pasa de 1 a 4 casillas.',
      'Practicar con otros datos →',
      '1 casilla',
      '1',
      'Continuar →',
      'Entregar el hallazgo →',
    ];
    for (const label of labels) {
      click(root, label);
      fixture.detectChanges();
    }
    expect(done).toHaveBeenCalledTimes(1);
    expect(game.stage()).toBe('success');
    expect(root.querySelector('input, textarea, form, select')).toBeNull();
  });

  it('renders the guided recovery path with new data and no hidden progress', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    reachPractice(game);
    fixture.detectChanges();
    click(root, '−1 casilla');
    fixture.detectChanges();
    expect(root.querySelectorAll('.record-card')).toHaveLength(4);
    click(root, '1 casilla');
    fixture.detectChanges();
    expect(game.stage()).toBe('practice-checked');
    click(root, '1');
    fixture.detectChanges();
    click(root, 'Continuar →');
    fixture.detectChanges();
    expect(root.textContent).toContain('Los cuadrados también se promedian');
    click(root, 'Probar otros registros →');
    fixture.detectChanges();
    expect(root.textContent).toContain('¿Cuántas casillas tendría el cuadrado?');
    click(root, '4 casillas');
    fixture.detectChanges();
    expect(game.stage()).toBe('practice-checked');
    click(root, '4');
    fixture.detectChanges();
    click(root, 'Continuar →');
    fixture.detectChanges();
    expect(game.stage()).toBe('success');
  });

  it('starts a replay cleanly without completion, duplication or practice help', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    reachPractice(game);
    solvePractice(game);
    game.finish();
    fixture.destroy();
    const replay = create().componentInstance;
    expect(replay.stage()).toBe('observe');
    expect(replay.records()).toEqual([98, 100, 100, 102]);
    expect(replay.squaresFormed()).toBe(false);
    expect(replay.practiceHelped()).toBe(false);
    expect(replay.practiceVarianceAnswered()).toBe(false);
    expect(replay.round()).toBe(0);
    expect(replay.feedback()).toBe('');
    expect(replay.signed(-2)).toBe('−2');
    expect(replay.signed(2)).toBe('+2');
    expect(replay.signed(0)).toBe('0');
  });
});
