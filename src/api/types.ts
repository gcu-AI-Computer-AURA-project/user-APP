export type AuraPlatform = 'IOS' | 'ANDROID' | 'WEB';

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
  accountStatus?: 'ACTIVE' | 'DISCONNECTED' | 'WITHDRAWN';
  lastLoginAt?: string;
  createdAt?: string;
  permissions?: Partial<AuraServicePermissions>;
  privacyConsentAgreed?: boolean;
};

export type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  message?: string;
};

export type SwaggerUserResponse = {
  user_id?: number;
  email?: string;
  display_name?: string;
  profile_image_url?: string;
  account_status?: 'ACTIVE' | 'DISCONNECTED' | 'WITHDRAWN';
  last_login_at?: string;
  created_at?: string;
};

export type SwaggerGoogleLoginResponse = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  is_new_user?: boolean;
  next_step?: 'CONSENT_REQUIRED' | 'SCAN_SETUP_REQUIRED' | 'COMPLETED';
  is_initial_scan_setup_required?: boolean;
  user?: SwaggerUserResponse;
};

export type SwaggerTokenRefreshResponse = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
};

export type AuthTokens = {
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
};

export type AuthSession = AuthTokens & {
  isNewUser?: boolean;
  nextStep?: 'CONSENT_REQUIRED' | 'SCAN_SETUP_REQUIRED' | 'COMPLETED';
  isInitialScanSetupRequired?: boolean;
  user?: AuraUser;
};

export type GoogleLoginRequest = {
  authorization_code?: string;
  redirect_uri?: string;
  server_auth_code?: string;
  platform: AuraPlatform;
};

export type TokenRefreshRequest = {
  refresh_token: string;
};

export type SwaggerUserConsent = {
  is_privacy_agreed?: boolean;
  is_ai_analysis_agreed?: boolean;
  is_metadata_only_agreed?: boolean;
  is_user_approval_required_agreed?: boolean;
  consent_version?: string;
  consented_at?: string;
};

export type UserConsentRequest = {
  is_privacy_agreed: boolean;
  is_ai_analysis_agreed: boolean;
  is_metadata_only_agreed: boolean;
  is_user_approval_required_agreed: boolean;
  consent_version: string;
};

export type UserConsent = {
  privacyAgreed: boolean;
  aiAnalysisAgreed: boolean;
  metadataOnlyAgreed: boolean;
  userApprovalRequiredAgreed: boolean;
  consentVersion?: string;
  consentedAt?: string;
};

export type UserConsentSaveResponse = {
  consent_id?: number;
  consented_at?: string;
};

export type ApiRequestOptions = {
  accessToken?: string | null;
  signal?: AbortSignal;
};

export const normalizeUser = (user?: SwaggerUserResponse | null): AuraUser | undefined => {
  if (!user) return undefined;

  return {
    id: user.user_id,
    email: user.email,
    name: user.display_name,
    profileImageUrl: user.profile_image_url,
    accountStatus: user.account_status,
    lastLoginAt: user.last_login_at,
    createdAt: user.created_at,
  };
};

export const normalizeAuthSession = (session?: SwaggerGoogleLoginResponse | null): AuthSession => ({
  accessToken: session?.access_token,
  refreshToken: session?.refresh_token,
  tokenType: session?.token_type,
  expiresIn: session?.expires_in,
  isNewUser: session?.is_new_user,
  nextStep: session?.next_step,
  isInitialScanSetupRequired: session?.is_initial_scan_setup_required,
  user: normalizeUser(session?.user),
});

export const normalizeRefreshedSession = (
  session?: SwaggerTokenRefreshResponse | null
): AuthSession => ({
  accessToken: session?.access_token,
  refreshToken: session?.refresh_token,
  tokenType: session?.token_type,
  expiresIn: session?.expires_in,
});

export const normalizeConsent = (consent?: SwaggerUserConsent | null): UserConsent | undefined => {
  if (!consent) return undefined;

  return {
    privacyAgreed: Boolean(consent.is_privacy_agreed),
    aiAnalysisAgreed: Boolean(consent.is_ai_analysis_agreed),
    metadataOnlyAgreed: Boolean(consent.is_metadata_only_agreed),
    userApprovalRequiredAgreed: Boolean(consent.is_user_approval_required_agreed),
    consentVersion: consent.consent_version,
    consentedAt: consent.consented_at,
  };
};
