import { TestBed } from '@angular/core/testing';
import { Lesson01Loading } from './lesson-01-loading';
import { LESSON_NAMES } from '../lesson-catalog';
import { C1State } from './lesson-01-loading.state';

describe('Lesson01Loading', () => {
  function create(state: C1State | null = null) {
    const fixture = TestBed.createComponent(Lesson01Loading);
    fixture.componentRef.setInput('initialState', state);
    fixture.detectChanges();
    return fixture;
  }

  function compare(game: Lesson01Loading) {
    game.selectLoad('Ejemplo2');
    game.startComparison();
  }

  function practice(game: Lesson01Loading) {
    compare(game);
    game.chooseGroup('B');
    game.startPractice();
  }

  it('separates the lesson number and location from its shared mathematical title', () => {
    const root = create().nativeElement as HTMLElement;

    expect(root.querySelector('.lesson-tag__number')?.textContent).toBe('Clase 1');
    expect(root.querySelector('.lesson-tag')?.textContent).toContain('Interior del tajo');
    expect(root.querySelector('h2')?.textContent).toBe(LESSON_NAMES['lesson-01']);
    expect(root.querySelector('section')?.getAttribute('aria-labelledby')).toBe('loading-title');
  });

  it('teaches the truck-to-point link before asking for a comparison', () => {
    const fixture = create();
    const root = fixture.nativeElement as HTMLElement;
    expect(fixture.componentInstance.stage()).toBe('learn');
    expect(root.querySelectorAll('.tutorial-truck')).toHaveLength(3);
    expect(root.querySelectorAll('.value-track')).toHaveLength(1);
    expect(root.querySelector('.group-choices')).toBeNull();
    expect(root.querySelectorAll('input, textarea')).toHaveLength(0);
    expect(root.textContent).toContain('Un camión, un punto');
    expect(root.querySelector('.workbench')!.textContent).not.toContain('dispersión');
    expect(root.querySelector<HTMLButtonElement>('.btn--primary')!.disabled).toBe(true);
  });

  it('highlights exactly one point and explains its amount when a truck is selected', () => {
    const fixture = create();
    const root = fixture.nativeElement as HTMLElement;
    const truck = root.querySelectorAll<HTMLButtonElement>('.tutorial-truck')[1];
    truck.click();
    fixture.detectChanges();
    expect(truck.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelectorAll('.point--selected')).toHaveLength(1);
    expect(root.querySelector<HTMLElement>('.point--selected')!.style.left).toBe('50%');
    expect(root.querySelector('.example-reading')!.textContent).toContain('100');
    expect(root.querySelector('.point-reading')!.textContent).toBe('100 t');
    expect(root.querySelector<HTMLButtonElement>('.btn--primary')!.disabled).toBe(false);
    expect(fixture.componentInstance.scalePosition(80)).toBe(0);
    expect(fixture.componentInstance.scalePosition(120)).toBe(100);
  });

  it('requires inspecting one truck, rejects unknown records and prevents skipping steps', () => {
    const game = create().componentInstance;
    game.startComparison();
    game.startPractice();
    game.continueAfterHelp();
    game.chooseGroup('B');
    game.chooseReason('spread');
    game.selectLoad('missing');
    expect(game.stage()).toBe('learn');
    expect(game.selectedLoad()).toBeNull();
    compare(game);
    expect(game.stage()).toBe('compare');
    expect(game.step()).toBe(2);
    expect(game.selectedLoad()).toBeNull();
    game.startPractice();
    game.chooseReason('spread');
    expect(game.stage()).toBe('compare');
  });

  it('keeps the guided example after an error and names dispersion only after discovery', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    compare(game);
    const before = game.groups();
    game.chooseGroup('A');
    expect(game.stage()).toBe('compare');
    expect(game.groups()).toBe(before);
    expect(game.feedback()).toContain('En A están juntos');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('dispersión');
    game.chooseGroup('B');
    fixture.detectChanges();
    expect(game.stage()).toBe('discovery');
    expect(fixture.nativeElement.textContent).toContain('Esto se llama dispersión');
    expect(game.feedback()).toBe('');
  });

  it('preserves the planned data and places both groups on one shared numeric scale', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    compare(game);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(game.groups().map(group => group.loads)).toEqual([
      [98, 102, 100, 101, 99], [82, 116, 95, 111, 96],
    ]);
    expect(root.querySelectorAll('.cargo-row')).toHaveLength(2);
    expect(root.querySelectorAll('.shared-axis')).toHaveLength(1);
    expect(root.querySelectorAll('.load-point')).toHaveLength(10);
    for (const plot of game.plots()) {
      for (const point of plot.points) expect(point.x).toBe(game.scalePosition(point.tonnes));
    }
    const record = root.querySelector<HTMLButtonElement>('.load-record')!;
    record.click();
    fixture.detectChanges();
    expect(record.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelectorAll('.point--selected')).toHaveLength(1);
    expect(root.querySelector('.point-reading')!.textContent).toBe('98 t');
    expect(root.querySelector('.value-track')!.getAttribute('aria-label')).toContain('98, 102, 100, 101, 99');
  });

  it('completes an independent comparison and explanation, emitting once', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const done = vi.fn();
    game.completed.subscribe(done);
    game.finish();
    practice(game);
    expect(game.step()).toBe(3);
    expect(game.groups().map(group => group.loads)).toEqual([[110, 111, 112], [90, 100, 110]]);
    game.chooseGroup('D');
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.task-card h3')?.textContent).toContain('¿Qué viste al comparar las cargas?');
    expect(game.reasons().find(reason => reason.id === 'spread')?.text).toBe(
      'D: 90, 100, 110 t; C: 110, 111, 112 t. Se parecen menos en D.',
    );
    expect([...root.querySelectorAll('.reason-choice')].map(button => button.textContent?.trim()))
      .toEqual(game.reasons().map(reason => reason.text));
    game.finish();
    expect(game.stage()).toBe('practice-reason');
    expect(done).not.toHaveBeenCalled();
    game.chooseReason('spread');
    expect(game.stage()).toBe('success');
    game.finish();
    game.finish();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('keeps the same practice data and selected point when offering a comparison hint', () => {
    const game = create().componentInstance;
    practice(game);
    game.selectLoad('C1');
    const before = game.groups();
    game.chooseGroup('C');
    expect(game.stage()).toBe('practice');
    expect(game.groups()).toBe(before);
    expect(game.practiceRound()).toBe(0);
    expect(game.selectedLoad()).toBe('C1');
    expect(game.practiceHelped()).toBe(true);
    expect(game.feedback()).toContain('más material');
    game.continueAfterHelp();
    expect(game.practiceRound()).toBe(0);
  });

  it('lets the learner understand a hinted example before offering a fresh check', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const done = vi.fn();
    game.completed.subscribe(done);
    practice(game);
    game.chooseGroup('C');
    game.chooseGroup('D');
    game.chooseReason('spread');
    expect(game.stage()).toBe('practice-review');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Puedes usar las pistas y después terminarás la clase');
    expect(game.practiceRound()).toBe(0);
    expect(game.groups().map(group => group.name)).toEqual(['C', 'D']);
    game.finish();
    expect(done).not.toHaveBeenCalled();
    game.continueAfterHelp();
    expect(game.stage()).toBe('practice');
    expect(game.practiceRound()).toBe(1);
    expect(game.groups().map(group => group.loads)).toEqual([[85, 100, 115], [105, 106, 107]]);
    expect(game.feedback()).toBe('');
    expect(game.selectedGroup()).toBeNull();
    expect(game.practiceHelped()).toBe(false);
    expect(game.selectedLoad()).toBeNull();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Una práctica más');
    expect(fixture.nativeElement.textContent).not.toContain('sin ayuda');
    game.chooseGroup('D');
    expect(game.stage()).toBe('practice');
    game.chooseGroup('E');
    game.chooseReason('spread');
    expect(game.stage()).toBe('success');
    expect(game.guidedCompletion()).toBe(false);
  });

  it('keeps the same example after an incorrect reason without marking it mastered', () => {
    const game = create().componentInstance;
    practice(game);
    game.chooseGroup('D');
    const before = game.groups();
    const choices = game.reasons();
    game.chooseReason('maximum');
    expect(game.stage()).toBe('practice-reason');
    expect(game.groups()).toBe(before);
    expect(game.feedback()).toContain('Un solo camión');
    expect(game.feedback()).toContain('D: 90, 100, 110 t; C: 110, 111, 112 t');
    expect(game.reasons()).toBe(choices);
    game.chooseReason('count');
    expect(game.feedback()).toContain('tres camiones');
    expect(game.feedback()).toContain('D: 90, 100, 110 t; C: 110, 111, 112 t');
    expect(game.reasons()).toBe(choices);
    game.chooseReason('spread');
    expect(game.stage()).toBe('practice-review');
    game.continueAfterHelp();
    game.chooseGroup('E');
    game.chooseReason('spread');
    expect(game.stage()).toBe('success');
  });

  it('keeps later draft data and evidence valid without requiring further rounds', () => {
    for (let round = 0; round < 5; round += 1) {
      const fixture = create({ stage: 'practice', selectedLoad: null, selectedGroup: null,
        practiceRound: round, practiceHelped: false });
      const game = fixture.componentInstance;
      expect(game.practiceRound()).toBe(round);
      expect(game.groups().flatMap(group => group.loads).every(value => value >= 80 && value <= 120)).toBe(true);
      const wrong = game.groups().find(group => group.name !== game.correctGroup())!;
      const correct = game.groups().find(group => group.name === game.correctGroup())!;
      const choices = game.reasons();
      const evidence = choices.find(reason => reason.id === 'spread')!.text;
      expect(evidence).toContain(correct.name + ': ' + correct.loads.join(', ') + ' t');
      expect(evidence).toContain(wrong.name + ': ' + wrong.loads.join(', ') + ' t');
      expect(choices.findIndex(reason => reason.id === 'spread')).toBe((1 - round % 3 + 3) % 3);
      expect(new Set(choices.map(reason => reason.id)).size).toBe(3);
      expect(choices.find(reason => reason.id === 'maximum')!.text).toContain(
        correct.name + ' llega a ' + Math.max(...correct.loads) + ' t',
      );
      expect(Math.max(...correct.loads) - Math.min(...correct.loads)).toBeGreaterThan(Math.max(...wrong.loads) - Math.min(...wrong.loads));
      game.chooseGroup(wrong.name);
      game.chooseGroup(correct.name);
      game.chooseReason('spread');
      expect(game.stage()).toBe(round === 0 ? 'practice-review' : 'success');
      if (round === 0) {
        game.continueAfterHelp();
        expect(game.practiceRound()).toBe(1);
      } else {
        expect(game.guidedCompletion()).toBe(true);
        game.continueAfterHelp();
        expect(game.practiceRound()).toBe(round);
      }
      fixture.destroy();
    }
  });

  for (const helpAt of ['group', 'reason'] as const) {
    it('allows only one additional practice with help at the ' + helpAt + ', still requiring the correct explanation', () => {
      const fixture = create(); const game = fixture.componentInstance; const done = vi.fn();
      game.completed.subscribe(done);
      practice(game); game.chooseGroup('C'); game.chooseGroup('D'); game.chooseReason('spread');
      game.continueAfterHelp();
      expect(game.practiceRound()).toBe(1); expect(game.practiceHelped()).toBe(false);
      const data = game.groups();
      game.continueAfterHelp(); game.chooseReason('spread'); game.finish();
      expect(game.stage()).toBe('practice'); expect(done).not.toHaveBeenCalled();
      if (helpAt === 'group') {
        game.chooseGroup('F');
        expect(game.stage()).toBe('practice');
      }
      game.chooseGroup('E');
      if (helpAt === 'reason') game.chooseReason('maximum');
      expect(game.practiceHelped()).toBe(true); expect(game.groups()).toEqual(data);
      game.continueAfterHelp(); game.finish();
      expect(game.stage()).toBe('practice-reason'); expect(done).not.toHaveBeenCalled();
      game.chooseReason('spread'); fixture.detectChanges();
      expect(game.stage()).toBe('success'); expect(game.guidedCompletion()).toBe(true);
      expect(game.practiceHelped()).toBe(true); expect(game.selectedLoad()).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('Completaste con ayuda');
      expect(fixture.nativeElement.querySelector('.report-card').textContent).toContain('Las cargas del grupo B');
      game.continueAfterHelp(); expect(game.practiceRound()).toBe(1);
      expect(done).not.toHaveBeenCalled(); game.finish(); game.finish();
      expect(done).toHaveBeenCalledTimes(1);
    });
  }

  it('explicitly closes an older completed review without losing help or adding another practice', () => {
    const state: C1State = { stage: 'practice-review', practiceRound: 3,
      selectedGroup: 'G', selectedLoad: 'G1', practiceHelped: true };
    const fixture = create(state); const game = fixture.componentInstance; const done = vi.fn();
    game.completed.subscribe(done);
    expect(game.stage()).toBe('practice-review'); expect(game.practiceRound()).toBe(3);
    expect(game.needsPractice()).toBe(false); expect(game.selectedLoad()).toBe('G1');
    expect(fixture.nativeElement.textContent).toContain('sin repetirlo');
    game.finish(); expect(done).not.toHaveBeenCalled();
    const button = fixture.nativeElement.querySelector('.task-card .btn--primary') as HTMLButtonElement;
    expect(button.textContent?.trim()).toBe('Ver el informe →'); button.click(); fixture.detectChanges();
    expect(game.stage()).toBe('success'); expect(game.guidedCompletion()).toBe(true);
    expect(game.practiceRound()).toBe(3); expect(game.practiceHelped()).toBe(true);
    expect(game.selectedGroup()).toBe('G'); expect(game.selectedLoad()).toBeNull();
    expect(done).not.toHaveBeenCalled(); game.finish(); expect(done).toHaveBeenCalledTimes(1);
  });

  it('runs the simple-choice flow through real buttons without written answers', () => {
    const fixture = create();
    const root = fixture.nativeElement as HTMLElement;
    root.querySelectorAll<HTMLButtonElement>('.tutorial-truck')[1].click();
    fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('.btn--primary')!.click();
    fixture.detectChanges();
    expect(root.querySelector('.task-card h3')!.textContent?.trim()).toBe('¿En qué grupo las cargas son más diferentes?');
    root.querySelectorAll<HTMLButtonElement>('.group-choice')[1].click();
    fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('.btn--primary')!.click();
    fixture.detectChanges();
    root.querySelectorAll<HTMLButtonElement>('.group-choice')[1].click();
    fixture.detectChanges();
    const evidence = fixture.componentInstance.reasons().find(reason => reason.id === 'spread')!.text;
    const reasonButton = [...root.querySelectorAll<HTMLButtonElement>('.reason-choice')]
      .find(button => button.textContent?.trim() === evidence);
    expect(reasonButton).toBeDefined(); reasonButton!.click();
    fixture.detectChanges();
    expect(root.querySelector('.completion-card')).not.toBeNull();
    expect(root.querySelector('.report-card')!.textContent).toContain('Las cargas del grupo B fueron más diferentes');
    expect(root.querySelectorAll('input, textarea')).toHaveLength(0);
  });

  it('rebuilds concrete evidence and the same option order after reopening a helped later practice', () => {
    const state: C1State = { stage: 'practice-reason', practiceRound: 3,
      selectedGroup: 'G', selectedLoad: 'G1', practiceHelped: true };
    const fixture = create(state); const game = fixture.componentInstance;
    const done = vi.fn(); game.completed.subscribe(done);
    const choices = game.reasons();
    expect(game.evidenceReading()).toBe('G: 82, 96, 110 t; H: 111, 112, 113 t');
    expect(game.practiceHelped()).toBe(true); game.finish(); expect(done).not.toHaveBeenCalled();
    fixture.destroy();
    const restored = create(state); const copy = restored.componentInstance;
    copy.completed.subscribe(done);
    expect(copy.reasons()).toEqual(choices); expect(copy.selectedLoad()).toBe('G1');
    expect(copy.practiceHelped()).toBe(true); expect(done).not.toHaveBeenCalled();
    copy.chooseReason('spread'); restored.detectChanges();
    expect(copy.stage()).toBe('success'); expect(done).not.toHaveBeenCalled();
    expect(copy.guidedCompletion()).toBe(true); expect(copy.practiceHelped()).toBe(true);
    expect(copy.practiceRound()).toBe(3); expect(copy.selectedLoad()).toBeNull();
    expect(restored.nativeElement.textContent).toContain('Completaste con ayuda');
  });

  it('starts a replay with fresh tutorial and no previous hints or answers', () => {
    const fixture = create();
    practice(fixture.componentInstance);
    fixture.componentInstance.chooseGroup('D');
    fixture.componentInstance.chooseReason('spread');
    fixture.destroy();
    const replay = create().componentInstance;
    expect(replay.stage()).toBe('learn');
    expect(replay.practiceRound()).toBe(0);
    expect(replay.feedback()).toBe('');
    expect(replay.selectedLoad()).toBeNull();
    expect(replay.selectedGroup()).toBeNull();
    expect(replay.practiceHelped()).toBe(false);
  });
});
