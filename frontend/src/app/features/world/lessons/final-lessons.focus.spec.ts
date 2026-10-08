import { TestBed } from '@angular/core/testing';
import { Type } from '@angular/core';
import { Lesson06Sag } from './lesson-06-sag/lesson-06-sag';
import { Lesson07Balls } from './lesson-07-balls/lesson-07-balls';
import { Lesson08Flotation } from './lesson-08-flotation/lesson-08-flotation';
import { Lesson09Thickeners } from './lesson-09-thickeners/lesson-09-thickeners';

describe('Final lessons reading order', () => {
  it.each([
    ['C6', Lesson06Sag],
    ['C7', Lesson07Balls],
    ['C8', Lesson08Flotation],
    ['C9', Lesson09Thickeners],
  ] as const)(
    '%s puts one question before its evidence and keeps supporting details closed',
    (_, component) => {
      const fixture = TestBed.createComponent(component as Type<unknown>);
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      const prompt = root.querySelector('.step-prompt')!;
      const workbench = root.querySelector('.workbench')!;
      expect(root.querySelectorAll('.step-prompt')).toHaveLength(1);
      expect(
        prompt.compareDocumentPosition(workbench) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(root.querySelector('.task-card')?.getAttribute('aria-labelledby')).toBe(prompt.id);
      expect(root.querySelector('.task-card h3')).toBeNull();
      expect(root.querySelectorAll('details[open]')).toHaveLength(0);
      expect(
        root.querySelector('details button.btn--answer, details button.btn--primary'),
      ).toBeNull();
    },
  );

  it('C8 focuses on the square while leaving the group records available separately', () => {
    const fixture = TestBed.createComponent(Lesson08Flotation);
    fixture.detectChanges();
    const game = fixture.componentInstance;
    game.startRoot();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.workbench > .data-board')).toBeNull();
    expect(root.querySelector('.task-card .square-grid')).not.toBeNull();
    expect(root.querySelectorAll('.number-choice')).toHaveLength(3);
    const details = root.querySelector<HTMLDetailsElement>('.records-review')!;
    expect(details.open).toBe(false);
    expect(details.querySelectorAll('.data-point')).toHaveLength(6);
    details.open = true;
    fixture.detectChanges();
    expect(game.stage()).toBe('root');
    expect(game.helped()).toBe(false);
    expect(game.rootKnown()).toBe(false);
  });

  it('C7 keeps checked squares optional without losing records or adding hint usage', () => {
    const fixture = TestBed.createComponent(Lesson07Balls);
    fixture.detectChanges();
    const game = fixture.componentInstance;
    game.choosePrediction('b');
    game.answerVariance(3);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.workbench > .primary-evidence')).toBeNull();
    expect(root.querySelector('.task-card .calculation-card')?.textContent).toContain('18 ÷ 6 = 3');
    const details = root.querySelector<HTMLDetailsElement>('.records-review')!;
    expect(details.open).toBe(false);
    expect(details.querySelectorAll('.record-card')).toHaveLength(6);
    details.open = true;
    fixture.detectChanges();
    expect(game.helped()).toBe(false);
    expect(game.stage()).toBe('checked');
    expect(game.solved()).toEqual(['a']);
  });
});
