import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AuthService } from '../../../../../core/auth/auth.service';
import { AuthenticatedUser } from '../../../../../core/auth/auth.types';
import { Dialogue } from '../../dialogue/dialogue';
import { Lesson07Balls } from '../../../lessons/lesson-07-balls/lesson-07-balls';
import { C7State } from '../../../lessons/lesson-07-balls/lesson-07-balls.state';
import { loadC6Draft, loadLessonDraft, saveC6Draft, saveLessonDraft } from '../../../progress/lesson-draft.storage';
import { LessonRunner } from './lesson-runner';

const a: AuthenticatedUser = { id: 'c7-resume-a', displayName: 'A', email: 'a@example.test', avatarUrl: null };
const b: AuthenticatedUser = { ...a, id: 'c7-resume-b' };
const second: C7State = { stage: 'calculate', round: 2, prediction: 'equal', activeIndex: 1,
  solved: ['a'], helped: true, hintLevel: 2, hintFocus: 'count', choiceOffset: 2 };
const success: C7State = { ...second, stage: 'success', solved: ['a', 'b'], helped: false, hintLevel: 0, hintFocus: null };

@Component({ imports: [LessonRunner], template: `
  <app-lesson-runner lessonId="lesson-07" [statusTemplate]="notice" />
  <ng-template #notice><p>Pendiente de guardar</p><button type="button">Reintentar</button></ng-template>
` })
class C7NoticeHost {}

