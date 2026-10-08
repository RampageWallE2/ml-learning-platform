import { TestBed } from '@angular/core/testing';
import { Lesson04Workshop } from './lesson-04-workshop';

describe('Lesson04Workshop', () => {
  function create() {
    const fixture = TestBed.createComponent(Lesson04Workshop);
    fixture.detectChanges();
    return fixture;
  }

  function practice(game: Lesson04Workshop) {
    game.compare('a');
    game.startPractice();
  }

  it('starts with the mission, complete records and range summaries without repeated calculations', () => {
    const fixture = create();
    const root = fixture.nativeElement as HTMLElement;
    expect(fixture.componentInstance.stage()).toBe('compare');
    expect(root.querySelector('.lesson-header')!.textContent).toContain(
      'organizar las revisiones del siguiente turno',
    );
    expect(root.querySelectorAll('.time-row')).toHaveLength(2);
    expect(root.querySelectorAll('.time-point')).toHaveLength(10);
    expect(root.querySelectorAll('.range-pill')).toHaveLength(2);
    expect(root.querySelector('.task-card h3')!.textContent?.trim())
      .toBe('¿Qué diferencia ves al mirar todos los tiempos?');
    expect(fixture.componentInstance.compareChoices.map(choice => choice.text)).toEqual([
      'Cada tiempo aparece la misma cantidad de veces en A y B.',
      'En A hay más revisiones de 10 minutos que en B.',
      'En B hay más revisiones de 10 minutos que en A.',
    ]);
    expect([...root.querySelectorAll('.choices .answer-choice')].map(button => button.textContent?.trim()))
      .toEqual(fixture.componentInstance.compareChoices.map(choice => choice.text));
    expect(root.querySelector('.task-card')!.textContent).toContain('Cuenta cuántos puntos hay sobre cada número');
    expect(root.querySelector('.report-claim')!.textContent).toContain(
      'ambos equipos tienen el mismo rango',
    );
    expect(root.querySelector('.report-claim')!.textContent).toContain('Cada tiempo se repite igual');
    expect(root.querySelectorAll('input, textarea, form')).toHaveLength(0);
    expect(root.textContent).not.toMatch(/distribución interior|simétricamente/);
  });




  it('preserves original and first-practice data on one common numeric scale', () => {
    const game = create().componentInstance;
    expect(game.records.map((group) => [...group.values])).toEqual([
      [8, 10, 10, 10, 12],
      [8, 8, 10, 12, 12],
    ]);
    expect(game.practiceRecords().map((group) => [...group.values])).toEqual([
      [6, 8, 8, 8, 10],
      [6, 6, 8, 10, 10],
    ]);
    expect(game.position(6)).toBe(0);
    expect(game.position(10)).toBe(50);
    expect(game.position(14)).toBe(100);
    for (const plot of game.plots()) {
      expect(plot.minimum).toBe(8);
      expect(plot.maximum).toBe(12);
      expect(plot.range).toBe(4);
      for (const point of plot.points) expect(point.x).toBe(game.position(point.value));
    }
  });

  it('stacks every repeated observation instead of hiding points', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const repeated = game.plots()[0].points.filter((point) => point.value === 10);
    expect(repeated.map((point) => point.bottom)).toEqual([14, 34, 54]);
    expect(new Set(repeated.map((point) => point.x)).size).toBe(1);
    expect(new Set(repeated.map((point) => point.id)).size).toBe(3);
    expect(game.plots().every(plot => plot.description.includes('los puntos uno sobre otro tienen el mismo tiempo'))).toBe(true);
    expect(
      fixture.nativeElement.querySelectorAll('.time-row')[0].querySelectorAll('.time-point'),
    ).toHaveLength(5);
    expect(fixture.nativeElement.querySelector('.chart-key').textContent).toContain(
      'Los puntos uno sobre otro tienen el mismo tiempo',
    );
  });

  it('keeps original records after incorrect comparisons and explains the visible evidence', () => {
    const game = create().componentInstance;
    const before = game.groups();
    game.compare('same');
    expect(game.feedback()).toContain('en A hay tres y en B hay uno');
    game.compare('b');
    expect(game.stage()).toBe('compare');
    expect(game.groups()).toBe(before);
    expect(game.practiceHelped()).toBe(false);
    game.compare('a');
    expect(game.stage()).toBe('discovery');
    expect(game.feedback()).toBe('');
  });














  it('requires both a correction and supporting evidence before completion', () => {
    const game = create().componentInstance;
    const done = vi.fn();
    game.completed.subscribe(done);
    practice(game);
    game.chooseEvidence('a');
    expect(game.stage()).toBe('practice');
    game.chooseClaim('invalid' as 'different');
    expect(game.feedback()).toBe('');
    game.chooseClaim('different');
    expect(game.stage()).toBe('evidence');
    game.chooseEvidence('invalid' as 'a');
    game.finish();
    expect(game.stage()).toBe('evidence');
    expect(done).not.toHaveBeenCalled();
    game.chooseEvidence('a');
    expect(game.stage()).toBe('success');
    game.finish();
    game.finish();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('preserves the same example after incorrect claims until the learner understands it', () => {
    const game = create().componentInstance;
    practice(game);
    const before = game.groups();
    game.chooseClaim('same');
    expect(game.feedback()).toContain('solo dice que hay la misma diferencia');
    game.chooseClaim('unknown');
    expect(game.feedback()).toContain('Sí tenemos los datos');
    expect(game.groups()).toBe(before);
    expect(game.stage()).toBe('practice');
    expect(game.practiceHelped()).toBe(true);
    game.continueAfterHelp();
    expect(game.round()).toBe(0);
    game.chooseClaim('different');
    game.chooseEvidence('a');
    expect(game.stage()).toBe('review');
    expect(game.groups()).toBe(before);
  });

  it('acknowledges equal ranges as true but insufficient evidence of an interior difference', () => {
    const game = create().componentInstance;
    practice(game);
    game.chooseClaim('different');
    const before = game.groups();
    game.chooseEvidence('range');
    expect(game.feedback()).toContain('Eso es cierto, pero no muestra la diferencia');
    expect(game.stage()).toBe('evidence');
    expect(game.groups()).toBe(before);
    game.chooseEvidence('b');
    expect(game.feedback()).toContain('hay 3 en C y 1 en D');
    game.chooseEvidence('a');
    expect(game.stage()).toBe('review');
  });

  it('requires a new unassisted example after support, reversing the concentrated side', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const done = vi.fn();
    game.completed.subscribe(done);
    practice(game);
    game.chooseClaim('same');
    game.chooseClaim('different');
    game.chooseEvidence('a');
    fixture.detectChanges();
    expect(game.stage()).toBe('review');
    expect(fixture.nativeElement.querySelector('.task-card').textContent).toContain(
      'C tiene más revisiones',
    );
    expect(fixture.nativeElement.querySelector('.task-card').textContent.replace(/\s+/g, ' '))
      .toContain('3 en C y 1 en D');
    game.finish();
    expect(done).not.toHaveBeenCalled();
    game.continueAfterHelp();
    expect(game.stage()).toBe('practice');
    expect(game.round()).toBe(1);
    expect(game.practiceHelped()).toBe(false);
    expect(game.feedback()).toBe('');
    expect(game.groups().map((group) => group.id)).toEqual(['E', 'F']);
    expect(game.plots().map((plot) => plot.range)).toEqual([6, 6]);
    expect(game.center()).toBe(11);
    expect(game.centerCounts()).toEqual([1, 3]);
    expect(game.concentratedSide()).toBe('b');
    game.chooseClaim('different');
    game.chooseEvidence('a'); game.finish(); expect(done).not.toHaveBeenCalled();
    expect(game.stage()).toBe('evidence');
    game.chooseEvidence('b');
    expect(game.stage()).toBe('success');
    expect(game.guidedCompletion()).toBe(true); expect(game.practiceHelped()).toBe(true);
    game.continueAfterHelp(); expect(game.round()).toBe(1);
    game.finish();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('updates point counts, positions and evidence wording for each support example', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    practice(game);
    for (let round = 0; round < 3; round += 1) {
      fixture.componentRef.setInput('initialState', { stage: 'practice', experimentMode: 'apart',
        rangePrediction: 'same', separatedViewed: true, round, practiceHelped: false });
      fixture.detectChanges();
      expect(game.round()).toBe(round);
      expect(game.plots()[0].range).toBe(game.plots()[1].range);
      const expectedRange = [4, 6, 2][round];
      expect(game.plots()[0].range).toBe(expectedRange);
      expect(game.evidenceChoices()[0].text).toContain(game.center() + ' minutos');
      expect(game.evidenceChoices()[0].text).toContain('que en ' + game.practiceRecords()[1].id + '.');
      expect(game.evidenceChoices()[1].text).toContain('que en ' + game.practiceRecords()[0].id + '.');
      for (const plot of game.plots()) {
        expect(plot.points).toHaveLength(5);
        const uniquePositions = new Set(plot.points.map((point) => point.x + ':' + point.bottom));
        expect(uniquePositions.size).toBe(5);
        for (const point of plot.points) {
          expect(point.x).toBe(game.position(point.value));
          expect(point.x).toBeGreaterThanOrEqual(0);
          expect(point.x).toBeLessThanOrEqual(100);
        }
      }
      game.chooseClaim('same');
      game.chooseClaim('different');
      game.chooseEvidence(game.concentratedSide());
      expect(game.stage()).toBe(round === 0 ? 'review' : 'success');
      // Older reviews still explain their own data and offer an explicit finish.
      fixture.componentRef.setInput('initialState', { stage: 'review', experimentMode: 'apart',
        rangePrediction: 'same', separatedViewed: true, round, practiceHelped: true });
      fixture.detectChanges();
      const [first, second] = game.practiceRecords();
      expect(fixture.nativeElement.querySelector('.task-card').textContent.replace(/\s+/g, ' '))
        .toContain(game.centerCounts()[0] + ' en ' + first.id + ' y ' + game.centerCounts()[1] + ' en ' + second.id);
      game.continueAfterHelp();
    }
  });

  it('limits supported practice to one additional round and preserves the original mission evidence', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    practice(game);
    for (let round = 0; round < 2; round += 1) {
      expect(game.round()).toBe(round);
      game.chooseClaim('same');
      game.chooseClaim('different');
      game.chooseEvidence(game.concentratedSide());
      expect(game.stage()).toBe(round === 0 ? 'review' : 'success');
      game.continueAfterHelp();
    }
    game.chooseClaim('different');
    game.chooseEvidence(game.concentratedSide());
    fixture.detectChanges();
    expect(game.stage()).toBe('success');
    expect(game.guidedCompletion()).toBe(true);
    expect(game.practiceHelped()).toBe(true);
    expect(game.round()).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Completaste con ayuda');
    const report = fixture.nativeElement.querySelector('.lesson-conclusion').textContent;
    expect(Array.from(fixture.nativeElement.querySelectorAll('.conclusion-comparison tbody tr:first-child td')).map(value => (value as HTMLElement).textContent?.trim())).toEqual(['4 min', '4 min']);
    expect(Array.from(fixture.nativeElement.querySelectorAll('.conclusion-comparison tbody tr:last-child td')).map(value => (value as HTMLElement).textContent?.trim())).toEqual(['3', '1']);
    expect(report).not.toContain('Equipo F');
    expect(game.records.map((group) => [...group.values])).toEqual([
      [8, 10, 10, 10, 12],
      [8, 8, 10, 12, 12],
    ]);
  });


  it('explains the range directly while preserving both original teams and removing experimental actions', () => {
    const fixture = create(); const game = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    const before = game.records.map(group => [...group.values]);
    game.compare('a'); fixture.detectChanges();
    expect(game.stage()).toBe('discovery'); expect(game.step()).toBe(2);
    expect(game.groups()).toBe(game.records);
    expect(game.records.map(group => [...group.values])).toEqual(before);
    expect(game.groups().map(group => group.name)).toEqual(['Equipo A', 'Equipo B']);
    const explanation = root.querySelector('.task-card')!.textContent!.replace(/\s+/g, ' ');
    expect(explanation).toContain('El rango solo mira dos tiempos');
    expect(explanation).toContain('la revisión más corta duró 8 minutos y la más larga, 12');
    expect(explanation).toContain('12 − 8 = 4 minutos');
    expect(explanation).toContain('Si el tiempo menor y el mayor no cambian');
    expect(explanation).toContain('aunque haya más registros entre ellos');
    expect(explanation).toContain('Mismo rango no significa mismos tiempos');
    expect(root.querySelectorAll('.choices, .experiment-controls, .time-row--copy, .point--movable')).toHaveLength(0);
    expect(root.querySelectorAll('.point--pinned')).toHaveLength(4);
    expect(root.textContent).not.toMatch(/¿Cambiará el rango\?|Separar tiempos|Juntar tiempos|Copia de A/);
    expect(root.querySelector('.btn--primary')!.textContent).toContain('Corregir otro informe');
  });

  it('keeps labelled plots and moves focus to the explanation heading', async () => {
    const fixture = create(); const root = fixture.nativeElement as HTMLElement;
    fixture.componentInstance.compare('a'); fixture.detectChanges(); await fixture.whenStable();
    expect(root.querySelectorAll('#workshop-evidence-title')).toHaveLength(1);
    expect(root.querySelector('.time-board')!.getAttribute('role')).toBe('region');
    expect(root.querySelector('.time-board')!.getAttribute('aria-labelledby')).toBe('workshop-evidence-title');
    for (const row of Array.from(root.querySelectorAll('.time-row'))) {
      expect(row.getAttribute('aria-labelledby')).toBe(row.querySelector('h3')!.id);
    }
    expect(root.querySelectorAll('.shared-axis')).toHaveLength(1);
    expect(document.activeElement).toBe(root.querySelector('#workshop-task-title'));
  });

  it('rejects invalid answers and attempts to skip comparison or evidence', () => {
    const game = create().componentInstance; const done = vi.fn(); game.completed.subscribe(done);
    game.compare('invalid' as 'a'); game.startPractice(); game.chooseClaim('different');
    game.chooseEvidence('a'); game.continueAfterHelp(); game.finish();
    expect(game.stage()).toBe('compare'); expect(done).not.toHaveBeenCalled();
    game.compare('a'); game.chooseClaim('different'); game.chooseEvidence('a'); game.finish();
    expect(game.stage()).toBe('discovery'); expect(done).not.toHaveBeenCalled();
  });

  it('runs the shorter route through real buttons and waits for explicit delivery', () => {
    const fixture = create(); const root = fixture.nativeElement as HTMLElement;
    const done = vi.fn(); fixture.componentInstance.completed.subscribe(done);
    const choice = (index: number) => {
      root.querySelectorAll<HTMLButtonElement>('.choices .answer-choice')[index].click(); fixture.detectChanges();
    };
    const primary = () => {
      root.querySelector<HTMLButtonElement>('.btn--primary')!.click(); fixture.detectChanges();
    };
    choice(1); expect(fixture.componentInstance.stage()).toBe('discovery');
    primary(); expect(fixture.componentInstance.stage()).toBe('practice');
    choice(1); choice(0);
    const report = root.querySelector('.lesson-conclusion')!.textContent;
    expect(report).toContain('organizar las revisiones del siguiente turno');
    expect(report).toContain('No considerar iguales los tiempos solo porque sus rangos son iguales');
    expect(report).toContain('no dice qué equipo trabaja mejor'); expect(report).toContain('ni explica la causa');
    expect(root.querySelectorAll('input, textarea, form')).toHaveLength(0);
    expect(done).not.toHaveBeenCalled(); primary(); expect(done).toHaveBeenCalledOnce();
  });

  it('emits only the simplified state and restores a clean comparison on replay', () => {
    const fixture = create(); const game = fixture.componentInstance;
    const saved = vi.fn(); game.stateChanged.subscribe(saved);
    game.compare('a');
    expect(saved).toHaveBeenLastCalledWith({ stage: 'discovery', round: 0, practiceHelped: false });
    game.startPractice(); expect(game.feedback()).toBe(''); expect(game.practiceHelped()).toBe(false);
    game.chooseClaim('different'); game.chooseEvidence('a'); game.finish(); fixture.destroy();
    const fresh = create().componentInstance;
    expect(fresh.stage()).toBe('compare'); expect(fresh.round()).toBe(0);
    expect(fresh.practiceHelped()).toBe(false); expect(fresh.groups()).toBe(fresh.records);
  });

  it.each(['predict', 'experiment', 'explain'])('recovers the retired %s stage at the explanation without completing', stage => {
    const fixture = create(); const game = fixture.componentInstance;
    const done = vi.fn(); game.completed.subscribe(done);
    const saved = vi.fn(); game.stateChanged.subscribe(saved);
    fixture.componentRef.setInput('initialState', {
      stage, round: 0, practiceHelped: false,
      experimentMode: stage === 'predict' ? 'together' : 'apart',
      rangePrediction: stage === 'predict' ? null : 'same', separatedViewed: stage !== 'predict',
    });
    fixture.detectChanges();
    expect(game.stage()).toBe('discovery'); expect(game.groups()).toBe(game.records);
    expect(saved).toHaveBeenLastCalledWith({ stage: 'discovery', round: 0, practiceHelped: false });
    expect(done).not.toHaveBeenCalled();
  });

  it('restores a current practice state and ignores invalid input without erasing it', () => {
    const fixture = create(); const game = fixture.componentInstance;
    fixture.componentRef.setInput('initialState', { stage: 'practice', round: 1, practiceHelped: true });
    fixture.detectChanges();
    fixture.componentRef.setInput('initialState', { stage: 'practice', round: -1, practiceHelped: true });
    fixture.detectChanges();
    expect(game.stage()).toBe('practice'); expect(game.round()).toBe(1); expect(game.practiceHelped()).toBe(true);
  });
});
