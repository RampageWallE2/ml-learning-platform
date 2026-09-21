import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import {
  Observable,
  catchError,
  defer,
  finalize,
  map,
  of,
  shareReplay,
  tap
} from 'rxjs';

import { AUTH_CONFIG } from './auth.config';
import {
  AuthenticatedUser,
  AuthResponse,
  AuthSessionStatus,
  EmailLoginCredentials,
  RegistrationCredentials
} from './auth.types';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(AUTH_CONFIG);

  private readonly userState = signal<AuthenticatedUser | null>(null);
  private readonly statusState = signal<AuthSessionStatus>('unknown');
  private restoreRequest?: Observable<boolean>;

  readonly user = this.userState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly isAuthenticated = computed(
    () => this.statusState() === 'authenticated'
  );

  restoreSession(): Observable<boolean> {
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

    const request = defer(() =>
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
        this.restoreRequest = undefined;
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
    return this.http.post<AuthResponse>(
      `${this.config.apiBaseUrl}/auth/google`,
      { credential },
      { withCredentials: true }
    ).pipe(
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
    return this.http.post<AuthResponse>(
      `${this.config.apiBaseUrl}/auth/login`,
      credentials,
      { withCredentials: true }
    ).pipe(
      tap(({ user }) => this.setAuthenticated(user)),
      map(({ user }) => user)
    );
  }

  register(
    credentials: RegistrationCredentials
  ): Observable<AuthenticatedUser> {
    return this.http.post<AuthResponse>(
      `${this.config.apiBaseUrl}/auth/register`,
      credentials,
      { withCredentials: true }
    ).pipe(
      tap(({ user }) => this.setAuthenticated(user)),
      map(({ user }) => user)
    );
  }

  logout(): Observable<void> {
    return this.http.post<unknown>(
      `${this.config.apiBaseUrl}/auth/logout`,
      {},
      { withCredentials: true }
    ).pipe(
      map(() => undefined),
      tap(() => this.setAnonymous())
    );
  }

  markSessionExpired(): void {
    this.setAnonymous();
  }

  private setAuthenticated(user: AuthenticatedUser): void {
    this.userState.set(user);
    this.statusState.set('authenticated');
  }

  private setAnonymous(): void {
    this.userState.set(null);
    this.statusState.set('anonymous');
  }
}
