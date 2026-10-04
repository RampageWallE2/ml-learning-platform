import { TestBed } from '@angular/core/testing';
import { Lesson04Workshop } from './lesson-04-workshop';

describe('Lesson04Workshop', () => {
  function create() {
    const fixture = TestBed.createComponent(Lesson04Workshop);
    fixture.detectChanges();
    return fixture;
  }

  function experiment(game: Lesson04Workshop) { game.compare('a'); game.predictRange('same'); }
  function explain(game: Lesson04Workshop) {
    experiment(game);
    game.setExperiment('apart');
    game.showChanges();
  }
  function practice(game: Lesson04Workshop) {
    explain(game);
    game.explain('extremes');
    game.startPractice();
  }

  it('starts with the mission, complete records and range summaries without repeated calculations', () => {
    const fixture = create();
    const root = fixture.nativeElement as HTMLElement;
    expect(fixture.componentInstance.stage()).toBe('compare');
    expect(root.querySelector('.lesson-header')!.textContent).toContain('organizar las revisiones del siguiente turno');
    expect(root.querySelectorAll('.time-row')).toHaveLength(2);
    expect(root.querySelectorAll('.time-point')).toHaveLength(10);
    expect(root.querySelectorAll('.range-pill')).toHaveLength(2);
    expect(root.querySelector('.report-claim')!.textContent).toContain('ambos equipos tienen el mismo rango');
    expect(root.querySelectorAll('input, textarea, form')).toHaveLength(0);
    expect(root.textContent).not.toMatch(/distribución interior|simétricamente/);
  });

  it('preserves original and first-practice data on one common numeric scale', () => {
    const game = create().componentInstance;
    expect(game.records.map(group => [...group.values])).toEqual([
      [8, 10, 10, 10, 12], [8, 8, 10, 12, 12],
    ]);
    expect(game.practiceRecords().map(group => [...group.values])).toEqual([
      [6, 8, 8, 8, 10], [6, 6, 8, 10, 10],
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
    const repeated = game.plots()[0].points.filter(point => point.value === 10);
    expect(repeated.map(point => point.bottom)).toEqual([14, 34, 54]);
    expect(new Set(repeated.map(point => point.x)).size).toBe(1);
    expect(new Set(repeated.map(point => point.id)).size).toBe(3);
    expect(fixture.nativeElement.querySelectorAll('.time-row')[0].querySelectorAll('.time-point')).toHaveLength(5);
    expect(fixture.nativeElement.querySelector('.chart-key').textContent).toContain('Los puntos apilados tienen el mismo tiempo');
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
    expect(game.stage()).toBe('predict');
    expect(game.feedback()).toBe('');
  });

  it('ignores invalid answers and prevents skipping required stages', () => {
    const game = create().componentInstance;
    const done = vi.fn();
    game.completed.subscribe(done);
    game.compare('invalid' as 'a');
    game.predictRange('same');
    game.setExperiment('apart');
    game.showChanges();
    game.explain('extremes');
    game.startPractice();
    game.chooseClaim('different');
    game.chooseEvidence('a');
    game.continueAfterHelp();
    game.finish();
    expect(game.stage()).toBe('compare');
    expect(game.experimentMode()).toBe('together');
    expect(done).not.toHaveBeenCalled();
    experiment(game);
    game.setExperiment('invalid' as 'apart');
    expect(game.experimentMode()).toBe('together');
    expect(game.separatedViewed()).toBe(false);
  });

  it('shows only the original of A and its clearly labelled experimental copy', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    experiment(game);
    fixture.detectChanges();
    expect(game.groups().map(group => group.name)).toEqual(['Original de A', 'Copia de A · experimento']);
    expect(game.groups()[0].values).toBe(game.records[0].values);
    expect(game.groups()[1].values).toEqual(game.records[0].values);
    expect(fixture.nativeElement.querySelectorAll('.time-row')).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('.experiment-note').textContent).toContain('Solo cambia la copia');
    expect(fixture.nativeElement.querySelectorAll('.point--movable')).toHaveLength(2);
    expect(fixture.nativeElement.querySelectorAll('.point--pinned')).toHaveLength(4);
  });

  it('requires a prediction before changing the copy, without showing the outcome in advance', () => {
    const fixture = create(); const game = fixture.componentInstance;
    game.compare('a'); fixture.detectChanges(); const root = fixture.nativeElement as HTMLElement;
    expect(game.stage()).toBe('predict'); expect(game.step()).toBe(2);
    expect(game.rangePrediction()).toBeNull(); expect(game.predictionOutcome()).toBe('');
    expect(root.querySelector('.task-card h3')!.textContent).toContain('¿Cambiará el rango?');
    expect(root.querySelectorAll('.choices button')).toHaveLength(3);
    expect(root.querySelector('.experiment-controls')).toBeNull();
    expect(root.querySelector('.range-reading')).toBeNull();
    game.predictRange('invalid' as 'same'); game.setExperiment('apart'); game.showChanges();
    expect(game.stage()).toBe('predict'); expect(game.rangePrediction()).toBeNull();
    expect(game.simulated()).toEqual([8, 10, 10, 10, 12]);
    expect(game.separatedViewed()).toBe(false); expect(game.feedback()).toBe('');
  });

  it.each(['increase', 'same', 'decrease'] as const)('accepts prediction %s as a hypothesis and contrasts it only after the experiment', prediction => {
    const fixture = create(); const game = fixture.componentInstance; const done = vi.fn();
    game.completed.subscribe(done); game.compare('a'); game.predictRange(prediction); fixture.detectChanges();
    expect(game.stage()).toBe('experiment'); expect(game.rangePrediction()).toBe(prediction);
    expect(game.predictionOutcome()).toBe(''); expect(game.feedback()).toBe('');
    expect(game.practiceHelped()).toBe(false); expect(game.experimentMode()).toBe('together');
    game.predictRange(prediction === 'same' ? 'increase' : 'same');
    expect(game.rangePrediction()).toBe(prediction);
    game.showChanges(); expect(game.stage()).toBe('experiment');
    game.setExperiment('apart'); fixture.detectChanges();
    const result = fixture.nativeElement.querySelector('.range-reading').textContent;
    expect(result).toContain('El rango sigue siendo 4 minutos');
    expect(result).toContain('12 − 8 = 4');
    expect(result).toContain(prediction === 'same' ? 'Tu predicción coincide' : 'Pensabas que sería');
    expect(game.practiceHelped()).toBe(false); expect(done).not.toHaveBeenCalled();
    game.setExperiment('together'); expect(game.predictionOutcome()).toBe('');
    expect(game.rangePrediction()).toBe(prediction); expect(game.simulated()).toEqual(game.records[0].values);
  });

  it('preserves DOM points for animation and moves only the two copy diamonds, not the fixed records', () => {
    const fixture = create(); const game = fixture.componentInstance; experiment(game); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const rows = root.querySelectorAll('.time-row');
    const original = [...rows[0].querySelectorAll<HTMLElement>('.time-point')];
    const copy = [...rows[1].querySelectorAll<HTMLElement>('.time-point')];
    const positions = (points: HTMLElement[]) => points.map(point => point.style.left + ':' + point.style.bottom);
    const originalPositions = positions(original); const copyPositions = positions(copy);
    expect(rows[0].querySelector('.point--movable')).toBeNull();
    expect(rows[1].querySelectorAll('.point--movable')).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('.time-board .experiment-controls')).not.toBeNull();
    game.setExperiment('apart'); fixture.detectChanges();
    const changed = [...rows[1].querySelectorAll<HTMLElement>('.time-point')];
    changed.forEach((point, index) => expect(point).toBe(copy[index]));
    expect(positions(original)).toEqual(originalPositions);
    for (const index of [0, 2, 4]) expect(positions(changed)[index]).toBe(copyPositions[index]);
    for (const index of [1, 3]) expect(positions(changed)[index]).not.toBe(copyPositions[index]);
    expect(new Set(positions(changed)).size).toBe(5);
    expect(game.plots()[1].points.map(point => point.id)).toEqual(['copy-1', 'copy-2', 'copy-3', 'copy-4', 'copy-5']);
  });

  it('lets an incorrect hypothesis lead to learning without bypassing explanation or independent evidence', () => {
    const game = create().componentInstance; const done = vi.fn(); game.completed.subscribe(done);
    game.compare('a'); game.predictRange('increase'); game.setExperiment('apart');
    game.startPractice(); game.finish(); expect(game.stage()).toBe('experiment');
    game.showChanges(); game.startPractice(); expect(game.stage()).toBe('explain');
    game.explain('extremes'); game.startPractice();
    expect(game.stage()).toBe('practice'); expect(game.practiceHelped()).toBe(false);
    game.chooseClaim('different'); game.finish(); expect(done).not.toHaveBeenCalled();
    game.chooseEvidence('a'); expect(game.stage()).toBe('success');
    expect(game.round()).toBe(0); expect(game.records[0].values).toEqual([8, 10, 10, 10, 12]);
    game.finish(); expect(done).toHaveBeenCalledTimes(1);
  });

  it('focuses the nearby experiment button after predicting and the explanation heading after observing', async () => {
    const fixture = create(); const game = fixture.componentInstance;
    game.compare('a'); fixture.detectChanges(); await fixture.whenStable();
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('#workshop-task-title'));
    game.predictRange('decrease'); fixture.detectChanges(); await fixture.whenStable();
    const buttons = fixture.nativeElement.querySelectorAll('.experiment-controls button');
    expect(document.activeElement).toBe(buttons[1]);
    buttons[1].click(); fixture.detectChanges();
    fixture.nativeElement.querySelector('.btn--primary').click(); fixture.detectChanges(); await fixture.whenStable();
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('#workshop-task-title'));
    expect(document.activeElement?.textContent).toContain('¿Por qué sigue siendo 4?');
  });

  it('centers the experiment controls so the nearby copied graph remains in view after predicting', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
    const scroll = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scroll });
    const fixture = create(); const game = fixture.componentInstance;
    try {
      game.compare('a'); fixture.detectChanges(); await fixture.whenStable();
      expect(scroll).not.toHaveBeenCalled();
      game.predictRange('same'); fixture.detectChanges(); await fixture.whenStable();
      expect(scroll).toHaveBeenCalledExactlyOnceWith({ block: 'center', inline: 'nearest', behavior: 'instant' });
      expect(document.activeElement?.textContent).toBe('Separar tiempos');
    } finally {
      fixture.destroy();
      if (descriptor) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', descriptor);
      else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
    }
  });

  it('changes only two copied values while preserving extrema, range, count and mean', () => {
    const game = create().componentInstance;
    experiment(game);
    const originals = game.records.map(group => [...group.values]);
    for (const mode of ['apart', 'together', 'apart'] as const) {
      game.setExperiment(mode);
      expect(game.simulated()).toEqual(mode === 'apart' ? [8, 8, 10, 12, 12] : [8, 10, 10, 10, 12]);
      expect(game.simulated()).toHaveLength(5);
      expect(Math.min(...game.simulated())).toBe(8);
      expect(Math.max(...game.simulated())).toBe(12);
      expect(game.simulatedRange()).toBe(4);
      expect(game.simulated().reduce((sum, value) => sum + value, 0) / 5).toBe(10);
      expect(game.simulated()[0]).toBe(8);
      expect(game.simulated()[2]).toBe(10);
      expect(game.simulated()[4]).toBe(12);
      expect(game.records.map(group => [...group.values])).toEqual(originals);
      expect(game.groups()[0].values).toBe(game.records[0].values);
    }
  });

  it('uses two real buttons instead of writing or dragging to change the copy', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    experiment(game);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const controls = root.querySelectorAll<HTMLButtonElement>('.experiment-controls button');
    const primary = root.querySelector<HTMLButtonElement>('.btn--primary')!;
    expect(primary.disabled).toBe(true);
    expect(controls[0].getAttribute('aria-pressed')).toBe('true');
    controls[1].click();
    fixture.detectChanges();
    expect(game.experimentMode()).toBe('apart');
    expect(controls[1].getAttribute('aria-pressed')).toBe('true');
    expect(primary.disabled).toBe(false);
    expect(root.querySelector('.range-reading')!.textContent).toContain('Tu predicción coincide con lo observado');
    expect(root.querySelector('.range-reading')!.textContent).toContain('El rango sigue siendo 4 minutos');
    controls[0].click();
    fixture.detectChanges();
    expect(game.simulated()).toEqual([8, 10, 10, 10, 12]);
    expect(primary.disabled).toBe(true);
    expect(root.querySelectorAll('input, textarea')).toHaveLength(0);
  });

  it('requires observing a changed copy before asking why the range stayed the same', () => {
    const game = create().componentInstance;
    experiment(game);
    game.showChanges();
    expect(game.stage()).toBe('experiment');
    expect(game.feedback()).toContain('Separar tiempos');
    game.setExperiment('apart');
    game.setExperiment('together');
    game.showChanges();
    expect(game.stage()).toBe('experiment');
    game.setExperiment('apart');
    game.showChanges();
    expect(game.stage()).toBe('explain');
    const before = game.simulated();
    game.setExperiment('together');
    expect(game.simulated()).toBe(before);
  });

  it('corrects the ideas that no values changed or that range is useless', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    explain(game);
    game.explain('unchanged');
    expect(game.feedback()).toContain('Dos tiempos de la copia cambiaron');
    game.explain('useless');
    expect(game.feedback()).toContain('El rango sí muestra la separación');
    game.explain('invalid' as 'extremes');
    expect(game.stage()).toBe('explain');
    game.explain('extremes');
    fixture.detectChanges();
    expect(game.stage()).toBe('discovery');
    expect(fixture.nativeElement.textContent).toContain('El rango no muestra todo');
    expect(game.simulatedRange()).toBe(4);
    expect(game.feedback()).toBe('');
  });

  it('starts independent practice with the original planned pair and no copied hints', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    explain(game);
    game.explain('unchanged');
    game.explain('extremes');
    game.startPractice();
    fixture.detectChanges();
    expect(game.stage()).toBe('practice');
    expect(game.step()).toBe(3);
    expect(game.groups()).toBe(game.practiceRecords());
    expect(game.groups().map(group => group.id)).toEqual(['C', 'D']);
    expect(game.practiceHelped()).toBe(false);
    expect(game.feedback()).toBe('');
    expect(game.plots().map(plot => plot.range)).toEqual([4, 4]);
    expect(fixture.nativeElement.querySelector('.experiment-controls')).toBeNull();
    expect(fixture.nativeElement.querySelector('.experiment-note')).toBeNull();
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
    expect(game.feedback()).toContain('solo confirma');
    game.chooseClaim('unknown');
    expect(game.feedback()).toContain('Sí tenemos los registros');
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
    expect(fixture.nativeElement.querySelector('.task-card').textContent).toContain('C tiene más revisiones');
    game.finish();
    expect(done).not.toHaveBeenCalled();
    game.continueAfterHelp();
    expect(game.stage()).toBe('practice');
    expect(game.round()).toBe(1);
    expect(game.practiceHelped()).toBe(false);
    expect(game.feedback()).toBe('');
    expect(game.groups().map(group => group.id)).toEqual(['E', 'F']);
    expect(game.plots().map(plot => plot.range)).toEqual([6, 6]);
    expect(game.center()).toBe(11);
    expect(game.centerCounts()).toEqual([1, 3]);
    expect(game.concentratedSide()).toBe('b');
    game.chooseClaim('different');
    game.chooseEvidence('b');
    expect(game.stage()).toBe('success');
    game.finish();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('updates point counts, positions and evidence wording for each support example', () => {
    const game = create().componentInstance;
    practice(game);
    for (let round = 0; round < 3; round += 1) {
      expect(game.round()).toBe(round);
      expect(game.plots()[0].range).toBe(game.plots()[1].range);
      const expectedRange = [4, 6, 2][round];
      expect(game.plots()[0].range).toBe(expectedRange);
      expect(game.evidenceChoices()[0].text).toContain(game.center() + ' minutos');
      for (const plot of game.plots()) {
        expect(plot.points).toHaveLength(5);
        const uniquePositions = new Set(plot.points.map(point => point.x + ':' + point.bottom));
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
      game.continueAfterHelp();
    }
  });

  it('keeps repeated support bounded and preserves the original mission evidence', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    practice(game);
    for (let round = 0; round < 10; round += 1) {
      expect(game.round()).toBe(round);
      game.chooseClaim('same');
      game.chooseClaim('different');
      game.chooseEvidence(game.concentratedSide());
      expect(game.stage()).toBe('review');
      game.continueAfterHelp();
    }
    game.chooseClaim('different');
    game.chooseEvidence(game.concentratedSide());
    fixture.detectChanges();
    expect(game.stage()).toBe('success');
    const report = fixture.nativeElement.querySelector('.report-card').textContent;
    expect(report).toContain('A y B tienen rango de 4 minutos');
    expect(report).toContain('En A hubo tres revisiones de 10 minutos');
    expect(report).not.toContain('Equipo F');
    expect(game.records.map(group => [...group.values])).toEqual([
      [8, 10, 10, 10, 12], [8, 8, 10, 12, 12],
    ]);
  });

  it('runs through actual buttons and delivers a correction without ranking teams or inventing causes', () => {
    const fixture = create();
    const root = fixture.nativeElement as HTMLElement;
    const done = vi.fn();
    fixture.componentInstance.completed.subscribe(done);
    const choice = (index: number) => {
      root.querySelectorAll<HTMLButtonElement>('.choices .answer-choice')[index].click();
      fixture.detectChanges();
      expect(root.querySelectorAll('input, textarea, form')).toHaveLength(0);
    };
    const primary = () => {
      root.querySelector<HTMLButtonElement>('.btn--primary')!.click();
      fixture.detectChanges();
    };
    choice(1);
    choice(0);
    expect(root.querySelector('.prediction-note')!.textContent).toContain('Será mayor');
    root.querySelectorAll<HTMLButtonElement>('.experiment-controls button')[1].click();
    fixture.detectChanges();
    primary();
    choice(1);
    primary();
    choice(1);
    choice(0);
    expect(root.querySelector('.completion-card')!.textContent).toContain('Tu corrección está lista');
    const report = root.querySelector('.report-card')!.textContent;
    expect(report).toContain('organizar las revisiones del siguiente turno');
    expect(report).toContain('no considerar iguales los tiempos solo porque sus rangos coinciden');
    expect(report).toContain('no dice qué equipo trabaja mejor');
    expect(report).toContain('ni explica la causa');
    expect(root.querySelector('.btn--primary')!.textContent).toContain('Entregar la corrección');
    expect(done).not.toHaveBeenCalled();
    primary();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('resets comparison, experimental copy, hints and practice progress on replay', () => {
    const fixture = create();
    practice(fixture.componentInstance);
    fixture.componentInstance.chooseClaim('same');
    fixture.componentInstance.chooseClaim('different');
    fixture.componentInstance.chooseEvidence('a');
    fixture.componentInstance.continueAfterHelp();
    fixture.componentInstance.chooseClaim('different');
    fixture.componentInstance.chooseEvidence('b');
    fixture.componentInstance.finish();
    fixture.destroy();
    const game = create().componentInstance;
    expect(game.stage()).toBe('compare');
    expect(game.experimentMode()).toBe('together');
    expect(game.rangePrediction()).toBeNull();
    expect(game.simulated()).toEqual([8, 10, 10, 10, 12]);
    expect(game.separatedViewed()).toBe(false);
    expect(game.practiceHelped()).toBe(false);
    expect(game.round()).toBe(0);
    expect(game.feedback()).toBe('');
    expect(game.groups()).toBe(game.records);
    expect(game.step()).toBe(1);
  });
});
