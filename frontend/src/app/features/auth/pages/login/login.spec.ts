import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AUTH_CONFIG } from '../../../../core/auth/auth.config';
import { AuthService } from '../../../../core/auth/auth.service';
import { Login } from './login';

describe('Login', () => {
  const initialize = vi.fn();
  const renderButton = vi.fn();
  const user = {
    id: 'user-id',
    email: 'student@example.com',
    displayName: 'Test Student',
    avatarUrl: null,
  };
  const userState = signal(null);
  const statusState = signal<'anonymous'>('anonymous');
  const auth = {
    user: userState.asReadonly(),
    status: statusState.asReadonly(),
    restoreSession: vi.fn(() => of(false)),
    loginWithGoogle: vi.fn(() => of(user)),
    loginWithEmail: vi.fn(() => of(user)),
    register: vi.fn(() => of(user)),
    logout: vi.fn(() => of(undefined)),
  };
  const router = {
    navigateByUrl: vi.fn(() => Promise.resolve(true)),
  };
  let queryParams: Record<string, string>;

  beforeEach(async () => {
    window.google = {
      accounts: {
        id: {
          initialize,
          renderButton,
        },
      },
    };

    initialize.mockClear();
    renderButton.mockClear();
    auth.restoreSession.mockClear();
    auth.loginWithGoogle.mockClear();
    auth.loginWithEmail.mockClear();
    auth.register.mockClear();
    auth.logout.mockClear();
    router.navigateByUrl.mockClear();
    queryParams = {};

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => queryParams[key] ?? null,
              },
            },
          },
        },
        {
          provide: AuthService,
          useValue: auth,
        },
        {
          provide: AUTH_CONFIG,
          useValue: {
            apiBaseUrl: 'http://api.test/api/v1',
            googleClientId: 'test-client-id',
          },
        },
      ],
    }).compileComponents();
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockImplementation(router.navigateByUrl);
  });

  afterEach(() => {
    delete window.google;
    document.querySelector('#google-identity-service')?.remove();
  });

  it('renders the official Google button', async () => {
    const fixture = TestBed.createComponent(Login);

    fixture.detectChanges();
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('app-site-header')).not.toBeNull();
    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: 'test-client-id',
      }),
    );
    expect(renderButton).toHaveBeenCalledOnce();
  });

  it('loads Google Identity only when the authentication page needs it', () => {
    delete window.google;
    const fixture = TestBed.createComponent(Login);

    fixture.detectChanges();

    const script = document.querySelector<HTMLScriptElement>('#google-identity-service');
    expect(script).not.toBeNull();
    expect(script?.src).toBe('https://accounts.google.com/gsi/client?hl=es');
    expect(script?.async).toBe(true);
  });

  it('shows confirmation after a successful logout', () => {
    queryParams = { loggedOut: 'true' };
    const fixture = TestBed.createComponent(Login);

    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Sesión cerrada correctamente.',
    );
  });

  it('explains when the session expired', () => {
    queryParams = { reason: 'session-expired' };
    const fixture = TestBed.createComponent(Login);

    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Tu sesión expiró. Inicia sesión nuevamente.',
    );
  });

  it('logs in with email and password', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    fixture.componentInstance.loginForm.setValue({
      email: 'student@example.com',
      password: 'secure-password',
    });

    fixture.componentInstance.loginWithEmail();

    expect(auth.loginWithEmail).toHaveBeenCalledWith({
      email: 'student@example.com',
      password: 'secure-password',
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/world');
  });

  it('registers a new password account', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    fixture.componentInstance.registrationForm.setValue({
      displayName: 'Test Student',
      email: 'student@example.com',
      password: 'secure-password',
      confirmPassword: 'secure-password',
    });

    fixture.componentInstance.registerWithEmail();

    expect(auth.register).toHaveBeenCalledWith({
      displayName: 'Test Student',
      email: 'student@example.com',
      password: 'secure-password',
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/world');
  });

  it('rejects registration when passwords do not match', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    fixture.componentInstance.registrationForm.setValue({
      displayName: 'Test Student',
      email: 'student@example.com',
      password: 'secure-password',
      confirmPassword: 'different-password',
    });

    fixture.componentInstance.registerWithEmail();

    expect(auth.register).not.toHaveBeenCalled();
    expect(fixture.componentInstance.errorMessage()).toBe('Las contraseñas no coinciden.');
  });

  it('allows registration after correcting the original password', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    page.registrationForm.setValue({
      displayName: 'Test Student',
      email: 'student@example.com',
      password: 'wrong-password',
      confirmPassword: 'secure-password',
    });
    page.registerWithEmail();
    expect(auth.register).not.toHaveBeenCalled();
    page.registrationForm.controls.password.setValue('secure-password');
    page.registerWithEmail();
    expect(auth.register).toHaveBeenCalledOnce();
  });

  it('blocks email submission during Google authentication', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    fixture.componentInstance.loginForm.setValue({
      email: 'student@example.com',
      password: 'secure-password',
    });
    fixture.componentInstance.signingIn.set(true);
    fixture.componentInstance.loginWithEmail();
    expect(auth.loginWithEmail).not.toHaveBeenCalled();
  });

  it('opens registration directly from the register route', () => {
    TestBed.inject(ActivatedRoute).snapshot.data = { mode: 'register' };
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    expect(fixture.componentInstance.mode()).toBe('register');
    expect(fixture.nativeElement.querySelector('#register-name')).not.toBeNull();
  });

  it('does not redirect back into authentication after login', () => {
    queryParams = { returnUrl: '/login' };
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    fixture.componentInstance.loginForm.setValue({
      email: 'student@example.com',
      password: 'secure-password',
    });
    fixture.componentInstance.loginWithEmail();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/world');
  });

  it('returns to progress after authentication when requested by the guard', () => {
    queryParams = { returnUrl: '/progress' };
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    fixture.componentInstance.loginForm.setValue({
      email: 'student@example.com',
      password: 'secure-password',
    });

    fixture.componentInstance.loginWithEmail();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/progress');
  });

  it('rejects an external return URL after authentication', () => {
    queryParams = { returnUrl: 'https://example.com/progress' };
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    fixture.componentInstance.loginForm.setValue({
      email: 'student@example.com',
      password: 'secure-password',
    });

    fixture.componentInstance.loginWithEmail();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/world');
  });
});
