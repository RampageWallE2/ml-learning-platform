import { TestBed } from '@angular/core/testing';
import { Lesson03Haulage } from './lesson-03-haulage';

describe('Lesson03Haulage', () => {
  function create() {
    const fixture = TestBed.createComponent(Lesson03Haulage);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('requires the minimum and maximum before measuring the range', () => {
    const game = create();
    game.selectFastest('trip-2');
    expect(game.stage()).toBe('find-min');
    game.selectFastest('trip-3');
    expect(game.stage()).toBe('min-found');
    game.continueToMaximum();
    game.selectSlowest('trip-5');
    expect(game.stage()).toBe('find-max');
    game.selectSlowest('trip-4');
    expect(game.stage()).toBe('max-found');
    game.continueToRange();
    expect(game.stage()).toBe('measure-range');
  });

  it('formalizes the range only after measuring seven minutes', () => {
    const game = createAtRangeStage();
    game.answerRange(8);
    expect(game.stage()).toBe('measure-range');
    game.answerRange(7);
    expect(game.stage()).toBe('formula');
    expect(game.feedback()).toContain('7 minutos');
  });

  it('checks a second dataset and emits completion once', () => {
    const game = createAtRangeStage();
    const done = vi.fn();
    game.completed.subscribe(done);
    game.answerRange(7);
    game.continueToPractice();
    game.selectPracticeExtreme('practice-1');
    expect(game.stage()).toBe('practice-min');
    game.selectPracticeExtreme('practice-2');
    expect(game.stage()).toBe('practice-max');
    game.selectPracticeExtreme('practice-4');
    expect(game.stage()).toBe('practice-range');
    game.answerPracticeRange(4);
    expect(game.stage()).toBe('practice-range');
    game.answerPracticeRange(5);
    expect(game.stage()).toBe('success');
    game.finish();
    game.finish();
    expect(done).toHaveBeenCalledTimes(1);
  });

  function createAtRangeStage(): Lesson03Haulage {
    const game = create();
    game.selectFastest('trip-1');
    game.continueToMaximum();
    game.selectSlowest('trip-4');
    game.continueToRange();
    return game;
  }
});