describe('LessonRunner — C7 recovery', () => {
  const user = signal<AuthenticatedUser | null>(null);
  let items: Map<string, string>; let write: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    items = new Map(); user.set(a); write = vi.fn((key: string, value: string) => { items.set(key, value); });
    vi.stubGlobal('localStorage', { getItem: (key: string) => items.get(key) ?? null,
      setItem: write, removeItem: (key: string) => { items.delete(key); } });
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: { user } }] });
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  function create(id = 'lesson-07') {
    const fixture = TestBed.createComponent(LessonRunner);
    fixture.componentRef.setInput('lessonId', id); fixture.detectChanges(); return fixture;
  }
  async function exercise(fixture: ReturnType<typeof create>) {
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.debugElement.query(By.directive(Lesson07Balls)).componentInstance as Lesson07Balls;
  }
  function click(fixture: ReturnType<typeof create>, label: string) {
    const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.trim() === label);
    expect(button, label).toBeDefined(); button!.click(); fixture.detectChanges();
  }

  it('offers the C7 draft without overwriting it and restores the second calculation, hint and prediction', async () => {
    saveLessonDraft(a.id, 'lesson-07', { step: 1, exercise: second }); write.mockClear();
    const fixture = create(); const done = vi.fn(); fixture.componentInstance.completed.subscribe(done);
    expect(write).not.toHaveBeenCalled(); expect(fixture.nativeElement.textContent).toContain('C7 · Comparación de varianzas');
    fixture.componentInstance.nextStep(); expect(fixture.componentInstance.currentStepIndex()).toBe(0);
    click(fixture, 'Continuar'); await fixture.whenStable(); const game = await exercise(fixture);
    expect(game.stage()).toBe('calculate'); expect(game.activeIndex()).toBe(1); expect(game.solved()).toEqual(['a']);
    expect(game.prediction()).toBe('equal'); expect(game.round()).toBe(2); expect(game.hintLevel()).toBe(2);
    expect(game.feedback()).toContain('36 ÷ 6 = 6'); expect(game.helped()).toBe(true);
    expect(loadLessonDraft(a.id, 'lesson-07').draft?.exercise).toEqual(second); expect(done).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="dialog"]').contains(document.activeElement)).toBe(true);
  });

  it('saves actions without feeding the snapshot back into the seed and recovers them after closing', async () => {
    const fixture = create(); fixture.componentInstance.nextStep(); fixture.detectChanges(); const game = await exercise(fixture);
    game.choosePrediction('b'); game.answerVariance(3); game.continueCalculation(); game.requestHint(); fixture.detectChanges();
    expect(game.hintLevel()).toBe(1); expect(fixture.componentInstance.initialC7State()).toBeNull();
    game.requestHint(); fixture.detectChanges(); expect(game.hintLevel()).toBe(2); const order = game.options(); fixture.destroy();
    const reopened = create(); click(reopened, 'Continuar'); const copy = await exercise(reopened);
    expect(copy.solved()).toEqual(['a']); expect(copy.activeIndex()).toBe(1); expect(copy.options()).toEqual(order);
    expect(copy.feedback()).toContain('36 ÷ 6 = 6'); copy.answerVariance(6); copy.continueCalculation(); reopened.detectChanges();
    expect(copy.stage()).toBe('report'); expect(loadLessonDraft(a.id, 'lesson-07').draft?.exercise?.solved).toEqual(['a', 'b']);
    copy.chooseReport('spread'); expect(copy.stage()).toBe('review');
  });

  it('restarts only C7 and retains I01 and both other lesson drafts', () => {
    saveLessonDraft(a.id, 'lesson-07', { step: 1, exercise: second }); saveC6Draft(a.id, { step: 1, exercise: null });
    saveLessonDraft(a.id, 'lesson-08', { step: 1, exercise: null });
    const pendingKey = 'exploralab.pending-progress.v1.' + a.id; items.set(pendingKey, '["lesson-07"]');
    const fixture = create(); click(fixture, 'Volver a empezar');
    expect(fixture.componentInstance.currentStepIndex()).toBe(0); expect(fixture.componentInstance.initialC7State()).toBeNull();
    expect(loadLessonDraft(a.id, 'lesson-07').draft?.exercise).toBeNull(); expect(loadC6Draft(a.id).draft?.step).toBe(1);
    expect(loadLessonDraft(a.id, 'lesson-08').draft?.step).toBe(1); expect(items.get(pendingKey)).toBe('["lesson-07"]');
    fixture.destroy(); const reopened = create(); click(reopened, 'Continuar');
    expect(reopened.debugElement.query(By.directive(Dialogue)).componentInstance.currentIndex()).toBe(0);
  });

  it('recovers the closing dialogue from its start without replaying the exercise or completing on resume', () => {
    saveLessonDraft(a.id, 'lesson-07', { step: 2, exercise: success }); const fixture = create(); const done = vi.fn();
    fixture.componentInstance.completed.subscribe(done); click(fixture, 'Continuar');
    expect(fixture.debugElement.query(By.directive(Lesson07Balls))).toBeNull();
    const dialogue = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    expect(dialogue.currentIndex()).toBe(0); expect(done).not.toHaveBeenCalled();
    for (let index = 0; index < dialogue.dialogue().messages.length; index++) {
      if (dialogue.isTyping()) dialogue.next(); dialogue.next();
    }
    expect(done).toHaveBeenCalledExactlyOnceWith('lesson-07'); expect(loadLessonDraft(a.id, 'lesson-07').draft?.step).toBe(2);
  });

  it('writes the closing draft only after exercise success has been emitted', async () => {
    const fixture = create(); fixture.componentInstance.nextStep(); fixture.detectChanges(); fixture.componentInstance.nextStep();
    expect(fixture.componentInstance.currentStepIndex()).toBe(1); const game = await exercise(fixture);
    game.choosePrediction('b'); game.answerVariance(3); game.continueCalculation(); game.answerVariance(6);
    game.continueCalculation(); game.chooseReport('spread'); game.finish(); fixture.detectChanges();
    expect(fixture.componentInstance.currentStepIndex()).toBe(2);
    expect(loadLessonDraft(a.id, 'lesson-07').draft?.exercise?.stage).toBe('success');
    expect(loadLessonDraft(a.id, 'lesson-07').draft?.step).toBe(2);
  });

  it('recovers a guided finish honestly and still requires the closing dialogue before completion', async () => {
    const fixture = create(); fixture.componentInstance.nextStep(); fixture.detectChanges();
    const game = await exercise(fixture);
    const solve = () => {
      for (let index = 0; index < 2; index++) {
        game.answerVariance(game.activePeriod().variance); game.continueCalculation();
      }
    };
    game.choosePrediction('b'); game.requestHint(); solve(); game.chooseReport('spread');
    game.continueAfterHelp(); game.choosePrediction('a'); game.requestHint(); solve(); game.chooseReport('spread');
    fixture.detectChanges();
    expect(game.stage()).toBe('success'); expect(game.guidedCompletion()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Completaste con ayuda');
    const guided = loadLessonDraft(a.id, 'lesson-07').draft?.exercise;
    expect(guided?.helped).toBe(true); expect(guided?.round).toBe(1);
    fixture.destroy();

    const reopened = create(); const done = vi.fn(); reopened.componentInstance.completed.subscribe(done);
    click(reopened, 'Continuar'); const resumed = await exercise(reopened);
    expect(resumed.guidedCompletion()).toBe(true);
    expect(reopened.nativeElement.textContent).toContain('Completaste con ayuda');
    expect(done).not.toHaveBeenCalled(); resumed.finish(); reopened.detectChanges();
    expect(reopened.componentInstance.currentStepIndex()).toBe(2);
    expect(loadLessonDraft(a.id, 'lesson-07').draft?.exercise?.helped).toBe(true);
    expect(loadLessonDraft(a.id, 'lesson-07').draft?.step).toBe(2);
    reopened.destroy();

    const closing = create(); const closed = vi.fn(); closing.componentInstance.completed.subscribe(closed);
    click(closing, 'Continuar');
    expect(closing.debugElement.query(By.directive(Lesson07Balls))).toBeNull();
    const dialogue = closing.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    expect(closed).not.toHaveBeenCalled();
    for (let index = 0; index < dialogue.dialogue().messages.length; index++) {
      if (dialogue.isTyping()) dialogue.next(); dialogue.next();
    }
    expect(closed).toHaveBeenCalledExactlyOnceWith('lesson-07');
  });

  it('rejects stale actions after account switching and moves focus into the session notice', async () => {
    saveLessonDraft(a.id, 'lesson-07', { step: 1, exercise: second }); const fixture = create(); click(fixture, 'Continuar');
    const game = await exercise(fixture); user.set(b); write.mockClear(); game.answerVariance(6); fixture.detectChanges(); await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('La sesión cambió');
    expect(fixture.debugElement.query(By.directive(Lesson07Balls))).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="dialog"]').contains(document.activeElement)).toBe(true);
    fixture.componentInstance.saveExerciseState('lesson-07', second); fixture.componentInstance.nextStep(); fixture.componentInstance.restartDraft();
    expect(write).not.toHaveBeenCalled(); expect(loadLessonDraft(b.id, 'lesson-07').draft).toBeNull();
    fixture.destroy(); const other = create(); expect(other.componentInstance.resumeOffer()).toBeNull();
    expect(loadLessonDraft(a.id, 'lesson-07').draft?.exercise).toEqual(second);
  });

  it('rejects old same-account sessions and emissions for the wrong lesson or stage', () => {
    const fixture = create(); write.mockClear(); fixture.componentInstance.saveExerciseState('lesson-07', second); expect(write).not.toHaveBeenCalled();
    fixture.componentInstance.nextStep(); fixture.detectChanges(); write.mockClear();
    fixture.componentInstance.saveExerciseState('lesson-08', { stage: 'observe', round: 0, helped: false, selectedRecord: null, comparing: false, choiceOffset: 0 });
    fixture.componentInstance.saveExerciseState('lesson-07', { ...second, solved: [] }); expect(write).not.toHaveBeenCalled();
    user.set({ ...a }); fixture.componentInstance.saveExerciseState('lesson-07', second); expect(write).not.toHaveBeenCalled();
  });

  it('keeps the exercise usable and warns honestly when storage fails', async () => {
    write.mockImplementation(() => { throw new Error('Quota'); }); const fixture = create();
    expect(fixture.nativeElement.textContent).toContain('no pudo guardar dónde vas');
    fixture.componentInstance.nextStep(); fixture.detectChanges(); (await exercise(fixture)).choosePrediction('b'); fixture.detectChanges();
    expect((await exercise(fixture)).stage()).toBe('calculate'); expect(fixture.nativeElement.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(fixture.nativeElement.querySelectorAll('.interaction-status')).toHaveLength(1);
  });

  it('discards an incompatible C7 draft without affecting C6 and C8', () => {
    saveC6Draft(a.id, { step: 1, exercise: null }); saveLessonDraft(a.id, 'lesson-08', { step: 0, exercise: null });
    items.set('exploralab.lesson-draft.v1.' + a.id + '.lesson-07', '{"version":8}'); const fixture = create();
    expect(fixture.componentInstance.resumeOffer()).toBeNull(); expect(fixture.nativeElement.textContent).toContain('no es compatible');
    expect(loadC6Draft(a.id).draft?.step).toBe(1); expect(loadLessonDraft(a.id, 'lesson-08').draft?.step).toBe(0);
  });

  it('resets all seeds when changing lessons without overwriting another draft', () => {
    saveLessonDraft(a.id, 'lesson-07', { step: 1, exercise: second }); saveLessonDraft(a.id, 'lesson-08', { step: 0, exercise: null });
    const fixture = create(); click(fixture, 'Continuar'); expect(fixture.componentInstance.initialC7State()).toEqual(second);
    fixture.componentRef.setInput('lessonId', 'lesson-08'); fixture.detectChanges();
    expect(fixture.componentInstance.initialC7State()).toBeNull(); expect(fixture.componentInstance.resumeOffer()?.lessonId).toBe('lesson-08');
    expect(loadLessonDraft(a.id, 'lesson-07').draft?.exercise).toEqual(second);
    fixture.componentRef.setInput('lessonId', 'lesson-06'); fixture.detectChanges();
    expect(fixture.componentInstance.initialC7State()).toBeNull(); expect(fixture.componentInstance.initialC8State()).toBeNull();
  });

  it('keeps recovery controls and I02 retry in a single keyboard trap', () => {
    saveLessonDraft(a.id, 'lesson-07', { step: 1, exercise: second }); const fixture = TestBed.createComponent(C7NoticeHost);
    fixture.detectChanges(); const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.interaction-status')).toHaveLength(1);
    const retry = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent === 'Reintentar')!;
    expect(root.querySelector('[role="dialog"]')!.contains(retry)).toBe(true); const close = root.querySelector<HTMLButtonElement>('.close-button')!;
    close.focus(); close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(retry); retry.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(close);
  });
});
