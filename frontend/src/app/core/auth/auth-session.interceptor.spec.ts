import { DOCUMENT } from '@angular/common';
import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { AuthService } from './auth.service';
import { authSessionInterceptor } from './auth-session.interceptor';
import { AUTH_CONFIG } from './auth.config';

describe('authSessionInterceptor', () => {
  const auth = {
    isAuthenticated: vi.fn(() => true),
    sessionVersion: vi.fn(() => 0),
    markSessionExpired: vi.fn()
  };
  const router = {
    url: '/world?zone=hub',
    navigate: vi.fn(() => Promise.resolve(true))
  };

  let httpClient: HttpClient;
  let http: HttpTestingController;
  const config = { apiBaseUrl: '/api/v1', googleClientId: '' };

  beforeEach(() => {
    config.apiBaseUrl = '/api/v1';
    auth.sessionVersion.mockReturnValue(0);
    auth.isAuthenticated.mockReturnValue(true);
    auth.markSessionExpired.mockClear();
    router.navigate.mockClear();
    router.url = '/world?zone=hub';

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authSessionInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
        { provide: AUTH_CONFIG, useValue: config },
        { provide: DOCUMENT, useValue: { baseURI: 'https://game.example/world' } }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('clears the session and redirects after a protected request returns 401', () => {
    httpClient.get('/api/v1/me/progress').subscribe({
      error: () => undefined
    });

    http.expectOne('/api/v1/me/progress').flush(
      { error: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(auth.markSessionExpired).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: {
        reason: 'session-expired',
        returnUrl: '/world?zone=hub'
      }
    });
  });

  it('does not redirect when the initial session probe returns 401', () => {
    httpClient.get('/api/v1/me').subscribe({ error: () => undefined });

    http.expectOne('/api/v1/me').flush(
      { error: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(auth.markSessionExpired).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('does not treat invalid login credentials as an expired session', () => {
    httpClient.post('/api/v1/auth/login', {}).subscribe({
      error: () => undefined
    });

    http.expectOne('/api/v1/auth/login').flush(
      { code: 'invalid_credentials' },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(auth.markSessionExpired).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it.each([
    '/assets/map.json', '/outside?next=/api/v1/me/progress',
    '/api/v10/me/progress', '/api/v1-other/me/progress',
    'https://other.example/api/v1/me/progress', '//other.example/api/v1/me/progress',
    'http://game.example/api/v1/me/progress', 'https://game.example:444/api/v1/me/progress',
    'https://game.example.evil.example/api/v1/me/progress',
    'https://user:pass@game.example/api/v1/me/progress',
    '/api/v1/%2e%2e/outside', 'https://[invalid',
  ])('preserves the session and propagates an unrelated 401: %s', url => {
    let receivedError: HttpErrorResponse | undefined;
    httpClient.get(url).subscribe({ error: error => receivedError = error });
    http.expectOne(url).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(receivedError?.status).toBe(401);
    expect(auth.markSessionExpired).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it.each([
    ['GET', '/api/v1/me?refresh=1'],
    ['GET', 'https://game.example/api/v1/me#status'],
    ['GET', '/api/v1/me/?refresh=1'],
    ['POST', '/api/v1/auth/login?source=game'],
    ['POST', '/api/v1/auth/google?source=game'],
    ['POST', 'https://game.example/api/v1/auth/register#form'],
    ['POST', '/api/v1/auth/login/?source=game'],
  ])('keeps %s %s outside expired-session redirection', (method, url) => {
    httpClient.request(method, url, { body: method === 'POST' ? {} : undefined })
      .subscribe({ error: () => undefined });
    http.expectOne(url).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.markSessionExpired).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it.each([
    '/api/v1/me/progress?zone=zone-01',
    'https://game.example:443/api/v1/me/progress#records',
    '//game.example/api/v1/me/progress',
    '/api/v1/other/auth/login',
    '/api/v1/other/me',
  ])('recognizes protected paths without matching only a suffix: %s', url => {
    httpClient.get(url).subscribe({ error: () => undefined });
    http.expectOne(url).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.markSessionExpired).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledOnce();
  });

  it.each([
    ['https://api.example/api/v1/me/progress', true],
    ['https://game.example/api/v1/me/progress', false],
    ['/api/v1/me/progress', false],
  ])('respects the configured separate API for %s', (url, protectedRequest) => {
    config.apiBaseUrl = 'https://api.example/api/v1/';
    httpClient.get(url).subscribe({ error: () => undefined });
    http.expectOne(url).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.markSessionExpired).toHaveBeenCalledTimes(protectedRequest ? 1 : 0);
    expect(router.navigate).toHaveBeenCalledTimes(protectedRequest ? 1 : 0);
  });

  it('does not expire the session when the API URL is invalid', () => {
    config.apiBaseUrl = 'https://[invalid';
    httpClient.get('/api/v1/me/progress').subscribe({ error: () => undefined });
    http.expectOne('/api/v1/me/progress').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.markSessionExpired).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it.each([403, 503])('does not treat HTTP %s as an expired session', status => {
    httpClient.get('/api/v1/me/progress').subscribe({ error: () => undefined });
    http.expectOne('/api/v1/me/progress').flush({}, { status, statusText: 'Refused' });

    expect(auth.markSessionExpired).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('does not redirect an already anonymous user', () => {
    auth.isAuthenticated.mockReturnValue(false);
    httpClient.get('/api/v1/me/progress').subscribe({ error: () => undefined });
    http.expectOne('/api/v1/me/progress').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.markSessionExpired).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('propagates an old 401 without expiring the new session', () => {
    let receivedError: HttpErrorResponse | undefined;
    httpClient.get('/api/v1/me/progress').subscribe({ error: error => receivedError = error });
    const previous = http.expectOne('/api/v1/me/progress');

    auth.sessionVersion.mockReturnValue(1);
    previous.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(receivedError?.status).toBe(401);
    expect(auth.markSessionExpired).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();

    // A failure issued by the new session must still be handled normally.
    httpClient.get('/api/v1/me/progress').subscribe({ error: () => undefined });
    http.expectOne('/api/v1/me/progress').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.markSessionExpired).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledOnce();
  });
});
