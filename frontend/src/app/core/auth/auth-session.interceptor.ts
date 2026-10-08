import { DOCUMENT } from '@angular/common';
import {
  HttpErrorResponse,
  HttpInterceptorFn
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth.service';
import { AUTH_CONFIG } from './auth.config';
import { getApiRequestPath } from './api-request-url';

const PUBLIC_AUTHENTICATION_PATHS = new Set([
  '/auth/google', '/auth/login', '/auth/register'
]);

export const authSessionInterceptor: HttpInterceptorFn = (request, next) => {
  const config = inject(AUTH_CONFIG);
  const document = inject(DOCUMENT);
  const path = getApiRequestPath(request.url, config.apiBaseUrl, document.baseURI);

  // An unrelated server cannot expire this application's session.
  if (path === null || !isProtectedRequest(path, request.method)) {
    return next(request);
  }

  const auth = inject(AuthService);
  const router = inject(Router);
  const sessionVersion = auth.sessionVersion();

  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        auth.sessionVersion() === sessionVersion &&
        auth.isAuthenticated()
      ) {
        const returnUrl = router.url.startsWith('/login')
          ? '/world'
          : router.url;

        auth.markSessionExpired();

        void router.navigate(['/login'], {
          queryParams: {
            reason: 'session-expired',
            returnUrl
          }
        });
      }

      return throwError(() => error);
    })
  );
};

function isProtectedRequest(path: string, method: string): boolean {
  const normalizedPath = path.replace(/\/+$/, '');
  const isPublicAuthentication = PUBLIC_AUTHENTICATION_PATHS.has(normalizedPath);
  const isSessionProbe = method === 'GET' && normalizedPath === '/me';

  return !isPublicAuthentication && !isSessionProbe;
}
