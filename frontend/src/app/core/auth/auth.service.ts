import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import {
  Observable,
  EMPTY,
  catchError,
  defer,
  filter,
  finalize,
  map,
  of,
  shareReplay,
  tap,
  throwError,
  timeout
} from 'rxjs';

import { AUTH_CONFIG } from './auth.config';
import { API_REQUEST_TIMEOUT_MS } from '../http/request-timeout';
import {
  AuthenticatedUser,
  AuthResponse,
  AuthSessionStatus,
  EmailLoginCredentials,
  RegistrationCredentials
} from './auth.types';
import { clearWorldSession } from '../world-session/world-session.storage';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(AUTH_CONFIG);

  private readonly userState = signal<AuthenticatedUser | null>(null);
  private readonly statusState = signal<AuthSessionStatus>('unknown');
  private readonly sessionVersionState = signal(0);
  private restoreRequest?: Observable<boolean>;

  readonly user = this.userState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly sessionVersion = this.sessionVersionState.asReadonly();
  readonly isAuthenticated = computed(
    () => this.statusState() === 'authenticated'
  );

  restoreSession(): Observable<boolean> {
    // Check at subscription time, including when a caller reuses this observable.
    return defer(() => this.restoreCurrentSession());
  }

  private restoreCurrentSession(): Observable<boolean> {
    if (this.statusState() === 'authenticated') {
      return of(true);
    }

    if (this.statusState() === 'anonymous') {
      return of(false);
    }

    if (this.restoreRequest) {
      return this.restoreRequest;
    }

    this.statusState.set('checking');

    const request = this.forCurrentSession(
      this.http.get<AuthResponse>(
        `${this.config.apiBaseUrl}/me`,
        { withCredentials: true }
      )
    ).pipe(
      tap(({ user }) => this.setAuthenticated(user)),
      map(() => true),
      catchError((error: unknown) => {
        if (
          error instanceof HttpErrorResponse &&
          (error.status === 401 || error.status === 403)
        ) {
          this.setAnonymous();
        } else {
          /*
           * Una caída temporal del backend no equivale a cerrar la sesión.
           * El estado "unavailable" permite que una navegación posterior reintente
           * la comprobación en lugar de memorizar un falso usuario anónimo.
           */
          this.statusState.set('unavailable');
        }

        return of(false);
      }),
      finalize(() => {
        if (this.restoreRequest === request) {
          this.restoreRequest = undefined;
        }
      }),
      shareReplay({
        bufferSize: 1,
        refCount: false
      })
    );

    this.restoreRequest = request;
    return request;
  }

  loginWithGoogle(credential: string): Observable<AuthenticatedUser> {
    return this.forCurrentSession(this.http.post<AuthResponse>(
      `${this.config.apiBaseUrl}/auth/google`,
      { credential },
      { withCredentials: true }
    )).pipe(
      tap({
        next: ({ user }) => this.setAuthenticated(user),
        error: (error: unknown) => {
          if (
            error instanceof HttpErrorResponse &&
            error.status === 401
          ) {
            this.setAnonymous();
          }
        }
      }),
      map(({ user }) => user)
    );
  }

  loginWithEmail(
    credentials: EmailLoginCredentials
  ): Observable<AuthenticatedUser> {
    return this.forCurrentSession(this.http.post<AuthResponse>(
      `${this.config.apiBaseUrl}/auth/login`,
      credentials,
      { withCredentials: true }
    )).pipe(
      tap(({ user }) => this.setAuthenticated(user)),
      map(({ user }) => user)
    );
  }

  register(
    credentials: RegistrationCredentials
  ): Observable<AuthenticatedUser> {
    return this.forCurrentSession(this.http.post<AuthResponse>(
      `${this.config.apiBaseUrl}/auth/register`,
      credentials,
      { withCredentials: true }
    )).pipe(
      tap(({ user }) => this.setAuthenticated(user)),
      map(({ user }) => user)
    );
  }

  logout(): Observable<void> {
    return this.forCurrentSession(this.http.post<unknown>(
      `${this.config.apiBaseUrl}/auth/logout`,
      {},
      { withCredentials: true }
    )).pipe(
      map(() => undefined),
      tap(() => this.setAnonymous())
    );
  }

  markSessionExpired(): void {
    this.setAnonymous();
  }

  private forCurrentSession<T>(request: Observable<T>): Observable<T> {
    return defer(() => {
      // Capture when HTTP starts, not when its observable is created. Stale
      // authentication replies complete silently instead of triggering UI callbacks.
      const version = this.sessionVersion();
      return request.pipe(
        timeout({ first: API_REQUEST_TIMEOUT_MS }),
        filter(() => this.sessionVersion() === version),
        catchError((error: unknown) => this.sessionVersion() === version
          ? throwError(() => error)
          : EMPTY),
      );
    });
  }

  private advanceSessionVersion(): void {
    this.sessionVersionState.update(version => version + 1);
    this.restoreRequest = undefined;
  }

  private setAuthenticated(user: AuthenticatedUser): void {
    this.advanceSessionVersion();
    this.userState.set(user);
    this.statusState.set('authenticated');
  }

  private setAnonymous(): void {
    this.advanceSessionVersion();
    clearWorldSession();
    this.userState.set(null);
    this.statusState.set('anonymous');
  }
}
