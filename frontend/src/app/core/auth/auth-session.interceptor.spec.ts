import {
  HttpClient,
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

describe('authSessionInterceptor', () => {
  const auth = {
    isAuthenticated: vi.fn(() => true),
    markSessionExpired: vi.fn()
  };
  const router = {
    url: '/world?zone=hub',
    navigate: vi.fn(() => Promise.resolve(true))
  };

  let httpClient: HttpClient;
  let http: HttpTestingController;

  beforeEach(() => {
    auth.isAuthenticated.mockReturnValue(true);
    auth.markSessionExpired.mockClear();
    router.navigate.mockClear();
    router.url = '/world?zone=hub';

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authSessionInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router }
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
});
