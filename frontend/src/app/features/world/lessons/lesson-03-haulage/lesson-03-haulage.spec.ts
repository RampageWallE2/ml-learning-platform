import { TestBed } from '@angular/core/testing';
import { Lesson03Haulage } from './lesson-03-haulage';

describe('Lesson03Haulage', () => {
  function create() {
    const fixture = TestBed.createComponent(Lesson03Haulage);
    fixture.detectChanges();
    return fixture;
  }

  function reachMeasure(game: Lesson03Haulage) {
    game.selectTrip('trip-3');
    game.selectTrip('trip-4');
    game.showSeparation();
  }

  function practice(game: Lesson03Haulage) {
    reachMeasure(game);
    game.answerRange(7);
    game.startPractice();
  }

  function findPracticeExtremes(game: Lesson03Haulage) {
    game.selectTrip(game.records().find((record) => record.time === game.minimum())!.id);
    game.selectTrip(game.records().find((record) => record.time === game.maximum())!.id);
  }

  it('starts with a clear mission and visible records before explaining the mathematical tool', () => {
    const fixture = create();
    const root = fixture.nativeElement as HTMLElement;
    expect(fixture.componentInstance.stage()).toBe('extremes');
    expect(root.querySelector('.lesson-header')!.textContent).toContain(
      'organiza las llegadas de camiones',
    );
    expect(root.textContent).toContain('desmonte');
    expect(root.textContent).toContain('Selecciona la descarga más corta');
    expect(root.querySelector('.workbench')!.textContent).not.toMatch(/rango|máximo|mínimo/);
    expect(root.querySelectorAll('.trip-card')).toHaveLength(5);
    expect(root.querySelector('.time-bridge')).toBeNull();
    expect(root.querySelectorAll('input, textarea')).toHaveLength(0);
  });

  it('preserves the planned data and shows proportional bars with a shared zero baseline', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    expect(game.trips.map((record) => record.time)).toEqual([11, 12, 11, 18, 12]);
    expect(game.practiceTrips().map((record) => record.time)).toEqual([14, 10, 12, 15, 11]);
    expect(game.barHeight(0)).toBe(0);
    expect(game.barHeight(10)).toBe(50);
    expect(game.barHeight(20)).toBe(100);
    const bars = fixture.nativeElement.querySelectorAll('.time-bar') as NodeListOf<HTMLElement>;
    Array.from(bars).forEach((bar, index) =>
      expect(parseFloat(bar.style.height)).toBeCloseTo([55, 60, 55, 90, 60][index]),
    );
    expect(fixture.nativeElement.querySelector('.chart-key').textContent).toContain(
      'empiezan en cero',
    );
  });

  it('uses the shared lesson theme and a single named evidence region throughout the activity', () => {
    const fixture = create();
    const root = fixture.nativeElement as HTMLElement;
    const game = fixture.componentInstance;
    const checkEvidence = (title: string) => {
      expect(root.querySelectorAll('.workbench')).toHaveLength(1);
      expect(root.querySelectorAll('[id="haulage-evidence-title"]')).toHaveLength(1);
      const board = root.querySelector('.time-board')!;
      expect(board.getAttribute('role')).toBe('region');
      expect(board.getAttribute('aria-labelledby')).toBe('haulage-evidence-title');
      expect(root.querySelector('#haulage-evidence-title')!.textContent).toBe(title);
    };
    expect(root.querySelector('.lesson')!.classList.contains('haulage-lesson')).toBe(false);
    expect(root.querySelector('.lesson-tag__number')!.textContent).toBe('Clase 3');
    checkEvidence('Cinco descargas de desmonte');
    reachMeasure(game);
    fixture.detectChanges();
    checkEvidence('Cinco descargas de desmonte');
    game.answerRange(7);
    game.startPractice();
    fixture.detectChanges();
    checkEvidence('Ensayo: otras cinco descargas');
  });

  it('shares button styles without losing the selected extremes or their text labels', () => {
    const fixture = create();
    const root = fixture.nativeElement as HTMLElement;
    const game = fixture.componentInstance;
    expect(root.querySelectorAll('.trip-card.btn[type="button"]')).toHaveLength(5);
    expect(root.querySelectorAll('.selection-label--empty')).toHaveLength(5);
    game.selectTrip('trip-1');
    game.selectTrip('trip-4');
    fixture.detectChanges();
    const short = root.querySelector<HTMLButtonElement>('.trip-card--short')!;
    const long = root.querySelector<HTMLButtonElement>('.trip-card--long')!;
    expect(short.getAttribute('aria-label')).toContain('11 minutos. Más corta seleccionada.');
    expect(long.getAttribute('aria-label')).toContain('18 minutos. Más larga seleccionada.');
    expect(short.querySelector('.selection-label')!.textContent).toBe('Más corta ✓');
    expect(long.querySelector('.selection-label')!.textContent).toBe('Más larga ✓');
    expect(short.disabled && long.disabled).toBe(true);
    expect(root.querySelectorAll('.selection-label--empty')).toHaveLength(3);
    game.showSeparation();
    fixture.detectChanges();
    expect(root.querySelectorAll('.number-choices .btn--answer[type="button"]')).toHaveLength(4);
    game.answerRange(7);
    game.startPractice();
    findPracticeExtremes(game);
    game.answerRange(5);
    fixture.detectChanges();
    expect(root.querySelectorAll('.meaning-choices .btn--answer[type="button"]')).toHaveLength(3);
    expect(root.querySelectorAll('input, textarea')).toHaveLength(0);
  });

  it('highlights only the two ends while retaining all seven spaces and eight duration marks', () => {
    const fixture = create();
    reachMeasure(fixture.componentInstance);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.extreme-summary__short span')!.textContent).toBe('Más corta');
    expect(root.querySelector('.extreme-summary__short strong')!.textContent).toContain('11');
    expect(root.querySelector('.extreme-summary__long span')!.textContent).toBe('Más larga');
    expect(root.querySelector('.extreme-summary__long strong')!.textContent).toContain('18');
    expect(root.querySelectorAll('.minute-step')).toHaveLength(7);
    expect(root.querySelectorAll('.minute-mark')).toHaveLength(8);
    expect(root.querySelectorAll('.minute-mark--endpoint')).toHaveLength(2);
    expect(root.querySelector('.minute-label--short')!.textContent?.trim()).toBe('11');
    expect(root.querySelector('.minute-label--long')!.textContent?.trim()).toBe('18');
    expect(root.querySelector('.bridge-end--short')!.getAttribute('cx')).toBe('30');
    expect(root.querySelector('.bridge-end--long')!.getAttribute('cx')).toBe('530');
    expect(root.querySelectorAll('.bridge-end[aria-hidden="true"]')).toHaveLength(2);
  });

  it('accepts either record with the repeated shortest duration', () => {
    for (const id of ['trip-1', 'trip-3']) {
      const fixture = create();
      const game = fixture.componentInstance;
      game.selectTrip(id);
      expect(game.selectedMinId()).toBe(id);
      expect(game.stage()).toBe('extremes');
      expect(game.selectionTask()).toContain('más larga');
      game.selectTrip('trip-4');
      expect(game.selectedMaxId()).toBe('trip-4');
      expect(game.extremesFound()).toBe(true);
      expect(game.stage()).toBe('extremes');
      fixture.destroy();
    }
  });

  it('keeps the same records and valid selections when a wrong extreme is chosen', () => {
    const game = create().componentInstance;
    const before = game.records();
    game.selectTrip('trip-2');
    expect(game.feedback()).toContain('menos minutos');
    expect(game.selectedMinId()).toBeNull();
    game.selectTrip('trip-1');
    expect(game.feedback()).toBe('');
    game.selectTrip('trip-3');
    expect(game.feedback()).toContain('No importa cuántas veces');
    expect(game.selectedMinId()).toBe('trip-1');
    expect(game.selectedMaxId()).toBeNull();
    expect(game.records()).toBe(before);
    game.selectTrip('trip-4');
    game.selectTrip('trip-2');
    expect(game.selectedMaxId()).toBe('trip-4');
    expect(game.practiceHelped()).toBe(false);
  });

  it('rejects invalid answers and prevents skipping any required step', () => {
    const game = create().componentInstance;
    const done = vi.fn();
    game.completed.subscribe(done);
    game.selectTrip('missing');
    game.showSeparation();
    game.answerRange(7);
    game.startPractice();
    game.explainRange('separation');
    game.continueAfterHelp();
    game.finish();
    expect(game.stage()).toBe('extremes');
    expect(game.selectedMinId()).toBeNull();
    game.selectTrip('trip-1');
    game.showSeparation();
    expect(game.stage()).toBe('extremes');
    game.selectTrip('trip-4');
    game.showSeparation();
    for (const answer of [NaN, Infinity, -1, 0, 7.5, 100]) game.answerRange(answer);
    expect(game.stage()).toBe('measure');
    expect(game.feedback()).toBe('');
    expect(done).not.toHaveBeenCalled();
  });

  it('selects both extremes on one board without intermediate continue buttons', () => {
    const fixture = create();
    const root = fixture.nativeElement as HTMLElement;
    const grid = root.querySelector('.trip-grid');
    const cards = root.querySelectorAll<HTMLButtonElement>('.trip-card');
    cards[0].click();
    fixture.detectChanges();
    expect(root.querySelector('.trip-grid')).toBe(grid);
    expect(root.querySelector('.task-card')!.textContent).toContain(
      'Selecciona la descarga más larga',
    );
    expect(root.querySelector('.btn--primary')).toBeNull();
    cards[3].click();
    fixture.detectChanges();
    expect(root.querySelector('.trip-grid')).toBe(grid);
    expect(root.querySelectorAll('[aria-pressed="true"]')).toHaveLength(2);
    expect(root.querySelector('.trip-card--short')!.textContent).toContain('Más corta ✓');
    expect(root.querySelector('.trip-card--long')!.textContent).toContain('Más larga ✓');
    expect(root.querySelector('.btn--primary')!.textContent).toContain('Ver la separación');
    expect(Array.from(cards).every((card) => card.disabled)).toBe(true);
  });

  it('shows seven one-minute spaces and eight duration marks without a mandatory slider', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    reachMeasure(game);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(game.axisTicks()).toEqual([11, 12, 13, 14, 15, 16, 17, 18]);
    expect(game.intervals()).toEqual([11, 12, 13, 14, 15, 16, 17]);
    expect(game.bridgePosition(11)).toBe(30);
    expect(game.bridgePosition(18)).toBe(530);
    expect(root.querySelectorAll('.minute-step')).toHaveLength(7);
    expect(root.querySelectorAll('.minute-mark')).toHaveLength(8);
    expect(root.querySelectorAll('.step-number')).toHaveLength(7);
    expect(root.querySelector('.time-bridge')!.getAttribute('aria-label')).toContain(
      '7 tramos de un minuto',
    );
    expect(root.querySelectorAll('input, textarea')).toHaveLength(0);
    expect(root.textContent).not.toContain('se llama rango');
    const steps = root.querySelectorAll<SVGRectElement>('.minute-step');
    for (const step of Array.from(steps))
      expect(Number(step.getAttribute('width'))).toBeCloseTo(500 / 7 - 8);
  });

  it('distinguishes longest duration from separation and spaces from inclusive marks', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    reachMeasure(game);
    const before = game.records();
    game.answerRange(18);
    expect(game.feedback()).toContain('duración más larga, no la separación');
    game.answerRange(8);
    expect(game.feedback()).toContain('no las marcas');
    game.answerRange(6);
    expect(game.stage()).toBe('measure');
    expect(game.records()).toBe(before);
    game.answerRange(7);
    fixture.detectChanges();
    expect(game.stage()).toBe('discovery');
    expect(fixture.nativeElement.textContent).toContain('Esta separación se llama rango');
    expect(fixture.nativeElement.textContent).toContain('18 menos 11 da 7');
    expect(game.feedback()).toBe('');
  });

  it('starts an independent example with new records and no inherited selections or hints', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    reachMeasure(game);
    game.answerRange(18);
    game.answerRange(7);
    game.startPractice();
    fixture.detectChanges();
    expect(game.stage()).toBe('practice-extremes');
    expect(game.step()).toBe(3);
    expect(game.records().map((record) => record.time)).toEqual([14, 10, 12, 15, 11]);
    expect(game.minimum()).toBe(10);
    expect(game.maximum()).toBe(15);
    expect(game.selectedMinId()).toBeNull();
    expect(game.selectedMaxId()).toBeNull();
    expect(game.practiceHelped()).toBe(false);
    expect(game.feedback()).toBe('');
    expect(fixture.nativeElement.querySelectorAll('.trip-card')).toHaveLength(5);
    expect(fixture.nativeElement.querySelector('.time-bridge')).toBeNull();
  });

  it('requires finding both new extremes before answering or interpreting the range', () => {
    const game = create().componentInstance;
    practice(game);
    game.answerRange(5);
    game.explainRange('separation');
    game.showSeparation();
    expect(game.stage()).toBe('practice-extremes');
    game.selectTrip('practice-0-2');
    game.answerRange(5);
    expect(game.stage()).toBe('practice-extremes');
    game.selectTrip('practice-0-4');
    expect(game.stage()).toBe('practice-range');
    expect(game.extremesFound()).toBe(true);
    expect(game.practiceHelped()).toBe(false);
  });

  it('keeps the counting diagram hidden during the independent calculation', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    practice(game);
    findPracticeExtremes(game);
    fixture.detectChanges();
    expect(game.rangeOptions()).toEqual([4, 5, 6, 15]);
    expect(fixture.nativeElement.querySelector('.time-bridge')).toBeNull();
    expect(
      fixture.nativeElement.querySelectorAll('.trip-card--short, .trip-card--long'),
    ).toHaveLength(2);
    game.answerRange(5);
    fixture.detectChanges();
    expect(game.stage()).toBe('practice-meaning');
    expect(fixture.nativeElement.textContent).toContain('¿Qué significa un rango de 5 minutos?');
    expect(fixture.nativeElement.querySelector('.time-bridge')).toBeNull();
    game.explainRange('invalid' as 'separation');
    expect(game.stage()).toBe('practice-meaning');
  });

  it('marks a wrong practice extreme as supported and requires a fresh unassisted example', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const done = vi.fn();
    game.completed.subscribe(done);
    practice(game);
    const before = game.records();
    game.selectTrip('practice-0-1');
    expect(game.practiceHelped()).toBe(true);
    expect(game.records()).toBe(before);
    findPracticeExtremes(game);
    game.answerRange(5);
    game.explainRange('separation');
    fixture.detectChanges();
    expect(game.stage()).toBe('review');
    expect(game.records()).toBe(before);
    expect(fixture.nativeElement.querySelectorAll('.minute-step')).toHaveLength(5);
    game.finish();
    expect(done).not.toHaveBeenCalled();
    game.continueAfterHelp();
    expect(game.round()).toBe(1);
    expect(game.records().map((record) => record.time)).toEqual([13, 9, 15, 11, 12]);
    expect(game.practiceHelped()).toBe(false);
    expect(game.selectedMinId()).toBeNull();
    expect(game.selectedMaxId()).toBeNull();
    findPracticeExtremes(game);
    game.answerRange(6);
    game.explainRange('separation');
    expect(game.stage()).toBe('success');
  });

  it('keeps the same independent records while correcting an incorrect separation', () => {
    const game = create().componentInstance;
    practice(game);
    findPracticeExtremes(game);
    const before = game.records();
    game.answerRange(15);
    expect(game.feedback()).toContain('duración más larga');
    game.answerRange(6);
    expect(game.feedback()).toContain('no las marcas');
    game.answerRange(4);
    expect(game.records()).toBe(before);
    expect(game.stage()).toBe('practice-range');
    expect(game.round()).toBe(0);
    expect(game.practiceHelped()).toBe(true);
    game.continueAfterHelp();
    expect(game.round()).toBe(0);
    game.answerRange(5);
    game.explainRange('separation');
    expect(game.stage()).toBe('review');
  });

  it('corrects misinterpretations without replacing the current example', () => {
    const game = create().componentInstance;
    practice(game);
    findPracticeExtremes(game);
    game.answerRange(5);
    const before = game.records();
    game.explainRange('maximum');
    expect(game.feedback()).toContain('La más larga duró 15 minutos');
    game.explainRange('every');
    expect(game.feedback()).toContain('no dice cuánto duraron todas');
    expect(game.stage()).toBe('practice-meaning');
    expect(game.records()).toBe(before);
    game.explainRange('separation');
    expect(game.stage()).toBe('review');
    game.continueAfterHelp();
    findPracticeExtremes(game);
    game.answerRange(game.separation());
    game.explainRange('separation');
    expect(game.stage()).toBe('success');
  });

  it('keeps repeated support examples bounded, coherent and distinct from the original evidence', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    practice(game);
    for (let round = 0; round < 10; round += 1) {
      expect(game.round()).toBe(round);
      expect(game.records()).toHaveLength(5);
      expect(
        game.records().every((record) => record.time > 0 && record.time <= game.barMaximum),
      ).toBe(true);
      game.selectTrip(game.records().find((record) => record.time !== game.minimum())!.id);
      findPracticeExtremes(game);
      game.answerRange(game.separation());
      game.explainRange('separation');
      expect(game.stage()).toBe('review');
      expect(game.intervals().length).toBe(game.separation());
      game.continueAfterHelp();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.time-bridge')).toBeNull();
    }
    findPracticeExtremes(game);
    game.answerRange(game.separation());
    game.explainRange('separation');
    fixture.detectChanges();
    expect(game.stage()).toBe('success');
    expect(fixture.nativeElement.querySelector('.report-card').textContent).toContain(
      'de 11 a 18 minutos',
    );
    expect(fixture.nativeElement.querySelector('.report-card').textContent).toContain(
      '7 minutos de separación',
    );
    expect(game.trips.map((record) => record.time)).toEqual([11, 12, 11, 18, 12]);
  });

  it('emits once only after an independent calculation and its interpretation', () => {
    const game = create().componentInstance;
    const done = vi.fn();
    game.completed.subscribe(done);
    game.finish();
    practice(game);
    findPracticeExtremes(game);
    game.answerRange(5);
    game.finish();
    expect(done).not.toHaveBeenCalled();
    game.explainRange('separation');
    game.finish();
    game.finish();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('runs through real buttons without writing or dragging and delivers an honest observation', () => {
    const fixture = create();
    const root = fixture.nativeElement as HTMLElement;
    const done = vi.fn();
    fixture.componentInstance.completed.subscribe(done);
    const trip = (index: number) => {
      root.querySelectorAll<HTMLButtonElement>('.trip-card')[index].click();
      fixture.detectChanges();
      expect(root.querySelectorAll('input, textarea')).toHaveLength(0);
    };
    const primary = () => {
      root.querySelector<HTMLButtonElement>('.btn--primary')!.click();
      fixture.detectChanges();
    };
    const number = (value: number) => {
      Array.from(root.querySelectorAll<HTMLButtonElement>('.number-choices button'))
        .find((button) => button.textContent?.trim() === value + ' min')!
        .click();
      fixture.detectChanges();
    };
    trip(0);
    trip(3);
    primary();
    number(7);
    primary();
    trip(1);
    trip(3);
    number(5);
    root.querySelectorAll<HTMLButtonElement>('.meaning-choices button')[1].click();
    fixture.detectChanges();
    expect(root.querySelector('.completion-card')!.textContent).toContain('Tu aviso está listo');
    const report = root.querySelector('.report-card')!.textContent;
    expect(report).toContain('organizar las llegadas');
    expect(report).toContain('11 a 18 minutos');
    expect(report).toContain('7 minutos de separación');
    expect(report).toContain('no una garantía');
    expect(report).toContain('tampoco explican por qué');
    expect(root.querySelector('.btn--primary')!.textContent).toContain('Entregar el aviso');
    expect(done).not.toHaveBeenCalled();
    primary();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('starts replay with no old selections, hints, practice progress or completion', () => {
    const fixture = create();
    practice(fixture.componentInstance);
    findPracticeExtremes(fixture.componentInstance);
    fixture.componentInstance.answerRange(5);
    fixture.componentInstance.explainRange('separation');
    fixture.componentInstance.finish();
    fixture.destroy();
    const game = create().componentInstance;
    expect(game.stage()).toBe('extremes');
    expect(game.selectedMinId()).toBeNull();
    expect(game.selectedMaxId()).toBeNull();
    expect(game.round()).toBe(0);
    expect(game.practiceHelped()).toBe(false);
    expect(game.feedback()).toBe('');
    expect(game.step()).toBe(1);
  });
});
