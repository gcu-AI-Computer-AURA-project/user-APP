declare const process: {
  env?: Record<string, string | undefined>;
};

const DEFAULT_API_BASE_URL = 'https://api.dev-aura.r-e.kr';
const DEFAULT_GOOGLE_OAUTH_REDIRECT_URI = 'aura-app://auth/callback';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const API_BASE_URL = trimTrailingSlash(
  process.env?.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL
);

export const GOOGLE_OAUTH_REDIRECT_URI =
  process.env?.EXPO_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI || DEFAULT_GOOGLE_OAUTH_REDIRECT_URI;

export const API_ENDPOINTS = {
  auth: {
    googleLogin: '/api/auth/google/login',
    logout: '/api/auth/logout',
    refresh: '/api/auth/token/refresh',
  },
  user: {
    me: '/api/users/me',
    consent: '/api/user/consents',
    privacyData: '/api/users/me/privacy-data',
    withdrawal: '/api/users/me/withdrawal',
  },
} as const;
