import {
  provideHttpClient
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AUTH_CONFIG } from './auth.config';
import { AuthService } from './auth.service';
import { AuthenticatedUser } from './auth.types';

describe('AuthService', () => {
  const user: AuthenticatedUser = {
    id: 'user-id',
    email: 'student@example.com',
    displayName: 'Student',
    avatarUrl: null
  };

  let auth: AuthService;
  let http: HttpTestingController;

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

    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

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
});
