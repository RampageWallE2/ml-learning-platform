import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Dialogue } from '../../dialogue/dialogue';
import { InteractionPanel } from '../../interaction-panel/interaction-panel';
import { Lesson01Loading } from '../../../lessons/lesson-01-loading/lesson-01-loading';
import { LessonRunner } from './lesson-runner';

describe('LessonRunner — loading lesson', () => {
  it('plays the planned intro, activity and closing dialogue before completing lesson-01', () => {
    const fixture = TestBed.createComponent(LessonRunner);
    fixture.componentRef.setInput('lessonId', 'lesson-01');
    fixture.detectChanges();
    const done = vi.fn();
    fixture.componentInstance.completed.subscribe(done);

    const intro = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    expect(
      (fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()
    ).toBe('dialogue');
    expect(intro.currentMessage().text).toContain('Estamos terminando de cargar');
    expect(intro.dialogue().messages.map(message => message.text).join(' ')).not.toMatch(/dispersión|promedio|rango/i);
    for (let i = 0; i < 5; i++) intro.next();
    fixture.detectChanges();

    const game = fixture.debugElement.query(By.directive(Lesson01Loading)).componentInstance as Lesson01Loading;
    expect(
      (fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()
    ).toBe('activity');
    game.moveLoad(4, 1);
    game.moveLoad(2, 4);
    game.checkOrder();
    game.continueOrder();
    game.moveLoad(1, 4);
    game.moveLoad(3, 2);
    game.checkOrder();
    game.continueOrder();
    game.chooseGroup('B');
    game.finish();
    fixture.detectChanges();

    expect(done).not.toHaveBeenCalled();
    const end = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    expect(
      (fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()
    ).toBe('dialogue');
    expect(end.currentIndex()).toBe(0);
    expect(end.currentMessage().text).toContain('El Grupo B');
    expect(end.dialogue().messages.at(-1)?.text).toContain('encargado del control');
    for (let i = 0; i < 4; i++) end.next();
    expect(done).toHaveBeenCalledExactlyOnceWith('lesson-01');
  });
});
