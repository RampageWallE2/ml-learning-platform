import { InjectionToken } from '@angular/core';

export type AuthConfig = Readonly<{
  apiBaseUrl: string;
  googleClientId: string;
}>;

export const AUTH_CONFIG = new InjectionToken<AuthConfig>(
  'AUTH_CONFIG',
  {
    providedIn: 'root',
    factory: () => ({
      apiBaseUrl: 'http://localhost:5000/api/v1',
      googleClientId:
        '720160942108-v6mdi2v6jspjd97ad2nb8lop20cu8ai1.apps.googleusercontent.com'
    })
  }
);
