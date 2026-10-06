import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  provideHttpClient,
  withInterceptors
} from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { authSessionInterceptor } from './core/auth/auth-session.interceptor';
import { requestVerificationInterceptor } from './core/auth/request-verification.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(
      withInterceptors([
        requestVerificationInterceptor,
        authSessionInterceptor
      ])
    ),
    provideRouter(routes)
  ]
};
