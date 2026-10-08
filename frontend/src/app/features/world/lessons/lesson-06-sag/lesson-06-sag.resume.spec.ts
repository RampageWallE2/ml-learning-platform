import { TestBed } from '@angular/core/testing';
import { Lesson06Sag } from './lesson-06-sag';
import { C6State, isC6State } from './lesson-06-sag.state';

function create(state: C6State | null = null) {
  const fixture = TestBed.createComponent(Lesson06Sag);
  fixture.componentRef.setInput('initialState', state);
  fixture.detectChanges();
  return fixture;
}
function reachPractice(game: Lesson06Sag) {
  game.sumChanges();
  game.chooseCancellation('balanced');
  game.formSquares();
  game.answerSquare(4);
  game.chooseWeight('four');
  game.startPractice();
}

describe('C6 — exercise restoration', () => {
  it('emits reachable snapshots and restores every action without completing or losing choice order', () => {
    const fixture = TestBed.createComponent(Lesson06Sag);
    const game = fixture.componentInstance;
    let latest!: C6State;
    game.stateChanged.subscribe((state) => {
      latest = state;
    });
    fixture.componentRef.setInput('initialState', null);
    fixture.detectChanges();
    const actions = [
      () => {},
      () => game.sumChanges(),
      () => game.chooseCancellation('balanced'),
      () => game.formSquares(),
      () => game.answerSquare(4),
      () => game.chooseWeight('four'),
      () => game.startPractice(),
      () => game.answerPracticeSquare(-1),
      () => game.answerPracticeSquare(1),
      () => game.answerPracticeVariance(1),
      () => game.continuePractice(),
      () => game.continueAfterHelp(),
      () => game.answerPracticeSquare(-4),
      () => game.answerPracticeSquare(4),
      () => game.answerPracticeVariance(4),
      () => game.continuePractice(),
    ];
    for (const action of actions) {
      action();
      expect(isC6State(latest)).toBe(true);
      const restored = TestBed.createComponent(Lesson06Sag);
      const done = vi.fn();
      const emitted = vi.fn();
      restored.componentInstance.completed.subscribe(done);
      restored.componentInstance.stateChanged.subscribe(emitted);
      restored.componentRef.setInput('initialState', latest);
      restored.detectChanges();
      const copy = restored.componentInstance;
      expect(emitted).toHaveBeenLastCalledWith(latest);
      expect(copy.records()).toEqual(game.records());
      expect(copy.mean()).toBe(game.mean());
      expect(copy.stage()).toBe(game.stage());
      expect(copy.round()).toBe(game.round());
      expect(copy.squaresFormed()).toBe(game.squaresFormed());
      expect(copy.practiceHelped()).toBe(game.practiceHelped());
      expect(copy.guidedCompletion()).toBe(game.guidedCompletion());
      expect(copy.practiceVarianceAnswered()).toBe(game.practiceVarianceAnswered());
      expect(copy.practiceVarianceOptions()).toEqual(game.practiceVarianceOptions());
      expect(copy.feedback()).toBe('');
      expect(done).not.toHaveBeenCalled();
      restored.destroy();
    }
    expect(game.stage()).toBe('success');
    expect(game.guidedCompletion()).toBe(true);
    expect(game.round()).toBe(1);
    expect(game.practiceHelped()).toBe(true);
  });

  it('preserves used help and offers only one additional practice after reopening', () => {
    const game = create().componentInstance;
    let state!: C6State;
    game.stateChanged.subscribe((value) => {
      state = value;
    });
    reachPractice(game);
    game.answerPracticeSquare(-1);
    const copy = create(state).componentInstance;
    const done = vi.fn();
    copy.completed.subscribe(done);
    copy.answerPracticeSquare(1);
    copy.answerPracticeVariance(1);
    copy.continuePractice();
    copy.finish();
    expect(copy.stage()).toBe('review');
    expect(done).not.toHaveBeenCalled();
    copy.continueAfterHelp();
    expect(copy.round()).toBe(1);
    expect(copy.practiceHelped()).toBe(false);
    copy.answerPracticeSquare(-4);
    copy.answerPracticeSquare(4);
    copy.answerPracticeVariance(4);
    copy.continuePractice();
    expect(copy.guidedCompletion()).toBe(true);
    expect(copy.practiceHelped()).toBe(true);
    copy.continueAfterHelp();
    expect(copy.round()).toBe(1);
    copy.finish();
    expect(done).toHaveBeenCalledOnce();
  });

  it('offers an explicit guided finish for an old review draft without adding another practice', () => {
    const state: C6State = {
      stage: 'review',
      squaresFormed: true,
      round: 3,
      practiceHelped: true,
      practiceVarianceAnswered: true,
      choiceOffset: 2,
    };
    const fixture = create(state);
    const game = fixture.componentInstance;
    const done = vi.fn();
    game.completed.subscribe(done);
    expect(game.stage()).toBe('review');
    expect(game.round()).toBe(3);
    expect(fixture.nativeElement.textContent).toContain('No necesitas repetir otra ronda');
    const button = fixture.nativeElement.querySelector(
      '.task-card .btn--primary',
    ) as HTMLButtonElement;
    expect(button.textContent?.trim()).toBe('Ver el informe →');
    expect(done).not.toHaveBeenCalled();
    button.click();
    fixture.detectChanges();
    expect(game.stage()).toBe('success');
    expect(game.guidedCompletion()).toBe(true);
    expect(game.round()).toBe(3);
    expect(game.practiceHelped()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Completaste con ayuda');
    expect(done).not.toHaveBeenCalled();
    game.finish();
    game.finish();
    expect(done).toHaveBeenCalledOnce();
  });

  it('publishes the successful snapshot before completion and ignores invalid restoration', () => {
    const fixture = create({ stage: 'success' } as C6State);
    const game = fixture.componentInstance;
    expect(game.stage()).toBe('observe');
    reachPractice(game);
    game.answerPracticeSquare(1);
    game.answerPracticeVariance(1);
    game.continuePractice();
    const events: string[] = [];
    game.stateChanged.subscribe((state) => events.push(state.stage));
    game.completed.subscribe(() => events.push('completed'));
    game.finish();
    game.finish();
    expect(events).toEqual(['success', 'completed']);
  });
});
