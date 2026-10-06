import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthenticatedUser } from '../../../core/auth/auth.types';
import { LessonDraftService } from './lesson-draft.service';

describe('LessonDraftService — session ownership', () => {
  const a: AuthenticatedUser = { id: 'draft-a', displayName: 'A', email: 'a@example.test', avatarUrl: null };
  const b: AuthenticatedUser = { ...a, id: 'draft-b' };
  const user = signal<AuthenticatedUser | null>(null);
  beforeEach(() => {
    const items = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => items.set(key, value), removeItem: (key: string) => items.delete(key) });
    user.set(a);
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: { user } }] });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('loads and clears only the requested lesson for the current owner', () => {
    const drafts = TestBed.inject(LessonDraftService);
    drafts.save(a, { step: 0, exercise: null });
    drafts.save(a, { step: 1, exercise: null }, 'lesson-08');
    expect(drafts.load(a, 'lesson-08').draft?.step).toBe(1);
    drafts.clearConfirmed('lesson-08', a);
    expect(drafts.load(a, 'lesson-08').draft).toBeNull();
    expect(drafts.load(a).draft).not.toBeNull();
    drafts.clearConfirmed('lesson-06', a);
    expect(drafts.load(a).draft).toBeNull();
  });

  it('rejects stale C8 saves and cleanup without deleting either account or lesson draft', () => {
    const drafts = TestBed.inject(LessonDraftService);
    drafts.save(a, { step: 0, exercise: null }); drafts.save(a, { step: 1, exercise: null }, 'lesson-08');
    user.set(b); drafts.save(b, { step: 0, exercise: null }, 'lesson-08');
    expect(drafts.save(a, { step: 0, exercise: null }, 'lesson-08')).toBe(false);
    drafts.clearConfirmed('lesson-08', a);
    expect(drafts.load(b, 'lesson-08').draft).not.toBeNull();
    user.set({ ...a });
    expect(drafts.load(a, 'lesson-08').draft).toBeNull();
    drafts.clearConfirmed('lesson-08', a); user.set(a);
    expect(drafts.load(a, 'lesson-08').draft?.step).toBe(1); expect(drafts.load(a).draft?.step).toBe(0);
    drafts.clearConfirmed('lesson-09', a); expect(drafts.load(a, 'lesson-08').draft).not.toBeNull();
  });

  it('rejects stale writes and cleanup after switching accounts or replacing the session', () => {
    const drafts = TestBed.inject(LessonDraftService);
    drafts.save(a, { step: 0, exercise: null });
    user.set(b); drafts.save(b, { step: 1, exercise: null });
    expect(drafts.save(a, { step: 1, exercise: null })).toBe(false);
    expect(drafts.load(a).draft).toBeNull();
    drafts.clearConfirmed('lesson-06', a);
    expect(drafts.load(b).draft?.step).toBe(1);
    user.set({ ...a });
    expect(drafts.save(a, { step: 1, exercise: null })).toBe(false);
    drafts.clearConfirmed('lesson-06', a);
    user.set(a);
    expect(drafts.load(a).draft?.step).toBe(0);
  });

  it('does not create a draft after logout', () => {
    const drafts = TestBed.inject(LessonDraftService);
    user.set(null);
    expect(drafts.currentUser()).toBeNull();
    expect(drafts.save(a, { step: 0, exercise: null })).toBe(false);
    drafts.clearConfirmed('lesson-06', null);
  });

  it('clears confirmed C7 without affecting C6 or C8 and rejects old-account cleanup', () => {
    const drafts = TestBed.inject(LessonDraftService);
    drafts.save(a, { step: 0, exercise: null }); drafts.save(a, { step: 0, exercise: null }, 'lesson-08');
    drafts.save(a, { step: 1, exercise: null }, 'lesson-07'); user.set(b);
    drafts.save(b, { step: 0, exercise: null }, 'lesson-07');
    expect(drafts.save(a, { step: 0, exercise: null }, 'lesson-07')).toBe(false);
    drafts.clearConfirmed('lesson-07', a); expect(drafts.load(b, 'lesson-07').draft?.step).toBe(0);
    user.set(a); expect(drafts.load(a, 'lesson-07').draft?.step).toBe(1);
    drafts.clearConfirmed('lesson-07', a); expect(drafts.load(a, 'lesson-07').draft).toBeNull();
    expect(drafts.load(a).draft).not.toBeNull(); expect(drafts.load(a, 'lesson-08').draft).not.toBeNull();
  });

  it('rejects C7 load, save and cleanup from a replaced same-account session', () => {
    const drafts = TestBed.inject(LessonDraftService); drafts.save(a, { step: 1, exercise: null }, 'lesson-07');
    user.set({ ...a }); expect(drafts.load(a, 'lesson-07').draft).toBeNull();
    expect(drafts.save(a, { step: 0, exercise: null }, 'lesson-07')).toBe(false);
    drafts.clearConfirmed('lesson-07', a); user.set(a);
    expect(drafts.load(a, 'lesson-07').draft?.step).toBe(1);
  });
});
