import { TestBed } from '@angular/core/testing';
import { Lesson03Haulage } from './lesson-03-haulage';

describe('Lesson03Haulage', () => {
  function create() {
    const fixture = TestBed.createComponent(Lesson03Haulage);
    fixture.detectChanges();
    return fixture;
  }
  function reachRange(game: Lesson03Haulage) {
    game.selectFastest('trip-3'); game.continueToMaximum();
    game.selectSlowest('trip-4'); game.continueToRange();
  }
  it('requires both extremes, accepting either repeated minimum', () => {
    const game = create().componentInstance;
    game.continueToMaximum(); game.continueToRange();
    game.selectFastest('trip-2');
    expect(game.stage()).toBe('find-min');
    game.selectFastest('trip-3');
    expect(game.stage()).toBe('min-found');
    game.continueToMaximum(); game.selectSlowest('trip-5');
    expect(game.stage()).toBe('find-max');
    game.selectSlowest('trip-4'); game.continueToRange();
    expect(game.stage()).toBe('measure-range');
  });
  it('requires extending the accessible ruler and distinguishes maximum from range', () => {
    const fixture = create(); const game = fixture.componentInstance;
    reachRange(game); game.answerRange(7);
    expect(game.stage()).toBe('measure-range');
    fixture.detectChanges();
    const slider = fixture.nativeElement.querySelector('input[type=range]') as HTMLInputElement;
    slider.value = '18'; slider.dispatchEvent(new Event('input'));
    expect(game.rulerEnd()).toBe(18);
    game.answerRange(18); expect(game.feedback()).toContain('máximo');
    game.answerRange(8); expect(game.feedback()).toContain('intervalos');
    game.answerRange(7); expect(game.stage()).toBe('formula');
  });
  it('requires a numeric calculation and interpretation before emitting once', () => {
    const fixture = create(); const game = fixture.componentInstance;
    const done = vi.fn(); game.completed.subscribe(done);
    game.explainRange('separation'); game.finish();
    reachRange(game); game.moveRuler('18'); game.answerRange(7); game.continueToPractice();
    for (const value of ['', 'abc', '15', '4']) {
      game.practiceAnswer.set(value); game.answerPracticeRange();
      expect(game.stage()).toBe('practice-range');
    }
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[type=number]') as HTMLInputElement;
    input.value = '5'; input.dispatchEvent(new Event('input'));
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
    expect(game.stage()).toBe('practice-meaning');
    game.finish(); expect(done).not.toHaveBeenCalled();
    game.explainRange('maximum'); game.explainRange('every');
    expect(game.stage()).toBe('practice-meaning');
    game.explainRange('separation'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Hallazgo:');
    game.finish(); game.finish(); expect(done).toHaveBeenCalledTimes(1);
    fixture.destroy();
    const replay = create().componentInstance;
    expect(replay.stage()).toBe('find-min'); expect(replay.rulerEnd()).toBe(11);
    expect(replay.practiceAnswer()).toBe('');
  });
});
