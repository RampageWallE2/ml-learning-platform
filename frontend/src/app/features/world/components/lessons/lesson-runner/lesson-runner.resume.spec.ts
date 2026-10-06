import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AuthService } from '../../../../../core/auth/auth.service';
import { AuthenticatedUser } from '../../../../../core/auth/auth.types';
import { Dialogue } from '../../dialogue/dialogue';
import { Lesson06Sag } from '../../../lessons/lesson-06-sag/lesson-06-sag';
import { C6State } from '../../../lessons/lesson-06-sag/lesson-06-sag.state';
import { LessonDraftService } from '../../../progress/lesson-draft.service';
import { loadC6Draft, saveC6Draft } from '../../../progress/lesson-draft.storage';
import { LessonRunner } from './lesson-runner';

const a: AuthenticatedUser = { id: 'resume-a', displayName: 'A', email: 'a@example.test', avatarUrl: null };
const b: AuthenticatedUser = { ...a, id: 'resume-b' };
const practice: C6State = { stage: 'practice-average', squaresFormed: true, duplicated: true,
  duplicateViewed: true, round: 2, practiceHelped: true, practiceVarianceAnswered: false, choiceOffset: 2 };

@Component({ imports: [LessonRunner], template: `
  <app-lesson-runner lessonId="lesson-06" [statusTemplate]="notice" />
  <ng-template #notice><p>Pendiente de guardar</p><button type="button">Reintentar</button></ng-template>
` })
class DraftNoticeHost {}

