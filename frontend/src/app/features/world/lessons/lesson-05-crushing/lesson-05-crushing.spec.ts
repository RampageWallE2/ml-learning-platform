import { TestBed } from '@angular/core/testing';
import { Lesson05Crushing } from './lesson-05-crushing';
import { LESSON_05_CRUSHING } from '../data/lesson-05-crushing.data';

describe('Lesson05Crushing', () => {
  function create() {
    const fixture = TestBed.createComponent(Lesson05Crushing);
    fixture.detectChanges();
    return fixture;
  }

  function reachPractice(game: Lesson05Crushing): void {
    game.answerDistance(20);
    game.compare('same');
    game.startPractice();
  }

  function correctReading(game: Lesson05Crushing) {
    return game
      .readingChoices()
      .find(
        (choice) => choice.deviation === game.delta() && choice.distance === Math.abs(game.delta()),
      )!;
  }

  function solvePractice(game: Lesson05Crushing): void {
    for (let index = 0; index < 3; index += 1) game.chooseReading(correctReading(game).id);
  }

  function click(root: HTMLElement, label: string): void {
    const button = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((button) => {
      const text = button.classList.contains('reading-choice')
        ? Array.from(button.children)
            .map((child) => child.textContent)
            .join(' ')
        : button.textContent;
      return text?.replace(/\s+/g, ' ').trim() === label;
    });
    expect(button, 'Button: ' + label).toBeDefined();
    button!.click();
  }

  it('uses shared answer controls and one named evidence region throughout the lesson', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    const check = () => {
      fixture.detectChanges();
      expect(root.querySelector('.crushing-lesson')).toBeNull();
      expect(root.querySelector('.lesson-tag__number')!.textContent).toBe('Clase 5');
      expect(root.querySelectorAll('.workbench')).toHaveLength(1);
      const board = root.querySelector('.feed-board')!;
      expect(board.getAttribute('role')).toBe('region');
      expect(board.getAttribute('aria-labelledby')).toBe('crushing-evidence-title');
      expect(root.querySelector('#crushing-evidence-title')!.textContent).not.toBe('');
      expect(board.querySelectorAll('.data-point')).toHaveLength(4);
      expect(board.querySelectorAll('.shared-axis span')).toHaveLength(5);
      expect(root.querySelectorAll('.record-card')).toHaveLength(4);
      expect(root.querySelector('.evidence-context')!.textContent).toContain('no es una meta');
      const records = root.querySelector('.record-cards')!;
      expect(records.getAttribute('role')).toBe('group');
      expect(records.getAttribute('aria-label')).toBe(
        game.practicing() ? 'Datos de la práctica' : 'Datos originales',
      );
      root.querySelectorAll('.answer-choice').forEach((answer) => {
        expect(answer.classList.contains('btn--answer')).toBe(true);
      });
      expect(root.querySelector('input, textarea, form, select')).toBeNull();
    };
    check();
    expect(root.querySelectorAll('.choices--distance .btn--answer')).toHaveLength(3);
    game.answerDistance(20);
    check();
    game.compare('same');
    check();
    game.startPractice();
    check();
    solvePractice(game);
    check();
  });

  it('keeps one graph as primary evidence and places supporting detail separately', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    const primary = root.querySelector('.workbench > .primary-evidence')!;
    expect(primary.getAttribute('aria-labelledby')).toBe('crushing-evidence-title');
    expect(primary.querySelectorAll('.value-track')).toHaveLength(1);
    expect(primary.querySelectorAll('button.record-card')).toHaveLength(4);
    expect(root.querySelectorAll('button.record-card')).toHaveLength(4);
    game.select(2);
    fixture.detectChanges();
    expect(primary.querySelector('.current-reading')!.textContent).toContain('Hora 3:');
    expect(primary.querySelector('.current-reading')!.textContent).toContain('120 t/h');
    expect(root.querySelector('.evidence-context')!.textContent).toContain(
      'línea azul discontinua',
    );
  });

  it('updates the focused practice reading without leaking the answer or hiding any observation', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    reachPractice(game);
    for (let index = 0; index < 3; index += 1) {
      fixture.detectChanges();
      const primary = root.querySelector('.primary-evidence')!;
      expect(primary.querySelector('.current-reading')!.textContent).toContain(
        game.current() + ' t/h',
      );
      expect(primary.querySelector('.mean-summary strong')!.textContent).toContain(
        game.mean() + ' t/h',
      );
      expect(primary.textContent).not.toMatch(/Desviación:|Separación:|por debajo|por encima/);
      expect(primary.querySelectorAll('.data-point')).toHaveLength(4);
      expect(root.querySelectorAll('.evidence-context .record-card')).toHaveLength(4);
      expect(root.querySelectorAll('.value-track')).toHaveLength(1);
      expect(root.querySelector('.evidence-context details')).toBeNull();
      game.chooseReading(correctReading(game).id);
    }
  });

  it('links each hour selection to its highlighted point and distance without moving observations', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    const buttons = [...root.querySelectorAll<HTMLButtonElement>('button.record-card')];
    const points = [...root.querySelectorAll<HTMLElement>('.data-point')];
    const positions = points.map((point) => point.getAttribute('style'));
    buttons.forEach((button, index) => {
      expect(button.classList.contains('btn--answer')).toBe(true);
      expect(button.getAttribute('aria-describedby')).toBe('crushing-selection-note');
      button.click();
      fixture.detectChanges();
      expect(game.selected()).toBe(index);
      expect(root.querySelectorAll('.point--active')).toHaveLength(1);
      expect(root.querySelector('.point--active')).toBe(points[index]);
      expect(root.querySelector('button[aria-pressed="true"]')).toBe(button);
      expect(root.querySelector('.value-track')!.getAttribute('aria-label')).toContain(
        'Dato seleccionado: ' + game.original[index],
      );
      const segment = root.querySelector<HTMLElement>('.distance-segment')!;
      expect(segment.style.left).toBe(index < 2 ? '0%' : '50%');
      expect(segment.style.width).toBe('50%');
      expect(segment.querySelector('span')).toBeNull();
      expect(points.map((point) => point.getAttribute('style'))).toEqual(positions);
      expect(game.original).toEqual([80, 80, 120, 120]);
    });
  });

  it('keeps practice records informational and does not reveal the signed answer on the plot', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    reachPractice(game);
    for (let index = 0; index < 3; index += 1) {
      fixture.detectChanges();
      expect(root.querySelectorAll('button.record-card')).toHaveLength(0);
      expect(root.querySelectorAll('div.record-card')).toHaveLength(4);
      expect(root.querySelectorAll('.record--active')).toHaveLength(1);
      expect(root.querySelectorAll('.point--active')).toHaveLength(1);
      expect(root.querySelectorAll('.choices .reading-choice.btn--answer')).toHaveLength(3);
      expect(root.querySelectorAll('.distance-segment span')).toHaveLength(0);
      expect(root.querySelector('.word-pair, .notation-cards, .selection-note')).toBeNull();
      expect(root.querySelector('.feedback')).toBeNull();
      expect(root.querySelector('.feed-board')!.textContent).not.toMatch(/Desviación|Separación:/);
      expect(root.querySelector('.mean-line')!.getAttribute('style')).toContain('left: 50%');
      expect(root.querySelectorAll('.distance-segment')).toHaveLength(index === 2 ? 0 : 1);
      game.chooseReading(correctReading(game).id);
    }
    expect(game.stage()).toBe('report');
    expect(game.practiceHelped()).toBe(false);
  });

  it('starts with a purpose, all original observations and the given mean, without a form', () => {
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.textContent).toContain(
      'completar el aviso de alimentación para el siguiente turno',
    );
    expect(root.textContent).toContain('Promedio: 100 t/h');
    expect(root.textContent).toContain('no es una meta de producción');
    expect(root.textContent).toContain('¿Cuánto le falta a 80 para llegar a 100?');
    expect(root.querySelector('.workbench')!.textContent).not.toContain('Desviación');
    expect(root.querySelectorAll('.data-point')).toHaveLength(4);
    expect(root.querySelectorAll('.record-card')).toHaveLength(4);
    expect(root.querySelector('input, textarea, form, select')).toBeNull();
  });

  it('stacks duplicates, retains every original value and uses a common linear scale', () => {
    const game = create().componentInstance;
    expect(game.original).toEqual([80, 80, 120, 120]);
    expect(game.mean()).toBe(100);
    expect(game.points().map((point) => point.bottom)).toEqual([32, 54, 32, 54]);
    expect(game.points().map((point) => point.x)).toEqual([0, 0, 100, 100]);
    expect(game.points().map((point) => point.id)).toEqual([0, 1, 2, 3]);
    expect(game.ticks.map((tick) => game.position(tick))).toEqual([0, 25, 50, 75, 100]);
    expect(game.plotDescription()).toContain('80, 80, 120, 120');
    expect(game.plotDescription()).toContain('Promedio 100');
  });

  it('lets the player select any original hour without modifying the data', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    root.querySelector<HTMLButtonElement>('[aria-label="Hora 3: 120 toneladas por hora"]')!.click();
    fixture.detectChanges();
    expect(game.current()).toBe(120);
    expect(game.delta()).toBe(20);
    expect(root.textContent).toContain('¿Cuánto supera 120 a 100?');
    expect(game.segments()[0]).toMatchObject({ left: 50, width: 50, above: true });
    expect(root.querySelector('[aria-pressed="true"]')?.getAttribute('aria-label')).toContain(
      'Hora 3',
    );
    game.select(1);
    expect(game.current()).toBe(80);
    expect(game.segments()[0]).toMatchObject({ left: 0, width: 50, above: false });
    for (const invalid of [-1, 4, 0.5, NaN]) game.select(invalid);
    expect(game.selected()).toBe(1);
    expect(game.original).toEqual([80, 80, 120, 120]);
  });

  it('ignores out-of-order actions and invalid answers', () => {
    const game = create().componentInstance;
    const done = vi.fn();
    game.completed.subscribe(done);
    game.compare('same');
    game.startPractice();
    game.chooseReading('a');
    game.continueAfterHelp();
    game.chooseReport('observed');
    game.finish();
    game.answerDistance(-20);
    game.answerDistance(NaN);
    expect(game.stage()).toBe('explore');
    expect(game.solvedCount()).toBe(0);
    expect(done).not.toHaveBeenCalled();
    expect(game.feedback()).toBe('');
  });

  it('explains an incorrect separation on the same records', () => {
    const game = create().componentInstance;
    game.answerDistance(80);
    expect(game.stage()).toBe('explore');
    expect(game.feedback()).toContain('dos pasos de 10');
    expect(game.values()).toEqual([80, 80, 120, 120]);
    game.answerDistance(10);
    expect(game.stage()).toBe('explore');
    game.answerDistance(20);
    expect(game.stage()).toBe('compare');
    expect(game.feedback()).toBe('');
    expect(game.practiceHelped()).toBe(false);
  });

  it('compares equal lengths on opposite sides before introducing signed notation', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    game.answerDistance(20);
    fixture.detectChanges();
    expect(game.segments().map((segment) => segment.width)).toEqual([50, 50]);
    expect(fixture.nativeElement.textContent).toContain('20 por debajo');
    expect(fixture.nativeElement.textContent).toContain('20 por encima');
    expect(fixture.nativeElement.querySelector('.workbench').textContent).not.toContain('Desviación');
    game.compare('higher-farther');
    game.compare('lower-closer');
    expect(game.stage()).toBe('compare');
    expect(game.feedback()).toContain('también hay 20');
    expect(game.values()).toEqual([80, 80, 120, 120]);
    game.compare('same');
    expect(game.stage()).toBe('notation');
  });

  it('connects words with negative and positive deviations and nonnegative distances', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    game.answerDistance(20);
    game.compare('same');
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.textContent).toContain('El signo muestra el lado');
    const cards = root.querySelectorAll('.notation-cards > div');
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain('−20 t/h');
    expect(cards[1].textContent).toContain('+20 t/h');
    expect(cards[0].textContent).toContain('Separación: 20 t/h');
    expect(cards[1].textContent).toContain('Separación: 20 t/h');
    expect(root.textContent).toContain('Desviación = dato − promedio');
    expect(root.textContent).toContain('La separación no lleva signo negativo');
    expect(root.textContent).not.toMatch(/varianza|cuadrado/i);
  });

  it('starts independent practice with the planned values and no inherited help', () => {
    const game = create().componentInstance;
    game.answerDistance(10);
    game.answerDistance(20);
    game.compare('higher-farther');
    game.compare('same');
    game.startPractice();
    expect(game.stage()).toBe('practice');
    expect(game.values()).toEqual([80, 100, 110, 110]);
    expect(game.current()).toBe(80);
    expect(game.mean()).toBe(100);
    expect(game.solvedCount()).toBe(0);
    expect(game.practiceHelped()).toBe(false);
    expect(game.feedback()).toBe('');
    game.select(2);
    expect(game.current()).toBe(80);
  });

  it('requires one below, one above and one equal case before preparing the report', () => {
    const game = create().componentInstance;
    reachPractice(game);
    expect(game.delta()).toBe(-20);
    expect(game.segments()[0]).toMatchObject({ left: 0, width: 50, above: false });
    game.chooseReading(correctReading(game).id);
    expect(game.stage()).toBe('practice');
    expect(game.current()).toBe(110);
    expect(game.delta()).toBe(10);
    expect(game.segments()[0]).toMatchObject({ left: 50, width: 25, above: true });
    game.chooseReading(correctReading(game).id);
    expect(game.current()).toBe(100);
    expect(game.delta()).toBe(0);
    expect(game.segments()[0]).toMatchObject({ zero: true, width: 0 });
    game.chooseReading(correctReading(game).id);
    expect(game.solvedCount()).toBe(3);
    expect(game.stage()).toBe('report');
    expect(game.step()).toBe(3);
  });

  it('shows an asymmetric practice without hiding duplicate observations or giving the answer', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    reachPractice(game);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(game.points().map((point) => point.x)).toEqual([0, 50, 75, 75]);
    expect(game.points().map((point) => point.bottom)).toEqual([32, 32, 32, 54]);
    expect(root.querySelectorAll('.record-card')).toHaveLength(4);
    expect(root.querySelector('.value-track')?.getAttribute('aria-label')).toContain(
      '80, 100, 110, 110',
    );
    expect(root.querySelector('.value-track')?.getAttribute('aria-label')).toContain(
      'Promedio 100',
    );
    expect(root.textContent).toContain('Compáralo con el promedio de 100 t/h');
    expect(root.textContent).not.toContain('Media');
    expect(root.querySelector('.feedback')).toBeNull();
    expect(root.querySelectorAll('.reading-choice')).toHaveLength(3);
    expect(root.querySelector('input, textarea, form, select')).toBeNull();
    expect(
      game
        .readingChoices()
        .filter(
          (choice) =>
            choice.deviation === game.delta() && choice.distance === Math.abs(game.delta()),
        ),
    ).toHaveLength(1);
  });

  it('checks the actual separation instead of offering an obviously negative distance', () => {
    const game = create().componentInstance;
    reachPractice(game);
    const wrong = game.readingChoices().find((choice) => choice.distance === 10)!;
    expect(wrong.deviation).toBe(-10);
    expect(game.readingChoices().every((choice) => choice.distance >= 0)).toBe(true);
    game.chooseReading(wrong.id);
    expect(game.feedback()).toContain('Entre 80 y el promedio de 100 hay 20 t/h');
    expect(game.feedback()).toContain('tramo coloreado');
    expect(game.stage()).toBe('practice');
    expect(game.current()).toBe(80);
    expect(game.values()).toEqual([80, 100, 110, 110]);
    expect(game.solvedCount()).toBe(0);
    expect(game.practiceHelped()).toBe(true);
  });

  it('corrects the sign separately from the distance', () => {
    const game = create().componentInstance;
    reachPractice(game);
    game.chooseReading(
      game.readingChoices().find((choice) => choice.deviation === 20 && choice.distance === 20)!.id,
    );
    expect(game.feedback()).toContain('por debajo de 100');
    expect(game.feedback()).toContain('−20 t/h');
    game.chooseReading(correctReading(game).id);
    game.chooseReading(
      game.readingChoices().find((choice) => choice.deviation === -10 && choice.distance === 10)!
        .id,
    );
    expect(game.feedback()).toContain('por encima de 100');
    expect(game.feedback()).toContain('+10 t/h');
    expect(game.solvedCount()).toBe(1);
  });

  it('checks both zero distance and zero deviation when a record equals the mean', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    reachPractice(game);
    game.chooseReading(correctReading(game).id);
    game.chooseReading(correctReading(game).id);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.data-point')).toHaveLength(4);
    expect(fixture.nativeElement.querySelector('.distance-segment')).toBeNull();
    const unchanged = game.values();
    for (const wrong of game
      .readingChoices()
      .filter((choice) => choice.deviation !== 0 || choice.distance !== 0)) {
      game.chooseReading(wrong.id);
      expect(game.feedback()).toContain('justo en el promedio');
      expect(game.current()).toBe(100);
      expect(game.solvedCount()).toBe(2);
      expect(game.values()).toBe(unchanged);
    }
    game.chooseReading(correctReading(game).id);
    expect(game.stage()).toBe('review');
  });

  it('offers fresh practice only after a supported example is understood', () => {
    const game = create().componentInstance;
    reachPractice(game);
    game.chooseReading(
      game.readingChoices().find((choice) => choice.distance !== Math.abs(game.delta()))!.id,
    );
    const helpedValues = game.values();
    game.continueAfterHelp();
    expect(game.values()).toBe(helpedValues);
    solvePractice(game);
    expect(game.stage()).toBe('review');
    expect(game.values()).toBe(helpedValues);
    game.continueAfterHelp();
    expect(game.stage()).toBe('practice');
    expect(game.values()).toEqual([90, 110, 120, 120]);
    expect(game.mean()).toBe(110);
    expect(game.current()).toBe(90);
    expect(game.delta()).toBe(-20);
    expect(game.practiceHelped()).toBe(false);
    expect(game.solvedCount()).toBe(0);
    expect(game.feedback()).toBe('');
    solvePractice(game);
    expect(game.stage()).toBe('report');
  });

  it('keeps replacement means and plots accurate over repeated supported rounds', () => {
    const game = create().componentInstance;
    reachPractice(game);
    const expected = [
      [80, 100, 110, 110],
      [90, 110, 120, 120],
      [90, 100, 120, 90],
    ];
    for (let round = 0; round < 9; round += 1) {
      const values = expected[round % 3];
      expect(game.values()).toEqual(values);
      expect(game.mean()).toBe(values.reduce((sum, value) => sum + value, 0) / values.length);
      expect(game.points().map((point) => point.x)).toEqual(
        values.map((value) => game.position(value)),
      );
      expect(game.plotDescription()).toContain('Promedio ' + game.mean());
      expect(values.some((value) => value === game.mean())).toBe(true);
      expect(Math.abs(values[0] - game.mean())).not.toBe(Math.abs(values[2] - game.mean()));
      game.chooseReading(
        game.readingChoices().find((choice) => choice.distance !== Math.abs(game.delta()))!.id,
      );
      solvePractice(game);
      expect(game.stage()).toBe('review');
      game.continueAfterHelp();
    }
    expect(game.original).toEqual([80, 80, 120, 120]);
  });

  it('rotates unique reading choices and formats positive, negative and zero deviations', () => {
    const game = create().componentInstance;
    reachPractice(game);
    const correctIds: string[] = [];
    for (let index = 0; index < 3; index += 1) {
      const choices = game.readingChoices();
      expect(new Set(choices.map((choice) => choice.deviation + '/' + choice.distance)).size).toBe(
        3,
      );
      expect(choices.map((choice) => choice.id)).toEqual(['a', 'b', 'c']);
      expect(choices.every((choice) => choice.distance >= 0)).toBe(true);
      expect(choices.every((choice) => Math.abs(choice.deviation) === choice.distance)).toBe(true);
      const correct = correctReading(game);
      expect(correct.distance).toBeGreaterThanOrEqual(0);
      correctIds.push(correct.id);
      game.chooseReading(correct.id);
    }
    expect(new Set(correctIds).size).toBe(3);
    expect(game.signed(-20)).toBe('−20');
    expect(game.signed(20)).toBe('+20');
    expect(game.signed(0)).toBe('0');
  });

  it('keeps plausible choices stable after a hint rather than changing the current task', () => {
    const game = create().componentInstance;
    reachPractice(game);
    const choices = game.readingChoices();
    const wrong = choices.find((choice) => choice.distance !== Math.abs(game.delta()))!;
    game.chooseReading(wrong.id);
    expect(game.readingChoices()).toEqual(choices);
    expect(game.current()).toBe(80);
    expect(game.solvedCount()).toBe(0);
    game.chooseReading(correctReading(game).id);
    expect(game.current()).toBe(110);
    expect(game.feedback()).toBe('');
    expect(game.practiceHelped()).toBe(true);
  });

  it('ignores invalid readings without treating them as learning errors', () => {
    const game = create().componentInstance;
    reachPractice(game);
    game.chooseReading('invalid' as 'a');
    expect(game.stage()).toBe('practice');
    expect(game.feedback()).toBe('');
    expect(game.practiceHelped()).toBe(false);
    solvePractice(game);
    game.chooseReading('a');
    game.startPractice();
    game.compare('same');
    expect(game.stage()).toBe('report');
    expect(game.solvedCount()).toBe(3);
  });

  it('restores original evidence after practice with another mean', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    reachPractice(game);
    game.chooseReading(
      game.readingChoices().find((choice) => choice.distance !== Math.abs(game.delta()))!.id,
    );
    solvePractice(game);
    game.continueAfterHelp();
    expect(game.mean()).toBe(110);
    solvePractice(game);
    fixture.detectChanges();
    expect(game.values()).toEqual([80, 80, 120, 120]);
    expect(game.mean()).toBe(100);
    expect(game.points()).toHaveLength(4);
    expect(game.activeIndex()).toBeNull();
    game.chooseReport('observed');
    fixture.detectChanges();
    const report = fixture.nativeElement.querySelector('.report-card') as HTMLElement;
    expect(report.textContent).toContain('80, 80, 120 y 120');
    expect(report.textContent).toContain('−20, −20, +20 y +20');
    expect(report.textContent).toContain('Las cuatro separaciones son 20 t/h');
    expect(report.textContent).not.toContain('110');
  });

  it('corrects a constant-average claim and unsupported causes without changing the evidence', () => {
    const game = create().componentInstance;
    reachPractice(game);
    solvePractice(game);
    game.chooseReport('constant');
    expect(game.stage()).toBe('report');
    expect(game.feedback()).toContain('100 es el promedio');
    game.chooseReport('cause');
    expect(game.stage()).toBe('report');
    expect(game.feedback()).toContain('no dicen por qué ocurrieron');
    expect(game.values()).toEqual([80, 80, 120, 120]);
    game.chooseReport('invalid' as 'observed');
    expect(game.stage()).toBe('report');
    game.chooseReport('observed');
    expect(game.stage()).toBe('success');
  });

  it('requires the final report and emits completion only once', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const done = vi.fn();
    game.completed.subscribe(done);
    reachPractice(game);
    solvePractice(game);
    game.finish();
    expect(done).not.toHaveBeenCalled();
    game.chooseReport('observed');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('no dicen por qué cambió');
    expect(fixture.nativeElement.textContent).toContain('ni si cumple una meta');
    expect(fixture.nativeElement.textContent).toContain('no una meta');
    game.finish();
    game.finish();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('completes the entire lesson through the rendered buttons', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    const done = vi.fn();
    game.completed.subscribe(done);
    click(root, '20 t/h');
    fixture.detectChanges();
    click(root, 'Los dos están a 20 del promedio: uno debajo y otro encima.');
    fixture.detectChanges();
    click(root, 'Probar con otros datos →');
    fixture.detectChanges();
    for (let index = 0; index < 3; index += 1) {
      const correct = correctReading(game);
      click(
        root,
        'Desviación: ' +
          game.signed(correct.deviation) +
          ' t/h Separación: ' +
          correct.distance +
          ' t/h',
      );
      fixture.detectChanges();
    }
    expect(game.stage()).toBe('report');
    click(
      root,
      'El promedio fue 100 t/h. Dos horas estuvieron 20 por debajo y dos, 20 por encima.',
    );
    fixture.detectChanges();
    click(root, 'Entregar el aviso →');
    fixture.detectChanges();
    expect(done).toHaveBeenCalledTimes(1);
    expect(root.querySelector('input, textarea, form, select')).toBeNull();
  });

  it('renders a short hint and keeps all four practice points visible after a wrong choice', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    reachPractice(game);
    fixture.detectChanges();
    click(root, 'Desviación: −10 t/h Separación: 10 t/h');
    fixture.detectChanges();
    expect(root.textContent).toContain('Una pista');
    expect(root.textContent).toContain('Entre 80 y el promedio de 100 hay 20 t/h');
    expect(root.querySelectorAll('.data-point')).toHaveLength(4);
    expect(root.querySelectorAll('.record-card')).toHaveLength(4);
    expect(root.textContent).toContain('Práctica 1 de 3');
    expect(root.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it('starts a replay cleanly without retained completion, selection or practice help', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    reachPractice(game);
    solvePractice(game);
    game.chooseReport('observed');
    game.finish();
    fixture.destroy();
    const replay = create().componentInstance;
    expect(replay.stage()).toBe('explore');
    expect(replay.selected()).toBe(0);
    expect(replay.current()).toBe(80);
    expect(replay.round()).toBe(0);
    expect(replay.solvedCount()).toBe(0);
    expect(replay.practiceHelped()).toBe(false);
    expect(replay.feedback()).toBe('');
  });

  it('keeps the narrative focused on the original evidence using explained, everyday wording', () => {
    const dialogues = LESSON_05_CRUSHING.steps.filter((step) => step.type === 'dialogue');
    const text = dialogues
      .flatMap((step) => step.dialogue.messages)
      .map((message) => message.text)
      .join(' ');
    expect(text).toContain('siguiente turno');
    expect(text).toContain('80, 80, 120 y 120');
    expect(text).toContain('por debajo o por encima del promedio');
    expect(text).toContain('La desviación lleva −');
    expect(text).toContain('La separación es 20 t/h en ambos lados');
    expect(text).toContain('no dicen por qué cambió');
    expect(text).toContain('no una meta de producción');
    expect(text).not.toMatch(
      /coincide con la media|mirar los extremos|determina|explican su causa/i,
    );
  });
});
