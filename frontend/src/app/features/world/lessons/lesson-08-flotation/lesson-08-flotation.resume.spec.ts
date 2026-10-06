import { TestBed } from '@angular/core/testing';
import { Lesson08Flotation } from './lesson-08-flotation';
import { C8State, isC8State } from './lesson-08-flotation.state';

function create(state: C8State | null = null) {
  const fixture = TestBed.createComponent(Lesson08Flotation);
  fixture.componentRef.setInput('initialState', state); fixture.detectChanges(); return fixture;
}
function solve(game: Lesson08Flotation) {
  game.startRoot(); game.answerRoot(game.stats().standardDeviation); game.continueToBand();
  game.selectRecord(game.points().find(point => point.outside)!.id);
  game.continueToReport(); game.answerComparison('inside'); game.continueToReport(); game.chooseReport('observed');
}

describe('C8 — exercise restoration', () => {
  it('emits reachable snapshots for every stage, practice and comparison, preserving data and choice order', () => {
    const fixture = TestBed.createComponent(Lesson08Flotation); const game = fixture.componentInstance;
    let latest!: C8State;
    game.stateChanged.subscribe(state => { latest = state; });
    fixture.componentRef.setInput('initialState', null); fixture.detectChanges();
    const check = () => {
      expect(isC8State(latest)).toBe(true);
      const restored = TestBed.createComponent(Lesson08Flotation); const done = vi.fn(); const emitted = vi.fn();
      restored.componentInstance.completed.subscribe(done); restored.componentInstance.stateChanged.subscribe(emitted);
      restored.componentRef.setInput('initialState', latest); restored.detectChanges();
      const copy = restored.componentInstance;
      expect(emitted).toHaveBeenLastCalledWith(latest);
      expect(copy.stage()).toBe(game.stage()); expect(copy.round()).toBe(game.round());
      expect(copy.helped()).toBe(game.helped()); expect(copy.selectedRecord()).toBe(game.selectedRecord());
      expect(copy.guidedCompletion()).toBe(game.guidedCompletion());
      expect(copy.comparing()).toBe(game.comparing()); expect(copy.records()).toEqual(game.records());
      expect(copy.stats()).toEqual(game.stats()); expect(copy.options()).toEqual(game.options());
      expect(copy.reportChoices()).toEqual(game.reportChoices()); expect(copy.points()).toEqual(game.points());
      expect(copy.feedback()).toBe(''); expect(done).not.toHaveBeenCalled(); restored.destroy();
    };
    check(); game.startRoot(); check();
    for (let round = 0; round < 2; round++) {
      game.requestHint(); check();
      game.answerRoot(game.stats().standardDeviation); check();
      game.continueToBand(); check();
      game.selectRecord(game.points().find(point => point.outside)!.id); check();
      game.continueToReport(); check();
      game.answerComparison('outside'); check();
      game.answerComparison('inside'); check();
      game.continueToReport(); check(); game.chooseReport('observed'); check();
      if (round === 0) { game.continueAfterHelp(); check(); }
    }
    expect(game.stage()).toBe('success'); expect(game.records()).toEqual([96, 100, 100, 100, 102, 102]);
    expect(game.round()).toBe(1); expect(game.helped()).toBe(true); expect(game.guidedCompletion()).toBe(true);
  });

  it('preserves help after reopening and limits the requirement to one additional practice', () => {
    const game = create().componentInstance; let state!: C8State;
    game.stateChanged.subscribe(value => { state = value; }); game.startRoot(); game.requestHint();
    const fixture = create(state); const copy = fixture.componentInstance; const done = vi.fn(); copy.completed.subscribe(done);
    solve(copy); copy.finish(); expect(copy.stage()).toBe('review'); expect(done).not.toHaveBeenCalled();
    copy.continueAfterHelp(); expect(copy.round()).toBe(1); expect(copy.helped()).toBe(false);
    copy.requestHint(); solve(copy); copy.finish(); expect(done).toHaveBeenCalledOnce();
    expect(copy.round()).toBe(1); expect(copy.helped()).toBe(true); expect(copy.guidedCompletion()).toBe(true);
  });

  it('restores older helped review drafts with an explicit finish instead of another round', () => {
    const fixture = create({ stage: 'review', round: 3, helped: true, selectedRecord: 0, comparing: false, choiceOffset: 2 });
    const game = fixture.componentInstance; const done = vi.fn(); game.completed.subscribe(done);
    expect(game.stage()).toBe('review'); expect(game.needsPractice()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('No necesitas repetir otra ronda');
    const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'))
      .find(candidate => candidate.textContent?.trim() === 'Ver el informe →');
    expect(button).toBeDefined(); game.finish(); expect(done).not.toHaveBeenCalled();
    button!.click(); fixture.detectChanges();
    expect(game.stage()).toBe('success'); expect(game.round()).toBe(3);
    expect(game.helped()).toBe(true); expect(game.guidedCompletion()).toBe(true);
    expect(game.records()).toEqual(game.originalStats.values); expect(done).not.toHaveBeenCalled();
    game.finish(); game.finish(); expect(done).toHaveBeenCalledOnce();
  });

  it('restores the comparison without treating the prior selection as a comparison record', () => {
    const fixture = create({ stage: 'locate', round: 2, helped: false, selectedRecord: 5, comparing: true, choiceOffset: 2 });
    const game = fixture.componentInstance;
    expect(game.records()).toEqual([102, 102, 102, 110, 110, 110]);
    expect(game.stats().outside).toEqual([]); expect(game.stats().mean).toBe(106);
    game.selectRecord(5); expect(game.stage()).toBe('locate');
    game.answerComparison('inside'); game.continueToReport();
    expect(game.stage()).toBe('report'); expect(game.records()).toEqual([102, 102, 106, 106, 106, 114]);
    expect(game.selectedRecord()).toBe(5);
  });

  it.each([false, true])('restores successful practice with helped=%s, original evidence and explicit completion', helped => {
    const fixture = create({ stage: 'success', round: 2, helped, selectedRecord: 5, comparing: false, choiceOffset: 1 });
    const game = fixture.componentInstance; const events: string[] = [];
    game.stateChanged.subscribe(state => events.push(state.stage)); game.completed.subscribe(() => events.push('completed'));
    expect(game.stats().mean).toBe(100); expect(game.stats().standardDeviation).toBe(2);
    expect(game.helped()).toBe(helped); expect(game.guidedCompletion()).toBe(helped);
    if (helped) expect(fixture.nativeElement.textContent).toContain('Completaste con ayuda');
    expect(fixture.nativeElement.textContent).toContain('96');
    expect(events).toEqual([]); game.finish(); game.finish(); expect(events).toEqual(['success', 'completed']);
  });

  it('ignores an impossible restoration and does not publish invalid or out-of-stage actions', () => {
    const game = create({ stage: 'success', helped: true } as C8State).componentInstance;
    const emitted = vi.fn(); game.stateChanged.subscribe(emitted);
    expect(game.stage()).toBe('observe');
    game.selectRecord(0); game.answerRoot(2); game.chooseReport('observed'); game.finish();
    expect(emitted).not.toHaveBeenCalled(); game.startRoot(); emitted.mockClear();
    game.answerRoot(NaN); game.answerRoot(99); expect(emitted).not.toHaveBeenCalled();
  });
});
