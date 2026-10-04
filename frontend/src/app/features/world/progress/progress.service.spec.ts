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
