import { signal } from '@angular/core';
import { DeferBlockBehavior, DeferBlockState, TestBed } from '@angular/core/testing';

import { AuthService } from '../../../../../core/auth/auth.service';
import type { AuthenticatedUser } from '../../../../../core/auth/auth.types';
import { LEARNING_ZONES } from '../../../lessons/lesson-catalog';
import { loadLessonDraft, saveLessonDraft } from '../../../progress/lesson-draft.storage';
import { LessonRunner } from './lesson-runner';

const account: AuthenticatedUser = {
  id: 'deferred-lesson-a',
  displayName: 'A',
  email: 'a@example.test',
  avatarUrl: null,
};
const exerciseSelectors = [
  'app-lesson-01-loading',
  'app-lesson-02-ramp',
  'app-lesson-03-haulage',
  'app-lesson-04-workshop',
  'app-lesson-05-crushing',
  'app-lesson-06-sag',
  'app-lesson-07-balls',
  'app-lesson-08-flotation',
  'app-lesson-09-thickeners',
].join(', ');

describe('LessonRunner — deferred exercises', () => {
  const user = signal<AuthenticatedUser | null>(account);
  let items: Map<string, string>;

  beforeEach(() => {
    user.set(account);
    items = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => {
        items.set(key, value);
      },
      removeItem: (key: string) => {
        items.delete(key);
      },
    });
    TestBed.configureTestingModule({
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: [{ provide: AuthService, useValue: { user } }],
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  function create(lessonId = 'lesson-01') {
    const fixture = TestBed.createComponent(LessonRunner);
    fixture.componentRef.setInput('lessonId', lessonId);
    fixture.detectChanges();
    return fixture;
  }

  async function openExercise(fixture: ReturnType<typeof create>) {
    fixture.componentInstance.nextStep();
    fixture.detectChanges();
    const blocks = await fixture.getDeferBlocks();
    expect(blocks).toHaveLength(1);
    return blocks[0];
  }

  it.each(LEARNING_ZONES[0].lessons.map((lesson) => lesson.lessonId))(
    '%s creates only its selected exercise block after the introduction and keeps focus on arrival',
    async (lessonId) => {
      const fixture = create(lessonId);
      const root = fixture.nativeElement as HTMLElement;
      const done = vi.fn();
      fixture.componentInstance.completed.subscribe(done);
      expect(await fixture.getDeferBlocks()).toHaveLength(0);
      expect(root.querySelectorAll(exerciseSelectors)).toHaveLength(0);

      const block = await openExercise(fixture);
      const panel = root.querySelector('[role="dialog"]');
      await block.render(DeferBlockState.Loading);
      await fixture.whenStable();
      expect(root.querySelectorAll('[role="dialog"]')).toHaveLength(1);
      expect(root.querySelector('[role="status"][aria-busy="true"]')?.textContent).toContain(
        'Cargando actividad',
      );
      expect(root.querySelectorAll(exerciseSelectors)).toHaveLength(0);
      expect(document.activeElement).toBe(root.querySelector('.draft-prompt h2'));
      expect(fixture.componentInstance.currentStepIndex()).toBe(1);
      expect(done).not.toHaveBeenCalled();

      await block.render(DeferBlockState.Complete);
      await fixture.whenStable();
      expect(root.querySelector('[role="dialog"]')).toBe(panel);
      expect(root.querySelectorAll(exerciseSelectors)).toHaveLength(1);
      expect(root.querySelector('[aria-busy="true"]')).toBeNull();
      expect(document.activeElement).toBe(root.querySelector('h2'));
      expect(done).not.toHaveBeenCalled();
    },
  );

  it('does not steal focus from the close button when the exercise arrives', async () => {
    const fixture = create();
    const block = await openExercise(fixture);
    await block.render(DeferBlockState.Loading);
    const close = fixture.nativeElement.querySelector('.close-button') as HTMLButtonElement;
    close.focus();

    await block.render(DeferBlockState.Complete);
    await fixture.whenStable();
    expect(document.activeElement).toBe(close);
  });

  it('can close while waiting without completing or advancing the exercise', async () => {
    const fixture = create();
    const block = await openExercise(fixture);
    const closed = vi.fn(),
      done = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    fixture.componentInstance.completed.subscribe(done);
    await block.render(DeferBlockState.Loading);

    fixture.nativeElement.querySelector('.close-button').click();
    expect(closed).toHaveBeenCalledOnce();
    expect(done).not.toHaveBeenCalled();
    expect(fixture.componentInstance.currentStepIndex()).toBe(1);
    expect(loadLessonDraft(account.id, 'lesson-01').draft?.exercise).toBeNull();
    fixture.destroy();
  });

  it('preserves a resumed draft on load failure and offers a safe exit', async () => {
    const exercise = {
      stage: 'compare' as const,
      selectedLoad: null,
      selectedGroup: null,
      practiceRound: 0,
      practiceHelped: false,
    };
    expect(saveLessonDraft(account.id, 'lesson-01', { step: 1, exercise })).toBe(true);
    const fixture = create();
    const closed = vi.fn(),
      done = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    fixture.componentInstance.completed.subscribe(done);
    fixture.componentInstance.resumeDraft();
    fixture.detectChanges();
    const [block] = await fixture.getDeferBlocks();
    const saved = loadLessonDraft(account.id, 'lesson-01').draft;

    await block.render(DeferBlockState.Loading);
    await block.render(DeferBlockState.Error);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('No se pudo cargar');
    expect(root.textContent).toContain('recarga la página');
    expect(document.activeElement).toBe(root.querySelector('.draft-prompt h2'));
    expect(root.querySelectorAll(exerciseSelectors)).toHaveLength(0);
    expect(loadLessonDraft(account.id, 'lesson-01').draft).toEqual(saved);
    expect(fixture.componentInstance.currentStepIndex()).toBe(1);
    expect(done).not.toHaveBeenCalled();
    const exit = root.querySelector('.draft-actions button') as HTMLButtonElement;
    exit.click();
    expect(closed).toHaveBeenCalledOnce();
  });

  it('replaces a pending load with the session notice when the account changes', async () => {
    const fixture = create();
    const block = await openExercise(fixture);
    await block.render(DeferBlockState.Loading);
    const saved = loadLessonDraft(account.id, 'lesson-01').draft;
    user.set({ ...account, id: 'deferred-lesson-b' });
    fixture.detectChanges();
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('La sesión cambió');
    expect(root.textContent).not.toContain('Cargando actividad');
    expect(root.querySelectorAll(exerciseSelectors)).toHaveLength(0);
    expect(await fixture.getDeferBlocks()).toHaveLength(0);
    expect(loadLessonDraft(account.id, 'lesson-01').draft).toEqual(saved);
    expect(document.activeElement).toBe(root.querySelector('h2'));
  });

  it('drops the old exercise block when another lesson replaces it during loading', async () => {
    const fixture = create();
    const block = await openExercise(fixture);
    await block.render(DeferBlockState.Loading);
    fixture.componentRef.setInput('lessonId', 'lesson-02');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.currentStepIndex()).toBe(0);
    expect(await fixture.getDeferBlocks()).toHaveLength(0);
    expect(fixture.nativeElement.querySelectorAll(exerciseSelectors)).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('app-dialogue')).not.toBeNull();
  });

  it('does not create an exercise download when resuming the closing dialogue', async () => {
    expect(
      saveLessonDraft(account.id, 'lesson-01', {
        step: 2,
        exercise: {
          stage: 'success',
          selectedLoad: null,
          selectedGroup: 'D',
          practiceRound: 0,
          practiceHelped: false,
        },
      }),
    ).toBe(true);
    const fixture = create();
    const done = vi.fn();
    fixture.componentInstance.completed.subscribe(done);
    fixture.componentInstance.resumeDraft();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.currentStepIndex()).toBe(2);
    expect(await fixture.getDeferBlocks()).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('app-dialogue')).not.toBeNull();
    expect(done).not.toHaveBeenCalled();
  });
});
