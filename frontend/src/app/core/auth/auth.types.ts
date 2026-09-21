export type AuthenticatedUser = Readonly<{
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}>;

export type AuthResponse = Readonly<{
  user: AuthenticatedUser;
}>;

export type EmailLoginCredentials = Readonly<{
  email: string;
  password: string;
}>;

export type RegistrationCredentials = Readonly<{
  displayName: string;
  email: string;
  password: string;
}>;

export type AuthApiError = Readonly<{
  error?: string;
  code?: string;
}>;

export type AuthSessionStatus =
  | 'unknown'
  | 'checking'
  | 'authenticated'
  | 'anonymous';

export type GoogleCredentialResponse = Readonly<{
  credential?: string;
  select_by?: string;
}>;

type GoogleButtonConfiguration = Readonly<{
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'small' | 'medium' | 'large';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number;
  locale?: string;
}>;

type GoogleIdentityApi = Readonly<{
  initialize: (configuration: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    configuration: GoogleButtonConfiguration
  ) => void;
}>;

declare global {
  interface Window {
    google?: Readonly<{
      accounts: Readonly<{
        id: GoogleIdentityApi;
      }>;
    }>;
  }
}
