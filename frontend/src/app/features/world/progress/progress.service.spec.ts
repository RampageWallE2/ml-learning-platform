import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthenticatedUser } from '../../../core/auth/auth.types';
import { loadPendingProgress, savePendingProgress } from './pending-progress.storage';

import { AUTH_CONFIG } from '../../../core/auth/auth.config';
import { ProgressService } from './progress.service';
import {
  StoredLessonProgress,
  StoredLessonProgressStatus
} from './progress.types';

describe('ProgressService — Open Pit MVP', () => {
  let progress: ProgressService;
  let http: HttpTestingController;
  let user: WritableSignal<AuthenticatedUser | null>;
  const studentA: AuthenticatedUser = { id: 'student-a', email: 'a@example.test', displayName: 'A', avatarUrl: null };
  const studentB: AuthenticatedUser = { id: 'student-b', email: 'b@example.test', displayName: 'B', avatarUrl: null };

  const storedLesson = (
    lessonId: string,
    status: StoredLessonProgressStatus
  ): StoredLessonProgress => ({
    lessonId,
    status,
    currentStep: 0,
    startedAt: '2026-09-16T00:00:00+00:00',
    completedAt:
      status === 'completed'
        ? '2026-09-16T00:05:00+00:00'
        : null,
    updatedAt: '2026-09-16T00:05:00+00:00'
  });

  beforeEach(() => {
    localStorage.clear();
    user = signal<AuthenticatedUser | null>(studentA);
    boot();
  });

  function boot() {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { user } },
        {
          provide: AUTH_CONFIG,
          useValue: {
            apiBaseUrl: 'http://api.test/api/v1',
            googleClientId: 'test-client-id'
          }
        }
      ]
    });

    progress = TestBed.inject(ProgressService);
    http = TestBed.inject(HttpTestingController);
  }

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  function failSave(id = 'lesson-01') {
    progress.completeLesson(id).subscribe({ error: () => undefined });
    http.expectOne(`http://api.test/api/v1/me/progress/${id}`).flush(
      { error: 'Offline' }, { status: 503, statusText: 'Service Unavailable' },
    );
  }

  function readStored(id = studentA.id) {
    return loadPendingProgress(id, ['lesson-01', 'lesson-02']).lessonIds;
  }

  it('persists the completion before HTTP and keeps it after network failure', () => {
    progress.completeLesson('lesson-01').subscribe({ error: () => undefined });
    expect(readStored()).toEqual(['lesson-01']);
    expect(progress.pendingLessonIds()).toEqual(['lesson-01']);
    expect(progress.isLessonAvailable('lesson-02')).toBe(false);
    http.expectOne('http://api.test/api/v1/me/progress/lesson-01').error(new ProgressEvent('error'));
    expect(readStored()).toEqual(['lesson-01']);
    expect(progress.isLessonCompleted('lesson-01')).toBe(false);
  });

  it('restores after reload, reads the server first and saves without repeating the activity', () => {
    failSave();
    TestBed.resetTestingModule(); boot();
    expect(progress.pendingLessonIds()).toEqual(['lesson-01']);
    let recovered = false;
    progress.loadProgress().subscribe(() => { recovered = true; });
    http.expectNone('http://api.test/api/v1/me/progress/lesson-01');
    http.expectOne('http://api.test/api/v1/me/progress').flush({ profileId: 'a', lessons: [] });
    expect(progress.syncingPending()).toBe(true);
    expect(progress.isLessonAvailable('lesson-02')).toBe(false);
    http.expectOne('http://api.test/api/v1/me/progress/lesson-01').flush({ progress: storedLesson('lesson-01', 'completed') });
    expect(recovered).toBe(true);
    expect(readStored()).toEqual([]);
    expect(progress.pendingLessonIds()).toEqual([]);
    expect(progress.syncingPending()).toBe(false);
    expect(progress.isLessonAvailable('lesson-02')).toBe(true);
  });

  it('removes a pending item without another PUT if the server saved it but its response was lost', () => {
    failSave();
    TestBed.resetTestingModule(); boot();
    progress.loadProgress().subscribe();
    http.expectOne('http://api.test/api/v1/me/progress').flush({
      profileId: 'a', lessons: [storedLesson('lesson-01', 'completed')],
    });
    http.expectNone('http://api.test/api/v1/me/progress/lesson-01');
    expect(readStored()).toEqual([]);
    expect(progress.isLessonCompleted('lesson-01')).toBe(true);
  });

  it('preserves pending items when the initial GET or the recovered PUT fails', () => {
    failSave();
    progress.loadProgress().subscribe({ error: () => undefined });
    http.expectOne('http://api.test/api/v1/me/progress').error(new ProgressEvent('error'));
    expect(readStored()).toEqual(['lesson-01']);
    http.expectNone('http://api.test/api/v1/me/progress/lesson-01');
    progress.loadProgress().subscribe({ error: () => undefined });
    http.expectOne('http://api.test/api/v1/me/progress').flush({ profileId: 'a', lessons: [] });
    http.expectOne('http://api.test/api/v1/me/progress/lesson-01').error(new ProgressEvent('error'));
    expect(progress.syncingPending()).toBe(false);
    expect(readStored()).toEqual(['lesson-01']);
  });

  it('does not synchronize one account pending result while another account is active', () => {
    failSave();
    user.set(studentB);
    progress.loadProgress().subscribe();
    http.expectOne('http://api.test/api/v1/me/progress').flush({ profileId: 'b', lessons: [] });
    expect(progress.pendingLessonIds()).toEqual([]);
    http.expectNone('http://api.test/api/v1/me/progress/lesson-01');
    expect(readStored()).toEqual(['lesson-01']);
    user.set(studentA);
    progress.loadProgress().subscribe();
    http.expectOne('http://api.test/api/v1/me/progress').flush({ profileId: 'a', lessons: [] });
    http.expectOne('http://api.test/api/v1/me/progress/lesson-01').flush({ progress: storedLesson('lesson-01', 'completed') });
    expect(readStored()).toEqual([]);
  });

  it('ignores late confirmations from the previous account', () => {
    progress.completeLesson('lesson-01').subscribe();
    const oldSave = http.expectOne('http://api.test/api/v1/me/progress/lesson-01');
    user.set(studentB);
    progress.loadProgress().subscribe();
    http.expectOne('http://api.test/api/v1/me/progress').flush({ profileId: 'b', lessons: [] });
    oldSave.flush({ progress: storedLesson('lesson-01', 'completed') });
    expect(progress.isLessonCompleted('lesson-01')).toBe(false);
    expect(progress.pendingLessonIds()).toEqual([]);
    expect(readStored()).toEqual(['lesson-01']);
  });

  it('ignores a late progress read or error after switching accounts', () => {
    let failed = false;
    progress.loadProgress().subscribe({ error: () => { failed = true; } });
    const oldRead = http.expectOne('http://api.test/api/v1/me/progress');
    user.set(studentB);
    progress.loadProgress().subscribe();
    http.expectOne('http://api.test/api/v1/me/progress').flush({ profileId: 'b', lessons: [] });
    oldRead.error(new ProgressEvent('error'));
    expect(failed).toBe(false);
    expect(progress.isLessonCompleted('lesson-01')).toBe(false);
  });

  it('shares concurrent saves of the same lesson and retains a save after the screen unsubscribes', () => {
    const first = progress.completeLesson('lesson-01').subscribe();
    const second = progress.completeLesson('lesson-01').subscribe();
    const request = http.expectOne('http://api.test/api/v1/me/progress/lesson-01');
    first.unsubscribe(); second.unsubscribe();
    expect(request.cancelled).toBe(false);
    request.flush({ progress: storedLesson('lesson-01', 'completed') });
    expect(progress.pendingLessonIds()).toEqual([]);
    expect(readStored()).toEqual([]);
  });

  it('preserves a confirmation received while an older GET is in flight', () => {
    progress.loadProgress().subscribe();
    const read = http.expectOne('http://api.test/api/v1/me/progress');
    progress.completeLesson('lesson-01').subscribe();
    http.expectOne('http://api.test/api/v1/me/progress/lesson-01').flush({ progress: storedLesson('lesson-01', 'completed') });
    read.flush({ profileId: 'a', lessons: [] });
    expect(progress.isLessonCompleted('lesson-01')).toBe(true);
    expect(progress.isLessonAvailable('lesson-02')).toBe(true);
  });

  it('discloses failed browser persistence but can retry from memory', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded'); });
    failSave();
    expect(progress.pendingStorageAvailable()).toBe(false);
    expect(progress.pendingLessonIds()).toEqual(['lesson-01']);
    progress.loadProgress().subscribe();
    http.expectOne('http://api.test/api/v1/me/progress').flush({ profileId: 'a', lessons: [] });
    http.expectOne('http://api.test/api/v1/me/progress/lesson-01').flush({ progress: storedLesson('lesson-01', 'completed') });
    expect(progress.pendingLessonIds()).toEqual([]);
  });

  it('rejects unknown, locked or unauthenticated completions before writing storage or HTTP', () => {
    for (const id of ['removed-lesson', 'lesson-02']) {
      progress.completeLesson(id).subscribe({ error: () => undefined });
    }
    user.set(null);
    progress.completeLesson('lesson-01').subscribe({ error: () => undefined });
    expect(readStored()).toEqual([]);
    http.expectNone(request => request.method === 'PUT');
  });

  it('does not remove a pending result for an incorrect server confirmation', () => {
    progress.completeLesson('lesson-01').subscribe({ error: () => undefined });
    http.expectOne('http://api.test/api/v1/me/progress/lesson-01').flush({ progress: storedLesson('lesson-02', 'completed') });
    expect(readStored()).toEqual(['lesson-01']);
    expect(progress.isLessonCompleted('lesson-01')).toBe(false);
  });

  it('recovers multiple stored results in pedagogical order without skipping prerequisites', () => {
    savePendingProgress(studentA.id, ['lesson-02', 'lesson-01']);
    progress.loadProgress().subscribe();
    http.expectOne('http://api.test/api/v1/me/progress').flush({ profileId: 'a', lessons: [] });
    http.expectNone('http://api.test/api/v1/me/progress/lesson-02');
    http.expectOne('http://api.test/api/v1/me/progress/lesson-01').flush({ progress: storedLesson('lesson-01', 'completed') });
    http.expectOne('http://api.test/api/v1/me/progress/lesson-02').flush({ progress: storedLesson('lesson-02', 'completed') });
    expect(readStored()).toEqual([]);
    expect(progress.isLessonAvailable('lesson-03')).toBe(true);
  });

  it('unlocks lessons in pedagogical order', () => {
    expect(progress.zoneProgress()[0].totalLessons).toBe(9);
    expect(progress.currentObjective()).toContain('encargado del carguío');
    expect(progress.isLessonAvailable('lesson-01')).toBe(true);
    expect(progress.isLessonAvailable('lesson-02')).toBe(false);
    expect(progress.isLessonAvailable('lesson-03')).toBe(false);
    expect(progress.isLessonAvailable('unknown-lesson')).toBe(false);
    expect(progress.isLessonAvailable('lesson-04')).toBe(false);
    expect(progress.isLessonAvailable('lesson-05')).toBe(false);
    expect(progress.isLessonAvailable('lesson-06')).toBe(false);
    expect(progress.isLessonAvailable('lesson-07')).toBe(false);
    expect(progress.isLessonAvailable('lesson-08')).toBe(false);
    expect(progress.isLessonAvailable('lesson-09')).toBe(false);
    expect(progress.isLessonAvailable('lesson-10')).toBe(false);
  });

  it('unlocks the workshop after C3 and then ROM/chancado after C4', () => {
    progress.loadProgress().subscribe();
    http.expectOne('http://api.test/api/v1/me/progress').flush({
      profileId: 'profile-id',
      lessons: ['lesson-01', 'lesson-02', 'lesson-03'].map(id => storedLesson(id, 'completed'))
    });
    expect(progress.isLessonAvailable('lesson-04')).toBe(true);
    expect(progress.currentObjective()).toContain('taller');
    expect(progress.zoneProgress()[0].percentage).toBe(33);
    expect(progress.zoneProgress()[0].completed).toBe(false);
    expect(progress.isLessonAvailable('lesson-05')).toBe(false);
    progress.completeLesson('lesson-04').subscribe();
    http.expectOne('http://api.test/api/v1/me/progress/lesson-04').flush({ progress: storedLesson('lesson-04', 'completed') });
    expect(progress.isLessonAvailable('lesson-05')).toBe(true);
    expect(progress.currentObjective()).toContain('ROM / chancado');
    expect(progress.zoneProgress()[0].percentage).toBe(44);
    expect(progress.zoneProgress()[0].completed).toBe(false);
    progress.completeLesson('lesson-05').subscribe();
    http.expectOne('http://api.test/api/v1/me/progress/lesson-05').flush({ progress: storedLesson('lesson-05', 'completed') });
    expect(progress.zoneProgress()[0].completed).toBe(false);
    expect(progress.zoneProgress()[0].percentage).toBe(56);
    expect(progress.isLessonAvailable('lesson-06')).toBe(true);
    expect(progress.currentObjective()).toContain('molino SAG');
    progress.completeLesson('lesson-06').subscribe();
    http.expectOne('http://api.test/api/v1/me/progress/lesson-06').flush({ progress: storedLesson('lesson-06', 'completed') });
    expect(progress.zoneProgress()[0].completed).toBe(false);
    expect(progress.zoneProgress()[0].percentage).toBe(67);
    expect(progress.isLessonAvailable('lesson-07')).toBe(true);
    expect(progress.currentObjective()).toContain('bolas e hidrociclones');
    progress.completeLesson('lesson-07').subscribe();
    http.expectOne('http://api.test/api/v1/me/progress/lesson-07').flush({ progress: storedLesson('lesson-07', 'completed') });
    expect(progress.zoneProgress()[0].completed).toBe(false);
    expect(progress.zoneProgress()[0].percentage).toBe(78);
    expect(progress.currentObjective()).toContain('flotación');
    expect(progress.isLessonAvailable('lesson-08')).toBe(true);
    progress.completeLesson('lesson-08').subscribe();
    http.expectOne('http://api.test/api/v1/me/progress/lesson-08').flush({ progress: storedLesson('lesson-08', 'completed') });
    expect(progress.zoneProgress()[0].completed).toBe(false);
    expect(progress.zoneProgress()[0].percentage).toBe(89);
    expect(progress.currentObjective()).toContain('espesadores');
    expect(progress.isLessonAvailable('lesson-09')).toBe(true);
    progress.completeLesson('lesson-09').subscribe();
    http.expectOne('http://api.test/api/v1/me/progress/lesson-09').flush({ progress: storedLesson('lesson-09', 'completed') });
    expect(progress.zoneProgress()[0].completed).toBe(true);
    expect(progress.zoneProgress()[0].percentage).toBe(100);
    expect(progress.currentObjective()).toBeNull();
  });

  it('resumes at C6 after persisted C5 and waits for API confirmation to unlock C7', () => {
    progress.loadProgress().subscribe();
    http.expectOne('http://api.test/api/v1/me/progress').flush({
      profileId: 'profile-id',
      lessons: ['lesson-01', 'lesson-02', 'lesson-03', 'lesson-04', 'lesson-05']
        .map(id => storedLesson(id, 'completed')),
    });
    expect(progress.isLessonAvailable('lesson-06')).toBe(true);
    expect(progress.currentObjective()).toContain('molino SAG');
    progress.completeLesson('lesson-06').subscribe({ error: () => undefined });
    http.expectOne('http://api.test/api/v1/me/progress/lesson-06').flush(
      { error: 'Database unavailable' }, { status: 503, statusText: 'Service Unavailable' },
    );
    expect(progress.isLessonCompleted('lesson-06')).toBe(false);
    expect(progress.zoneProgress()[0].completed).toBe(false);
    progress.completeLesson('lesson-06').subscribe();
    expect(progress.zoneProgress()[0].completed).toBe(false);
    http.expectOne('http://api.test/api/v1/me/progress/lesson-06').flush({
      progress: storedLesson('lesson-06', 'completed'),
    });
    expect(progress.isLessonCompleted('lesson-06')).toBe(true);
    expect(progress.zoneProgress()[0].completed).toBe(false);
    expect(progress.isLessonAvailable('lesson-07')).toBe(true);
    expect(progress.currentObjective()).toContain('bolas e hidrociclones');
  });

  it('resumes at C7 after persisted C6 and unlocks C8 only after successful API confirmation', () => {
    progress.loadProgress().subscribe();
    http.expectOne('http://api.test/api/v1/me/progress').flush({
      profileId: 'profile-id',
      lessons: ['lesson-01', 'lesson-02', 'lesson-03', 'lesson-04', 'lesson-05', 'lesson-06']
        .map(id => storedLesson(id, 'completed')),
    });
    expect(progress.isLessonAvailable('lesson-07')).toBe(true);
    expect(progress.zoneProgress()[0].percentage).toBe(67);
    expect(progress.currentObjective()).toContain('bolas e hidrociclones');
    progress.completeLesson('lesson-07').subscribe({ error: () => undefined });
    http.expectOne('http://api.test/api/v1/me/progress/lesson-07').flush(
      { error: 'Database unavailable' }, { status: 503, statusText: 'Service Unavailable' },
    );
    expect(progress.isLessonCompleted('lesson-07')).toBe(false);
    expect(progress.zoneProgress()[0].completed).toBe(false);
    progress.completeLesson('lesson-07').subscribe();
    expect(progress.zoneProgress()[0].completed).toBe(false);
    http.expectOne('http://api.test/api/v1/me/progress/lesson-07').flush({
      progress: storedLesson('lesson-07', 'completed'),
    });
    expect(progress.isLessonCompleted('lesson-07')).toBe(true);
    expect(progress.zoneProgress()[0].completed).toBe(false);
    expect(progress.zoneProgress()[0].percentage).toBe(78);
    expect(progress.currentObjective()).toContain('flotación');
    expect(progress.isLessonAvailable('lesson-08')).toBe(true);
  });

  it('resumes at C8 and unlocks C9 only after confirmation, without finishing the zone', () => {
    progress.loadProgress().subscribe();
    http.expectOne('http://api.test/api/v1/me/progress').flush({
      profileId: 'profile-id',
      lessons: Array.from({ length: 7 }, (_, index) => storedLesson('lesson-0' + (index + 1), 'completed')),
    });
    expect(progress.currentLesson()?.lessonId).toBe('lesson-08');
    expect(progress.currentObjective()).toContain('flotación');
    expect(progress.isLessonAvailable('lesson-08')).toBe(true);
    expect(progress.isLessonAvailable('lesson-09')).toBe(false);
    expect(progress.zoneProgress()[0].percentage).toBe(78);
    progress.completeLesson('lesson-08').subscribe({ error: () => undefined });
    http.expectOne('http://api.test/api/v1/me/progress/lesson-08').flush(
      { error: 'Database unavailable' }, { status: 503, statusText: 'Service Unavailable' },
    );
    expect(progress.isLessonCompleted('lesson-08')).toBe(false);
    expect(progress.currentObjective()).toContain('flotación');
    expect(progress.zoneProgress()[0].completed).toBe(false);
    progress.completeLesson('lesson-08').subscribe();
    expect(progress.zoneProgress()[0].percentage).toBe(78);
    http.expectOne('http://api.test/api/v1/me/progress/lesson-08').flush({
      progress: storedLesson('lesson-08', 'completed'),
    });
    expect(progress.isLessonCompleted('lesson-08')).toBe(true);
    expect(progress.zoneProgress()[0].completed).toBe(false);
    expect(progress.zoneProgress()[0].percentage).toBe(89);
    expect(progress.currentObjective()).toContain('espesadores');
    expect(progress.isLessonAvailable('lesson-09')).toBe(true);
  });

  it('resumes at C9 and finishes Open Pit only after the backend confirms its final report', () => {
    progress.loadProgress().subscribe();
    http.expectOne('http://api.test/api/v1/me/progress').flush({
      profileId: 'profile-id',
      lessons: Array.from({ length: 8 }, (_, index) => storedLesson('lesson-0' + (index + 1), 'completed')),
    });
    expect(progress.currentLesson()?.lessonId).toBe('lesson-09');
    expect(progress.currentObjective()).toContain('espesadores');
    expect(progress.zoneProgress()[0].percentage).toBe(89);
    progress.completeLesson('lesson-09').subscribe({ error: () => undefined });
    http.expectOne('http://api.test/api/v1/me/progress/lesson-09').flush(
      { error: 'Database unavailable' }, { status: 503, statusText: 'Service Unavailable' },
    );
    expect(progress.isLessonCompleted('lesson-09')).toBe(false);
    expect(progress.currentObjective()).toContain('espesadores');
    expect(progress.zoneProgress()[0].completed).toBe(false);
    progress.completeLesson('lesson-09').subscribe();
    expect(progress.zoneProgress()[0].completed).toBe(false);
    http.expectOne('http://api.test/api/v1/me/progress/lesson-09').flush({ progress: storedLesson('lesson-09', 'completed') });
    expect(progress.zoneProgress()[0].completedLessons).toBe(9);
    expect(progress.zoneProgress()[0].percentage).toBe(100);
    expect(progress.zoneProgress()[0].completed).toBe(true);
    expect(progress.currentObjective()).toBeNull();
    expect(progress.isLessonAvailable('lesson-10')).toBe(false);
  });

  it('loads only completed and registered lessons from the API', () => {
    progress.loadProgress().subscribe();

    const request = http.expectOne(
      'http://api.test/api/v1/me/progress'
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);

    request.flush({
      profileId: 'profile-id',
      lessons: [
        storedLesson('lesson-01', 'completed'),
        storedLesson('lesson-02', 'in_progress'),
        storedLesson('removed-lesson', 'completed')
      ]
    });

    expect(progress.isLessonCompleted('lesson-01')).toBe(true);
    expect(progress.isLessonCompleted('lesson-02')).toBe(false);
    expect(progress.isLessonCompleted('removed-lesson')).toBe(false);
    expect(progress.isLessonAvailable('lesson-02')).toBe(true);
    expect(progress.isLessonAvailable('lesson-03')).toBe(false);
    expect(progress.currentObjective()).toContain('encargado del control');
  });

  it('clears stale progress before requesting the current user progress', () => {
    progress.loadProgress().subscribe();
    http.expectOne('http://api.test/api/v1/me/progress').flush({
      profileId: 'profile-id',
      lessons: [storedLesson('lesson-01', 'completed')]
    });

    expect(progress.isLessonCompleted('lesson-01')).toBe(true);

    progress.loadProgress().subscribe({ error: () => undefined });

    expect(progress.isLessonCompleted('lesson-01')).toBe(false);

    http.expectOne('http://api.test/api/v1/me/progress').flush(
      { error: 'Database unavailable' },
      { status: 503, statusText: 'Service Unavailable' }
    );

    expect(progress.isLessonCompleted('lesson-01')).toBe(false);
  });

  it('updates local progress only after backend confirmation', () => {
    let saved = false;

    progress.completeLesson('lesson-01').subscribe(() => {
      saved = true;
    });

    expect(progress.isLessonCompleted('lesson-01')).toBe(false);

    const request = http.expectOne(
      'http://api.test/api/v1/me/progress/lesson-01'
    );

    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      status: 'completed',
      currentStep: 0
    });
    expect(request.request.withCredentials).toBe(true);

    request.flush({
      progress: storedLesson('lesson-01', 'completed')
    });

    expect(saved).toBe(true);
    expect(progress.isLessonCompleted('lesson-01')).toBe(true);
  });

  it('does not update local progress when saving fails', () => {
    let failed = false;

    progress.completeLesson('lesson-01').subscribe({
      error: () => {
        failed = true;
      }
    });

    http.expectOne(
      'http://api.test/api/v1/me/progress/lesson-01'
    ).flush(
      { error: 'Database unavailable' },
      { status: 503, statusText: 'Service Unavailable' }
    );

    expect(failed).toBe(true);
    expect(progress.isLessonCompleted('lesson-01')).toBe(false);
  });

  it('does not save a lesson again when it is already completed', () => {
    progress.loadProgress().subscribe();
    http.expectOne(
      'http://api.test/api/v1/me/progress'
    ).flush({
      profileId: 'profile-id',
      lessons: [
        storedLesson('lesson-01', 'completed')
      ]
    });

    progress.completeLesson('lesson-01').subscribe();

    http.expectNone(
      'http://api.test/api/v1/me/progress/lesson-01'
    );
  });
});
