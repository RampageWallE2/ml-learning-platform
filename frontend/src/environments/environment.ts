// Production requires an explicit public ID via --define; otherwise Google is disabled.
// This is not an OAuth client secret. Development retains its existing client.
declare const EXPLORALAB_GOOGLE_CLIENT_ID: string | undefined;

export const environment = {
  production: true,
  auth: {
    apiBaseUrl: '/api/v1',
    googleClientId: typeof EXPLORALAB_GOOGLE_CLIENT_ID !== 'undefined'
      ? EXPLORALAB_GOOGLE_CLIENT_ID
      : '',
  },
} as const;
