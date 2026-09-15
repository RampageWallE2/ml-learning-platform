import { TestBed } from '@angular/core/testing';
import { Lesson01Loading } from './lesson-01-loading';

describe('Lesson01Loading', () => {
  function create() {
    const fixture = TestBed.createComponent(Lesson01Loading);
    fixture.detectChanges();
    return fixture;
  }

  function orderGroupA(game: Lesson01Loading) {
    game.moveLoad(4, 1); // 98, 99, 102, 100, 101
    game.moveLoad(2, 4); // 98, 99, 100, 101, 102
    game.checkOrder();
  }

  function reachComparison(game: Lesson01Loading) {
    orderGroupA(game);
    game.continueOrder();
    game.moveLoad(1, 4); // 82, 95, 111, 96, 116
    game.moveLoad(3, 2); // 82, 95, 96, 111, 116
    game.checkOrder();
    game.continueOrder();
  }

  it('keeps an incorrect order and offers a retry without advancing', () => {
    const game = create().componentInstance;
    const original = game.loads();
    game.checkOrder();
    game.continueOrder();
    expect(game.loads()).toEqual(original);
    expect(game.stage()).toBe('order-a');
    expect(game.feedback()).toContain('Inténtalo nuevamente');
    expect(game.orderAccepted()).toBe(false);
  });

  it('lets touch/keyboard users order with the visible buttons', () => {
    const fixture = create();
    const root = fixture.nativeElement as HTMLElement;
    const before = () => root.querySelector<HTMLButtonElement>('[aria-label="Mover camión A5 una posición antes"]')!;
    for (let i = 0; i < 3; i++) {
      before().click();
      fixture.detectChanges();
    }
    for (let i = 0; i < 2; i++) {
      root.querySelector<HTMLButtonElement>('[aria-label="Mover camión A2 una posición después"]')!.click();
      fixture.detectChanges();
    }
    expect(fixture.componentInstance.loads().map(load => load.tonnes)).toEqual([98, 99, 100, 101, 102]);
    expect(root.querySelectorAll('[data-load-index]')).toHaveLength(5);
  });

  it('requires both correct orders before revealing the common scale', () => {
    const fixture = create();
    const game = fixture.componentInstance;
    expect(fixture.nativeElement.querySelector('svg')).toBeNull();
    orderGroupA(game);
    expect(game.orderAccepted()).toBe(true);
    game.continueOrder();
    expect(game.stage()).toBe('order-b');
    expect(game.loads().map(load => load.tonnes)).toEqual([82, 116, 95, 111, 96]);
    game.continueOrder();
    expect(game.stage()).toBe('order-b');
    game.moveLoad(1, 4);
    game.moveLoad(3, 2);
    game.checkOrder();
    game.continueOrder();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('svg')).toHaveLength(2);
    expect(game.plots[0].points.map(point => point.x)).toEqual([246, 258, 270, 282, 294]);
    expect(game.plots[1].points.map(point => point.x)).toEqual([54, 210, 222, 402, 462]);
  });

  it('finishes only after selecting B and continuing, and emits once', () => {
    const game = create().componentInstance;
    const done = vi.fn();
    game.completed.subscribe(done);
    game.finish();
    game.chooseGroup('B');
    expect(done).not.toHaveBeenCalled();
    reachComparison(game);
    game.chooseGroup('A');
    expect(game.stage()).toBe('compare');
    expect(game.feedback()).toContain('Inténtalo nuevamente');
    game.chooseGroup('B');
    expect(done).not.toHaveBeenCalled();
    game.finish();
    game.finish();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('starts a replay with the original data and no prior answers', () => {
    const fixture = create();
    reachComparison(fixture.componentInstance);
    fixture.componentInstance.chooseGroup('B');
    fixture.destroy();
    const replay = create().componentInstance;
    expect(replay.stage()).toBe('order-a');
    expect(replay.loads().map(load => load.tonnes)).toEqual([98, 102, 100, 101, 99]);
    expect(replay.feedback()).toBe('');
  });
});
