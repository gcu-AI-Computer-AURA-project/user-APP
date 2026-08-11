export type AuraServicePermissions = {
  gmail: boolean;
  drive: boolean;
  alarm: boolean;
};

export type AuraUser = {
  id?: string | number;
  email?: string;
  name?: string;
  profileImageUrl?: string;
  permissions?: Partial<AuraServicePermissions>;
  privacyConsentAgreed?: boolean;
};

export type AuthTokens = {
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
};

export type AuthSession = AuthTokens & {
  user?: AuraUser;
};

export type GoogleLoginRequest = {
  googleAccessToken?: string;
  idToken?: string;
  privacyConsentAgreed: boolean;
};

export type ConsentRequest = {
  agreed: boolean;
};

export type PermissionUpdateRequest = Partial<AuraServicePermissions>;

export type ApiRequestOptions = {
  accessToken?: string | null;
  signal?: AbortSignal;
};

