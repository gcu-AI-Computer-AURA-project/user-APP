import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Easing,
  Linking,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { authApi } from './src/api/auth';
import { DEV_AURA_ACCESS_TOKEN, GOOGLE_OAUTH_REDIRECT_URI, GOOGLE_WEB_CLIENT_ID } from './src/api/config';
import * as Features from './src/api/features';
import { userApi, type ApiPrivacyData } from './src/api/user';
import type { AuraPlatform, AuraServicePermissions, AuraUser } from './src/api/types';
import { OutlineButton, PrimaryButton } from './src/components/AppButtons';
import { BottomSheetPanel } from './src/components/BottomSheetPanel';
import { CheckBox } from './src/components/CheckBox';
import { CheckLine } from './src/components/CheckLine';
import { AuraGradientWord, LogoRow, ProgressCircle, ScreenShell } from './src/components/layout';
import { Body, Card, Chip, DriveLinkCard, EmptyState, InfoRow, MailBodyCard, PreviewCard, PrivacyBody, SectionTitle } from './src/components/ui';
import { CarbonHelpPopup, CarbonStatsGraph } from './src/flows/history';
import { RecentResultRow, ServerDataLoadingState } from './src/flows/home';
import {
  CarbonSaveAnimation,
  ConnectedInfoRow,
  ConnectedSuccessIcon,
  GhostScanAnimation,
  Logo,
  PermissionDetail,
  PushNotificationPermissionContent,
  RevealIn,
} from './src/flows/login';
import {
  CarbonBasisLine,
  CleanupMetricCard,
  DeleteStatusRow,
  applyResultFilterSort,
  FilterSortSheet,
  formatMonthDuration,
  FolderRow,
  isTerminalCleanupJobStatus,
  KeywordBottomSheet,
  KeywordEditor,
  MonthConditionRow,
  PeriodMonthSheet,
  ProtectedListScreen,
  ResultCategoryCard,
  ResultMetricCard,
  ReviewSummaryCard,
  ListScreen,
  ScanItemDetailScreen,
  ScanSourceCard,
  sizeLabelToMB,
  sumScanItemSize,
  type ScanListItem,
  type ScanRecord,
  type ScanSummary,
  YearRangeSheet,
} from './src/flows/scan';
import { ServiceLinkRow, ToggleRow, UserAvatar } from './src/flows/settings';
import * as StorageFlow from './src/flows/storage';
import {
  NavigationContext,
  defaultTabScreens,
  getBackFallbackForScreen,
  getMainTabForScreen,
  loginFlowScreens,
  mainTabOrder,
  scanFlowScreens,
  type MainTab,
  type Screen,
} from './src/navigation/AppNavigationContext';
import { styles } from './src/styles/appStyles';
import { bytesToMB, formatApiDate, formatApiDateOnly, formatBytes, formatDataSize, formatScanDateOnly } from './src/utils/formatters';
import { getErrorMessage, wait } from './src/utils/runtime';

const {
  announcementApi,
  candidateApi,
  googleApi,
  homeApi,
  cleanupApi,
  notificationApi,
  scanApi,
  statisticsApi,
  storageApi,
} = Features;

type ApiAnnouncement = Features.ApiAnnouncement;
type ApiAnalysisSummary = Features.ApiAnalysisSummary;
type ApiCandidate = Features.ApiCandidate;
type ApiCandidateCategory = Features.ApiCandidateCategory;
type ApiCandidateDetail = Features.ApiCandidateDetail;
type ApiCandidateSelectionStatus = Features.ApiCandidateSelectionStatus;
type ApiCleanupHistoryItem = Features.ApiCleanupHistoryItem;
type ApiCleanupJob = Features.ApiCleanupJob;
type ApiDriveFolder = Features.ApiDriveFolder;
type ApiHomeSummary = Features.ApiHomeSummary;
type ApiMonthlyStatistic = Features.ApiMonthlyStatistic;
type ApiPage<T> = Features.ApiPage<T>;
type ApiPermissionResponse = Features.ApiPermissionResponse;
type ApiScanHistoryItem = Features.ApiScanHistoryItem;
type ApiScanJob = Features.ApiScanJob;
type ApiScanSetting = Features.ApiScanSetting;
type ApiScanSettingRequest = Features.ApiScanSettingRequest;
type ApiStatisticsSummary = Features.ApiStatisticsSummary;
type ApiStorageDetail = Features.ApiStorageDetail;
type ApiStorageItem = Features.ApiStorageItem;

const {
  FileOutlineIcon,
  FolderOutlineIcon,
  StorageDetailScreen,
  StorageScreen,
  TrashOutlineIcon,
  apiDriveFolderToStorageItemFromApi,
  apiStorageItemToDrive,
  apiStorageItemToDriveFromApi,
  apiStorageItemToMail,
  apiStorageItemToTrash,
  buildGoogleDriveWebViewLink,
  dedupeStorageDriveItems,
  dedupeStorageMailItems,
  driveRootPath,
  extractStorageSizeMB,
  getAllStorageDriveItems,
  getAllStorageDriveTrashItems,
  getDirectDriveFolders,
  getDriveAncestorFolders,
  getDriveFileSelectionGroup,
  getDriveFolderName,
  getDriveFolderSelected,
  getDriveFolderSelectionGroup,
  getDriveParentPath,
  getStorageDriveItemsForFolder,
  getStorageDriveTrashItemsForFolder,
  getVisibleDriveFolders,
  hasDriveFolderChildren,
  normalizeServerDrivePath,
  storageServerPageCache,
  clearStorageServerPageCache,
  splitDrivePath,
} = StorageFlow;

type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');
type NotificationsModule = typeof import('expo-notifications');

let googleSignInModulePromise: Promise<GoogleSignInModule> | null = null;
let notificationsModulePromise: Promise<NotificationsModule> | null = null;

const loadGoogleSignInModule = () => {
  googleSignInModulePromise ??= import('@react-native-google-signin/google-signin');
  return googleSignInModulePromise;
};

const loadNotificationsModule = () => {
  notificationsModulePromise ??= import('expo-notifications');
  return notificationsModulePromise;
};

const googleSigninScopes = [
  'openid',
  'email',
  'profile',
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/drive',
];

const configureGoogleSignin = (GoogleSignin: GoogleSignInModule['GoogleSignin']) => {
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    offlineAccess: true,
    forceCodeForRefreshToken: true,
    scopes: googleSigninScopes,
  });
};

const AURA_NOTIFICATION_CHANNEL_ID = 'aura-high-priority';
const AURA_AUTH_SESSION_KEY = 'aura.auth.session.v1';

type StoredAuthSession = {
  accessToken?: string;
  refreshToken?: string;
  user?: AuraUser;
  privacyChecked?: boolean;
};

type WebStorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const getWebStorage = (): WebStorageLike | null => {
  if (typeof globalThis === 'undefined') return null;
  return (globalThis as typeof globalThis & { localStorage?: WebStorageLike }).localStorage ?? null;
};

