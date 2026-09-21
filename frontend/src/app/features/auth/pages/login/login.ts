import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, AbstractControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AUTH_CONFIG } from '../../../../core/auth/auth.config';
import { AuthService } from '../../../../core/auth/auth.service';
import { AuthApiError, GoogleCredentialResponse } from '../../../../core/auth/auth.types';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('googleButton')
  private googleButton?: ElementRef<HTMLDivElement>;

  private readonly auth = inject(AuthService);
  private readonly config = inject(AUTH_CONFIG);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);

  private googleScript?: HTMLScriptElement;

  readonly checkingSession = signal(true);
  readonly signingIn = signal(false);
  readonly submittingCredentials = signal(false);
  readonly mode = signal<'login' | 'register'>('login');
  readonly noticeMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly googleError = signal<string | null>(null);
  readonly showPassword = signal(false);
  get returnDestination(): string {
    return this.getSafeReturnUrl();
  }

  busy(): boolean {
    return this.checkingSession() || this.signingIn() || this.submittingCredentials();
  }

  readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
  });

  readonly registrationForm = this.formBuilder.nonNullable.group(
    {
      displayName: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(200)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
      confirmPassword: ['', Validators.required],
    },
    {
      validators: (group: AbstractControl) =>
        group.get('password')?.value === group.get('confirmPassword')?.value
          ? null
          : { passwordMismatch: true },
    },
  );

  private readonly handleGoogleScriptLoad = (): void => {
    this.renderGoogleButton();
  };

  private readonly handleGoogleScriptError = (): void => {
    this.googleError.set('Google no está disponible en este momento. Puedes continuar con correo.');
  };

  ngOnInit(): void {
    this.mode.set(this.route.snapshot.data?.['mode'] === 'register' ? 'register' : 'login');
    this.setNavigationNotice();

    this.auth.restoreSession().subscribe({
      next: (isAuthenticated) => {
        this.checkingSession.set(false);

        if (isAuthenticated) {
          void this.navigateAfterLogin();
        }
      },
    });
  }

  private setNavigationNotice(): void {
    if (this.route.snapshot.queryParamMap.get('loggedOut') === 'true') {
      this.noticeMessage.set('Sesión cerrada correctamente.');
      return;
    }

    if (this.route.snapshot.queryParamMap.get('reason') === 'session-expired') {
      this.noticeMessage.set('Tu sesión expiró. Inicia sesión nuevamente.');
    }
  }

  ngAfterViewInit(): void {
    if (window.google) {
      this.renderGoogleButton();
      return;
    }

    this.googleScript =
      document.querySelector<HTMLScriptElement>('#google-identity-service') ?? undefined;

    if (!this.googleScript) {
      this.handleGoogleScriptError();
      return;
    }

    this.googleScript.addEventListener('load', this.handleGoogleScriptLoad, { once: true });
    this.googleScript.addEventListener('error', this.handleGoogleScriptError, { once: true });
  }

  ngOnDestroy(): void {
    this.googleScript?.removeEventListener('load', this.handleGoogleScriptLoad);
    this.googleScript?.removeEventListener('error', this.handleGoogleScriptError);
  }

  loginWithEmail(): void {
    if (this.busy()) return;
    this.loginForm.controls.email.setValue(this.loginForm.controls.email.value.trim());
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.submittingCredentials.set(true);
    this.errorMessage.set(null);

    this.auth
      .loginWithEmail(this.loginForm.getRawValue())
      .pipe(finalize(() => this.submittingCredentials.set(false)))
      .subscribe({
        next: () => void this.navigateAfterLogin(),
        error: (error: unknown) => {
          this.errorMessage.set(this.getEmailAuthErrorMessage(error));
        },
      });
  }

  registerWithEmail(): void {
    if (this.busy()) return;
    this.registrationForm.controls.email.setValue(
      this.registrationForm.controls.email.value.trim(),
    );
    if (this.registrationForm.invalid) {
      this.registrationForm.markAllAsTouched();
      this.errorMessage.set(
        this.registrationForm.hasError('passwordMismatch') ? 'Las contraseñas no coinciden.' : null,
      );
      return;
    }

    const { confirmPassword, ...credentials } = this.registrationForm.getRawValue();

    this.submittingCredentials.set(true);
    this.errorMessage.set(null);

    this.auth
      .register(credentials)
      .pipe(finalize(() => this.submittingCredentials.set(false)))
      .subscribe({
        next: () => void this.navigateAfterLogin(),
        error: (error: unknown) => {
          this.errorMessage.set(this.getEmailAuthErrorMessage(error));
        },
      });
  }

  private renderGoogleButton(): void {
    const button = this.googleButton?.nativeElement;
    const googleIdentity = window.google?.accounts.id;

    if (!button || !googleIdentity) {
      this.handleGoogleScriptError();
      return;
    }

    button.replaceChildren();

    googleIdentity.initialize({
      client_id: this.config.googleClientId,
      callback: (response) => {
        this.zone.run(() => this.handleGoogleCredential(response));
      },
    });

    googleIdentity.renderButton(button, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: Math.max(200, Math.min(320, button.parentElement?.clientWidth || 320)),
      locale: 'es',
    });
  }

  private handleGoogleCredential(response: GoogleCredentialResponse): void {
    if (this.busy()) return;
    if (!response.credential) {
      this.errorMessage.set('Google no entregó una credencial válida. Inténtalo nuevamente.');
      return;
    }

    this.signingIn.set(true);
    this.errorMessage.set(null);

    this.auth
      .loginWithGoogle(response.credential)
      .pipe(finalize(() => this.signingIn.set(false)))
      .subscribe({
        next: () => {
          void this.navigateAfterLogin();
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getLoginErrorMessage(error));
        },
      });
  }

  private navigateAfterLogin(): Promise<boolean> {
    return this.router.navigateByUrl(this.getSafeReturnUrl());
  }

  private getSafeReturnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

    return returnUrl && /^\/world(?:[/?#]|$)/.test(returnUrl) && !returnUrl.includes('\\')
      ? returnUrl
      : '/world';
  }

  private getLoginErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'No se pudo iniciar sesión. Inténtalo nuevamente.';
    }

    const response = error.error as AuthApiError | null;

    if (error.status === 409 && response?.code === 'account_exists_with_different_sign_in') {
      return 'Ya existe una cuenta con este correo y otro método de acceso.';
    }

    switch (error.status) {
      case 0:
        return 'No pudimos conectar. Revisa tu conexión y vuelve a intentarlo.';
      case 400:
        return 'Google no entregó una credencial válida. Inténtalo nuevamente.';
      case 401:
        return 'Google no pudo validar tu identidad. Inténtalo nuevamente.';
      case 409:
        return 'Este correo ya está asociado a otra cuenta.';
      case 503:
        return 'El acceso con Google no está configurado en el servidor.';
      default:
        return 'No se pudo iniciar sesión. Inténtalo nuevamente.';
    }
  }

  private getEmailAuthErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'No se pudo completar la autenticación. Inténtalo nuevamente.';
    }

    const response = error.error as AuthApiError | null;

    switch (response?.code) {
      case 'invalid_credentials':
        return 'El correo o la contraseña son incorrectos.';
      case 'email_registered_with_google':
        return 'Este correo ya está registrado con Google. Usa el botón de Google para ingresar.';
      case 'email_already_registered':
        return 'Ya existe una cuenta con este correo. Inicia sesión en lugar de registrarte.';
      case 'invalid_registration_data':
        return 'Revisa el nombre, el correo y la contraseña ingresados.';
    }

    if (error.status === 0) {
      return 'No pudimos conectar. Revisa tu conexión y vuelve a intentarlo.';
    }

    return 'No se pudo completar la autenticación. Inténtalo nuevamente.';
  }
}
