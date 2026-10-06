import { TestBed } from '@angular/core/testing';
import { Lesson09Thickeners } from './lesson-09-thickeners';

function create() {
  const fixture = TestBed.createComponent(Lesson09Thickeners);
  fixture.detectChanges();
  return fixture;
}
function main(game: Lesson09Thickeners): void {
  game.choosePeriod(game.lessSpread()); game.continue();
  game.choosePeriod(game.closerToGoal()); game.continue();
  game.chooseRecommendation('reference'); game.continue();
}
function transfer(game: Lesson09Thickeners): void {
  game.startTransfer(); game.choosePeriod(game.lessSpread()); game.continue();
}
function click(root: HTMLElement, label: string): void {
  const button = [...root.querySelectorAll<HTMLButtonElement>('button')]
    .find(candidate => candidate.textContent?.trim() === label);
  expect(button, label).toBeDefined(); button!.click();
}

describe('Lesson09Thickeners', () => {
  it('starts with two local periods, an explicit mean goal and computed measures', () => {
    const fixture = create(); const root: HTMLElement = fixture.nativeElement;
    const game = fixture.componentInstance;
    expect(game.stage()).toBe('spread'); expect(game.records().goal).toBe(100);
    expect(root.querySelectorAll('.data-point')).toHaveLength(12);
    expect(root.textContent).toContain('No significa que cada registro deba ser 100');
    expect(root.textContent).toContain('condiciones parecidas');
    expect(root.querySelector('input, textarea, form, select')).toBeNull();
    expect(root.querySelectorAll('button:not([type="button"])')).toHaveLength(0);
  });

  it('uses the shared lesson and answer controls with a single current step', () => {
    const fixture = create(); const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('.lesson.thickeners-lesson')).not.toBeNull();
    expect(root.querySelectorAll('.choices .btn--answer')).toHaveLength(3);
    expect(root.querySelector('.btn--hint')?.classList.contains('btn--secondary')).toBe(true);
    expect(root.querySelectorAll('.steps [aria-current="step"]')).toHaveLength(1);
    expect(root.querySelector('.steps [aria-current="step"]')?.textContent).toContain('Variación');
    fixture.componentInstance.choosePeriod('A'); fixture.componentInstance.continue(); fixture.detectChanges();
    expect(root.querySelector('.steps [aria-current="step"]')?.textContent).toContain('Meta');
    expect(root.querySelectorAll('.steps .step--done')).toHaveLength(1);
  });

  it('prioritizes mean and standard deviation while retaining range, variance and graph context in a disclosure', () => {
    const fixture = create(); const root: HTMLElement = fixture.nativeElement;
    expect([...root.querySelectorAll('.measures dt')].map(label => label.textContent))
      .toEqual(['Promedio', 'Desv. estándar', 'Promedio', 'Desv. estándar']);
    expect([...root.querySelectorAll('.measures dd')].map(value => value.textContent?.trim()))
      .toEqual(['80 t/h', '0 t/h', '100 t/h', '2 t/h']);
    const detail = root.querySelector<HTMLDetailsElement>('.additional-measures')!;
    expect(detail.open).toBe(false);
    expect(detail.textContent).toContain('Período A: rango 0 t/h · varianza 0 (t/h)²');
    expect(detail.textContent).toContain('Período B: rango 4 t/h · varianza 4 (t/h)²');
    expect(detail.textContent).toContain('condiciones parecidas');
    expect(detail.textContent).toContain('el promedio cumple la meta');
    expect(detail.parentElement).toBe(root.querySelector('.workbench'));
    expect(root.querySelector('.task-card')?.nextElementSibling).toBe(detail);
  });

  it('retains the same comparison hierarchy in transfer without marking either period as automatically better', () => {
    const fixture = create(); const game = fixture.componentInstance;
    main(game); game.startTransfer(); fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('.goal-banner')?.textContent).toContain('Promedio de 100 t/h');
    expect(root.querySelectorAll('.period .data-point')).toHaveLength(12);
    expect([...root.querySelectorAll('.period')].map(period => period.className)).toEqual(['period', 'period']);
    expect([...root.querySelectorAll('.measures dd')].map(value => value.textContent?.trim()))
      .toEqual(['100 t/h', '1 t/h', '100 t/h', '2 t/h']);
    expect(root.querySelectorAll('.choices .btn--answer')).toHaveLength(3);
    expect(root.querySelector('.additional-measures')?.textContent).toContain('Período A: rango 2 t/h · varianza 1 (t/h)²');
    expect(root.querySelector('.additional-measures')?.textContent).toContain('Período B: rango 4 t/h · varianza 4 (t/h)²');
  });

  it('computes population variance, range, mean and standard deviation including all zero contributions', () => {
    const game = create().componentInstance; const [a, b] = game.periods();
    expect(a.values).toEqual([80, 80, 80, 80, 80, 80]);
    expect([a.mean, a.range, a.variance, a.standardDeviation, a.goalDistance]).toEqual([80, 0, 0, 0, 20]);
    expect(b.values).toEqual([98, 98, 98, 102, 102, 102]);
    expect([b.mean, b.range, b.variance, b.standardDeviation, b.goalDistance]).toEqual([100, 4, 4, 2, 0]);
    expect(game.lessSpread()).toBe('A'); expect(game.closerToGoal()).toBe('B');
  });

  it('uses a common linear scale, separate goal and mean lines, and stacks all six identical records', () => {
    const fixture = create(); const game = fixture.componentInstance; const root: HTMLElement = fixture.nativeElement;
    const [a, b] = game.plots();
    expect(a.points.map(point => point.bottom)).toEqual([28, 48, 68, 88, 108, 128]);
    expect(b.points.map(point => point.bottom)).toEqual([28, 48, 68, 28, 48, 68]);
    expect((game.position(100) - game.position(98)) / (game.position(98) - game.position(80))).toBeCloseTo(2 / 18);
    expect(a.points.every(point => point.x > 0 && point.x < 100)).toBe(true);
    const goals = [...root.querySelectorAll<HTMLElement>('.goal-line')];
    const means = [...root.querySelectorAll<HTMLElement>('.mean-line')];
    expect(goals[0].style.left).toBe(goals[1].style.left);
    expect(means[0].style.left).not.toBe(goals[0].style.left);
    expect(means[1].style.left).toBe(goals[1].style.left);
    expect(game.plotDescription('A')).toContain('Promedio 80, meta de promedio 100');
    expect(game.plotDescription('B')).toContain('varianza 4 (t/h) al cuadrado');
    expect(root.querySelectorAll('[role="img"][aria-label]')).toHaveLength(2);
  });

  it('labels the goal next to its line pattern and gives both plots the same simple marks', () => {
    const fixture = create(); const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    expect(game.ticks()).toEqual([80, 90, 100, 110]);
    expect(root.querySelector('.legend')?.textContent).toContain('Meta: 100 t/h');
    expect(root.querySelector('.legend-goal')).not.toBeNull();
    expect([...root.querySelectorAll('.period')].map(period =>
      [...period.querySelectorAll('.tick')].map(tick => tick.textContent?.trim())))
      .toEqual([['80', '90', '100', '110'], ['80', '90', '100', '110']]);
    expect(game.bounds().min).toBeLessThan(80);
    expect(game.bounds().max).toBeGreaterThan(110);
  });

  it('adapts the marks and goal label without clipping data or flattening close transfer cases', () => {
    const fixture = create(); const game = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    const assertScale = (goal: number, ticks: number[]): void => {
      fixture.detectChanges();
      expect(game.records().goal).toBe(goal);
      expect(game.ticks()).toEqual(ticks);
      expect(root.querySelector('.legend')?.textContent).toContain('Meta: ' + goal + ' t/h');
      const positions = [...game.records().A, ...game.records().B, goal, ...ticks]
        .map(value => game.position(value));
      expect(positions.every(position => position > 0 && position < 100)).toBe(true);
      const steps = ticks.slice(1).map((value, index) => value - ticks[index]);
      expect(new Set(steps).size).toBe(1);
      expect(root.querySelectorAll('.data-point')).toHaveLength(12);
      const goals = [...root.querySelectorAll<HTMLElement>('.goal-line')];
      expect(goals[0].style.left).toBe(goals[1].style.left);
    };
    assertScale(100, [80, 90, 100, 110]);
    game.requestHint(); main(game);
    assertScale(100, [98, 100, 102]);
    transfer(game); game.continueAfterHelp();
    assertScale(120, [100, 110, 120, 130]);
    game.requestHint(); main(game);
    assertScale(104, [102, 104, 106]);
    transfer(game); game.continueAfterHelp();
    assertScale(90, [70, 80, 90, 100]);
    main(game);
    assertScale(120, [115, 120, 125, 130]);
  });

  it('ignores invalid, duplicate and premature actions', () => {
    const game = create().componentInstance; const done = vi.fn(); game.completed.subscribe(done);
    game.choosePeriod('fake' as 'A'); game.chooseRecommendation('reference');
    game.continue(); game.startTransfer(); game.continueAfterHelp(); game.finish();
    expect(game.stage()).toBe('spread'); expect(game.helped()).toBe(false);
    expect(game.feedback()).toBe(''); expect(done).not.toHaveBeenCalled();
    game.choosePeriod('A'); const feedback = game.feedback();
    game.choosePeriod('B'); game.requestHint();
    expect(game.feedback()).toBe(feedback); expect(game.helped()).toBe(false);
    game.continue(); game.chooseRecommendation('reference'); game.continue();
    expect(game.stage()).toBe('goal'); expect(game.answered()).toBe(false);
  });

  it('supports a wrong spread answer on the same records, without solving or moving automatically', () => {
    const game = create().componentInstance; const records = game.records();
    game.choosePeriod('B');
    expect(game.records()).toBe(records); expect(game.stage()).toBe('spread');
    expect(game.answered()).toBe(false); expect(game.helped()).toBe(true);
    expect(game.feedback()).toContain('todos tienen el mismo valor');
    game.continue(); expect(game.stage()).toBe('spread');
    game.choosePeriod('A'); expect(game.stage()).toBe('spread'); expect(game.answered()).toBe(true);
    expect(game.feedback()).toContain('Eso no dice si cumple la meta');
  });

  it('separates observed mean from the goal rather than equating stability with meeting it', () => {
    const game = create().componentInstance;
    game.choosePeriod('A'); game.continue(); const records = game.records();
    game.choosePeriod('A'); expect(game.records()).toBe(records);
    expect(game.feedback()).toContain('promedio de cada período con la línea de meta');
    expect(game.answered()).toBe(false);
    game.choosePeriod('B'); expect(game.feedback()).toContain('promedio de B es 100 t/h');
    expect(game.feedback()).toContain('otro período quedó por debajo');
  });

  it.each(['stable', 'adjust'] as const)('rejects the unsupported recommendation %s while preserving the evidence', answer => {
    const game = create().componentInstance;
    game.choosePeriod('A'); game.continue(); game.choosePeriod('B'); game.continue();
    const records = game.records(); game.chooseRecommendation(answer);
    expect(game.stage()).toBe('recommend'); expect(game.records()).toBe(records);
    expect(game.answered()).toBe(false); expect(game.helped()).toBe(true);
    expect(game.feedback()).toContain('Primero hay que buscar las causas');
    if (answer === 'adjust') expect(game.feedback()).toContain('La meta es para el promedio, no para cada registro');
    game.chooseRecommendation('reference');
    expect(game.feedback()).toContain('por qué hubo cambios y qué tanto pueden variar');
    expect(game.feedback()).toContain('no asegura el resultado del próximo turno');
  });

  it('requires every player to complete the equal-goal transfer case before success', () => {
    const game = create().componentInstance; const done = vi.fn(); game.completed.subscribe(done);
    main(game); expect(game.stage()).toBe('transfer-intro');
    expect(game.isTransfer()).toBe(true); expect(game.periods().map(period => period.mean)).toEqual([100, 100]);
    expect(game.periods().map(period => period.standardDeviation)).toEqual([1, 2]);
    expect(game.periods().map(period => period.variance)).toEqual([1, 4]);
    expect(game.periods().every(period => new Set(period.values).size > 1)).toBe(true);
    game.choosePeriod('A'); game.continue(); game.finish();
    expect(game.stage()).toBe('transfer-intro'); expect(done).not.toHaveBeenCalled();
    game.startTransfer(); game.finish(); expect(done).not.toHaveBeenCalled();
    game.choosePeriod('A'); expect(game.stage()).toBe('transfer');
    expect(game.feedback()).toContain('Para este caso elegimos A');
    expect(game.feedback()).toContain('su desviación estándar es menor (1 t/h)');
    expect(game.feedback()).toContain('no garantiza el siguiente turno');
    game.continue(); expect(game.stage()).toBe('success'); expect(game.helped()).toBe(false);
  });

  it('states the transfer criterion explicitly and keeps equal-goal data separate from original evidence', () => {
    const fixture = create(); const game = fixture.componentInstance; main(game); fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.textContent).toContain('Regla para este caso');
    expect(root.textContent).toContain('preferimos menor variación');
    expect(root.textContent).toContain('No reemplaza los datos originales');
    expect(root.textContent).toContain('Ningún período tiene todos sus registros iguales');
    expect(root.querySelectorAll('.data-point')).toHaveLength(12);
    expect(game.originalPeriods[0].mean).toBe(80);
  });

  it.each([
    { round: 0, goal: 100, spread: [1, 2], expected: 'A' },
    { round: 1, goal: 104, spread: [2, 1], expected: 'B' },
    { round: 2, goal: 120, spread: [1, 3], expected: 'A' },
  ] as const)('compares two changing periods without relying on a zero spread at transfer round $round', ({ round, goal, spread, expected }) => {
    const game = create().componentInstance;
    for (let index = 0; index < round; index++) {
      game.requestHint(); main(game); transfer(game); game.continueAfterHelp();
    }
    main(game); game.startTransfer();
    expect(game.periods().map(period => period.mean)).toEqual([goal, goal]);
    expect(game.periods().map(period => period.standardDeviation)).toEqual(spread);
    expect(game.periods().every(period => period.variance > 0 && period.range > 0)).toBe(true);
    expect(game.periods().every(period => period.values.length === 6)).toBe(true);
    expect(game.lessSpread()).toBe(expected);
    game.choosePeriod('same');
    expect(game.answered()).toBe(false); expect(game.stage()).toBe('transfer');
    expect(game.feedback()).toContain('El mismo promedio no basta');
    game.choosePeriod(expected);
    expect(game.answered()).toBe(true);
    expect(game.feedback()).toContain('su desviación estándar es menor (1 t/h)');
    expect(game.feedback()).toContain('no garantiza el siguiente turno');
    game.continue(); expect(game.stage()).toBe('review');
  });

  it.each(['B', 'same'] as const)('corrects transfer choice %s without implying equal means suffice or more variation is better', answer => {
    const game = create().componentInstance; main(game); game.startTransfer(); const records = game.records();
    game.choosePeriod(answer); expect(game.records()).toBe(records);
    expect(game.feedback()).toContain('Compara sus desviaciones estándar');
    expect(game.feedback()).toContain('El mismo promedio no basta');
    expect(game.answered()).toBe(false); expect(game.helped()).toBe(true);
    game.choosePeriod('A'); game.continue(); expect(game.stage()).toBe('review');
    game.finish(); expect(game.stage()).toBe('review');
  });

  it('requires a whole fresh unassisted example after requesting a hint', () => {
    const game = create().componentInstance; game.requestHint(); const original = game.records();
    game.continueAfterHelp(); expect(game.records()).toBe(original);
    main(game); transfer(game); expect(game.stage()).toBe('review');
    game.continueAfterHelp();
    expect(game.stage()).toBe('spread'); expect(game.round()).toBe(1);
    expect(game.records().goal).toBe(120); expect(game.lessSpread()).toBe('B'); expect(game.closerToGoal()).toBe('A');
    expect(game.helped()).toBe(false); expect(game.feedback()).toBe(''); expect(game.answered()).toBe(false);
    main(game); expect(game.records().goal).toBe(104);
    expect(game.lessSpread()).toBe('B'); transfer(game); expect(game.stage()).toBe('success');
  });

  it('keeps measures, comparable intervals, bounds and reversed choices accurate over repeated practice', () => {
    const game = create().componentInstance;
    for (let round = 0; round < 8; round++) {
      expect(game.round()).toBe(round); const periods = game.periods();
      expect(periods.map(period => period.values.length)).toEqual([6, 6]);
      expect(periods.find(period => period.id === game.lessSpread())!.variance).toBe(0);
      expect(periods.find(period => period.id === game.closerToGoal())!.goalDistance).toBe(0);
      expect(game.lessSpread()).not.toBe(game.closerToGoal());
      expect(game.recommendations().findIndex(choice => choice.id === 'reference')).toBe((4 - round % 3) % 3);
      for (const period of periods) {
        expect(period.standardDeviation ** 2).toBe(period.variance);
        expect(period.values.every(value => game.position(value) > 0 && game.position(value) < 100)).toBe(true);
      }
      game.requestHint(); main(game);
      expect(game.periods().every(period => period.mean === game.records().goal)).toBe(true);
      expect(game.periods().every(period => new Set(period.values).size > 1)).toBe(true);
      expect(game.periods().find(period => period.id === game.lessSpread())!.standardDeviation).toBe(1);
      expect(game.periods().find(period => period.id !== game.lessSpread())!.standardDeviation)
        .toBeGreaterThan(1);
      transfer(game); game.continueAfterHelp();
    }
    expect(game.originalPeriods.map(period => period.mean)).toEqual([80, 100]);
  });

  it('restores only the original data in the final report after practice and transfer', () => {
    const fixture = create(); const game = fixture.componentInstance;
    game.requestHint(); main(game); transfer(game); game.continueAfterHelp(); main(game); transfer(game);
    fixture.detectChanges(); const root: HTMLElement = fixture.nativeElement;
    expect(game.records().goal).toBe(100); expect(game.periods().map(period => period.mean)).toEqual([80, 100]);
    expect(root.querySelector('.report-card')?.textContent).toContain('80 · 80 · 80 · 80 · 80 · 80');
    expect(root.textContent).toContain('98 · 98 · 98 · 102 · 102 · 102');
    expect(root.textContent).toContain('A varió menos. B cumplió la meta de promedio');
    expect(root.textContent).toContain('Variar menos o más no significa, por sí solo, trabajar mejor');
    expect(root.textContent).not.toContain('117'); expect(root.textContent).not.toContain('104');
    expect(root.querySelector('.route-report')?.textContent).toContain('conclusiones de cada zona');
    expect(root.querySelector('.route-report')?.textContent).toContain('incluyendo los ceros');
  });

  it('emits completion only once after success, not after a supported example or before transfer', () => {
    const game = create().componentInstance; const done = vi.fn(); game.completed.subscribe(done);
    game.requestHint(); main(game); game.finish(); transfer(game); game.finish();
    expect(done).not.toHaveBeenCalled(); game.continueAfterHelp(); main(game); transfer(game);
    expect(done).not.toHaveBeenCalled(); game.finish(); game.finish();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('moves focus to the new question after an explicit continue', async () => {
    const fixture = create(); const game = fixture.componentInstance;
    game.choosePeriod('A'); game.continue(); fixture.detectChanges(); await fixture.whenStable();
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('#thickeners-task-title'));
    expect(document.activeElement?.textContent).toContain('se acercó a la meta');
  });

  it('completes the puzzle through rendered buttons without any written answers', () => {
    const fixture = create(); const game = fixture.componentInstance; const root: HTMLElement = fixture.nativeElement;
    const done = vi.fn(); game.completed.subscribe(done);
    for (const label of ['Período A', 'Continuar →', 'Período B', 'Continuar →',
      game.recommendations().find(choice => choice.id === 'reference')!.text, 'Continuar →',
      'Comparar este caso →', 'Usar A como referencia', 'Ver el informe →', 'Entregar el informe →']) {
      click(root, label); fixture.detectChanges();
    }
    expect(done).toHaveBeenCalledTimes(1); expect(root.querySelector('input, textarea, form, select')).toBeNull();
  });

  it('brings the next mobile question above the graphs while retaining keyboard focus', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'matchMedia');
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn().mockReturnValue({ matches: true }) });
    const fixture = create(); const game = fixture.componentInstance;
    const heading = fixture.nativeElement.querySelector('#thickeners-task-title') as HTMLElement;
    const scroll = vi.fn(); heading.scrollIntoView = scroll;
    try {
      game.choosePeriod('A'); game.continue(); fixture.detectChanges(); await fixture.whenStable();
      expect(document.activeElement).toBe(heading);
      expect(scroll).toHaveBeenCalledExactlyOnceWith({ block: 'start' });
    } finally {
      fixture.destroy();
      if (descriptor) Object.defineProperty(window, 'matchMedia', descriptor);
      else Reflect.deleteProperty(window, 'matchMedia');
    }
  });

  it('starts a replay with original records, no prior help or answers', () => {
    const fixture = create(); const game = fixture.componentInstance;
    game.requestHint(); main(game); transfer(game); fixture.destroy(); const replay = create().componentInstance;
    expect(replay.stage()).toBe('spread'); expect(replay.round()).toBe(0);
    expect(replay.answered()).toBe(false); expect(replay.helped()).toBe(false); expect(replay.feedback()).toBe('');
    expect(replay.periods().map(period => period.mean)).toEqual([80, 100]);
  });
});
