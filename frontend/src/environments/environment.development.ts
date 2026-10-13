// Enable Google only when explicitly configured, just like production.
declare const EXPLORALAB_GOOGLE_CLIENT_ID: string | undefined;

export const environment = {
  production: false,
  auth: {
    apiBaseUrl: '/api/v1',
    googleClientId: typeof EXPLORALAB_GOOGLE_CLIENT_ID !== 'undefined'
      ? EXPLORALAB_GOOGLE_CLIENT_ID
      : '',
  },
} as const;
