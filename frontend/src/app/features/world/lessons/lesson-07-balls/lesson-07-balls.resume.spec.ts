import { TestBed } from '@angular/core/testing';
import { Lesson07Balls } from './lesson-07-balls';
import { C7State, isC7State } from './lesson-07-balls.state';

function create(state: C7State | null = null) {
  const fixture = TestBed.createComponent(Lesson07Balls);
  fixture.componentRef.setInput('initialState', state); fixture.detectChanges(); return fixture;
}
function reachReport(game: Lesson07Balls) {
  if (game.stage() === 'observe') game.choosePrediction('equal');
  while (game.stage() !== 'report') {
    if (game.stage() === 'calculate') game.answerVariance(game.activePeriod().variance);
    game.continueCalculation();
  }
}

describe('C7 — exercise restoration', () => {
  it('round-trips the initial case and guided practice without changing calculations, choices or feedback', () => {
    const fixture = TestBed.createComponent(Lesson07Balls); const game = fixture.componentInstance;
    let latest!: C7State;
    game.stateChanged.subscribe(state => { latest = state; });
    fixture.componentRef.setInput('initialState', null); fixture.detectChanges();
    const check = () => {
      expect(isC7State(latest), JSON.stringify(latest)).toBe(true);
      const restored = TestBed.createComponent(Lesson07Balls); const done = vi.fn(); const emitted = vi.fn();
      restored.componentInstance.completed.subscribe(done); restored.componentInstance.stateChanged.subscribe(emitted);
      restored.componentRef.setInput('initialState', latest); restored.detectChanges();
      const copy = restored.componentInstance;
      expect(emitted).toHaveBeenLastCalledWith(latest);
      expect(copy.stage()).toBe(game.stage()); expect(copy.prediction()).toBe(game.prediction());
      expect(copy.round()).toBe(game.round()); expect(copy.activeIndex()).toBe(game.activeIndex());
      expect(copy.solved()).toEqual(game.solved()); expect(copy.solved()).not.toBe(game.solved());
      expect(copy.helped()).toBe(game.helped()); expect(copy.hintLevel()).toBe(game.hintLevel());
      expect(copy.guidedCompletion()).toBe(game.guidedCompletion());
      expect(copy.hintFocus()).toBe(game.hintFocus()); expect(copy.feedback()).toBe(game.feedback());
      expect(copy.pair()).toEqual(game.pair()); expect(copy.periods()).toEqual(game.periods());
      expect(copy.options()).toEqual(game.options()); expect(copy.reportChoices()).toEqual(game.reportChoices());
      expect(copy.squaresVisible()).toBe(game.squaresVisible()); expect(done).not.toHaveBeenCalled(); restored.destroy();
    };
    for (let round = 0; round < 2; round++) {
      check(); game.choosePrediction('equal'); check();
      for (let index = 0; index < 2; index++) {
        game.answerVariance(0); check(); game.answerVariance(game.activePeriod().squareSum); check();
        game.answerVariance(game.activePeriod().variance); check(); game.continueCalculation(); check();
      }
      game.chooseReport('better'); check(); game.chooseReport('equal'); check();
      game.chooseReport('spread'); check();
      if (round === 0) { game.continueAfterHelp(); check(); }
    }
    expect(game.round()).toBe(1); expect(game.helped()).toBe(true); expect(game.guidedCompletion()).toBe(true);
    expect(game.stage()).toBe('success'); expect(game.pair()).toEqual([[97, 100, 100, 100, 100, 103], [97, 97, 100, 100, 103, 103]]);
  });

  it('offers an explicit guided finish for an old review draft without adding another practice', () => {
    const state: C7State = { stage: 'review', round: 3, prediction: 'a', activeIndex: 1,
      solved: ['a', 'b'], helped: true, hintLevel: 0, hintFocus: null, choiceOffset: 2 };
    const fixture = create(state); const game = fixture.componentInstance; const done = vi.fn();
    game.completed.subscribe(done);
    expect(game.stage()).toBe('review'); expect(game.round()).toBe(3);
    expect(fixture.nativeElement.textContent).toContain('No necesitas repetir otra ronda');
    const button = fixture.nativeElement.querySelector('.task-card .btn--primary') as HTMLButtonElement;
    expect(button.textContent?.trim()).toBe('Ver el informe →');
    expect(done).not.toHaveBeenCalled(); button.click(); fixture.detectChanges();
    expect(game.stage()).toBe('success'); expect(game.round()).toBe(3);
    expect(game.helped()).toBe(true); expect(game.guidedCompletion()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Completaste con ayuda');
    expect(done).not.toHaveBeenCalled();
    game.finish(); game.finish(); expect(done).toHaveBeenCalledTimes(1);
  });

  it('restores each kind and level of hint in the correct period without consuming another hint', () => {
    const game = create().componentInstance; let state!: C7State;
    game.stateChanged.subscribe(value => { state = value; }); game.choosePrediction('b');
    for (let index = 0; index < 2; index++) {
      game.answerVariance(game.activePeriod().squareSum);
      const first = create(state); expect(first.componentInstance.hintLevel()).toBe(1);
      expect(first.nativeElement.querySelectorAll('.record--hint')).toHaveLength(6);
      expect(first.componentInstance.feedback()).toBe(game.feedback()); first.destroy();
      game.requestHint(); const explained = create(state);
      expect(explained.componentInstance.hintLevel()).toBe(2);
      expect(explained.componentInstance.feedback()).toContain(index === 0 ? '18 ÷ 6 = 3' : '36 ÷ 6 = 6');
      expect(explained.nativeElement.querySelectorAll('.square-cell')).toHaveLength(index === 0 ? 18 : 36);
      expect(explained.nativeElement.textContent).toContain('Ejemplo explicado'); explained.destroy();
      game.answerVariance(game.activePeriod().variance); game.continueCalculation();
    }
    game.chooseReport('better'); const context = create(state);
    expect(context.nativeElement.textContent).toContain('Todavía no sabemos qué meta'); context.destroy();
    game.requestHint(); const explanation = create(state);
    expect(explanation.componentInstance.feedback()).toContain('Variar menos no significa trabajar mejor'); explanation.destroy();
  });

  it('retains solved A when resuming B, rejects duplicate A answers and requires fresh practice after a hint', () => {
    const game = create().componentInstance; let state!: C7State;
    game.stateChanged.subscribe(value => { state = value; }); game.choosePrediction('b');
    game.requestHint(); game.answerVariance(3); game.continueCalculation();
    const copy = create(state).componentInstance;
    expect(copy.activeIndex()).toBe(1); expect(copy.solved()).toEqual(['a']); expect(copy.helped()).toBe(true);
    copy.answerVariance(6); copy.answerVariance(6); expect(copy.solved()).toEqual(['a', 'b']);
    copy.continueCalculation(); copy.chooseReport('spread'); copy.finish(); expect(copy.stage()).toBe('review');
    copy.continueAfterHelp(); expect(copy.prediction()).toBeNull(); expect(copy.round()).toBe(1);
    expect(copy.solved()).toEqual([]); expect(copy.helped()).toBe(false);
    reachReport(copy); copy.chooseReport('spread'); expect(copy.stage()).toBe('success');
  });

  it('publishes success before completion and keeps the final evidence original after a practice round', () => {
    const game = create({ stage: 'success', round: 3, prediction: 'a', activeIndex: 1,
      solved: ['a', 'b'], helped: false, hintLevel: 0, hintFocus: null, choiceOffset: 1 }).componentInstance;
    const events: string[] = []; game.stateChanged.subscribe(state => events.push(state.stage));
    game.completed.subscribe(() => events.push('completed'));
    expect(game.originalPeriods.map(period => period.variance)).toEqual([3, 6]); expect(events).toEqual([]);
    game.finish(); game.finish(); expect(events).toEqual(['success', 'completed']);
  });

  it('ignores invalid restoration and invalid or out-of-stage actions', () => {
    const game = create({ stage: 'success', helped: true } as C7State).componentInstance;
    const emitted = vi.fn(); game.stateChanged.subscribe(emitted);
    expect(game.stage()).toBe('observe'); game.answerVariance(3); game.continueCalculation(); game.finish();
    game.choosePrediction('invalid' as 'a'); expect(emitted).not.toHaveBeenCalled();
    game.choosePrediction('b'); emitted.mockClear();
    game.answerVariance(NaN); game.answerVariance(999); game.chooseReport('spread'); expect(emitted).not.toHaveBeenCalled();
  });
});
