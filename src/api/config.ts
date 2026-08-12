declare const process: {
  env?: Record<string, string | undefined>;
};

const DEFAULT_API_BASE_URL = 'https://api.dev-aura.r-e.kr';
const DEFAULT_GOOGLE_OAUTH_REDIRECT_URI = 'aura-app://auth/callback';
const DEFAULT_GOOGLE_WEB_CLIENT_ID =
  '731620175876-oj02nccfc1r7uhtugip2l8tujf9qvajt.apps.googleusercontent.com';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const API_BASE_URL = trimTrailingSlash(
  process.env?.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL
);

export const GOOGLE_OAUTH_REDIRECT_URI =
  process.env?.EXPO_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI || DEFAULT_GOOGLE_OAUTH_REDIRECT_URI;

export const GOOGLE_WEB_CLIENT_ID =
  process.env?.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || DEFAULT_GOOGLE_WEB_CLIENT_ID;

export const DEV_AURA_ACCESS_TOKEN =
  process.env?.EXPO_PUBLIC_DEV_AURA_ACCESS_TOKEN?.trim() || '';

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
  google: {
    permissions: '/api/google/permissions',
    recheck: '/api/google/permissions/recheck',
    reconnectUrl: '/api/google/permissions/reconnect-url',
    disconnect: '/api/google/connection',
  },
  home: {
    summary: '/api/home/summary',
  },
  notifications: {
    list: '/api/notifications',
    settings: '/api/notifications/settings',
    fcmToken: '/api/notifications/fcm-token',
  },
  scan: {
    settings: '/api/scan/settings',
    driveFolders: '/api/scan/drive-folders',
    create: '/api/scans',
    running: '/api/scans/running',
    history: '/api/scans/history',
    detail: (scanJobId: string | number) => `/api/scans/${scanJobId}`,
    cancel: (scanJobId: string | number) => `/api/scans/${scanJobId}/cancel`,
    analysisSummary: (scanJobId: string | number) => `/api/scans/${scanJobId}/analysis-summary`,
    candidates: (scanJobId: string | number) => `/api/scans/${scanJobId}/candidates`,
    selectedCandidates: (scanJobId: string | number) => `/api/scans/${scanJobId}/selected-candidates`,
    bulkSelection: (scanJobId: string | number) => `/api/scans/${scanJobId}/candidates/selection`,
  },
  candidates: {
    detail: (candidateId: string | number) => `/api/candidates/${candidateId}`,
    selection: (candidateId: string | number) => `/api/candidates/${candidateId}/selection`,
  },
  cleanup: {
    create: '/api/cleanup-jobs',
    detail: (cleanupJobId: string | number) => `/api/cleanup-jobs/${cleanupJobId}`,
    start: (cleanupJobId: string | number) => `/api/cleanup-jobs/${cleanupJobId}/start`,
    items: (cleanupJobId: string | number) => `/api/cleanup-jobs/${cleanupJobId}/items`,
    result: (cleanupJobId: string | number) => `/api/cleanup-jobs/${cleanupJobId}/result`,
    retryFailed: (cleanupJobId: string | number) => `/api/cleanup-jobs/${cleanupJobId}/retry-failed`,
  },
  storage: {
    items: '/api/storage/items',
    itemDetail: (itemId: string | number) => `/api/storage/items/${itemId}`,
    liveDetail: '/api/storage/items/detail',
    trash: '/api/storage/trash',
    restore: '/api/storage/trash/restore',
    permanentDelete: '/api/storage/trash/permanent-delete',
    emptyTrash: '/api/storage/trash/empty',
  },
  statistics: {
    summary: '/api/statistics/summary',
    monthly: '/api/statistics/monthly',
    cleanupHistories: '/api/statistics/cleanup-histories',
    carbonFormula: '/api/statistics/carbon-formula',
  },
  announcements: {
    list: '/api/announcements',
    detail: (announcementId: string | number) => `/api/announcements/${announcementId}`,
    read: (announcementId: string | number) => `/api/announcements/${announcementId}/read`,
  },
} as const;