describe('LessonRunner — C6 draft recovery', () => {
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
  function create(id = 'lesson-06') {
    const fixture = TestBed.createComponent(LessonRunner);
    fixture.componentRef.setInput('lessonId', id); fixture.detectChanges(); return fixture;
  }
  function exercise(fixture: ReturnType<typeof create>) {
    return fixture.debugElement.query(By.directive(Lesson06Sag)).componentInstance as Lesson06Sag;
  }
  function click(fixture: ReturnType<typeof create>, label: string) {
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'));
    const button = buttons.find(item => item.textContent?.trim() === label);
    expect(button, label).toBeDefined(); button!.click(); fixture.detectChanges();
  }

  it('keeps an offered draft unchanged until the student chooses and never emits completion on resume', async () => {
    saveC6Draft(a.id, { step: 1, exercise: practice }); write.mockClear();
    const fixture = create(); const done = vi.fn(); fixture.componentInstance.completed.subscribe(done);
    expect(write).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('¿Continuamos la clase?');
    fixture.componentInstance.nextStep(); expect(fixture.componentInstance.currentStepIndex()).toBe(0);
    click(fixture, 'Continuar'); await fixture.whenStable();
    const game = exercise(fixture);
    expect(game.stage()).toBe('practice-average'); expect(game.round()).toBe(2);
    expect(game.practiceHelped()).toBe(true); expect(game.values()).toEqual([100, 100, 102, 102]);
    expect(loadC6Draft(a.id).draft?.exercise).toEqual(practice);
    expect(done).not.toHaveBeenCalled();
    const panel = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(panel.contains(document.activeElement)).toBe(true);
  });

  it('persists every action, restores after destroying the runner, and does not loop its seed into the child', () => {
    const fixture = create(); fixture.componentInstance.nextStep(); fixture.detectChanges();
    const game = exercise(fixture);
    game.sumChanges(); game.chooseCancellation('balanced'); game.formSquares(); game.answerSquare(4);
    game.chooseWeight('four'); game.setDuplicated(true); game.setDuplicated(false);
    fixture.detectChanges();
    expect(game.stage()).toBe('duplicate'); expect(game.duplicateViewed()).toBe(true);
    expect(loadC6Draft(a.id).draft?.exercise?.duplicated).toBe(false);
    fixture.destroy();
    const reopened = create(); click(reopened, 'Continuar');
    const copy = exercise(reopened);
    expect(copy.stage()).toBe('duplicate'); expect(copy.duplicateViewed()).toBe(true);
    expect(copy.duplicated()).toBe(false);
    copy.setDuplicated(true); copy.compareCopy(); reopened.detectChanges();
    expect(copy.stage()).toBe('average'); expect(loadC6Draft(a.id).draft?.exercise?.stage).toBe('average');
  });

  it('starts again only on request without touching the pending completion key', () => {
    saveC6Draft(a.id, { step: 1, exercise: practice });
    const pendingKey = 'exploralab.pending-progress.v1.' + a.id;
    items.set(pendingKey, '["lesson-06"]');
    const fixture = create(); click(fixture, 'Volver a empezar');
    expect(fixture.componentInstance.currentStepIndex()).toBe(0);
    expect(fixture.debugElement.query(By.directive(Dialogue))).not.toBeNull();
    expect(loadC6Draft(a.id).draft?.exercise).toBeNull();
    expect(items.get(pendingKey)).toBe('["lesson-06"]');
  });

  it('restores the closing dialogue from its beginning and retains the draft after completion is emitted', () => {
    const finished: C6State = { ...practice, stage: 'success', practiceHelped: false, practiceVarianceAnswered: true };
    saveC6Draft(a.id, { step: 2, exercise: finished });
    const fixture = create(); const done = vi.fn(); fixture.componentInstance.completed.subscribe(done);
    click(fixture, 'Continuar');
    expect(fixture.debugElement.query(By.directive(Lesson06Sag))).toBeNull();
    const dialogue = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    expect(dialogue.currentIndex()).toBe(0); expect(done).not.toHaveBeenCalled();
    for (let index = 0; index < dialogue.dialogue().messages.length; index++) {
      if (dialogue.isTyping()) dialogue.next(); dialogue.next();
    }
    expect(done).toHaveBeenCalledExactlyOnceWith('lesson-06');
    expect(loadC6Draft(a.id).draft?.step).toBe(2);
  });

  it('writes a closing draft only after a successful exercise snapshot, before an external save', () => {
    const fixture = create(); fixture.componentInstance.nextStep(); fixture.detectChanges();
    fixture.componentInstance.nextStep(); expect(fixture.componentInstance.currentStepIndex()).toBe(1);
    const game = exercise(fixture);
    game.sumChanges(); game.chooseCancellation('balanced'); game.formSquares(); game.answerSquare(4);
    game.chooseWeight('four'); game.setDuplicated(true); game.compareCopy(); game.chooseSummary('per-record');
    game.startPractice(); game.answerPracticeSquare(1); game.choosePracticeSummary('same');
    game.answerPracticeVariance(1); game.continuePractice(); game.finish(); fixture.detectChanges();
    expect(fixture.componentInstance.currentStepIndex()).toBe(2);
    expect(loadC6Draft(a.id).draft?.step).toBe(2);
    expect(loadC6Draft(a.id).draft?.exercise?.stage).toBe('success');
  });

  it('recovers a guided C6 finish honestly and still requires the closing dialogue before completion', () => {
    saveC6Draft(a.id, { step: 1, exercise: { ...practice, round: 1 } });
    const fixture = create(); click(fixture, 'Continuar'); const game = exercise(fixture);
    game.choosePracticeSummary('same'); game.answerPracticeVariance(4); game.continuePractice(); fixture.detectChanges();
    expect(game.stage()).toBe('success'); expect(game.guidedCompletion()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Completaste con ayuda');
    expect(loadC6Draft(a.id).draft?.exercise?.practiceHelped).toBe(true);
    expect(loadC6Draft(a.id).draft?.exercise?.round).toBe(1); fixture.destroy();

    const reopened = create(); const done = vi.fn(); reopened.componentInstance.completed.subscribe(done);
    click(reopened, 'Continuar'); const resumed = exercise(reopened);
    expect(resumed.guidedCompletion()).toBe(true);
    expect(reopened.nativeElement.textContent).toContain('Completaste con ayuda');
    expect(done).not.toHaveBeenCalled(); resumed.finish(); reopened.detectChanges();
    expect(reopened.componentInstance.currentStepIndex()).toBe(2);
    expect(loadC6Draft(a.id).draft?.exercise?.practiceHelped).toBe(true);
    expect(loadC6Draft(a.id).draft?.step).toBe(2); reopened.destroy();

    const closing = create(); const closed = vi.fn(); closing.componentInstance.completed.subscribe(closed);
    click(closing, 'Continuar');
    expect(closing.debugElement.query(By.directive(Lesson06Sag))).toBeNull();
    const dialogue = closing.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    expect(closed).not.toHaveBeenCalled();
    for (let index = 0; index < dialogue.dialogue().messages.length; index++) {
      if (dialogue.isTyping()) dialogue.next(); dialogue.next();
    }
    expect(closed).toHaveBeenCalledExactlyOnceWith('lesson-06');
  });

  it('isolates accounts and hides stale content on session change', async () => {
    saveC6Draft(a.id, { step: 1, exercise: practice });
    const fixture = create(); click(fixture, 'Continuar'); const oldGame = exercise(fixture);
    user.set(b); write.mockClear();
    // A stale child callback before the render is ignored; after the render
    // the old child no longer exists and must not be called directly.
    oldGame.choosePracticeSummary('same'); fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('La sesión cambió');
    expect(fixture.debugElement.query(By.directive(Lesson06Sag))).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="dialog"]').contains(document.activeElement)).toBe(true);
    fixture.componentInstance.saveC6State(practice); fixture.componentInstance.nextStep();
    fixture.componentInstance.restartDraft();
    expect(write).not.toHaveBeenCalled(); expect(loadC6Draft(b.id).draft).toBeNull();
    fixture.destroy(); const other = create();
    expect(other.componentInstance.resumeOffer()).toBeNull();
    expect(loadC6Draft(a.id).draft?.exercise).toEqual(practice);
  });

  it('rejects writes from a replaced session even with the same account id', () => {
    const fixture = create(); fixture.componentInstance.nextStep(); fixture.detectChanges();
    user.set({ ...a }); write.mockClear();
    fixture.componentInstance.saveC6State(practice); fixture.componentInstance.nextStep();
    expect(write).not.toHaveBeenCalled(); expect(fixture.componentInstance.sessionChanged()).toBe(true);
  });

  it('warns about unavailable storage but keeps the exercise usable in memory', () => {
    write.mockImplementation(() => { throw new Error('Quota'); });
    const fixture = create();
    expect(fixture.nativeElement.textContent).toContain('no pudo guardar dónde vas');
    fixture.componentInstance.nextStep(); fixture.detectChanges();
    exercise(fixture).sumChanges(); fixture.detectChanges();
    expect(exercise(fixture).stage()).toBe('cancel');
    expect(fixture.nativeElement.querySelectorAll('.interaction-status')).toHaveLength(1);
  });

  it('warns and safely starts afresh when the draft is incompatible', () => {
    items.set('exploralab.lesson-draft.v1.' + a.id + '.lesson-06', '{"version":9}');
    const fixture = create();
    expect(fixture.componentInstance.resumeOffer()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('no es compatible');
    expect(loadC6Draft(a.id).draft?.step).toBe(0);
  });

  it('keeps both resume choices in the existing modal keyboard trap', () => {
    saveC6Draft(a.id, { step: 1, exercise: practice });
    const fixture = create();
    const drafts = TestBed.inject(LessonDraftService);
    expect(drafts.load(a).draft).not.toBeNull();
    const root = fixture.nativeElement as HTMLElement;
    const close = root.querySelector<HTMLButtonElement>('.close-button')!;
    const restart = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent?.trim() === 'Volver a empezar')!;
    close.focus(); close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(restart);
    restart.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(close);
  });

  it('keeps the supplied save notice in the same panel and keyboard sequence during resume', () => {
    saveC6Draft(a.id, { step: 1, exercise: practice });
    const fixture = TestBed.createComponent(DraftNoticeHost); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('¿Continuamos la clase?');
    expect(root.querySelectorAll('.interaction-status')).toHaveLength(1);
    const retry = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent === 'Reintentar')!;
    expect(root.querySelector('[role="dialog"]')!.contains(retry)).toBe(true);
    root.querySelector<HTMLButtonElement>('.close-button')!.focus();
    document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(retry);
  });

  it.each(['lesson-10', 'unknown'])(
    'does not load or persist exercise drafts for %s', id => {
      const drafts = TestBed.inject(LessonDraftService); const load = vi.spyOn(drafts, 'load');
      const fixture = create(id); fixture.componentInstance.nextStep(); fixture.detectChanges();
      expect(load).not.toHaveBeenCalled(); expect(write).not.toHaveBeenCalled();
      expect(fixture.componentInstance.resumeOffer()).toBeNull();
    },
  );
});
