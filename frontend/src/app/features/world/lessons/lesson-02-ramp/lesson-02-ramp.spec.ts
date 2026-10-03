import { TestBed } from '@angular/core/testing';
import { Lesson02Ramp } from './lesson-02-ramp';

describe('Lesson02Ramp', () => {
  function create() {
    const fixture = TestBed.createComponent(Lesson02Ramp);
    fixture.detectChanges();
    return fixture;
  }
  function practice(game: Lesson02Ramp) {
    game.assess('unknown'); game.request('records'); game.compare('spread'); game.startPractice();
  }
  it('shows only means until the player identifies missing information and requests records', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.records')).toBeNull();
    expect(root.textContent).not.toContain('Objetivo operativo');
    game.request('records');
    game.assess('same'); game.assess('b');
    expect(game.stage()).toBe('report');
    game.assess('unknown');
    game.request('drivers'); game.request('decimals');
    fixture.detectChanges();
    expect(root.querySelector('.records')).toBeNull();
    game.request('records');
    fixture.detectChanges();
    expect(root.querySelectorAll('.record')).toHaveLength(10);
    expect(game.turns.map(turn => game.average(turn.values))).toEqual([100, 100]);
  });
  it('requires interpreting the records before independent practice', () => {
    const game = create().componentInstance;
    game.startPractice(); game.compare('spread');
    expect(game.stage()).toBe('report');
    game.assess('unknown'); game.request('records');
    game.compare('same'); game.compare('mean');
    expect(game.stage()).toBe('records');
    game.compare('spread'); game.startPractice();
    expect(game.practiceMean()).toBe(90);
    expect(game.showRecords()).toBe(false);
  });
  it('requires fresh reports after a hinted answer or explanation', () => {
    const game = create().componentInstance;
    practice(game);
    game.answerPractice('yes');
    game.answerPractice('unknown'); game.explain('center');
    expect(game.stage()).toBe('hint');
    game.startPractice();
    expect(game.practiceMean()).toBe(95);
    game.answerPractice('unknown'); game.explain('always-same');
    expect(game.stage()).toBe('hint');
    game.startPractice();
    expect(game.practiceMean()).toBe(100);
    game.answerPractice('unknown'); game.explain('always-different');
    expect(game.stage()).toBe('hint');
  });
  it('emits once only after the independent answer and explanation', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    const done = vi.fn(); game.completed.subscribe(done);
    game.finish(); practice(game); game.answerPractice('unknown'); game.finish();
    expect(done).not.toHaveBeenCalled();
    game.explain('center'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Hallazgo:');
    game.finish(); game.finish();
    expect(done).toHaveBeenCalledTimes(1);
    fixture.destroy();
    const replay = create().componentInstance;
    expect(replay.stage()).toBe('report'); expect(replay.feedback()).toBe(''); expect(replay.round()).toBe(0);
  });
});
