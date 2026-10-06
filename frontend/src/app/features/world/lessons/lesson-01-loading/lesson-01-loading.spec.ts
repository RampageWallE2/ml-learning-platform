import { TestBed } from '@angular/core/testing';
import { Lesson01Loading } from './lesson-01-loading';
import { LESSON_NAMES } from '../lesson-catalog';

describe('Lesson01Loading', () => {
  function create() {
    const fixture = TestBed.createComponent(Lesson01Loading);
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

  it('completes only after an independent comparison and explanation, emitting once', () => {
    const game = create().componentInstance;
    const done = vi.fn();
    game.completed.subscribe(done);
    game.finish();
    practice(game);
    expect(game.step()).toBe(3);
    expect(game.groups().map(group => group.loads)).toEqual([[110, 111, 112], [90, 100, 110]]);
    game.chooseGroup('D');
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
    const game = create().componentInstance;
    const done = vi.fn();
    game.completed.subscribe(done);
    practice(game);
    game.chooseGroup('C');
    game.chooseGroup('D');
    game.chooseReason('spread');
    expect(game.stage()).toBe('practice-review');
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
    game.chooseGroup('D');
    expect(game.stage()).toBe('practice');
    game.chooseGroup('E');
    game.chooseReason('spread');
    expect(game.stage()).toBe('success');
  });

  it('keeps the same example after an incorrect reason without marking it mastered', () => {
    const game = create().componentInstance;
    practice(game);
    game.chooseGroup('D');
    const before = game.groups();
    game.chooseReason('maximum');
    expect(game.stage()).toBe('practice-reason');
    expect(game.groups()).toBe(before);
    expect(game.feedback()).toContain('Un solo camión');
    game.chooseReason('count');
    expect(game.feedback()).toContain('tres camiones');
    game.chooseReason('spread');
    expect(game.stage()).toBe('practice-review');
    game.continueAfterHelp();
    game.chooseGroup('E');
    game.chooseReason('spread');
    expect(game.stage()).toBe('success');
  });

  it('keeps subsequent supported checks valid and changes the correct group position', () => {
    const game = create().componentInstance;
    practice(game);
    for (let round = 0; round < 5; round += 1) {
      expect(game.practiceRound()).toBe(round);
      expect(game.groups().flatMap(group => group.loads).every(value => value >= 80 && value <= 120)).toBe(true);
      const wrong = game.groups().find(group => group.name !== game.correctGroup())!;
      const correct = game.groups().find(group => group.name === game.correctGroup())!;
      expect(Math.max(...correct.loads) - Math.min(...correct.loads)).toBeGreaterThan(Math.max(...wrong.loads) - Math.min(...wrong.loads));
      game.chooseGroup(wrong.name);
      game.chooseGroup(correct.name);
      game.chooseReason('spread');
      expect(game.stage()).toBe('practice-review');
      game.continueAfterHelp();
    }
    game.chooseGroup(game.correctGroup());
    game.chooseReason('spread');
    expect(game.stage()).toBe('success');
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
    root.querySelectorAll<HTMLButtonElement>('.reason-choice')[1].click();
    fixture.detectChanges();
    expect(root.querySelector('.completion-card')).not.toBeNull();
    expect(root.querySelector('.report-card')!.textContent).toContain('Las cargas del grupo B fueron más diferentes');
    expect(root.querySelectorAll('input, textarea')).toHaveLength(0);
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
