import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { appConfig } from '../../app.config';
import { ProgressService } from '../../features/world/progress/progress.service';
import { AUTH_CONFIG } from './auth.config';
import { AuthService } from './auth.service';

describe('request verification — real app providers and services', () => {
  const root = 'https://api.example/api/v1';
  const user = { id: 'csrf-test-user', email: 'csrf@example.test', displayName: 'Test', avatarUrl: null };
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [
      ...appConfig.providers,
      provideHttpClientTesting(),
      { provide: AUTH_CONFIG, useValue: { apiBaseUrl: root, googleClientId: 'test-only' } },
    ] });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  function confirmAuth(path: string, account = user) {
    const request = http.expectOne(`${root}/auth/${path}`);
    expect(request.request.headers.get('X-ExploraLab-Request')).toBe('1');
    expect(request.request.withCredentials).toBe(true);
    request.flush({ user: account });
  }

  function login(account = user) {
    auth.loginWithEmail({ email: account.email, password: 'test-only-password' }).subscribe();
    confirmAuth('login', account);
  }

  it('preserves the real session when an unrelated server returns 401', () => {
    login();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    let receivedError: HttpErrorResponse | undefined;
    const url = 'https://other.example/api/v1/me/progress';
    TestBed.inject(HttpClient).get(url).subscribe({ error: error => receivedError = error });
    const request = http.expectOne(url);
    expect(request.request.headers.has('X-ExploraLab-Request')).toBe(false);
    request.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(receivedError?.status).toBe(401);
    expect(auth.user()).toEqual(user);
    expect(auth.isAuthenticated()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('still expires the real session for a protected API request with query parameters', () => {
    login();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    let receivedError: HttpErrorResponse | undefined;
    const url = `${root}/me/progress?zone=zone-01`;
    TestBed.inject(HttpClient).get(url, { withCredentials: true })
      .subscribe({ error: error => receivedError = error });
    http.expectOne(url).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(receivedError?.status).toBe(401);
    expect(auth.user()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { reason: 'session-expired', returnUrl: '/' },
    });
  });

  it('preserves an existing session when a repeated password login is limited', () => {
    login();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    auth.loginWithEmail({ email: user.email, password: 'test-only-password' }).subscribe({ error: () => undefined });
    const request = http.expectOne(`${root}/auth/login`);
    expect(request.request.headers.get('X-ExploraLab-Request')).toBe('1');
    request.flush({ code: 'too_many_login_attempts', retryAfterSeconds: 300 }, { status: 429, statusText: 'Too Many Requests' });
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.user()).toEqual(user);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('automatically protects email login, registration, Google login and logout', () => {
    auth.register({ displayName: user.displayName, email: user.email, password: 'test-only-password' }).subscribe();
    confirmAuth('register');
    login();
    auth.loginWithGoogle('fake-test-only-credential').subscribe();
    confirmAuth('google');
    expect(auth.isAuthenticated()).toBe(true);
    auth.logout().subscribe();
    const logout = http.expectOne(`${root}/auth/logout`);
    expect(logout.request.headers.get('X-ExploraLab-Request')).toBe('1');
    expect(logout.request.withCredentials).toBe(true);
    logout.flush({});
    expect(auth.isAuthenticated()).toBe(false);
  });

  it.each(['login', 'register', 'google', 'logout'])('does not lose an existing session on HTTP 413 from %s', path => {
    login();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    const rejected = { error: () => undefined };
    switch (path) {
      case 'login': auth.loginWithEmail({ email: user.email, password: 'test-only-password' }).subscribe(rejected); break;
      case 'register': auth.register({ email: user.email, displayName: user.displayName, password: 'test-only-password' }).subscribe(rejected); break;
      case 'google': auth.loginWithGoogle('fake-test-only').subscribe(rejected); break;
      case 'logout': auth.logout().subscribe(rejected); break;
    }
    http.expectOne(`${root}/auth/${path}`).flush({ code: 'request_too_large' }, { status: 413, statusText: 'Content Too Large' });
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.user()).toEqual(user);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('leaves the safe session check unchanged', () => {
    auth.restoreSession().subscribe();
    const request = http.expectOne(`${root}/me`);
    expect(request.request.headers.has('X-ExploraLab-Request')).toBe(false);
    expect(request.request.withCredentials).toBe(true);
    request.flush({ user });
  });

  it.each([
    { status: 403, statusText: 'Forbidden', code: 'csrf_validation_failed' },
    { status: 413, statusText: 'Content Too Large', code: 'request_too_large' },
  ])('protects saving and retrying progress; $status keeps session and pending completion', ({ status, statusText, code }) => {
    login();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    const progress = TestBed.inject(ProgressService);
    progress.completeLesson('lesson-01').subscribe({ error: () => undefined });
    const rejected = http.expectOne(`${root}/me/progress/lesson-01`);
    expect(rejected.request.headers.get('X-ExploraLab-Request')).toBe('1');
    expect(rejected.request.body).toEqual({ status: 'completed', currentStep: 0 });
    expect(rejected.request.withCredentials).toBe(true);
    rejected.flush({ code }, { status, statusText });
    expect(auth.isAuthenticated()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
    expect(progress.pendingLessonIds()).toEqual(['lesson-01']);
    expect(progress.isLessonCompleted('lesson-01')).toBe(false);

    progress.completeLesson('lesson-01').subscribe();
    const retry = http.expectOne(`${root}/me/progress/lesson-01`);
    expect(retry.request.headers.get('X-ExploraLab-Request')).toBe('1');
    retry.flush({ progress: { lessonId: 'lesson-01', status: 'completed', currentStep: 0 } });
    expect(progress.pendingLessonIds()).toEqual([]);
    expect(progress.isLessonCompleted('lesson-01')).toBe(true);
  });

  it('does not clear the local session when the server refuses logout verification', () => {
    login();
    auth.logout().subscribe({ error: () => undefined });
    http.expectOne(`${root}/auth/logout`).flush(
      { code: 'csrf_validation_failed' }, { status: 403, statusText: 'Forbidden' },
    );
    expect(auth.isAuthenticated()).toBe(true);
  });

  it.each([
    user,
    { id: 'next-test-user', email: 'next@example.test', displayName: 'Next', avatarUrl: null },
  ])('preserves session $id after an old protected request returns 401', account => {
    login();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    let receivedError: HttpErrorResponse | undefined;
    const url = `${root}/me/progress`;
    TestBed.inject(HttpClient).get(url).subscribe({ error: error => receivedError = error });
    const previous = http.expectOne(url);

    auth.logout().subscribe();
    http.expectOne(`${root}/auth/logout`).flush({});
    login(account);
    const version = auth.sessionVersion();
    previous.flush({}, { status: 401, statusText: 'Previous session' });

    expect(receivedError?.status).toBe(401);
    expect(auth.user()).toEqual(account);
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.sessionVersion()).toBe(version);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not expire the new account when saving the previous account returns 401', () => {
    login();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const progress = TestBed.inject(ProgressService);
    const received = vi.fn();
    const failed = vi.fn();
    progress.completeLesson('lesson-01').subscribe({ next: received, error: failed });
    const previous = http.expectOne(`${root}/me/progress/lesson-01`);

    auth.logout().subscribe();
    http.expectOne(`${root}/auth/logout`).flush({});
    const nextAccount = { id: 'next-test-user', email: 'next@example.test', displayName: 'Next', avatarUrl: null };
    login(nextAccount);
    progress.loadProgress().subscribe();
    http.expectOne(`${root}/me/progress`).flush({ lessons: [] });
    previous.flush({}, { status: 401, statusText: 'Previous session' });

    expect(received).not.toHaveBeenCalled();
    expect(failed).not.toHaveBeenCalled();
    expect(auth.user()).toEqual(nextAccount);
    expect(auth.isAuthenticated()).toBe(true);
    expect(progress.isLessonCompleted('lesson-01')).toBe(false);
    expect(progress.pendingLessonIds()).toEqual([]);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('suppresses the callback and error of a stale logout 401 with both interceptors active', () => {
    login();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const received = vi.fn();
    const failed = vi.fn();
    const completed = vi.fn();
    auth.logout().subscribe({ next: received, error: failed, complete: completed });
    const previous = http.expectOne(`${root}/auth/logout`);
    login();
    previous.flush({}, { status: 401, statusText: 'Previous session' });

    expect(received).not.toHaveBeenCalled();
    expect(failed).not.toHaveBeenCalled();
    expect(completed).toHaveBeenCalledOnce();
    expect(auth.user()).toEqual(user);
    expect(auth.isAuthenticated()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });
});
