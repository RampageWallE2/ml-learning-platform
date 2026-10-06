import { DOCUMENT } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AUTH_CONFIG } from './auth.config';

const REQUEST_HEADER = 'X-ExploraLab-Request';
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const requestVerificationInterceptor: HttpInterceptorFn = (request, next) => {
  const config = inject(AUTH_CONFIG);
  const document = inject(DOCUMENT);

  if (
    WRITE_METHODS.has(request.method) &&
    isApiRequest(request.url, config.apiBaseUrl, document.baseURI)
  ) {
    // Public marker, not a secret or credential. Never attach it to unrelated URLs.
    return next(request.clone({ setHeaders: { [REQUEST_HEADER]: '1' } }));
  }
  return next(request);
};

function isApiRequest(url: string, apiBaseUrl: string, baseUri: string): boolean {
  try {
    const api = new URL(apiBaseUrl, baseUri);
    const target = new URL(url, baseUri);
    const path = api.pathname.replace(/\/+$/, '');
    return (
      (api.protocol === 'http:' || api.protocol === 'https:') &&
      !api.username && !api.password && !target.username && !target.password &&
      target.origin === api.origin &&
      (target.pathname === path || target.pathname.startsWith(`${path}/`))
    );
  } catch {
    return false;
  }
}
