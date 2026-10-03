import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Dialogue } from '../../dialogue/dialogue';
import { InteractionPanel } from '../../interaction-panel/interaction-panel';
import { Lesson01Loading } from '../../../lessons/lesson-01-loading/lesson-01-loading';
import { Lesson02Ramp } from '../../../lessons/lesson-02-ramp/lesson-02-ramp';
import { Lesson03Haulage } from '../../../lessons/lesson-03-haulage/lesson-03-haulage';
import { LessonRunner } from './lesson-runner';
import { Lesson04Workshop } from '../../../lessons/lesson-04-workshop/lesson-04-workshop';

function completeDialogue(dialogue: Dialogue): void {
  const messageCount = dialogue.dialogue().messages.length;

  for (let index = 0; index < messageCount; index += 1) {
    if (dialogue.isTyping()) {
      dialogue.next();
    }

    dialogue.next();
  }
}

describe('LessonRunner — workshop lesson', () => {
  it('runs C4 activity and closing dialogue before completing the lesson', () => {
    const fixture = TestBed.createComponent(LessonRunner);
    fixture.componentRef.setInput('lessonId', 'lesson-04'); fixture.detectChanges();
    const done = vi.fn(); fixture.componentInstance.completed.subscribe(done);
    const intro = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    expect(intro.currentMessage()!.text).toContain('botadero');
    completeDialogue(intro); fixture.detectChanges();
    const game = fixture.debugElement.query(By.directive(Lesson04Workshop)).componentInstance as Lesson04Workshop;
    game.rangeA.set('4'); game.rangeB.set('4'); game.checkRanges(); game.compare('concentrated');
    game.moveInterior('1'); game.confirmSimulation(); game.explain('extremes');
    game.practiceC.set('4'); game.practiceD.set('4'); game.practiceClaim.set('different'); game.checkPractice();
    game.finish(); fixture.detectChanges(); expect(done).not.toHaveBeenCalled();
    const end = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    expect(end.currentMessage()!.text).toContain('Corregiré el informe');
    completeDialogue(end); expect(done).toHaveBeenCalledExactlyOnceWith('lesson-04');
  });
});

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
    expect(intro.currentMessage()!.text).toContain('registros para el relevo');
    expect(intro.dialogue().messages.map(message => message.text).join(' ')).not.toMatch(/dispersión|promedio|rango/i);
    completeDialogue(intro);
    fixture.detectChanges();

    const game = fixture.debugElement.query(By.directive(Lesson01Loading)).componentInstance as Lesson01Loading;
    expect(
      (fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()
    ).toBe('activity');
    game.chooseGroup('B');
    game.chooseReason('spread');
    game.startPractice();
    game.chooseGroup('D');
    game.chooseReason('spread');
    game.finish();
    fixture.detectChanges();

    expect(done).not.toHaveBeenCalled();
    const end = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    expect(
      (fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()
    ).toBe('dialogue');
    expect(end.currentIndex()).toBe(0);
    expect(end.currentMessage()!.text).toContain('El grupo B');
    expect(end.dialogue().messages.at(-1)?.text).toContain('control de acarreo');
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
    expect(intro.currentMessage()!.text).toContain('observación sobre las cargas del tajo');
    expect(intro.dialogue().messages.map(message => message.text).join(' ')).not.toMatch(/rango|mínimo|máximo/i);
    completeDialogue(intro);
    fixture.detectChanges();

    const game = fixture.debugElement.query(By.directive(Lesson02Ramp)).componentInstance as Lesson02Ramp;
    expect(
      (fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()
    ).toBe('activity');
    game.assess('unknown');
    game.request('records');
    game.compare('spread');
    game.startPractice();
    game.answerPractice('unknown');
    game.explain('center');
    game.finish();
    fixture.detectChanges();

    expect(done).not.toHaveBeenCalled();
    const end = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    expect(
      (fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()
    ).toBe('dialogue');
    expect(end.currentIndex()).toBe(0);
    expect(end.currentMessage()!.text).toContain('Completaré el informe');
    expect(end.dialogue().messages.at(-1)?.text).toContain('encargado del botadero');
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
    expect(intro.currentMessage()!.text).toContain('botadero');
    expect(intro.dialogue().messages.at(-1)?.text).toContain('más corta y la más larga');
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
    game.moveRuler('18');
    game.answerRange(7);
    game.continueToPractice();
    game.practiceAnswer.set('5');
    game.answerPracticeRange();
    game.explainRange('separation');
    game.finish();
    fixture.detectChanges();

    expect(done).not.toHaveBeenCalled();
    const end = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    expect(
      (fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()
    ).toBe('dialogue');
    expect(end.currentMessage()!.text).toContain('diferencia de 7 minutos');
    expect(end.dialogue().messages.at(-1)?.text).toContain('registros del taller');
    completeDialogue(end);
    expect(done).toHaveBeenCalledExactlyOnceWith('lesson-03');
  });
});
