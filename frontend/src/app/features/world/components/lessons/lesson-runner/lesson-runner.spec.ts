import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Dialogue } from '../../dialogue/dialogue';
import { InteractionPanel } from '../../interaction-panel/interaction-panel';
import { Lesson01Loading } from '../../../lessons/lesson-01-loading/lesson-01-loading';
import { Lesson02Ramp } from '../../../lessons/lesson-02-ramp/lesson-02-ramp';
import { Lesson03Haulage } from '../../../lessons/lesson-03-haulage/lesson-03-haulage';
import { LessonRunner } from './lesson-runner';

function completeDialogue(dialogue: Dialogue): void {
  const messageCount = dialogue.dialogue().messages.length;

  for (let index = 0; index < messageCount; index += 1) {
    if (dialogue.isTyping()) {
      dialogue.next();
    }

    dialogue.next();
  }
}

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
    expect(intro.currentMessage()!.text).toContain('Estamos terminando de cargar');
    expect(intro.dialogue().messages.map(message => message.text).join(' ')).not.toMatch(/dispersión|promedio|rango/i);
    completeDialogue(intro);
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
    expect(end.currentMessage()!.text).toContain('El Grupo B');
    expect(end.dialogue().messages.at(-1)?.text).toContain('encargado del control');
    completeDialogue(end);
    expect(done).toHaveBeenCalledExactlyOnceWith('lesson-01');
  });
});

describe('LessonRunner — ramp lesson', () => {
  it('plays the planned Class 2 flow before completing lesson-02', () => {
    const fixture = TestBed.createComponent(LessonRunner);
    fixture.componentRef.setInput('lessonId', 'lesson-02');
    fixture.detectChanges();
    const done = vi.fn();
    fixture.componentInstance.completed.subscribe(done);

    const intro = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    expect(
      (fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()
    ).toBe('dialogue');
    expect(intro.currentMessage()!.text).toContain('camiones que viste abajo');
    expect(intro.dialogue().messages.map(message => message.text).join(' ')).not.toMatch(/rango|mínimo|máximo/i);
    completeDialogue(intro);
    fixture.detectChanges();

    const game = fixture.debugElement.query(By.directive(Lesson02Ramp)).componentInstance as Lesson02Ramp;
    expect(
      (fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()
    ).toBe('activity');
    game.chooseTurn('A');
    game.revealAverages();
    game.answerBehavior('no');
    game.finish();
    fixture.detectChanges();

    expect(done).not.toHaveBeenCalled();
    const end = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    expect(
      (fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()
    ).toBe('dialogue');
    expect(end.currentIndex()).toBe(0);
    expect(end.currentMessage()!.text).toContain('Turno A');
    expect(end.dialogue().messages.at(-1)?.text).toContain('encargado del acarreo');
    completeDialogue(end);
    expect(done).toHaveBeenCalledExactlyOnceWith('lesson-02');
  });
});

describe('LessonRunner — haulage lesson', () => {
  it('plays the planned Class 3 flow before completing lesson-03', () => {
    const fixture = TestBed.createComponent(LessonRunner);
    fixture.componentRef.setInput('lessonId', 'lesson-03');
    fixture.detectChanges();
    const done = vi.fn();
    fixture.componentInstance.completed.subscribe(done);

    const intro = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    expect(
      (fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()
    ).toBe('dialogue');
    expect(intro.currentMessage()!.text).toContain('puesto de control');
    expect(intro.dialogue().messages.at(-1)?.text).toContain('más rápido y el más lento');
    completeDialogue(intro);
    fixture.detectChanges();

    const game = fixture.debugElement.query(By.directive(Lesson03Haulage)).componentInstance as Lesson03Haulage;
    expect(
      (fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()
    ).toBe('activity');
    game.selectFastest('trip-1');
    game.continueToMaximum();
    game.selectSlowest('trip-4');
    game.continueToRange();
    game.answerRange(7);
    game.continueToPractice();
    game.selectPracticeExtreme('practice-2');
    game.selectPracticeExtreme('practice-4');
    game.answerPracticeRange(5);
    game.finish();
    fixture.detectChanges();

    expect(done).not.toHaveBeenCalled();
    const end = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    expect(
      (fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()
    ).toBe('dialogue');
    expect(end.currentMessage()!.text).toContain('diferencia de 7 minutos');
    expect(end.dialogue().messages.at(-1)?.text).toContain('ROM y chancado');
    completeDialogue(end);
    expect(done).toHaveBeenCalledExactlyOnceWith('lesson-03');
  });
});
