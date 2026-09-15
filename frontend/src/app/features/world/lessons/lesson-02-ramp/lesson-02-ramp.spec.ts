import { TestBed } from '@angular/core/testing';
import { Lesson02Ramp } from './lesson-02-ramp';

describe('Lesson02Ramp', () => {
  function create() {
    const fixture = TestBed.createComponent(Lesson02Ramp);
    fixture.detectChanges();
    return fixture;
  }

  it('keeps the player in the first decision after choosing the irregular turn', () => {
    const game = create().componentInstance;
    game.chooseTurn('B');
    expect(game.stage()).toBe('choose-turn');
    expect(game.selectedTurn()).toBe('B');
    expect(game.feedback()).toContain('Inténtalo nuevamente');
  });

  it('reveals equal averages only after choosing Turn A', () => {
    const game = create().componentInstance;
    expect(game.stage()).toBe('choose-turn');
    expect(game.average(game.turns[0].values)).toBe(100);
    expect(game.average(game.turns[1].values)).toBe(100);
    game.revealAverages();
    expect(game.stage()).toBe('choose-turn');
    game.chooseTurn('A');
    expect(game.stage()).toBe('turn-confirmed');
    game.revealAverages();
    expect(game.stage()).toBe('compare-averages');
  });

  it('requires No in the conceptual question and emits completion once', () => {
    const game = create().componentInstance;
    const done = vi.fn();
    game.completed.subscribe(done);
    game.chooseTurn('A');
    game.revealAverages();
    game.answerBehavior('yes');
    expect(game.stage()).toBe('compare-averages');
    expect(game.feedback()).toContain('Inténtalo nuevamente');
    game.finish();
    expect(done).not.toHaveBeenCalled();
    game.answerBehavior('no');
    expect(game.stage()).toBe('success');
    game.finish();
    game.finish();
    expect(done).toHaveBeenCalledTimes(1);
  });
});
