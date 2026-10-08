import { TestBed } from '@angular/core/testing';
import { Lesson02Ramp } from './lesson-02-ramp';
import { LESSON_02_RAMP } from '../data/lesson-02-ramp.data';

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

  function solveReports(game: Lesson02Ramp) {
    game.answerPractice('unknown');
    game.answerPractice(game.correctPracticeAnswer());
  }

  it('keeps the question and named evidence in one workspace with the shared lesson theme', () => {
    const fixture = create();
    const root = fixture.nativeElement as HTMLElement;
    const lesson = root.querySelector('.intuitive-ramp')!;
    expect(lesson.classList.contains('ramp-lesson')).toBe(false);
    expect(root.querySelector('.lesson-tag__number')!.textContent).toBe('Clase 2');

    const verifyWorkspace = (title: string) => {
      const workbench = root.querySelector('.workbench')!;
      const evidence = workbench.querySelector('.evidence-board')!;
      expect(evidence.getAttribute('role')).toBe('region');
      expect(evidence.getAttribute('aria-labelledby')).toBe('ramp-evidence-title');
      expect(evidence.querySelector('#ramp-evidence-title')!.textContent).toBe(title);
      expect(root.querySelectorAll('#ramp-evidence-title')).toHaveLength(1);
      expect(workbench.querySelector('.task-card')!.getAttribute('aria-labelledby')).toBe(
        'ramp-task-title',
      );
      expect(workbench.querySelector('#ramp-task-title')).not.toBeNull();
    };

    verifyWorkspace('Ejemplo: tres camiones');
    report(fixture.componentInstance);
    fixture.detectChanges();
    verifyWorkspace('El informe para decidir el plan');
    fixture.componentInstance.assess('unknown');
    fixture.componentInstance.request('records');
    fixture.detectChanges();
    verifyWorkspace('Las cargas de cada camión');
  });

  it('uses shared answer controls throughout the unchanged investigation and practice', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    const verifyAnswers = () => {
      fixture.detectChanges();
      const answers = [...root.querySelectorAll<HTMLButtonElement>('.answer-choice')];
      expect(answers).toHaveLength(3);
      expect(
        answers.every(
          (button) => button.classList.contains('btn--answer') && button.type === 'button',
        ),
      ).toBe(true);
      expect(root.querySelectorAll('input, textarea')).toHaveLength(0);
    };

    report(game);
    verifyAnswers();
    game.assess('unknown');
    verifyAnswers();
    game.request('records');
    verifyAnswers();
    game.compare('b');
    game.startPractice();
    verifyAnswers();
    game.answerPractice('unknown');
    verifyAnswers();
    game.answerPractice('b');
    verifyAnswers();
  });

  it('retains turn labels and the mean legend while records use shared selection controls', () => {
    const fixture = create();
    records(fixture.componentInstance);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(
      [...root.querySelectorAll('.group-heading h3')].map((heading) =>
        heading.textContent?.replace(/\s+/g, ' ').trim(),
      ),
    ).toEqual(['ATurno A', 'BTurno B']);
    expect(root.querySelector('.chart-key')!.textContent).toContain(
      'La línea azul punteada marca el promedio.',
    );
    expect(root.querySelectorAll('.choices--turns .answer-choice')).toHaveLength(3);
    expect(
      [...root.querySelectorAll<HTMLElement>('.mean-line')].map((line) => line.style.left),
    ).toEqual(['50%', '50%']);
    const loads = [...root.querySelectorAll<HTMLButtonElement>('.load-record')];
    expect(loads).toHaveLength(10);
    expect(loads.every((button) => button.classList.contains('btn'))).toBe(true);
    loads[5].click();
    fixture.detectChanges();
    expect(loads[5].getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector('.cargo-row--second .point-reading')!.textContent).toBe('80 t');
    expect(
      root.querySelector('.cargo-row--second .value-track')!.getAttribute('aria-label'),
    ).toContain('80, 120, 90, 110, 100');
  });

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
    expect(root.querySelector('.lesson-header')!.textContent).toContain(
      'plan de carga del siguiente turno',
    );
    report(game);
    fixture.detectChanges();
    expect(root.querySelector('.task-card h3')!.textContent).toBe('¿Estos promedios bastan para saber qué turno tuvo las cargas más cercanas a 100 toneladas?');
    expect(root.querySelector('.task-card')!.textContent).toContain('Quienes reciben el material piden cargas cercanas a');
    expect(root.querySelector('.task-card')!.textContent).toContain('100 toneladas');
    expect(root.querySelector('.task-card')!.textContent).toContain('antes de preparar el siguiente turno');
    expect(game.reportChoices().map((choice) => choice.text)).toEqual([
      'Sí, ambos turnos tuvieron un promedio de 100 toneladas.',
      'Sí, todos los camiones llevaron 100 toneladas.',
      'No, necesitamos ver cuánto llevó cada camión.',
    ]);
    expect(Array.from(root.querySelectorAll('.answer-choice'), button => button.textContent!.trim()))
      .toEqual(game.reportChoices().map(choice => choice.text));
    game.assess('same');
    expect(game.stage()).toBe('report');
    game.assess('b');
    expect(game.stage()).toBe('report');
    expect(game.feedback()).toContain('Un promedio de 100 toneladas no significa que cada camión llevó esa cantidad.');
    expect(game.feedback()).toContain('necesitamos ver cuánto llevó cada camión');
    game.assess('unknown');
    fixture.detectChanges();
    expect(game.stage()).toBe('request');
    expect(root.querySelector('.task-card')!.textContent).toContain(
      'antes de decidir sobre el plan',
    );
    expect(root.querySelector('.value-track')).toBeNull();
  });

  it('illustrates equal sharing without changing the total or the real records', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    expect(game.exampleLoads()).toEqual([90, 100, 110]);
    const originals = game.turns.map((turn) => [...turn.values]);
    game.showSharing();
    fixture.detectChanges();
    expect(game.exampleLoads()).toEqual([100, 100, 100]);
    expect(game.exampleLoads().reduce((sum, value) => sum + value, 0)).toBe(game.exampleTotal);
    expect(game.exampleTotal).toBe(300);
    expect(game.exampleMean).toBe(100);
    expect(game.turns.map((turn) => [...turn.values])).toEqual(originals);
    const explanation = fixture.nativeElement.querySelector('.mean-explanation').textContent.replace(/\s+/g, ' ').trim();
    expect(explanation).toContain('Sumamos las cargas: 90 + 100 + 110 = 300 t.');
    expect(explanation).toContain('Dividimos entre 3 camiones: 300 ÷ 3 = 100.');
    expect(explanation).toContain('100 toneladas por camión');
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
    expect(root.querySelector('.task-card')!.textContent).toContain('El encargado te entregó las cargas');
    expect(root.querySelectorAll('.shared-axis')).toHaveLength(1);
    expect(game.turns.map((turn) => game.average(turn.values))).toEqual([100, 100]);
  });

  it('retains the planned datasets and maps every record to the same numeric scale', () => {
    const game = create().componentInstance;
    expect(game.turns.map((turn) => [...turn.values])).toEqual([
      [98, 101, 100, 99, 102],
      [80, 120, 90, 110, 100],
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
    expect(fixture.nativeElement.textContent).toContain('no nos dicen por qué pasó');
    game.startPractice();
    expect(game.stage()).toBe('practice');
    expect(game.step()).toBe(3);
    expect(game.showRecords()).toBe(false);
    expect(game.reports()).toEqual([
      { id: 'C', mean: 90 },
      { id: 'D', mean: 90 },
    ]);
  });

  it('contrasts a summary-only report with complete loads on the same practice screen', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    practice(game);
    fixture.detectChanges();
    expect(root.textContent).toContain('Práctica: solo vemos promedios');
    expect(root.querySelectorAll('.report-sheet')).toHaveLength(2);
    expect(root.querySelectorAll('.value-track, .load-record')).toHaveLength(0);
    expect(root.querySelector('.task-card')!.textContent).toContain('Primero, mira el resumen');
    expect(root.querySelector('.task-card')!.textContent).toContain('Por ahora solo ves promedios');
    expect(root.querySelector('.task-card')!.textContent).not.toContain('Ya tienes la carga de cada camión');
    game.answerPractice('a');
    game.answerPractice('unknown');
    fixture.detectChanges();
    expect(game.stage()).toBe('practice');
    expect(game.practiceCase()).toBe(1);
    expect(root.querySelectorAll('.report-sheet')).toHaveLength(0);
    expect(root.querySelectorAll('.value-track')).toHaveLength(2);
    expect(root.querySelectorAll('.load-record')).toHaveLength(10);
    expect(root.querySelector('.task-card')!.textContent).toContain('Ahora, compara las cargas');
    expect(root.textContent).toContain('Práctica: ya tenemos las cargas');
    expect(root.querySelector('.task-card')!.textContent).toContain('Ya tienes la carga de cada camión');
    expect(root.querySelector('.task-card')!.textContent).not.toContain('Por ahora solo ves promedios');
    expect(root.querySelectorAll('.answer-choice')).toHaveLength(3);
    game.answerPractice('b');
    game.explain('summary');
    game.continueAfterHelp();
    fixture.detectChanges();
    expect(game.reports()).toEqual([
      { id: 'E', mean: 95 },
      { id: 'F', mean: 95 },
    ]);
    expect(game.practiceChoices()[1].text).toContain('turno F');
    expect(game.practiceCase()).toBe(0);
    expect(root.querySelector('.value-track')).toBeNull();
    expect(root.querySelector('.task-card')!.textContent).toContain('Por ahora solo ves promedios');
  });

  it('keeps the same practice reports after a hint rather than changing them immediately', () => {
    const game = create().componentInstance;
    practice(game);
    const before = game.reports();
    game.answerPractice('a');
    expect(game.stage()).toBe('practice');
    expect(game.reports()).toBe(before);
    expect(game.round()).toBe(0);
    expect(game.practiceHelped()).toBe(true);
    expect(game.feedback()).toContain('Solo ves los promedios');
    game.answerPractice('b');
    game.continueAfterHelp();
    expect(game.round()).toBe(0);
    game.answerPractice('unknown');
    expect(game.stage()).toBe('practice');
    expect(game.practiceCase()).toBe(1);
    expect(game.reports()).toEqual(before);
  });

  it('does not reward asking for records that are already visible', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const done = vi.fn();
    game.completed.subscribe(done);
    practice(game);
    game.answerPractice('unknown');
    fixture.detectChanges();
    const reports = game.reports();
    const plots = game.plots();
    expect(game.showRecords()).toBe(true);
    expect(game.correctPracticeAnswer()).toBe('b');
    game.answerPractice('unknown');
    expect(game.stage()).toBe('practice');
    expect(game.practiceCase()).toBe(1);
    expect(game.feedback()).toContain('Aquí ya están todas las cargas');
    expect(game.feedback()).not.toContain('turno D');
    expect(game.practiceHelped()).toBe(true);
    expect(game.reports()).toBe(reports);
    expect(game.plots()).toBe(plots);
    game.explain('summary');
    game.continueAfterHelp();
    game.finish();
    expect(game.stage()).toBe('practice');
    expect(game.round()).toBe(0);
    expect(done).not.toHaveBeenCalled();
    game.answerPractice('b');
    game.explain('summary');
    expect(game.stage()).toBe('review');
    game.continueAfterHelp();
    game.answerPractice('unknown');
    expect(game.correctPracticeAnswer()).toBe('a');
    game.answerPractice('b');
    expect(game.stage()).toBe('practice');
    expect(game.feedback()).not.toContain('turno E');
    game.answerPractice('a');
    game.explain('summary');
    expect(game.stage()).toBe('success');
    expect(game.practiceHelped()).toBe(true);
    expect(game.guidedCompletion()).toBe(true);
  });

  it('ignores invalid values and out-of-order calls without counting them as learning mistakes', () => {
    const game = create().componentInstance;
    practice(game);
    for (const invalid of ['invalid', 'same', Number.NaN, undefined]) {
      game.answerPractice(invalid as 'a');
    }
    game.explain('summary');
    game.compare('b');
    game.request('records');
    game.continueAfterHelp();
    expect(game.stage()).toBe('practice');
    expect(game.practiceCase()).toBe(0);
    expect(game.practiceHelped()).toBe(false);
    expect(game.feedback()).toBe('');
    game.answerPractice('unknown');
    for (const invalid of ['invalid', 'same', Number.NaN, undefined]) {
      game.answerPractice(invalid as 'a');
    }
    game.explain('summary');
    game.finish();
    expect(game.practiceCase()).toBe(1);
    expect(game.practiceHelped()).toBe(false);
    expect(game.feedback()).toBe('');
    game.answerPractice('b');
    game.answerPractice('unknown');
    game.explain('invalid' as 'summary');
    expect(game.stage()).toBe('reason');
    expect(game.practiceHelped()).toBe(false);
    expect(game.feedback()).toBe('');
  });

  it('keeps all practice loads readable on the shared scale and allows highlighting them', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    practice(game);
    game.selectLoad('C1');
    expect(game.selectedLoad()).toBeNull();
    game.answerPractice('unknown');
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    for (const plot of game.plots()) {
      expect(plot.points).toHaveLength(5);
      expect(plot.description).toContain('Promedio de 90 toneladas');
      expect(plot.description).toContain('Escala de 80 a 120');
      for (const point of plot.points) expect(point.x).toBe(game.position(point.value));
    }
    expect(root.querySelectorAll('.shared-axis')).toHaveLength(1);
    root.querySelector<HTMLButtonElement>('.load-record')!.click();
    fixture.detectChanges();
    expect(game.selectedLoad()).toBe('C1');
    expect(root.querySelector('.point-reading')!.textContent).toBe('88 t');
    game.selectLoad('A1');
    expect(game.selectedLoad()).toBe('C1');
  });

  it('focuses the current question and hints across both practice reports and the explanation', async () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    practice(game);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(root.querySelector('#ramp-task-title'));
    for (const answer of ['a', 'b'] as const) {
      game.answerPractice(answer);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(document.activeElement).toBe(root.querySelector('.feedback'));
      expect(document.activeElement?.getAttribute('tabindex')).toBe('-1');
    }
    game.answerPractice('unknown');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.querySelector('.feedback')).toBeNull();
    expect(document.activeElement).toBe(root.querySelector('#ramp-task-title'));
    game.answerPractice('unknown');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(root.querySelector('.feedback'));
    game.answerPractice('b');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement?.textContent).toContain('¿Por qué ahora sí podemos comparar?');
    game.explain('largest');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(root.querySelector('.feedback'));
  });

  it('restores the original evidence for the recommendation instead of reporting the practice values', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    practice(game);
    game.answerPractice('a');
    solveReports(game);
    game.explain('summary');
    game.continueAfterHelp();
    expect(game.reports().map((report) => report.mean)).toEqual([95, 95]);
    solveReports(game);
    game.explain('summary');
    fixture.detectChanges();
    expect(game.stage()).toBe('success');
    expect(game.reports()).toEqual([
      { id: 'A', mean: 100 },
      { id: 'B', mean: 100 },
    ]);
    expect(game.plots().map((plot) => plot.id)).toEqual(['A', 'B']);
    expect(fixture.nativeElement.querySelector('.report-card').textContent).toContain(
      'Mismo promedio: 100 t',
    );
    expect(fixture.nativeElement.querySelector('.report-card').textContent).not.toContain('95');
  });

  it('uses simple narrative language without claiming that the loads explain their cause', () => {
    const text = LESSON_02_RAMP.steps
      .flatMap((step) =>
        step.type === 'dialogue' ? step.dialogue.messages.map((message) => message.text) : [],
      )
      .join(' ');
    expect(text).toContain('cargas cercanas a 100 toneladas');
    expect(text).toContain('Eso no explica por qué pasó');
    expect(text).toContain('hablaré con el equipo antes de cambiar el plan');
    expect(text).toContain('material de descarte');
    expect(text).toContain('encargado del botadero');
    expect(text).not.toContain('dispersión');
  });

  it('requires just one additional practice and allows its correct assisted explanation', () => {
    const game = create().componentInstance;
    const done = vi.fn();
    game.completed.subscribe(done);
    practice(game);
    game.answerPractice('a');
    solveReports(game);
    game.explain('summary');
    expect(game.stage()).toBe('review');
    expect(game.round()).toBe(0);
    game.finish();
    expect(done).not.toHaveBeenCalled();
    game.continueAfterHelp();
    expect(game.stage()).toBe('practice');
    expect(game.round()).toBe(1);
    expect(game.reports()).toEqual([
      { id: 'E', mean: 95 },
      { id: 'F', mean: 95 },
    ]);
    expect(game.practiceHelped()).toBe(false);
    expect(game.feedback()).toBe('');
    solveReports(game);
    game.explain('always-same');
    expect(game.stage()).toBe('reason'); game.finish(); expect(done).not.toHaveBeenCalled();
    game.explain('summary');
    expect(game.stage()).toBe('success');
    expect(game.practiceHelped()).toBe(true); expect(game.guidedCompletion()).toBe(true);
    game.continueAfterHelp(); expect(game.round()).toBe(1);
  });

  it('keeps the same reports while correcting a wrong explanation', () => {
    const game = create().componentInstance;
    practice(game);
    solveReports(game);
    const before = game.reports();
    game.explain('always-same');
    expect(game.stage()).toBe('reason');
    expect(game.reports()).toBe(before);
    expect(game.feedback()).toContain('información nueva');
    game.explain('largest');
    expect(game.feedback()).toContain('Una sola carga');
    game.explain('summary');
    expect(game.stage()).toBe('review');
    game.continueAfterHelp();
    solveReports(game);
    game.explain('summary');
    expect(game.stage()).toBe('success');
  });

  it('keeps current and older practice drafts coherent without forcing more supported rounds', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    practice(game);
    for (let round = 0; round < 10; round += 1) {
      fixture.componentRef.setInput('initialState', { stage: 'practice', redistributed: true,
        round, practiceCase: 0, practiceHelped: false, selectedLoad: null });
      fixture.detectChanges();
      expect(game.round()).toBe(round);
      expect(game.reports()[0].mean).toBe(game.reports()[1].mean);
      expect(game.reports().every((report) => report.mean >= 80 && report.mean <= 120)).toBe(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.value-track')).toBeNull();
      game.answerPractice('b');
      solveReports(game);
      expect(game.showRecords()).toBe(true);
      expect(
        game
          .practiceTurns()
          .every((turn) => turn.values.every((value) => value >= 80 && value <= 120)),
      ).toBe(true);
      expect(game.practiceTurns().map((turn) => game.average(turn.values))).toEqual(
        game.reports().map((report) => report.mean),
      );
      game.explain('summary');
      expect(game.stage()).toBe(round === 0 ? 'review' : 'success');
      game.continueAfterHelp();
    }
    solveReports(game);
    game.explain('summary');
    expect(game.stage()).toBe('success');
    expect(game.guidedCompletion()).toBe(true);
    expect(game.round()).toBe(9);
  });

  it('emits once only after both independent report decisions and the explanation', () => {
    const game = create().componentInstance;
    const done = vi.fn();
    game.completed.subscribe(done);
    game.finish();
    practice(game);
    game.answerPractice('unknown');
    game.finish();
    expect(done).not.toHaveBeenCalled();
    game.explain('summary');
    expect(game.stage()).toBe('practice');
    game.answerPractice('b');
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
    expect(root.querySelector('.mean-explanation')!.textContent).toContain(
      '100 toneladas por camión',
    );
    primary();
    answer(2);
    expect(root.textContent).toContain('¿Qué pedirías al encargado?');
    answer(1);
    answer(1);
    primary();
    answer(2);
    answer(1);
    answer(1);
    expect(root.querySelector('.completion-card')).not.toBeNull();
    expect(root.querySelector('.completion-card')!.textContent).toContain(
      'Pide solo la información que falta',
    );
    expect(root.querySelector('.report-card')!.textContent).toContain('Mismo promedio: 100 t');
    expect(root.querySelector('.report-card')!.textContent).toContain(
      'antes de decidir sobre el plan',
    );
    expect(root.querySelector('.report-card')!.textContent).toContain('no nos dicen por qué pasó');
    expect(root.querySelector('.lesson-actions')!.textContent).toContain('Entregar recomendación');
  });

  it('starts a replay at the example without previous answers, hints or redistribution', () => {
    const fixture = create();
    practice(fixture.componentInstance);
    solveReports(fixture.componentInstance);
    fixture.componentInstance.explain('summary');
    fixture.destroy();
    const game = create().componentInstance;
    expect(game.stage()).toBe('learn');
    expect(game.redistributed()).toBe(false);
    expect(game.round()).toBe(0);
    expect(game.practiceCase()).toBe(0);
    expect(game.practiceHelped()).toBe(false);
    expect(game.selectedLoad()).toBeNull();
    expect(game.feedback()).toBe('');
  });
});
