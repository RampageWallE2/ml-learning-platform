import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AuthService } from '../../../../../core/auth/auth.service';
import { AuthenticatedUser } from '../../../../../core/auth/auth.types';
import { Dialogue } from '../../dialogue/dialogue';
import { Lesson08Flotation } from '../../../lessons/lesson-08-flotation/lesson-08-flotation';
import { C8State } from '../../../lessons/lesson-08-flotation/lesson-08-flotation.state';
import { loadC6Draft, loadLessonDraft, saveC6Draft, saveLessonDraft } from '../../../progress/lesson-draft.storage';
import { LessonRunner } from './lesson-runner';

const a: AuthenticatedUser = { id: 'c8-resume-a', displayName: 'A', email: 'a@example.test', avatarUrl: null };
const b: AuthenticatedUser = { ...a, id: 'c8-resume-b' };
const comparison: C8State = { stage: 'locate', round: 2, helped: true, selectedRecord: 5, comparing: true, choiceOffset: 2 };

@Component({ imports: [LessonRunner], template: `
  <app-lesson-runner lessonId="lesson-08" [statusTemplate]="notice" />
  <ng-template #notice><p>Pendiente de guardar</p><button type="button">Reintentar</button></ng-template>
` })
class C8NoticeHost {}

describe('LessonRunner — C8 recovery', () => {
  const user = signal<AuthenticatedUser | null>(null);
  let items: Map<string, string>;
  let write: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    items = new Map(); user.set(a);
    write = vi.fn((key: string, value: string) => { items.set(key, value); });
    vi.stubGlobal('localStorage', { getItem: (key: string) => items.get(key) ?? null,
      setItem: write, removeItem: (key: string) => { items.delete(key); } });
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: { user } }] });
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  function create(id = 'lesson-08') {
    const fixture = TestBed.createComponent(LessonRunner);
    fixture.componentRef.setInput('lessonId', id); fixture.detectChanges(); return fixture;
  }
  async function exercise(fixture: ReturnType<typeof create>) {
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.debugElement.query(By.directive(Lesson08Flotation)).componentInstance as Lesson08Flotation;
  }
  function click(fixture: ReturnType<typeof create>, label: string) {
    const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.trim() === label);
    expect(button, label).toBeDefined(); button!.click(); fixture.detectChanges();
  }
  function finishDialogue(dialogue: Dialogue) {
    for (let index = 0; index < dialogue.dialogue().messages.length; index++) {
      if (dialogue.isTyping()) dialogue.next(); dialogue.next();
    }
  }

  it('offers the existing C8 draft without overwriting it and resumes comparison without emitting completion', async () => {
    saveLessonDraft(a.id, 'lesson-08', { step: 1, exercise: comparison }); write.mockClear();
    const fixture = create(); const done = vi.fn(); fixture.componentInstance.completed.subscribe(done);
    expect(write).not.toHaveBeenCalled(); expect(fixture.nativeElement.textContent).toContain('C8 · Desviación estándar');
    expect(fixture.nativeElement.textContent).not.toContain('C6 · Varianza');
    fixture.componentInstance.nextStep(); expect(fixture.componentInstance.currentStepIndex()).toBe(0);
    click(fixture, 'Continuar'); await fixture.whenStable();
    const game = await exercise(fixture);
    expect(game.stage()).toBe('locate'); expect(game.round()).toBe(2); expect(game.helped()).toBe(true);
    expect(game.comparing()).toBe(true); expect(game.selectedRecord()).toBe(5);
    expect(game.records()).toEqual([102, 102, 102, 110, 110, 110]);
    expect(loadLessonDraft(a.id, 'lesson-08').draft?.exercise).toEqual(comparison);
    expect(done).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="dialog"]').contains(document.activeElement)).toBe(true);
  });

  it('saves C8 actions and restores them after closing without feeding emitted state back into the seed', async () => {
    const fixture = create(); fixture.componentInstance.nextStep(); fixture.detectChanges();
    const game = await exercise(fixture); game.startRoot(); game.answerRoot(2); game.continueToBand();
    game.selectRecord(0); game.continueToReport(); game.answerComparison('outside'); fixture.detectChanges();
    expect(game.stage()).toBe('locate'); expect(game.comparing()).toBe(true);
    expect(loadLessonDraft(a.id, 'lesson-08').draft?.exercise?.helped).toBe(true);
    const order = game.options(); fixture.destroy();
    const reopened = create(); click(reopened, 'Continuar'); const copy = await exercise(reopened);
    expect(copy.comparing()).toBe(true); expect(copy.options()).toEqual(order);
    copy.answerComparison('inside'); copy.continueToReport(); reopened.detectChanges();
    expect(copy.stage()).toBe('report'); expect(copy.comparing()).toBe(false);
    expect(loadLessonDraft(a.id, 'lesson-08').draft?.exercise?.stage).toBe('report');
    copy.chooseReport('observed'); expect(copy.stage()).toBe('review');
  });

  it('preserves the introduction and restarts only C8 without touching C6 or I01', () => {
    saveLessonDraft(a.id, 'lesson-08', { step: 1, exercise: comparison });
    saveC6Draft(a.id, { step: 1, exercise: null });
    const pendingKey = 'exploralab.pending-progress.v1.' + a.id; items.set(pendingKey, '["lesson-08"]');
    const fixture = create(); click(fixture, 'Volver a empezar');
    expect(fixture.componentInstance.currentStepIndex()).toBe(0);
    expect(loadLessonDraft(a.id, 'lesson-08').draft?.exercise).toBeNull();
    expect(loadC6Draft(a.id).draft?.step).toBe(1); expect(items.get(pendingKey)).toBe('["lesson-08"]');
    fixture.destroy(); const reopened = create(); click(reopened, 'Continuar');
    const intro = reopened.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    expect(intro.currentIndex()).toBe(0); expect(reopened.componentInstance.currentStepIndex()).toBe(0);
  });

  it('resumes the closing dialogue from its start and keeps the draft until external confirmation', () => {
    const success: C8State = { ...comparison, stage: 'success', comparing: false, helped: false };
    saveLessonDraft(a.id, 'lesson-08', { step: 2, exercise: success });
    const fixture = create(); const done = vi.fn(); fixture.componentInstance.completed.subscribe(done);
    click(fixture, 'Continuar');
    expect(fixture.debugElement.query(By.directive(Lesson08Flotation))).toBeNull();
    const dialogue = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    expect(dialogue.currentIndex()).toBe(0); expect(done).not.toHaveBeenCalled();
    finishDialogue(dialogue); expect(done).toHaveBeenCalledExactlyOnceWith('lesson-08');
    expect(loadLessonDraft(a.id, 'lesson-08').draft?.step).toBe(2);
  });

  it('writes the C8 closing draft only after successful exercise completion', async () => {
    const fixture = create(); fixture.componentInstance.nextStep(); fixture.detectChanges();
    fixture.componentInstance.nextStep(); expect(fixture.componentInstance.currentStepIndex()).toBe(1);
    const game = await exercise(fixture);
    game.startRoot(); game.answerRoot(2); game.continueToBand(); game.selectRecord(0);
    game.continueToReport(); game.answerComparison('inside'); game.continueToReport(); game.chooseReport('observed');
    game.finish(); fixture.detectChanges();
    expect(fixture.componentInstance.currentStepIndex()).toBe(2);
    expect(loadLessonDraft(a.id, 'lesson-08').draft?.exercise?.stage).toBe('success');
    expect(loadLessonDraft(a.id, 'lesson-08').draft?.step).toBe(2);
  });

  it('preserves a guided C8 finish through reopening and still requires the closing dialogue', async () => {
    const practice: C8State = { stage: 'root', round: 1, helped: false, selectedRecord: null, comparing: false, choiceOffset: 1 };
    saveLessonDraft(a.id, 'lesson-08', { step: 1, exercise: practice });
    const fixture = create(); const done = vi.fn(); fixture.componentInstance.completed.subscribe(done);
    click(fixture, 'Continuar'); const game = await exercise(fixture);
    game.requestHint(); game.answerRoot(3); game.continueToBand(); game.selectRecord(5);
    game.continueToReport(); game.answerComparison('inside'); game.continueToReport();
    game.finish(); expect(done).not.toHaveBeenCalled();
    expect(loadLessonDraft(a.id, 'lesson-08').draft?.exercise?.stage).toBe('report');
    game.chooseReport('observed'); fixture.detectChanges();
    expect(game.guidedCompletion()).toBe(true); expect(game.round()).toBe(1);
    expect(game.stats().standardDeviation).toBe(2);
    expect(loadLessonDraft(a.id, 'lesson-08').draft?.step).toBe(1);
    expect(loadLessonDraft(a.id, 'lesson-08').draft?.exercise?.helped).toBe(true);
    expect(done).not.toHaveBeenCalled(); fixture.destroy();

    const reopened = create(); reopened.componentInstance.completed.subscribe(done);
    click(reopened, 'Continuar'); const copy = await exercise(reopened);
    expect(copy.guidedCompletion()).toBe(true); expect(copy.helped()).toBe(true);
    expect(reopened.nativeElement.textContent).toContain('Completaste con ayuda');
    expect(done).not.toHaveBeenCalled(); copy.finish(); reopened.detectChanges();
    expect(loadLessonDraft(a.id, 'lesson-08').draft?.step).toBe(2);
    expect(loadLessonDraft(a.id, 'lesson-08').draft?.exercise?.helped).toBe(true);
    expect(done).not.toHaveBeenCalled(); reopened.destroy();

    const closing = create(); closing.componentInstance.completed.subscribe(done); click(closing, 'Continuar');
    expect(closing.debugElement.query(By.directive(Lesson08Flotation))).toBeNull();
    expect(done).not.toHaveBeenCalled();
    finishDialogue(closing.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue);
    expect(done).toHaveBeenCalledExactlyOnceWith('lesson-08');
    expect(loadLessonDraft(a.id, 'lesson-08').draft?.exercise?.helped).toBe(true);
  });

  it('rejects stale callbacks after account changes and keeps focus in the session notice', async () => {
    saveLessonDraft(a.id, 'lesson-08', { step: 1, exercise: comparison });
    const fixture = create(); click(fixture, 'Continuar'); const game = await exercise(fixture);
    user.set(b); write.mockClear(); game.answerComparison('inside'); fixture.detectChanges(); await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('La sesión cambió');
    expect(fixture.debugElement.query(By.directive(Lesson08Flotation))).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="dialog"]').contains(document.activeElement)).toBe(true);
    fixture.componentInstance.saveExerciseState('lesson-08', comparison); fixture.componentInstance.nextStep(); fixture.componentInstance.restartDraft();
    expect(write).not.toHaveBeenCalled(); expect(loadLessonDraft(b.id, 'lesson-08').draft).toBeNull();
    fixture.destroy(); const other = create(); expect(other.componentInstance.resumeOffer()).toBeNull();
    expect(loadLessonDraft(a.id, 'lesson-08').draft?.exercise).toEqual(comparison);
  });

  it('rejects writes from a replaced same-account session and does not interpret C6 emissions as C8', () => {
    const fixture = create(); fixture.componentInstance.nextStep(); fixture.detectChanges(); write.mockClear();
    fixture.componentInstance.saveExerciseState('lesson-06', { stage: 'observe', round: 0, squaresFormed: false, practiceHelped: false, practiceVarianceAnswered: false, choiceOffset: 0 });
    expect(write).not.toHaveBeenCalled(); user.set({ ...a });
    fixture.componentInstance.saveExerciseState('lesson-08', comparison); expect(write).not.toHaveBeenCalled();
  });

  it('warns about storage failure without breaking the exercise or creating another overlay', async () => {
    write.mockImplementation(() => { throw new Error('Quota'); });
    const fixture = create(); expect(fixture.nativeElement.textContent).toContain('no pudo guardar dónde vas');
    fixture.componentInstance.nextStep(); fixture.detectChanges(); (await exercise(fixture)).startRoot(); fixture.detectChanges();
    expect((await exercise(fixture)).stage()).toBe('root');
    expect(fixture.nativeElement.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(fixture.nativeElement.querySelectorAll('.interaction-status')).toHaveLength(1);
  });

  it('discards an incompatible C8 version without losing C6', () => {
    saveC6Draft(a.id, { step: 1, exercise: null });
    items.set('exploralab.lesson-draft.v1.' + a.id + '.lesson-08', '{"version":8}');
    const fixture = create(); expect(fixture.componentInstance.resumeOffer()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('no es compatible');
    expect(loadC6Draft(a.id).draft?.step).toBe(1);
  });

  it('resets seeds correctly when the runner changes between C6 and C8', async () => {
    saveC6Draft(a.id, { step: 0, exercise: null }); saveLessonDraft(a.id, 'lesson-08', { step: 1, exercise: comparison });
    const fixture = create('lesson-06'); expect(fixture.componentInstance.resumeOffer()?.lessonId).toBe('lesson-06');
    fixture.componentRef.setInput('lessonId', 'lesson-08'); fixture.detectChanges(); click(fixture, 'Continuar');
    expect((await exercise(fixture)).comparing()).toBe(true);
    fixture.componentRef.setInput('lessonId', 'lesson-06'); fixture.detectChanges();
    expect(fixture.componentInstance.initialC8State()).toBeNull();
    expect(fixture.componentInstance.resumeOffer()?.lessonId).toBe('lesson-06');
    expect(loadLessonDraft(a.id, 'lesson-08').draft?.exercise).toEqual(comparison);
  });

  it('keeps C8 resume controls and the supplied save notice in one keyboard trap', () => {
    saveLessonDraft(a.id, 'lesson-08', { step: 1, exercise: comparison });
    const fixture = TestBed.createComponent(C8NoticeHost); fixture.detectChanges(); const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.interaction-status')).toHaveLength(1);
    const retry = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent === 'Reintentar')!;
    expect(root.querySelector('[role="dialog"]')!.contains(retry)).toBe(true);
    const close = root.querySelector<HTMLButtonElement>('.close-button')!;
    close.focus(); close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(retry);
    retry.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(close);
  });
});
