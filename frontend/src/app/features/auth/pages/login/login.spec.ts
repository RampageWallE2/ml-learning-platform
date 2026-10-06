import { signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

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
    auth.loginWithEmail.mockReturnValue(of(user));
    auth.register.mockReturnValue(of(user));
    auth.loginWithGoogle.mockReturnValue(of(user));
    delete window.google;
    document.querySelector('#google-identity-service')?.remove();
  });

  it.each([
    [413, { code: 'request_too_large' }, 'El envío es demasiado grande. Revisa los datos e inténtalo nuevamente.'],
    [413, null, 'El envío es demasiado grande. Revisa los datos e inténtalo nuevamente.'],
    [413, '<html>Request too large</html>', 'El envío es demasiado grande. Revisa los datos e inténtalo nuevamente.'],
    [429, { code: 'too_many_login_attempts', retryAfterSeconds: 300 }, 'Has intentado ingresar varias veces. Espera un momento y vuelve a intentarlo.'],
    [429, null, 'Has intentado ingresar varias veces. Espera un momento y vuelve a intentarlo.'],
    [503, { code: 'login_protection_unavailable' }, 'No pudimos comprobar el acceso. Inténtalo nuevamente en un momento.'],
  ])('shows a simple message for HTTP %s without losing the form or redirecting', (status, error, message) => {
    auth.loginWithEmail.mockReturnValue(throwError(() => new HttpErrorResponse({ status: status as number, error })));
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const values = { email: 'student@example.com', password: 'test-only-password' };
    fixture.componentInstance.loginForm.setValue(values);
    fixture.componentInstance.loginWithEmail();
    fixture.detectChanges();
    expect(fixture.componentInstance.errorMessage()).toBe(message);
    expect(fixture.nativeElement.textContent).toContain(message);
    expect(fixture.componentInstance.loginForm.getRawValue()).toEqual(values);
    expect(fixture.componentInstance.submittingCredentials()).toBe(false);
    expect(fixture.componentInstance.busy()).toBe(false);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
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
    expect(renderButton).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        type: 'standard',
        theme: 'outline',
        text: 'continue_with',
        locale: 'es',
      }),
    );
  });

  it.each([{ code: 'request_too_large' }, '<html>Request too large</html>'])('preserves registration fields when its body is refused with 413: %s', error => {
    TestBed.inject(ActivatedRoute).snapshot.data = { mode: 'register' };
    auth.register.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 413, error })));
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    const values = { displayName: 'Test Student', email: 'student@example.test',
      password: 'test-only-password', confirmPassword: 'test-only-password' };
    page.registrationForm.setValue(values);
    page.registerWithEmail();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('El envío es demasiado grande. Revisa los datos e inténtalo nuevamente.');
    expect(page.registrationForm.getRawValue()).toEqual(values);
    expect(page.busy()).toBe(false);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it.each([{ code: 'request_too_large' }, null])('explains 413 during Google sign-in without redirecting: %s', error => {
    auth.loginWithGoogle.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 413, error })));
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const callback = initialize.mock.calls[0][0].callback;
    callback({ credential: 'fake-test-only' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No se pudo enviar el acceso con Google: el envío es demasiado grande. Inténtalo nuevamente.');
    expect(fixture.componentInstance.busy()).toBe(false);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it.each([
    { mode: 'login', title: 'Iniciar sesión' },
    { mode: 'register', title: 'Crear cuenta' },
  ])('shows a clear title and shared primary action for $mode', ({ mode, title }) => {
    TestBed.inject(ActivatedRoute).snapshot.data = { mode };
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const submit = root.querySelector<HTMLButtonElement>('button[type="submit"]')!;

    expect(root.querySelector('#auth-title')?.textContent?.trim()).toBe(title);
    expect(root.querySelector('.auth-card')?.getAttribute('aria-labelledby')).toBe('auth-title');
    expect(submit.classList.contains('btn')).toBe(true);
    expect(submit.classList.contains('btn--brand')).toBe(true);
    expect(submit.classList.contains('btn--primary')).toBe(false);
  });

  it.each(['login', 'register'])('keeps the same editorial shell and real image for %s', (mode) => {
    TestBed.inject(ActivatedRoute).snapshot.data = { mode };
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const story = root.querySelector<HTMLElement>('.auth-story')!;
    const image = story.querySelector<HTMLImageElement>('img')!;
    const source = story.querySelector<HTMLSourceElement>('source')!;

    expect(root.querySelectorAll('h1')).toHaveLength(1);
    expect(story.querySelector('.story-brand')?.textContent).toBe('ExploraLab');
    expect(story.getAttribute('aria-label')).toContain('aprender con datos');
    expect(story.textContent).toContain('Explora escenarios');
    expect(story.querySelector('figcaption')?.textContent).toContain(
      'Primera experiencia disponible',
    );
    expect(image.getAttribute('src')).toBe('assets/branding/exploralab-open-pit-map.png');
    expect(image.alt).toContain('Vista real de Open Pit');
    expect(image.width).toBe(1536);
    expect(image.height).toBe(768);
    expect(image.getAttribute('loading')).toBe('eager');
    expect(source.type).toBe('image/webp');
    expect(source.srcset).toContain('exploralab-open-pit-map-640.webp');
    expect(source.srcset).toContain('exploralab-open-pit-map-960.webp');
    expect(source.srcset).toContain('exploralab-open-pit-map-1536.webp');
    expect(root.querySelector('.intro')?.textContent).toContain('tu progreso');
  });

  it('provides a keyboard shortcut to the form', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('.skip')?.getAttribute('href')).toBe('#auth-content');
    expect(root.querySelector('main')?.id).toBe('auth-content');
    expect(root.querySelector('main')?.getAttribute('tabindex')).toBe('-1');
    const main = root.querySelector('main')!;
    const focus = vi.spyOn(main, 'focus');
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    root.querySelector('.skip')!.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(focus).toHaveBeenCalledOnce();
  });

  it.each([
    { mode: 'login', destination: '/register' },
    { mode: 'register', destination: '/login' },
  ])('preserves the progress destination when leaving $mode', ({ mode, destination }) => {
    queryParams = { returnUrl: '/progress' };
    TestBed.inject(ActivatedRoute).snapshot.data = { mode };
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      '.switch a',
    )!;

    expect(link.getAttribute('href')).toBe(`${destination}?returnUrl=%2Fprogress`);
  });

  it('keeps registration validation connected to each field', () => {
    TestBed.inject(ActivatedRoute).snapshot.data = { mode: 'register' };
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    root
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    for (const id of [
      'register-name',
      'register-email',
      'register-password',
      'register-confirm-password',
    ]) {
      const input = root.querySelector<HTMLInputElement>(`#${id}`)!;
      expect(input.getAttribute('aria-invalid')).toBe('true');
      const descriptions = input.getAttribute('aria-describedby')!.split(' ');
      expect(descriptions.every((description) => root.querySelector(`#${description}`))).toBe(true);
    }
    expect(root.querySelector('#name-error')?.textContent).toContain('Ingresa un nombre');
    expect(root.querySelector('#register-email-error')?.textContent).toContain(
      'correo electrónico válido',
    );
    expect(root.querySelector('#password-error')?.textContent).toContain('al menos 8 caracteres');
    expect(root.querySelector('#confirm-error')?.textContent).toContain('deben coincidir');
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('shows and hides the login password through its labelled control', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const password = root.querySelector<HTMLInputElement>('#login-password')!;
    const toggle = root.querySelector<HTMLButtonElement>('button[aria-controls="login-password"]')!;

    expect(password.type).toBe('password');
    expect(toggle.getAttribute('aria-label')).toBe('Mostrar contraseña');
    toggle.click();
    fixture.detectChanges();
    expect(password.type).toBe('text');
    expect(toggle.getAttribute('aria-label')).toBe('Ocultar contraseña');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    toggle.click();
    fixture.detectChanges();
    expect(password.type).toBe('password');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(auth.loginWithEmail).not.toHaveBeenCalled();
  });

  it('keeps the visibility control connected to both registration passwords', () => {
    TestBed.inject(ActivatedRoute).snapshot.data = { mode: 'register' };
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const toggle = root.querySelector<HTMLButtonElement>(
      'button[aria-controls="register-password register-confirm-password"]',
    )!;
    const passwords = [
      root.querySelector<HTMLInputElement>('#register-password')!,
      root.querySelector<HTMLInputElement>('#register-confirm-password')!,
    ];

    expect(toggle.getAttribute('aria-label')).toBe('Mostrar contraseñas');
    toggle.click();
    fixture.detectChanges();
    expect(passwords.every((input) => input.type === 'text')).toBe(true);
    expect(toggle.getAttribute('aria-label')).toBe('Ocultar contraseñas');
    toggle.click();
    fixture.detectChanges();
    expect(passwords.every((input) => input.type === 'password')).toBe(true);
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('still displays field errors without sending an empty login form', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    root
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(root.querySelector('#login-email')?.getAttribute('aria-invalid')).toBe('true');
    expect(root.querySelector('#login-email-error')?.textContent).toContain('Ingresa un correo');
    expect(root.querySelector('#login-password-error')?.textContent).toContain(
      'Ingresa tu contraseña',
    );
    expect(auth.loginWithEmail).not.toHaveBeenCalled();
  });

  it('preserves the pending state and disabled controls', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    fixture.componentInstance.submittingCredentials.set(true);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('.auth-card')?.getAttribute('aria-busy')).toBe('true');
    expect(root.querySelector<HTMLFieldSetElement>('fieldset')?.disabled).toBe(true);
    expect(root.querySelector('button[type="submit"]')?.textContent).toContain('Ingresando…');
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
