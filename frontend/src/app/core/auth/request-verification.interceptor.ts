import { DOCUMENT } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AUTH_CONFIG } from './auth.config';
import { getApiRequestPath } from './api-request-url';

const REQUEST_HEADER = 'X-ExploraLab-Request';
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const requestVerificationInterceptor: HttpInterceptorFn = (request, next) => {
  const config = inject(AUTH_CONFIG);
  const document = inject(DOCUMENT);

  if (
    WRITE_METHODS.has(request.method) &&
    getApiRequestPath(request.url, config.apiBaseUrl, document.baseURI) !== null
  ) {
    // Public marker, not a secret or credential. Never attach it to unrelated URLs.
    return next(request.clone({ setHeaders: { [REQUEST_HEADER]: '1' } }));
  }
  return next(request);
};
