import { signal } from '@angular/core';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AUTH_CONFIG } from '../../../../core/auth/auth.config';
import { AuthService } from '../../../../core/auth/auth.service';
import { API_REQUEST_TIMEOUT_MS } from '../../../../core/http/request-timeout';
import { GoogleCredentialResponse } from '../../../../core/auth/auth.types';
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
  const config = { apiBaseUrl: 'http://api.test/api/v1', googleClientId: 'test-client-id' };
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
    config.googleClientId = 'test-client-id';
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
          useValue: config,
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

  it.each([
    { clientId: '', sdkLoaded: false },
    { clientId: '', sdkLoaded: true },
    { clientId: ' \t\n ', sdkLoaded: false },
    { clientId: ' \t\n ', sdkLoaded: true },
  ])('does not load or initialize the SDK without Google configuration: %j', ({ clientId, sdkLoaded }) => {
    config.googleClientId = clientId;
    if (!sdkLoaded) delete window.google;
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;

    expect(document.querySelector('#google-identity-service')).toBeNull();
    expect(initialize).not.toHaveBeenCalled();
    expect(renderButton).not.toHaveBeenCalled();
    expect(root.querySelector('.google-wrap')).toBeNull();
    expect(root.querySelector('.divider')).toBeNull();
    expect(root.querySelector('form')).not.toBeNull();
    expect(root.querySelector<HTMLFieldSetElement>('fieldset')?.disabled).toBe(false);
    expect(page.googleError()).toBeNull();
    expect(page.busy()).toBe(false);
    expect(auth.loginWithGoogle).not.toHaveBeenCalled();
  });

  it.each(['login', 'register'] as const)(
    'keeps the %s form working without Google configuration', mode => {
      config.googleClientId = '';
      TestBed.inject(ActivatedRoute).snapshot.data = { mode };
      const fixture = TestBed.createComponent(Login);
      fixture.detectChanges();
      const page = fixture.componentInstance;

      if (mode === 'login') {
        page.loginForm.setValue({ email: user.email, password: 'test-only-password' });
        page.loginWithEmail();
        expect(auth.loginWithEmail).toHaveBeenCalledOnce();
      } else {
        page.registrationForm.setValue({ displayName: user.displayName, email: user.email,
          password: 'test-only-password', confirmPassword: 'test-only-password' });
        page.registerWithEmail();
        expect(auth.register).toHaveBeenCalledOnce();
      }

      expect((fixture.nativeElement as HTMLElement).querySelector('.google-wrap')).toBeNull();
      expect(page.busy()).toBe(false);
      expect(router.navigateByUrl).toHaveBeenCalledExactlyOnceWith('/world');
      expect(auth.loginWithGoogle).not.toHaveBeenCalled();
    },
  );

  it('passes a normalized Google client ID to the configured SDK', () => {
    config.googleClientId = '  test-client-id \n';
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();

    expect(initialize).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ client_id: 'test-client-id' }),
    );
    expect(renderButton).toHaveBeenCalledOnce();
    expect((fixture.nativeElement as HTMLElement).querySelector('.google-wrap')).not.toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('.divider')).not.toBeNull();
  });

  it('keeps email available after a configured SDK load failure', () => {
    delete window.google;
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    document.querySelector('#google-identity-service')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Google no está disponible en este momento. Puedes continuar con correo.',
    );
    expect(fixture.componentInstance.busy()).toBe(false);
    fixture.componentInstance.loginForm.setValue({ email: user.email, password: 'test-only-password' });
    fixture.componentInstance.loginWithEmail();
    expect(auth.loginWithEmail).toHaveBeenCalledOnce();
    expect(router.navigateByUrl).toHaveBeenCalledExactlyOnceWith('/world');
  });

  it.each([
    { clientId: '', message: 'Este correo está registrado con Google. Ese acceso no está disponible en este momento.' },
    { clientId: 'test-client-id', message: 'Este correo ya está registrado con Google. Usa el botón de Google para ingresar.' },
  ])('gives usable advice for a Google-only account: %j', ({ clientId, message }) => {
    config.googleClientId = clientId;
    auth.loginWithEmail.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 401, error: { code: 'email_registered_with_google' },
    })));
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    fixture.componentInstance.loginForm.setValue({ email: user.email, password: 'test-only-password' });
    fixture.componentInstance.loginWithEmail();
    fixture.detectChanges();

    expect(fixture.componentInstance.errorMessage()).toBe(message);
    expect(fixture.nativeElement.textContent).toContain(message);
    expect(fixture.componentInstance.busy()).toBe(false);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it.each<GoogleCredentialResponse>([
    { credential: 'late-test-only-credential' },
    {},
  ])('ignores a Google callback after the login is destroyed: %s', response => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const callback = initialize.mock.calls[0][0].callback;
    const page = fixture.componentInstance;

    fixture.destroy();
    callback(response);

    expect(auth.loginWithGoogle).not.toHaveBeenCalled();
    expect(page.errorMessage()).toBeNull();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('accepts the new Google callback without reactivating the previous login', () => {
    const previous = TestBed.createComponent(Login);
    previous.detectChanges();
    const previousCallback = initialize.mock.calls[0][0].callback;
    previous.destroy();

    const current = TestBed.createComponent(Login);
    current.detectChanges();
    const currentCallback = initialize.mock.calls[1][0].callback;
    previousCallback({ credential: 'old-test-only-credential' });
    expect(auth.loginWithGoogle).not.toHaveBeenCalled();

    currentCallback({ credential: 'current-test-only-credential' });
    expect(auth.loginWithGoogle).toHaveBeenCalledExactlyOnceWith('current-test-only-credential');
    expect(router.navigateByUrl).toHaveBeenCalledExactlyOnceWith('/world');
  });

  it('reuses the Google script for a new login without rendering the destroyed view', () => {
    delete window.google;
    const previous = TestBed.createComponent(Login);
    previous.detectChanges();
    const script = document.querySelector<HTMLScriptElement>('#google-identity-service')!;
    previous.destroy();

    const current = TestBed.createComponent(Login);
    current.detectChanges();
    expect(document.querySelectorAll('#google-identity-service')).toHaveLength(1);
    expect(document.querySelector('#google-identity-service')).toBe(script);
    window.google = { accounts: { id: { initialize, renderButton } } };
    script.dispatchEvent(new Event('load'));

    expect(initialize).toHaveBeenCalledOnce();
    expect(renderButton).toHaveBeenCalledExactlyOnceWith(
      (current.nativeElement as HTMLElement).querySelector('.google-button'),
      expect.any(Object),
    );
  });

  it('removes Google error listeners when leaving the login', () => {
    delete window.google;
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const script = document.querySelector<HTMLScriptElement>('#google-identity-service')!;
    const page = fixture.componentInstance;
    fixture.destroy();
    script.dispatchEvent(new Event('error'));

    expect(page.googleError()).toBeNull();
    expect(auth.loginWithGoogle).not.toHaveBeenCalled();
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

describe('Login lifecycle with the real authentication service', () => {
  const root = 'http://api.test/api/v1';
  const account = {
    id: 'lifecycle-user', email: 'student@example.test',
    displayName: 'Test Student', avatarUrl: null,
  };
  const initialize = vi.fn();
  let auth: AuthService;
  let http: HttpTestingController;
  const navigate = vi.fn<Router['navigateByUrl']>(() => Promise.resolve(true));

  beforeEach(async () => {
    initialize.mockClear();
    navigate.mockClear();
    window.google = { accounts: { id: { initialize, renderButton: vi.fn() } } };
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: {
          snapshot: { data: {}, queryParamMap: { get: () => null } },
        } },
        { provide: AUTH_CONFIG, useValue: { apiBaseUrl: root, googleClientId: 'test-client-id' } },
      ],
    }).compileComponents();
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockImplementation(navigate);
  });

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
    delete window.google;
    document.querySelector('#google-identity-service')?.remove();
  });

  function createAnonymousLogin() {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    http.expectOne(`${root}/me`).flush({}, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();
    return fixture;
  }

  function startSignIn(page: Login, method: 'login' | 'register' | 'google'): void {
    switch (method) {
      case 'login':
        page.loginForm.setValue({ email: account.email, password: 'test-only-password' });
        page.loginWithEmail();
        break;
      case 'register':
        page.registrationForm.setValue({ displayName: account.displayName, email: account.email,
          password: 'test-only-password', confirmPassword: 'test-only-password' });
        page.registerWithEmail();
        break;
      case 'google':
        initialize.mock.calls.at(-1)![0].callback({ credential: 'test-only-credential' });
        break;
    }
  }

  it.each(['login', 'register', 'google'] as const)(
    'releases the busy state after a real %s timeout and permits an explicit retry', method => {
      const fixture = createAnonymousLogin();
      vi.useFakeTimers();
      const page = fixture.componentInstance;
      startSignIn(page, method);
      const request = http.expectOne(`${root}/auth/${method}`);
      vi.advanceTimersByTime(API_REQUEST_TIMEOUT_MS - 1);
      expect(page.busy()).toBe(true);
      expect(request.cancelled).toBe(false);
      vi.advanceTimersByTime(1);
      expect(request.cancelled).toBe(true);
      expect(page.busy()).toBe(false);
      expect(page.errorMessage()).toContain('Inténtalo nuevamente.');
      expect(auth.status()).toBe('anonymous');
      expect(navigate).not.toHaveBeenCalled();
      http.expectNone(`${root}/auth/${method}`);

      startSignIn(page, method);
      expect(page.busy()).toBe(true);
      http.expectOne(`${root}/auth/${method}`).flush({ user: account });
      expect(page.busy()).toBe(false);
      expect(auth.isAuthenticated()).toBe(true);
      expect(navigate).toHaveBeenCalledExactlyOnceWith('/world');
    },
  );

  it('releases the session-checking state after a real restoration timeout', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    const request = http.expectOne(`${root}/me`);
    expect(page.checkingSession()).toBe(true);
    vi.advanceTimersByTime(API_REQUEST_TIMEOUT_MS);
    expect(request.cancelled).toBe(true);
    expect(page.checkingSession()).toBe(false);
    expect(page.busy()).toBe(false);
    expect(auth.status()).toBe('unavailable');
    expect(navigate).not.toHaveBeenCalled();
    http.expectNone(`${root}/me`);
  });

  it.each(['login', 'register', 'google'] as const)(
    'cancels a pending %s HTTP request when the login is destroyed', method => {
      const fixture = createAnonymousLogin();
      const page = fixture.componentInstance;
      startSignIn(page, method);
      const request = http.expectOne(`${root}/auth/${method}`);
      expect(request.request.withCredentials).toBe(true);
      expect(page.busy()).toBe(true);

      fixture.destroy();

      expect(request.cancelled).toBe(true);
      expect(page.busy()).toBe(false);
      expect(page.errorMessage()).toBeNull();
      expect(auth.user()).toBeNull();
      expect(auth.status()).toBe('anonymous');
      expect(navigate).not.toHaveBeenCalled();
    },
  );

  it.each(['login', 'register', 'google'] as const)(
    'still establishes the session and redirects after a normal %s response', method => {
      const fixture = createAnonymousLogin();
      startSignIn(fixture.componentInstance, method);
      http.expectOne(`${root}/auth/${method}`).flush({ user: account });

      expect(auth.user()).toEqual(account);
      expect(auth.isAuthenticated()).toBe(true);
      expect(fixture.componentInstance.busy()).toBe(false);
      expect(navigate).toHaveBeenCalledExactlyOnceWith('/world');
    },
  );

  it.each(['login', 'register'] as const)(
    'does not start %s from a handler retained after destruction', method => {
      const fixture = createAnonymousLogin();
      const page = fixture.componentInstance;
      fixture.destroy();
      startSignIn(page, method);

      http.expectNone(`${root}/auth/${method}`);
      expect(navigate).not.toHaveBeenCalled();
    },
  );

  it('keeps a shared session request active for another consumer after the login closes', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const received = vi.fn();
    auth.restoreSession().subscribe(received);
    const request = http.expectOne(`${root}/me`);
    const page = fixture.componentInstance;
    fixture.destroy();

    expect(request.cancelled).toBe(false);
    request.flush({ user: account });

    expect(received).toHaveBeenCalledExactlyOnceWith(true);
    expect(auth.user()).toEqual(account);
    expect(page.checkingSession()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('reuses the pending session request when a new login replaces the previous one', () => {
    const previous = TestBed.createComponent(Login);
    previous.detectChanges();
    const request = http.expectOne(`${root}/me`);
    previous.destroy();

    const current = TestBed.createComponent(Login);
    current.detectChanges();
    http.expectNone(`${root}/me`);
    expect(request.cancelled).toBe(false);
    request.flush({ user: account });

    expect(previous.componentInstance.checkingSession()).toBe(true);
    expect(current.componentInstance.checkingSession()).toBe(false);
    expect(auth.isAuthenticated()).toBe(true);
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/world');
  });

  it('does not redirect the destroyed login when a late session response arrives alone', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const request = http.expectOne(`${root}/me`);
    fixture.destroy();
    request.flush({ user: account });

    expect(auth.isAuthenticated()).toBe(true);
    expect(fixture.componentInstance.checkingSession()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });
});