const readStoredAuthSession = async (): Promise<StoredAuthSession | null> => {
  try {
    const raw =
      Platform.OS === 'web'
        ? getWebStorage()?.getItem(AURA_AUTH_SESSION_KEY) ?? null
        : await SecureStore.getItemAsync(AURA_AUTH_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuthSession;
  } catch {
    return null;
  }
};

const saveStoredAuthSession = async (session: StoredAuthSession) => {
  if (!session.refreshToken) return;

  const value = JSON.stringify(session);
  if (Platform.OS === 'web') {
    getWebStorage()?.setItem(AURA_AUTH_SESSION_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(AURA_AUTH_SESSION_KEY, value);
};

const clearStoredAuthSession = async () => {
  if (Platform.OS === 'web') {
    getWebStorage()?.removeItem(AURA_AUTH_SESSION_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(AURA_AUTH_SESSION_KEY);
};

type FloatingButtonVariant = 'scan' | 'delete' | 'trash' | 'restore';
type FloatingAction = { variant: Exclude<FloatingButtonVariant, 'scan'>; onPress: () => void; small?: boolean };
type PermissionScreen = 'gmailPermission' | 'drivePermission' | 'notificationPermission';
type PermissionState = StorageFlow.PermissionState;
type GoogleServiceType = 'GMAIL' | 'DRIVE';
type SettingsTogglesState = { scanComplete: boolean; aiNudge: boolean; marketing: boolean; autoScan: boolean };
type MonthRange = { from: number; to: number };
type StorageMailItem = StorageFlow.StorageMailItem;
type StorageDriveItem = StorageFlow.StorageDriveItem;
type StorageDetailItem = StorageFlow.StorageDetailItem;
type StorageServerPageState = StorageFlow.StorageServerPageState;
type StorageDriveMoveTargets = StorageFlow.StorageDriveMoveTargets;
type DriveFolderOption = StorageFlow.DriveFolderOption;
const navy = '#57C879';
const line = '#E8EAED';
const pale = '#F4FFF7';
const text = '#202124';
const mutedText = '#9AA0A6';
const softShadow = {
  shadowColor: '#000000',
  shadowOpacity: 0.075,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 0 },
  elevation: 3,
};
const gentleShadow = {
  shadowColor: '#000000',
  shadowOpacity: 0.055,
  shadowRadius: 13,
  shadowOffset: { width: 0, height: 0 },
  elevation: 2,
};
const auraLogo = require('./assets/AURA-logo.png');
const gmailIcon = require('./assets/gmail-icon.png');
const googleDriveIcon = require('./assets/google-drive-icon.png');
const toMonthIndex = (year: number, month: number) => year * 12 + month - 1;
const nowForScanRange = new Date();
const minScanMonthIndex = toMonthIndex(2018, 2);
const maxScanMonthIndex = toMonthIndex(nowForScanRange.getFullYear(), nowForScanRange.getMonth() + 1);
const clampScanMonth = (monthIndex: number) => Math.max(minScanMonthIndex, Math.min(maxScanMonthIndex, monthIndex));
const getMonthParts = (monthIndex: number) => ({
  year: Math.floor(monthIndex / 12),
  month: (monthIndex % 12) + 1,
});
const formatMonthLabel = (monthIndex: number) => {
  const { year, month } = getMonthParts(monthIndex);
  return `${year}년 ${`${month}`.padStart(2, '0')}월`;
};
const formatMonthShortLabel = (monthIndex: number) => {
  const { year, month } = getMonthParts(monthIndex);
  return `${`${year}`.slice(2)}.${`${month}`.padStart(2, '0')}`;
};

const getAuraPlatform = (): AuraPlatform => {
  if (Platform.OS === 'ios') return 'IOS';
  if (Platform.OS === 'android') return 'ANDROID';
  return 'WEB';
};

const getAuraDeviceId = () => {
  const constants = Constants as unknown as {
    sessionId?: string;
    installationId?: string;
    expoConfig?: { slug?: string; version?: string };
  };

  return constants.installationId ?? constants.sessionId ?? `${Platform.OS}-${constants.expoConfig?.slug ?? 'aura'}`;
};

const getAuraAppVersion = () => {
  const constants = Constants as unknown as { expoConfig?: { version?: string } };
  return constants.expoConfig?.version;
};

const isAndroidExpoGo = () => {
  const constants = Constants as unknown as { appOwnership?: string | null };
  return Platform.OS === 'android' && constants.appOwnership === 'expo';
};

const configureAuraNotificationChannel = async (Notifications: NotificationsModule) => {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(AURA_NOTIFICATION_CHANNEL_ID, {
    name: 'AURA 알림',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    enableVibrate: true,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#74C987',
  });
};

const getGoogleServicePermissionKey = (serviceType: GoogleServiceType) =>
  serviceType === 'GMAIL' ? 'gmail' : 'drive';

const getGoogleServiceLabel = (serviceType: GoogleServiceType) =>
  serviceType === 'GMAIL' ? 'Gmail' : 'Google Drive';

const serializePushTokenData = (data: unknown) => {
  if (typeof data === 'string') return data.trim();
  if (data === undefined || data === null) return '';

  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
};

const isExpoNotificationPermissionGranted = (
  permission: { status?: string; ios?: { status?: unknown } },
  Notifications?: NotificationsModule
) => {
  if (permission.status === 'granted') return true;

  const iosStatus = permission.ios?.status;
  const iosAuthorizationStatus = Notifications?.IosAuthorizationStatus;
  if (!iosAuthorizationStatus || iosStatus === undefined) return false;

  return (
    iosStatus === iosAuthorizationStatus.AUTHORIZED ||
    iosStatus === iosAuthorizationStatus.PROVISIONAL ||
    iosStatus === iosAuthorizationStatus.EPHEMERAL
  );
};

const getNotificationDataRecord = (data: unknown) =>
  typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};

const getNotificationDataString = (data: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
};

const getNotificationDataNumber = (data: Record<string, unknown>, keys: string[]) => {
  const value = getNotificationDataString(data, keys);
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const getUrlQueryParam = (url: string, key: string) => {
  const query = url.split('?')[1]?.split('#')[0];
  if (!query) return null;

  const pairs = query.split('&');
  for (const pair of pairs) {
    const [rawKey, rawValue = ''] = pair.split('=');
    if (decodeURIComponent(rawKey) === key) {
      return decodeURIComponent(rawValue.replace(/\+/g, ' '));
    }
  }

  return null;
};

const getGooglePermissionFlags = (response?: ApiPermissionResponse | null) => {
  let gmailStatus = response?.gmail_status;
  let driveStatus = response?.drive_status;

  response?.permissions?.forEach((permission) => {
    if (permission.service_type === 'GMAIL') gmailStatus = permission.permission_status;
    if (permission.service_type === 'DRIVE') driveStatus = permission.permission_status;
  });

  return {
    hasGmail: gmailStatus !== undefined,
    hasDrive: driveStatus !== undefined,
    gmail: gmailStatus === 'CONNECTED',
    drive: driveStatus === 'CONNECTED',
  };
};

const formatUnknownValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) return value.length ? `${value.length}개` : '0개';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const pickReadableText = (...values: Array<string | null | undefined>) => {
  for (const value of values) {
    const textValue = value?.trim();
    if (textValue) return textValue;
  }
  return undefined;
};

const getUserInitial = (user?: AuraUser | null) => {
  const profileText = pickReadableText(user?.name, user?.email);
  return profileText ? profileText.charAt(0).toUpperCase() : 'A';
};

const extractServerAuthCode = (response: unknown) => {
  if (!response || typeof response !== 'object') return null;

  const data = response as {
    serverAuthCode?: string | null;
    data?: { serverAuthCode?: string | null };
  };

  return data.serverAuthCode ?? data.data?.serverAuthCode ?? null;
};

const storageSelectionPrefixes = new Set(['storageMail', 'storageDrive', 'storageTrash', 'storageDriveTrash']);
const isDefaultCandidateSelected = (_prefix?: string, _id?: string) => true;
const isDefaultSelectionForKey = (key: string) => {
  const [prefix] = key.split(':');
  if (!/^(mail|drive|large|storageMail|storageDrive|storageTrash|storageDriveTrash)$/.test(prefix)) return false;
  return !storageSelectionPrefixes.has(prefix);
};
function createEmptyScanSummary(folderLabel = '전체 Drive'): ScanSummary {
  return {
    mailItems: [],
    driveItems: [],
    largeItems: [],
    protectedItems: [],
    categorySummaries: [],
    storageMailItems: [],
    storageDriveItems: [],
    storageTrashItems: [],
    mailSizeLabel: '0MB',
    driveSizeLabel: '0MB',
    largeSizeLabel: '0MB',
    totalSizeLabel: '0MB',
    carbonLabel: '약 0.0g CO2',
    candidateCount: 0,
    folderLabel,
  };
}
const emptyScanSummary: ScanSummary = createEmptyScanSummary();

function getNiceChartTickStep(targetStep: number, suffix: string) {
  if (!Number.isFinite(targetStep) || targetStep <= 0) return 1;

  if ((suffix === 'MB' || suffix === 'GB') && targetStep < 1) {
    return 1;
  }

  const magnitude = Math.pow(10, Math.floor(Math.log10(targetStep)));
  const normalized = targetStep / magnitude;
  const multipliers = [1, 2, 2.5, 5, 10];
  const multiplier = multipliers.find((candidate) => normalized <= candidate) ?? 10;

  return multiplier * magnitude;
}

function getChartSizeScale(valuesInBytes: number[]) {
  const maxBytes = Math.max(0, ...valuesInBytes.map((value) => Number(value) || 0));
  const KB = 1024;
  const MB = KB * 1024;
  const GB = MB * 1024;
  const TB = GB * 1024;
  const unit = maxBytes >= TB
    ? { divisor: TB, suffix: 'TB' }
    : maxBytes >= GB
      ? { divisor: GB, suffix: 'GB' }
      : maxBytes >= MB
        ? { divisor: MB, suffix: 'MB' }
        : maxBytes >= KB
          ? { divisor: KB, suffix: 'KB' }
          : { divisor: 1, suffix: 'B' };
  const maxValue = maxBytes / unit.divisor;
  const tickStep = getNiceChartTickStep(maxValue / 4, unit.suffix);
  const axisMax = maxValue > 0 ? tickStep * 4 : tickStep;
  const decimalPlaces = tickStep >= 1 ? 0 : 1;

  return {
    ...unit,
    axisMax,
    decimalPlaces,
    segments: maxValue > 0 ? 4 : 1,
  };
}

const DEFAULT_GOOGLE_DRIVE_TOTAL_BYTES = 15 * 1024 * 1024 * 1024;
function pickValidByteValue(...values: Array<number | null | undefined>) {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric >= 0) return numeric;
  }
  return undefined;
}

function apiScanSourceLabel(source?: string | null) {
  if (source === 'MAIL') return 'Gmail';
  if (source === 'DRIVE_ALL' || source === 'DRIVE_FOLDER') return 'Drive';
  if (source === 'MAIL_AND_DRIVE') return 'Gmail + Drive';
  return 'Gmail + Drive';
}

function apiCategoryDesc(category?: string, fallback?: string) {
  if (category === 'PROMOTION_MAIL') return '광고·프로모션 메일';
  if (category === 'OLD_MAIL') return '오래된 메일';
  if (category === 'DUPLICATE_FILE') return '중복 파일';
  if (category === 'OLD_DRIVE_FILE') return '오래된 파일';
  if (category === 'LARGE_FILE') return '대용량 파일';
  if (category === 'LOW_VALUE_ATTACHMENT') return '대용량 첨부파일';
  if (category === 'TEMP_OR_BACKUP') return '임시·백업 파일';
  if (category === 'PROTECTED') return '보호 항목';
  return fallback || '분석 후보';
}

function isCompletedScanStatus(status?: string | null) {
  return status === 'COMPLETED' || status === 'PARTIAL_FAILED';
}

const SCAN_CANDIDATE_PAGE_SIZE = 100;

function getApiCandidateKey(candidate: ApiCandidate) {
  if (candidate.candidate_id !== undefined && candidate.candidate_id !== null) return `candidate:${candidate.candidate_id}`;
  if (candidate.item_id !== undefined && candidate.item_id !== null) return `item:${candidate.item_id}`;
  if (candidate.external_item_id) return `${candidate.item_source ?? 'UNKNOWN'}:${candidate.external_item_id}`;
  return `title:${candidate.title ?? 'unknown'}`;
}

function mergeApiCandidates(candidates: ApiCandidate[]) {
  const map = new Map<string, ApiCandidate>();
  candidates.forEach((candidate) => {
    map.set(getApiCandidateKey(candidate), candidate);
  });
  return Array.from(map.values());
}

async function fetchScanCandidatesByQuery(
  scanJobId: number,
  accessToken: string,
  query: Parameters<typeof scanApi.getCandidates>[1]
) {
  const collected: ApiCandidate[] = [];

  for (let page = 0; page < 50; page += 1) {
    const result = await scanApi.getCandidates(
      scanJobId,
      { ...query, page, size: SCAN_CANDIDATE_PAGE_SIZE },
      { accessToken }
    );
    const content = result.content ?? [];
    collected.push(...content);

    if (result.total_pages !== undefined && page + 1 >= result.total_pages) break;
    if (content.length < SCAN_CANDIDATE_PAGE_SIZE) break;
  }

  return collected;
}

async function fetchAllScanCandidates(scanJobId: number, accessToken: string) {
  const [cleanupCandidates, protectedCandidates] = await Promise.all([
    fetchScanCandidatesByQuery(scanJobId, accessToken, { include_protected: false }),
    fetchScanCandidatesByQuery(scanJobId, accessToken, {
      category: 'PROTECTED',
      selection_status: 'NONE',
      include_protected: true,
    }),
  ]);

  return mergeApiCandidates([...cleanupCandidates, ...protectedCandidates]);
}

function apiCandidateToScanItem(candidate: ApiCandidate): ScanListItem {
  const sizeBytes = candidate.estimated_reclaim_bytes ?? candidate.size_bytes ?? candidate.attachment_size_bytes ?? 0;
  const date =
    candidate.received_at ||
    candidate.last_opened_time ||
    candidate.modified_time ||
    candidate.created_time ||
    undefined;
  return {
    id: `api-candidate-${candidate.candidate_id ?? candidate.item_id ?? candidate.external_item_id ?? candidate.title}`,
    candidateId: candidate.candidate_id,
    selectionVersion: candidate.selection_version,
    selectionStatus: candidate.selection_status,
    title: candidate.title || candidate.external_item_id || '분석 후보',
    desc: apiCategoryDesc(candidate.category, candidate.snippet),
    sizeMB: bytesToMB(sizeBytes),
    dateLabel: formatApiDateOnly(date),
    sortText: candidate.sender_domain || candidate.owner_email || candidate.title || '',
    source: candidate.item_source === 'DRIVE' ? 'drive' : 'mail',
    previewLabel: candidate.label_text || candidate.snippet,
    bodyPreview: candidate.snippet,
    webViewLink: candidate.item_source === 'DRIVE' ? candidate.web_view_link ?? buildGoogleDriveWebViewLink(candidate.external_item_id) : undefined,
    detailTitle: candidate.title,
    detailSubtitle: candidate.item_source === 'DRIVE' ? candidate.folder_path || candidate.mime_type : undefined,
  };
}

function isProtectedApiCandidate(candidate: ApiCandidate) {
  return candidate.is_protected === true || candidate.category === 'PROTECTED';
}

function buildApiScanSummary(params: {
  candidates?: ApiCandidate[];
  analysisSummary?: ApiAnalysisSummary | null;
  storageMailItems?: ApiStorageItem[];
  storageDriveItems?: ApiStorageItem[];
  trashMailItems?: ApiStorageItem[];
  estimatedBytes?: number;
  candidateCount?: number;
  carbonGrams?: number;
  folderLabel?: string;
}): ScanSummary {
  const apiCandidates = params.candidates ?? [];
  const protectedCandidates = apiCandidates.filter(isProtectedApiCandidate);
  const candidateItems = apiCandidates
    .filter((candidate) => !isProtectedApiCandidate(candidate))
    .map(apiCandidateToScanItem);
  const mailItems = candidateItems.filter((item) => item.source === 'mail');
  const driveItems = candidateItems.filter((item) => item.source === 'drive');
  const largeItems = driveItems.filter((item) => item.sizeMB >= 500);
  const categorySummaries = (params.analysisSummary?.categories ?? []).map((item) => ({
    category: item.category,
    itemCount: Number(item.item_count ?? 0),
    estimatedBytes: Number(item.estimated_reclaim_bytes ?? 0),
    selectedCount: item.selected_count,
  }));
  const categoryTotalBytes = categorySummaries.reduce((sum, item) => sum + item.estimatedBytes, 0);
  const categoryCandidateCount = categorySummaries.reduce((sum, item) => sum + item.itemCount, 0);
  const protectedItems = protectedCandidates.map(apiCandidateToScanItem);
  const totalSizeMB =
    params.estimatedBytes !== undefined
      ? bytesToMB(params.estimatedBytes)
      : categoryTotalBytes
        ? bytesToMB(categoryTotalBytes)
      : sumScanItemSize(mailItems) + sumScanItemSize(driveItems);

  return {
    mailItems,
    driveItems,
    largeItems,
    protectedItems,
    categorySummaries,
    storageMailItems: (params.storageMailItems ?? []).map(apiStorageItemToMail),
    storageDriveItems: (params.storageDriveItems ?? []).map(apiStorageItemToDrive),
    storageTrashItems: (params.trashMailItems ?? []).map(apiStorageItemToTrash),
    mailSizeLabel: formatDataSize(sumScanItemSize(mailItems)),
    driveSizeLabel: formatDataSize(sumScanItemSize(driveItems)),
    largeSizeLabel: formatDataSize(sumScanItemSize(largeItems)),
    totalSizeLabel: formatDataSize(totalSizeMB),
    carbonLabel: `약 ${(params.carbonGrams ?? Math.max(0, (totalSizeMB / 1024) * 0.19)).toFixed(1)}g CO₂`,
    candidateCount: (params.candidateCount ?? categoryCandidateCount) || candidateItems.length,
    folderLabel: params.folderLabel ?? '전체 Drive',
  };
}

function buildScanResult({
  selectedDriveFolders,
}: {
  scanSources: { gmail: boolean; drive: boolean; folder: boolean };
  selectedDriveFolders: string[];
  selectedDriveFileIds: string[];
  includeSubFolders: boolean;
  includeKeywords: string[];
  excludeKeywords: string[];
  selectedFileTypes: Record<string, boolean>;
  includeMailAttachments: boolean;
}): ScanSummary {
  const folderLabel = selectedDriveFolders.length
    ? selectedDriveFolders.length === 1
      ? selectedDriveFolders[0]
      : `${selectedDriveFolders[0]} 외 ${selectedDriveFolders.length - 1}개`
    : '전체 Drive';

  return createEmptyScanSummary(folderLabel);
}

const defaultStorageSummary = createEmptyScanSummary();
export default function App() {
  const [screen, setScreen] = useState<Screen>('initial');
  const [history, setHistory] = useState<Screen[]>([]);
  const [lastTabScreens, setLastTabScreens] = useState<Record<MainTab, Screen>>({
    home: 'home',
    storage: 'storageMail',
    trash: 'storageTrash',
    history: 'analysisHistory',
    settings: 'settings',
  });
  const [tabHistories, setTabHistories] = useState<Record<MainTab, Screen[]>>({
    home: [],
    storage: [],
    trash: [],
    history: [],
    settings: [],
  });
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [privacyDetailChecked, setPrivacyDetailChecked] = useState(false);
  const [permissions, setPermissions] = useState<PermissionState>({ gmail: false, drive: false, alarm: false });
  const [disabledGooglePermissions, setDisabledGooglePermissions] = useState<{ gmail: boolean; drive: boolean }>({ gmail: false, drive: false });
  const [apiAccessToken, setApiAccessToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuraUser | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [permissionToast, setPermissionToast] = useState('');
  const [toastTarget, setToastTarget] = useState<Screen | null>(null);
  const [includeInput, setIncludeInput] = useState('');
  const [excludeInput, setExcludeInput] = useState('');
  const [includeKeywords, setIncludeKeywords] = useState(['광고', '프로모션', '뉴스레터']);
  const [excludeKeywords, setExcludeKeywords] = useState(['영수증', '계약서']);
  const [selectedFileTypes, setSelectedFileTypes] = useState<Record<string, boolean>>({
    PDF: true,
    DOCX: true,
    ZIP: true,
    JPG: true,
  });
  const [includeMailAttachments, setIncludeMailAttachments] = useState(false);
  const [scanSources, setScanSources] = useState({ gmail: true, drive: false, folder: false });
  const [driveFolderSearch, setDriveFolderSearch] = useState('');
  const [driveCurrentFolder, setDriveCurrentFolder] = useState(driveRootPath);
  const [apiDriveFolderOptions, setApiDriveFolderOptions] = useState<DriveFolderOption[]>([]);
  const [apiDriveFolderIdsByPath, setApiDriveFolderIdsByPath] = useState<Record<string, string>>({});
  const [driveFolderLoading, setDriveFolderLoading] = useState(false);
  const [driveFolderError, setDriveFolderError] = useState('');
  const [storageDriveFolder, setStorageDriveFolder] = useState(driveRootPath);
  const [storageTrashMovedKeys, setStorageTrashMovedKeys] = useState<string[]>([]);
  const [storageDeletedKeys, setStorageDeletedKeys] = useState<string[]>([]);
  const [storageRestoredKeys, setStorageRestoredKeys] = useState<string[]>([]);
  const [storageDriveMoveTargets, setStorageDriveMoveTargets] = useState<StorageDriveMoveTargets>({});
  const [selectedDriveFolders, setSelectedDriveFolders] = useState<string[]>([]);
  const [selectedDriveFiles, setSelectedDriveFiles] = useState<string[]>([]);
  const [includeSubFolders, setIncludeSubFolders] = useState(true);
  const [periodRange, setPeriodRange] = useState('3년 이상');
  const [lastOpenedBeforeMonths, setLastOpenedBeforeMonths] = useState(6);
  const [lastModifiedBeforeMonths, setLastModifiedBeforeMonths] = useState(6);
  const [createdBeforeMonths, setCreatedBeforeMonths] = useState(6);
  const [openedYearRange, setOpenedYearRange] = useState<MonthRange>({ from: toMonthIndex(2023, 1), to: maxScanMonthIndex });
  const [modifiedYearRange, setModifiedYearRange] = useState<MonthRange>({ from: toMonthIndex(2022, 1), to: maxScanMonthIndex });
  const [yearSheetType, setYearSheetType] = useState<'opened' | 'modified' | null>(null);
  const [periodSheetType, setPeriodSheetType] = useState<'opened' | 'modified' | null>(null);
  const [periodEditOnly, setPeriodEditOnly] = useState(false);
  const [scanSourceEditOnly, setScanSourceEditOnly] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatusText, setScanStatusText] = useState('메일 및 드라이브 데이터 수집중');
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [deleteJobStatus, setDeleteJobStatus] = useState<'idle' | 'running' | 'completed' | 'failed' | 'cancelled'>('idle');
  const [deleteStatusText, setDeleteStatusText] = useState('선택 항목을 휴지통으로 이동 중');
  const [homeScanNotice, setHomeScanNotice] = useState<'none' | 'running' | 'cancelled' | 'completed'>('none');
  const [apiScanJobId, setApiScanJobId] = useState<number | null>(null);
  const [apiCleanupJobId, setApiCleanupJobId] = useState<number | null>(null);
  const [lastScan, setLastScan] = useState<ScanRecord | null>(null);
  const [apiHomeSummary, setApiHomeSummary] = useState<ApiHomeSummary | null>(null);
  const [apiStorageSummary, setApiStorageSummary] = useState<ScanSummary | null>(null);
  const [apiScanHistoryItems, setApiScanHistoryItems] = useState<ApiScanHistoryItem[]>([]);
  const [apiMonthlyStats, setApiMonthlyStats] = useState<ApiMonthlyStatistic[]>([]);
  const [apiStatisticsSummary, setApiStatisticsSummary] = useState<ApiStatisticsSummary | null>(null);
  const [apiCleanupHistoryItems, setApiCleanupHistoryItems] = useState<ApiCleanupHistoryItem[]>([]);
  const [apiBootstrapLoading, setApiBootstrapLoading] = useState(false);
  const [googlePermissionChecking, setGooglePermissionChecking] = useState(false);
  const [candidateSummaryLoading, setCandidateSummaryLoading] = useState(false);
  const [apiScanSetting, setApiScanSetting] = useState<ApiScanSetting | null>(null);
  const [apiAnnouncements, setApiAnnouncements] = useState<ApiAnnouncement[]>([]);
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [announcementError, setAnnouncementError] = useState('');
  const [privacyData, setPrivacyData] = useState<ApiPrivacyData | null>(null);
  const [privacyDataLoading, setPrivacyDataLoading] = useState(false);
  const [privacyDataError, setPrivacyDataError] = useState('');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [hasCompletedScan, setHasCompletedScan] = useState(false);
  const [onboardingGhostDone, setOnboardingGhostDone] = useState(false);
  const [onboardingCarbonDone, setOnboardingCarbonDone] = useState(false);
  const [connectedDone, setConnectedDone] = useState(false);
  const [connectedStep, setConnectedStep] = useState(0);
  const [hasSeenConnectedSuccess, setHasSeenConnectedSuccess] = useState(false);
  const [skipConnectedAnimation, setSkipConnectedAnimation] = useState(false);
  const screenMotion = useRef(new Animated.Value(1)).current;
  const transitionDirection = useRef(1);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const withdrawSheetMotion = useRef(new Animated.Value(1)).current;
  const keywordChoiceMotion = useRef(new Animated.Value(1)).current;
  const keywordSheetMotion = useRef(new Animated.Value(1)).current;
  const yearSheetMotion = useRef(new Animated.Value(1)).current;
  const periodSheetMotion = useRef(new Animated.Value(1)).current;
  const filterSheetMotion = useRef(new Animated.Value(1)).current;
  const deleteConfirmMotion = useRef(new Animated.Value(1)).current;
  const cleanupReclaimedOpacity = useRef(new Animated.Value(1)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const devAccessTokenApplied = useRef(false);
  const authRestoreAttempted = useRef(false);
  const latestRefreshTokenRef = useRef<string | null>(null);
  const disabledGooglePermissionsRef = useRef<{ gmail: boolean; drive: boolean }>({ gmail: false, drive: false });
  const screenRef = useRef<Screen>('initial');
  const scanSourceLabelRef = useRef('Gmail + Drive');
  const scanResultRef = useRef<ScanSummary>(emptyScanSummary);
  const activeApiScanJobId = useRef<number | null>(null);
  const activeApiCleanupJobId = useRef<number | null>(null);
  const candidateSummaryLoadAttemptedScanId = useRef<number | null>(null);
  const fcmRegistrationInFlight = useRef(false);
  const registeredFcmTokenRef = useRef('');
  const handledNotificationResponseIds = useRef<Set<string>>(new Set());
  const loadedDriveFolderPaths = useRef<Set<string>>(new Set());
  const pendingGoogleReconnectServices = useRef<Array<'GMAIL' | 'DRIVE'> | null>(null);
  const handledGoogleOauthCodes = useRef<Set<string>>(new Set());
  const storageSheetBackHandlerRef = useRef<(() => boolean) | null>(null);
  const [withdrawSheetVisible, setWithdrawSheetVisible] = useState(false);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [carbonHelpVisible, setCarbonHelpVisible] = useState(false);
  const [filterDate, setFilterDate] = useState('전체 기간');
  const [filterSize, setFilterSize] = useState('전체 용량');
  const [sortMode, setSortMode] = useState('날짜순');
  const [selectedScanItem, setSelectedScanItem] = useState<ScanListItem | null>(null);
  const [selectedStorageDetail, setSelectedStorageDetail] = useState<StorageDetailItem | null>(null);
  const [mailListMode, setMailListMode] = useState<'promo' | 'old'>('promo');
  const [driveListMode, setDriveListMode] = useState<'old' | 'duplicate'>('old');
  const [analysisHistoryReturnTarget, setAnalysisHistoryReturnTarget] = useState<Screen>('home');
  const [keywordChoiceVisible, setKeywordChoiceVisible] = useState(false);
  const [keywordSheetType, setKeywordSheetType] = useState<'include' | 'exclude' | null>(null);
  const [settingsToggles, setSettingsToggles] = useState<SettingsTogglesState>({
    scanComplete: true,
    aiNudge: true,
    marketing: false,
    autoScan: true,
  });

  useEffect(() => {
    void loadGoogleSignInModule()
      .then(({ GoogleSignin }) => {
        configureGoogleSignin(GoogleSignin);
      })
      .catch(() => {
        // Expo Go에는 Google Sign-In 네이티브 모듈이 포함되지 않는다.
      });
  }, []);

  const go = (next: Screen) => {
    transitionDirection.current = -1;
    setHistory((items) => [...items, screen]);
    setScreen(next);
  };

  const replace = (next: Screen) => {
    transitionDirection.current = -1;
    setHistory([]);
    setScreen(next);
  };

  const getResolvedTabForScreen = (target: Screen): MainTab | null => {
    if ((target === 'scanFlowSource' || target === 'scanFlowFolder') && scanSourceEditOnly) {
      return 'settings';
    }

    if (target === 'scanFlowPeriod' && periodEditOnly) {
      return 'settings';
    }

    return getMainTabForScreen(target);
  };

  const getResolvedBackFallback = (target: Screen): Screen => {
    if ((target === 'scanFlowSource' || target === 'scanFlowFolder') && scanSourceEditOnly) {
      return 'defaultScan';
    }

    if (target === 'scanFlowPeriod' && periodEditOnly) {
      return 'defaultScan';
    }

    return getBackFallbackForScreen(target);
  };

  const getResolvedBackParent = (target: Screen): Screen => {
    if (target === 'privacy' || target === 'permissions') return 'initial';
    if (target === 'gmailPermission' || target === 'drivePermission' || target === 'notificationPermission') return 'permissions';
    if (target === 'connected') return 'permissions';
    if (target === 'onboardingIntro') return 'connected';
    if (target === 'onboardingGhost') return 'onboardingIntro';
    if (target === 'onboardingCarbon') return 'onboardingGhost';
    if (target === 'analysisHistory') return analysisHistoryReturnTarget;

    const tab = getResolvedTabForScreen(target);
    if (tab) return defaultTabScreens[tab];

    return getResolvedBackFallback(target);
  };

  const clearHomeScanCompletionNotice = () => {
    setHomeScanNotice('none');
    setHasCompletedScan(false);
    setApiScanJobId(null);
    activeApiScanJobId.current = null;
  };

  const getHistoryBackIndex = () => {
    const currentTab = getResolvedTabForScreen(screen);

    for (let index = history.length - 1; index >= 0; index -= 1) {
      const candidate = history[index];
      const candidateTab = getResolvedTabForScreen(candidate);

      if (
        (screen === 'gmailPermission' || screen === 'drivePermission' || screen === 'notificationPermission') &&
        (candidate === 'account' || candidate === 'permissions')
      ) {
        return index;
      }

      if (currentTab && candidateTab === currentTab) {
        return index;
      }

      if (!currentTab && !candidateTab) {
        return index;
      }
    }

    return -1;
  };

  const navigateTab = (tab: MainTab) => {
    if (tab === 'home' && deleteJobStatus === 'completed') {
      clearHomeScanCompletionNotice();
    }

    if (tab === 'history') {
      setAnalysisHistoryReturnTarget('home');
    }

    const currentTab = getResolvedTabForScreen(screen);

    if (currentTab === tab) {
      const defaultScreen = defaultTabScreens[tab];
      setLastTabScreens((items) => ({ ...items, [tab]: defaultScreen }));
      setTabHistories((items) => ({ ...items, [tab]: [] }));
      transitionDirection.current = 1;
      setHistory([]);
      setScreen(defaultScreen);
      return;
    }

    const next = lastTabScreens[tab] ?? defaultTabScreens[tab];

    if (currentTab) {
      setTabHistories((items) => ({ ...items, [currentTab]: history }));
    }
    transitionDirection.current = -1;
    setHistory(tabHistories[tab] ?? []);
    setScreen(next);
  };

  const openAccountFromPermissionRevoked = () => {
    const currentTab = getResolvedTabForScreen(screen);
    if (currentTab) {
      setTabHistories((items) => ({ ...items, [currentTab]: history }));
    }
    setLastTabScreens((items) => ({ ...items, settings: 'account' }));
    setTabHistories((items) => ({ ...items, settings: ['settings'] }));
    transitionDirection.current = -1;
    setHistory(['settings']);
    setScreen('account');
  };

  const clearWithdrawConfirm = () => {
    setChecked((items) => ({ ...items, withdrawConfirm: false }));
  };

  const openWithdrawSheet = () => {
    clearWithdrawConfirm();
    setWithdrawSheetVisible(true);
    withdrawSheetMotion.setValue(1);
    Animated.timing(withdrawSheetMotion, {
      toValue: 0,
      duration: 260,
      useNativeDriver: true,
    }).start();
  };

  const closeWithdrawSheet = () => {
    Animated.timing(withdrawSheetMotion, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setWithdrawSheetVisible(false);
        clearWithdrawConfirm();
      }
    });
  };

  const includeRecommendedKeywords = ['이벤트', '할인', 'SALE'];
  const excludeRecommendedKeywords = ['학교', '중요', '결제'];

  const openKeywordChoiceSheet = () => {
    setKeywordChoiceVisible(true);
    keywordChoiceMotion.setValue(1);
    Animated.timing(keywordChoiceMotion, {
      toValue: 0,
      duration: 240,
      useNativeDriver: true,
    }).start();
  };

  const closeKeywordChoiceSheet = (nextType?: 'include' | 'exclude') => {
    Animated.timing(keywordChoiceMotion, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setKeywordChoiceVisible(false);
        if (nextType) {
          openKeywordSheet(nextType);
        }
      }
    });
  };

  const openKeywordSheet = (type: 'include' | 'exclude') => {
    setKeywordSheetType(type);
    keywordSheetMotion.setValue(1);
    Animated.timing(keywordSheetMotion, {
      toValue: 0,
      duration: 260,
      useNativeDriver: true,
    }).start();
  };

  const closeKeywordSheet = () => {
    if (keywordSheetType === 'include' && includeInput.trim()) addKeyword('include');
    if (keywordSheetType === 'exclude' && excludeInput.trim()) addKeyword('exclude');
    Animated.timing(keywordSheetMotion, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setKeywordSheetType(null);
      }
    });
  };

  const openYearSheet = (type: 'opened' | 'modified') => {
    setYearSheetType(type);
    yearSheetMotion.setValue(1);
    Animated.timing(yearSheetMotion, {
      toValue: 0,
      duration: 260,
      useNativeDriver: true,
    }).start();
  };

  const closeYearSheet = () => {
    Animated.timing(yearSheetMotion, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setYearSheetType(null);
      }
    });
  };

  const openPeriodMonthSheet = (type: 'opened' | 'modified') => {
    setPeriodSheetType(type);
    periodSheetMotion.setValue(1);
    Animated.timing(periodSheetMotion, {
      toValue: 0,
      duration: 260,
      useNativeDriver: true,
    }).start();
  };

  const closePeriodMonthSheet = () => {
    Animated.timing(periodSheetMotion, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setPeriodSheetType(null);
      }
    });
  };

  const openFilterSheet = () => {
    setFilterSheetVisible(true);
    filterSheetMotion.setValue(1);
    Animated.timing(filterSheetMotion, {
      toValue: 0,
      duration: 240,
      useNativeDriver: true,
    }).start();
  };

  const closeFilterSheet = () => {
    Animated.timing(filterSheetMotion, {
      toValue: 1,
      duration: 210,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setFilterSheetVisible(false);
      }
    });
  };

  useEffect(() => {
    if (screen !== 'cleanupComplete') return undefined;

    cleanupReclaimedOpacity.setValue(1);
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(cleanupReclaimedOpacity, {
          toValue: 0.12,
          duration: 620,
          useNativeDriver: true,
        }),
        Animated.timing(cleanupReclaimedOpacity, {
          toValue: 1,
          duration: 620,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [cleanupReclaimedOpacity, screen]);

  const formatYearRange = (range: MonthRange) => `${formatMonthLabel(range.from)}부터 ${formatMonthLabel(range.to)}까지`;
  const getPeriodLabel = () => `열람 ${formatMonthDuration(lastOpenedBeforeMonths)} 이상 · 수정 ${formatMonthDuration(lastModifiedBeforeMonths)} 이상`;
  const getDefaultPeriodLabel = () => `열람 ${formatMonthDuration(lastOpenedBeforeMonths)} · 수정 ${formatMonthDuration(lastModifiedBeforeMonths)}`;
  const clampMonthCondition = (value: number) => Math.max(1, Math.min(120, value));
  const updateMonthCondition = (type: 'opened' | 'modified', value: number) => {
    const setter = type === 'opened' ? setLastOpenedBeforeMonths : setLastModifiedBeforeMonths;
    setter(clampMonthCondition(value));
  };

  const isScanSetupScreen = (target: Screen) =>
    target === 'scanFlowSource' || target === 'scanFlowFolder' || target === 'scanFlowPeriod';

  const resetSettingsScanFlowNavigation = () => {
    setLastTabScreens((items) => ({
      ...items,
      home: isScanSetupScreen(items.home) ? 'home' : items.home,
      settings: 'defaultScan',
    }));
    setTabHistories((items) => ({ ...items, settings: ['settings'] }));
  };

  const openScanSourceSettings = () => {
    resetSettingsScanFlowNavigation();
    setScanSourceEditOnly(true);
    go('scanFlowSource');
  };

  const openPeriodSettings = () => {
    resetSettingsScanFlowNavigation();
    setPeriodEditOnly(true);
    go('scanFlowPeriod');
  };

  const getScanSourceLabel = () => {
    if (scanSources.folder) return `Drive · ${selectedDriveFolders.length ? selectedDriveFolders.join(', ') : 'None'}`;
    if (scanSources.gmail && scanSources.drive) return 'Gmail + Drive';
    if (scanSources.gmail) return 'Gmail';
    if (scanSources.drive) return 'Drive';
    return '선택된 서비스 없음';
  };

  const getSimpleScanSourceLabel = (sourceState = scanSources) => {
    if (sourceState.gmail && (sourceState.drive || sourceState.folder)) return 'Gmail + Drive';
    if (sourceState.gmail) return 'Gmail';
    if (sourceState.drive || sourceState.folder) return 'Drive';
    return '선택된 서비스 없음';
  };

  const getLiveScanResult = () =>
    buildScanResult({
      scanSources,
      selectedDriveFolders,
      selectedDriveFileIds: selectedDriveFiles,
      includeSubFolders,
      includeKeywords,
      excludeKeywords,
      selectedFileTypes,
      includeMailAttachments,
    });

  const resetToFreshStart = () => {
    setHistory([]);
    setLastTabScreens({ home: 'home', storage: 'storageMail', trash: 'storageTrash', history: 'analysisHistory', settings: 'settings' });
    setTabHistories({ home: [], storage: [], trash: [], history: [], settings: [] });
    setPrivacyChecked(false);
    setPrivacyDetailChecked(false);
    setPermissions({ gmail: false, drive: false, alarm: false });
    updateDisabledGooglePermissions({ gmail: false, drive: false });
    setApiAccessToken(null);
    setCurrentUser(null);
    latestRefreshTokenRef.current = null;
    void clearStoredAuthSession();
    setIncludeInput('');
    setExcludeInput('');
    setIncludeKeywords(['광고', '프로모션', '뉴스레터']);
    setExcludeKeywords(['영수증', '계약서']);
    setSelectedFileTypes({ PDF: true, DOCX: true, ZIP: true, JPG: true });
    setIncludeMailAttachments(false);
    setScanSources({ gmail: true, drive: false, folder: false });
    setDriveFolderSearch('');
    setDriveCurrentFolder(driveRootPath);
    setApiDriveFolderOptions([]);
    setApiDriveFolderIdsByPath({});
    setDriveFolderLoading(false);
    setDriveFolderError('');
    setStorageDriveFolder(driveRootPath);
    setStorageTrashMovedKeys([]);
    setStorageDeletedKeys([]);
    setStorageRestoredKeys([]);
    setStorageDriveMoveTargets({});
    setSelectedDriveFolders([]);
    setSelectedDriveFiles([]);
    setIncludeSubFolders(true);
    setLastOpenedBeforeMonths(36);
    setLastModifiedBeforeMonths(24);
    setCreatedBeforeMonths(6);
    setOpenedYearRange({ from: toMonthIndex(2023, 1), to: maxScanMonthIndex });
    setModifiedYearRange({ from: toMonthIndex(2022, 1), to: maxScanMonthIndex });
    setPeriodEditOnly(false);
    setScanSourceEditOnly(false);
    setChecked({});
    setScanProgress(0);
    setScanStatusText('메일 및 드라이브 데이터 수집중');
    setDeleteProgress(0);
    setDeleteJobStatus('idle');
    setDeleteStatusText('선택 항목을 휴지통으로 이동 중');
    setHomeScanNotice('none');
    setApiScanJobId(null);
    setApiCleanupJobId(null);
    setLastScan(null);
    setApiHomeSummary(null);
    setApiStorageSummary(null);
    setApiScanHistoryItems([]);
    setApiMonthlyStats([]);
    setApiStatisticsSummary(null);
    setApiCleanupHistoryItems([]);
    setApiBootstrapLoading(false);
    setApiScanSetting(null);
    setApiAnnouncements([]);
    setAnnouncementLoading(false);
    setAnnouncementError('');
    setPrivacyData(null);
    setPrivacyDataLoading(false);
    setPrivacyDataError('');
    setWithdrawSubmitting(false);
    registeredFcmTokenRef.current = '';
    setHasCompletedScan(false);
    setOnboardingGhostDone(false);
    setOnboardingCarbonDone(false);
    setConnectedDone(false);
    setConnectedStep(0);
    setHasSeenConnectedSuccess(false);
    setSkipConnectedAnimation(false);
    setWithdrawSheetVisible(false);
    setKeywordChoiceVisible(false);
    setKeywordSheetType(null);
    setYearSheetType(null);
    setSettingsToggles({
      scanComplete: true,
      aiNudge: true,
      marketing: false,
      autoScan: true,
    });
    replace('initial');
  };

  const formatScanDate = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hour = `${date.getHours()}`.padStart(2, '0');
    const minute = `${date.getMinutes()}`.padStart(2, '0');
    return `${year}.${month}.${day} ${hour}:${minute}`;
  };

  const showToast = (message: string, target?: Screen, duration = 1800) => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    setPermissionToast(message);
    setToastTarget(target ?? null);
    toastOpacity.setValue(0);
    Animated.timing(toastOpacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    }).start();

    toastTimer.current = setTimeout(() => {
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 360,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) {
          setPermissionToast((current) => (current === message ? '' : current));
          setToastTarget(null);
        }
      });
    }, duration);
  };

  const applyApiUser = (user?: AuraUser | null) => {
    if (!user) return;

    setCurrentUser(user);

    if (user.privacyConsentAgreed !== undefined) {
      setPrivacyChecked(user.privacyConsentAgreed);
      setPrivacyDetailChecked(user.privacyConsentAgreed);
    }

    if (user.permissions) {
      const disabled = disabledGooglePermissionsRef.current;
      setPermissions((items) => ({
        ...items,
        gmail: Boolean(user.permissions?.gmail ?? items.gmail) && !disabled.gmail,
        drive: Boolean(user.permissions?.drive ?? items.drive) && !disabled.drive,
        alarm: Boolean(user.permissions?.alarm ?? items.alarm),
      }));
    }
  };

  const rememberAuthSession = (
    accessToken?: string | null,
    refreshToken?: string | null,
    user?: AuraUser | null
  ) => {
    const nextRefreshToken = refreshToken ?? latestRefreshTokenRef.current;
    if (!nextRefreshToken) return;

    latestRefreshTokenRef.current = nextRefreshToken;
    void saveStoredAuthSession({
      accessToken: accessToken ?? apiAccessToken ?? undefined,
      refreshToken: nextRefreshToken,
      user: user ?? currentUser ?? undefined,
      privacyChecked,
    });
  };

  const applyApiScanSetting = (setting?: ApiScanSetting | null) => {
    if (!setting) return;

    const savedScanSource = setting.scan_source;

    setApiScanSetting(setting);
    setScanSources({
      gmail: savedScanSource === 'MAIL' || savedScanSource === 'MAIL_AND_DRIVE',
      drive: savedScanSource === 'DRIVE_ALL' || savedScanSource === 'MAIL_AND_DRIVE' || savedScanSource === 'DRIVE_FOLDER',
      folder: savedScanSource === 'DRIVE_FOLDER',
    });
    setIncludeSubFolders(Boolean(setting.include_subfolders ?? true));
    setIncludeMailAttachments(Boolean(setting.include_mail_attachment_size));
    setSettingsToggles((items) => ({
      ...items,
      autoScan: Boolean(setting.apply_recent_conditions ?? items.autoScan),
    }));

    if (setting.last_opened_before_months !== undefined && setting.last_opened_before_months !== null) {
      setLastOpenedBeforeMonths(setting.last_opened_before_months);
    }
    if (setting.last_modified_before_months !== undefined && setting.last_modified_before_months !== null) {
      setLastModifiedBeforeMonths(setting.last_modified_before_months);
    }
    if (setting.created_before_months !== undefined && setting.created_before_months !== null) {
      setCreatedBeforeMonths(setting.created_before_months);
    }
    if (Array.isArray(setting.include_keywords)) {
      setIncludeKeywords(setting.include_keywords);
    }
    if (Array.isArray(setting.exclude_keywords)) {
      setExcludeKeywords(setting.exclude_keywords);
    }
    if (Array.isArray(setting.file_extensions)) {
      const selected = setting.file_extensions.reduce<Record<string, boolean>>((acc, extension) => {
        acc[extension.replace(/^\./, '').toUpperCase()] = true;
        return acc;
      }, {});
      setSelectedFileTypes(selected);
    }
  };

  const getActiveDriveFolderOptions = () => (apiAccessToken ? apiDriveFolderOptions : []);

  const getSelectedDriveFolderId = () =>
    selectedDriveFolders.map((folderPath) => apiDriveFolderIdsByPath[folderPath]).find(Boolean) ?? selectedDriveFolders[0];

  const updateDisabledGooglePermissions = (
    updater:
      | { gmail: boolean; drive: boolean }
      | ((items: { gmail: boolean; drive: boolean }) => { gmail: boolean; drive: boolean })
  ) => {
    const next = typeof updater === 'function' ? updater(disabledGooglePermissionsRef.current) : updater;
    disabledGooglePermissionsRef.current = next;
    setDisabledGooglePermissions(next);
    return next;
  };

  const mergeDriveFolderOptions = (incoming: DriveFolderOption[]) => {
    if (!incoming.length) return;

    setApiDriveFolderOptions((items) => {
      const merged = new Map(items.map((item) => [item.name, item]));
      incoming.forEach((item) => {
        merged.set(item.name, { ...merged.get(item.name), ...item });
      });
      return Array.from(merged.values());
    });
    setApiDriveFolderIdsByPath((items) => {
      const next = { ...items };
      incoming.forEach((item) => {
        if (item.id) {
          next[item.name] = item.id;
        }
      });
      return next;
    });
  };

  const loadApiDriveFolders = async (parentPath = driveCurrentFolder) => {
    if (!apiAccessToken) return;
    if (loadedDriveFolderPaths.current.has(parentPath)) return;

    const parentId = parentPath === driveRootPath ? undefined : apiDriveFolderIdsByPath[parentPath];
    if (parentPath !== driveRootPath && !parentId) return;

    setDriveFolderLoading(true);
    setDriveFolderError('');

    try {
      const response = await scanApi.getDriveFolders({ parent_id: parentId, size: 50 }, { accessToken: apiAccessToken });
      const folders = (response.folders ?? []).filter((folder): folder is ApiDriveFolder & { name: string } => Boolean(folder.name));
      const nextFolders = folders.map((folder) => {
        const path = normalizeServerDrivePath(parentPath === driveRootPath ? `${driveRootPath} › ${folder.name}` : `${parentPath} › ${folder.name}`);
        return {
          id: folder.folder_id,
          parentId: parentPath,
          name: path,
          meta: 'Google Drive 폴더',
        };
      });
      mergeDriveFolderOptions(nextFolders);
      loadedDriveFolderPaths.current.add(parentPath);
    } catch {
      setDriveFolderError('Drive 폴더를 불러오지 못했어요. Google Drive 권한을 다시 연결하거나 재시도해주세요.');
    } finally {
      setDriveFolderLoading(false);
    }
  };

  const refreshGooglePermissions = async (tokenOverride?: string | null, showSuccessToast = true) => {
    const token = tokenOverride ?? apiAccessToken;
    if (!token) {
      showToast('로그인 후 권한 상태를 확인할 수 있어요');
      return;
    }

    setGooglePermissionChecking(true);
    try {
      const response = await googleApi.recheckPermissions({ accessToken: token });
      const next = getGooglePermissionFlags(response);
      setPermissions((items) => ({
        ...items,
        gmail: next.hasGmail ? next.gmail : items.gmail,
        drive: next.hasDrive ? next.drive : items.drive,
      }));
      if (showSuccessToast) {
        showToast('Google 권한 상태를 다시 확인했어요');
      }
      return next;
    } catch {
      showToast('Google 권한 상태 확인에 실패했어요');
      return null;
    } finally {
      setGooglePermissionChecking(false);
    }
  };

  const requestGoogleReconnect = async (serviceTypes: GoogleServiceType[]) => {
    if (!apiAccessToken) {
      showToast('로그인 후 Google 권한을 다시 연결할 수 있어요');
      return false;
    }

    setGooglePermissionChecking(true);
    try {
      if (Platform.OS !== 'web' && !isAndroidExpoGo()) {
        try {
          const googleSignInModule = await loadGoogleSignInModule();
          const { GoogleSignin } = googleSignInModule;
          configureGoogleSignin(GoogleSignin);
          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
          const googleSession = await GoogleSignin.signIn();
          const serverAuthCode = extractServerAuthCode(googleSession);

          if (serverAuthCode) {
            const session = await authApi.loginWithGoogle({
              server_auth_code: serverAuthCode,
              platform: getAuraPlatform(),
            });
            const nextAccessToken = session.accessToken ?? apiAccessToken;
            updateDisabledGooglePermissions((items) => ({
              ...items,
              gmail: serviceTypes.includes('GMAIL') ? false : items.gmail,
              drive: serviceTypes.includes('DRIVE') ? false : items.drive,
            }));
            rememberAuthSession(nextAccessToken, session.refreshToken, session.user);

            if (session.accessToken) {
              setApiAccessToken(session.accessToken);
            }
            if (session.user) {
              applyApiUser(session.user);
            }
            if (nextAccessToken) {
              await refreshGooglePermissions(nextAccessToken, false);
              void refreshAuraApis(nextAccessToken);
            }

            pendingGoogleReconnectServices.current = null;
            showToast('Google 권한 연결을 확인했어요');
            return true;
          }
        } catch {
          // 네이티브 재연결이 실패하면 서버 OAuth URL 흐름으로 이어간다.
        }
      }

      const response = await googleApi.createReconnectUrl(
        {
          service_types: serviceTypes,
          redirect_uri: GOOGLE_OAUTH_REDIRECT_URI,
        },
        { accessToken: apiAccessToken }
      );

      const reconnectUrl = response.authorization_url ?? response.auth_url;
      if (!reconnectUrl) {
        showToast('Google 권한 요청 URL이 내려오지 않았어요');
        return false;
      }

      pendingGoogleReconnectServices.current = serviceTypes;
      updateDisabledGooglePermissions((items) => ({
        ...items,
        gmail: serviceTypes.includes('GMAIL') ? false : items.gmail,
        drive: serviceTypes.includes('DRIVE') ? false : items.drive,
      }));
      await Linking.openURL(reconnectUrl);
      return true;
    } catch {
      showToast('Google 권한 재연결을 시작하지 못했어요');
      return false;
    } finally {
      setGooglePermissionChecking(false);
    }
  };

  const enableGoogleServicePermission = async (serviceType: GoogleServiceType) => {
    if (!apiAccessToken) {
      showToast('로그인 후 Google 권한 상태를 변경할 수 있어요');
      return false;
    }

    const key = getGoogleServicePermissionKey(serviceType);

    setGooglePermissionChecking(true);
    try {
      await googleApi.updatePermission(
        serviceType,
        { is_connected: true },
        { accessToken: apiAccessToken }
      );
      updateDisabledGooglePermissions((items) => ({ ...items, [key]: false }));
      clearStorageServerPageCache();
      const rechecked = await refreshGooglePermissions(apiAccessToken, false);
      const isConnected = serviceType === 'GMAIL' ? Boolean(rechecked?.gmail) : Boolean(rechecked?.drive);
      void refreshAuraApis(apiAccessToken);

      if (!isConnected) {
        setPermissions((items) => ({ ...items, [key]: false }));
        showToast(`${getGoogleServiceLabel(serviceType)} 권한 재연결이 필요해요`, undefined, 2600);
        return false;
      }

      setScanSources((items) =>
        serviceType === 'GMAIL'
          ? { ...items, gmail: true }
          : { ...items, drive: true }
      );
      showToast(`${getGoogleServiceLabel(serviceType)} 접근을 허용했어요`);
      return true;
    } catch (error) {
      showToast(getErrorMessage(error, `${getGoogleServiceLabel(serviceType)} 접근 허용에 실패했어요`), undefined, 2800);
      return false;
    } finally {
      setGooglePermissionChecking(false);
    }
  };

  const disableGoogleServicePermission = async (serviceType: GoogleServiceType) => {
    if (!apiAccessToken) {
      showToast('로그인 후 Google 권한 상태를 변경할 수 있어요');
      return false;
    }

    const key = getGoogleServicePermissionKey(serviceType);

    setGooglePermissionChecking(true);
    try {
      await googleApi.updatePermission(
        serviceType,
        { is_connected: false },
        { accessToken: apiAccessToken }
      );

      updateDisabledGooglePermissions((items) => ({ ...items, [key]: true }));
      setPermissions((items) => ({ ...items, [key]: false }));

      if (serviceType === 'GMAIL') {
        setScanSources((items) => ({ ...items, gmail: false }));
      } else {
        setScanSources((items) => ({ ...items, drive: false, folder: false }));
        setSelectedDriveFolders([]);
        setSelectedDriveFiles([]);
        setApiDriveFolderOptions([]);
        setApiDriveFolderIdsByPath({});
        loadedDriveFolderPaths.current.clear();
      }

      clearStorageServerPageCache();
      setApiHomeSummary((summary) =>
        summary
          ? {
              ...summary,
              permissions: {
                ...(summary.permissions ?? {}),
                [serviceType === 'GMAIL' ? 'gmail_status' : 'drive_status']: 'DISCONNECTED',
              },
            }
          : summary
      );
      await refreshGooglePermissions(apiAccessToken, false);
      void refreshAuraApis(apiAccessToken);
      showToast(`${getGoogleServiceLabel(serviceType)} 접근을 해제했어요`);
      return true;
    } catch (error) {
      showToast(getErrorMessage(error, `${getGoogleServiceLabel(serviceType)} 접근 해제에 실패했어요`), undefined, 2800);
      return false;
    } finally {
      setGooglePermissionChecking(false);
    }
  };

  const handleGoogleOAuthRedirect = async (url: string) => {
    if (!url.startsWith(GOOGLE_OAUTH_REDIRECT_URI)) return;

    const authorizationCode = getUrlQueryParam(url, 'code');
    if (!authorizationCode || handledGoogleOauthCodes.current.has(authorizationCode)) return;

    handledGoogleOauthCodes.current.add(authorizationCode);
    setGooglePermissionChecking(true);

    try {
      const session = await authApi.loginWithGoogle({
        authorization_code: authorizationCode,
        redirect_uri: GOOGLE_OAUTH_REDIRECT_URI,
        platform: getAuraPlatform(),
      });
      const nextAccessToken = session.accessToken ?? apiAccessToken;
      const reconnectServices = pendingGoogleReconnectServices.current;
      if (reconnectServices?.length) {
        updateDisabledGooglePermissions((items) => ({
          ...items,
          gmail: reconnectServices.includes('GMAIL') ? false : items.gmail,
          drive: reconnectServices.includes('DRIVE') ? false : items.drive,
        }));
      }
      rememberAuthSession(nextAccessToken, session.refreshToken, session.user);

      if (session.accessToken) {
        setApiAccessToken(session.accessToken);
      }
      if (session.user) {
        applyApiUser(session.user);
      }
      if (nextAccessToken) {
        await refreshGooglePermissions(nextAccessToken, false);
        void refreshAuraApis(nextAccessToken);
      }

      pendingGoogleReconnectServices.current = null;
      showToast('Google 권한 연결을 확인했어요');
    } catch (error) {
      showToast(getErrorMessage(error, 'Google 권한 연결 확인에 실패했어요'), undefined, 2800);
    } finally {
      setGooglePermissionChecking(false);
    }
  };

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleGoogleOAuthRedirect(url);
    });

    void Linking.getInitialURL().then((url) => {
      if (url) void handleGoogleOAuthRedirect(url);
    });

    return () => subscription.remove();
  }, [apiAccessToken]);

  const registerFcmTokenWithServer = async (tokenData?: unknown) => {
    if (
      !apiAccessToken ||
      !permissions.alarm ||
      Platform.OS === 'web' ||
      isAndroidExpoGo() ||
      fcmRegistrationInFlight.current
    ) {
      return;
    }

    fcmRegistrationInFlight.current = true;
    try {
      if (!Device.isDevice) return;

      const Notifications = await loadNotificationsModule();
      await configureAuraNotificationChannel(Notifications);

      let permission = await Notifications.getPermissionsAsync();
      if (!isExpoNotificationPermissionGranted(permission, Notifications)) {
        permission = await Notifications.requestPermissionsAsync();
      }
      if (!isExpoNotificationPermissionGranted(permission, Notifications)) return;

      const token = serializePushTokenData(
        tokenData !== undefined ? tokenData : (await Notifications.getDevicePushTokenAsync()).data
      );
      const registrationKey = `${apiAccessToken}:${token}`;

      if (!token || registeredFcmTokenRef.current === registrationKey) return;

      await notificationApi.registerFcmToken(
        {
          fcm_token: token,
          device_identifier: `${getAuraPlatform()}:${getAuraDeviceId()}:${getAuraAppVersion() ?? '1.0.0'}`,
        },
        { accessToken: apiAccessToken }
      );
      registeredFcmTokenRef.current = registrationKey;
    } catch {
      // 토큰 등록 실패가 알림 설정 저장 자체를 막지는 않게 한다.
    } finally {
      fcmRegistrationInFlight.current = false;
    }
  };

  const loadAnnouncements = async () => {
    setAnnouncementLoading(true);
    setAnnouncementError('');
    try {
      const response = await announcementApi.getList({ page: 0, size: 20 }, { accessToken: apiAccessToken });
      setApiAnnouncements(response.content ?? []);
    } catch (error) {
      setAnnouncementError(getErrorMessage(error, '공지사항을 불러오지 못했어요'));
    } finally {
      setAnnouncementLoading(false);
    }
  };

  const loadPrivacyData = async () => {
    if (!apiAccessToken) {
      setPrivacyData(null);
      setPrivacyDataError('로그인 후 개인정보 데이터를 확인할 수 있어요');
      return;
    }

    setPrivacyDataLoading(true);
    setPrivacyDataError('');
    try {
      const data = await userApi.getPrivacyData({ accessToken: apiAccessToken });
      setPrivacyData(data ?? null);
    } catch (error) {
      setPrivacyDataError(getErrorMessage(error, '개인정보 데이터를 불러오지 못했어요'));
    } finally {
      setPrivacyDataLoading(false);
    }
  };

  const confirmWithdraw = async () => {
    if (!checked.withdrawConfirm) {
      showToast('탈퇴 확인 체크가 필요합니다');
      return;
    }

    if (!apiAccessToken) {
      resetToFreshStart();
      return;
    }

    setWithdrawSubmitting(true);
    try {
      await userApi.withdraw(
        {
          reason: 'User requested withdrawal in app',
          scan_data_policy: 'DELETE',
          history_data_policy: 'DELETE',
          withdrawal_confirmed: true,
        },
        { accessToken: apiAccessToken }
      );
      closeWithdrawSheet();
      resetToFreshStart();
    } catch (error) {
      showToast(getErrorMessage(error, '서비스 탈퇴 요청에 실패했어요'), undefined, 3200);
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  const refreshAuraApis = async (token: string) => {
    setApiBootstrapLoading(true);
    const options = { accessToken: token };

    try {
      const [
        homeResult,
        googlePermissionsResult,
        notificationSettingsResult,
        scanSettingsResult,
        runningScanResult,
        runningCleanupResult,
        scanHistoryResult,
        statisticsSummaryResult,
        monthlyStatsResult,
        cleanupHistoriesResult,
        mailStorageResult,
        driveStorageResult,
        mailTrashResult,
        driveTrashResult,
      ] = await Promise.allSettled([
        homeApi.getSummary(options),
        googleApi.getPermissions(options),
        notificationApi.getSettings(options),
        scanApi.getSettings(options),
        scanApi.getRunning(options),
        cleanupApi.getRunning(options),
        scanApi.getHistory({ page: 0, size: 20 }, options),
        statisticsApi.getSummary(options),
        statisticsApi.getMonthly(undefined, options),
        statisticsApi.getCleanupHistories({ page: 0, size: 20 }, options),
        storageApi.getItems({ item_source: 'GMAIL', page: 0, size: 20 }, options),
        storageApi.getItems({ item_source: 'DRIVE', page: 0, size: 20 }, options),
        storageApi.getTrash({ item_source: 'GMAIL', page: 0, size: 20 }, options),
        storageApi.getTrash({ item_source: 'DRIVE', page: 0, size: 20 }, options),
      ]);

      const homeSummary = homeResult.status === 'fulfilled' ? homeResult.value : null;
      const scanHistory = scanHistoryResult.status === 'fulfilled' ? scanHistoryResult.value.content ?? [] : [];
      const storageMail = mailStorageResult.status === 'fulfilled' ? mailStorageResult.value.content ?? [] : [];
      const storageDrive = driveStorageResult.status === 'fulfilled' ? driveStorageResult.value.content ?? [] : [];
      const trashMail = mailTrashResult.status === 'fulfilled' ? mailTrashResult.value.content ?? [] : [];
      const trashDrive = driveTrashResult.status === 'fulfilled' ? driveTrashResult.value.content ?? [] : [];
      const saveStoragePageCache = (key: string, result: PromiseSettledResult<ApiPage<ApiStorageItem>>) => {
        if (result.status !== 'fulfilled') return;

        storageServerPageCache[key] = {
          items: result.value.content ?? [],
          page: result.value.page ?? 0,
          size: result.value.size ?? 20,
          totalElements: result.value.total_elements ?? result.value.content?.length ?? 0,
          totalPages: result.value.total_pages ?? 1,
        };
      };

      saveStoragePageCache(`${token}:storageMail:GMAIL:0`, mailStorageResult);
      saveStoragePageCache(`${token}:storageDrive:DRIVE:0`, driveStorageResult);
      saveStoragePageCache(`${token}:storageTrash:GMAIL:0`, mailTrashResult);
      saveStoragePageCache(`${token}:storageDriveTrash:DRIVE:0`, driveTrashResult);
      const latestScan = homeSummary?.latest_scan;
      const isLatestScanCanceled = latestScan?.job_status === 'CANCELED';
      const latestCompletedHistory = isLatestScanCanceled ? undefined : scanHistory.find((item) => isCompletedScanStatus(item.job_status));
      const latestHistory = isLatestScanCanceled ? undefined : latestCompletedHistory ?? scanHistory[0];
      const latestCleanup = homeSummary?.latest_cleanup;
      const latestScanForResult = isCompletedScanStatus(latestScan?.job_status) ? latestScan : latestCompletedHistory;
      const latestScanId = latestScanForResult?.scan_job_id ?? latestHistory?.scan_job_id;
      const latestScanStatus = latestScanForResult?.job_status ?? latestHistory?.job_status;
      let latestAnalysisSummary: ApiAnalysisSummary | null = null;
      let latestCandidates: ApiCandidate[] = [];

      if (latestScanId && isCompletedScanStatus(latestScanStatus)) {
        const bundle = await fetchApiScanResultBundle(latestScanId, token);
        latestAnalysisSummary = bundle.analysisSummary;
        latestCandidates = bundle.candidates;
      }

      const estimatedBytes =
        latestAnalysisSummary?.total_estimated_reclaim_bytes ??
        latestScanForResult?.estimated_reclaim_bytes ??
        latestHistory?.estimated_reclaim_bytes ??
        homeSummary?.storage_summary?.estimated_reclaim_bytes;
      const candidateCount = latestAnalysisSummary?.total_candidate_count ?? latestScanForResult?.candidate_count ?? latestHistory?.candidate_count;
      const latestScanCompletedAt =
        latestScanForResult && 'completed_at' in latestScanForResult ? latestScanForResult.completed_at : undefined;
      const latestScanStartedAt =
        latestScanForResult && 'started_at' in latestScanForResult ? latestScanForResult.started_at : undefined;
      const completedAt = latestScanCompletedAt ?? latestHistory?.created_at ?? latestScanStartedAt;
      const source = latestScanForResult?.scan_source ?? latestHistory?.scan_source;
      const apiSummary = buildApiScanSummary({
        candidates: latestCandidates,
        analysisSummary: latestAnalysisSummary,
        storageMailItems: storageMail,
        storageDriveItems: storageDrive,
        trashMailItems: [...trashMail, ...trashDrive],
        estimatedBytes,
        candidateCount,
        carbonGrams: latestCleanup?.estimated_carbon_grams ?? latestHistory?.estimated_carbon_grams ?? homeSummary?.storage_summary?.total_estimated_carbon_grams,
      });
      const currentSummary = scanResultRef.current;
      const currentHasCandidateRows = Boolean(
        currentSummary.mailItems.length ||
        currentSummary.driveItems.length ||
        currentSummary.largeItems.length ||
        currentSummary.protectedItems.length
      );
      const apiHasCandidateRows = Boolean(
        apiSummary.mailItems.length ||
        apiSummary.driveItems.length ||
        apiSummary.largeItems.length ||
        apiSummary.protectedItems.length
      );
      const hasLatestCompletedScanResult = Boolean(latestScanId && isCompletedScanStatus(latestScanStatus));
      const shouldPreserveCurrentScanRows =
        (hasCompletedScan || homeScanNotice === 'completed') &&
        currentHasCandidateRows &&
        (!hasLatestCompletedScanResult || (apiSummary.candidateCount > 0 && !apiHasCandidateRows));
      const nextApiSummary = shouldPreserveCurrentScanRows
        ? {
            ...currentSummary,
            categorySummaries: apiSummary.categorySummaries.length ? apiSummary.categorySummaries : currentSummary.categorySummaries,
            storageMailItems: apiSummary.storageMailItems,
            storageDriveItems: apiSummary.storageDriveItems,
            storageTrashItems: apiSummary.storageTrashItems,
          }
        : apiSummary;

      setApiHomeSummary(homeSummary);
      scanResultRef.current = nextApiSummary;
      setApiStorageSummary(nextApiSummary);
      setApiScanHistoryItems(scanHistory);
      setApiStatisticsSummary(statisticsSummaryResult.status === 'fulfilled' ? statisticsSummaryResult.value : null);
      setApiCleanupHistoryItems(cleanupHistoriesResult.status === 'fulfilled' ? cleanupHistoriesResult.value.content ?? [] : []);

      if (homeSummary?.permissions) {
        const disabled = disabledGooglePermissionsRef.current;
        setPermissions((items) => ({
          ...items,
          gmail: homeSummary.permissions?.gmail_status === 'CONNECTED' && !disabled.gmail,
          drive: homeSummary.permissions?.drive_status === 'CONNECTED' && !disabled.drive,
        }));
      }

      if (googlePermissionsResult.status === 'fulfilled') {
        const next = getGooglePermissionFlags(googlePermissionsResult.value);
        const disabled = disabledGooglePermissionsRef.current;
        setPermissions((items) => ({
          ...items,
          gmail: next.hasGmail ? next.gmail && !disabled.gmail : items.gmail,
          drive: next.hasDrive ? next.drive && !disabled.drive : items.drive,
        }));
      }

      if (notificationSettingsResult.status === 'fulfilled') {
        setSettingsToggles((items) => ({
          ...items,
          scanComplete: Boolean(notificationSettingsResult.value.is_scan_complete_enabled),
          aiNudge: Boolean(notificationSettingsResult.value.is_scan_recommend_enabled),
        }));
        setPermissions((items) => ({
          ...items,
          alarm: Boolean(notificationSettingsResult.value.is_scan_complete_enabled || notificationSettingsResult.value.is_scan_recommend_enabled),
        }));
      }

      if (scanSettingsResult.status === 'fulfilled') {
        applyApiScanSetting(scanSettingsResult.value);
      }

      if (monthlyStatsResult.status === 'fulfilled') {
        setApiMonthlyStats(monthlyStatsResult.value.months ?? []);
      }

      if (runningScanResult.status === 'fulfilled' && runningScanResult.value.scan_job) {
        setHomeScanNotice('running');
        setScanProgress(Math.round(runningScanResult.value.scan_job.progress_percent ?? 0));
        setApiScanJobId(runningScanResult.value.scan_job.scan_job_id ?? null);
        activeApiScanJobId.current = runningScanResult.value.scan_job.scan_job_id ?? null;
        scanSourceLabelRef.current = apiScanSourceLabel(runningScanResult.value.scan_job.scan_source);
      } else if (latestScanId && isCompletedScanStatus(latestScanStatus)) {
        setApiScanJobId(latestScanId);
        activeApiScanJobId.current = latestScanId;
      }

      if (runningCleanupResult.status === 'fulfilled' && runningCleanupResult.value.cleanup_job) {
        const runningCleanupJob = runningCleanupResult.value.cleanup_job;
        setDeleteJobStatus('running');
        setDeleteProgress(Math.max(0, Math.min(100, Math.round(runningCleanupJob.progress_percent ?? 0))));
        setApiCleanupJobId(runningCleanupJob.cleanup_job_id ?? null);
        activeApiCleanupJobId.current = runningCleanupJob.cleanup_job_id ?? null;
        setDeleteStatusText(
          runningCleanupJob.action_type === 'RESTORE_FROM_TRASH'
            ? '선택 항목을 정리함으로 복구 중'
            : '선택 항목을 휴지통으로 이동 중'
        );
      }

      if (latestScanForResult || latestHistory) {
        setLastScan({
          dateLabel: formatApiDate(completedAt ?? latestCleanup?.completed_at),
          sourceLabel: apiScanSourceLabel(source),
          conditionLabel: apiScanSetting ? getPeriodLabel() : 'Swagger API 기준',
          result: apiSummary,
        });
        setHasCompletedScan(isCompletedScanStatus(latestScanStatus));
      } else if (!homeSummary?.has_running_scan) {
        setLastScan(null);
        setHasCompletedScan(false);
      }
    } finally {
      setApiBootstrapLoading(false);
    }
  };

  useEffect(() => {
    if (DEV_AURA_ACCESS_TOKEN || authRestoreAttempted.current) return;

    authRestoreAttempted.current = true;
    let mounted = true;

    const restoreAuthSession = async () => {
      const storedSession = await readStoredAuthSession();
      if (!mounted || !storedSession?.refreshToken) return;

      latestRefreshTokenRef.current = storedSession.refreshToken;
      if (storedSession.accessToken) {
        setApiAccessToken(storedSession.accessToken);
      }
      if (storedSession.user) {
        applyApiUser(storedSession.user);
      }
      if (storedSession.privacyChecked) {
        setPrivacyChecked(true);
        setPrivacyDetailChecked(true);
      }

      setAuthLoading(true);
      try {
        const refreshedSession = await authApi.refresh(storedSession.refreshToken);
        if (!mounted) return;

        const nextAccessToken = refreshedSession.accessToken ?? storedSession.accessToken ?? null;
        const nextRefreshToken = refreshedSession.refreshToken ?? storedSession.refreshToken;
        let nextUser = storedSession.user ?? null;

        latestRefreshTokenRef.current = nextRefreshToken;
        if (nextAccessToken) {
          setApiAccessToken(nextAccessToken);
          try {
            nextUser = await userApi.getMe({ accessToken: nextAccessToken });
            if (mounted) {
              applyApiUser(nextUser);
            }
          } catch {
            if (storedSession.user) {
              applyApiUser(storedSession.user);
            }
          }

          await saveStoredAuthSession({
            accessToken: nextAccessToken,
            refreshToken: nextRefreshToken,
            user: nextUser ?? undefined,
            privacyChecked: true,
          });
          replace('home');
          void refreshAuraApis(nextAccessToken);
        }
      } catch {
        latestRefreshTokenRef.current = null;
        await clearStoredAuthSession();
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    };

    void restoreAuthSession();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!DEV_AURA_ACCESS_TOKEN || devAccessTokenApplied.current) return;

    devAccessTokenApplied.current = true;
    setApiAccessToken(DEV_AURA_ACCESS_TOKEN);
    setCurrentUser((user) => user ?? { email: 'ejunwon1004@gmail.com', name: 'AURA 사용자' });
    setPrivacyChecked(true);
    setPrivacyDetailChecked(true);
    replace('home');

    void userApi
      .getMe({ accessToken: DEV_AURA_ACCESS_TOKEN })
      .then((user) => {
        applyApiUser(user);
        void refreshAuraApis(DEV_AURA_ACCESS_TOKEN);
      })
      .catch(() => {
        showToast('개발용 AURA access token을 확인해주세요');
      });
  }, []);

  const syncUserPermissions = async (nextPermissions: Partial<AuraServicePermissions>) => {
    updateDisabledGooglePermissions((items) => ({
      ...items,
      gmail: nextPermissions.gmail === true ? false : nextPermissions.gmail === false ? true : items.gmail,
      drive: nextPermissions.drive === true ? false : nextPermissions.drive === false ? true : items.drive,
    }));
    setPermissions((items) => ({ ...items, ...nextPermissions }));
  };

  const handleGoogleContinue = async () => {
    if (!privacyChecked) {
      showToast('개인정보 수집 및 분석 동의가 필요합니다');
      return;
    }

    setAuthLoading(true);

    try {
      const authorizationCode = '';

      if (!authorizationCode) {
        showToast('Google OAuth authorization_code와 redirect URI 연결이 필요해요');
        go('permissions');
        return;
      }

      const session = await authApi.loginWithGoogle({
        authorization_code: authorizationCode,
        redirect_uri: GOOGLE_OAUTH_REDIRECT_URI,
        platform: getAuraPlatform(),
      });

      const nextAccessToken = session.accessToken ?? null;
      setApiAccessToken(nextAccessToken);
      rememberAuthSession(nextAccessToken, session.refreshToken, session.user);

      if (session.user) {
        applyApiUser(session.user);
      } else if (nextAccessToken) {
        const user = await userApi.getMe({ accessToken: nextAccessToken });
        applyApiUser(user);
        rememberAuthSession(nextAccessToken, session.refreshToken, user);
      }

      if (nextAccessToken && privacyChecked) {
        await userApi.saveConsent(
          {
            is_privacy_agreed: true,
            is_ai_analysis_agreed: true,
            is_metadata_only_agreed: true,
            is_user_approval_required_agreed: true,
            consent_version: 'v1.0',
          },
          { accessToken: nextAccessToken }
        );
      }
      if (nextAccessToken) {
        void refreshAuraApis(nextAccessToken);
      }
    } catch {
      showToast('API 서버 연결 실패: 시연 모드로 계속합니다');
    } finally {
      setAuthLoading(false);
      go('permissions');
    }
  };

  const handleNativeGoogleContinue = async () => {
    if (!privacyChecked) {
      showToast('Privacy consent is required.');
      return;
    }

    setAuthLoading(true);
    let isGoogleSignInError: GoogleSignInModule['isErrorWithCode'] | null = null;
    let googleStatusCodes: GoogleSignInModule['statusCodes'] | null = null;

    try {
      if (!GOOGLE_WEB_CLIENT_ID) {
        showToast('Google Web Client ID is missing.');
        return;
      }

      const googleSignInModule = await loadGoogleSignInModule();
      const { GoogleSignin } = googleSignInModule;
      isGoogleSignInError = googleSignInModule.isErrorWithCode;
      googleStatusCodes = googleSignInModule.statusCodes;

      configureGoogleSignin(GoogleSignin);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const googleSession = await GoogleSignin.signIn();
      const serverAuthCode = extractServerAuthCode(googleSession);

      if (!serverAuthCode) {
        showToast('Google server auth code was not returned.');
        return;
      }

      const session = await authApi.loginWithGoogle({
        server_auth_code: serverAuthCode,
        platform: getAuraPlatform(),
      });

      const nextAccessToken = session.accessToken ?? null;
      setApiAccessToken(nextAccessToken);
      rememberAuthSession(nextAccessToken, session.refreshToken, session.user);

      if (session.user) {
        applyApiUser(session.user);
      } else if (nextAccessToken) {
        const user = await userApi.getMe({ accessToken: nextAccessToken });
        applyApiUser(user);
        rememberAuthSession(nextAccessToken, session.refreshToken, user);
      }

      if (nextAccessToken && privacyChecked) {
        await userApi.saveConsent(
          {
            is_privacy_agreed: true,
            is_ai_analysis_agreed: true,
            is_metadata_only_agreed: true,
            is_user_approval_required_agreed: true,
            consent_version: 'v1.0',
          },
          { accessToken: nextAccessToken }
        );
      }
      if (nextAccessToken) {
        void refreshAuraApis(nextAccessToken);
      }

      go('permissions');
    } catch (error) {
      if (isGoogleSignInError?.(error) && googleStatusCodes) {
        const googleError = error as { code?: string; message?: string };

        if (googleError.code === googleStatusCodes.SIGN_IN_CANCELLED) {
          return;
        }

        if (googleError.code === googleStatusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          showToast('Google Play Services is not available.');
          return;
        }
      }

      const googleError = error as { code?: string; message?: string };
      const errorDetail = [googleError.code, googleError.message].filter(Boolean).join(' / ');
      showToast(errorDetail ? `Google 로그인 실패: ${errorDetail}` : 'Google 로그인에 실패했어요.');
    } finally {
      setAuthLoading(false);
    }
  };

  const showPermissionToast = () => {
    showToast('Gmail 또는 Google Drive의 접근 권한을 허용해주세요');
  };

  const requestPushPermission = async () => {
    if (Platform.OS !== 'web') {
      if (isAndroidExpoGo()) {
        setPermissions((items) => ({ ...items, alarm: false }));
        setSettingsToggles((items) => ({ ...items, scanComplete: false, aiNudge: false }));
        showToast('Expo Go에서는 FCM 알림을 테스트할 수 없어요. APK로 확인해주세요');
        return false;
      }

      const acceptedAppPrompt = Platform.OS === 'android'
        ? await new Promise<boolean>((resolve) => {
        Alert.alert(
          'AURA 푸시 알림',
          '스캔 완료와 정리 권장 알림을 받을 수 있도록 알림 권한을 허용해주세요.',
          [
            {
              text: '허용 안 함',
              style: 'cancel',
              onPress: () => resolve(false),
            },
            {
              text: '허용',
              onPress: () => resolve(true),
            },
          ],
          { cancelable: false }
        );
        })
        : true;

      if (!acceptedAppPrompt) {
        setPermissions((items) => ({ ...items, alarm: false }));
        setSettingsToggles((items) => ({ ...items, scanComplete: false, aiNudge: false }));
        showToast('푸시 알림 권한이 허용되지 않았어요');
        return false;
      }

      try {
        const Notifications = await loadNotificationsModule();
        await configureAuraNotificationChannel(Notifications);

        let permission = await Notifications.getPermissionsAsync();
        if (!isExpoNotificationPermissionGranted(permission, Notifications)) {
          permission = await Notifications.requestPermissionsAsync();
        }

        const allowed = isExpoNotificationPermissionGranted(permission, Notifications);

        setPermissions((items) => ({ ...items, alarm: allowed }));
        setSettingsToggles((items) => ({ ...items, scanComplete: allowed, aiNudge: allowed }));
        if (allowed) {
          void registerFcmTokenWithServer();
        } else {
          showToast('푸시 알림 권한이 허용되지 않았어요');
        }
        return allowed;
      } catch {
        setPermissions((items) => ({ ...items, alarm: false }));
        setSettingsToggles((items) => ({ ...items, scanComplete: false, aiNudge: false }));
        showToast('푸시 알림 권한이 허용되지 않았어요');
        return false;
      }
    }

    const maybeNotification = (globalThis as unknown as {
      Notification?: {
        permission: string;
        requestPermission?: () => Promise<string>;
      };
    }).Notification;

    if (maybeNotification?.requestPermission) {
      const result = await maybeNotification.requestPermission();
      const allowed = result === 'granted';

      setPermissions((items) => ({ ...items, alarm: allowed }));
      setSettingsToggles((items) => ({ ...items, scanComplete: allowed, aiNudge: allowed }));
      if (!allowed) {
        showToast('푸시 알림 권한이 허용되지 않았어요');
      }
      return allowed;
    }

    setPermissions((items) => ({ ...items, alarm: true }));
    setSettingsToggles((items) => ({ ...items, scanComplete: true, aiNudge: true }));
    return true;
  };

  const togglePushPermissionConsent = () => {
    if (permissions.alarm) {
      setPermissions((items) => ({ ...items, alarm: false }));
      setSettingsToggles((items) => ({ ...items, scanComplete: false, aiNudge: false }));
      return;
    }

    void requestPushPermission();
  };

  useEffect(() => {
    if (!apiAccessToken) return;

    void notificationApi
      .saveSettings(
        {
          is_scan_complete_enabled: settingsToggles.scanComplete,
          is_scan_recommend_enabled: settingsToggles.aiNudge,
        },
        { accessToken: apiAccessToken }
      )
      .catch(() => undefined);
  }, [apiAccessToken, settingsToggles.scanComplete, settingsToggles.aiNudge]);

  useEffect(() => {
    if (!apiAccessToken || !permissions.alarm || (!settingsToggles.scanComplete && !settingsToggles.aiNudge)) return;
    void registerFcmTokenWithServer();
  }, [apiAccessToken, permissions.alarm, settingsToggles.scanComplete, settingsToggles.aiNudge]);

  useEffect(() => {
    if (screen === 'notice') {
      void loadAnnouncements();
    }
  }, [screen, apiAccessToken]);

  useEffect(() => {
    if (screen === 'privacyData') {
      void loadPrivacyData();
    }
  }, [screen, apiAccessToken]);

  const completeLoginPermissionSetup = () => {
    void syncUserPermissions({ gmail: true, drive: true, alarm: permissions.alarm });
    if (!permissions.alarm) {
      setSettingsToggles((items) => ({ ...items, scanComplete: false, aiNudge: false }));
    }
    setScanSources({ gmail: true, drive: false, folder: false });
    go('connected');
  };

  const handleInitialPrivacyPress = () => {
    if (privacyChecked) {
      setPrivacyChecked(false);
      setPrivacyDetailChecked(false);
      return;
    }

    go('privacy');
  };

  const acceptPrivacyDetailConsent = () => {
    setPrivacyChecked(true);
    setPrivacyDetailChecked(true);
    back();
  };

  const openCompletedScanResult = () => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    setPermissionToast('');
    setToastTarget(null);
    replace('candidateSummary');
  };

  const getCurrentScanResult = () => apiStorageSummary ?? lastScan?.result ?? (apiAccessToken ? emptyScanSummary : scanResultRef.current);

  const getLatestCompletedScanJobId = () => {
    if (hasCompletedScan || homeScanNotice === 'completed') {
      if (activeApiScanJobId.current) return activeApiScanJobId.current;
      if (apiScanJobId) return apiScanJobId;
    }

    const latestScan = apiHomeSummary?.latest_scan;
    if (latestScan?.scan_job_id && isCompletedScanStatus(latestScan.job_status)) {
      return latestScan.scan_job_id;
    }

    return apiScanHistoryItems.find((item) => item.scan_job_id && isCompletedScanStatus(item.job_status))?.scan_job_id ?? null;
  };

  const fetchApiScanResultBundle = async (scanJobId: number, accessToken: string) => {
    const [analysisSummaryResult, candidatesResult] = await Promise.allSettled([
      scanApi.getAnalysisSummary(scanJobId, { accessToken }),
      fetchAllScanCandidates(scanJobId, accessToken),
    ]);
    const analysisSummary = analysisSummaryResult.status === 'fulfilled' ? analysisSummaryResult.value : null;
    let candidates = candidatesResult.status === 'fulfilled' ? candidatesResult.value : [];
    let candidateFetchFailed = candidatesResult.status === 'rejected';
    const expectedCandidateCount = analysisSummary?.total_candidate_count ?? 0;

    if (!candidates.length && expectedCandidateCount > 0) {
      const selectedCandidatesResult = await Promise.allSettled([
        scanApi.getSelectedCandidates(scanJobId, { accessToken }),
      ]);
      const selectedCandidates =
        selectedCandidatesResult[0].status === 'fulfilled'
          ? selectedCandidatesResult[0].value.items ?? []
          : [];

      if (selectedCandidates.length) {
        candidates = selectedCandidates.map((candidate) => ({
          ...candidate,
          selection_status: candidate.selection_status ?? 'SELECTED',
        }));
        candidateFetchFailed = false;
      } else if (selectedCandidatesResult[0].status === 'rejected') {
        candidateFetchFailed = true;
      }
    }

    return { analysisSummary, candidates, candidateFetchFailed };
  };

  const applyApiCandidateSummary = (
    scanJobId: number,
    analysisSummary: ApiAnalysisSummary | null,
    candidates: ApiCandidate[]
  ) => {
    const latestScan = apiHomeSummary?.latest_scan?.scan_job_id === scanJobId ? apiHomeSummary.latest_scan : undefined;
    const historyItem =
      apiScanHistoryItems.find((item) => item.scan_job_id === scanJobId) ??
      apiScanHistoryItems.find((item) => isCompletedScanStatus(item.job_status));
    const previousSummary = apiStorageSummary ?? emptyScanSummary;
    const estimatedBytes =
      analysisSummary?.total_estimated_reclaim_bytes ??
      latestScan?.estimated_reclaim_bytes ??
      historyItem?.estimated_reclaim_bytes ??
      apiHomeSummary?.storage_summary?.estimated_reclaim_bytes;
    const candidateCount =
      analysisSummary?.total_candidate_count ??
      latestScan?.candidate_count ??
      historyItem?.candidate_count ??
      candidates.length;
    const candidateSummary = buildApiScanSummary({
      candidates,
      analysisSummary,
      estimatedBytes,
      candidateCount,
      carbonGrams:
        apiHomeSummary?.latest_cleanup?.estimated_carbon_grams ??
        historyItem?.estimated_carbon_grams ??
        apiHomeSummary?.storage_summary?.total_estimated_carbon_grams,
    });
    const nextSummary: ScanSummary = {
      ...candidateSummary,
      storageMailItems: previousSummary.storageMailItems,
      storageDriveItems: previousSummary.storageDriveItems,
      storageTrashItems: previousSummary.storageTrashItems,
    };

    scanResultRef.current = nextSummary;
    setApiStorageSummary(nextSummary);
    setApiScanJobId(scanJobId);
    activeApiScanJobId.current = scanJobId;
    setChecked((items) => {
      const next = { ...items };
      [...nextSummary.mailItems, ...nextSummary.driveItems].forEach((item) => {
        const prefix = item.source === 'mail' ? 'mail' : 'drive';
        const defaultSelected =
          item.selectionStatus === 'DESELECTED'
            ? false
            : item.selectionStatus === 'NONE'
              ? isDefaultCandidateSelected(prefix, item.id)
              : true;
        next[`${prefix}:${item.id}`] = defaultSelected;
      });
      return next;
    });
    setLastScan({
      dateLabel: formatApiDate(latestScan?.completed_at ?? latestScan?.started_at ?? historyItem?.created_at),
      sourceLabel: apiScanSourceLabel(latestScan?.scan_source ?? historyItem?.scan_source),
      conditionLabel: apiScanSetting ? getPeriodLabel() : 'API 기준',
      result: nextSummary,
    });
    setHasCompletedScan(true);
  };

  const loadLatestCandidateSummary = async () => {
    if (!apiAccessToken || candidateSummaryLoading) return false;

    const scanJobId = getLatestCompletedScanJobId();
    if (!scanJobId) return false;

    setCandidateSummaryLoading(true);
    try {
      const { analysisSummary, candidates, candidateFetchFailed } = await fetchApiScanResultBundle(scanJobId, apiAccessToken);

      if (candidateFetchFailed) {
        showToast('분석 후보 목록을 불러오지 못했어요', undefined, 2600);
      }

      if (!analysisSummary && !candidates.length) {
        showToast('분석 결과를 불러오지 못했어요', undefined, 2600);
        return false;
      }

      applyApiCandidateSummary(scanJobId, analysisSummary, candidates);
      return true;
    } finally {
      setCandidateSummaryLoading(false);
    }
  };

  const handleRemoteNotificationOpen = (rawData?: unknown) => {
    const data = getNotificationDataRecord(rawData);
    const type = getNotificationDataString(data, ['type', 'event_type', 'notification_type']).toUpperCase();
    const target = getNotificationDataString(data, ['screen', 'target', 'route']).toLowerCase();
    const scanJobId = getNotificationDataNumber(data, ['scan_job_id', 'scanJobId', 'scanId']);
    const cleanupJobId = getNotificationDataNumber(data, ['cleanup_job_id', 'cleanupJobId', 'cleanupId']);

    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    setPermissionToast('');
    setToastTarget(null);

    if (cleanupJobId || type.includes('CLEANUP') || target.includes('cleanup')) {
      if (cleanupJobId) {
        setApiCleanupJobId(cleanupJobId);
        activeApiCleanupJobId.current = cleanupJobId;
      }
      setDeleteJobStatus('completed');
      clearHomeScanCompletionNotice();
      if (apiAccessToken) {
        void refreshAuraApis(apiAccessToken);
      }
      replace('cleanupComplete');
      return;
    }

    if (scanJobId) {
      setApiScanJobId(scanJobId);
      activeApiScanJobId.current = scanJobId;
      setHomeScanNotice('completed');
      setHasCompletedScan(true);

      if (apiAccessToken) {
        void fetchApiScanResultBundle(scanJobId, apiAccessToken)
          .then(({ analysisSummary, candidates }) => {
            if (analysisSummary || candidates.length) {
              applyApiCandidateSummary(scanJobId, analysisSummary, candidates);
            }
          })
          .catch(() => undefined);
      }

      openCompletedScanResult();
      return;
    }

    if (type.includes('SCAN') || target.includes('scan') || target.includes('candidate') || getLatestCompletedScanJobId()) {
      setHomeScanNotice('completed');
      setHasCompletedScan(true);
      openCompletedScanResult();
      return;
    }

    replace('home');
  };

  useEffect(() => {
    if (Platform.OS === 'web' || isAndroidExpoGo()) return undefined;

    let mounted = true;
    let pushTokenSubscription: { remove: () => void } | undefined;
    let responseSubscription: { remove: () => void } | undefined;

    const handleNotificationResponse = (response: {
      notification: { request: { identifier?: string; content: { data?: unknown } } };
    }) => {
      const identifier = response.notification.request.identifier;
      if (identifier && handledNotificationResponseIds.current.has(identifier)) return;
      if (identifier) handledNotificationResponseIds.current.add(identifier);

      handleRemoteNotificationOpen(response.notification.request.content.data);
    };

    void loadNotificationsModule().then((Notifications) => {
      if (!mounted) return;

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      void configureAuraNotificationChannel(Notifications);

      pushTokenSubscription = Notifications.addPushTokenListener((token) => {
        void registerFcmTokenWithServer(token.data);
      });

      responseSubscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

      const lastResponse = Notifications.getLastNotificationResponse?.();
      if (lastResponse) {
        handleNotificationResponse(lastResponse);
        Notifications.clearLastNotificationResponse?.();
      }
    });

    return () => {
      mounted = false;
      pushTokenSubscription?.remove();
      responseSubscription?.remove();
    };
  }, [
    apiAccessToken,
    permissions.alarm,
    settingsToggles.scanComplete,
    settingsToggles.aiNudge,
    homeScanNotice,
    apiScanJobId,
    apiCleanupJobId,
  ]);

  useEffect(() => {
    if (screen !== 'candidateSummary' && screen !== 'selectedReview') return;
    if (!apiAccessToken || candidateSummaryLoading) return;

    const result = getCurrentScanResult();
    const localCandidateCount = result.mailItems.length + result.driveItems.length + result.largeItems.length;
    const serverCandidateCount =
      apiHomeSummary?.latest_scan?.candidate_count ??
      apiScanHistoryItems.find((item) => isCompletedScanStatus(item.job_status))?.candidate_count ??
      result.candidateCount;
    const latestScanJobId = getLatestCompletedScanJobId();

    if (localCandidateCount > 0) return;
    if (latestScanJobId && candidateSummaryLoadAttemptedScanId.current === latestScanJobId) return;

    candidateSummaryLoadAttemptedScanId.current = latestScanJobId;
    void loadLatestCandidateSummary();
  }, [
    screen,
    apiAccessToken,
    candidateSummaryLoading,
    apiHomeSummary?.latest_scan?.scan_job_id,
    apiHomeSummary?.latest_scan?.candidate_count,
    apiScanHistoryItems,
    apiStorageSummary,
  ]);

  const cancelEmptyScanResult = () => {
    const scanJobId = apiScanJobId ?? activeApiScanJobId.current ?? apiHomeSummary?.latest_scan?.scan_job_id;

    if (apiAccessToken && scanJobId) {
      void scanApi
        .cancel(scanJobId, { accessToken: apiAccessToken })
        .then(() => {
          void refreshAuraApis(apiAccessToken);
        })
        .catch((error) => {
          showToast(getErrorMessage(error, '스캔 취소에 실패했어요'), undefined, 2600);
        });
    }

    scanResultRef.current = emptyScanSummary;
    setApiStorageSummary(emptyScanSummary);
    setLastScan(null);
    setHasCompletedScan(false);
    setHomeScanNotice('cancelled');
    activeApiScanJobId.current = null;
    setApiScanJobId(null);
    replace('home');
  };

  const getCandidateItemsForPrefix = (prefix: string) => {
    const result = getCurrentScanResult();
    if (prefix === 'mail') return result.mailItems;
    if (prefix === 'drive' || prefix === 'large') return [...result.driveItems, ...result.largeItems];
    return [];
  };

  const getCandidateItemByKey = (key: string) => {
    const [prefix, ...idParts] = key.split(':');
    const id = idParts.join(':');
    return getCandidateItemsForPrefix(prefix).find((item) => item.id === id);
  };

  const getSelectedApiCandidatePayloads = () => {
    const result = getCurrentScanResult();
    return [...result.mailItems, ...result.driveItems]
      .filter((item) => checked[`${item.source === 'mail' ? 'mail' : 'drive'}:${item.id}`] ?? isDefaultCandidateSelected(item.source === 'mail' ? 'mail' : 'drive', item.id))
      .filter((item) => item.candidateId !== undefined)
      .map((item) => ({
        candidate_id: Number(item.candidateId),
        selection_version: Number(item.selectionVersion ?? 0),
      }));
  };
  const getFreshSelectedApiCandidatePayloads = async (scanJobId: number, candidateIds: number[]) => {
    if (!apiAccessToken) return [];
    const requestedCandidateIds = new Set(candidateIds);
    const response = await scanApi.getSelectedCandidates(scanJobId, { accessToken: apiAccessToken });
    return (response.items ?? [])
      .filter((candidate) => candidate.candidate_id !== undefined && requestedCandidateIds.has(candidate.candidate_id))
      .map((candidate) => ({
        candidate_id: Number(candidate.candidate_id),
        selection_version: Number(candidate.selection_version ?? 0),
      }));
  };

  const openSelectedReviewFromSummary = () => {
    const scanJobId = getLatestCompletedScanJobId();
    const selectedServerCandidates = getSelectedApiCandidatePayloads();

    if (apiAccessToken && scanJobId && !selectedServerCandidates.length) {
      void loadLatestCandidateSummary().then((loaded) => {
        if (loaded) {
          go('selectedReview');
          return;
        }
        showToast('후보 목록을 아직 불러오지 못했어요. 잠시 후 다시 눌러주세요', undefined, 2600);
      });
      return;
    }

    go('selectedReview');
  };

  const syncCandidateSelection = (key: string, selected: boolean) => {
    if (!apiAccessToken || !activeApiScanJobId.current) return;

    const item = getCandidateItemByKey(key);
    if (!item?.candidateId) return;

    void candidateApi
      .updateSelection(
        item.candidateId,
        {
          selection_status: selected ? 'SELECTED' : 'DESELECTED',
          selection_version: Number(item.selectionVersion ?? 0),
        },
        { accessToken: apiAccessToken }
      )
      .catch(() => {
        showToast('후보 선택 상태 저장에 실패했어요', undefined, 2400);
      });
  };

  const syncCandidateSelections = (prefix: string, keys: string[], selected: boolean) => {
    if (!apiAccessToken || !activeApiScanJobId.current) return;

    const candidateIds = keys
      .map((id) => getCandidateItemByKey(`${prefix}:${id}`))
      .filter((item): item is ScanListItem & { candidateId: number } => Boolean(item?.candidateId))
      .map((item) => Number(item.candidateId));

    if (!candidateIds.length) return;

    void scanApi
      .updateCandidateSelections(
        activeApiScanJobId.current,
        {
          candidate_ids: candidateIds,
          selection_status: selected ? 'SELECTED' : 'DESELECTED',
          exclude_protected: true,
        },
        { accessToken: apiAccessToken }
      )
      .catch(() => {
        showToast('후보 선택 상태 저장에 실패했어요', undefined, 2400);
      });
  };

  const notifyScanComplete = () => {
    showToast('스캔이 완료됐어요. 눌러서 정리 후보를 확인하세요', 'candidateSummary');

    const maybeNotification = (globalThis as unknown as {
      Notification?: {
        permission: string;
        requestPermission?: () => Promise<string>;
        new (title: string, options?: { body?: string }): unknown;
      };
    }).Notification;

    if (!maybeNotification) return;

    if (maybeNotification.permission === 'granted') {
      const notification = new maybeNotification('AURA 스캔 완료', {
        body: '정리 후보와 확보 가능 용량이 준비됐어요.',
      }) as { onclick?: () => void };
      notification.onclick = openCompletedScanResult;
      return;
    }

    if (maybeNotification.permission === 'default' && maybeNotification.requestPermission) {
      maybeNotification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          const notification = new maybeNotification('AURA 스캔 완료', {
            body: '정리 후보와 확보 가능 용량이 준비됐어요.',
          }) as { onclick?: () => void };
          notification.onclick = openCompletedScanResult;
        }
      });
    }
  };

  const getApiScanSource = (sourceState = scanSources) => {
    if (sourceState.gmail && (sourceState.drive || sourceState.folder)) return 'MAIL_AND_DRIVE' as const;
    if (sourceState.gmail) return 'MAIL' as const;
    if (sourceState.folder) return 'DRIVE_FOLDER' as const;
    if (sourceState.drive) return 'DRIVE_ALL' as const;
    return 'MAIL_AND_DRIVE' as const;
  };

  const normalizeKeywordListForPayload = (keywords: string[]) => {
    const seen = new Set<string>();
    const result: string[] = [];

    keywords.forEach((keyword) => {
      const value = keyword.trim();
      const key = normalizeKeyword(value);
      if (!value || seen.has(key)) return;
      seen.add(key);
      result.push(value);
    });

    return result;
  };

  const getEffectiveKeywordList = (type: 'include' | 'exclude') => {
    const baseKeywords = type === 'include' ? includeKeywords : excludeKeywords;
    const oppositeKeywords = type === 'include' ? excludeKeywords : includeKeywords;
    const input = type === 'include' ? includeInput : excludeInput;
    const pendingKeyword = keywordSheetType === type ? input.trim() : '';
    const nextKeywords = [...baseKeywords];

    if (
      pendingKeyword &&
      !keywordExists(baseKeywords, pendingKeyword) &&
      !keywordExists(oppositeKeywords, pendingKeyword)
    ) {
      nextKeywords.push(pendingKeyword);
    }

    return normalizeKeywordListForPayload(nextKeywords);
  };

  const normalizeComparableKeywordList = (keywords?: string[]) =>
    normalizeKeywordListForPayload(keywords ?? []).map(normalizeKeyword).sort();

  const areKeywordListsEqual = (left?: string[], right?: string[]) => {
    const leftList = normalizeComparableKeywordList(left);
    const rightList = normalizeComparableKeywordList(right);
    return leftList.length === rightList.length && leftList.every((item, index) => item === rightList[index]);
  };

  const areStringListsEqual = (left?: string[], right?: string[]) => {
    const leftList = [...(left ?? [])].map((item) => item.trim().toUpperCase()).filter(Boolean).sort();
    const rightList = [...(right ?? [])].map((item) => item.trim().toUpperCase()).filter(Boolean).sort();
    return leftList.length === rightList.length && leftList.every((item, index) => item === rightList[index]);
  };

  const getApiScanSettingsPayload = (sourceState = scanSources): ApiScanSettingRequest => ({
    scan_source: getApiScanSource(sourceState),
    drive_folder_id: getSelectedDriveFolderId() || undefined,
    include_subfolders: includeSubFolders,
    last_opened_before_months: lastOpenedBeforeMonths,
    last_modified_before_months: lastModifiedBeforeMonths,
    created_before_months: createdBeforeMonths,
    exclude_recent_days: 0,
    include_keywords: getEffectiveKeywordList('include'),
    exclude_keywords: getEffectiveKeywordList('exclude'),
    file_extensions: Object.entries(selectedFileTypes)
      .filter(([, selected]) => selected)
      .map(([extension]) => extension.toUpperCase()),
    include_mail_attachment_size: includeMailAttachments,
    apply_recent_conditions: settingsToggles.autoScan,
  });

  const hasLocalScanSettingChanges = (payload: ApiScanSettingRequest) => {
    if (!apiScanSetting) return true;

    return (
      apiScanSetting.scan_source !== payload.scan_source ||
      (apiScanSetting.drive_folder_id ?? undefined) !== (payload.drive_folder_id ?? undefined) ||
      apiScanSetting.include_subfolders !== payload.include_subfolders ||
      apiScanSetting.last_opened_before_months !== payload.last_opened_before_months ||
      apiScanSetting.last_modified_before_months !== payload.last_modified_before_months ||
      apiScanSetting.created_before_months !== payload.created_before_months ||
      (apiScanSetting.exclude_recent_days ?? 0) !== payload.exclude_recent_days ||
      !areKeywordListsEqual(apiScanSetting.include_keywords, payload.include_keywords) ||
      !areKeywordListsEqual(apiScanSetting.exclude_keywords, payload.exclude_keywords) ||
      !areStringListsEqual(apiScanSetting.file_extensions, payload.file_extensions) ||
      apiScanSetting.include_mail_attachment_size !== payload.include_mail_attachment_size ||
      apiScanSetting.apply_recent_conditions !== payload.apply_recent_conditions
    );
  };

  const saveApiScanSettings = async () => {
    if (!apiAccessToken) {
      showToast('로그인 후 기본 스캔 조건을 저장할 수 있어요', undefined, 2600);
      return false;
    }

    try {
      const saved = await scanApi.saveSettings(getApiScanSettingsPayload(), { accessToken: apiAccessToken });
      applyApiScanSetting(saved);
      return true;
    } catch {
      showToast('스캔 조건은 화면에만 적용됐어요');
      return false;
    }
  };
  const saveDefaultScanSettings = async () => {
    const saved = await saveApiScanSettings();
    if (!saved) return;
    showToast('기본 스캔 조건을 저장했어요', undefined, 2200);
    back();
  };

  const startScan = () => {
    const activeScanSources = !scanSources.gmail && !scanSources.drive && !scanSources.folder && (permissions.gmail || permissions.drive)
      ? { gmail: permissions.gmail, drive: permissions.drive, folder: false }
      : scanSources;

    if (activeScanSources !== scanSources) {
      setScanSources(activeScanSources);
    }

    if (!activeScanSources.gmail && !activeScanSources.drive && !activeScanSources.folder) {
      showPermissionToast();
      return;
    }
    if (activeScanSources.folder && !selectedDriveFolders.length && !selectedDriveFiles.length) {
      showToast('분석할 Drive 폴더를 선택해주세요');
      go('scanFlowFolder');
      return;
    }
    if (!apiAccessToken) {
      showToast('로그인 후 서버 스캔을 실행할 수 있어요', undefined, 3200);
      return;
    }
    scanSourceLabelRef.current = getSimpleScanSourceLabel(activeScanSources);
    scanResultRef.current = emptyScanSummary;
    setApiStorageSummary(emptyScanSummary);
    setScanProgress(0);
    setScanStatusText('스캔 작업을 요청 중이에요');
    setApiScanJobId(null);
    activeApiScanJobId.current = null;
    setHomeScanNotice('running');
    go('scanProgress');

    const scanSettingsPayload = getApiScanSettingsPayload(activeScanSources);
    const shouldUseSavedScanSettings =
      hasCompletedScan &&
      settingsToggles.autoScan &&
      !hasLocalScanSettingChanges(scanSettingsPayload);

    void scanApi
      .create(
        {
          use_saved_settings: shouldUseSavedScanSettings,
          settings_override: shouldUseSavedScanSettings ? undefined : scanSettingsPayload,
        },
        { accessToken: apiAccessToken }
      )
      .then((job) => {
        if (!job.scan_job_id) {
          throw new Error('scan_job_id missing');
        }
        activeApiScanJobId.current = job.scan_job_id;
        setApiScanJobId(job.scan_job_id);
        if (job.scan_source) {
          scanSourceLabelRef.current = apiScanSourceLabel(job.scan_source);
        }
        if (job.progress_percent !== undefined) {
          setScanProgress(Math.round(job.progress_percent));
        }
        setScanStatusText('서버 스캔 작업을 확인 중이에요');
      })
      .catch(() => {
        setHomeScanNotice('none');
        setScanProgress(0);
        setScanStatusText('스캔 시작에 실패했어요');
        if (screenRef.current === 'scanProgress') {
          replace('home');
        }
        showToast('백엔드 스캔 시작 실패: 권한 또는 서버 상태를 확인해주세요', undefined, 3200);
      });
  };

  const cancelScan = () => {
    if (apiAccessToken && activeApiScanJobId.current) {
      void scanApi.cancel(activeApiScanJobId.current, { accessToken: apiAccessToken }).catch(() => undefined);
    }
    setHomeScanNotice('cancelled');
    setScanProgress(0);
    setApiScanJobId(null);
    activeApiScanJobId.current = null;
    replace('home');
  };

  const cancelCleanupJob = () => {
    const cleanupJobId = activeApiCleanupJobId.current ?? apiCleanupJobId;
    const applyCancelledCleanupJob = () => {
      setDeleteJobStatus('cancelled');
      setDeleteProgress(0);
      setDeleteStatusText('휴지통 이동이 취소됐어요');
      setApiCleanupJobId(null);
      activeApiCleanupJobId.current = null;
      setApiScanJobId(null);
      activeApiScanJobId.current = null;
      setHomeScanNotice('none');
      setHasCompletedScan(false);
      showToast('휴지통 이동을 취소했어요', undefined, 2400);
      replace('home');
    };

    if (apiAccessToken && cleanupJobId) {
      void cleanupApi
        .cancel(cleanupJobId, { accessToken: apiAccessToken })
        .then(applyCancelledCleanupJob)
        .catch(() => {
          showToast('휴지통 이동 취소 요청에 실패했어요', undefined, 2600);
        });
      return;
    }

    applyCancelledCleanupJob();
  };

  const handleHomeScanPress = () => {
    setScanSourceEditOnly(false);
    setPeriodEditOnly(false);
    if (homeScanNotice === 'completed') {
      openCompletedScanResult();
      return;
    }

    if (homeScanNotice === 'running') {
      go('scanProgress');
      return;
    }

    if (hasCompletedScan && settingsToggles.autoScan) {
      startScan();
      return;
    }

    go('scanFlowSource');
  };

  const toggleAllDriveFolders = () => {
    const targetFolder = driveCurrentFolder;
    const isSelectedByParent = getDriveAncestorFolders(targetFolder).some((ancestor) => selectedDriveFolders.includes(ancestor));
    const driveFolderSource = getActiveDriveFolderOptions();

    if (isSelectedByParent) {
      showToast('먼저 상위 폴더를 해제해주세요');
      return;
    }

    const allFolderGroups = getDriveFolderSelectionGroup(targetFolder, driveFolderSource);
    const allFileIds = getDriveFileSelectionGroup(targetFolder).map((file) => file.id);

    if (!allFolderGroups.length && !allFileIds.length) {
      showToast('선택할 Drive 항목이 없어요');
      return;
    }

    const allSelected =
      allFolderGroups.every((folder) => selectedDriveFolders.includes(folder)) &&
      allFileIds.every((fileId) => selectedDriveFiles.includes(fileId));
    if (allSelected) {
      setSelectedDriveFolders((items) => {
        const next = items.filter((item) => !allFolderGroups.includes(item));
        const nextFiles = selectedDriveFiles.filter((item) => !allFileIds.includes(item));
        setSelectedDriveFiles(nextFiles);
        setScanSources((sources) => ({ ...sources, folder: Boolean(next.length || nextFiles.length), drive: next.length || nextFiles.length ? true : sources.drive }));
        return next;
      });
      return;
    }

    setSelectedDriveFolders((items) => Array.from(new Set([...items, ...allFolderGroups])));
    setSelectedDriveFiles((items) => Array.from(new Set([...items, ...allFileIds])));
    setScanSources((items) => ({ ...items, drive: true, folder: true }));
  };

  const back = () => {
    if (screen === 'scanProgress' || screen === 'deleteProcessing') {
      replace('home');
      return;
    }

    if (screen === 'onboardingIntro') {
      setHasSeenConnectedSuccess(true);
      setSkipConnectedAnimation(true);
      setConnectedDone(true);
      setConnectedStep(3);
      replace('connected');
      return;
    }

    if (screen === 'serviceWithdraw') {
      clearWithdrawConfirm();
    }

    transitionDirection.current = 1;
    const historyBackIndex = getHistoryBackIndex();
    if (historyBackIndex >= 0) {
      const target = history[historyBackIndex];
      setHistory((items) => items.slice(0, historyBackIndex));
      setScreen(target);
      return;
    }

    const parent = getResolvedBackParent(screen);
    setHistory([]);
    setScreen(parent);
  };

  const openCleanupComplete = () => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    setPermissionToast('');
    setToastTarget(null);
    clearHomeScanCompletionNotice();
    replace('cleanupComplete');
  };

  useEffect(() => {
    if (screen !== 'connected') return;

    if (hasSeenConnectedSuccess) {
      setSkipConnectedAnimation(true);
      setConnectedDone(true);
      setConnectedStep(3);
      return;
    }

    setSkipConnectedAnimation(false);
    setConnectedDone(false);
    setConnectedStep(0);
  }, [screen, hasSeenConnectedSuccess]);

  useEffect(() => {
    if (screen !== 'connected') return;

    if (skipConnectedAnimation) {
      setConnectedStep(3);
      return;
    }

    if (!connectedDone) return;

    setConnectedStep(0);
    const timers = [
      setTimeout(() => setConnectedStep(1), 180),
      setTimeout(() => setConnectedStep(2), 640),
      setTimeout(() => setConnectedStep(3), 1180),
    ];

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [screen, connectedDone, skipConnectedAnimation]);

  const startDeleteJob = () => {
    if (apiAccessToken && activeApiScanJobId.current) {
      const candidates = getSelectedApiCandidatePayloads();
      const scanJobId = activeApiScanJobId.current;

      if (!candidates.length) {
        showToast('서버에 전달할 선택 후보가 없어요');
        return;
      }

      setDeleteProgress(0);
      setDeleteStatusText('정리 작업을 요청 중이에요');
      setDeleteJobStatus('running');
      setApiCleanupJobId(null);
      activeApiCleanupJobId.current = null;
      go('deleteProcessing');

      void (async () => {
        await scanApi.updateCandidateSelections(
          scanJobId,
          {
            candidate_ids: candidates.map((candidate) => candidate.candidate_id),
            selection_status: 'SELECTED',
            exclude_protected: true,
          },
          { accessToken: apiAccessToken }
        );
        const freshCandidates = await getFreshSelectedApiCandidatePayloads(
          scanJobId,
          candidates.map((candidate) => candidate.candidate_id)
        );
        if (freshCandidates.length !== candidates.length) {
          throw new Error('Selected cleanup candidates were not synchronized');
        }
        const job = await cleanupApi.create(
          {
            scan_job_id: scanJobId,
            action_type: 'MOVE_TO_TRASH',
            candidates: freshCandidates,
            approval_confirmed: true,
          },
          { accessToken: apiAccessToken }
        );
        if (!job?.cleanup_job_id) throw new Error('No cleanup job created');
        activeApiCleanupJobId.current = job.cleanup_job_id;
        setApiCleanupJobId(job.cleanup_job_id);
        if (job.progress_percent !== undefined) {
          setDeleteProgress(Math.max(0, Math.min(100, Math.round(job.progress_percent))));
        }
      })().catch((error) => {
        setDeleteJobStatus('failed');
        setDeleteStatusText('정리 요청에 실패했어요');
        if (screenRef.current === 'deleteProcessing') {
          replace('selectedReview');
        }
        showToast(getErrorMessage(error, '백엔드 휴지통 이동 요청 실패: 권한 또는 서버 상태를 확인해주세요'), undefined, 3200);
      });
      return;
    }
    setDeleteProgress(0);
    setDeleteStatusText('선택 항목을 휴지통으로 이동 중');
    setDeleteJobStatus('running');
    go('deleteProcessing');
  };

  const markPrivacyConsent = () => {
    setPrivacyDetailChecked(true);
    setPrivacyChecked(true);
  };

  const togglePrivacyConsent = () => {
    setPrivacyDetailChecked((value) => {
      const next = !value;
      setPrivacyChecked(next);
      return next;
    });
  };

  const acceptPrivacyConsentAndBack = () => {
    markPrivacyConsent();
    replace('initial');
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (storageSheetBackHandlerRef.current?.()) {
        return true;
      }

      if (withdrawSheetVisible) {
        closeWithdrawSheet();
        return true;
      }

      if (keywordSheetType) {
        closeKeywordSheet();
        return true;
      }

      if (keywordChoiceVisible) {
        closeKeywordChoiceSheet();
        return true;
      }

      if (yearSheetType) {
        closeYearSheet();
        return true;
      }

      if (periodSheetType) {
        closePeriodMonthSheet();
        return true;
      }

      if (filterSheetVisible) {
        closeFilterSheet();
        return true;
      }

      if (carbonHelpVisible) {
        setCarbonHelpVisible(false);
        return true;
      }

      if (screen === 'initial') {
        return true;
      }

      back();
      return true;
    });

    return () => subscription.remove();
  }, [
    carbonHelpVisible,
    filterSheetVisible,
    history,
    keywordChoiceVisible,
    keywordSheetType,
    periodSheetType,
    privacyDetailChecked,
    screen,
    withdrawSheetVisible,
    yearSheetType,
  ]);

  useEffect(() => {
    screenRef.current = screen;
    screenMotion.stopAnimation();
    screenMotion.setValue(0);
    Animated.timing(screenMotion, {
      toValue: 1,
      duration: 285,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [screen]);

  useEffect(() => {
    if (screen !== 'deleteConfirm') {
      deleteConfirmMotion.setValue(1);
      return;
    }

    deleteConfirmMotion.stopAnimation();
    deleteConfirmMotion.setValue(1);
    Animated.timing(deleteConfirmMotion, {
      toValue: 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [deleteConfirmMotion, screen]);

  useEffect(() => {
    if (screen === 'serviceWithdraw') {
      clearWithdrawConfirm();
    }
  }, [screen]);

  useEffect(() => {
    if (
      (scanSourceEditOnly && (screen === 'scanFlowSource' || screen === 'scanFlowFolder')) ||
      (periodEditOnly && screen === 'scanFlowPeriod')
    ) {
      return;
    }

    const tab = getResolvedTabForScreen(screen);
    if (!tab) return;

    setLastTabScreens((items) => (items[tab] === screen ? items : { ...items, [tab]: screen }));
  }, [screen, scanSourceEditOnly, periodEditOnly]);

  useEffect(() => {
    setScanSources((items) => ({
      gmail: items.gmail && permissions.gmail,
      drive: items.drive && permissions.drive,
      folder: items.folder && permissions.drive,
    }));
  }, [permissions.gmail, permissions.drive]);

  useEffect(() => {
    if (screen !== 'scanFlowFolder' || !apiAccessToken || !permissions.drive) return;

    void loadApiDriveFolders(driveCurrentFolder);
  }, [apiAccessToken, driveCurrentFolder, permissions.drive, screen]);

  useEffect(() => {
    if (homeScanNotice !== 'running') return;

    if (apiAccessToken && apiScanJobId) {
      let cancelled = false;
      let timer: ReturnType<typeof setInterval> | null = null;

      const completeApiScan = async (job: ApiScanJob) => {
        try {
          const {
            analysisSummary: apiSummary,
            candidates: apiCandidates,
            candidateFetchFailed,
          } = await fetchApiScanResultBundle(apiScanJobId, apiAccessToken);

          if (cancelled) return;

          const nextSummary = buildApiScanSummary({
            candidates: apiCandidates,
            analysisSummary: apiSummary,
            estimatedBytes: apiSummary?.total_estimated_reclaim_bytes ?? job.estimated_reclaim_bytes,
            candidateCount: apiSummary?.total_candidate_count ?? job.candidate_count,
          });
          scanResultRef.current = nextSummary;
          setChecked((items) => {
            const next = { ...items };
            [...nextSummary.mailItems, ...nextSummary.driveItems].forEach((item) => {
              if (!item.selectionStatus) return;
              next[`${item.source === 'mail' ? 'mail' : 'drive'}:${item.id}`] = item.selectionStatus !== 'DESELECTED';
            });
            return next;
          });
          setApiStorageSummary(nextSummary);
          setLastScan({
            dateLabel: formatApiDate(job.completed_at ?? job.started_at ?? job.created_at),
            sourceLabel: scanSourceLabelRef.current,
            conditionLabel: getPeriodLabel(),
            result: nextSummary,
          });
          setHomeScanNotice('completed');
          setHasCompletedScan(true);

          if (job.job_status === 'PARTIAL_FAILED') {
            showToast('일부 분석에 실패했어요. 후보를 확인해주세요', undefined, 3600);
          }
          if (candidateFetchFailed) {
            showToast('분석 후보 목록 일부를 불러오지 못했어요. 결과 화면에서 다시 시도할게요', undefined, 3200);
          }
          if (permissions.alarm && settingsToggles.scanComplete) {
            notifyScanComplete();
          }
          if (screenRef.current === 'scanProgress') {
            replace('candidateSummary');
          }
          void refreshAuraApis(apiAccessToken);
        } catch {
          setHomeScanNotice('none');
          setScanStatusText('스캔 결과를 불러오지 못했어요');
          showToast('스캔 결과 조회에 실패했어요. 잠시 후 다시 확인해주세요', undefined, 3200);
          if (screenRef.current === 'scanProgress') {
            replace('home');
          }
        }
      };

      const pollScanJob = async () => {
        try {
          const job = await scanApi.getDetail(apiScanJobId, { accessToken: apiAccessToken });
          if (cancelled) return;

          const progress = Math.max(0, Math.min(100, Math.round(job.progress_percent ?? 0)));
          setScanProgress(progress);

          if (job.job_status === 'PENDING') {
            setScanStatusText('스캔 작업 대기 중');
            return;
          }
          if (job.job_status === 'SCANNING') {
            setScanStatusText('메일 및 드라이브 데이터 수집중');
            return;
          }
          if (job.job_status === 'ANALYZING') {
            setScanStatusText('수집 데이터 AI 분석중');
            return;
          }
          if (job.job_status === 'COMPLETED' || job.job_status === 'PARTIAL_FAILED') {
            if (timer) {
              clearInterval(timer);
              timer = null;
            }
            setScanProgress(100);
            setScanStatusText(job.job_status === 'PARTIAL_FAILED' ? '일부 분석 실패, 결과 정리 중' : '분석 완료, 결과 정리 중');
            await completeApiScan(job);
            return;
          }
          if (job.job_status === 'FAILED' || job.job_status === 'CANCELED') {
            if (timer) {
              clearInterval(timer);
              timer = null;
            }
            setHomeScanNotice(job.job_status === 'CANCELED' ? 'cancelled' : 'none');
            setScanStatusText(job.error_message || '스캔이 완료되지 못했어요');
            showToast(job.error_message || '스캔이 실패했어요. 권한 또는 서버 상태를 확인해주세요', undefined, 3600);
            if (screenRef.current === 'scanProgress') {
              replace('home');
            }
          }
        } catch {
          if (cancelled) return;
          setScanStatusText('스캔 상태 확인 중 오류가 발생했어요');
          showToast('스캔 상태 확인에 실패했어요', undefined, 2400);
        }
      };

      void pollScanJob();
      timer = setInterval(() => {
        void pollScanJob();
      }, 2500);

      return () => {
        cancelled = true;
        if (timer) {
          clearInterval(timer);
        }
      };
    }

    if (apiAccessToken) {
      setScanStatusText('서버 스캔 작업을 기다리는 중이에요');
      return undefined;
    }

    const timer = setInterval(() => {
      setScanProgress((value) => {
        const next = Math.min(100, value + 4);
        setScanStatusText(next < 50 ? '메일 및 드라이브 데이터 수집중' : '수집 데이터 AI 분석중');
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            const apiScanJobId = activeApiScanJobId.current;
            if (apiAccessToken && apiScanJobId) {
              void fetchApiScanResultBundle(apiScanJobId, apiAccessToken).then(({ analysisSummary: apiSummary, candidates: apiCandidates }) => {
                const nextSummary = buildApiScanSummary({
                  candidates: apiCandidates,
                  analysisSummary: apiSummary,
                  storageMailItems: apiStorageSummary?.storageMailItems.map((item) => ({
                    title: item.subtitle,
                    size_bytes: Math.round(extractStorageSizeMB(item.meta) * 1024 * 1024),
                    modified_time: item.meta,
                  })) ?? [],
                  storageDriveItems: apiStorageSummary?.storageDriveItems.map((item) => ({
                    title: item.title,
                    file_extension: item.type,
                    size_bytes: Math.round(extractStorageSizeMB(item.subtitle) * 1024 * 1024),
                    modified_time: item.subtitle,
                  })) ?? [],
                  estimatedBytes: apiSummary?.total_estimated_reclaim_bytes,
                  candidateCount: apiSummary?.total_candidate_count,
                });
                scanResultRef.current = nextSummary;
                setApiStorageSummary(nextSummary);
                setLastScan({
                  dateLabel: formatScanDate(new Date()),
                  sourceLabel: scanSourceLabelRef.current,
                  conditionLabel: getPeriodLabel(),
                  result: nextSummary,
                });
                void refreshAuraApis(apiAccessToken);
              });
            }
            setHomeScanNotice('completed');
            setLastScan({
              dateLabel: formatScanDate(new Date()),
              sourceLabel: scanSourceLabelRef.current,
              conditionLabel: getPeriodLabel(),
              result: scanResultRef.current,
            });
            setHasCompletedScan(true);
            if (permissions.alarm && settingsToggles.scanComplete) {
              notifyScanComplete();
            }
            if (screenRef.current === 'scanProgress') {
              replace('candidateSummary');
            }
          }, 420);
        }
        return next;
      });
    }, 140);

    return () => clearInterval(timer);
  }, [apiAccessToken, apiScanJobId, homeScanNotice, permissions.alarm, settingsToggles.scanComplete]);

  useEffect(() => {
    if (deleteJobStatus !== 'running') return;

    if (apiAccessToken && apiCleanupJobId) {
      let cancelled = false;
      let timer: ReturnType<typeof setInterval> | null = null;

      const applyCleanupResult = (result: ApiCleanupJob) => {
        if (result.reclaimed_bytes !== undefined || result.estimated_carbon_grams !== undefined) {
          setApiHomeSummary((summary) => ({
            ...(summary ?? {}),
            latest_cleanup: {
              cleanup_job_id: result.cleanup_job_id,
              cleaned_item_count: result.cleaned_item_count,
              reclaimed_bytes: result.reclaimed_bytes,
              estimated_carbon_grams: result.estimated_carbon_grams,
              completed_at: result.completed_at,
            },
          }));
        }
      };

      const finishCleanup = async (job: ApiCleanupJob) => {
        let failedItemCount = 0;
        try {
          const result = await cleanupApi.getResult(apiCleanupJobId, { accessToken: apiAccessToken });
          if (cancelled) return;
          applyCleanupResult({ ...job, ...result });
        } catch {
          if (cancelled) return;
          applyCleanupResult(job);
        }

        if (job.job_status === 'PARTIAL_FAILED') {
          try {
            const cleanupItems = await cleanupApi.getItems(apiCleanupJobId, { accessToken: apiAccessToken });
            failedItemCount = cleanupItems.items?.filter((item) => item.process_status === 'FAILED').length ?? 0;
          } catch {
            failedItemCount = 0;
          }
        }

        setDeleteProgress(100);
        setDeleteJobStatus('completed');
        setApiCleanupJobId(null);
        activeApiCleanupJobId.current = null;
        setHomeScanNotice('none');
        setHasCompletedScan(false);
        setApiScanJobId(null);
        activeApiScanJobId.current = null;
        if (job.job_status === 'PARTIAL_FAILED') {
          setDeleteStatusText(failedItemCount ? `일부 항목 ${failedItemCount}개 이동 실패` : '일부 항목 이동 실패');
          showToast('일부 항목 이동에 실패했어요. 결과를 확인해주세요', undefined, 3600);
        }
        void refreshAuraApis(apiAccessToken);
        if (screenRef.current === 'deleteProcessing') {
          replace('cleanupComplete');
        } else {
          showToast('휴지통 이동이 완료됐어요. 눌러서 결과를 확인하세요', 'cleanupComplete', 3600);
        }
      };

      const pollCleanupJob = async () => {
        try {
          const job = await cleanupApi.getDetail(apiCleanupJobId, { accessToken: apiAccessToken });
          if (cancelled) return;

          if (job.progress_percent !== undefined) {
            setDeleteProgress(Math.max(0, Math.min(100, Math.round(job.progress_percent))));
          } else if (job.job_status === 'PENDING') {
            setDeleteProgress((value) => Math.max(value, 10));
          } else if (job.job_status === 'PROCESSING') {
            setDeleteProgress((value) => Math.min(90, Math.max(value + 8, 20)));
          }

          if (job.job_status === 'PENDING') {
            setDeleteStatusText('정리 작업 대기 중');
            return;
          }
          if (job.job_status === 'PROCESSING') {
            setDeleteStatusText('선택 항목을 휴지통으로 이동 중');
            return;
          }
          if (job.job_status === 'COMPLETED' || job.job_status === 'PARTIAL_FAILED') {
            if (timer) {
              clearInterval(timer);
              timer = null;
            }
            setDeleteStatusText(job.job_status === 'PARTIAL_FAILED' ? '일부 실패, 결과 정리 중' : '정리 완료, 결과 정리 중');
            await finishCleanup(job);
            return;
          }
          if (job.job_status === 'FAILED' || job.job_status === 'CANCELED') {
            if (timer) {
              clearInterval(timer);
              timer = null;
            }
            setDeleteJobStatus(job.job_status === 'CANCELED' ? 'cancelled' : 'failed');
            setApiCleanupJobId(null);
            activeApiCleanupJobId.current = null;
            if (job.job_status === 'CANCELED') {
              setApiScanJobId(null);
              activeApiScanJobId.current = null;
              setHomeScanNotice('none');
              setHasCompletedScan(false);
            }
            setDeleteStatusText(job.job_status === 'CANCELED' ? '휴지통 이동이 취소됐어요' : '정리 작업을 완료하지 못했어요');
            showToast(
              job.job_status === 'CANCELED' ? '휴지통 이동을 취소했어요' : '휴지통 이동이 실패했어요. 잠시 후 다시 시도해주세요',
              undefined,
              3600
            );
            if (screenRef.current === 'deleteProcessing') {
              replace(job.job_status === 'CANCELED' ? 'home' : 'selectedReview');
            }
          }
        } catch {
          if (cancelled) return;
          setDeleteStatusText('정리 상태 확인 중 오류가 발생했어요');
          showToast('정리 상태 확인에 실패했어요', undefined, 2400);
        }
      };

      void pollCleanupJob();
      timer = setInterval(() => {
        void pollCleanupJob();
      }, 1000);

      return () => {
        cancelled = true;
        if (timer) {
          clearInterval(timer);
        }
      };
    }

    if (apiAccessToken) {
      setDeleteStatusText('서버 정리 작업을 기다리는 중이에요');
      return undefined;
    }

    const timer = setInterval(() => {
      setDeleteProgress((value) => {
        const next = Math.min(100, value + 4);
        if (next >= 100) {
          clearInterval(timer);
          setDeleteJobStatus('completed');
          setApiCleanupJobId(null);
          setTimeout(() => {
            if (apiAccessToken && activeApiCleanupJobId.current) {
              void cleanupApi
                .getResult(activeApiCleanupJobId.current, { accessToken: apiAccessToken })
                .then((result) => {
                  if (result.reclaimed_bytes !== undefined || result.estimated_carbon_grams !== undefined) {
                    setApiHomeSummary((summary) => ({
                      ...(summary ?? {}),
                      latest_cleanup: {
                        cleanup_job_id: result.cleanup_job_id,
                        cleaned_item_count: result.cleaned_item_count,
                        reclaimed_bytes: result.reclaimed_bytes,
                        estimated_carbon_grams: result.estimated_carbon_grams,
                        completed_at: result.completed_at,
                      },
                    }));
                  }
                  void refreshAuraApis(apiAccessToken);
                })
                .catch(() => undefined);
            }
            activeApiCleanupJobId.current = null;
            setHomeScanNotice('none');
            setHasCompletedScan(false);
            setApiScanJobId(null);
            activeApiScanJobId.current = null;
            if (screenRef.current === 'deleteProcessing') {
              replace('cleanupComplete');
            } else {
              showToast('휴지통 이동이 완료됐어요. 눌러서 결과를 확인하세요', 'cleanupComplete', 3600);
            }
          }, 420);
        }
        return next;
      });
    }, 120);

    return () => clearInterval(timer);
  }, [apiAccessToken, apiCleanupJobId, deleteJobStatus]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  const toggleCheck = (key: string) => {
    const defaultSelected = isDefaultSelectionForKey(key);
    const nextSelected = !(checked[key] ?? defaultSelected);
    setChecked((items) => ({ ...items, [key]: nextSelected }));
    syncCandidateSelection(key, nextSelected);
  };

  const setAll = (prefix: string, keys: string[]) => {
    const allChecked = keys.every((key) => checked[`${prefix}:${key}`] ?? isDefaultSelectionForKey(`${prefix}:${key}`));
    const nextSelected = !allChecked;
    setChecked((items) => {
      const next = { ...items };
      keys.forEach((key) => {
        next[`${prefix}:${key}`] = nextSelected;
      });
      return next;
    });
    syncCandidateSelections(prefix, keys, nextSelected);
  };
  const clearSelectionPrefix = (prefix: string) => {
    setChecked((items) => {
      const next = { ...items };
      Object.keys(next).forEach((key) => {
        if (key.startsWith(`${prefix}:`)) {
          delete next[key];
        }
      });
      return next;
    });
  };

  const normalizeKeyword = (keyword: string) => keyword.trim().toLowerCase();

  const keywordExists = (keywords: string[], keyword: string) => keywords.some((item) => normalizeKeyword(item) === normalizeKeyword(keyword));

  const addKeyword = (type: 'include' | 'exclude') => {
    const value = (type === 'include' ? includeInput : excludeInput).trim();
    if (!value) {
      showToast('추가할 키워드를 입력해주세요');
      return;
    }

    if (type === 'include' && keywordExists(includeKeywords, value)) {
      showToast('이미 포함 키워드에 추가된 단어예요');
      return;
    }

    if (type === 'exclude' && keywordExists(excludeKeywords, value)) {
      showToast('이미 제외 키워드에 추가된 단어예요');
      return;
    }

    if (type === 'include' && keywordExists(excludeKeywords, value)) {
      showToast('\uC81C\uC678 \uD0A4\uC6CC\uB4DC\uC5D0 \uC788\uB294 \uB2E8\uC5B4\uB294 \uD3EC\uD568 \uD0A4\uC6CC\uB4DC\uC5D0 \uCD94\uAC00\uD560 \uC218 \uC5C6\uC5B4\uC694');
      return;
    }

    if (type === 'exclude' && keywordExists(includeKeywords, value)) {
      showToast('\uD3EC\uD568 \uD0A4\uC6CC\uB4DC\uC5D0 \uC788\uB294 \uB2E8\uC5B4\uB294 \uC81C\uC678 \uD0A4\uC6CC\uB4DC\uC5D0 \uCD94\uAC00\uD560 \uC218 \uC5C6\uC5B4\uC694');
      return;
    }

    if (type === 'include') {
      if (keywordExists(excludeKeywords, value)) {
        showToast('제외 키워드에 있는 단어는 포함 키워드에 추가할 수 없어요');
        return;
      }
      if (keywordExists(excludeKeywords, value)) {
        showToast('제외 키워드에 있는 단어는 포함 키워드에 추가할 수 없어요');
        return;
      }
      setIncludeKeywords((items) => (keywordExists(items, value) ? items : [...items, value]));
      setIncludeInput('');
    } else {
      if (keywordExists(includeKeywords, value)) {
        showToast('포함 키워드에 있는 단어는 제외 키워드에 추가할 수 없어요');
        return;
      }
      if (keywordExists(includeKeywords, value)) {
        showToast('포함 키워드에 있는 단어는 제외 키워드에 추가할 수 없어요');
        return;
      }
      setExcludeKeywords((items) => (keywordExists(items, value) ? items : [...items, value]));
      setExcludeInput('');
    }
  };

  const removeKeyword = (type: 'include' | 'exclude', keyword: string) => {
    if (type === 'include') {
      setIncludeKeywords((items) => items.filter((item) => item !== keyword));
    } else {
      setExcludeKeywords((items) => items.filter((item) => item !== keyword));
    }
  };

  const addRecommendedKeyword = (type: 'include' | 'exclude', keyword: string) => {
    if (type === 'include' && keywordExists(includeKeywords, keyword)) {
      showToast('\uC774\uBBF8 \uD3EC\uD568 \uD0A4\uC6CC\uB4DC\uC5D0 \uCD94\uAC00\uB41C \uB2E8\uC5B4\uC608\uC694');
      return;
    }

    if (type === 'exclude' && keywordExists(excludeKeywords, keyword)) {
      showToast('\uC774\uBBF8 \uC81C\uC678 \uD0A4\uC6CC\uB4DC\uC5D0 \uCD94\uAC00\uB41C \uB2E8\uC5B4\uC608\uC694');
      return;
    }

    if (type === 'include' && keywordExists(excludeKeywords, keyword)) {
      showToast('\uC81C\uC678 \uD0A4\uC6CC\uB4DC\uC5D0 \uC788\uB294 \uB2E8\uC5B4\uB294 \uD3EC\uD568 \uD0A4\uC6CC\uB4DC\uC5D0 \uCD94\uAC00\uD560 \uC218 \uC5C6\uC5B4\uC694');
      return;
    }

    if (type === 'exclude' && keywordExists(includeKeywords, keyword)) {
      showToast('\uD3EC\uD568 \uD0A4\uC6CC\uB4DC\uC5D0 \uC788\uB294 \uB2E8\uC5B4\uB294 \uC81C\uC678 \uD0A4\uC6CC\uB4DC\uC5D0 \uCD94\uAC00\uD560 \uC218 \uC5C6\uC5B4\uC694');
      return;
    }

    if (type === 'include') {
      if (keywordExists(excludeKeywords, keyword)) {
        showToast('제외 키워드에 있는 단어는 포함 키워드에 추가할 수 없어요');
        return;
      }
      setIncludeKeywords((items) => (keywordExists(items, keyword) ? items : [...items, keyword]));
    } else {
      if (keywordExists(includeKeywords, keyword)) {
        showToast('포함 키워드에 있는 단어는 제외 키워드에 추가할 수 없어요');
        return;
      }
      setExcludeKeywords((items) => (keywordExists(items, keyword) ? items : [...items, keyword]));
    }
  };

  const toggleFileType = (type: string) => {
    setSelectedFileTypes((items) => ({ ...items, [type]: !items[type] }));
  };

  const toggleScanSource = (source: 'gmail' | 'drive' | 'folder') => {
    setScanSources((items) => {
      if (source === 'folder') {
        const nextFolder = !items.folder;
        return { ...items, drive: nextFolder, folder: nextFolder };
      }
      return { ...items, [source]: !items[source], folder: source === 'drive' && items.drive ? false : items.folder };
    });
  };

  const toggleDriveFolder = (folder: string) => {
    const isSelectedByParent = getDriveAncestorFolders(folder).some((ancestor) => selectedDriveFolders.includes(ancestor));
    const driveFolderSource = getActiveDriveFolderOptions();

    if (isSelectedByParent) {
      showToast('먼저 상위 폴더를 해제해주세요');
      return;
    }

    setSelectedDriveFolders((items) => {
      const folderGroup = getDriveFolderSelectionGroup(folder, driveFolderSource);
      const fileGroup = getDriveFileSelectionGroup(folder).map((file) => file.id);
      const isSelected = folderGroup.every((item) => items.includes(item)) && fileGroup.every((item) => selectedDriveFiles.includes(item));
      const next = isSelected
        ? items.filter((item) => !folderGroup.includes(item))
        : Array.from(new Set([...items, ...folderGroup]));
      setSelectedDriveFiles((fileItems) => {
        const nextFiles = isSelected
          ? fileItems.filter((item) => !fileGroup.includes(item))
          : Array.from(new Set([...fileItems, ...fileGroup]));
        setScanSources((sources) => ({ ...sources, drive: next.length || nextFiles.length ? true : sources.drive, folder: Boolean(next.length || nextFiles.length) }));
        return nextFiles;
      });
      return next;
    });
  };

  const render = () => {
    const activeDriveFolderOptions = getActiveDriveFolderOptions();
    const visibleDriveFolders = getVisibleDriveFolders(driveCurrentFolder, driveFolderSearch, activeDriveFolderOptions);
    const currentDriveSelectionFolder = driveCurrentFolder;
    const currentDriveFolderGroups = getDriveFolderSelectionGroup(currentDriveSelectionFolder, activeDriveFolderOptions);
    const currentDriveFileIds = Array.from(new Set(getDriveFileSelectionGroup(currentDriveSelectionFolder).map((file) => file.id)));
    const drivePickerTotalItemCount = currentDriveFolderGroups.length + currentDriveFileIds.length;
    const allDriveFoldersSelected =
      drivePickerTotalItemCount > 0 &&
      currentDriveFolderGroups.every((folder) => selectedDriveFolders.includes(folder)) &&
      currentDriveFileIds.every((fileId) => selectedDriveFiles.includes(fileId));
    const driveFolderPathParts = splitDrivePath(currentDriveSelectionFolder);
    const driveFolderBreadcrumbs = [
      { label: '내 Drive', path: driveRootPath, type: 'folder' as const },
      ...driveFolderPathParts.slice(1).map((part, index, parts) => ({
        label: part,
        path: [driveRootPath, ...parts.slice(0, index + 1)].join(' › '),
        type: 'folder' as const,
      })),
    ];
    const isDriveSearching = Boolean(driveFolderSearch.trim());
    const activeScanResult = getCurrentScanResult();
    const storageBackedScan =
      lastScan ??
      (apiStorageSummary
        ? {
            dateLabel: formatApiDate(apiHomeSummary?.latest_scan?.completed_at ?? apiHomeSummary?.latest_scan?.started_at),
            sourceLabel: apiScanSourceLabel(apiHomeSummary?.latest_scan?.scan_source),
            conditionLabel: apiScanSetting ? getPeriodLabel() : 'Swagger API 기준',
            result: apiStorageSummary,
          }
        : null);
    const promoMailItems = activeScanResult.mailItems.filter((item) => item.desc?.includes('광고') || item.desc?.includes('프로모션'));
    const oldMailItems = activeScanResult.mailItems.filter((item) => !promoMailItems.some((mail) => mail.id === item.id));
    const largeDriveIds = new Set(activeScanResult.largeItems.map((item) => item.id));
    const duplicateDriveItems = activeScanResult.driveItems.filter((item) => item.desc?.includes('중복'));
    const duplicateDriveIds = new Set(duplicateDriveItems.map((item) => item.id));
    const oldDriveItems = activeScanResult.driveItems.filter((item) => !largeDriveIds.has(item.id) && !duplicateDriveIds.has(item.id));
    const largeOnlyDriveItems = activeScanResult.largeItems.filter((item) => !duplicateDriveIds.has(item.id));
    const driveRegularItems = driveListMode === 'duplicate' ? duplicateDriveItems : oldDriveItems;
    const filteredPromoMailItems = applyResultFilterSort(promoMailItems, filterDate, filterSize, sortMode);
    const filteredOldMailItems = applyResultFilterSort(oldMailItems, filterDate, filterSize, sortMode);
    const filteredDriveItems = applyResultFilterSort(driveRegularItems, filterDate, filterSize, sortMode);
    const filteredLargeItems = applyResultFilterSort(largeOnlyDriveItems, filterDate, filterSize, sortMode);
    const activeMailListItems = mailListMode === 'promo' ? filteredPromoMailItems : filteredOldMailItems;
    const activeMailListTitle = mailListMode === 'promo' ? '광고·프로모션 메일' : '오래된 메일';
    const activeDriveListTitle = driveListMode === 'duplicate' ? '중복 파일' : '오래된 파일';
    const promoMailCount = promoMailItems.length;
    const oldMailCount = oldMailItems.length;
    const driveCandidateCount = oldDriveItems.length + duplicateDriveItems.length;
    const duplicateDeselectedCount = duplicateDriveItems.filter((item) => !(checked[`drive:${item.id}`] ?? isDefaultCandidateSelected('drive', item.id))).length;
    const selectedMailItems = activeScanResult.mailItems.filter((item) => checked[`mail:${item.id}`] ?? isDefaultCandidateSelected('mail', item.id));
    const selectedDriveItems = activeScanResult.driveItems.filter((item) => checked[`drive:${item.id}`] ?? isDefaultCandidateSelected('drive', item.id));
    const selectedPromoMailCount = promoMailItems.filter((item) => checked[`mail:${item.id}`] ?? isDefaultCandidateSelected('mail', item.id)).length;
    const selectedOldMailCount = oldMailItems.filter((item) => checked[`mail:${item.id}`] ?? isDefaultCandidateSelected('mail', item.id)).length;
    const selectedLargeDriveCount = largeOnlyDriveItems.filter((item) => checked[`drive:${item.id}`] ?? isDefaultCandidateSelected('drive', item.id)).length;
    const selectedRegularDriveCount = driveRegularItems.filter((item) => checked[`drive:${item.id}`] ?? isDefaultCandidateSelected('drive', item.id)).length;
    const selectedMailCleanupCount = selectedMailItems.length;
    const selectedDriveCleanupCount = selectedDriveItems.length;
    const selectedCandidateCount = selectedMailItems.length + selectedDriveItems.length;
    const selectedTotalSizeMB = sumScanItemSize(selectedMailItems) + sumScanItemSize(selectedDriveItems);
    const selectedTotalSizeLabel = formatDataSize(selectedTotalSizeMB);
    const getCategoryStats = (categories: ApiCandidateCategory[], fallbackItems: ScanListItem[]) => {
      const categoryItems = activeScanResult.categorySummaries.filter((item) => item.category && categories.includes(item.category));
      const fallbackCount = fallbackItems.length;
      const fallbackBytes = Math.round(sumScanItemSize(fallbackItems) * 1024 * 1024);
      const categoryCount = categoryItems.reduce((sum, item) => sum + item.itemCount, 0);
      const categoryBytes = categoryItems.reduce((sum, item) => sum + item.estimatedBytes, 0);

      return {
        count: fallbackCount || categoryCount,
        sizeLabel: fallbackBytes ? formatBytes(fallbackBytes) : formatBytes(categoryBytes),
      };
    };
    const promoMailDisplay = getCategoryStats(['PROMOTION_MAIL'], promoMailItems);
    const oldMailDisplay = getCategoryStats(['OLD_MAIL', 'LOW_VALUE_ATTACHMENT'], oldMailItems);
    const oldDriveDisplay = getCategoryStats(['OLD_DRIVE_FILE', 'TEMP_OR_BACKUP'], oldDriveItems);
    const duplicateDriveDisplay = getCategoryStats(['DUPLICATE_FILE'], duplicateDriveItems);
    const largeDriveDisplay = getCategoryStats(['LARGE_FILE'], largeOnlyDriveItems);
    const homeStorageSummary = apiHomeSummary?.storage_summary as
      | (NonNullable<ApiHomeSummary['storage_summary']> & {
          remaining_drive_bytes?: number | null;
          drive_remaining_bytes?: number | null;
          total_drive_bytes?: number | null;
          drive_total_bytes?: number | null;
        })
      | undefined;
    const reportedRemainingDriveBytes = pickValidByteValue(
      homeStorageSummary?.latest_remaining_drive_bytes ??
      undefined,
      homeStorageSummary?.remaining_drive_bytes,
      homeStorageSummary?.drive_remaining_bytes,
    );
    const reportedDriveTotalBytes = pickValidByteValue(
      homeStorageSummary?.total_drive_bytes,
      homeStorageSummary?.drive_total_bytes,
    );
    const homeEstimatedReclaimBytes = homeStorageSummary?.estimated_reclaim_bytes ?? 0;
    const apiSummarySizeDisplayLabel = formatBytes(homeEstimatedReclaimBytes);
    const summaryCandidateDisplayCount = selectedCandidateCount || activeScanResult.candidateCount;
    const summarySizeDisplayLabel = selectedTotalSizeMB > 0 ? selectedTotalSizeLabel : apiSummarySizeDisplayLabel;
    const homeDriveTotalBytes = reportedDriveTotalBytes ?? DEFAULT_GOOGLE_DRIVE_TOTAL_BYTES;
    const knownDriveStoredBytes = (apiStorageSummary?.storageDriveItems ?? []).reduce(
      (sum, item) => sum + (item.type === 'F' ? 0 : Number(item.snapshotSizeBytes ?? 0)),
      0,
    );
    const estimatedRemainingDriveBytes = Math.max(0, homeDriveTotalBytes - knownDriveStoredBytes);
    const latestRemainingDriveBytes =
      reportedRemainingDriveBytes ??
      (permissions.drive ? estimatedRemainingDriveBytes : undefined);
    const hasLatestRemainingDriveBytes = latestRemainingDriveBytes !== undefined && latestRemainingDriveBytes !== null;
    const remainingAfterCleanup = hasLatestRemainingDriveBytes
      ? formatBytes(latestRemainingDriveBytes)
      : '-';
    const homeDriveTotalGB = Math.max(1, homeDriveTotalBytes / 1024 / 1024 / 1024);
    const homeCapacityFreeBytes = latestRemainingDriveBytes;
    const homeCapacityTotalBytes = homeDriveTotalBytes;
    const hasHomeCapacityBytes =
      homeCapacityFreeBytes !== undefined &&
      homeCapacityFreeBytes !== null &&
      homeCapacityTotalBytes !== undefined &&
      homeCapacityTotalBytes > 0;
    const homeCapacityUsagePercent = hasHomeCapacityBytes
      ? Math.max(0, Math.min(100, Math.round(((homeCapacityTotalBytes - homeCapacityFreeBytes) / homeCapacityTotalBytes) * 100)))
      : 0;
    const homeCapacityUsageLabel = hasHomeCapacityBytes ? `${homeCapacityUsagePercent}% 사용` : '사용률 -';
    const homeCapacityRemainingLabel = homeCapacityFreeBytes !== undefined && homeCapacityFreeBytes !== null ? formatBytes(homeCapacityFreeBytes) : '-';
    const cleanupDriveTotalGB = Math.max(1, homeDriveTotalBytes / 1024 / 1024 / 1024);
    const cleanupDriveTotalLabel = formatBytes(homeDriveTotalBytes);
    const cleanupRemainingGB = sizeLabelToMB(remainingAfterCleanup) / 1024;
    const cleanupReclaimedGB = selectedTotalSizeMB / 1024;
    const cleanupCurrentUsedGB = Math.max(0, cleanupDriveTotalGB - cleanupRemainingGB - cleanupReclaimedGB);
    const cleanupCurrentUsedPercent = Math.min(100, Math.max(0, (cleanupCurrentUsedGB / cleanupDriveTotalGB) * 100));
    const cleanupReclaimedPercent = Math.min(100 - cleanupCurrentUsedPercent, Math.max(0, (cleanupReclaimedGB / cleanupDriveTotalGB) * 100));
    const checkedCleanupSizeLabel = selectedTotalSizeLabel;
    const hasLinkedScanJob = (scanJobId?: number | null) => typeof scanJobId === 'number' && scanJobId > 0;
    const scanCleanupHistoryItems = apiCleanupHistoryItems.filter((item) => hasLinkedScanJob(item.scan_job_id));
    const scanHistoryCleanupItems = apiScanHistoryItems.filter((item) => item.cleanup_done === true || (item.reclaimed_bytes ?? 0) > 0);
    const latestCleanupHistory = scanCleanupHistoryItems[0];
    const latestScanHistoryForFallback =
      scanHistoryCleanupItems.find((item) => isCompletedScanStatus(item.job_status)) ?? scanHistoryCleanupItems[0];
    const scanCleanupHistoryBytesTotal = scanCleanupHistoryItems.reduce((sum, item) => sum + (item.reclaimed_bytes ?? 0), 0);
    const scanHistoryCleanupBytesTotal = scanHistoryCleanupItems.reduce((sum, item) => sum + (item.reclaimed_bytes ?? 0), 0);
    const historyScanBytesTotal = scanCleanupHistoryItems.length ? scanCleanupHistoryBytesTotal : scanHistoryCleanupBytesTotal;
    const latestScanHistoryBytes = latestScanHistoryForFallback?.reclaimed_bytes;
    const latestCleanupSizeLabel = latestCleanupHistory?.reclaimed_bytes !== undefined
      ? formatBytes(latestCleanupHistory.reclaimed_bytes)
      : latestScanHistoryBytes !== undefined
        ? formatBytes(latestScanHistoryBytes)
      : formatBytes(0);
    const historyTotalSizeLabel = formatBytes(historyScanBytesTotal);
    const latestCleanupDateLabel = latestCleanupHistory?.completed_at
      ? formatApiDate(latestCleanupHistory.completed_at)
      : latestScanHistoryForFallback?.created_at
        ? formatApiDate(latestScanHistoryForFallback.created_at)
      : lastScan?.dateLabel;
    const latestCleanupDesc = latestCleanupHistory
      ? `정리 항목 ${latestCleanupHistory.cleaned_item_count ?? 0}개`
      : latestScanHistoryForFallback
        ? `${apiScanSourceLabel(latestScanHistoryForFallback.scan_source)} · 정리 후보 ${latestScanHistoryForFallback.candidate_count ?? 0}개`
      : `Gmail ${selectedMailCleanupCount}개 · Drive ${selectedDriveCleanupCount}개`;
    const historyGraphBaseValues = scanCleanupHistoryItems.length
      ? [...scanCleanupHistoryItems].reverse().map((item) => item.reclaimed_bytes ?? 0)
      : scanHistoryCleanupItems.length
        ? [...scanHistoryCleanupItems].reverse().map((item) => item.reclaimed_bytes ?? 0)
        : undefined;
    const cumulativeHistoryGraphValues = historyGraphBaseValues?.reduce<number[]>((values, bytes) => {
      const previous = values[values.length - 1] ?? 0;
      values.push(previous + Math.max(0, bytes));
      return values;
    }, []);
    const historyGraphStartIndex = Math.max(0, (cumulativeHistoryGraphValues?.length ?? 0) - 10);
    const historyGraphValues = cumulativeHistoryGraphValues?.slice(historyGraphStartIndex);
    const historyGraphLabels = historyGraphValues
      ? historyGraphValues.map((_, index) => `${historyGraphStartIndex + index + 1}회`)
      : undefined;
    const hasHistoryData = Boolean(scanCleanupHistoryItems.length || scanHistoryCleanupItems.length);
    const homeScanStatusTitle =
      homeScanNotice === 'completed' ? '스캔이 완료됐어요' : homeScanNotice === 'cancelled' ? '스캔이 중단됐어요' : '스캔 진행 중';
    const homeScanStatusDesc =
      homeScanNotice === 'completed'
        ? `${scanSourceLabelRef.current} · 정리 후보 ${activeScanResult.candidateCount}개`
        : homeScanNotice === 'cancelled'
          ? '다시 스캔하면 새로 분석을 시작해요.'
          : `${scanSourceLabelRef.current} · ${scanProgress}%`;
    const isCleanupRunning = deleteJobStatus === 'running';
    const homeCleanupStatusTitle = '휴지통 이동 중';
    const homeCleanupStatusDesc = `선택 항목 처리 중 · ${deleteProgress}%`;

    switch (screen) {
      case 'initial':
        return (
          <ScreenShell noNav>
            <View style={styles.heroSpacer} />
            <Logo large />
            <Text style={styles.heroTitle}>
              <Text style={styles.heroTitleBrand}>AURA</Text>
              로 개인 클라우드 관리{'\n'}시작해 보세요
            </Text>
            <View style={styles.initialActionBlock}>
              <Pressable style={styles.initialConsentLink} onPress={handleInitialPrivacyPress}>
                <View style={styles.initialConsentLinkTextBox}>
                  <View style={styles.initialConsentTitleRow}>
                    <CheckBox checked={privacyChecked} onPress={handleInitialPrivacyPress} compact />
                    <Text style={styles.initialConsentLinkText}>개인정보 수집 및 분석 동의 보기</Text>
                  </View>
                  <View style={styles.initialConsentLinkLine} />
                </View>
              </Pressable>
              <PrimaryButton
                title={authLoading ? '\uB85C\uADF8\uC778 \uC5F0\uACB0 \uC911...' : '\uAD6C\uAE00 \uACC4\uC815\uC73C\uB85C \uACC4\uC18D'}
                onPress={() => {
                  void handleNativeGoogleContinue();
                }}
                inline
              />
            </View>
          </ScreenShell>
        );

      case 'privacy':
        return (
          <ScreenShell title="개인정보 수집·이용 동의" noNav>
            <Card style={styles.privacyCombinedCard}>
              <View style={styles.privacyBlock}>
                <SectionTitle>수집 및 이용 항목</SectionTitle>
                <PrivacyBody>· Google 계정 식별 정보{'\n'}· Gmail 제목·날짜·첨부 용량{'\n'}· Drive 파일명·용량·수정일·해시{'\n'}· 정리 및 분석 기록</PrivacyBody>
              </View>
              <View style={styles.privacyBlock}>
                <SectionTitle>이용 목적</SectionTitle>
                <PrivacyBody>· 맞춤형 유령 데이터 탐지{'\n'}· 중복 파일 비교와 정리 추천{'\n'}· 정리 용량 계산 및 통계</PrivacyBody>
              </View>
              <View style={styles.privacyBlock}>
                <SectionTitle>보유 기간</SectionTitle>
                <PrivacyBody>서비스 탈퇴 또는 Google 연결 해제 시까지</PrivacyBody>
              </View>
            </Card>
            <Pressable style={[styles.consentRow, styles.privacyAgreeRow]} onPress={acceptPrivacyDetailConsent}>
              <CheckBox checked={privacyDetailChecked} onPress={acceptPrivacyDetailConsent} />
              <Text style={styles.consentText}>필수 수집 및 분석에 동의합니다</Text>
            </Pressable>
          </ScreenShell>
        );

      case 'permissions':
        return (
          <ScreenShell title="푸시 알림 설정" noNav>
            <PushNotificationPermissionContent />
            <Pressable style={[styles.consentRow, styles.privacyAgreeRow]} onPress={togglePushPermissionConsent}>
              <CheckBox checked={permissions.alarm} onPress={togglePushPermissionConsent} />
              <Text style={styles.consentText}>푸시 알림에 동의합니다</Text>
            </Pressable>
            <View style={styles.pushPermissionButtonSpacer} />
            <PrimaryButton title="계속하기" onPress={completeLoginPermissionSetup} />
          </ScreenShell>
        );

      case 'gmailPermission':
      case 'drivePermission':
      case 'notificationPermission':
        return (
          <PermissionDetail
            screen={screen}
            back={back}
            onServicePermissionChange={syncUserPermissions}
            requestPushPermission={requestPushPermission}
            enableGoogleServicePermission={enableGoogleServicePermission}
            disableGoogleServicePermission={disableGoogleServicePermission}
          />
        );

      case 'connected':
        return (
          <ScreenShell noNav>
            <ConnectedSuccessIcon
              skip={skipConnectedAnimation}
              onDone={() => {
                setConnectedDone(true);
                setHasSeenConnectedSuccess(true);
              }}
            />
            {connectedDone ? (
              <RevealIn duration={skipConnectedAnimation ? 0 : 220} distance={skipConnectedAnimation ? 0 : 5}>
                <Text style={styles.centerTitle}>모든 서비스가 연결됐어요</Text>
              </RevealIn>
            ) : null}
            <ConnectedInfoRow iconSource={gmailIcon} title="Gmail" connected={permissions.gmail} visible={connectedStep >= 1} instant={skipConnectedAnimation} />
            <ConnectedInfoRow iconSource={googleDriveIcon} title="Drive" connected={permissions.drive} visible={connectedStep >= 2} instant={skipConnectedAnimation} />
            {connectedStep >= 3 ? (
              <RevealIn style={styles.connectedButtonReveal} duration={skipConnectedAnimation ? 0 : 460} distance={skipConnectedAnimation ? 0 : 12}>
                <PrimaryButton title="AURA 둘러보기" onPress={() => go('onboardingIntro')} inline />
              </RevealIn>
            ) : null}
          </ScreenShell>
        );

      case 'onboardingIntro':
        return (
          <ScreenShell noNav disableScroll>
            <View style={styles.onboardingIntroContent}>
              <Logo large />
              <View style={styles.onboardingIntroTextBox}>
                <View style={styles.onboardingIntroTitleRow}>
                  <AuraGradientWord size={34} />
                  <Text style={styles.onboardingIntroTitleText}>(AI-based Unused Resource Analyzer)는</Text>
                </View>
                <Text style={styles.onboardingIntroBody}>AI 기반 개인 클라우드 관리 서비스 입니다.</Text>
              </View>
            </View>
            <View style={styles.onboardingButtonReveal}>
              <View style={styles.auraFeelPlaceholder} />
              <PrimaryButton title="다음" onPress={() => go('onboardingGhost')} inline />
            </View>
          </ScreenShell>
        );

      case 'onboardingGhost':
        return (
          <ScreenShell title="유령 데이터 탐지" noNav disableScroll>
            <GhostScanAnimation skip onDone={() => setOnboardingGhostDone(true)} />
            <View style={styles.onboardingDescriptionRow}>
              <View style={styles.onboardingDescriptionIcon}>
                <FontAwesome5 name="ghost" size={28} color={navy} solid />
              </View>
              <Text style={[styles.centerBody, styles.onboardingDescriptionText]}>스캔이 끝나면 메일과 Drive 정리 후보를 분류별로 보여줘요.</Text>
            </View>
            <View style={styles.onboardingButtonReveal}>
              <View style={styles.auraFeelPlaceholder} />
              <PrimaryButton title="다음" onPress={() => go('onboardingCarbon')} inline />
            </View>
          </ScreenShell>
        );

      case 'onboardingCarbon':
        return (
          <ScreenShell title="스캔 이력 관리" noNav disableScroll>
            <CarbonSaveAnimation skip={onboardingCarbonDone} onDone={() => setOnboardingCarbonDone(true)} />
            <View style={styles.onboardingDescriptionRow}>
              <View style={styles.onboardingDescriptionIcon}>
                <FontAwesome5 name="chart-line" size={28} color={navy} />
              </View>
              <Text style={[styles.centerBody, styles.onboardingDescriptionText]}>정리한 클라우드 용량을 누적 그래프로 확인해요.</Text>
            </View>
            <View style={styles.auraFeelReveal}>
              <View style={styles.auraFeelTextRow}>
                <Text style={styles.auraFeelText}>이제</Text>
                <AuraGradientWord size={27} />
                <Text style={styles.auraFeelText}>를 경험해보세요!</Text>
              </View>
            </View>
            <View style={styles.onboardingButtonReveal}>
              <PrimaryButton title="AURA 시작하기" onPress={() => replace('home')} inline />
            </View>
          </ScreenShell>
        );

      case 'home':
        if (apiBootstrapLoading) {
          return (
            <ScreenShell title="홈" titleIcon="home" hideBack tightBottom disableScroll hideFloatingScan>
              <ServerDataLoadingState />
            </ScreenShell>
          );
        }

        return (
          <ScreenShell title="홈" titleIcon="home" hideBack tightBottom hideFloatingScan={homeScanNotice === 'completed'}>
            <Card tint style={styles.capacityCard}>
              <View style={styles.capacityCardRow}>
                <View style={styles.infoMain}>
                  <Text style={styles.cardLabel}>남은 용량</Text>
                  <Text style={styles.bigNumber}>{homeCapacityRemainingLabel}</Text>
                </View>
                <View style={styles.capacityUsageBox}>
                  <Text style={styles.capacityUsageText}>{homeCapacityUsageLabel}</Text>
                  <View style={styles.capacityUsageTrack}>
                    <View style={[styles.capacityUsageFill, { width: `${homeCapacityUsagePercent}%` }]} />
                  </View>
                </View>
              </View>
            </Card>
            <Pressable onPress={() => go('recentDetail')}>
              <Card tint style={styles.homeSummaryCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>최근 분석 요약</Text>
                  <View style={styles.homeDetailAction}>
                    <View style={styles.homeDetailPill}>
                      <Text style={styles.homeDetailText}>상세</Text>
                    </View>
                    <Text style={styles.homeChevron}>›</Text>
                  </View>
                </View>
                {lastScan ? (
                  <>
                    <Text style={styles.meta}>
                      마지막 스캔 {formatScanDateOnly(lastScan.dateLabel)} · {lastScan.sourceLabel}
                    </Text>
                    <View style={styles.divider} />
                    <View style={styles.homeSummaryCapacityRow}>
                      <View style={styles.infoMain}>
                        <Text style={styles.homeSummaryCapacityLabel} numberOfLines={1}>확보용량</Text>
                        <Text style={styles.homeSummaryValue}>{summarySizeDisplayLabel}</Text>
                      </View>
                      <Pressable
                        style={styles.homeTrashIconButton}
                        onPress={(event) => {
                          event.stopPropagation();
                          replace('storageTrash');
                        }}
                      >
                        <TrashOutlineIcon />
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <View style={styles.homeEmptySummary}>
                    <Feather name="clock" size={42} color={mutedText} />
                    <Text style={styles.homeEmptyTitle}>아직 분석 기록이 없어요</Text>
                  </View>
                )}
              </Card>
            </Pressable>
            {homeScanNotice !== 'none' && !isCleanupRunning ? (
              <Card style={styles.homeScanStatusCard}>
                <View style={styles.rowBetween}>
                  <View style={styles.infoMain}>
                    <Text style={styles.cardTitle}>{homeScanStatusTitle}</Text>
                    <Text style={styles.meta}>{homeScanStatusDesc}</Text>
                  </View>
                  {homeScanNotice === 'running' ? (
                    <Text style={styles.homeScanBadge}>진행중</Text>
                  ) : homeScanNotice === 'completed' ? (
                    <Text style={styles.homeScanBadge}>완료</Text>
                  ) : (
                    <Text style={styles.homeScanBadgeMuted}>중지됨</Text>
                  )}
                </View>
                {homeScanNotice === 'running' ? (
                  <>
                    <View style={styles.miniProgressTrack}>
                      <View style={[styles.miniProgressFill, { width: `${scanProgress}%` }]} />
                    </View>
                    <View style={styles.scanStatusActions}>
                      <Pressable style={styles.scanStatusButton} onPress={() => go('scanProgress')}>
                        <Text style={styles.scanStatusButtonText}>스캔 화면 보기</Text>
                      </Pressable>
                      <Pressable style={styles.scanStatusCancel} onPress={cancelScan}>
                        <Text style={styles.scanStatusCancelText}>취소</Text>
                      </Pressable>
                    </View>
                  </>
                ) : homeScanNotice === 'completed' ? (
                  <View style={styles.scanStatusActions}>
                    <Pressable style={styles.scanStatusButton} onPress={openCompletedScanResult}>
                      <Text style={styles.scanStatusButtonText}>결과 보러가기</Text>
                    </Pressable>
                  </View>
                ) : null}
              </Card>
            ) : null}
            {isCleanupRunning ? (
              <Card style={styles.homeScanStatusCard}>
                <View style={styles.rowBetween}>
                  <View style={styles.infoMain}>
                    <Text style={styles.cardTitle}>{homeCleanupStatusTitle}</Text>
                    <Text style={styles.meta}>{homeCleanupStatusDesc}</Text>
                  </View>
                  <Text style={styles.homeScanBadge}>진행중</Text>
                </View>
                <View style={styles.miniProgressTrack}>
                  <View style={[styles.miniProgressFill, { width: `${deleteProgress}%` }]} />
                </View>
                <View style={styles.scanStatusActions}>
                  <Pressable style={styles.scanStatusButton} onPress={() => go('deleteProcessing')}>
                    <Text style={styles.scanStatusButtonText}>진행 화면 보기</Text>
                  </Pressable>
                  <Pressable style={styles.scanStatusCancel} onPress={cancelCleanupJob}>
                    <Text style={styles.scanStatusCancelText}>취소</Text>
                  </Pressable>
                </View>
              </Card>
            ) : null}
            <View style={styles.homeActionSpacer} />
            <OutlineButton title="키워드 설정하기" onPress={() => go('keywordFile')} />
            {homeScanNotice !== 'completed' ? (
              <PrimaryButton
                title={homeScanNotice === 'running' ? '스캔중' : '스캔하기'}
                onPress={handleHomeScanPress}
                inline
              />
            ) : null}
          </ScreenShell>
        );

      case 'recentDetail':
        return lastScan ? (
          <ScreenShell title="최근 분석 상세">
            <SectionTitle>최근 분석 요약</SectionTitle>
            <View style={styles.recentHeroCard}>
              <View style={styles.recentHeroHeaderRow}>
                <View style={styles.infoMain}>
                  <Text style={styles.recentHeroDate}>{formatScanDateOnly(lastScan.dateLabel)}</Text>
                </View>
                <Text style={styles.recentHeroSizeValue}>{summarySizeDisplayLabel}</Text>
              </View>
              <Text style={styles.infoDesc}>{lastScan.sourceLabel}</Text>
              <View style={styles.thinDivider} />
              <View style={styles.rowBetween}>
                <Text style={[styles.cardLabel, styles.textStrong]}>정리 후보</Text>
                <Text style={styles.rowRight}>{summaryCandidateDisplayCount}개</Text>
              </View>
            </View>
            <SectionTitle>분류별 결과</SectionTitle>
            <RecentResultRow
              title="광고·프로모션 메일"
              value={`${promoMailDisplay.count}개\n${promoMailDisplay.sizeLabel}`}
            />
            <RecentResultRow
              title="오래된 메일"
              value={`${oldMailDisplay.count}개\n${oldMailDisplay.sizeLabel}`}
            />
            <RecentResultRow
              title="오래된 파일"
              value={`${oldDriveDisplay.count}개\n${oldDriveDisplay.sizeLabel}`}
            />
            <RecentResultRow
              title="중복 파일"
              value={`${duplicateDriveDisplay.count}개\n${duplicateDriveDisplay.sizeLabel}`}
            />
            <RecentResultRow
              title="대용량 파일"
              value={`${largeDriveDisplay.count}개\n${largeDriveDisplay.sizeLabel}`}
            />
          </ScreenShell>
        ) : (
          <ScreenShell title="최근 분석 상세">
            <EmptyState
              title="아직 최근 분석이 없어요"
              desc="스캔을 시작하면 분석 일자, 스캔한 서비스, 정리 후보가 이곳에 표시돼요."
            />
            <PrimaryButton title="스캔 시작하기" onPress={() => go('scanFlowSource')} />
          </ScreenShell>
        );

      case 'keywordFile':
        return (
          <ScreenShell title="삭제 대상 키워드 설정">
            <InfoRow title="삭제 대상 포함 키워드" desc={includeKeywords.join(', ')} onPress={() => openKeywordSheet('include')} />
            <InfoRow title="삭제 대상 제외 키워드" desc={excludeKeywords.join(', ')} onPress={() => openKeywordSheet('exclude')} />
            <PrimaryButton title="조건 적용" onPress={back} />
          </ScreenShell>
        );

      case 'includeKeyword':
      case 'excludeKeyword':
        return (
          <KeywordEditor
            type={screen === 'includeKeyword' ? 'include' : 'exclude'}
            keywords={screen === 'includeKeyword' ? includeKeywords : excludeKeywords}
            input={screen === 'includeKeyword' ? includeInput : excludeInput}
            setInput={screen === 'includeKeyword' ? setIncludeInput : setExcludeInput}
            addKeyword={addKeyword}
            removeKeyword={removeKeyword}
            back={back}
          />
        );

      case 'scanFlowSource':
        return (
          <ScreenShell title="스캔 소스 선택">
            <ScanSourceCard
              title="Gmail"
              checked={scanSources.gmail}
              onPress={() => {
                if (!permissions.gmail) {
                  showToast('연결이 허용되지 않았어요');
                  return;
                }
                toggleScanSource('gmail');
              }}
            />
            <ScanSourceCard
              title="Drive"
              checked={scanSources.drive || scanSources.folder}
              detail="폴더 선택"
              onPress={() => {
                if (!permissions.drive) {
                  showToast('연결이 허용되지 않았어요');
                  return;
                }
                go('scanFlowFolder');
              }}
              onDetailPress={() => {
                if (!permissions.drive) {
                  showToast('연결이 허용되지 않았어요');
                  return;
                }
                go('scanFlowFolder');
              }}
            />
            <PrimaryButton
              title={scanSourceEditOnly ? '조건 적용하기' : '다음'}
              onPress={() => {
                if (scanSourceEditOnly) {
                  void saveApiScanSettings().then((saved) => {
                    if (!saved) return;
                    resetSettingsScanFlowNavigation();
                    setScanSourceEditOnly(false);
                    replace('defaultScan');
                  });
                  return;
                }
                setPeriodEditOnly(false);
                go('scanFlowPeriod');
              }}
            />
          </ScreenShell>
        );

      case 'scanFlowFolder':
        return (
          <ScreenShell title="Drive 폴더 선택" tightBottom>
            <Pressable style={styles.folderSelectAllInlineRow} onPress={toggleAllDriveFolders}>
              <CheckBox checked={allDriveFoldersSelected} onPress={toggleAllDriveFolders} compact />
              <Text style={styles.folderSelectAllTitle}>{allDriveFoldersSelected ? '전체 선택 해제' : '전체 선택'}</Text>
            </Pressable>
            <View style={styles.folderListBox}>
              <View style={styles.folderBreadcrumbCard}>
                <View style={styles.folderBreadcrumbClickableRow}>
                  {driveFolderBreadcrumbs.map((crumb, index, parts) => {
                    return (
                      <React.Fragment key={crumb.path}>
                        <Pressable onPress={() => setDriveCurrentFolder(crumb.path)} hitSlop={8}>
                          <Text style={[styles.folderBreadcrumbTitle, index < parts.length - 1 && styles.folderBreadcrumbAncestor]}>{crumb.label}</Text>
                        </Pressable>
                        {index < parts.length - 1 ? <Text style={styles.folderBreadcrumbDivider}>›</Text> : null}
                      </React.Fragment>
                    );
                  })}
                </View>
              </View>
              <View style={styles.folderBreadcrumbRule} />
              {driveFolderLoading ? <Text style={styles.infoDesc}>Drive 폴더를 불러오는 중이에요</Text> : null}
              {driveFolderError ? (
                <View style={styles.warningCard}>
                  <Text style={styles.warningText}>{driveFolderError}</Text>
                  <View style={styles.twoButtons}>
                    <OutlineButton title="재시도" onPress={() => void loadApiDriveFolders(driveCurrentFolder)} half />
                    <PrimaryButton title="권한 재연결" onPress={() => void requestGoogleReconnect(['DRIVE'])} half />
                  </View>
                </View>
              ) : null}
              <ScrollView
                style={styles.folderListScroll}
                contentContainerStyle={styles.folderListContent}
                nestedScrollEnabled
                showsVerticalScrollIndicator={visibleDriveFolders.length > 5}
              >
                {visibleDriveFolders.length ? (
                  visibleDriveFolders.map((folder) => (
                    <FolderRow
                      key={folder.name}
                      title={isDriveSearching ? folder.name : getDriveFolderName(folder.name)}
                      desc={undefined}
                      selected={getDriveFolderSelected(folder.name, selectedDriveFolders, selectedDriveFiles, activeDriveFolderOptions)}
                      canOpen={hasDriveFolderChildren(folder.name, activeDriveFolderOptions)}
                      onPress={() => toggleDriveFolder(folder.name)}
                      onOpen={() => {
                        setDriveFolderSearch('');
                        setDriveCurrentFolder(folder.name);
                      }}
                    />
                  ))
                ) : null}
                {!visibleDriveFolders.length ? (
                  <EmptyState
                    title={driveFolderSearch.trim() ? '폴더 없음' : '비어있는 폴더'}
                    desc={driveFolderSearch.trim() ? '검색 결과에 해당하는 폴더가 없어요.' : '현재 폴더 안에 하위 폴더가 없어요.'}
                  />
                ) : null}
              </ScrollView>
            </View>
            <PrimaryButton title="폴더 선택 완료" onPress={() => (scanSourceEditOnly ? replace('scanFlowSource') : back())} />
          </ScreenShell>
        );

      case 'scanFlowPeriod':
        return (
          <ScreenShell title="기간 조건">
            <MonthConditionRow
              title="마지막으로 연 날짜"
              periodText={`${formatMonthDuration(lastOpenedBeforeMonths)} 이상`}
              onPress={() => openPeriodMonthSheet('opened')}
            />
            <MonthConditionRow
              title="마지막 수정일"
              periodText={`${formatMonthDuration(lastModifiedBeforeMonths)} 이상`}
              onPress={() => openPeriodMonthSheet('modified')}
            />
            <PrimaryButton
              title={periodEditOnly ? '기간 조건 저장' : '기간 조건 저장 후 스캔하기'}
              onPress={
                periodEditOnly
                  ? () => {
                      void saveApiScanSettings().then((saved) => {
                        if (!saved) return;
                        resetSettingsScanFlowNavigation();
                        setPeriodEditOnly(false);
                        replace('defaultScan');
                      });
                    }
                  : startScan
              }
            />
          </ScreenShell>
        );

      case 'scanSource':
        return (
          <ScreenShell title="스캔 소스 선택">
            <InfoRow title="Gmail" />
            <InfoRow title="Drive" />
            <InfoRow title="특정 Drive 폴더" onPress={() => go('driveFolder')} />
            <PrimaryButton title="다음" onPress={() => go('period')} />
          </ScreenShell>
        );

      case 'driveFolder':
        return (
          <ScreenShell title="Drive 폴더 선택">
            {['AURA 작업물', '개인 자료', '학교 과제', '디자인 자료'].map((item) => (
              <InfoRow key={item} title={item} />
            ))}
            <PrimaryButton title="폴더 선택 완료" onPress={() => go('period')} />
          </ScreenShell>
        );

      case 'period':
        return (
          <ScreenShell title="기간 조건">
            <MonthConditionRow
              title="마지막으로 연 날짜"
              periodText={`${formatMonthDuration(lastOpenedBeforeMonths)} 이상`}
              onPress={() => openPeriodMonthSheet('opened')}
            />
            <MonthConditionRow
              title="마지막 수정일"
              periodText={`${formatMonthDuration(lastModifiedBeforeMonths)} 이상`}
              onPress={() => openPeriodMonthSheet('modified')}
            />
            <PrimaryButton title="기간 조건 적용 & 스캔하기" onPress={startScan} />
          </ScreenShell>
        );

      case 'scanProgress':
        return (
          <ScreenShell title="스캔 진행" disableScroll>
            <View style={styles.scanFullContent}>
              <Card tint style={styles.scanFullPanel}>
                <Text style={styles.scanFullKicker}>AURA가 분석 중이에요</Text>
                <ProgressCircle progress={scanProgress} compact />
                <Text style={styles.scanFullStatusText}>{scanStatusText}</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${scanProgress}%` }]} />
                </View>
                <View style={styles.progressActionRow}>
                  <Pressable style={styles.progressCancelButton} onPress={cancelScan}>
                    <Text style={styles.progressCancelButtonText}>취소하기</Text>
                  </Pressable>
                  <Pressable style={styles.progressHomeButton} onPress={() => replace('home')}>
                    <Text style={styles.progressHomeButtonText}>홈으로 이동</Text>
                  </Pressable>
                </View>
              </Card>
              <View style={styles.scanFullStatusGrid}>
                <DeleteStatusRow
                  service="gmail"
                  title="Gmail"
                  status={scanProgress >= 50 ? '완료' : '진행'}
                  done={scanProgress >= 50}
                />
                <DeleteStatusRow
                  service="drive"
                  title="Google Drive"
                  status={scanProgress >= 100 ? '완료' : '진행'}
                  done={scanProgress >= 100}
                />
              </View>
            </View>
          </ScreenShell>
        );

      case 'candidateSummary':
        return (
          <ScreenShell title="분석 결과 요약" disableScroll>
            {candidateSummaryLoading ? (
              <View style={styles.inlineLoadingState}>
                <ActivityIndicator size="large" color={navy} />
                <Text style={styles.inlineLoadingText}>분석 결과를 불러오는 중이에요</Text>
              </View>
            ) : (
              <>
                <View style={styles.resultMetricGrid}>
                  <ResultMetricCard label="정리 후보" value={`${summaryCandidateDisplayCount}개`} />
                  <ResultMetricCard label="예상 확보" value={summarySizeDisplayLabel} />
                </View>
                <ResultCategoryCard
                  title="광고·프로모션 메일"
                  desc={`${promoMailDisplay.count}개 · ${promoMailDisplay.sizeLabel}`}
                  onPress={() => {
                    setMailListMode('promo');
                    go('mailList');
                  }}
                />
                <ResultCategoryCard
                  title="오래된 메일"
                  desc={`${oldMailDisplay.count}개 · ${oldMailDisplay.sizeLabel}`}
                  onPress={() => {
                    setMailListMode('old');
                    go('mailList');
                  }}
                />
                <ResultCategoryCard
                  title="오래된 파일"
                  desc={`${oldDriveDisplay.count}개 · ${oldDriveDisplay.sizeLabel}`}
                  onPress={() => {
                    setDriveListMode('old');
                    go('driveList');
                  }}
                />
                <ResultCategoryCard
                  title="중복 파일"
                  desc={`${duplicateDriveDisplay.count}개 · ${duplicateDriveDisplay.sizeLabel}`}
                  warning={duplicateDeselectedCount ? `미선택 ${duplicateDeselectedCount}개` : undefined}
                  onPress={() => {
                    setDriveListMode('duplicate');
                    go('driveList');
                  }}
                />
                <ResultCategoryCard
                  title="대용량 파일"
                  desc={`${largeDriveDisplay.count}개 · ${largeDriveDisplay.sizeLabel}`}
                  onPress={() => go('largeList')}
                />
                <Pressable onPress={() => activeScanResult.protectedItems.length ? go('protectedList') : showToast('제외 키워드로 보호된 항목이 없어요')}>
                  <Text style={styles.resultGuideText}>제외 키워드로 보호된 대상을 확인하세요</Text>
                </Pressable>
                {summaryCandidateDisplayCount > 0 ? (
                  <PrimaryButton title={selectedCandidateCount > 0 ? '다음' : '후보 목록 다시 불러오기'} onPress={openSelectedReviewFromSummary} inline />
                ) : (
                  <OutlineButton title="취소" onPress={cancelEmptyScanResult} />
                )}
              </>
            )}
            <View style={styles.resultBottomSpacer} />
          </ScreenShell>
        );

      case 'mailList':
        return (
          <ListScreen
            title={activeMailListTitle}
            prefix="mail"
            items={activeMailListItems}
            goNext={back}
            checked={checked}
            toggle={toggleCheck}
            setAll={setAll}
            openFilter={openFilterSheet}
            isDefaultCandidateSelected={isDefaultCandidateSelected}
            formatDataSize={formatDataSize}
            sumScanItemSize={sumScanItemSize}
            onOpenItem={(item) => {
              setSelectedScanItem(item);
              go('mailDetail');
            }}
          />
        );

      case 'driveList':
        return (
          <ListScreen
            title={activeDriveListTitle}
            prefix="drive"
            items={filteredDriveItems}
            goNext={back}
            checked={checked}
            toggle={toggleCheck}
            setAll={setAll}
            openFilter={openFilterSheet}
            isDefaultCandidateSelected={isDefaultCandidateSelected}
            formatDataSize={formatDataSize}
            sumScanItemSize={sumScanItemSize}
            notice={driveListMode === 'duplicate' ? '유사 중복 파일은 안전을 위해 미선택으로 제공돼요.\n삭제할 항목만 직접 선택해주세요.' : undefined}
            onOpenItem={(item) => {
              setSelectedScanItem(item);
              go('fileDetail');
            }}
          />
        );

      case 'largeList':
        return (
          <ListScreen
            title="대용량 파일"
            prefix="drive"
            items={filteredLargeItems}
            goNext={back}
            checked={checked}
            toggle={toggleCheck}
            setAll={setAll}
            openFilter={openFilterSheet}
            isDefaultCandidateSelected={isDefaultCandidateSelected}
            formatDataSize={formatDataSize}
            sumScanItemSize={sumScanItemSize}
            onOpenItem={(item) => {
              setSelectedScanItem(item);
              go('fileDetail');
            }}
          />
        );

      case 'protectedList':
        return (
          <ProtectedListScreen
            items={activeScanResult.protectedItems}
            onOpenItem={(item) => {
              setSelectedScanItem(item);
              go(item.source === 'mail' ? 'mailDetail' : 'fileDetail');
            }}
          />
        );

      case 'mailDetail':
        return (
          <ScanItemDetailScreen
            title="메일 상세"
            item={selectedScanItem ?? activeScanResult.mailItems[0]}
            kind="mail"
            apiAccessToken={apiAccessToken}
            getErrorMessage={getErrorMessage}
            pickReadableText={pickReadableText}
            buildGoogleDriveWebViewLink={buildGoogleDriveWebViewLink}
            formatDataSize={formatDataSize}
          />
        );

      case 'fileDetail':
        return (
          <ScanItemDetailScreen
            title="파일 상세"
            item={selectedScanItem ?? activeScanResult.driveItems[0] ?? activeScanResult.largeItems[0]}
            kind="drive"
            apiAccessToken={apiAccessToken}
            getErrorMessage={getErrorMessage}
            pickReadableText={pickReadableText}
            buildGoogleDriveWebViewLink={buildGoogleDriveWebViewLink}
            formatDataSize={formatDataSize}
          />
        );

      case 'selectedReview':
        return (
          <ScreenShell title="선택 항목 검토" disableScroll>
            <View style={styles.reviewMetricGrid}>
              <ResultMetricCard label="선택 항목" value={`${selectedCandidateCount}개`} />
              <ResultMetricCard label="예상 확보" value={checkedCleanupSizeLabel} />
            </View>
            <ReviewSummaryCard
              title={`Gmail 메일 ${selectedMailCleanupCount}개`}
              desc={`광고 ${selectedPromoMailCount} · 오래된 메일 ${selectedOldMailCount}`}
            />
            <ReviewSummaryCard
              title={`Drive 파일 ${selectedDriveCleanupCount}개`}
              desc={`중복 ${selectedRegularDriveCount} · 대용량 ${selectedLargeDriveCount}`}
            />
            <ReviewSummaryCard
              title="보호 항목 제외"
              desc="영수증 · 계약서 · 즐겨찾기"
            />
            <Text style={styles.reviewWarningText}>보호할 항목이 있다면 이전 목록에서 체크를 해제하세요.</Text>
            <PrimaryButton title="휴지통으로 이동" onPress={() => go('deleteConfirm')} />
            <OutlineButton title="요약 화면으로 돌아가기" onPress={() => replace('candidateSummary')} />
          </ScreenShell>
        );

      case 'deleteConfirm':
        return (
          <View style={styles.modalScreenRoot}>
            <ScreenShell title="선택 항목 검토" disableScroll>
              <View style={styles.reviewMetricGrid}>
                <ResultMetricCard label="선택 항목" value={`${selectedCandidateCount}개`} />
                <ResultMetricCard label="예상 확보" value={checkedCleanupSizeLabel} />
              </View>
              <ReviewSummaryCard
                title={`Gmail 메일 ${selectedMailCleanupCount}개`}
                desc={`광고 ${selectedPromoMailCount} · 오래된 메일 ${selectedOldMailCount}`}
              />
              <ReviewSummaryCard
                title={`Drive 파일 ${selectedDriveCleanupCount}개`}
                desc={`중복 ${selectedRegularDriveCount} · 대용량 ${selectedLargeDriveCount}`}
              />
              <ReviewSummaryCard
                title="보호 항목 제외"
                desc="영수증 · 계약서 · 즐겨찾기"
              />
              <Text style={styles.reviewWarningText}>보호할 항목이 있다면 이전 목록에서 체크를 해제하세요.</Text>
              <PrimaryButton title="휴지통으로 이동" onPress={() => {}} />
              <OutlineButton title="요약 화면으로 돌아가기" onPress={() => replace('candidateSummary')} />
            </ScreenShell>
            <Animated.View
              style={[
                styles.deleteConfirmOverlay,
                {
                  opacity: deleteConfirmMotion.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0],
                  }),
                },
              ]}
            >
              <Pressable style={StyleSheet.absoluteFill} onPress={back} />
              <BottomSheetPanel motion={deleteConfirmMotion} outputRange={[0, 260]} style={styles.deleteApprovalPanel} onClose={back}>
                <Text style={styles.deleteApprovalTitle}>휴지통 이동을 승인하시겠어요?</Text>
                <Text style={styles.deleteApprovalDesc}>선택한 {selectedCandidateCount}개 항목을 휴지통으로 이동합니다.</Text>
                <View style={styles.twoButtons}>
                  <OutlineButton title="취소" onPress={back} half />
                  <PrimaryButton
                    title="승인하기"
                    onPress={startDeleteJob}
                    half
                  />
                </View>
              </BottomSheetPanel>
            </Animated.View>
          </View>
        );

      case 'deleteProcessing':
        return (
          <ScreenShell title="휴지통 이동" disableScroll>
            <ProgressCircle progress={deleteProgress} compact />
            <DeleteStatusRow
              service="gmail"
              title="Gmail"
              status={deleteProgress >= 45 ? '완료' : '진행'}
              done={deleteProgress >= 45}
            />
            <DeleteStatusRow
              service="drive"
              title="Google Drive"
              status={deleteProgress >= 100 ? '완료' : '진행'}
              done={deleteProgress >= 100}
            />
            <Text style={styles.progressLabel}>전체 이동 진행</Text>
            <Text style={styles.infoDesc}>{deleteStatusText}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${deleteProgress}%` }]} />
            </View>
            <View style={styles.progressActionRow}>
              <Pressable style={styles.progressCancelButton} onPress={cancelCleanupJob}>
                <Text style={styles.progressCancelButtonText}>취소하기</Text>
              </Pressable>
              <Pressable style={styles.progressHomeButton} onPress={() => replace('home')}>
                <Text style={styles.progressHomeButtonText}>홈으로 이동</Text>
              </Pressable>
            </View>
            <Text style={styles.remainingCapacityText}>현재 남은 용량 {remainingAfterCleanup}</Text>
          </ScreenShell>
        );

      case 'cleanupComplete':
        return (
          <ScreenShell title="정리 완료" hideBack tightBottom disableScroll>
            <Text style={styles.cleanupTitle}>정리가 완료됐어요!</Text>
            <Card tint style={styles.cleanupCountCard}>
              <Text style={[styles.cardLabel, styles.textStrong]}>정리 항목</Text>
              <View style={styles.cleanupCountInnerRow}>
                <View style={styles.cleanupCountInnerCard}>
                  <Text style={styles.cleanupCountLabel}>메일</Text>
                  <Text style={styles.cleanupCountValue}>{selectedMailCleanupCount}개</Text>
                </View>
                <View style={styles.cleanupCountInnerCard}>
                  <Text style={styles.cleanupCountLabel}>Drive</Text>
                  <Text style={styles.cleanupCountValue}>{selectedDriveCleanupCount}개</Text>
                </View>
              </View>
            </Card>
            <Card tint style={styles.cleanupCapacityCard}>
              <View style={styles.cleanupCapacityMetricRow}>
                <Text style={[styles.cardLabel, styles.textStrong]}>확보 용량</Text>
                <Text style={styles.cleanupCapacityValue}>{checkedCleanupSizeLabel}</Text>
              </View>
              <View style={styles.cleanupCapacityMetricRow}>
                <Text style={[styles.cardLabel, styles.textStrong]}>남은 용량</Text>
                <Text style={styles.cleanupCapacityValue}>{remainingAfterCleanup}</Text>
              </View>
              <View style={styles.cleanupDriveBarTrack}>
                <View style={[styles.cleanupDriveCurrentBar, { width: `${cleanupCurrentUsedPercent}%` }]} />
                <Animated.View
                  style={[
                    styles.cleanupDriveReclaimedBar,
                    {
                      left: `${cleanupCurrentUsedPercent}%`,
                      width: `${cleanupReclaimedPercent}%`,
                      opacity: cleanupReclaimedOpacity,
                    },
                  ]}
                />
              </View>
              <Text style={styles.cleanupDriveTotalLabel}>{cleanupDriveTotalLabel}</Text>
            </Card>
            <View style={styles.cleanupButtonSpacer} />
            <View style={styles.twoButtons}>
              <OutlineButton title="스캔 이력 보기" half onPress={() => {
                setAnalysisHistoryReturnTarget('cleanupComplete');
                go('analysisHistory');
              }} />
              <OutlineButton title="휴지통으로 이동" half onPress={() => replace('storageTrash')} />
            </View>
            <PrimaryButton title="홈 화면 돌아가기" onPress={() => {
              clearHomeScanCompletionNotice();
              replace('home');
            }} />
          </ScreenShell>
        );

      case 'carbonBasis':
        return (
          <ScreenShell title="탄소 환산 기준">
            <View style={styles.carbonBasisHeaderRow}>
              <SectionTitle>현재 적용 기준</SectionTitle>
              <Pressable style={styles.helpCircleButton} onPress={() => setCarbonHelpVisible(true)}>
                <Text style={styles.helpCircleText}>?</Text>
              </Pressable>
            </View>
            <View style={styles.carbonBasisStandardBox}>
              <CarbonBasisLine title="저장장치 전력" desc="클라우드 HDD 저장 기준" value="0.65 Wh/TB · 시간" />
              <View style={styles.thinDivider} />
              <CarbonBasisLine title="데이터센터 PUE" desc="서버 외 냉각·전력 설비 사용량 포함" value="1.10" />
              <View style={styles.thinDivider} />
              <CarbonBasisLine title="국내 전력 배출계수" desc="2024년 승인 소비단 전력 기준" value="0.4541 kgCO₂e/kWh" />
              <View style={styles.thinDivider} />
              <CarbonBasisLine title="계산 기간" desc="1년 평균 월간 시간" value="월 730시간" />
            </View>
            <Pressable style={styles.carbonExampleCard} onPress={() => setCarbonHelpVisible(true)}>
              <View style={styles.infoMain}>
                <Text style={styles.cardLabel}>계산 예시</Text>
                <Text style={styles.carbonExampleTitle}>5GB 정리 → 약 1.2g CO₂e / 월</Text>
                <Text style={styles.infoDesc}>화면에는 보기 쉽게 반올림하여 표시합니다</Text>
              </View>
              <Text style={styles.rowRight}>자세히</Text>
            </Pressable>
            <View style={styles.carbonNoticeCard}>
              <Text style={styles.carbonNoticeTitle}>ⓘ 실제 측정값이 아닌 모델 기반 추정치입니다</Text>
              <Text style={styles.infoDesc}>클라우드 환경 · 백업 방식에 따라 달라질 수 있어요</Text>
            </View>
          </ScreenShell>
        );

      case 'storageMail':
      case 'storageDrive':
      case 'storageTrash':
      case 'storageDriveTrash':
        return (
          <StorageScreen
            mode={screen}
            scan={storageBackedScan}
            emptyScanSummary={emptyScanSummary}
            defaultStorageSummary={defaultStorageSummary}
            apiAccessToken={apiAccessToken}
            apiBootstrapLoading={apiBootstrapLoading}
            googlePermissionChecking={googlePermissionChecking}
            driveFolders={apiDriveFolderOptions}
            permissions={permissions}
            checked={checked}
            toggle={toggleCheck}
            setAll={setAll}
            clearSelectionPrefix={clearSelectionPrefix}
            showToast={showToast}
            onReconnect={openAccountFromPermissionRevoked}
            goMail={() => replace(screen === 'storageTrash' || screen === 'storageDriveTrash' ? 'storageTrash' : 'storageMail')}
            goDrive={() => replace(screen === 'storageTrash' || screen === 'storageDriveTrash' ? 'storageDriveTrash' : 'storageDrive')}
            goTrash={() => replace(screen === 'storageDrive' || screen === 'storageDriveTrash' ? 'storageDriveTrash' : 'storageTrash')}
            storageDriveFolder={storageDriveFolder}
            setStorageDriveFolder={setStorageDriveFolder}
            storageTrashMovedKeys={storageTrashMovedKeys}
            storageDeletedKeys={storageDeletedKeys}
            storageRestoredKeys={storageRestoredKeys}
            storageDriveMoveTargets={storageDriveMoveTargets}
            setStorageTrashMovedKeys={setStorageTrashMovedKeys}
            setStorageDeletedKeys={setStorageDeletedKeys}
            setStorageRestoredKeys={setStorageRestoredKeys}
            setStorageDriveMoveTargets={setStorageDriveMoveTargets}
            openStorageDetail={(item) => {
              setSelectedStorageDetail(item);
              go('storageDetail');
            }}
            onLoadDriveFolders={loadApiDriveFolders}
            onServerStorageChanged={apiAccessToken ? () => void refreshAuraApis(apiAccessToken) : undefined}
            storageSheetBackHandlerRef={storageSheetBackHandlerRef}
          />
        );

      case 'storageDetail':
        return (
          <StorageDetailScreen
            item={selectedStorageDetail}
            apiAccessToken={apiAccessToken}
            getErrorMessage={getErrorMessage}
            pickReadableText={pickReadableText}
            buildGoogleDriveWebViewLink={buildGoogleDriveWebViewLink}
          />
        );

      case 'settings':
        return (
          <ScreenShell title="설정" titleIcon="settings" hideBack tightBottom>
            <Pressable style={styles.settingsProfileCard} onPress={() => go('account')}>
              <View style={styles.infoMain}>
                <Text style={styles.infoTitleLarge}>{currentUser?.email ?? 'user@gmail.com'}</Text>
                <Text style={styles.profileConnectionText}>
                  Gmail {permissions.gmail ? '연결됨' : '연결안됨'} / Drive {permissions.drive ? '연결됨' : '연결안됨'}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>

            <SectionTitle>알림</SectionTitle>
            <View style={styles.groupCard}>
              <ToggleRow
                title="스캔 완료 알림"
                value={settingsToggles.scanComplete}
                onPress={() => {
                  setSettingsToggles((s) => ({ ...s, scanComplete: !s.scanComplete }));
                }}
                plain
              />
              <View style={styles.thinDivider} />
              <ToggleRow
                title="스캔 권장 알림"
                value={settingsToggles.aiNudge}
                onPress={() => {
                  setSettingsToggles((s) => ({ ...s, aiNudge: !s.aiNudge }));
                }}
                plain
              />
            </View>

            <SectionTitle>스캔 설정</SectionTitle>
            <InfoRow title="기본 스캔 조건" onPress={() => go('defaultScan')} />

            <SectionTitle>공지사항</SectionTitle>
            <InfoRow title="공지사항" onPress={() => go('notice')} />

            <SectionTitle>개인정보 및 앱</SectionTitle>
            <InfoRow title="개인정보 및 데이터" onPress={() => go('privacyData')} />
            <Text style={styles.versionText}>AURA 버전 1.0.0</Text>
          </ScreenShell>
        );

      case 'account':
        return (
          <ScreenShell title="계정 및 연결">
            <View style={styles.accountHeroCard}>
              <UserAvatar user={currentUser} />
              <View style={styles.infoMain}>
                <Text style={styles.profileConnectionText}>{currentUser?.name ?? 'AURA 사용자'}</Text>
                <Text style={styles.infoTitleLarge}>{currentUser?.email ?? 'user@gmail.com'}</Text>
              </View>
            </View>

            <View style={styles.sectionHeaderRow}>
              <SectionTitle>연결된 서비스</SectionTitle>
              <Pressable
                style={[styles.sectionRefreshButton, googlePermissionChecking && styles.sectionRefreshButtonDisabled]}
                disabled={googlePermissionChecking}
                onPress={() => void refreshGooglePermissions()}
                hitSlop={8}
              >
                {googlePermissionChecking ? (
                  <ActivityIndicator size="small" color={mutedText} />
                ) : (
                  <FontAwesome5 name="redo" size={17} color={mutedText} />
                )}
              </Pressable>
            </View>
            <View style={styles.groupCard}>
              <ServiceLinkRow iconSource={gmailIcon} title="Gmail" connected={permissions.gmail} checking={googlePermissionChecking} onPress={() => go('gmailPermission')} />
              <View style={styles.thinDivider} />
              <ServiceLinkRow iconSource={googleDriveIcon} title="Google Drive" connected={permissions.drive} checking={googlePermissionChecking} onPress={() => go('drivePermission')} />
            </View>

            <OutlineButton title="이 계정 연결 해제" onPress={() => showToast('계정 연결 해제는 발표용 화면에서는 실행하지 않아요')} />
          </ScreenShell>
        );

      case 'defaultScan':
        return (
          <ScreenShell title="기본 스캔 조건">
            <ToggleRow
              title="최근 사용 조건 자동 적용"
              value={settingsToggles.autoScan}
              onPress={() => setSettingsToggles((s) => ({ ...s, autoScan: !s.autoScan }))}
              tint
            />
            <InfoRow
              title="기본 분석 범위"
              desc={getSimpleScanSourceLabel()}
              right="변경  ›"
              onPress={openScanSourceSettings}
            />
            <InfoRow
              title="기간 조건"
              desc={getDefaultPeriodLabel()}
              right="변경  ›"
              onPress={openPeriodSettings}
            />

            <InfoRow
              title="삭제 대상 포함 키워드"
              desc={includeKeywords.length ? includeKeywords.join(', ') : '설정된 포함 키워드 없음'}
              right="변경  ›"
              onPress={() => openKeywordSheet('include')}
            />
            <InfoRow
              title="삭제 대상 제외 키워드"
              desc={excludeKeywords.length ? excludeKeywords.join(', ') : '설정된 제외 키워드 없음'}
              right="변경  ›"
              onPress={() => openKeywordSheet('exclude')}
            />
            <PrimaryButton title="기본 조건 저장" onPress={() => void saveDefaultScanSettings()} />
          </ScreenShell>
        );

      case 'privacyData':
        return (
          <ScreenShell title="개인정보 및 데이터" tightBottom>
            <SectionTitle>동의 및 보관</SectionTitle>
            <View style={styles.groupCard}>
              <View style={styles.settingPlainRow}>
                <View style={styles.infoMain}>
                  <Text style={styles.infoTitle}>개인정보 수집·이용 동의</Text>
                </View>
                <View style={styles.smallPill}>
                  <Text style={styles.smallPillText}>{privacyChecked ? '동의 완료' : '확인 필요'}</Text>
                </View>
              </View>
              <View style={styles.thinDivider} />
              <View style={styles.settingPlainRow}>
                <View style={styles.infoMain}>
                  <Text style={styles.infoTitle}>데이터 보관 기간</Text>
                </View>
                <Text style={styles.rowRight}>서비스 탈퇴 시까지</Text>
              </View>
            </View>

            <SectionTitle>서버 보관 데이터</SectionTitle>
            <View style={styles.groupCard}>
              {privacyDataLoading ? <Text style={styles.infoDesc}>개인정보 데이터를 불러오는 중...</Text> : null}
              {privacyDataError ? <Text style={styles.warningText}>{privacyDataError}</Text> : null}
              {!privacyDataLoading && !privacyDataError ? (
                <>
                  <View style={styles.settingPlainRow}>
                    <View style={styles.infoMain}>
                      <Text style={styles.infoTitle}>계정 이메일</Text>
                    </View>
                    <Text style={styles.rowRight}>{currentUser?.email ?? '-'}</Text>
                  </View>
                  <View style={styles.thinDivider} />
                  <View style={styles.settingPlainRow}>
                    <View style={styles.infoMain}>
                      <Text style={styles.infoTitle}>분석 기록</Text>
                    </View>
                    <Text style={styles.rowRight}>{formatUnknownValue(privacyData?.managed_data_summary?.scan_job_count ?? apiScanHistoryItems.length)}</Text>
                  </View>
                  <View style={styles.thinDivider} />
                  <View style={styles.settingPlainRow}>
                    <View style={styles.infoMain}>
                      <Text style={styles.infoTitle}>정리 기록</Text>
                    </View>
                    <Text style={styles.rowRight}>{formatUnknownValue(privacyData?.managed_data_summary?.cleanup_history_count)}</Text>
                  </View>

                </>
              ) : null}
            </View>

            <SectionTitle>분석 데이터</SectionTitle>
            <View style={styles.groupCard}>
              <Pressable style={styles.settingPlainRow} onPress={() => {
                setAnalysisHistoryReturnTarget('privacyData');
                go('analysisHistory');
              }}>
                <View style={styles.infoMain}>
                  <Text style={styles.infoTitle}>분석 기록 관리</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            </View>

            <Pressable style={styles.privacyWithdrawButton} onPress={openWithdrawSheet}>
              <Text style={styles.privacyWithdrawText}>AURA 서비스 탈퇴</Text>
            </Pressable>
          </ScreenShell>
        );

      case 'analysisHistory':
        return (
          <ScreenShell title="스캔 이력" titleIcon="history" hideBack tightBottom disableScroll={hasHistoryData}>
            {hasHistoryData ? (
              <>
                <View style={styles.carbonTotalCard}>
                  <View>
                    <Text style={styles.cardLabel}>전체 누적 삭제 용량</Text>
                    <Text style={styles.carbonTotalValue}>{historyTotalSizeLabel}</Text>
                  </View>
                  <View style={styles.monthCarbonPill}>
                    <Text style={styles.monthCarbonText}>최근 스캔 +{latestCleanupSizeLabel}</Text>
                  </View>
                </View>
                <SectionTitle>누적 확보 용량 현황</SectionTitle>
                <CarbonStatsGraph sizeLabel={latestCleanupSizeLabel} values={historyGraphValues} labels={historyGraphLabels} />
                <View style={styles.rowBetween}>
                  <SectionTitle>최근 정리 기록</SectionTitle>
                  <Pressable onPress={() => go('analysisHistoryAll')} hitSlop={8}>
                    <Text style={styles.rowRight}>전체 보기</Text>
                  </Pressable>
                </View>
                {scanCleanupHistoryItems.length || latestScanHistoryForFallback ? (
                  <View style={styles.recentCleanupCard}>
                    <View style={styles.recentCleanupTopRow}>
                      <View style={styles.infoMain}>
                        <Text style={styles.infoTitle}>{latestCleanupDateLabel ?? '-'}</Text>
                        <Text style={styles.infoDesc}>{latestCleanupDesc}</Text>
                      </View>
                      <Text style={styles.recentCleanupSizeValue}>{latestCleanupSizeLabel}</Text>
                    </View>
                  </View>
                ) : (
                  <EmptyState title="선택된 정리 항목이 없어요" desc="결과 목록에서 체크된 항목이 최근 정리 기록에 반영돼요." />
                )}
              </>
            ) : (
              <EmptyState title="아직 분석 기록이 없어요" desc="스캔을 완료하면 이곳에 기록이 저장돼요." />
            )}
          </ScreenShell>
        );

      case 'analysisHistoryAll':
        return (
          <ScreenShell title="정리 기록 전체보기">
            {scanCleanupHistoryItems.length ? (
              <>
                {scanCleanupHistoryItems.map((item, index) => (
                  <View style={styles.recentCleanupCard} key={item.history_id ?? item.cleanup_job_id ?? item.completed_at ?? index}>
                    <View style={styles.recentCleanupTopRow}>
                      <View style={styles.infoMain}>
                        <Text style={styles.infoTitle}>{formatApiDate(item.completed_at)}</Text>
                        <Text style={styles.infoDesc}>정리 항목 {item.cleaned_item_count ?? 0}개</Text>
                      </View>
                      <Text style={styles.recentCleanupSizeValue}>{formatBytes(item.reclaimed_bytes ?? 0)}</Text>
                    </View>
                  </View>
                ))}
              </>
            ) : scanHistoryCleanupItems.length ? (
              <>
                {scanHistoryCleanupItems.map((item, index) => (
                  <View style={styles.recentCleanupCard} key={item.scan_job_id ?? item.created_at ?? index}>
                    <View style={styles.recentCleanupTopRow}>
                      <View style={styles.infoMain}>
                        <Text style={styles.infoTitle}>{formatApiDate(item.created_at)}</Text>
                        <Text style={styles.infoDesc}>{apiScanSourceLabel(item.scan_source)} · 정리 후보 {item.candidate_count ?? 0}개</Text>
                      </View>
                      <Text style={styles.recentCleanupSizeValue}>{formatBytes(item.reclaimed_bytes ?? 0)}</Text>
                    </View>
                  </View>
                ))}
              </>
            ) : (
              <EmptyState title="아직 정리 기록이 없어요" desc="정리를 완료하면 전체 기록을 볼 수 있어요." />
            )}
          </ScreenShell>
        );

      case 'serviceWithdraw':
        return (
          <ScreenShell title="AURA 서비스 탈퇴">
            <View style={styles.withdrawModalCard}>
              <View style={styles.modalHandle} />
              <View style={styles.rowBetween}>
                <Text style={styles.modalTitle}>AURA 서비스 탈퇴</Text>
                <Pressable onPress={back}>
                  <Text style={styles.modalClose}>×</Text>
                </Pressable>
              </View>
              <Text style={styles.infoDesc}>탈퇴하면 다음 데이터가 삭제됩니다</Text>
              <View style={styles.warningCard}>
                <Text style={styles.warningText}>• AURA 분석 기록 12건</Text>
                <Text style={styles.warningText}>• 맞춤 추천 및 통계 데이터</Text>
                <Text style={styles.warningText}>• Google 계정 연결 정보</Text>
              </View>
              <View style={styles.scopeCard}>
                <Text style={styles.scopeDesc}>Gmail 메일과 Drive 원본·휴지통 항목은 삭제되지 않습니다</Text>
              </View>
              <CheckLine label="탈퇴 후 복구할 수 없음을 확인했습니다" checked={checked.withdrawConfirm} onPress={() => toggleCheck('withdrawConfirm')} />
              <View style={styles.twoButtons}>
                <OutlineButton title="취소" onPress={back} half />
                <Pressable
                  style={[styles.dangerButton, !checked.withdrawConfirm && styles.dangerButtonDisabled, styles.halfButton]}
                  onPress={() => {
                    void confirmWithdraw();
                  }}
                >
                  <Text style={styles.dangerText}>{withdrawSubmitting ? '요청 중...' : '서비스 탈퇴'}</Text>
                </Pressable>
              </View>
            </View>
          </ScreenShell>
        );

      case 'notice':
        return (
          <ScreenShell title="공지사항">
            {announcementLoading ? <Text style={styles.infoDesc}>공지사항을 불러오는 중...</Text> : null}
            {announcementError ? <Text style={styles.warningText}>{announcementError}</Text> : null}
            {(apiAnnouncements.length
              ? apiAnnouncements
              : [
                  {
                    announcement_id: 'local-aura-100',
                    title: 'AURA 1.0.0 안내',
                    summary: '학술제 발표용 프로토타입 화면이 업데이트됐어요.',
                  },
                  {
                    announcement_id: 'local-google-permission',
                    title: 'Google 권한 안내',
                    summary: '원문 내용은 AI에게 전달되지 않도록 설계했어요.',
                  },
                ]).map((notice) => (
              <InfoRow
                key={notice.announcement_id}
                title={notice.title ?? '공지사항'}
                desc={notice.summary ?? notice.content ?? (notice.published_at ? formatApiDateOnly(notice.published_at) : undefined)}
                hideChevron
                onPress={() => {
                  if (apiAccessToken && typeof notice.announcement_id === 'number') {
                    void announcementApi.markRead(notice.announcement_id, { accessToken: apiAccessToken }).catch(() => undefined);
                  }
                }}
              />
            ))}
          </ScreenShell>
        );
    }
  };

  const handleHorizontalSwipe = (direction: 'left' | 'right') => {
    if (keywordChoiceVisible || keywordSheetType || yearSheetType || periodSheetType || filterSheetVisible || withdrawSheetVisible || carbonHelpVisible) return;

    if (screen === 'scanProgress') {
      if (direction === 'right') replace('home');
      return;
    }

    if (screen === 'deleteProcessing') {
      if (direction === 'right') replace('home');
      return;
    }

    if (screen === 'candidateSummary' || screen === 'selectedReview') {
      return;
    }

    if (screen === 'permissions') {
      return;
    }

    const loginIndex = loginFlowScreens.indexOf(screen);
    if (loginIndex >= 0) {
      const nextIndex = direction === 'left' ? loginIndex + 1 : loginIndex - 1;
      const next = loginFlowScreens[nextIndex];
      if (!next) return;
      if (screen === 'initial' && direction === 'left' && !privacyChecked) {
        showToast('개인정보 수집 및 분석 동의가 필요합니다');
        return;
      }
      go(next);
      return;
    }

    const currentTab = getResolvedTabForScreen(screen);
    if (!currentTab) return;

    if (screen !== defaultTabScreens[currentTab]) {
      if (direction === 'right') back();
      return;
    }

    const tabIndex = mainTabOrder.indexOf(currentTab);
    const nextTab = mainTabOrder[direction === 'left' ? tabIndex + 1 : tabIndex - 1];
    if (nextTab) navigateTab(nextTab);
  };

  const scanSidePanelResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => gesture.dx > 18 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.25,
    onMoveShouldSetPanResponderCapture: (_, gesture) => gesture.dx > 18 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.25,
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > 70 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.25) {
        replace('home');
      }
    },
  });

  const screenSwipeResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 46 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4,
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dx) < 70 || Math.abs(gesture.dx) < Math.abs(gesture.dy) * 1.4) return;
      handleHorizontalSwipe(gesture.dx < 0 ? 'left' : 'right');
    },
  });

  return (
    <SafeAreaProvider>
      <NavigationContext.Provider
        value={{
          current: screen,
          currentTab: getResolvedTabForScreen(screen),
          navigate: replace,
          navigateTab,
          back,
          scanResultPending: homeScanNotice === 'completed' || homeScanNotice === 'running' || deleteJobStatus === 'running',
          connectedInstant: screen === 'connected' && skipConnectedAnimation,
        }}
      >
        <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
          <View style={styles.phone}>
          <Animated.View
            {...screenSwipeResponder.panHandlers}
            style={[
              styles.screenTransition,
              {
                opacity: screenMotion.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.78, 1],
                }),
                transform: [
                  {
                    translateX: screenMotion.interpolate({
                      inputRange: [0, 1],
                      outputRange: [transitionDirection.current * 9, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {render()}
          </Animated.View>
          {keywordChoiceVisible ? (
            <Animated.View
              style={[
                styles.sheetOverlay,
                {
                  opacity: keywordChoiceMotion.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0],
                  }),
                },
              ]}
            >
              <Pressable style={StyleSheet.absoluteFill} onPress={() => closeKeywordChoiceSheet()} />
              <BottomSheetPanel motion={keywordChoiceMotion} outputRange={[0, 220]} style={styles.keywordChoiceSheet} onClose={closeKeywordChoiceSheet}>
                <Text style={styles.modalTitle}>삭제 대상 키워드 설정</Text>
                <Pressable style={styles.keywordChoiceRow} onPress={() => closeKeywordChoiceSheet('include')}>
                  <View style={styles.infoMain}>
                    <Text style={styles.infoTitle}>포함 키워드 설정</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
                <Pressable style={styles.keywordChoiceRow} onPress={() => closeKeywordChoiceSheet('exclude')}>
                  <View style={styles.infoMain}>
                    <Text style={styles.infoTitle}>제외 키워드 설정</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              </BottomSheetPanel>
            </Animated.View>
          ) : null}
          {keywordSheetType ? (
            <KeywordBottomSheet
              type={keywordSheetType}
              motion={keywordSheetMotion}
              input={keywordSheetType === 'include' ? includeInput : excludeInput}
              setInput={keywordSheetType === 'include' ? setIncludeInput : setExcludeInput}
              keywords={keywordSheetType === 'include' ? includeKeywords : excludeKeywords}
              recommended={(keywordSheetType === 'include' ? includeRecommendedKeywords : excludeRecommendedKeywords).filter((keyword) =>
                keywordSheetType === 'include'
                  ? !keywordExists(includeKeywords, keyword)
                  : !keywordExists(excludeKeywords, keyword)
              )}
              onAddInput={() => addKeyword(keywordSheetType)}
              onAddRecommended={(keyword) => addRecommendedKeyword(keywordSheetType, keyword)}
              onRemove={(keyword) => removeKeyword(keywordSheetType, keyword)}
              onClose={closeKeywordSheet}
            />
          ) : null}
          {yearSheetType ? (
            <YearRangeSheet
              type={yearSheetType}
              motion={yearSheetMotion}
              range={yearSheetType === 'opened' ? openedYearRange : modifiedYearRange}
              setRange={yearSheetType === 'opened' ? setOpenedYearRange : setModifiedYearRange}
              onClose={closeYearSheet}
            />
          ) : null}
          {periodSheetType ? (
            <PeriodMonthSheet
              type={periodSheetType}
              motion={periodSheetMotion}
              months={periodSheetType === 'opened' ? lastOpenedBeforeMonths : lastModifiedBeforeMonths}
              onChange={(value) => updateMonthCondition(periodSheetType, value)}
              onClose={closePeriodMonthSheet}
            />
          ) : null}
          {filterSheetVisible ? (
            <FilterSortSheet
              motion={filterSheetMotion}
              date={filterDate}
              size={filterSize}
              sort={sortMode}
              setDate={setFilterDate}
              setSize={setFilterSize}
              setSort={setSortMode}
              onClose={closeFilterSheet}
            />
          ) : null}
          {carbonHelpVisible ? <CarbonHelpPopup onClose={() => setCarbonHelpVisible(false)} /> : null}
          {withdrawSheetVisible ? (
            <Animated.View
              style={[
                styles.sheetOverlay,
                {
                  opacity: withdrawSheetMotion.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0],
                  }),
                },
              ]}
            >
              <Pressable style={StyleSheet.absoluteFill} onPress={closeWithdrawSheet} />
              <BottomSheetPanel motion={withdrawSheetMotion} outputRange={[0, 360]} style={styles.withdrawSheet} onClose={closeWithdrawSheet}>
                <View style={styles.rowBetween}>
                  <Text style={styles.modalTitle}>AURA 서비스 탈퇴</Text>
                </View>
                <Text style={styles.infoDesc}>탈퇴하면 다음 데이터가 삭제됩니다</Text>
                <View style={styles.warningCard}>
                  <Text style={styles.warningText}>• AURA 분석 기록 12건</Text>
                  <Text style={styles.warningText}>• 맞춤 추천 및 통계 데이터</Text>
                  <Text style={styles.warningText}>• Google 계정 연결 정보</Text>
                </View>
                <View style={styles.scopeCard}>
                  <Text style={styles.scopeDesc}>Gmail 메일과 Drive 원본·휴지통 항목은 삭제되지 않습니다</Text>
                </View>
                <CheckLine
                  label="탈퇴 후 복구할 수 없음을 확인했습니다"
                  checked={Boolean(checked.withdrawConfirm)}
                  onPress={() => toggleCheck('withdrawConfirm')}
                />
                <View style={styles.withdrawActionRow}>
                  <Pressable style={styles.sheetCancelButton} onPress={closeWithdrawSheet}>
                    <Text style={styles.outlineText}>취소</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.sheetDangerButton, !checked.withdrawConfirm && styles.dangerButtonDisabled]}
                    onPress={() => {
                      void confirmWithdraw();
                    }}
                  >
                    <Text style={styles.dangerText}>{withdrawSubmitting ? '요청 중...' : '서비스 탈퇴하기'}</Text>
                  </Pressable>
                </View>
              </BottomSheetPanel>
            </Animated.View>
          ) : null}
          {permissionToast ? (
            <Animated.View
              style={[
                styles.toastOverlay,
                (keywordChoiceVisible || keywordSheetType || yearSheetType || periodSheetType || filterSheetVisible || withdrawSheetVisible) && styles.toastOverlayAboveSheet,
                {
                  opacity: toastOpacity,
                  transform: [
                    {
                      translateY: toastOpacity.interpolate({
                        inputRange: [0, 1],
                        outputRange: [8, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Pressable
                disabled={!toastTarget}
                style={styles.toastPressable}
                onPress={() => {
                  if (!toastTarget) return;
                  if (toastTimer.current) {
                    clearTimeout(toastTimer.current);
                  }
                  setPermissionToast('');
                  setToastTarget(null);
                  replace(toastTarget);
                }}
              >
                <Text style={styles.toastText}>{permissionToast}</Text>
                {toastTarget ? <Text style={styles.toastHintText}>탭해서 확인하기</Text> : null}
              </Pressable>
            </Animated.View>
          ) : null}
          </View>
        </SafeAreaView>
      </NavigationContext.Provider>
    </SafeAreaProvider>
  );
}
