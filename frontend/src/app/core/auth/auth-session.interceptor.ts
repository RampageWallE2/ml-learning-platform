import {
  HttpErrorResponse,
  HttpInterceptorFn
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth.service';

export const authSessionInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        isProtectedRequest(request.url, request.method) &&
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

function isProtectedRequest(url: string, method: string): boolean {
  const isPublicAuthentication = [
    '/auth/google',
    '/auth/login',
    '/auth/register'
  ].some(path => url.endsWith(path));
  const isSessionProbe = method === 'GET' && url.endsWith('/me');

  return !isPublicAuthentication && !isSessionProbe;
}
