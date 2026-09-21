import { InjectionToken } from '@angular/core';

import { environment } from '../../../environments/environment';

export type AuthConfig = Readonly<{
  apiBaseUrl: string;
  googleClientId: string;
}>;

export const AUTH_CONFIG = new InjectionToken<AuthConfig>(
  'AUTH_CONFIG',
  {
    providedIn: 'root',
    factory: () => environment.auth
  }
);
