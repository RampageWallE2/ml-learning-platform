import {
  HttpErrorResponse,
  provideHttpClient
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TimeoutError } from 'rxjs';

import { AUTH_CONFIG } from './auth.config';
import { AuthService } from './auth.service';
import { API_REQUEST_TIMEOUT_MS } from '../http/request-timeout';
import { AuthenticatedUser } from './auth.types';
import {
  loadWorldSession,
  saveWorldSession,
} from '../world-session/world-session.storage';

describe('AuthService', () => {
  const user: AuthenticatedUser = {
    id: 'user-id',
    email: 'student@example.com',
    displayName: 'Student',
    avatarUrl: null
  };
  const nextUser: AuthenticatedUser = {
    id: 'next-user-id', email: 'next@example.test', displayName: 'Next', avatarUrl: null
  };
  const root = 'http://api.test/api/v1';

  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();

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

    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    try { http.verify(); } finally { vi.useRealTimers(); }
  });

  function authenticate(account = user): void {
    auth.loginWithEmail({ email: account.email, password: 'test-only-password' }).subscribe();
    http.expectOne(`${root}/auth/login`).flush({ user: account });
  }

  function signIn(path: 'google' | 'login' | 'register') {
    switch (path) {
      case 'google': return auth.loginWithGoogle('test-only-credential');
      case 'login': return auth.loginWithEmail({ email: user.email, password: 'test-only-password' });
      case 'register': return auth.register({ email: user.email, displayName: user.displayName, password: 'test-only-password' });
    }
  }

  it('expires a shared session probe, preserves recovery data and allows an explicit retry', () => {
    vi.useFakeTimers();
    const savedAt = Date.now();
    saveWorldSession({ version: 1, sceneKey: 'OpenPitScene', playerX: 10, playerY: 20, savedAt }, sessionStorage);
    const first = vi.fn();
    const second = vi.fn();
    const restoration = auth.restoreSession();
    restoration.subscribe(first);
    auth.restoreSession().subscribe(second);
    const request = http.expectOne(`${root}/me`);

    vi.advanceTimersByTime(API_REQUEST_TIMEOUT_MS - 1);
    expect(request.cancelled).toBe(false);
    expect(auth.status()).toBe('checking');
    expect(first).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(request.cancelled).toBe(true);
    expect(first).toHaveBeenCalledExactlyOnceWith(false);
    expect(second).toHaveBeenCalledExactlyOnceWith(false);
    expect(auth.status()).toBe('unavailable');
    expect(auth.sessionVersion()).toBe(0);
    expect(loadWorldSession(sessionStorage, Date.now())).not.toBeNull();
    http.expectNone(`${root}/me`);

    const retried = vi.fn();
    restoration.subscribe(retried);
    http.expectOne(`${root}/me`).flush({ user });
    expect(retried).toHaveBeenCalledExactlyOnceWith(true);
    expect(auth.status()).toBe('authenticated');
  });

  it.each(['google', 'login', 'register'] as const)('bounds %s without expiring the current session or retrying automatically', path => {
    vi.useFakeTimers();
    authenticate();
    const version = auth.sessionVersion();
    const savedAt = Date.now();
    saveWorldSession({ version: 1, sceneKey: 'OpenPitScene', playerX: 10, playerY: 20, savedAt }, sessionStorage);
    const received = vi.fn();
    const failed = vi.fn();
    signIn(path).subscribe({ next: received, error: failed });
    const request = http.expectOne(`${root}/auth/${path}`);
    vi.advanceTimersByTime(API_REQUEST_TIMEOUT_MS);

    expect(request.cancelled).toBe(true);
    expect(received).not.toHaveBeenCalled();
    expect(failed).toHaveBeenCalledExactlyOnceWith(expect.any(TimeoutError));
    expect(auth.user()).toEqual(user);
    expect(auth.status()).toBe('authenticated');
    expect(auth.sessionVersion()).toBe(version);
    expect(loadWorldSession(sessionStorage, Date.now())).not.toBeNull();
    http.expectNone(`${root}/auth/${path}`);
    expect(() => request.flush({ user: nextUser })).toThrow(/cancelled/);
    expect(auth.user()).toEqual(user);

    signIn(path).subscribe();
    http.expectOne(`${root}/auth/${path}`).flush({ user: nextUser });
    expect(auth.user()).toEqual(nextUser);
  });

  it('keeps the local session when logout times out instead of treating it as a 401', () => {
    vi.useFakeTimers();
    authenticate();
    const version = auth.sessionVersion();
    const failed = vi.fn();
    auth.logout().subscribe({ error: failed });
    const request = http.expectOne(`${root}/auth/logout`);
    vi.advanceTimersByTime(API_REQUEST_TIMEOUT_MS);
    expect(request.cancelled).toBe(true);
    expect(failed).toHaveBeenCalledExactlyOnceWith(expect.any(TimeoutError));
    expect(auth.user()).toEqual(user);
    expect(auth.status()).toBe('authenticated');
    expect(auth.sessionVersion()).toBe(version);
    http.expectNone(`${root}/auth/logout`);
    auth.logout().subscribe();
    http.expectOne(`${root}/auth/logout`).flush({});
    expect(auth.status()).toBe('anonymous');
  });

  it('does not let an old probe timeout overwrite a newer authenticated session', () => {
    vi.useFakeTimers();
    const received = vi.fn();
    const failed = vi.fn();
    const completed = vi.fn();
    auth.restoreSession().subscribe({ next: received, error: failed, complete: completed });
    const previous = http.expectOne(`${root}/me`);
    authenticate(nextUser);
    const version = auth.sessionVersion();
    vi.advanceTimersByTime(API_REQUEST_TIMEOUT_MS);
    expect(previous.cancelled).toBe(true);
    expect(received).not.toHaveBeenCalled();
    expect(failed).not.toHaveBeenCalled();
    expect(completed).toHaveBeenCalledOnce();
    expect(auth.user()).toEqual(nextUser);
    expect(auth.status()).toBe('authenticated');
    expect(auth.sessionVersion()).toBe(version);
  });

  it('restores an existing session with credentials', () => {
    let restored = false;

    auth.restoreSession().subscribe(result => {
      restored = result;
    });

    const request = http.expectOne('http://api.test/api/v1/me');
    expect(request.request.withCredentials).toBe(true);
    request.flush({ user });

    expect(restored).toBe(true);
    expect(auth.user()).toEqual(user);
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('clears authentication when session restoration returns 401', () => {
    let restored = true;

    auth.restoreSession().subscribe(result => {
      restored = result;
    });

    http.expectOne('http://api.test/api/v1/me').flush(
      { error: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(restored).toBe(false);
    expect(auth.user()).toBeNull();
    expect(auth.status()).toBe('anonymous');
  });

  it('allows retrying session restoration after a temporary backend failure', () => {
    auth.restoreSession().subscribe();

    http.expectOne('http://api.test/api/v1/me').flush(
      { error: 'Server unavailable' },
      { status: 503, statusText: 'Service Unavailable' }
    );

    expect(auth.user()).toBeNull();
    expect(auth.status()).toBe('unavailable');

    auth.restoreSession().subscribe();
    http.expectOne('http://api.test/api/v1/me').flush({ user });

    expect(auth.user()).toEqual(user);
    expect(auth.status()).toBe('authenticated');
  });

  it('sends the Google credential and stores the authenticated user', () => {
    auth.loginWithGoogle('google-id-token').subscribe();

    const request = http.expectOne(
      'http://api.test/api/v1/auth/google'
    );

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      credential: 'google-id-token'
    });
    expect(request.request.withCredentials).toBe(true);

    request.flush({ user });

    expect(auth.user()).toEqual(user);
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('logs in with email and password', () => {
    auth.loginWithEmail({
      email: 'student@example.com',
      password: 'secure-password'
    }).subscribe();

    const request = http.expectOne(
      'http://api.test/api/v1/auth/login'
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      email: 'student@example.com',
      password: 'secure-password'
    });
    expect(request.request.withCredentials).toBe(true);

    request.flush({ user });

    expect(auth.user()).toEqual(user);
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('registers a password account and stores the authenticated user', () => {
    auth.register({
      displayName: 'Student',
      email: 'student@example.com',
      password: 'secure-password'
    }).subscribe();

    const request = http.expectOne(
      'http://api.test/api/v1/auth/register'
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      displayName: 'Student',
      email: 'student@example.com',
      password: 'secure-password'
    });
    expect(request.request.withCredentials).toBe(true);

    request.flush({ user });

    expect(auth.user()).toEqual(user);
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('clears the local session after logout', () => {
    const savedAt = Date.now();

    saveWorldSession({
      version: 1,
      sceneKey: 'OpenPitScene',
      playerX: 640,
      playerY: 384,
      savedAt,
    });

    auth.loginWithGoogle('google-id-token').subscribe();
    http.expectOne('http://api.test/api/v1/auth/google').flush({ user });

    auth.logout().subscribe();

    const request = http.expectOne(
      'http://api.test/api/v1/auth/logout'
    );

    expect(request.request.withCredentials).toBe(true);
    request.flush({ message: 'Logged out.' });

    expect(auth.user()).toBeNull();
    expect(auth.status()).toBe('anonymous');
    expect(loadWorldSession(sessionStorage, savedAt)).toBeNull();
  });

  it('keeps the local session when logout fails', () => {
    auth.loginWithGoogle('google-id-token').subscribe();
    http.expectOne('http://api.test/api/v1/auth/google').flush({ user });

    auth.logout().subscribe({ error: () => undefined });

    http.expectOne('http://api.test/api/v1/auth/logout').flush(
      { error: 'Server unavailable' },
      { status: 503, statusText: 'Service Unavailable' }
    );

    expect(auth.user()).toEqual(user);
    expect(auth.status()).toBe('authenticated');
  });

  it('clears the local session when it expires', () => {
    auth.loginWithGoogle('google-id-token').subscribe();
    http.expectOne('http://api.test/api/v1/auth/google').flush({ user });

    auth.markSessionExpired();

    expect(auth.user()).toBeNull();
    expect(auth.status()).toBe('anonymous');
  });

  it('shares a pending restoration between subscribers', () => {
    const first = vi.fn();
    const second = vi.fn();
    auth.restoreSession().subscribe(first);
    auth.restoreSession().subscribe(second);
    expect(auth.status()).toBe('checking');

    http.expectOne(`${root}/me`).flush({ user });

    expect(first).toHaveBeenCalledExactlyOnceWith(true);
    expect(second).toHaveBeenCalledExactlyOnceWith(true);
    expect(auth.sessionVersion()).toBe(1);
  });

  it('checks the latest state when a retained restoration observable is subscribed', () => {
    const restoration = auth.restoreSession();
    auth.markSessionExpired();
    const received = vi.fn();

    restoration.subscribe(received);

    http.expectNone(`${root}/me`);
    expect(received).toHaveBeenCalledExactlyOnceWith(false);
    expect(auth.status()).toBe('anonymous');
  });

  it('does not replay a previous restoration after the session has expired', () => {
    const restoration = auth.restoreSession();
    restoration.subscribe();
    http.expectOne(`${root}/me`).flush({ user });
    auth.markSessionExpired();
    const received = vi.fn();

    restoration.subscribe(received);

    http.expectNone(`${root}/me`);
    expect(received).toHaveBeenCalledExactlyOnceWith(false);
    expect(auth.user()).toBeNull();
  });

  it('does not restore a session invalidated while its GET was pending', () => {
    const received = vi.fn();
    const completed = vi.fn();
    auth.restoreSession().subscribe({ next: received, complete: completed });
    const previous = http.expectOne(`${root}/me`);

    auth.markSessionExpired();
    previous.flush({ user });

    expect(received).not.toHaveBeenCalled();
    expect(completed).toHaveBeenCalledOnce();
    expect(auth.user()).toBeNull();
    expect(auth.status()).toBe('anonymous');
  });

  it.each([200, 401, 403, 503])('ignores an old restoration response with status %s after a new login', status => {
    const received = vi.fn();
    const failed = vi.fn();
    auth.restoreSession().subscribe({ next: received, error: failed });
    const previous = http.expectOne(`${root}/me`);
    authenticate(nextUser);
    const version = auth.sessionVersion();

    if (status === 200) previous.flush({ user });
    else previous.flush({}, { status, statusText: 'Previous session' });

    expect(received).not.toHaveBeenCalled();
    expect(failed).not.toHaveBeenCalled();
    expect(auth.user()).toEqual(nextUser);
    expect(auth.status()).toBe('authenticated');
    expect(auth.sessionVersion()).toBe(version);
  });

  it.each(['google', 'login', 'register'] as const)('ignores an old %s success after a new session is established', path => {
    const received = vi.fn();
    const completed = vi.fn();
    signIn(path).subscribe({ next: received, complete: completed });
    const previous = http.expectOne(`${root}/auth/${path}`);
    authenticate(nextUser);
    const version = auth.sessionVersion();

    previous.flush({ user });

    expect(received).not.toHaveBeenCalled();
    expect(completed).toHaveBeenCalledOnce();
    expect(auth.user()).toEqual(nextUser);
    expect(auth.sessionVersion()).toBe(version);
  });

  it.each(['google', 'login', 'register'] as const)('ignores an old %s error after a new session is established', path => {
    const failed = vi.fn();
    const completed = vi.fn();
    signIn(path).subscribe({ error: failed, complete: completed });
    const previous = http.expectOne(`${root}/auth/${path}`);
    authenticate(nextUser);
    const version = auth.sessionVersion();

    previous.flush({}, { status: 401, statusText: 'Previous session' });

    expect(failed).not.toHaveBeenCalled();
    expect(completed).toHaveBeenCalledOnce();
    expect(auth.user()).toEqual(nextUser);
    expect(auth.status()).toBe('authenticated');
    expect(auth.sessionVersion()).toBe(version);
  });

  it.each([200, 401, 503])('ignores an old logout response with status %s after signing into the same account again', status => {
    authenticate();
    const received = vi.fn();
    const failed = vi.fn();
    const completed = vi.fn();
    auth.logout().subscribe({ next: received, error: failed, complete: completed });
    const previous = http.expectOne(`${root}/auth/logout`);
    authenticate();
    const version = auth.sessionVersion();
    const savedAt = Date.now();
    const snapshot = { version: 1 as const, sceneKey: 'OpenPitScene' as const,
      playerX: 640, playerY: 384, savedAt };
    saveWorldSession(snapshot);

    if (status === 200) previous.flush({});
    else previous.flush({}, { status, statusText: 'Previous session' });

    expect(received).not.toHaveBeenCalled();
    expect(failed).not.toHaveBeenCalled();
    expect(completed).toHaveBeenCalledOnce();
    expect(auth.user()).toEqual(user);
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.sessionVersion()).toBe(version);
    expect(loadWorldSession(sessionStorage, savedAt)).toEqual(snapshot);
  });

  it('does not restore an older session after logout succeeds', () => {
    const received = vi.fn();
    auth.restoreSession().subscribe(received);
    const previous = http.expectOne(`${root}/me`);

    auth.logout().subscribe();
    http.expectOne(`${root}/auth/logout`).flush({});
    previous.flush({ user });

    expect(received).not.toHaveBeenCalled();
    expect(auth.user()).toBeNull();
    expect(auth.status()).toBe('anonymous');
  });

  it('still handles a current Google 401 and reports the error to its caller', () => {
    authenticate();
    let receivedError: HttpErrorResponse | undefined;
    auth.loginWithGoogle('test-only-credential').subscribe({ error: error => receivedError = error });

    http.expectOne(`${root}/auth/google`).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(receivedError?.status).toBe(401);
    expect(auth.user()).toBeNull();
    expect(auth.status()).toBe('anonymous');
  });
});
