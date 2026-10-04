import { TestBed } from '@angular/core/testing';
import { Lesson02Ramp } from './lesson-02-ramp';

describe('Lesson02Ramp', () => {
  function create() {
    const fixture = TestBed.createComponent(Lesson02Ramp);
    fixture.detectChanges();
    return fixture;
  }

  function report(game: Lesson02Ramp) {
    game.showSharing();
    game.startReport();
  }

  function records(game: Lesson02Ramp) {
    report(game);
    game.assess('unknown');
    game.request('records');
  }

  function practice(game: Lesson02Ramp) {
    records(game);
    game.compare('b');
    game.startPractice();
  }

  it('starts with a visual example before asking about the reports', () => {
    const fixture = create();
    const root = fixture.nativeElement as HTMLElement;
    expect(fixture.componentInstance.stage()).toBe('learn');
    expect(root.textContent).toContain('¿Qué es el promedio?');
    expect(root.querySelectorAll('.example-truck')).toHaveLength(3);
    expect(root.querySelector('.report-grid')).toBeNull();
    expect(root.querySelector('.choices')).toBeNull();
    expect(root.querySelectorAll('input, textarea')).toHaveLength(0);
  });

  it('makes the next-shift plan the purpose of requesting the missing loads', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.lesson-header')!.textContent).toContain('plan de carga del siguiente turno');
    report(game);
    fixture.detectChanges();
    expect(root.querySelector('.task-card')!.textContent).toContain('organizar las entregas');
    expect(root.querySelector('.task-card')!.textContent).toContain('100 toneladas');
    expect(game.reportChoices().map(choice => choice.text)).toEqual([
      'Mantener el plan: las cargas fueron parecidas.',
      'Cambiar el plan de B: sus cargas variaron más.',
      'Pedir las cargas antes de decidir.',
    ]);
    game.assess('same');
    game.assess('b');
    expect(game.stage()).toBe('report');
    expect(game.feedback()).toContain('Para mantener o cambiar el plan');
    game.assess('unknown');
    fixture.detectChanges();
    expect(game.stage()).toBe('request');
    expect(root.querySelector('.task-card')!.textContent).toContain('antes de decidir sobre el plan');
    expect(root.querySelector('.value-track')).toBeNull();
  });

  it('illustrates equal sharing without changing the total or the real records', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    expect(game.exampleLoads()).toEqual([90, 100, 110]);
    const originals = game.turns.map(turn => [...turn.values]);
    game.showSharing();
    fixture.detectChanges();
    expect(game.exampleLoads()).toEqual([100, 100, 100]);
    expect(game.exampleLoads().reduce((sum, value) => sum + value, 0)).toBe(game.exampleTotal);
    expect(game.exampleTotal).toBe(300);
    expect(game.exampleMean).toBe(100);
    expect(game.turns.map(turn => [...turn.values])).toEqual(originals);
    expect(fixture.nativeElement.textContent).toContain('reparto imaginario');
    expect(fixture.nativeElement.textContent).toContain('90, 100 y 110');
    expect(fixture.nativeElement.querySelectorAll('.example-truck strong').length).toBe(3);
  });

  it('prevents skipping the introduction or deciding with an invalid answer', () => {
    const game = create().componentInstance;
    game.startReport();
    game.assess('unknown');
    game.request('records');
    game.compare('b');
    game.startPractice();
    game.answerPractice('unknown');
    game.explain('summary');
    game.continueAfterHelp();
    expect(game.stage()).toBe('learn');
    report(game);
    expect(game.stage()).toBe('report');
    expect(game.step()).toBe(2);
    game.showSharing();
    game.startPractice();
    game.assess('invalid' as 'unknown');
    expect(game.stage()).toBe('report');
    expect(game.feedback()).toBe('');
  });

  it('hides the records until the learner identifies the missing information and requests it', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    report(game);
    game.request('records');
    game.assess('same');
    game.assess('b');
    fixture.detectChanges();
    expect(game.stage()).toBe('report');
    expect(root.querySelectorAll('.report-sheet')).toHaveLength(2);
    expect(root.querySelectorAll('.value-track, .load-record')).toHaveLength(0);
    expect(root.textContent).not.toContain('98 t');
    game.assess('unknown');
    game.request('drivers');
    expect(game.feedback()).toContain('quién condujo');
    game.request('copy');
    expect(game.feedback()).toContain('Otra copia');
    fixture.detectChanges();
    expect(game.showRecords()).toBe(false);
    game.request('records');
    fixture.detectChanges();
    expect(game.stage()).toBe('records');
    expect(root.querySelectorAll('.load-record')).toHaveLength(10);
    expect(root.querySelectorAll('.load-point')).toHaveLength(10);
    expect(root.querySelectorAll('.mean-line')).toHaveLength(2);
    expect(root.querySelectorAll('.shared-axis')).toHaveLength(1);
    expect(game.turns.map(turn => game.average(turn.values))).toEqual([100, 100]);
  });

  it('retains the planned datasets and maps every record to the same numeric scale', () => {
    const game = create().componentInstance;
    expect(game.turns.map(turn => [...turn.values])).toEqual([
      [98, 101, 100, 99, 102], [80, 120, 90, 110, 100],
    ]);
    expect(game.position(80)).toBe(0);
    expect(game.position(100)).toBe(50);
    expect(game.position(120)).toBe(100);
    for (const plot of game.plots()) {
      expect(plot.mean).toBe(100);
      for (const point of plot.points) expect(point.x).toBe(game.position(point.value));
    }
  });

  it('lets a record highlight its point only when records are visible', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    game.selectLoad('A1');
    expect(game.selectedLoad()).toBeNull();
    records(game);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const button = root.querySelector<HTMLButtonElement>('.load-record')!;
    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelectorAll('.point--selected')).toHaveLength(1);
    expect(root.querySelector('.point-reading')!.textContent).toBe('98 t');
    game.selectLoad('missing');
    expect(game.selectedLoad()).toBe('A1');
  });

  it('requires comparing the revealed records before independent practice', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    records(game);
    const before = game.turns;
    game.startPractice();
    game.compare('a');
    game.compare('same');
    expect(game.stage()).toBe('records');
    expect(game.turns).toBe(before);
    game.compare('b');
    fixture.detectChanges();
    expect(game.stage()).toBe('discovery');
    expect(fixture.nativeElement.textContent).toContain('El resumen no basta para cerrar el plan');
    expect(fixture.nativeElement.textContent).toContain('no explican la causa');
    game.startPractice();
    expect(game.stage()).toBe('practice');
    expect(game.step()).toBe(3);
    expect(game.showRecords()).toBe(false);
    expect(game.reports()).toEqual([{ id: 'C', mean: 90 }, { id: 'D', mean: 90 }]);
  });

  it('labels practice as a separate request with a target that matches the current example', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    practice(game);
    fixture.detectChanges();
    expect(root.textContent).toContain('Ensayo: otro pedido de cargas');
    expect(root.querySelector('.task-card')!.textContent).toContain('90 toneladas');
    expect(root.querySelector('.task-card')!.textContent).not.toContain('100 toneladas');
    expect(game.reportChoices()[1].text).toContain('plan de D');
    game.answerPractice('same');
    game.answerPractice('unknown');
    game.explain('summary');
    game.continueAfterHelp();
    fixture.detectChanges();
    expect(root.querySelector('.task-card')!.textContent).toContain('95 toneladas');
    expect(game.reportChoices()[1].text).toContain('plan de F');
    expect(root.querySelector('.value-track')).toBeNull();
  });

  it('keeps the same practice reports after a hint rather than changing them immediately', () => {
    const game = create().componentInstance;
    practice(game);
    const before = game.reports();
    game.answerPractice('same');
    expect(game.stage()).toBe('practice');
    expect(game.reports()).toBe(before);
    expect(game.round()).toBe(0);
    expect(game.practiceHelped()).toBe(true);
    expect(game.feedback()).toContain('parecidas');
    game.answerPractice('b');
    game.continueAfterHelp();
    expect(game.round()).toBe(0);
    game.answerPractice('unknown');
    expect(game.stage()).toBe('reason');
    expect(game.reports()).toBe(before);
  });

  it('understands a supported example before requiring a fresh independent check', () => {
    const game = create().componentInstance;
    const done = vi.fn();
    game.completed.subscribe(done);
    practice(game);
    game.answerPractice('same');
    game.answerPractice('unknown');
    game.explain('summary');
    expect(game.stage()).toBe('review');
    expect(game.round()).toBe(0);
    game.finish();
    expect(done).not.toHaveBeenCalled();
    game.continueAfterHelp();
    expect(game.stage()).toBe('practice');
    expect(game.round()).toBe(1);
    expect(game.reports()).toEqual([{ id: 'E', mean: 95 }, { id: 'F', mean: 95 }]);
    expect(game.practiceHelped()).toBe(false);
    expect(game.feedback()).toBe('');
    game.answerPractice('unknown');
    game.explain('summary');
    expect(game.stage()).toBe('success');
  });

  it('keeps the same reports while correcting a wrong explanation', () => {
    const game = create().componentInstance;
    practice(game);
    game.answerPractice('unknown');
    const before = game.reports();
    game.explain('always-same');
    expect(game.stage()).toBe('reason');
    expect(game.reports()).toBe(before);
    expect(game.feedback()).toContain('no se parecían igual');
    game.explain('largest');
    expect(game.feedback()).toContain('no solo la más grande');
    game.explain('summary');
    expect(game.stage()).toBe('review');
    game.continueAfterHelp();
    game.answerPractice('unknown');
    game.explain('summary');
    expect(game.stage()).toBe('success');
  });

  it('keeps repeated support checks bounded and valid without exposing individual loads', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    practice(game);
    for (let round = 0; round < 10; round += 1) {
      expect(game.round()).toBe(round);
      expect(game.reports()[0].mean).toBe(game.reports()[1].mean);
      expect(game.reports().every(report => report.mean >= 80 && report.mean <= 120)).toBe(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.value-track')).toBeNull();
      game.answerPractice('b');
      game.answerPractice('unknown');
      game.explain('summary');
      game.continueAfterHelp();
    }
    game.answerPractice('unknown');
    game.explain('summary');
    expect(game.stage()).toBe('success');
  });

  it('emits once only after the independent answer and explanation', () => {
    const game = create().componentInstance;
    const done = vi.fn();
    game.completed.subscribe(done);
    game.finish();
    practice(game);
    game.answerPractice('unknown');
    game.finish();
    expect(done).not.toHaveBeenCalled();
    game.explain('summary');
    game.finish();
    game.finish();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('runs through real buttons with clear choices and no written or arithmetic answers', () => {
    const fixture = create();
    const root = fixture.nativeElement as HTMLElement;
    const primary = () => {
      root.querySelector<HTMLButtonElement>('.btn--primary')!.click();
      fixture.detectChanges();
    };
    const answer = (index: number) => {
      root.querySelectorAll<HTMLButtonElement>('.answer-choice')[index].click();
      fixture.detectChanges();
      expect(root.querySelectorAll('input, textarea')).toHaveLength(0);
    };
    primary();
    expect(root.querySelector('.mean-explanation')!.textContent).toContain('100 toneladas por camión');
    primary();
    answer(2);
    expect(root.textContent).toContain('¿Qué pedirías al encargado?');
    answer(1);
    answer(1);
    primary();
    answer(2);
    answer(1);
    expect(root.querySelector('.completion-card')).not.toBeNull();
    expect(root.querySelector('.completion-card')!.textContent).toContain('No cerrar el plan solo con promedios');
    expect(root.querySelector('.report-card')!.textContent).toContain('Mismo promedio: 100 t');
    expect(root.querySelector('.report-card')!.textContent).toContain('antes de mantener el plan');
    expect(root.querySelector('.report-card')!.textContent).toContain('no explican la causa');
    expect(root.querySelector('.lesson-actions')!.textContent).toContain('Entregar recomendación');
  });

  it('starts a replay at the example without previous answers, hints or redistribution', () => {
    const fixture = create();
    practice(fixture.componentInstance);
    fixture.componentInstance.answerPractice('unknown');
    fixture.componentInstance.explain('summary');
    fixture.destroy();
    const game = create().componentInstance;
    expect(game.stage()).toBe('learn');
    expect(game.redistributed()).toBe(false);
    expect(game.round()).toBe(0);
    expect(game.practiceHelped()).toBe(false);
    expect(game.selectedLoad()).toBeNull();
    expect(game.feedback()).toBe('');
  });
});
