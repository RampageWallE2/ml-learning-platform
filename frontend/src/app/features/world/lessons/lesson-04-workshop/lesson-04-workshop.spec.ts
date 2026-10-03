import { TestBed } from '@angular/core/testing';
import { Lesson04Workshop } from './lesson-04-workshop';

describe('Lesson04Workshop', () => {
  function create() { const fixture = TestBed.createComponent(Lesson04Workshop); fixture.detectChanges(); return fixture; }
  function simulate(game: Lesson04Workshop) {
    game.rangeA.set('4'); game.rangeB.set('4'); game.checkRanges(); game.compare('concentrated');
  }
  it('requires both ranges and evidence from the interior before simulation', () => {
    const game = create().componentInstance;
    game.compare('concentrated'); game.confirmSimulation(); game.explain('extremes');
    expect(game.stage()).toBe('ranges');
    game.rangeA.set('4'); game.rangeB.set('12'); game.checkRanges();
    expect(game.stage()).toBe('ranges');
    game.rangeB.set('4'); game.checkRanges(); game.compare('identical');
    expect(game.stage()).toBe('compare');
    game.compare('concentrated'); expect(game.stage()).toBe('simulation');
  });
  it('changes only the simulation, preserving extrema and mean across every slider value', () => {
    const fixture = create(); const game = fixture.componentInstance;
    simulate(game); game.confirmSimulation(); expect(game.stage()).toBe('simulation');
    fixture.detectChanges();
    const slider = fixture.nativeElement.querySelector('input[type=range]') as HTMLInputElement;
    for (const delta of [0, 1, 2]) {
      slider.value = String(delta); slider.dispatchEvent(new Event('input'));
      expect(game.simulatedRange()).toBe(4); expect(game.simulatedMean()).toBe(10);
      expect(game.simulated()).toEqual([8, 10 - delta, 10, 10 + delta, 12]);
      expect(game.records[0].values).toEqual([8, 10, 10, 10, 12]);
    }
    game.moveInterior('9'); expect(game.distance()).toBe(2);
    game.confirmSimulation(); expect(game.stage()).toBe('explain');
    game.explain('unchanged'); game.explain('useless'); expect(game.stage()).toBe('explain');
    game.explain('extremes'); expect(game.stage()).toBe('practice');
  });
  it('requires fresh dataset calculations and a conclusion, emits once and resets on replay', () => {
    const fixture = create(); const game = fixture.componentInstance;
    const done = vi.fn(); game.completed.subscribe(done); game.finish();
    simulate(game); game.moveInterior('1'); game.confirmSimulation(); game.explain('extremes');
    game.practiceClaim.set('different'); game.checkPractice(); expect(game.stage()).toBe('practice');
    game.practiceC.set('4'); game.practiceD.set('4'); game.practiceClaim.set('same'); game.checkPractice();
    expect(game.stage()).toBe('practice'); game.finish(); expect(done).not.toHaveBeenCalled();
    game.practiceClaim.set('different'); game.checkPractice(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Hallazgo:');
    game.finish(); game.finish(); expect(done).toHaveBeenCalledTimes(1);
    fixture.destroy(); const replay = create().componentInstance;
    expect(replay.stage()).toBe('ranges'); expect(replay.distance()).toBe(0); expect(replay.rangeA()).toBe('');
  });
});
