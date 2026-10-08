import { OutputEmitterRef, signal, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AuthService } from '../../../../../core/auth/auth.service';
import { AuthenticatedUser } from '../../../../../core/auth/auth.types';
import { Dialogue } from '../../dialogue/dialogue';
import { Lesson01Loading } from '../../../lessons/lesson-01-loading/lesson-01-loading';
import { C1State } from '../../../lessons/lesson-01-loading/lesson-01-loading.state';
import { Lesson02Ramp } from '../../../lessons/lesson-02-ramp/lesson-02-ramp';
import { Lesson03Haulage } from '../../../lessons/lesson-03-haulage/lesson-03-haulage';
import { Lesson04Workshop } from '../../../lessons/lesson-04-workshop/lesson-04-workshop';
import { Lesson05Crushing } from '../../../lessons/lesson-05-crushing/lesson-05-crushing';
import { Lesson09Thickeners } from '../../../lessons/lesson-09-thickeners/lesson-09-thickeners';
import { LESSON_NAMES } from '../../../lessons/lesson-catalog';
import { DraftLessonId, LessonExerciseState, isDraftLessonId, isLessonExerciseState,
  loadLessonDraft, saveLessonDraft } from '../../../progress/lesson-draft.storage';
import { LessonDraftService } from '../../../progress/lesson-draft.service';
import { LessonRunner } from './lesson-runner';

const account: AuthenticatedUser = { id: 'remaining-a', displayName: 'QA', email: 'qa@example.test', avatarUrl: null };
interface Recoverable {
  stateChanged: OutputEmitterRef<LessonExerciseState>;
  completed: OutputEmitterRef<void>;
  stage: () => string;
  guidedCompletion: () => boolean;
  continueAfterHelp(): void;
  finish(): void;
}
const cases: readonly { id: DraftLessonId; type: Type<Recoverable>; state: LessonExerciseState; success: LessonExerciseState }[] = [
  { id: 'lesson-01', type: Lesson01Loading,
    state: { stage: 'practice-reason', selectedLoad: 'D1', selectedGroup: 'D', practiceRound: 0, practiceHelped: true },
    success: { stage: 'success', selectedLoad: null, selectedGroup: 'D', practiceRound: 0, practiceHelped: false } },
  { id: 'lesson-02', type: Lesson02Ramp,
    state: { stage: 'practice', redistributed: true, round: 1, practiceCase: 1, practiceHelped: true, selectedLoad: 'E1' },
    success: { stage: 'success', redistributed: true, round: 1, practiceCase: 1, practiceHelped: true, selectedLoad: 'E1' } },
  { id: 'lesson-03', type: Lesson03Haulage,
    state: { stage: 'practice-extremes', selectedMinId: 'practice-1-2', selectedMaxId: null, round: 1, practiceHelped: true },
    success: { stage: 'success', selectedMinId: 'practice-1-2', selectedMaxId: 'practice-1-3', round: 1, practiceHelped: true } },
  { id: 'lesson-04', type: Lesson04Workshop,
    state: { stage: 'experiment', experimentMode: 'together', rangePrediction: 'increase', separatedViewed: true, round: 0, practiceHelped: false },
    success: { stage: 'success', experimentMode: 'apart', rangePrediction: 'increase', separatedViewed: true, round: 1, practiceHelped: true } },
  { id: 'lesson-05', type: Lesson05Crushing,
    state: { stage: 'practice', selected: 2, round: 2, solvedCount: 2, practiceHelped: true },
    success: { stage: 'success', selected: 2, round: 2, solvedCount: 3, practiceHelped: true } },
  { id: 'lesson-09', type: Lesson09Thickeners,
    state: { stage: 'recommend', round: 1, helped: true, answered: true, feedbackKind: 'answer' },
    success: { stage: 'success', round: 1, helped: true, answered: false, feedbackKind: 'none' } },
];

