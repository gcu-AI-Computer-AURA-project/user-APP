declare const process: {
  env?: Record<string, string | undefined>;
};

const DEFAULT_API_BASE_URL = 'http://localhost:8080';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const API_BASE_URL = trimTrailingSlash(
  process.env?.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL
);

export const API_ENDPOINTS = {
  auth: {
    googleLogin: '/api/auth/login/google',
    logout: '/api/auth/logout',
    refresh: '/api/auth/refresh',
    status: '/api/auth/status',
  },
  user: {
    me: '/api/user/me',
    consent: '/api/user/consent',
    permissions: '/api/user/permissions',
  },
} as const;

