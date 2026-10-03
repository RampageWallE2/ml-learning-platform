import { TestBed } from '@angular/core/testing';
import { Lesson01Loading } from './lesson-01-loading';

describe('Lesson01Loading', () => {
  function create() {
    const fixture = TestBed.createComponent(Lesson01Loading);
    fixture.detectChanges();
    return fixture;
  }
  function practice(game: Lesson01Loading) {
    game.chooseGroup('B');
    game.chooseReason('spread');
    game.startPractice();
  }
  it('shows both scales immediately and lets a record highlight its point', () => {
    const fixture = create();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('svg')).toHaveLength(2);
    expect(root.textContent).not.toContain('Comprobar orden');
    const record = root.querySelector<HTMLButtonElement>('.load-record')!;
    record.click();
    fixture.detectChanges();
    expect(record.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelectorAll('.point--selected')).toHaveLength(1);
    expect(fixture.componentInstance.scaleX(100)).toBe(270);
  });
  it('requires a correct comparison and explanation before practice', () => {
    const game = create().componentInstance;
    game.startPractice();
    game.chooseReason('spread');
    expect(game.stage()).toBe('compare');
    game.chooseGroup('A');
    expect(game.stage()).toBe('compare');
    game.chooseGroup('B');
    game.chooseReason('maximum');
    expect(game.stage()).toBe('justify');
    game.chooseReason('count');
    expect(game.feedback()).toContain('cinco');
    game.chooseReason('spread');
    expect(game.stage()).toBe('discovery');
  });
  it('completes only after a new comparison and explanation, emitting once', () => {
    const game = create().componentInstance;
    const done = vi.fn();
    game.completed.subscribe(done);
    game.finish();
    practice(game);
    game.chooseGroup('D');
    game.finish();
    expect(done).not.toHaveBeenCalled();
    game.chooseReason('spread');
    game.finish();
    game.finish();
    expect(done).toHaveBeenCalledTimes(1);
  });
  it('requires E/F after a hinted C/D answer rather than accepting a revealed retry', () => {
    const game = create().componentInstance;
    practice(game);
    game.chooseGroup('C');
    expect(game.stage()).toBe('practice-hint');
    game.chooseGroup('D');
    game.chooseReason('spread');
    expect(game.stage()).toBe('practice-hint');
    game.startPractice();
    expect(game.groups().map(group => group.loads)).toEqual([[85, 100, 115], [105, 106, 107]]);
    game.chooseGroup('E');
    game.chooseReason('spread');
    expect(game.stage()).toBe('success');
  });
  it('requires fresh evidence after incorrect practice justification and further retries', () => {
    const game = create().componentInstance;
    practice(game);
    game.chooseGroup('D');
    game.chooseReason('maximum');
    game.startPractice();
    game.chooseGroup('F');
    game.startPractice();
    expect(game.practiceRound()).toBe(2);
    expect(game.groups().flatMap(group => group.loads).every(value => value >= 80 && value <= 120)).toBe(true);
    game.chooseGroup('G');
    game.chooseReason('spread');
    expect(game.stage()).toBe('success');
  });
  it('renders the summary and resets answers on replay', () => {
    const fixture = create();
    practice(fixture.componentInstance);
    fixture.componentInstance.chooseGroup('D');
    fixture.componentInstance.chooseReason('spread');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Hallazgo:');
    fixture.destroy();
    const replay = create().componentInstance;
    expect(replay.stage()).toBe('compare');
    expect(replay.practiceRound()).toBe(0);
    expect(replay.feedback()).toBe('');
  });
});
