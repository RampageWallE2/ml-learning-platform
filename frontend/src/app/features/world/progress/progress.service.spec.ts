import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AUTH_CONFIG } from '../../../core/auth/auth.config';
import { ProgressService } from './progress.service';
import {
  StoredLessonProgress,
  StoredLessonProgressStatus
} from './progress.types';

describe('ProgressService — Open Pit MVP', () => {
  let progress: ProgressService;
  let http: HttpTestingController;

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
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
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
  });

  afterEach(() => http.verify());

  it('unlocks lessons in pedagogical order', () => {
    expect(progress.zoneProgress()[0].totalLessons).toBe(3);
    expect(progress.currentObjective()).toContain('encargado del carguío');
    expect(progress.isLessonAvailable('lesson-01')).toBe(true);
    expect(progress.isLessonAvailable('lesson-02')).toBe(false);
    expect(progress.isLessonAvailable('lesson-03')).toBe(false);
    expect(progress.isLessonAvailable('unknown-lesson')).toBe(false);
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
