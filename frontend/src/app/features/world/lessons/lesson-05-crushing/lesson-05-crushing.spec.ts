import { TestBed } from '@angular/core/testing';
import { Lesson05Crushing } from './lesson-05-crushing';

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
    return game.readingChoices().find(choice =>
      choice.deviation === game.delta() && choice.distance === Math.abs(game.delta()))!;
  }

  function solvePractice(game: Lesson05Crushing): void {
    for (let index = 0; index < 3; index += 1) game.chooseReading(correctReading(game).id);
  }

  function click(root: HTMLElement, label: string): void {
    const button = Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => {
        const text = button.classList.contains('reading-choice')
          ? Array.from(button.children).map(child => child.textContent).join(' ')
          : button.textContent;
        return text?.replace(/\s+/g, ' ').trim() === label;
      });
    expect(button, 'Button: ' + label).toBeDefined();
    button!.click();
  }

  it('starts with a purpose, all original observations and the given mean, without a form', () => {
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.textContent).toContain('completar el aviso de alimentación para el siguiente turno');
    expect(root.textContent).toContain('Media (promedio): 100 t/h');
    expect(root.textContent).toContain('no es una meta de producción');
    expect(root.textContent).toContain('¿Cuánto le falta a 80 para llegar a 100?');
    expect(root.textContent).not.toContain('Desviación');
    expect(root.querySelectorAll('.data-point')).toHaveLength(4);
    expect(root.querySelectorAll('.record-card')).toHaveLength(4);
    expect(root.querySelector('input, textarea, form, select')).toBeNull();
  });

  it('stacks duplicates, retains every original value and uses a common linear scale', () => {
    const game = create().componentInstance;
    expect(game.original).toEqual([80, 80, 120, 120]);
    expect(game.mean()).toBe(100);
    expect(game.points().map(point => point.bottom)).toEqual([32, 54, 32, 54]);
    expect(game.points().map(point => point.x)).toEqual([0, 0, 100, 100]);
    expect(game.points().map(point => point.id)).toEqual([0, 1, 2, 3]);
    expect(game.ticks.map(tick => game.position(tick))).toEqual([0, 25, 50, 75, 100]);
    expect(game.plotDescription()).toContain('80, 80, 120, 120');
    expect(game.plotDescription()).toContain('Media 100');
  });

  it('lets the player select any original hour without modifying the data', () => {
    const fixture = create(); const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    root.querySelector<HTMLButtonElement>('[aria-label="Hora 3: 120 toneladas por hora"]')!.click();
    fixture.detectChanges();
    expect(game.current()).toBe(120);
    expect(game.delta()).toBe(20);
    expect(root.textContent).toContain('¿Cuánto supera 120 a 100?');
    expect(game.segments()[0]).toMatchObject({ left: 50, width: 50, above: true });
    expect(root.querySelector('[aria-pressed="true"]')?.getAttribute('aria-label')).toContain('Hora 3');
    game.select(1);
    expect(game.current()).toBe(80);
    expect(game.segments()[0]).toMatchObject({ left: 0, width: 50, above: false });
    for (const invalid of [-1, 4, 0.5, NaN]) game.select(invalid);
    expect(game.selected()).toBe(1);
    expect(game.original).toEqual([80, 80, 120, 120]);
  });

  it('ignores out-of-order actions and invalid answers', () => {
    const game = create().componentInstance;
    const done = vi.fn(); game.completed.subscribe(done);
    game.compare('same'); game.startPractice(); game.chooseReading('a');
    game.continueAfterHelp(); game.chooseReport('observed'); game.finish();
    game.answerDistance(-20); game.answerDistance(NaN);
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
    const fixture = create(); const game = fixture.componentInstance;
    game.answerDistance(20); fixture.detectChanges();
    expect(game.segments().map(segment => segment.width)).toEqual([50, 50]);
    expect(fixture.nativeElement.textContent).toContain('20 por debajo');
    expect(fixture.nativeElement.textContent).toContain('20 por encima');
    expect(fixture.nativeElement.textContent).not.toContain('Desviación');
    game.compare('higher-farther'); game.compare('lower-closer');
    expect(game.stage()).toBe('compare');
    expect(game.feedback()).toContain('también hay 20');
    expect(game.values()).toEqual([80, 80, 120, 120]);
    game.compare('same');
    expect(game.stage()).toBe('notation');
  });

  it('connects words with negative and positive deviations and nonnegative distances', () => {
    const fixture = create(); const game = fixture.componentInstance;
    game.answerDistance(20); game.compare('same'); fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.textContent).toContain('El signo muestra el lado');
    const cards = root.querySelectorAll('.notation-cards > div');
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain('−20 t/h');
    expect(cards[1].textContent).toContain('+20 t/h');
    expect(cards[0].textContent).toContain('Distancia: 20 t/h');
    expect(cards[1].textContent).toContain('Distancia: 20 t/h');
    expect(root.textContent).toContain('Desviación = registro − media');
    expect(root.textContent).not.toMatch(/varianza|cuadrado/i);
  });

  it('starts independent practice with the planned values and no inherited help', () => {
    const game = create().componentInstance;
    game.answerDistance(10); game.answerDistance(20); game.compare('higher-farther');
    game.compare('same'); game.startPractice();
    expect(game.stage()).toBe('practice');
    expect(game.values()).toEqual([90, 100, 110]);
    expect(game.current()).toBe(90);
    expect(game.mean()).toBe(100);
    expect(game.solvedCount()).toBe(0);
    expect(game.practiceHelped()).toBe(false);
    expect(game.feedback()).toBe('');
    game.select(2);
    expect(game.current()).toBe(90);
  });

  it('requires one below, one above and one equal case before preparing the report', () => {
    const game = create().componentInstance;
    reachPractice(game);
    expect(game.delta()).toBe(-10);
    game.chooseReading(correctReading(game).id);
    expect(game.stage()).toBe('practice');
    expect(game.current()).toBe(110);
    expect(game.delta()).toBe(10);
    game.chooseReading(correctReading(game).id);
    expect(game.current()).toBe(100);
    expect(game.delta()).toBe(0);
    expect(game.segments()[0]).toMatchObject({ zero: true, width: 0 });
    game.chooseReading(correctReading(game).id);
    expect(game.solvedCount()).toBe(3);
    expect(game.stage()).toBe('report');
    expect(game.step()).toBe(3);
  });

  it('rejects negative distance while preserving the current example', () => {
    const game = create().componentInstance;
    reachPractice(game);
    const wrong = game.readingChoices().find(choice => choice.distance < 0)!;
    game.chooseReading(wrong.id);
    expect(game.feedback()).toContain('Nunca es negativa');
    expect(game.stage()).toBe('practice');
    expect(game.current()).toBe(90);
    expect(game.values()).toEqual([90, 100, 110]);
    expect(game.solvedCount()).toBe(0);
    expect(game.practiceHelped()).toBe(true);
  });

  it('corrects the sign separately from the distance', () => {
    const game = create().componentInstance;
    reachPractice(game);
    game.chooseReading(game.readingChoices().find(choice => choice.deviation === 10 && choice.distance === 10)!.id);
    expect(game.feedback()).toContain('por debajo de 100');
    expect(game.feedback()).toContain('−10 t/h');
    game.chooseReading(correctReading(game).id);
    game.chooseReading(game.readingChoices().find(choice => choice.deviation === -10 && choice.distance === 10)!.id);
    expect(game.feedback()).toContain('por encima de 100');
    expect(game.feedback()).toContain('+10 t/h');
    expect(game.solvedCount()).toBe(1);
  });

  it('checks both zero distance and zero deviation when a record equals the mean', () => {
    const fixture = create(); const game = fixture.componentInstance;
    reachPractice(game);
    game.chooseReading(correctReading(game).id); game.chooseReading(correctReading(game).id);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.data-point')).toHaveLength(3);
    expect(fixture.nativeElement.querySelector('.distance-segment')).toBeNull();
    const unchanged = game.values();
    for (const wrong of game.readingChoices().filter(choice => choice.deviation !== 0 || choice.distance !== 0)) {
      game.chooseReading(wrong.id);
      expect(game.feedback()).toContain('coincide con la media');
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
    game.chooseReading(game.readingChoices().find(choice => choice.distance < 0)!.id);
    const helpedValues = game.values();
    game.continueAfterHelp();
    expect(game.values()).toBe(helpedValues);
    solvePractice(game);
    expect(game.stage()).toBe('review');
    expect(game.values()).toBe(helpedValues);
    game.continueAfterHelp();
    expect(game.stage()).toBe('practice');
    expect(game.values()).toEqual([100, 110, 120]);
    expect(game.mean()).toBe(110);
    expect(game.current()).toBe(100);
    expect(game.delta()).toBe(-10);
    expect(game.practiceHelped()).toBe(false);
    expect(game.solvedCount()).toBe(0);
    expect(game.feedback()).toBe('');
    solvePractice(game);
    expect(game.stage()).toBe('report');
  });

  it('keeps replacement means and plots accurate over repeated supported rounds', () => {
    const game = create().componentInstance;
    reachPractice(game);
    const expected = [[90, 100, 110], [100, 110, 120], [80, 100, 120]];
    for (let round = 0; round < 9; round += 1) {
      const values = expected[round % 3];
      expect(game.values()).toEqual(values);
      expect(game.mean()).toBe(values.reduce((sum, value) => sum + value, 0) / 3);
      expect(game.points().map(point => point.x)).toEqual(values.map(value => game.position(value)));
      expect(game.plotDescription()).toContain('Media ' + game.mean());
      game.chooseReading(game.readingChoices().find(choice => choice.distance < 0)!.id);
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
      expect(new Set(choices.map(choice => choice.deviation + '/' + choice.distance)).size).toBe(3);
      expect(choices.map(choice => choice.id)).toEqual(['a', 'b', 'c']);
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

  it('ignores invalid readings without treating them as learning errors', () => {
    const game = create().componentInstance;
    reachPractice(game);
    game.chooseReading('invalid' as 'a');
    expect(game.stage()).toBe('practice');
    expect(game.feedback()).toBe('');
    expect(game.practiceHelped()).toBe(false);
    solvePractice(game);
    game.chooseReading('a'); game.startPractice(); game.compare('same');
    expect(game.stage()).toBe('report');
    expect(game.solvedCount()).toBe(3);
  });

  it('restores original evidence after practice with another mean', () => {
    const fixture = create(); const game = fixture.componentInstance;
    reachPractice(game);
    game.chooseReading(game.readingChoices().find(choice => choice.distance < 0)!.id);
    solvePractice(game); game.continueAfterHelp();
    expect(game.mean()).toBe(110);
    solvePractice(game); fixture.detectChanges();
    expect(game.values()).toEqual([80, 80, 120, 120]);
    expect(game.mean()).toBe(100);
    expect(game.points()).toHaveLength(4);
    expect(game.activeIndex()).toBeNull();
    game.chooseReport('observed'); fixture.detectChanges();
    const report = fixture.nativeElement.querySelector('.report-card') as HTMLElement;
    expect(report.textContent).toContain('80, 80, 120 y 120');
    expect(report.textContent).toContain('−20, −20, +20 y +20');
    expect(report.textContent).toContain('Las cuatro distancias son 20 t/h');
    expect(report.textContent).not.toContain('110');
  });

  it('corrects a constant-average claim and unsupported causes without changing the evidence', () => {
    const game = create().componentInstance;
    reachPractice(game); solvePractice(game);
    game.chooseReport('constant');
    expect(game.stage()).toBe('report');
    expect(game.feedback()).toContain('100 es el promedio');
    game.chooseReport('cause');
    expect(game.stage()).toBe('report');
    expect(game.feedback()).toContain('no explican su causa');
    expect(game.values()).toEqual([80, 80, 120, 120]);
    game.chooseReport('invalid' as 'observed');
    expect(game.stage()).toBe('report');
    game.chooseReport('observed');
    expect(game.stage()).toBe('success');
  });

  it('requires the final report and emits completion only once', () => {
    const fixture = create(); const game = fixture.componentInstance;
    const done = vi.fn(); game.completed.subscribe(done);
    reachPractice(game); solvePractice(game); game.finish();
    expect(done).not.toHaveBeenCalled();
    game.chooseReport('observed'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('no explica por qué cambió');
    expect(fixture.nativeElement.textContent).toContain('ni determina');
    expect(fixture.nativeElement.textContent).toContain('no una meta');
    game.finish(); game.finish();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('completes the entire lesson through the rendered buttons', () => {
    const fixture = create(); const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    const done = vi.fn(); game.completed.subscribe(done);
    click(root, '20 t/h'); fixture.detectChanges();
    click(root, 'Ambos están a 20 de la media, en lados contrarios.'); fixture.detectChanges();
    click(root, 'Probar con otros registros →'); fixture.detectChanges();
    for (let index = 0; index < 3; index += 1) {
      const correct = correctReading(game);
      click(root, 'Desviación: ' + game.signed(correct.deviation) + ' t/h Distancia: ' + correct.distance + ' t/h');
      fixture.detectChanges();
    }
    expect(game.stage()).toBe('report');
    click(root, 'El promedio fue 100 t/h: hubo dos horas 20 por debajo y dos horas 20 por encima.'); fixture.detectChanges();
    click(root, 'Entregar el aviso →'); fixture.detectChanges();
    expect(done).toHaveBeenCalledTimes(1);
    expect(root.querySelector('input, textarea, form, select')).toBeNull();
  });

  it('renders feedback and keeps all three practice points visible after a wrong choice', () => {
    const fixture = create(); const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    reachPractice(game); fixture.detectChanges();
    click(root, 'Desviación: −10 t/h Distancia: −10 t/h'); fixture.detectChanges();
    expect(root.textContent).toContain('Una pista');
    expect(root.textContent).toContain('Nunca es negativa');
    expect(root.querySelectorAll('.data-point')).toHaveLength(3);
    expect(root.querySelectorAll('.record-card')).toHaveLength(3);
    expect(root.textContent).toContain('Ensayo 1 de 3');
    expect(root.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it('starts a replay cleanly without retained completion, selection or practice help', () => {
    const fixture = create(); const game = fixture.componentInstance;
    reachPractice(game); solvePractice(game); game.chooseReport('observed'); game.finish();
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
});
