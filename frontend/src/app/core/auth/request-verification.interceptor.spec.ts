import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpHeaders, HttpRequest, HttpResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AUTH_CONFIG } from './auth.config';
import { requestVerificationInterceptor } from './request-verification.interceptor';

describe('requestVerificationInterceptor', () => {
  let http: HttpTestingController;
  let client: HttpClient;
  const header = 'X-ExploraLab-Request';
  const config = { apiBaseUrl: '/api/v1', googleClientId: '' };

  beforeEach(() => {
    config.apiBaseUrl = '/api/v1';
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([requestVerificationInterceptor])),
      provideHttpClientTesting(),
      { provide: AUTH_CONFIG, useValue: config },
      { provide: DOCUMENT, useValue: { baseURI: 'https://game.example/world' } },
    ] });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('adds the marker to API %s requests', method => {
    client.request(method, '/api/v1/me/progress/lesson-01', { body: {} }).subscribe();
    const request = http.expectOne('/api/v1/me/progress/lesson-01');
    expect(request.request.headers.get(header)).toBe('1');
    request.flush({});
  });

  it.each(['GET', 'HEAD', 'OPTIONS'])('leaves safe %s requests unchanged', method => {
    client.request(method, '/api/v1/me').subscribe();
    const request = http.expectOne('/api/v1/me');
    expect(request.request.headers.has(header)).toBe(false);
    request.flush({});
  });

  it.each([
    '/api/v1', '/api/v1/', '/api/v1/auth/login?source=game',
    'https://game.example/api/v1/auth/login', '//game.example/api/v1/auth/logout',
    'https://game.example:443/api/v1/auth/login', '/api/v1/part/../auth/login',
  ])('recognizes the exact API boundary in %s', url => {
    client.post(url, {}).subscribe();
    const request = http.expectOne(url);
    expect(request.request.headers.get(header)).toBe('1');
    request.flush({});
  });

  it.each([
    '/api/v10/auth/login', '/api/v1-other/auth/login', '/assets/map.json',
    'https://evil.example/api/v1/auth/login', '//evil.example/api/v1/auth/login',
    'https://sub.game.example/api/v1/auth/login', 'http://game.example/api/v1/auth/login',
    'https://game.example:444/api/v1/auth/login', 'https://game.example.evil.example/api/v1/auth/login',
    'https://game.example@evil.example/api/v1/auth/login',
    'https://user:pass@game.example/api/v1/auth/login',
    '/api/v1/../../outside', '/api/v1/%2e%2e/outside', '/api%2fv1/auth/login',
    '/outside?next=/api/v1/auth/login', 'file:///api/v1/auth/login', 'https://[invalid',
  ])('does not attach the marker outside the configured API: %s', url => {
    client.post(url, {}).subscribe();
    const request = http.expectOne(url);
    expect(request.request.headers.has(header)).toBe(false);
    request.flush({});
  });

  it('supports a trailing slash in the configured API root', () => {
    config.apiBaseUrl = '/api/v1/';
    client.post('/api/v1/auth/login', {}).subscribe();
    const request = http.expectOne('/api/v1/auth/login');
    expect(request.request.headers.get(header)).toBe('1');
    request.flush({});
  });

  it('supports only the exact origin of an explicitly configured separate API', () => {
    config.apiBaseUrl = 'https://api.example/api/v1';
    const cases: [string, string | null][] = [
      ['https://api.example/api/v1/auth/login', '1'],
      ['https://other.example/api/v1/auth/login', null],
      ['/api/v1/auth/login', null],
    ];
    for (const [url, expected] of cases) {
      client.post(url, {}).subscribe();
      const request = http.expectOne(url);
      expect(request.request.headers.get(header)).toBe(expected);
      request.flush({});
    }
  });

  it('fails closed when API configuration is not a valid HTTP URL', () => {
    config.apiBaseUrl = 'https://[invalid';
    client.post('/api/v1/auth/login', {}).subscribe();
    const request = http.expectOne('/api/v1/auth/login');
    expect(request.request.headers.has(header)).toBe(false);
    request.flush({});
  });

  it('clones the request, replaces a stale marker, and does not change body or credentials', () => {
    const body = { status: 'completed', currentStep: 0 };
    const original = new HttpRequest('PUT', '/api/v1/me/progress/lesson-01', body, {
      withCredentials: true, headers: new HttpHeaders({ [header]: '0', 'X-Other': 'unchanged' }),
    });
    const next = vi.fn(request => {
      expect(request).not.toBe(original);
      expect(request.body).toBe(body);
      expect(request.withCredentials).toBe(true);
      expect(request.headers.get(header)).toBe('1');
      expect(request.headers.get('X-Other')).toBe('unchanged');
      expect(request.headers.has('Origin')).toBe(false);
      return of(new HttpResponse({ status: 200 }));
    });
    TestBed.runInInjectionContext(() => requestVerificationInterceptor(original, next)).subscribe();
    expect(original.headers.get(header)).toBe('0');
    expect(next).toHaveBeenCalledOnce();
  });
});