describe('Remaining Open Pit draft recovery', () => {
  const user = signal<AuthenticatedUser | null>(account);
  let items: Map<string, string>;
  let write: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    user.set(account); items = new Map();
    write = vi.fn((key: string, value: string) => { items.set(key, value); });
    vi.stubGlobal('localStorage', { getItem: (key: string) => items.get(key) ?? null,
      setItem: write, removeItem: (key: string) => { items.delete(key); } });
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: { user } }] });
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  function create(id: string) {
    const fixture = TestBed.createComponent(LessonRunner);
    fixture.componentRef.setInput('lessonId', id); fixture.detectChanges(); return fixture;
  }

  it.each(Object.keys(LESSON_NAMES).filter(isDraftLessonId))(
    '%s uses the catalog title in the resume prompt without changing its draft',
    id => {
      expect(saveLessonDraft(account.id, id, { step: 1, exercise: null })).toBe(true);
      const saved = loadLessonDraft(account.id, id).draft;
      write.mockClear();
      const fixture = create(id);
      const label = fixture.nativeElement.querySelector('.draft-label') as HTMLElement;
      expect(label.textContent?.trim()).toBe('C' + Number(id.slice(-2)) + ' · ' + LESSON_NAMES[id]);
      expect(fixture.nativeElement.textContent).toContain(
        'Retoma el ejercicio de ' + LESSON_NAMES[id].toLowerCase() + ' donde lo dejaste.',
      );
      expect(write).not.toHaveBeenCalled();
      expect(loadLessonDraft(account.id, id).draft).toEqual(saved);
    },
  );

  for (const item of cases) {
    it(item.id + ' restores its exact exercise, without emitting completion or resetting its seed', () => {
      expect(saveLessonDraft(account.id, item.id, { step: 1, exercise: item.state })).toBe(true);
      write.mockClear();
      const fixture = create(item.id); const done = vi.fn(); fixture.componentInstance.completed.subscribe(done);
      expect(write).not.toHaveBeenCalled(); expect(fixture.componentInstance.resumeOffer()?.exercise).toEqual(item.state);
      fixture.componentInstance.nextStep(); expect(fixture.componentInstance.currentStepIndex()).toBe(0);
      fixture.componentInstance.resumeDraft(); fixture.detectChanges();
      const child = fixture.debugElement.query(By.directive(item.type)).componentInstance as Recoverable;
      expect(child.stage()).toBe(item.state.stage);
      expect(loadLessonDraft(account.id, item.id).draft?.exercise).toEqual(item.state);
      expect(done).not.toHaveBeenCalled();
      const seed = fixture.componentInstance.resumeOffer(); expect(seed).toBeNull();
      fixture.componentInstance.saveExerciseState(item.id, item.success); fixture.detectChanges();
      expect(child.stage()).toBe(item.state.stage); // Child outputs never become new initial inputs.
      fixture.destroy();
      const reopened = create(item.id); reopened.componentInstance.resumeDraft(); reopened.detectChanges();
      const copy = reopened.debugElement.query(By.directive(item.type)).componentInstance as Recoverable;
      expect(copy.stage()).toBe('success');
      expect(copy.guidedCompletion()).toBe(item.id !== 'lesson-01');
      expect(loadLessonDraft(account.id, item.id).draft?.exercise).toEqual(item.success);
    });

    it(item.id + ' restarts only this draft, preserving pending progress and other accounts/classes', () => {
      saveLessonDraft(account.id, item.id, { step: 1, exercise: item.state });
      saveLessonDraft('other', item.id, { step: 1, exercise: item.state });
      const otherId = item.id === 'lesson-01' ? 'lesson-02' : 'lesson-01';
      saveLessonDraft(account.id, otherId, { step: 0, exercise: null });
      items.set('exploralab.pending-progress.v1.' + account.id, JSON.stringify([item.id]));
      const fixture = create(item.id); fixture.componentInstance.restartDraft(); fixture.detectChanges();
      expect(loadLessonDraft(account.id, item.id).draft?.step).toBe(0);
      expect(loadLessonDraft(account.id, item.id).draft?.exercise).toBeNull();
      expect(loadLessonDraft('other', item.id).draft?.exercise).toEqual(item.state);
      expect(loadLessonDraft(account.id, otherId).draft?.step).toBe(0);
      expect(items.get('exploralab.pending-progress.v1.' + account.id)).toBe(JSON.stringify([item.id]));
    });

    it(item.id + ' records success before the closing conversation and waits for confirmed cleanup', () => {
      saveLessonDraft(account.id, item.id, { step: 1, exercise: item.success });
      const fixture = create(item.id); const done = vi.fn(); fixture.componentInstance.completed.subscribe(done);
      fixture.componentInstance.resumeDraft(); fixture.detectChanges();
      const child = fixture.debugElement.query(By.directive(item.type)).componentInstance as Recoverable;
      expect(done).not.toHaveBeenCalled(); child.finish(); fixture.detectChanges();
      expect(fixture.componentInstance.currentStepIndex()).toBe(2);
      expect(loadLessonDraft(account.id, item.id).draft?.step).toBe(2);
      expect(done).not.toHaveBeenCalled();
      fixture.destroy(); const reopened = create(item.id);
      reopened.componentInstance.resumeDraft(); reopened.detectChanges();
      expect(reopened.componentInstance.currentStepIndex()).toBe(2);
      TestBed.inject(LessonDraftService).clearConfirmed(item.id, account);
      expect(loadLessonDraft(account.id, item.id).draft).toBeNull();
    });

    it(item.id + ' refuses stale callbacks after replacing the session and reports storage failure', () => {
      const fixture = create(item.id); fixture.componentInstance.nextStep(); fixture.detectChanges();
      user.set({ ...account }); write.mockClear();
      fixture.componentInstance.saveExerciseState(item.id, item.state);
      fixture.componentInstance.nextStep(); fixture.componentInstance.restartDraft();
      TestBed.inject(LessonDraftService).clearConfirmed(item.id, account);
      expect(write).not.toHaveBeenCalled(); expect(loadLessonDraft(account.id, item.id).draft).not.toBeNull();
      fixture.destroy(); user.set(account);
      items.clear(); write.mockImplementation(() => { throw new Error('Quota'); });
      const unavailable = create(item.id);
      expect(unavailable.nativeElement.textContent).toContain('no pudo guardar dónde vas');
      unavailable.componentInstance.nextStep(); unavailable.detectChanges();
      expect(unavailable.debugElement.query(By.directive(item.type))).not.toBeNull();
    });

    it(item.id + ' validates ownership, version, closure and whitelisted state fields', () => {
      expect(isLessonExerciseState(item.id, item.state)).toBe(true);
      expect(saveLessonDraft(account.id, item.id, { step: 2, exercise: item.state })).toBe(false);
      const extraFields = { ...item.state, arbitrary: 'not stored' };
      expect(saveLessonDraft(account.id, item.id, { step: 1, exercise: extraFields })).toBe(true);
      expect(loadLessonDraft(account.id, item.id).draft?.exercise).toEqual(item.state);
      const key = 'exploralab.lesson-draft.v1.' + account.id + '.' + item.id;
      const saved = JSON.parse(items.get(key)!);
      for (const change of [{ userId: 'other' }, { version: 2 }, { lessonVersion: 2 }, { lessonId: 'lesson-10' },
        { exercise: { ...item.state, stage: 'not-a-stage' } }]) {
        items.set(key, JSON.stringify({ ...saved, ...change }));
        expect(loadLessonDraft(account.id, item.id).discarded).toBe(true); expect(items.has(key)).toBe(false);
      }
    });
  }
  for (const item of cases.filter(item => item.id !== 'lesson-01')) {
    it(item.id + ' keeps a recovered guided finish assisted and requires the entire closing conversation', () => {
      expect(saveLessonDraft(account.id, item.id, { step: 1, exercise: item.success })).toBe(true);
      const fixture = create(item.id); const done = vi.fn(); fixture.componentInstance.completed.subscribe(done);
      fixture.componentInstance.resumeDraft(); fixture.detectChanges();
      const child = fixture.debugElement.query(By.directive(item.type)).componentInstance as Recoverable;
      expect(child.guidedCompletion()).toBe(true);
      expect(fixture.nativeElement.textContent).toContain('Completaste con ayuda');
      expect(done).not.toHaveBeenCalled(); child.finish(); fixture.detectChanges();
      expect(loadLessonDraft(account.id, item.id).draft).toMatchObject({ step: 2, exercise: item.success });
      expect(done).not.toHaveBeenCalled(); fixture.destroy();

      const closing = create(item.id); closing.componentInstance.completed.subscribe(done);
      closing.componentInstance.resumeDraft(); closing.detectChanges();
      const dialogue = closing.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
      expect(done).not.toHaveBeenCalled();
      for (let index = 0; index < dialogue.dialogue().messages.length; index++) {
        if (dialogue.isTyping()) dialogue.next(); dialogue.next();
      }
      expect(done).toHaveBeenCalledExactlyOnceWith(item.id);
      expect(loadLessonDraft(account.id, item.id).draft?.exercise).toEqual(item.success);
      TestBed.inject(LessonDraftService).clearConfirmed(item.id, account);
      expect(loadLessonDraft(account.id, item.id).draft).toBeNull();
    });

    for (const round of [1, 4]) {
      it(item.id + ' closes a recovered resolved review explicitly without adding round ' + (round + 1), () => {
        const review = { ...item.success, stage: 'review', round } as LessonExerciseState;
        expect(saveLessonDraft(account.id, item.id, { step: 1, exercise: review })).toBe(true);
        const fixture = create(item.id); const done = vi.fn(); fixture.componentInstance.completed.subscribe(done);
        fixture.componentInstance.resumeDraft(); fixture.detectChanges();
        const child = fixture.debugElement.query(By.directive(item.type)).componentInstance as Recoverable;
        expect(child.stage()).toBe('review'); expect(child.guidedCompletion()).toBe(false);
        child.finish(); expect(done).not.toHaveBeenCalled(); expect(child.stage()).toBe('review');
        const button = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')]
          .find(button => button.textContent?.includes(item.id === 'lesson-05' ? 'Preparar el aviso' : 'Ver el informe'))!;
        expect(button).toBeDefined(); button.click(); fixture.detectChanges();
        if (item.id === 'lesson-05') {
          expect(child.stage()).toBe('report'); child.finish(); expect(done).not.toHaveBeenCalled();
          (child as Lesson05Crushing).chooseReport('observed'); fixture.detectChanges();
        }
        const success = { ...item.success, round };
        expect(child.stage()).toBe('success'); expect(child.guidedCompletion()).toBe(true);
        expect(loadLessonDraft(account.id, item.id).draft?.exercise).toEqual(success);
        expect(done).not.toHaveBeenCalled(); child.continueAfterHelp(); child.finish(); fixture.detectChanges();
        expect(loadLessonDraft(account.id, item.id).draft).toMatchObject({ step: 2, exercise: success });
        expect(done).not.toHaveBeenCalled();
      });
    }
  }
  it('C1 preserves a guided finish after reopening and still requires the closing conversation', () => {
    const practice: C1State = { stage: 'practice', practiceRound: 1, practiceHelped: false,
      selectedLoad: null, selectedGroup: null };
    expect(saveLessonDraft(account.id, 'lesson-01', { step: 1, exercise: practice })).toBe(true);
    const fixture = create('lesson-01'); const done = vi.fn(); fixture.componentInstance.completed.subscribe(done);
    fixture.componentInstance.resumeDraft(); fixture.detectChanges();
    const game = fixture.debugElement.query(By.directive(Lesson01Loading)).componentInstance as Lesson01Loading;
    game.chooseGroup('F'); game.chooseGroup('E'); game.finish();
    expect(done).not.toHaveBeenCalled();
    expect(loadLessonDraft(account.id, 'lesson-01').draft?.exercise?.stage).toBe('practice-reason');
    game.chooseReason('spread'); fixture.detectChanges();
    const success: C1State = { ...practice, stage: 'success', selectedGroup: 'E', practiceHelped: true };
    expect(loadLessonDraft(account.id, 'lesson-01').draft).toMatchObject({ step: 1, exercise: success });
    expect(game.guidedCompletion()).toBe(true); expect(done).not.toHaveBeenCalled(); fixture.destroy();

    const reopened = create('lesson-01'); reopened.componentInstance.completed.subscribe(done);
    reopened.componentInstance.resumeDraft(); reopened.detectChanges();
    const copy = reopened.debugElement.query(By.directive(Lesson01Loading)).componentInstance as Lesson01Loading;
    expect(copy.guidedCompletion()).toBe(true); expect(copy.practiceHelped()).toBe(true);
    expect(copy.practiceRound()).toBe(1); expect(reopened.nativeElement.textContent).toContain('Completaste con ayuda');
    expect(done).not.toHaveBeenCalled(); copy.finish(); reopened.detectChanges();
    expect(loadLessonDraft(account.id, 'lesson-01').draft).toMatchObject({ step: 2, exercise: success });
    expect(done).not.toHaveBeenCalled(); reopened.destroy();

    const closing = create('lesson-01'); closing.componentInstance.completed.subscribe(done);
    closing.componentInstance.resumeDraft(); closing.detectChanges();
    expect(closing.debugElement.query(By.directive(Lesson01Loading))).toBeNull();
    expect(done).not.toHaveBeenCalled();
    const dialogue = closing.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    for (let index = 0; index < dialogue.dialogue().messages.length; index++) {
      if (dialogue.isTyping()) dialogue.next(); dialogue.next();
    }
    expect(done).toHaveBeenCalledExactlyOnceWith('lesson-01');
    expect(loadLessonDraft(account.id, 'lesson-01').draft).toMatchObject({ step: 2, exercise: success });
    TestBed.inject(LessonDraftService).clearConfirmed('lesson-01', account);
    expect(loadLessonDraft(account.id, 'lesson-01').draft).toBeNull();
  });

  it('does not mistake prototype names or future lessons for recoverable lessons', () => {
    for (const id of ['toString', '__proto__', 'lesson-10']) expect(isDraftLessonId(id)).toBe(false);
  });
});
