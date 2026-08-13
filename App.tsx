import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Image,
  KeyboardAvoidingView,
  Linking,
  PanResponder,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AntDesign from '@expo/vector-icons/AntDesign';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { LineChart } from 'react-native-chart-kit';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import Svg, { Circle, Defs, Line, LinearGradient as SvgLinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { authApi } from './src/api/auth';
import { DEV_AURA_ACCESS_TOKEN, GOOGLE_OAUTH_REDIRECT_URI, GOOGLE_WEB_CLIENT_ID } from './src/api/config';
import {
  announcementApi,
  candidateApi,
  googleApi,
  homeApi,
  cleanupApi,
  notificationApi,
  scanApi,
  statisticsApi,
  storageApi,
  type ApiAnnouncement,
  type ApiCandidate,
  type ApiCandidateDetail,
  type ApiCandidateSelectionStatus,
  type ApiCleanupJob,
  type ApiDriveFolder,
  type ApiHomeSummary,
  type ApiMonthlyStatistic,
  type ApiScanHistoryItem,
  type ApiScanJob,
  type ApiScanSetting,
  type ApiStorageDetail,
  type ApiStorageItem,
} from './src/api/features';
import { userApi, type ApiPrivacyData } from './src/api/user';
import type { AuraPlatform, AuraServicePermissions, AuraUser } from './src/api/types';

type Screen =
  | 'initial'
  | 'privacy'
  | 'permissions'
  | 'gmailPermission'
  | 'drivePermission'
  | 'notificationPermission'
  | 'connected'
  | 'onboardingIntro'
  | 'onboardingGhost'
  | 'onboardingCarbon'
  | 'home'
  | 'recentDetail'
  | 'keywordFile'
  | 'includeKeyword'
  | 'excludeKeyword'
  | 'scanFlowSource'
  | 'scanFlowFolder'
  | 'scanFlowPeriod'
  | 'scanSource'
  | 'driveFolder'
  | 'period'
  | 'scanProgress'
  | 'candidateSummary'
  | 'mailList'
  | 'driveList'
  | 'largeList'
  | 'protectedList'
  | 'mailDetail'
  | 'fileDetail'
  | 'selectedReview'
  | 'deleteConfirm'
  | 'deleteProcessing'
  | 'cleanupComplete'
  | 'carbonBasis'
  | 'storageMail'
  | 'storageDrive'
  | 'storageDetail'
  | 'storageTrash'
  | 'storageDriveTrash'
  | 'settings'
  | 'account'
  | 'defaultScan'
  | 'privacyData'
  | 'analysisHistory'
  | 'analysisHistoryAll'
  | 'serviceWithdraw'
  | 'notice';

type MainTab = 'home' | 'storage' | 'trash' | 'history' | 'settings';

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
type FloatingButtonVariant = 'scan' | 'delete' | 'trash' | 'restore';
type FloatingAction = { variant: Exclude<FloatingButtonVariant, 'scan'>; onPress: () => void; small?: boolean };
type FontAwesome5Name = React.ComponentProps<typeof FontAwesome5>['name'];
type PermissionScreen = 'gmailPermission' | 'drivePermission' | 'notificationPermission';
type PermissionState = { gmail: boolean; drive: boolean; alarm: boolean };
type SettingsTogglesState = { scanComplete: boolean; aiNudge: boolean; marketing: boolean; autoScan: boolean };
type MonthRange = { from: number; to: number };
type ScanListItem = {
  id: string;
  candidateId?: number;
  selectionVersion?: number;
  selectionStatus?: ApiCandidateSelectionStatus;
  title: string;
  desc?: string;
  sizeMB: number;
  dateLabel: string;
  sortText: string;
  source: 'mail' | 'drive';
  previewLabel?: string;
  detailTitle?: string;
  detailSubtitle?: string;
};
type StorageApiFields = {
  itemId?: number;
  externalItemId?: string;
  snapshotTitle?: string;
  snapshotSizeBytes?: number;
  itemSource?: 'GMAIL' | 'DRIVE';
};
type StorageMailItem = StorageApiFields & { id: string; title: string; subtitle: string; meta: string; badge?: string };
type StorageDriveItem = StorageApiFields & { id: string; type: string; title: string; subtitle: string; fullPath?: string };
type StorageDetailItem = StorageApiFields & { title: string; meta: string; source: 'mail' | 'drive' };
type StorageServerPageState = {
  items: ApiStorageItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};
type StorageDriveMoveTargets = Record<string, string>;
type DriveFolderOption = { id?: string; name: string; meta?: string; parentId?: string };
type ScanSummary = {
  mailItems: ScanListItem[];
  driveItems: ScanListItem[];
  largeItems: ScanListItem[];
  protectedItems: ScanListItem[];
  storageMailItems: StorageMailItem[];
  storageDriveItems: StorageDriveItem[];
  storageTrashItems: StorageMailItem[];
  mailSizeLabel: string;
  driveSizeLabel: string;
  largeSizeLabel: string;
  totalSizeLabel: string;
  carbonLabel: string;
  candidateCount: number;
  folderLabel: string;
};
type ScanRecord = {
  dateLabel: string;
  sourceLabel: string;
  conditionLabel: string;
  result: ScanSummary;
};
type AuraMailMessage = {
  id: string;
  folder: string;
  from: string;
  title: string;
  receivedAt: string;
  sizeMB: number;
  reason: string;
};
type AuraDriveFile = {
  id: string;
  folderPath: string;
  type: string;
  title: string;
  sizeMB: number;
  modifiedAt: string;
  reason: string;
};

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

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error && 'message' in error) return String((error as { message?: unknown }).message);
  return fallback;
};

const formatUnknownValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) return value.length ? `${value.length}개` : '0개';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const extractServerAuthCode = (response: unknown) => {
  if (!response || typeof response !== 'object') return null;

  const data = response as {
    serverAuthCode?: string | null;
    data?: { serverAuthCode?: string | null };
  };

  return data.serverAuthCode ?? data.data?.serverAuthCode ?? null;
};

const getMainTabForScreen = (screen: Screen): MainTab | null => {
  if (
    screen === 'storageMail' ||
    screen === 'storageDrive' ||
    screen === 'storageDetail'
  ) {
    return 'storage';
  }

  if (
    screen === 'storageTrash' ||
    screen === 'storageDriveTrash'
  ) {
    return 'trash';
  }

  if (
    screen === 'settings' ||
    screen === 'account' ||
    screen === 'defaultScan' ||
    screen === 'privacyData' ||
    screen === 'serviceWithdraw' ||
    screen === 'notice'
  ) {
    return 'settings';
  }

  if (
    screen === 'home' ||
    screen === 'recentDetail' ||
    screen === 'keywordFile' ||
    screen === 'includeKeyword' ||
    screen === 'excludeKeyword' ||
    screen === 'scanFlowSource' ||
    screen === 'scanFlowFolder' ||
    screen === 'scanFlowPeriod' ||
    screen === 'scanSource' ||
    screen === 'driveFolder' ||
    screen === 'period' ||
    screen === 'scanProgress' ||
    screen === 'candidateSummary' ||
    screen === 'mailList' ||
    screen === 'driveList' ||
    screen === 'largeList' ||
    screen === 'protectedList' ||
    screen === 'mailDetail' ||
    screen === 'fileDetail' ||
    screen === 'selectedReview' ||
    screen === 'deleteConfirm' ||
    screen === 'deleteProcessing' ||
    screen === 'cleanupComplete' ||
    screen === 'carbonBasis'
  ) {
    return 'home';
  }

  if (
    screen === 'analysisHistory' ||
    screen === 'analysisHistoryAll'
  ) {
    return 'history';
  }

  return null;
};

const getBackFallbackForScreen = (screen: Screen): Screen => {
  if (
    screen === 'settings' ||
    screen === 'account' ||
    screen === 'defaultScan' ||
    screen === 'privacyData' ||
    screen === 'serviceWithdraw' ||
    screen === 'notice'
  ) {
    return 'settings';
  }

  if (screen === 'storageDriveTrash') return 'storageDrive';
  if (screen === 'storageTrash') return 'storageMail';
  if (screen === 'storageMail' || screen === 'storageDrive') return 'storageMail';

  return 'home';
};

const defaultTabScreens: Record<MainTab, Screen> = {
  home: 'home',
  storage: 'storageMail',
  trash: 'storageTrash',
  history: 'analysisHistory',
  settings: 'settings',
};
const loginFlowScreens: Screen[] = ['initial', 'privacy', 'permissions', 'connected', 'onboardingIntro', 'onboardingGhost', 'onboardingCarbon'];
const mainTabOrder: MainTab[] = ['home', 'storage', 'trash', 'history', 'settings'];
const scanFlowScreens = new Set<Screen>([
  'scanFlowSource',
  'scanFlowFolder',
  'scanFlowPeriod',
  'scanSource',
  'driveFolder',
  'period',
  'scanProgress',
  'candidateSummary',
  'mailList',
  'driveList',
  'largeList',
  'protectedList',
  'mailDetail',
  'fileDetail',
  'selectedReview',
  'deleteConfirm',
  'deleteProcessing',
  'cleanupComplete',
]);

const NavigationContext = React.createContext<{
  current: Screen;
  currentTab: MainTab | null;
  navigate: (screen: Screen) => void;
  navigateTab: (tab: MainTab) => void;
  back: () => void;
  connectedInstant?: boolean;
  scanResultPending?: boolean;
} | null>(null);

const auraMailMessages: AuraMailMessage[] = [
  { id: 'mail-promo-summer', folder: '받은편지함', from: 'promo@shop.com', title: '[광고] 여름 프로모션 쿠폰', receivedAt: '2022.04.18', sizeMB: 68, reason: '광고·프로모션 키워드' },
  { id: 'mail-market-event', folder: '프로모션', from: 'event@market.com', title: '이번 주 특가 안내', receivedAt: '2021.12.03', sizeMB: 52, reason: '프로모션 메일' },
  { id: 'mail-newsletter', folder: '뉴스레터', from: 'newsletter@brand.com', title: '월간 뉴스레터', receivedAt: '2019.06.08', sizeMB: 83, reason: '3년 이상 미열람' },
  { id: 'mail-coupon', folder: '프로모션', from: 'news@store.com', title: '멤버십 할인 쿠폰 안내', receivedAt: '2020.02.14', sizeMB: 41, reason: '광고 키워드' },
  { id: 'mail-meeting-old', folder: '받은편지함', from: 'club@univ.ac.kr', title: '2020 학술제 회의 자료 공유', receivedAt: '2020.09.25', sizeMB: 126, reason: '오래된 첨부 메일' },
  { id: 'mail-receipt', folder: '보관함', from: 'billing@store.com', title: '결제 영수증 2022-04', receivedAt: '2022.04.21', sizeMB: 0.4, reason: '제외 키워드 보호' },
];

const mailAttachmentIds = new Set(['mail-promo-summer', 'mail-newsletter', 'mail-meeting-old']);
const mailGhostCandidateIds = new Set(['mail-promo-summer', 'mail-market-event', 'mail-newsletter', 'mail-coupon', 'mail-meeting-old']);
const similarDuplicateDriveIds = new Set(['drive-report-copy', 'drive-photo-zip']);
const storageSelectionPrefixes = new Set(['storageMail', 'storageDrive', 'storageTrash', 'storageDriveTrash']);
const isDefaultCandidateSelected = (prefix: string, id: string) => prefix !== 'drive' || !similarDuplicateDriveIds.has(id);
const isDefaultSelectionForKey = (key: string) => {
  const [prefix, ...idParts] = key.split(':');
  const id = idParts.join(':');
  if (!/^(mail|drive|large|storageMail|storageDrive|storageTrash|storageDriveTrash)$/.test(prefix)) return false;
  if (storageSelectionPrefixes.has(prefix)) return false;
  return isDefaultCandidateSelected(prefix, id);
};

const auraDriveFiles: AuraDriveFile[] = [
  { id: 'drive-root-unfiled-pdf', folderPath: '내 Drive', type: 'PDF', title: '정리되지_않은_회의자료.pdf', sizeMB: 74, modifiedAt: '2024.12.02', reason: '루트 경로 파일' },
  { id: 'drive-plan-pdf', folderPath: '내 Drive › 학술제 자료', type: 'PDF', title: 'AURA_기획서.pdf', sizeMB: 184, modifiedAt: '2025.11.12', reason: '대용량 PDF' },
  { id: 'drive-slide-v1', folderPath: '내 Drive › 학술제 자료 › 발표자료', type: 'PDF', title: '발표자료_v1.pdf', sizeMB: 510, modifiedAt: '2026.07.01', reason: '발표자료 백업' },
  { id: 'drive-slide-old', folderPath: '내 Drive › 학술제 자료 › 발표자료', type: 'PDF', title: '발표자료_구버전.pdf', sizeMB: 410, modifiedAt: '2024.03.08', reason: '오래된 발표자료' },
  { id: 'drive-mockup-old', folderPath: '내 Drive › 디자인 백업 › Old Mockups', type: 'JPG', title: 'old_mockup.png', sizeMB: 96, modifiedAt: '2023.02.20', reason: '오래된 이미지' },
  { id: 'drive-figma-export', folderPath: '내 Drive › 디자인 백업 › Figma Export', type: 'ZIP', title: 'figma_export_backup.zip', sizeMB: 760, modifiedAt: '2022.12.16', reason: '대용량 디자인 백업' },
  { id: 'drive-report-copy', folderPath: '내 Drive › 문서 보관함 › 과제 백업', type: 'PDF', title: 'final_report_copy.pdf', sizeMB: 820, modifiedAt: '2021.09.18', reason: '중복 해시 일치' },
  { id: 'drive-photo-zip', folderPath: '내 Drive › 사진 백업 › 2020 여행', type: 'ZIP', title: 'photo_backup.zip', sizeMB: 1220, modifiedAt: '2020.04.03', reason: '중복 백업 파일' },
  { id: 'drive-contract', folderPath: '내 Drive › 문서 보관함 › 계약서', type: 'DOCX', title: '계약서_보관.docx', sizeMB: 2, modifiedAt: '2023.10.12', reason: '제외 키워드 보호' },
];

const driveFolderOptions: DriveFolderOption[] = [
  { name: '내 Drive › 학술제 자료', meta: '파일 1개 · 하위 폴더 1개 · 184MB' },
  { name: '내 Drive › 학술제 자료 › 발표자료', meta: '파일 2개 · 730MB' },
  { name: '내 Drive › 디자인 백업', meta: '하위 폴더 2개 · 856MB' },
  { name: '내 Drive › 디자인 백업 › Figma Export', meta: '파일 1개 · 760MB' },
  { name: '내 Drive › 디자인 백업 › Old Mockups', meta: '파일 1개 · 96MB' },
  { name: '내 Drive › 문서 보관함', meta: '하위 폴더 2개 · 822MB' },
  { name: '내 Drive › 문서 보관함 › 과제 백업', meta: '파일 1개 · 820MB' },
  { name: '내 Drive › 사진 백업', meta: '하위 폴더 1개 · 1.2GB' },
  { name: '내 Drive › 사진 백업 › 2020 여행', meta: '파일 1개 · 1.2GB' },
];

const driveRootPath = '내 Drive';
const splitDrivePath = (path: string) => path.split('›').map((part) => part.trim()).filter(Boolean);
const getDriveParentPath = (path: string) => {
  const parts = splitDrivePath(path);
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join(' › ');
};
const getDriveAncestorFolders = (path: string) => {
  const parts = splitDrivePath(path);
  if (parts.length <= 1) return [];
  return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join(' › '));
};
const getDriveFolderName = (path: string) => splitDrivePath(path).at(-1) ?? path;
const getDirectDriveFolders = (parentPath: string, options: DriveFolderOption[] = driveFolderOptions) => {
  const parentParts = splitDrivePath(parentPath);
  return options.filter((folder) => {
    const parts = splitDrivePath(folder.name);
    return parts.length === parentParts.length + 1 && parentParts.every((part, index) => parts[index] === part);
  });
};
const getVisibleDriveFolders = (currentPath: string, search: string, options: DriveFolderOption[] = driveFolderOptions) => {
  const query = search.trim().toLowerCase();
  if (query) {
    return options.filter((folder) => folder.name.toLowerCase().includes(query));
  }

  return getDirectDriveFolders(currentPath, options);
};
const hasDriveFolderChildren = (path: string, options: DriveFolderOption[] = driveFolderOptions) => getDirectDriveFolders(path, options).length > 0;
const getDriveDescendantFolders = (path: string, options: DriveFolderOption[] = driveFolderOptions) => options.filter((folder) => folder.name.startsWith(`${path} ›`));
const getDriveFolderSelectionGroup = (path: string, options: DriveFolderOption[] = driveFolderOptions) => [path, ...getDriveDescendantFolders(path, options).map((folder) => folder.name)];
const getDirectDriveFiles = (folderPath: string) => auraDriveFiles.filter((file) => file.folderPath === folderPath);
const getDriveFileSelectionGroup = (folderPath: string) =>
  auraDriveFiles.filter((file) => file.folderPath === folderPath || file.folderPath.startsWith(`${folderPath} ›`));
const getDriveFolderSelected = (path: string, selectedFolders: string[], selectedFiles: string[], options: DriveFolderOption[] = driveFolderOptions) => {
  const folderGroup = getDriveFolderSelectionGroup(path, options);
  const fileGroup = getDriveFileSelectionGroup(path).map((file) => file.id);
  const hasSelectableChildren = folderGroup.length + fileGroup.length > 0;

  return hasSelectableChildren && folderGroup.every((folder) => selectedFolders.includes(folder)) && fileGroup.every((file) => selectedFiles.includes(file));
};
const getStorageDriveItemsForFolder = (folderPath: string): StorageDriveItem[] => [
  ...getDirectDriveFolders(folderPath).map((folder) => ({
    id: `storage-folder-${folder.name}`,
    type: 'F',
    title: getDriveFolderName(folder.name),
    subtitle: `${folder.name} · 폴더`,
    fullPath: folder.name,
  })),
  ...getDirectDriveFiles(folderPath).map((file) => ({
    id: `storage-${file.id}`,
    type: file.type,
    title: file.title,
    subtitle: `${file.type} · ${formatDataSize(file.sizeMB)} · 수정 ${file.modifiedAt} · ${file.folderPath}`,
    fullPath: file.folderPath,
  })),
];
const getAllStorageDriveItems = (): StorageDriveItem[] => [
  ...driveFolderOptions.map((folder) => ({
    id: `storage-folder-${folder.name}`,
    type: 'F',
    title: getDriveFolderName(folder.name),
    subtitle: `${folder.name} · 폴더`,
    fullPath: folder.name,
  })),
  ...auraDriveFiles.map((file) => ({
    id: `storage-${file.id}`,
    type: file.type,
    title: file.title,
    subtitle: `${file.type} · ${formatDataSize(file.sizeMB)} · 수정 ${file.modifiedAt} · ${file.folderPath}`,
    fullPath: file.folderPath,
  })),
];

const getDirectDriveTrashFolders = (parentPath: string) => {
  const parentParts = splitDrivePath(parentPath);
  return driveTrashFolderOptions.filter((folder) => {
    const parts = splitDrivePath(folder.name);
    return parts.length === parentParts.length + 1 && parentParts.every((part, index) => parts[index] === part);
  });
};
const getDirectDriveTrashFiles = (folderPath: string) => driveTrashFiles.filter((file) => file.folderPath === folderPath);
const getStorageDriveTrashItemsForFolder = (folderPath: string): StorageDriveItem[] => [
  ...getDirectDriveTrashFolders(folderPath).map((folder) => ({
    id: `trash-drive-folder-${folder.name}`,
    type: 'F',
    title: getDriveFolderName(folder.name),
    subtitle: `${folder.name} · 폴더`,
    fullPath: folder.name,
  })),
  ...getDirectDriveTrashFiles(folderPath).map((file) => ({
    id: `trash-drive-file-${file.id}`,
    type: file.type,
    title: file.title,
    subtitle: `${file.type} · ${formatDataSize(file.sizeMB)} · ${file.folderPath}`,
    fullPath: file.folderPath,
  })),
];
const getAllStorageDriveTrashItems = (): StorageDriveItem[] => [
  ...driveTrashFolderOptions.map((folder) => ({
    id: `trash-drive-folder-${folder.name}`,
    type: 'F',
    title: getDriveFolderName(folder.name),
    subtitle: `${folder.name} · 폴더`,
    fullPath: folder.name,
  })),
  ...driveTrashFiles.map((file) => ({
    id: `trash-drive-file-${file.id}`,
    type: file.type,
    title: file.title,
    subtitle: `${file.type} · ${formatDataSize(file.sizeMB)} · ${file.folderPath}`,
    fullPath: file.folderPath,
  })),
];

const sampleTrashItems: StorageMailItem[] = [
  { id: 'trash-coupon', title: 'store@promo.com', subtitle: '[광고] 여름 프로모션 쿠폰', meta: '받은편지함 · 68MB', badge: '복구 가능' },
  { id: 'trash-event', title: 'event@market.com', subtitle: '이번 주 특가 안내', meta: '프로모션 · 52MB', badge: '복구 가능' },
];

const storageMailPagingMockItems: StorageMailItem[] = Array.from({ length: 28 }, (_, index) => {
  const number = index + 1;
  const size = 18 + (index % 8) * 7;
  return {
    id: `storage-mail-paging-${number}`,
    title: `mock-sender-${number}@mail.com`,
    subtitle: `페이징 확인용 메일 ${number}`,
    meta: `받은날짜 2021.${`${(index % 12) + 1}`.padStart(2, '0')}.${`${(index % 27) + 1}`.padStart(2, '0')} · 받은편지함 · ${size}MB`,
  };
});

const driveTrashFolderOptions = [
  { name: `${driveRootPath} › 삭제된 학기 자료`, meta: '파일 2개 · 하위 폴더 1개 · 1.1GB' },
  { name: `${driveRootPath} › 삭제된 학기 자료 › 이전 발표본`, meta: '파일 2개 · 910MB' },
  { name: `${driveRootPath} › 임시 다운로드`, meta: '파일 1개 · 360MB' },
];

const driveTrashFiles: AuraDriveFile[] = [
  { id: 'trash-drive-root-large', folderPath: driveRootPath, type: 'ZIP', title: 'old_export_bundle.zip', sizeMB: 740, modifiedAt: '2020.05.20', reason: '휴지통 파일' },
  { id: 'trash-drive-root-note', folderPath: driveRootPath, type: 'PDF', title: '삭제된_회의록.pdf', sizeMB: 88, modifiedAt: '2021.01.11', reason: '휴지통 파일' },
  { id: 'trash-drive-old-plan', folderPath: `${driveRootPath} › 삭제된 학기 자료`, type: 'PDF', title: '운영체제_강의자료_백업.pdf', sizeMB: 620, modifiedAt: '2022.03.12', reason: '휴지통 파일' },
  { id: 'trash-drive-final-video', folderPath: `${driveRootPath} › 삭제된 학기 자료`, type: 'ZIP', title: '기말발표_녹화본.zip', sizeMB: 480, modifiedAt: '2021.12.18', reason: '휴지통 파일' },
  { id: 'trash-drive-slide-draft', folderPath: `${driveRootPath} › 삭제된 학기 자료 › 이전 발표본`, type: 'PDF', title: '발표자료_초안.pdf', sizeMB: 510, modifiedAt: '2021.11.02', reason: '휴지통 파일' },
  { id: 'trash-drive-slide-ref', folderPath: `${driveRootPath} › 삭제된 학기 자료 › 이전 발표본`, type: 'PDF', title: '참고자료_모음.pdf', sizeMB: 400, modifiedAt: '2021.10.28', reason: '휴지통 파일' },
  { id: 'trash-drive-download-cache', folderPath: `${driveRootPath} › 임시 다운로드`, type: 'ZIP', title: 'download_cache.zip', sizeMB: 360, modifiedAt: '2020.08.06', reason: '휴지통 파일' },
];

const emptyScanSummary: ScanSummary = {
  mailItems: [],
  driveItems: [],
  largeItems: [],
  protectedItems: [],
  storageMailItems: [],
  storageDriveItems: [],
  storageTrashItems: [],
  mailSizeLabel: '0MB',
  driveSizeLabel: '0MB',
  largeSizeLabel: '0MB',
  totalSizeLabel: '0MB',
  carbonLabel: '약 0.0g CO₂',
  candidateCount: 0,
  folderLabel: '전체 Drive',
};

function formatDataSize(sizeMB: number) {
  if (sizeMB >= 1024) {
    const gb = sizeMB / 1024;
    return `${gb >= 10 ? gb.toFixed(0) : gb.toFixed(1)}GB`;
  }
  if (sizeMB < 1) return `${sizeMB.toFixed(1)}MB`;
  return `${Math.round(sizeMB)}MB`;
}

function bytesToMB(bytes?: number | null) {
  return Math.max(0, Number(bytes ?? 0) / 1024 / 1024);
}

function formatBytes(bytes?: number | null) {
  return formatDataSize(bytesToMB(bytes));
}

function formatApiDate(value?: string | null) {
  const pad = (target: number) => `${target}`.padStart(2, '0');
  const toLabel = (date: Date) =>
    `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

  if (!value) return toLabel(new Date());
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return toLabel(date);
}

function formatApiDateOnly(value?: string | null) {
  return formatScanDateOnly(formatApiDate(value));
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

function apiStorageItemToMail(item: ApiStorageItem): StorageMailItem {
  const date = formatApiDateOnly(item.trashed_at || item.modified_time || item.last_opened_time);
  return {
    id: `api-storage-mail-${item.item_id ?? item.external_item_id ?? item.title}`,
    itemId: item.item_id,
    externalItemId: item.external_item_id,
    snapshotTitle: item.title,
    snapshotSizeBytes: item.size_bytes,
    itemSource: item.item_source ?? 'GMAIL',
    title: item.title || item.external_item_id || 'Gmail 항목',
    subtitle: item.title || '메일 항목',
    meta: `받은날짜 ${date} · Gmail · ${formatBytes(item.size_bytes)}`,
    badge: item.recoverable === false ? '만료 임박' : undefined,
  };
}

function apiStorageItemToDrive(item: ApiStorageItem): StorageDriveItem {
  const extension = (item.file_extension || item.mime_type || 'FILE').replace(/^\./, '').toUpperCase();
  const date = formatApiDateOnly(item.modified_time || item.last_opened_time || item.trashed_at);
  return {
    id: `api-storage-drive-${item.item_id ?? item.external_item_id ?? item.title}`,
    itemId: item.item_id,
    externalItemId: item.external_item_id,
    snapshotTitle: item.title,
    snapshotSizeBytes: item.size_bytes,
    itemSource: item.item_source ?? 'DRIVE',
    type: extension || 'FILE',
    title: item.title || item.external_item_id || 'Drive 파일',
    subtitle: `${extension || 'FILE'} · ${formatBytes(item.size_bytes)} · 수정 ${date} · Drive`,
    fullPath: driveRootPath,
  };
}

function apiStorageItemToTrash(item: ApiStorageItem): StorageMailItem {
  const source = item.item_source ?? 'GMAIL';
  const extension = (item.file_extension || item.mime_type || 'FILE').replace(/^\./, '').toUpperCase();
  const date = formatApiDateOnly(item.trashed_at || item.modified_time || item.last_opened_time);
  const idSeed = item.item_id ?? item.external_item_id ?? item.title;

  return {
    id: source === 'DRIVE' ? `trash-drive-api-${idSeed}` : `trash-mail-api-${idSeed}`,
    itemId: item.item_id,
    externalItemId: item.external_item_id,
    snapshotTitle: item.title,
    snapshotSizeBytes: item.size_bytes,
    itemSource: source,
    title: item.title || item.external_item_id || (source === 'DRIVE' ? 'Drive 파일' : 'Gmail 항목'),
    subtitle: item.title || (source === 'DRIVE' ? 'Drive 파일' : '메일 항목'),
    meta:
      source === 'DRIVE'
        ? `${extension || 'FILE'} · ${formatBytes(item.size_bytes)} · 휴지통 ${date} · 내 Drive`
        : `받은날짜 ${date} · Gmail · ${formatBytes(item.size_bytes)}`,
    badge: item.recoverable === false ? '복구 불가' : undefined,
  };
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
    detailTitle: candidate.title,
    detailSubtitle: candidate.snippet || candidate.folder_path || candidate.mime_type,
  };
}

function buildApiScanSummary(params: {
  candidates?: ApiCandidate[];
  storageMailItems?: ApiStorageItem[];
  storageDriveItems?: ApiStorageItem[];
  trashMailItems?: ApiStorageItem[];
  estimatedBytes?: number;
  candidateCount?: number;
  carbonGrams?: number;
  folderLabel?: string;
}): ScanSummary {
  const candidateItems = (params.candidates ?? []).map(apiCandidateToScanItem);
  const mailItems = candidateItems.filter((item) => item.source === 'mail');
  const driveItems = candidateItems.filter((item) => item.source === 'drive');
  const largeItems = driveItems.filter((item) => item.sizeMB >= 500);
  const protectedItems = candidateItems.filter((item) => item.desc?.includes('보호'));
  const totalSizeMB =
    params.estimatedBytes !== undefined
      ? bytesToMB(params.estimatedBytes)
      : sumScanItemSize(mailItems) + sumScanItemSize(driveItems);

  return {
    mailItems,
    driveItems,
    largeItems,
    protectedItems,
    storageMailItems: (params.storageMailItems ?? []).map(apiStorageItemToMail),
    storageDriveItems: (params.storageDriveItems ?? []).map(apiStorageItemToDrive),
    storageTrashItems: (params.trashMailItems ?? []).map(apiStorageItemToTrash),
    mailSizeLabel: formatDataSize(sumScanItemSize(mailItems)),
    driveSizeLabel: formatDataSize(sumScanItemSize(driveItems)),
    largeSizeLabel: formatDataSize(sumScanItemSize(largeItems)),
    totalSizeLabel: formatDataSize(totalSizeMB),
    carbonLabel: `약 ${(params.carbonGrams ?? Math.max(0, (totalSizeMB / 1024) * 0.19)).toFixed(1)}g CO₂`,
    candidateCount: params.candidateCount ?? candidateItems.length,
    folderLabel: params.folderLabel ?? '전체 Drive',
  };
}

function formatScanDateOnly(dateLabel: string) {
  return dateLabel.split(/\s+/)[0] || dateLabel;
}

function formatMonthDuration(months: number) {
  const years = Math.floor(months / 12);
  const restMonths = months % 12;
  if (years <= 0) return `${restMonths}개월`;
  if (restMonths <= 0) return `${years}년`;
  return `${years}년 ${restMonths}개월`;
}

function sizeLabelToMB(label: string) {
  const value = Number.parseFloat(label.replace(/[^0-9.]/g, '')) || 0;
  return label.includes('GB') ? value * 1024 : value;
}

function extractStorageSizeMB(textValue: string) {
  const match = textValue.match(/(\d+(?:\.\d+)?)\s*(GB|MB)/i);
  if (!match) return 0;
  const value = Number.parseFloat(match[1]) || 0;
  return match[2].toUpperCase() === 'GB' ? value * 1024 : value;
}

function getStorageSizeLabel(textValue: string) {
  const sizeMB = extractStorageSizeMB(textValue);
  return sizeMB > 0 ? formatDataSize(sizeMB) : '';
}

function splitStorageMeta(textValue: string) {
  return textValue.split(/\s*(?:·|쨌)\s*/).map((part) => part.trim()).filter(Boolean);
}

function getTrashDriveFolderPath(meta: string) {
  const parts = splitStorageMeta(meta);
  const path = parts.find((part) => part.includes('Drive ›') || part === '내 Drive');
  if (path) return path;
  const folderOnly = meta.replace(/\s*(?:·|쨌)\s*(?:폴더|\?대뜑)$/, '').trim();
  return folderOnly || '내 Drive';
}

function formatFolderMeta(meta: string) {
  const match = meta.match(/(\d+(?:\.\d+)?\s*(?:GB|MB))/i);
  return match?.[1] ?? meta;
}

function carbonLabelToGram(label: string) {
  return Number.parseFloat(label.replace(/[^0-9.]/g, '')) || 0;
}

function parseDateValue(label: string) {
  const [year, month, day] = label.split('.').map((part) => Number.parseInt(part, 10));
  return new Date(year || 2000, (month || 1) - 1, day || 1).getTime();
}

function isOlderThanYears(label: string, years: number) {
  const target = new Date();
  target.setFullYear(target.getFullYear() - years);
  return parseDateValue(label) <= target.getTime();
}

function applyResultFilterSort(items: ScanListItem[], filterDate: string, filterSize: string, sortMode: string) {
  const minSize =
    filterSize === '1GB 이상' ? 1024 : filterSize === '500MB 이상' ? 500 : filterSize === '100MB 이상' ? 100 : 0;
  const minYears = filterDate === '5년 이상' ? 5 : filterDate === '3년 이상' ? 3 : filterDate === '1년 이상' ? 1 : 0;

  return [...items]
    .filter((item) => item.sizeMB >= minSize)
    .filter((item) => (minYears ? isOlderThanYears(item.dateLabel, minYears) : true))
    .sort((a, b) => {
      if (sortMode === '용량순') return b.sizeMB - a.sizeMB;
      if (sortMode === '발신자순' || sortMode === '이름순') {
        return a.sortText.localeCompare(b.sortText, 'ko') || a.title.localeCompare(b.title, 'ko');
      }
      return parseDateValue(a.dateLabel) - parseDateValue(b.dateLabel);
    });
}

function sumScanItemSize(items: ScanListItem[]) {
  return items.reduce((sum, item) => sum + item.sizeMB, 0);
}

function getDriveFolderMatch(filePath: string, selectedFolders: string[], includeSubFolders: boolean) {
  if (!selectedFolders.length) return true;
  return selectedFolders.some((folder) => filePath === folder || (includeSubFolders && filePath.startsWith(`${folder} ›`)));
}

function buildScanResult({
  scanSources,
  selectedDriveFolders,
  selectedDriveFileIds,
  includeSubFolders,
  includeKeywords,
  excludeKeywords,
  selectedFileTypes,
  includeMailAttachments,
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
  const loweredInclude = includeKeywords.map((item) => item.trim().toLowerCase()).filter(Boolean);
  const loweredExclude = excludeKeywords.map((item) => item.trim().toLowerCase()).filter(Boolean);
  const mailCandidates = scanSources.gmail
    ? auraMailMessages.filter((mail) => {
        const haystack = `${mail.title} ${mail.from} ${mail.folder} ${mail.reason}`.toLowerCase();
        const hasAttachment = mailAttachmentIds.has(mail.id);
        const excluded = loweredExclude.some((keyword) => haystack.includes(keyword));
        const included = loweredInclude.length === 0 || loweredInclude.some((keyword) => haystack.includes(keyword));
        return !excluded && (includeMailAttachments || !hasAttachment) && (included || mailGhostCandidateIds.has(mail.id));
      })
    : [];
  const protectedMailCandidates = scanSources.gmail
    ? auraMailMessages.filter((mail) => {
        const haystack = `${mail.title} ${mail.from} ${mail.folder} ${mail.reason}`.toLowerCase();
        return loweredExclude.some((keyword) => haystack.includes(keyword));
      })
    : [];

  const selectedDriveFiles = scanSources.drive
    ? auraDriveFiles.filter((file) => {
        const typeAllowed = selectedFileTypes[file.type] ?? true;
        const inFolder = scanSources.folder ? selectedDriveFileIds.includes(file.id) : true;
        const driveHaystack = `${file.title} ${file.folderPath} ${file.reason} ${file.type}`.toLowerCase();
        const protectedFile = loweredExclude.some((keyword) => driveHaystack.includes(keyword));
        return typeAllowed && inFolder && !protectedFile;
      })
    : [];
  const protectedDriveFiles = scanSources.drive
    ? auraDriveFiles.filter((file) => {
        const inFolder = scanSources.folder ? selectedDriveFileIds.includes(file.id) : true;
        const driveHaystack = `${file.title} ${file.folderPath} ${file.reason} ${file.type}`.toLowerCase();
        return inFolder && loweredExclude.some((keyword) => driveHaystack.includes(keyword));
      })
    : [];

  const largeDriveFiles = selectedDriveFiles.filter((file) => file.sizeMB >= 600 || file.reason.includes('중복'));
  const mailSize = mailCandidates.reduce((sum, item) => sum + item.sizeMB, 0);
  const driveSize = selectedDriveFiles.reduce((sum, item) => sum + item.sizeMB, 0);
  const largeSize = largeDriveFiles.reduce((sum, item) => sum + item.sizeMB, 0);
  const totalSize = mailSize + driveSize;
  const carbon = Math.max(0.1, (totalSize / 1024) * 0.19);

  const mailItems = mailCandidates.map((mail) => ({
    id: mail.id,
    title: mail.title,
    desc: `${mail.from} · ${mail.folder} · ${formatDataSize(mail.sizeMB)} · ${mail.reason}`,
    sizeMB: mail.sizeMB,
    dateLabel: mail.receivedAt,
    sortText: mail.from,
    source: 'mail' as const,
    previewLabel: '메일 본문 미리보기',
    detailSubtitle: `${mail.from} → me@gmail.com`,
  }));
  const driveItems = selectedDriveFiles.map((file) => ({
    id: file.id,
    title: file.title,
    desc: `${formatDataSize(file.sizeMB)} · ${file.folderPath} · ${file.reason}`,
    sizeMB: file.sizeMB,
    dateLabel: file.modifiedAt,
    sortText: file.title,
    source: 'drive' as const,
    previewLabel: file.type === 'PDF' ? 'PDF PREVIEW' : file.type === 'JPG' ? 'IMAGE PREVIEW' : 'FILE PREVIEW',
    detailSubtitle: `${formatDataSize(file.sizeMB)} · ${file.type} · ${file.folderPath}`,
  }));
  const largeItems = largeDriveFiles.map((file) => ({
    id: file.id,
    title: file.title,
    desc: `${formatDataSize(file.sizeMB)} · ${file.reason} · ${file.folderPath}`,
    sizeMB: file.sizeMB,
    dateLabel: file.modifiedAt,
    sortText: file.title,
    source: 'drive' as const,
    previewLabel: file.type === 'PDF' ? 'PDF PREVIEW' : file.type === 'JPG' ? 'IMAGE PREVIEW' : 'FILE PREVIEW',
    detailSubtitle: `${formatDataSize(file.sizeMB)} · ${file.type} · ${file.folderPath}`,
  }));
  const protectedItems = [
    ...protectedMailCandidates.map((mail) => ({
      id: mail.id,
      title: mail.title,
      desc: `${mail.from} · ${mail.folder} · ${formatDataSize(mail.sizeMB)} · 제외 키워드 보호`,
      sizeMB: mail.sizeMB,
      dateLabel: mail.receivedAt,
      sortText: mail.from,
      source: 'mail' as const,
      previewLabel: '보호된 메일',
      detailSubtitle: `${mail.from} → me@gmail.com`,
    })),
    ...protectedDriveFiles.map((file) => ({
      id: file.id,
      title: file.title,
      desc: `${formatDataSize(file.sizeMB)} · ${file.folderPath} · 제외 키워드 보호`,
      sizeMB: file.sizeMB,
      dateLabel: file.modifiedAt,
      sortText: file.title,
      source: 'drive' as const,
      previewLabel: '보호된 Drive 항목',
      detailSubtitle: `${formatDataSize(file.sizeMB)} · ${file.type} · ${file.folderPath}`,
    })),
  ];

  const folderLabel = scanSources.folder
    ? selectedDriveFolders.length
      ? selectedDriveFolders.length === 1
        ? selectedDriveFolders[0]
        : `${selectedDriveFolders[0]} 외 ${selectedDriveFolders.length - 1}개`
      : '선택된 Drive 폴더 없음'
    : '전체 Drive';

  return {
    mailItems,
    driveItems,
    largeItems,
    protectedItems,
    storageMailItems: scanSources.gmail
      ? [
          ...mailCandidates.map((mail) => ({
            id: `storage-${mail.id}`,
            title: mail.from,
            subtitle: mail.title,
            meta: `받은날짜 ${mail.receivedAt} · ${mail.folder} · ${formatDataSize(mail.sizeMB)}`,
          })),
          ...storageMailPagingMockItems,
        ]
      : [],
    storageDriveItems: [
      ...(scanSources.folder && selectedDriveFolders.length
        ? selectedDriveFolders.map((folder) => ({
            id: `storage-folder-${folder}`,
            type: 'F',
            title: folder.split('›').pop()?.trim() ?? folder,
            subtitle: `${folder} · 폴더`,
          }))
        : driveFolderOptions
            .filter((folder) => folder.name.split('›').length <= 2)
            .map((folder) => ({
              id: `storage-folder-${folder.name}`,
              type: 'F',
              title: folder.name.split('›').pop()?.trim() ?? folder.name,
              subtitle: `${folder.name} · 폴더`,
            }))),
      ...selectedDriveFiles.map((file) => ({
        id: `storage-${file.id}`,
        type: file.type,
        title: file.title,
        subtitle: `${file.type} · ${formatDataSize(file.sizeMB)} · 수정 ${file.modifiedAt} · ${file.folderPath}`,
      })),
    ],
    storageTrashItems: totalSize > 0 ? sampleTrashItems : [],
    mailSizeLabel: formatDataSize(mailSize),
    driveSizeLabel: formatDataSize(driveSize),
    largeSizeLabel: formatDataSize(largeSize),
    totalSizeLabel: formatDataSize(totalSize),
    carbonLabel: `약 ${carbon.toFixed(1)}g CO₂`,
    candidateCount: mailItems.length + driveItems.length,
    folderLabel,
  };
}

const defaultStorageSummary = buildScanResult({
  scanSources: { gmail: true, drive: true, folder: false },
  selectedDriveFolders: [],
  selectedDriveFileIds: [],
  includeSubFolders: true,
  includeKeywords: [],
  excludeKeywords: [],
  selectedFileTypes: { PDF: true, DOCX: true, ZIP: true, JPG: true },
  includeMailAttachments: true,
});

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
  const [deleteJobStatus, setDeleteJobStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');
  const [deleteStatusText, setDeleteStatusText] = useState('선택 항목을 휴지통으로 이동 중');
  const [homeScanNotice, setHomeScanNotice] = useState<'none' | 'running' | 'cancelled' | 'completed'>('none');
  const [apiScanJobId, setApiScanJobId] = useState<number | null>(null);
  const [apiCleanupJobId, setApiCleanupJobId] = useState<number | null>(null);
  const [lastScan, setLastScan] = useState<ScanRecord | null>(null);
  const [apiHomeSummary, setApiHomeSummary] = useState<ApiHomeSummary | null>(null);
  const [apiStorageSummary, setApiStorageSummary] = useState<ScanSummary | null>(null);
  const [apiScanHistoryItems, setApiScanHistoryItems] = useState<ApiScanHistoryItem[]>([]);
  const [apiMonthlyStats, setApiMonthlyStats] = useState<ApiMonthlyStatistic[]>([]);
  const [apiScanSetting, setApiScanSetting] = useState<ApiScanSetting | null>(null);
  const [apiAnnouncements, setApiAnnouncements] = useState<ApiAnnouncement[]>([]);
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [announcementError, setAnnouncementError] = useState('');
  const [privacyData, setPrivacyData] = useState<ApiPrivacyData | null>(null);
  const [privacyDataLoading, setPrivacyDataLoading] = useState(false);
  const [privacyDataError, setPrivacyDataError] = useState('');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [hasCompletedScan, setHasCompletedScan] = useState(false);
  const [connectedDone, setConnectedDone] = useState(false);
  const [connectedStep, setConnectedStep] = useState(0);
  const [hasSeenConnectedSuccess, setHasSeenConnectedSuccess] = useState(false);
  const [skipConnectedAnimation, setSkipConnectedAnimation] = useState(false);
  const [onboardingGhostDone, setOnboardingGhostDone] = useState(false);
  const [onboardingCarbonDone, setOnboardingCarbonDone] = useState(false);
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
  const screenRef = useRef<Screen>('initial');
  const scanSourceLabelRef = useRef('Gmail + Drive');
  const scanResultRef = useRef<ScanSummary>(emptyScanSummary);
  const activeApiScanJobId = useRef<number | null>(null);
  const activeApiCleanupJobId = useRef<number | null>(null);
  const fcmRegistrationInFlight = useRef(false);
  const registeredFcmTokenRef = useRef('');
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
    if (__DEV__ && DEV_AURA_ACCESS_TOKEN) return;

    void loadGoogleSignInModule()
      .then(({ GoogleSignin }) => {
        GoogleSignin.configure({
          webClientId: GOOGLE_WEB_CLIENT_ID,
          offlineAccess: true,
          forceCodeForRefreshToken: true,
          scopes: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/drive',
          ],
        });
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

  const getSimpleScanSourceLabel = () => {
    if (scanSources.gmail && (scanSources.drive || scanSources.folder)) return 'Gmail + Drive';
    if (scanSources.gmail) return 'Gmail';
    if (scanSources.drive || scanSources.folder) return 'Drive';
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
    setConnectedDone(false);
    setConnectedStep(0);
    setHasSeenConnectedSuccess(false);
    setSkipConnectedAnimation(false);
    setOnboardingGhostDone(false);
    setOnboardingCarbonDone(false);
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
      setPermissions((items) => ({
        ...items,
        gmail: Boolean(user.permissions?.gmail ?? items.gmail),
        drive: Boolean(user.permissions?.drive ?? items.drive),
        alarm: Boolean(user.permissions?.alarm ?? items.alarm),
      }));
    }
  };

  const applyApiScanSetting = (setting?: ApiScanSetting | null) => {
    if (!setting) return;

    setApiScanSetting(setting);
    setScanSources({
      gmail: setting.scan_source === 'MAIL' || setting.scan_source === 'MAIL_AND_DRIVE',
      drive: setting.scan_source === 'DRIVE_ALL' || setting.scan_source === 'MAIL_AND_DRIVE',
      folder: setting.scan_source === 'DRIVE_FOLDER',
    });
    setIncludeSubFolders(Boolean(setting.include_subfolders ?? true));
    setIncludeMailAttachments(Boolean(setting.include_mail_attachment_size));
    setSettingsToggles((items) => ({
      ...items,
      autoScan: Boolean(setting.apply_recent_conditions ?? items.autoScan),
    }));

    if (setting.last_opened_before_months) {
      setLastOpenedBeforeMonths(setting.last_opened_before_months);
    }
    if (setting.last_modified_before_months) {
      setLastModifiedBeforeMonths(setting.last_modified_before_months);
    }
    if (setting.include_keywords) {
      setIncludeKeywords(setting.include_keywords);
    }
    if (setting.exclude_keywords) {
      setExcludeKeywords(setting.exclude_keywords);
    }
    if (setting.file_extensions?.length) {
      const selected = setting.file_extensions.reduce<Record<string, boolean>>((acc, extension) => {
        acc[extension.replace(/^\./, '').toUpperCase()] = true;
        return acc;
      }, {});
      setSelectedFileTypes((items) => ({ ...items, ...selected }));
    }
  };

  const getActiveDriveFolderOptions = () => (apiDriveFolderOptions.length ? apiDriveFolderOptions : driveFolderOptions);

  const getSelectedDriveFolderId = () =>
    selectedDriveFolders.map((folderPath) => apiDriveFolderIdsByPath[folderPath]).find(Boolean) ?? selectedDriveFolders[0];

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

    const parentId = parentPath === driveRootPath ? undefined : apiDriveFolderIdsByPath[parentPath];
    if (parentPath !== driveRootPath && !parentId) return;

    setDriveFolderLoading(true);
    setDriveFolderError('');

    try {
      const response = await scanApi.getDriveFolders({ parent_id: parentId, size: 50 }, { accessToken: apiAccessToken });
      const folders = (response.folders ?? []).filter((folder): folder is ApiDriveFolder & { name: string } => Boolean(folder.name));
      const nextFolders = folders.map((folder) => {
        const path = parentPath === driveRootPath ? `${driveRootPath} › ${folder.name}` : `${parentPath} › ${folder.name}`;
        return {
          id: folder.folder_id,
          parentId: folder.parent_id,
          name: path,
          meta: folder.modified_time ? `수정 ${formatApiDateOnly(folder.modified_time)}` : 'Google Drive 폴더',
        };
      });
      mergeDriveFolderOptions(nextFolders);
    } catch {
      setDriveFolderError('Drive 폴더를 불러오지 못했어요. Google Drive 권한을 다시 연결하거나 재시도해주세요.');
    } finally {
      setDriveFolderLoading(false);
    }
  };

  const refreshGooglePermissions = async () => {
    if (!apiAccessToken) {
      showToast('로그인 후 권한 상태를 확인할 수 있어요');
      return;
    }

    try {
      const response = await googleApi.recheckPermissions({ accessToken: apiAccessToken });
      const nextPermissions = response.permissions ?? [];
      const gmail = nextPermissions.find((permission) => permission.service_type === 'GMAIL');
      const drive = nextPermissions.find((permission) => permission.service_type === 'DRIVE');
      setPermissions((items) => ({
        ...items,
        gmail: gmail ? gmail.permission_status === 'CONNECTED' : items.gmail,
        drive: drive ? drive.permission_status === 'CONNECTED' : items.drive,
      }));
      showToast('Google 권한 상태를 다시 확인했어요');
    } catch {
      showToast('Google 권한 상태 확인에 실패했어요');
    }
  };

  const requestGoogleReconnect = async (serviceTypes: Array<'GMAIL' | 'DRIVE'>) => {
    if (!apiAccessToken) {
      go(serviceTypes[0] === 'GMAIL' ? 'gmailPermission' : 'drivePermission');
      return;
    }

    try {
      const response = await googleApi.createReconnectUrl(
        {
          service_types: serviceTypes,
          redirect_uri: GOOGLE_OAUTH_REDIRECT_URI,
        },
        { accessToken: apiAccessToken }
      );

      if (!response.auth_url) {
        showToast('Google 권한 요청 URL이 내려오지 않았어요');
        return;
      }

      await Linking.openURL(response.auth_url);
      void refreshGooglePermissions();
    } catch {
      showToast('Google 권한 재연결을 시작하지 못했어요');
    }
  };

  const registerFcmTokenWithServer = async () => {
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

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('aura-default', {
          name: 'AURA',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      let permission = await Notifications.getPermissionsAsync();
      if (permission.status !== 'granted') {
        permission = await Notifications.requestPermissionsAsync();
      }
      if (permission.status !== 'granted') return;

      const devicePushToken = await Notifications.getDevicePushTokenAsync();
      const token =
        typeof devicePushToken.data === 'string'
          ? devicePushToken.data
          : JSON.stringify(devicePushToken.data);

      if (!token || registeredFcmTokenRef.current === token) return;

      await notificationApi.registerFcmToken(
        {
          fcm_token: token,
          device_identifier: `${getAuraPlatform()}:${getAuraDeviceId()}:${getAuraAppVersion() ?? '1.0.0'}`,
        },
        { accessToken: apiAccessToken }
      );
      registeredFcmTokenRef.current = token;
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
    const options = { accessToken: token };
    const [
      homeResult,
      googlePermissionsResult,
      notificationSettingsResult,
      scanSettingsResult,
      runningScanResult,
      scanHistoryResult,
      statisticsSummaryResult,
      monthlyStatsResult,
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
      scanApi.getHistory({ page: 0, size: 20 }, options),
      statisticsApi.getSummary(options),
      statisticsApi.getMonthly(undefined, options),
      storageApi.getItems({ item_source: 'GMAIL', page: 0, size: 50 }, options),
      storageApi.getItems({ item_source: 'DRIVE', page: 0, size: 50 }, options),
      storageApi.getTrash({ item_source: 'GMAIL', page: 0, size: 50 }, options),
      storageApi.getTrash({ item_source: 'DRIVE', page: 0, size: 50 }, options),
    ]);

    const homeSummary = homeResult.status === 'fulfilled' ? homeResult.value : null;
    const scanHistory = scanHistoryResult.status === 'fulfilled' ? scanHistoryResult.value.content ?? [] : [];
    const storageMail = mailStorageResult.status === 'fulfilled' ? mailStorageResult.value.content ?? [] : [];
    const storageDrive = driveStorageResult.status === 'fulfilled' ? driveStorageResult.value.content ?? [] : [];
    const trashMail = mailTrashResult.status === 'fulfilled' ? mailTrashResult.value.content ?? [] : [];
    const trashDrive = driveTrashResult.status === 'fulfilled' ? driveTrashResult.value.content ?? [] : [];
    const latestHistory = scanHistory[0];
    const latestScan = homeSummary?.latest_scan;
    const latestCleanup = homeSummary?.latest_cleanup;
    const estimatedBytes = latestScan?.estimated_reclaim_bytes ?? latestHistory?.estimated_reclaim_bytes ?? homeSummary?.storage_summary?.estimated_reclaim_bytes;
    const candidateCount = latestScan?.candidate_count ?? latestHistory?.candidate_count;
    const completedAt = latestScan?.completed_at ?? latestHistory?.created_at ?? latestScan?.started_at;
    const source = latestScan?.scan_source ?? latestHistory?.scan_source;
    const apiSummary = buildApiScanSummary({
      storageMailItems: storageMail,
      storageDriveItems: storageDrive,
      trashMailItems: [...trashMail, ...trashDrive],
      estimatedBytes,
      candidateCount,
      carbonGrams: latestCleanup?.estimated_carbon_grams ?? latestHistory?.estimated_carbon_grams ?? homeSummary?.storage_summary?.total_estimated_carbon_grams,
    });

    setApiHomeSummary(homeSummary);
    setApiStorageSummary(apiSummary);
    setApiScanHistoryItems(scanHistory);

    if (homeSummary?.permissions) {
      setPermissions((items) => ({
        ...items,
        gmail: homeSummary.permissions?.gmail_status === 'CONNECTED',
        drive: homeSummary.permissions?.drive_status === 'CONNECTED',
      }));
    }

    if (googlePermissionsResult.status === 'fulfilled') {
      const nextPermissions = googlePermissionsResult.value.permissions ?? [];
      const gmail = nextPermissions.find((permission) => permission.service_type === 'GMAIL');
      const drive = nextPermissions.find((permission) => permission.service_type === 'DRIVE');
      setPermissions((items) => ({
        ...items,
        gmail: gmail ? gmail.permission_status === 'CONNECTED' : items.gmail,
        drive: drive ? drive.permission_status === 'CONNECTED' : items.drive,
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
    }

    if (latestScan || latestHistory || storageMail.length || storageDrive.length) {
      setLastScan({
        dateLabel: formatApiDate(completedAt ?? latestCleanup?.completed_at),
        sourceLabel: apiScanSourceLabel(source),
        conditionLabel: apiScanSetting ? getPeriodLabel() : 'Swagger API 기준',
        result: apiSummary,
      });
      setHasCompletedScan(Boolean(latestScan || latestHistory));
    }

    if (statisticsSummaryResult.status === 'rejected') {
      // 통계 API가 아직 토큰/데이터 문제로 실패해도 기존 화면을 유지한다.
    }
  };

  useEffect(() => {
    if (!__DEV__ || !DEV_AURA_ACCESS_TOKEN || devAccessTokenApplied.current) return;

    devAccessTokenApplied.current = true;
    setApiAccessToken(DEV_AURA_ACCESS_TOKEN);

    void userApi
      .getMe({ accessToken: DEV_AURA_ACCESS_TOKEN })
      .then((user) => {
        applyApiUser(user);
        setPrivacyChecked(true);
        setPrivacyDetailChecked(true);
        void refreshAuraApis(DEV_AURA_ACCESS_TOKEN);
        replace('home');
      })
      .catch(() => {
        setApiAccessToken(null);
        showToast('개발용 AURA access token을 확인해주세요');
      });
  }, []);

  const syncUserPermissions = async (nextPermissions: Partial<AuraServicePermissions>) => {
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

      if (session.user) {
        applyApiUser(session.user);
      } else if (nextAccessToken) {
        const user = await userApi.getMe({ accessToken: nextAccessToken });
        applyApiUser(user);
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

      if (session.user) {
        applyApiUser(session.user);
      } else if (nextAccessToken) {
        const user = await userApi.getMe({ accessToken: nextAccessToken });
        applyApiUser(user);
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
        const googleError = error as { code: string };

        if (googleError.code === googleStatusCodes.SIGN_IN_CANCELLED) {
          return;
        }

        if (googleError.code === googleStatusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          showToast('Google Play Services is not available.');
          return;
        }
      }

      showToast('Google login failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const showPermissionToast = () => {
    showToast('Gmail 또는 Google Drive의 접근 권한을 허용해주세요');
  };

  const requestPushPermission = async () => {
    if (Platform.OS === 'android') {
      const androidVersion = Number(Platform.Version);
      const notificationPermission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;

      if (androidVersion < 33 || !notificationPermission) {
        setPermissions((items) => ({ ...items, alarm: true }));
        setSettingsToggles((items) => ({ ...items, scanComplete: true, aiNudge: true }));
        return true;
      }

      const acceptedAppPrompt = await new Promise<boolean>((resolve) => {
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
      });

      if (!acceptedAppPrompt) {
        setPermissions((items) => ({ ...items, alarm: false }));
        setSettingsToggles((items) => ({ ...items, scanComplete: false, aiNudge: false }));
        showToast('푸시 알림 권한이 허용되지 않았어요');
        return false;
      }

      const result = await PermissionsAndroid.request(notificationPermission);
      const allowed = result === PermissionsAndroid.RESULTS.GRANTED;

      setPermissions((items) => ({ ...items, alarm: allowed }));
      setSettingsToggles((items) => ({ ...items, scanComplete: allowed, aiNudge: allowed }));
      if (!allowed) {
        showToast('푸시 알림 권한이 허용되지 않았어요');
      }
      return allowed;
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

  const getCurrentScanResult = () => lastScan?.result ?? scanResultRef.current;

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

  const getApiScanSource = () => {
    if (scanSources.gmail && (scanSources.drive || scanSources.folder)) return 'MAIL_AND_DRIVE' as const;
    if (scanSources.gmail) return 'MAIL' as const;
    if (scanSources.folder) return 'DRIVE_FOLDER' as const;
    if (scanSources.drive) return 'DRIVE_ALL' as const;
    return 'MAIL_AND_DRIVE' as const;
  };

  const getApiScanSettingsPayload = () => ({
    scan_source: getApiScanSource(),
    drive_folder_id: getSelectedDriveFolderId() || undefined,
    include_subfolders: includeSubFolders,
    last_opened_before_months: lastOpenedBeforeMonths,
    last_modified_before_months: lastModifiedBeforeMonths,
    exclude_recent_days: 0,
    include_keywords: includeKeywords,
    exclude_keywords: excludeKeywords,
    file_extensions: Object.entries(selectedFileTypes)
      .filter(([, selected]) => selected)
      .map(([extension]) => extension.toUpperCase()),
    include_mail_attachment_size: includeMailAttachments,
    apply_recent_conditions: settingsToggles.autoScan,
  });

  const saveApiScanSettings = async () => {
    if (!apiAccessToken) return;

    try {
      const saved = await scanApi.saveSettings(getApiScanSettingsPayload(), { accessToken: apiAccessToken });
      applyApiScanSetting(saved);
    } catch {
      showToast('스캔 조건은 화면에만 적용됐어요');
    }
  };

  const startScan = () => {
    if (!scanSources.gmail && !scanSources.drive && !scanSources.folder) {
      showPermissionToast();
      return;
    }
    if (scanSources.folder && !selectedDriveFolders.length && !selectedDriveFiles.length) {
      showToast('분석할 Drive 폴더를 선택해주세요');
      go('scanFlowFolder');
      return;
    }
    scanSourceLabelRef.current = getSimpleScanSourceLabel();
    scanResultRef.current = getLiveScanResult();
    setScanProgress(0);
    setScanStatusText('스캔 작업을 요청 중이에요');
    setApiScanJobId(null);
    activeApiScanJobId.current = null;
    setHomeScanNotice('running');
    go('scanProgress');

    if (apiAccessToken) {
      void scanApi
        .create(
          {
            use_saved_settings: hasCompletedScan && settingsToggles.autoScan,
            settings_override: hasCompletedScan && settingsToggles.autoScan ? undefined : getApiScanSettingsPayload(),
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
      return;
    }
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
    setHomeScanNotice('none');
    replace('cleanupComplete');
  };

  const startDeleteJob = () => {
    if (apiAccessToken && activeApiScanJobId.current) {
      const candidates = getSelectedApiCandidatePayloads();

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

      void scanApi
        .updateCandidateSelections(
          activeApiScanJobId.current,
          {
            candidate_ids: candidates.map((candidate) => candidate.candidate_id),
            selection_status: 'SELECTED',
            exclude_protected: true,
          },
          { accessToken: apiAccessToken }
        )
        .catch(() => undefined)
        .then(() => {
          if (!activeApiScanJobId.current) return null;
          return cleanupApi.create(
            {
              scan_job_id: activeApiScanJobId.current,
              action_type: 'MOVE_TO_TRASH',
              candidates,
              approval_confirmed: true,
            },
            { accessToken: apiAccessToken }
          );
        })
        .then((job) => {
          if (!job?.cleanup_job_id) return;
          activeApiCleanupJobId.current = job.cleanup_job_id;
          setApiCleanupJobId(job.cleanup_job_id);
        })
        .catch(() => {
          setDeleteJobStatus('failed');
          setDeleteStatusText('정리 요청에 실패했어요');
          if (screenRef.current === 'deleteProcessing') {
            replace('selectedReview');
          }
          showToast('백엔드 휴지통 이동 요청 실패: 권한 또는 서버 상태를 확인해주세요', undefined, 3200);
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
    if (screen === 'connected') {
      if (hasSeenConnectedSuccess) {
        setSkipConnectedAnimation(true);
        setConnectedDone(true);
        setConnectedStep(3);
        return;
      }

      setSkipConnectedAnimation(false);
      setConnectedDone(true);
      setConnectedStep(3);
    }
  }, [screen]);

  useEffect(() => {
    setScanSources((items) => ({
      gmail: items.gmail && permissions.gmail,
      drive: items.drive && permissions.drive,
      folder: items.folder && permissions.drive,
    }));
  }, [permissions.gmail, permissions.drive]);

  useEffect(() => {
    if (screen !== 'connected') return;
    setConnectedStep(3);
  }, [screen, connectedDone, skipConnectedAnimation]);

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
          const [summaryResult, candidatesResult] = await Promise.allSettled([
            scanApi.getAnalysisSummary(apiScanJobId, { accessToken: apiAccessToken }),
            scanApi.getCandidates(apiScanJobId, { include_protected: true, page: 0, size: 100 }, { accessToken: apiAccessToken }),
          ]);

          if (cancelled) return;

          const apiSummary = summaryResult.status === 'fulfilled' ? summaryResult.value : null;
          const apiCandidates = candidatesResult.status === 'fulfilled' ? candidatesResult.value.content ?? [] : [];
          const nextSummary = buildApiScanSummary({
            candidates: apiCandidates,
            storageMailItems: apiStorageSummary?.storageMailItems.map((item) => ({
              title: item.subtitle,
              size_bytes: item.snapshotSizeBytes ?? Math.round(extractStorageSizeMB(item.meta) * 1024 * 1024),
              modified_time: item.meta,
            })) ?? [],
            storageDriveItems: apiStorageSummary?.storageDriveItems.map((item) => ({
              title: item.title,
              file_extension: item.type,
              size_bytes: item.snapshotSizeBytes ?? Math.round(extractStorageSizeMB(item.subtitle) * 1024 * 1024),
              modified_time: item.subtitle,
            })) ?? [],
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
            dateLabel: formatScanDate(new Date()),
            sourceLabel: scanSourceLabelRef.current,
            conditionLabel: getPeriodLabel(),
            result: nextSummary,
          });
          setHomeScanNotice('completed');
          setHasCompletedScan(true);

          if (job.job_status === 'PARTIAL_FAILED') {
            showToast('일부 분석에 실패했어요. 후보를 확인해주세요', undefined, 3600);
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

    const timer = setInterval(() => {
      setScanProgress((value) => {
        const next = Math.min(100, value + 4);
        setScanStatusText(next < 50 ? '메일 및 드라이브 데이터 수집중' : '수집 데이터 AI 분석중');
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            const apiScanJobId = activeApiScanJobId.current;
            if (apiAccessToken && apiScanJobId) {
              void Promise.allSettled([
                scanApi.getAnalysisSummary(apiScanJobId, { accessToken: apiAccessToken }),
                scanApi.getCandidates(apiScanJobId, { include_protected: true, page: 0, size: 100 }, { accessToken: apiAccessToken }),
              ]).then(([summaryResult, candidatesResult]) => {
                const apiSummary = summaryResult.status === 'fulfilled' ? summaryResult.value : null;
                const apiCandidates = candidatesResult.status === 'fulfilled' ? candidatesResult.value.content ?? [] : [];
                const nextSummary = buildApiScanSummary({
                  candidates: apiCandidates,
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
  }, [homeScanNotice, permissions.alarm, settingsToggles.scanComplete]);

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
        setHomeScanNotice('none');
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
            setDeleteJobStatus('failed');
            setDeleteStatusText('정리 작업이 완료되지 못했어요');
            showToast('휴지통 이동이 실패했어요. 잠시 후 다시 시도해주세요', undefined, 3600);
            if (screenRef.current === 'deleteProcessing') {
              replace('selectedReview');
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
      }, 2500);

      return () => {
        cancelled = true;
        if (timer) {
          clearInterval(timer);
        }
      };
    }

    const timer = setInterval(() => {
      setDeleteProgress((value) => {
        const next = Math.min(100, value + 4);
        if (next >= 100) {
          clearInterval(timer);
          setDeleteJobStatus('completed');
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
            setHomeScanNotice('none');
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
  }, [deleteJobStatus]);

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
    const activeScanResult = lastScan?.result ?? scanResultRef.current;
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
    const duplicateDriveItems = activeScanResult.driveItems.filter((item) => similarDuplicateDriveIds.has(item.id) || item.desc?.includes('중복'));
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
    const remainingAfterCleanup = apiHomeSummary?.storage_summary?.latest_remaining_drive_bytes
      ? formatBytes(apiHomeSummary.storage_summary.latest_remaining_drive_bytes)
      : activeScanResult.totalSizeLabel === '0MB' ? '2.6GB' : '4.7GB';
    const homeRemainingDriveLabel = apiHomeSummary?.storage_summary?.latest_remaining_drive_bytes
      ? formatBytes(apiHomeSummary.storage_summary.latest_remaining_drive_bytes)
      : '2.6GB';
    const homeDriveTotalGB = 15;
    const homeDriveRemainingGB = 2.6;
    const homeDriveUsagePercent = Math.round(((homeDriveTotalGB - homeDriveRemainingGB) / homeDriveTotalGB) * 100);
    const cleanupDriveTotalGB = 15;
    const cleanupRemainingGB = sizeLabelToMB(remainingAfterCleanup) / 1024;
    const cleanupReclaimedGB = selectedTotalSizeMB / 1024;
    const cleanupCurrentUsedGB = Math.max(0, cleanupDriveTotalGB - cleanupRemainingGB - cleanupReclaimedGB);
    const cleanupCurrentUsedPercent = Math.min(100, Math.max(0, (cleanupCurrentUsedGB / cleanupDriveTotalGB) * 100));
    const cleanupReclaimedPercent = Math.min(100 - cleanupCurrentUsedPercent, Math.max(0, (cleanupReclaimedGB / cleanupDriveTotalGB) * 100));
    const checkedCleanupSizeLabel = selectedTotalSizeLabel;
    const homeScanStatusTitle =
      homeScanNotice === 'completed' ? '스캔이 완료됐어요' : homeScanNotice === 'cancelled' ? '스캔이 중단됐어요' : '스캔 진행 중';
    const homeScanStatusDesc =
      homeScanNotice === 'completed'
        ? `${scanSourceLabelRef.current} · 정리 후보 ${activeScanResult.candidateCount}개`
        : homeScanNotice === 'cancelled'
          ? '다시 스캔하면 새로 분석을 시작해요.'
          : `${scanSourceLabelRef.current} · ${scanProgress}%`;

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
            setPermissions={setPermissions}
            onServicePermissionChange={syncUserPermissions}
            requestPushPermission={requestPushPermission}
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
            <RevealIn duration={skipConnectedAnimation ? 0 : 180} distance={skipConnectedAnimation ? 0 : 4}>
              <Text style={styles.centerTitle}>모든 서비스가 연결됐어요</Text>
            </RevealIn>
            <ConnectedInfoRow service="gmail" title="Gmail" status={permissions.gmail ? '연결됨' : '연결안됨'} visible={connectedStep >= 1} />
            <ConnectedInfoRow service="drive" title="Drive" status={permissions.drive ? '연결됨' : '연결안됨'} visible={connectedStep >= 2} />
            <RevealIn style={styles.connectedButtonReveal} duration={skipConnectedAnimation ? 0 : 180} distance={skipConnectedAnimation ? 0 : 4}>
              <PrimaryButton title="AURA 둘러보기" onPress={() => go('onboardingIntro')} inline />
            </RevealIn>
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
              <Text style={[styles.centerBody, styles.onboardingDescriptionText]}>정리한 클라우드 용량을 스캔별 그래프로 확인해요.</Text>
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
        return (
          <ScreenShell title="홈" titleIcon="home" hideBack tightBottom hideFloatingScan={homeScanNotice === 'completed'}>
            <Card tint style={styles.capacityCard}>
              <View style={styles.capacityCardRow}>
                <View style={styles.infoMain}>
                  <Text style={styles.cardLabel}>남은 용량</Text>
                  <Text style={styles.bigNumber}>{homeRemainingDriveLabel}</Text>
                </View>
                <View style={styles.capacityUsageBox}>
                  <Text style={styles.capacityUsageText}>{homeDriveUsagePercent}% 사용</Text>
                  <View style={styles.capacityUsageTrack}>
                    <View style={[styles.capacityUsageFill, { width: `${homeDriveUsagePercent}%` }]} />
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
                        <Text style={styles.homeSummaryValue}>{selectedTotalSizeLabel}</Text>
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
            {homeScanNotice !== 'none' ? (
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
                <Text style={styles.recentHeroSizeValue}>{selectedTotalSizeLabel}</Text>
              </View>
              <Text style={styles.infoDesc}>{lastScan.sourceLabel}</Text>
              <View style={styles.thinDivider} />
              <View style={styles.rowBetween}>
                <Text style={[styles.cardLabel, styles.textStrong]}>정리 후보</Text>
                <Text style={styles.rowRight}>{selectedCandidateCount}개</Text>
              </View>
            </View>
            <SectionTitle>분류별 결과</SectionTitle>
            <RecentResultRow
              title="광고·프로모션 메일"
              value={`${promoMailCount}개\n${formatDataSize(sumScanItemSize(promoMailItems))}`}
            />
            <RecentResultRow
              title="오래된 메일"
              value={`${oldMailCount}개\n${formatDataSize(sumScanItemSize(oldMailItems))}`}
            />
            <RecentResultRow
              title="오래된 파일"
              value={`${oldDriveItems.length}개\n${formatDataSize(sumScanItemSize(oldDriveItems))}`}
            />
            <RecentResultRow
              title="중복 파일"
              value={`${duplicateDriveItems.length}개\n${formatDataSize(sumScanItemSize(duplicateDriveItems))}`}
            />
            <RecentResultRow
              title="대용량 파일"
              value={`${largeOnlyDriveItems.length}개\n${formatDataSize(sumScanItemSize(largeOnlyDriveItems))}`}
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
              checked={scanSources.folder && Boolean(selectedDriveFolders.length || selectedDriveFiles.length)}
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
                  void saveApiScanSettings();
                  resetSettingsScanFlowNavigation();
                  setScanSourceEditOnly(false);
                  replace('defaultScan');
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
                      desc={folder.meta ? formatFolderMeta(folder.meta) : undefined}
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
              months={lastOpenedBeforeMonths}
              onPress={() => openPeriodMonthSheet('opened')}
            />
            <MonthConditionRow
              title="마지막 수정일"
              months={lastModifiedBeforeMonths}
              onPress={() => openPeriodMonthSheet('modified')}
            />
            <PrimaryButton
              title={periodEditOnly ? '기간 조건 저장' : '기간 조건 저장 후 스캔하기'}
              onPress={
                periodEditOnly
                  ? () => {
                      void saveApiScanSettings();
                      resetSettingsScanFlowNavigation();
                      setPeriodEditOnly(false);
                      replace('defaultScan');
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
              months={lastOpenedBeforeMonths}
              onPress={() => openPeriodMonthSheet('opened')}
            />
            <MonthConditionRow
              title="마지막 수정일"
              months={lastModifiedBeforeMonths}
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
                <ProgressCircle progress={scanProgress} />
                <Text style={styles.scanFullStatusText}>{scanStatusText}</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${scanProgress}%` }]} />
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
              <View style={styles.scanProgressSpacer} />
              <OutlineButton title="취소하기" onPress={cancelScan} />
              <PrimaryButton title="홈으로 이동" onPress={() => replace('home')} inline />
            </View>
          </ScreenShell>
        );

      case 'candidateSummary':
        return (
          <ScreenShell title="분석 결과 요약" disableScroll>
            <View style={styles.resultMetricGrid}>
              <ResultMetricCard label="정리 후보" value={`${selectedCandidateCount}개`} />
              <ResultMetricCard label="예상 확보" value={selectedTotalSizeLabel} />
            </View>
            <ResultCategoryCard
              title="광고·프로모션 메일"
              desc={`${promoMailCount}개 · ${formatDataSize(sumScanItemSize(promoMailItems))}`}
              onPress={() => {
                setMailListMode('promo');
                go('mailList');
              }}
            />
            <ResultCategoryCard
              title="오래된 메일"
              desc={`${oldMailCount}개 · ${formatDataSize(sumScanItemSize(oldMailItems))}`}
              onPress={() => {
                setMailListMode('old');
                go('mailList');
              }}
            />
            <ResultCategoryCard
              title="오래된 파일"
              desc={`${oldDriveItems.length}개 · ${formatDataSize(sumScanItemSize(oldDriveItems))}`}
              onPress={() => {
                setDriveListMode('old');
                go('driveList');
              }}
            />
            <ResultCategoryCard
              title="중복 파일"
              desc={`${duplicateDriveItems.length}개 · ${formatDataSize(sumScanItemSize(duplicateDriveItems))}`}
              warning={duplicateDeselectedCount ? `미선택 ${duplicateDeselectedCount}개` : undefined}
              onPress={() => {
                setDriveListMode('duplicate');
                go('driveList');
              }}
            />
            <ResultCategoryCard
              title="대용량 파일"
              desc={`${largeOnlyDriveItems.length}개 · ${formatDataSize(sumScanItemSize(largeOnlyDriveItems))}`}
              onPress={() => go('largeList')}
            />
            <Pressable onPress={() => activeScanResult.protectedItems.length ? go('protectedList') : showToast('제외 키워드로 보호된 항목이 없어요')}>
              <Text style={styles.resultGuideText}>제외 키워드로 보호된 대상을 확인하세요</Text>
            </Pressable>
            <PrimaryButton title="다음" onPress={() => go('selectedReview')} inline />
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
          />
        );

      case 'fileDetail':
        return (
          <ScanItemDetailScreen
            title="파일 상세"
            item={selectedScanItem ?? activeScanResult.driveItems[0] ?? activeScanResult.largeItems[0]}
            kind="drive"
            apiAccessToken={apiAccessToken}
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
          <ScreenShell title="삭제 진행" disableScroll>
            <ProgressCircle progress={deleteProgress} />
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
            <Text style={styles.progressLabel}>전체 삭제 진행</Text>
            <Text style={styles.infoDesc}>{deleteStatusText}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${deleteProgress}%` }]} />
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
              <Text style={styles.cleanupDriveTotalLabel}>{cleanupDriveTotalGB}GB</Text>
            </Card>
            <View style={styles.cleanupButtonSpacer} />
            <View style={styles.twoButtons}>
              <OutlineButton title="스캔 이력 보기" half onPress={() => {
                setAnalysisHistoryReturnTarget('cleanupComplete');
                go('analysisHistory');
              }} />
              <OutlineButton title="휴지통으로 이동" half onPress={() => replace('storageTrash')} />
            </View>
            <PrimaryButton title="홈 화면 돌아가기" onPress={() => replace('home')} />
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
            apiAccessToken={apiAccessToken}
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
          />
        );

      case 'storageDetail':
        return (
          <StorageDetailScreen item={selectedStorageDetail} apiAccessToken={apiAccessToken} />
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
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>U</Text>
              </View>
              <View style={styles.infoMain}>
                <Text style={styles.profileConnectionText}>{currentUser?.name ?? 'AURA 사용자'}</Text>
                <Text style={styles.infoTitleLarge}>{currentUser?.email ?? 'user@gmail.com'}</Text>
              </View>
            </View>

            <SectionTitle>연결된 서비스</SectionTitle>
            <View style={styles.groupCard}>
              <ServiceLinkRow service="gmail" title="Gmail" connected={permissions.gmail} onPress={() => void requestGoogleReconnect(['GMAIL'])} />
              <View style={styles.thinDivider} />
              <ServiceLinkRow service="drive" title="Google Drive" connected={permissions.drive} onPress={() => void requestGoogleReconnect(['DRIVE'])} />
            </View>

            <OutlineButton title="Google 권한 다시 확인" onPress={() => void refreshGooglePermissions()} />
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
              desc={scanSources.gmail && scanSources.drive ? 'Gmail + Drive' : scanSources.gmail ? 'Gmail' : scanSources.drive ? 'Drive' : '선택된 서비스 없음'}
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
            <PrimaryButton title="기본 조건 저장" onPress={back} />
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
                  <View style={styles.thinDivider} />
                  <View style={styles.settingPlainRow}>
                    <View style={styles.infoMain}>
                      <Text style={styles.infoTitle}>저장소 항목</Text>
                    </View>
                    <Text style={styles.rowRight}>{formatUnknownValue(privacyData?.managed_data_summary?.scanned_item_count)}</Text>
                  </View>
                  <View style={styles.thinDivider} />
                  <View style={styles.settingPlainRow}>
                    <View style={styles.infoMain}>
                      <Text style={styles.infoTitle}>데이터 정책</Text>
                    </View>
                    <Text style={styles.rowRight}>
                      {privacyData?.data_retention
                        ? `스캔 ${privacyData.data_retention.scan_data_policy ?? '-'} / 기록 ${privacyData.data_retention.history_data_policy ?? '-'}`
                        : '-'}
                    </Text>
                  </View>
                  <View style={styles.thinDivider} />
                  <View style={styles.settingPlainRow}>
                    <View style={styles.infoMain}>
                      <Text style={styles.infoTitle}>동의 버전</Text>
                    </View>
                    <Text style={styles.rowRight}>{privacyData?.consents?.consent_version ?? '-'}</Text>
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
          <ScreenShell title="스캔 이력" titleIcon="history" hideBack tightBottom disableScroll>
            {lastScan ? (
              <>
                <View style={styles.carbonTotalCard}>
                  <View>
                    <Text style={styles.cardLabel}>전체 누적 삭제 용량</Text>
                    <Text style={styles.carbonTotalValue}>{checkedCleanupSizeLabel}</Text>
                  </View>
                  <View style={styles.monthCarbonPill}>
                    <Text style={styles.monthCarbonText}>이번 달 +{checkedCleanupSizeLabel}</Text>
                  </View>
                </View>
                <SectionTitle>스캔별 확보 용량 현황</SectionTitle>
                <CarbonStatsGraph sizeLabel={checkedCleanupSizeLabel} />
                <View style={styles.rowBetween}>
                  <SectionTitle>최근 정리 기록</SectionTitle>
                  <Pressable onPress={() => go('analysisHistoryAll')} hitSlop={8}>
                    <Text style={styles.rowRight}>전체 보기</Text>
                  </Pressable>
                </View>
                {selectedCandidateCount ? (
                  <View style={styles.recentCleanupCard}>
                    <View style={styles.recentCleanupTopRow}>
                      <View style={styles.infoMain}>
                        <Text style={styles.infoTitle}>{lastScan.dateLabel}</Text>
                        <Text style={styles.infoDesc}>Gmail {selectedMailCleanupCount}개 · Drive {selectedDriveCleanupCount}개</Text>
                      </View>
                      <Text style={styles.recentCleanupSizeValue}>{checkedCleanupSizeLabel}</Text>
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
            {lastScan ? (
              <>
                <View style={styles.recentCleanupCard}>
                  <View style={styles.recentCleanupTopRow}>
                    <View style={styles.infoMain}>
                      <Text style={styles.infoTitle}>{lastScan.dateLabel}</Text>
                      <Text style={styles.infoDesc}>Gmail {selectedMailCleanupCount}개 · Drive {selectedDriveCleanupCount}개</Text>
                    </View>
                    <Text style={styles.recentCleanupSizeValue}>{checkedCleanupSizeLabel}</Text>
                  </View>
                </View>
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
          connectedInstant: screen === 'connected' && skipConnectedAnimation,
          scanResultPending: homeScanNotice === 'completed' || homeScanNotice === 'running',
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

function ScreenShell({
  title,
  subtitle,
  children,
  noNav,
  compactTop,
  onBack,
  closeIcon,
  hideBack,
  tightBottom,
  titleIcon,
  disableScroll,
  hideFloatingScan,
  floatingAction,
  tintBackground,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  noNav?: boolean;
  compactTop?: boolean;
  onBack?: () => void;
  closeIcon?: boolean;
  hideBack?: boolean;
  tightBottom?: boolean;
  titleIcon?: MainTab;
  disableScroll?: boolean;
  hideFloatingScan?: boolean;
  floatingAction?: FloatingAction | FloatingAction[];
  tintBackground?: boolean;
}) {
  const navigation = useContext(NavigationContext);
  const handleBack = hideBack ? undefined : onBack ?? navigation?.back;
  const floatingActions = floatingAction ? (Array.isArray(floatingAction) ? floatingAction : [floatingAction]) : [];
  const shouldShowFloatingScan =
    !noNav &&
    !hideFloatingScan &&
    floatingActions.length === 0 &&
    !navigation?.scanResultPending &&
    navigation?.currentTab !== 'settings' &&
    !scanFlowScreens.has(navigation?.current ?? 'initial');

  return (
    <View style={[styles.shell, tintBackground && styles.shellTint]}>
      {title ? (
        <View style={[styles.header, hideBack && styles.headerNoBack]}>
          <DeviceStatusBar compact />
          <View style={[styles.headerTitleRow, hideBack && styles.headerTitleRowNoBack, !subtitle && styles.headerTitleRowSingle]}>
            {handleBack ? (
              <Pressable style={styles.backButton} onPress={handleBack}>
                <Text style={styles.backGlyph}>{closeIcon ? '×' : '‹'}</Text>
              </Pressable>
            ) : hideBack ? null : (
              <View style={styles.backButton} />
            )}
            <View style={styles.headerText}>
              <View style={styles.headerTitleContent}>
                {titleIcon ? (
                  <View style={styles.headerTitleIcon}>
                    <NavIcon type={titleIcon} active />
                  </View>
                ) : null}
                <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>{title}</Text>
              </View>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
          </View>
          <View style={styles.headerInsetRule} />
        </View>
      ) : (
        <DeviceStatusBar />
      )}
      {disableScroll ? (
        <View
          style={[
            styles.content,
            styles.contentInner,
            compactTop && styles.contentInnerCompact,
            tightBottom && styles.contentInnerTightBottom,
          ]}
        >
          {children}
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.contentInner,
            compactTop && styles.contentInnerCompact,
            tightBottom && styles.contentInnerTightBottom,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          overScrollMode="never"
        >
          {children}
        </ScrollView>
      )}
      {floatingActions.map((action, index) => (
        <FloatingScanButton
          key={`${action.variant}-${index}`}
          variant={action.variant}
          onPress={action.onPress}
          small={action.small}
          offsetIndex={floatingActions.length - index - 1}
        />
      ))}
      {shouldShowFloatingScan ? <FloatingScanButton /> : null}
      {!noNav ? <BottomNav /> : null}
    </View>
  );
}

function DeviceStatusBar({ compact }: { compact?: boolean }) {
  return <View style={compact ? styles.statusBarRow : styles.statusOnly} />;
}

function BottomNav() {
  const navigation = useContext(NavigationContext);
  const current = navigation?.current ?? 'home';
  const currentTab = navigation?.currentTab ?? getMainTabForScreen(current);

  return (
    <View style={styles.bottomNav}>
      <NavButton label="홈" type="home" active={currentTab === 'home'} onPress={() => navigation?.navigateTab('home')} />
      <NavButton label="정리함" type="storage" active={currentTab === 'storage'} onPress={() => navigation?.navigateTab('storage')} />
      <NavButton label="휴지통" type="trash" active={currentTab === 'trash'} onPress={() => navigation?.navigateTab('trash')} />
      <NavButton label="스캔 이력" type="history" active={currentTab === 'history'} onPress={() => navigation?.navigateTab('history')} />
      <NavButton label="설정" type="settings" active={currentTab === 'settings'} onPress={() => navigation?.navigateTab('settings')} />
    </View>
  );
}

function NavButton({
  label,
  type,
  active,
  onPress,
}: {
  label: string;
  type: MainTab;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.navButton} onPress={onPress}>
      <NavIcon type={type} active={Boolean(active)} />
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function FloatingScanButton({
  variant = 'scan',
  onPress,
  small,
  offsetIndex = 0,
}: {
  variant?: FloatingButtonVariant;
  onPress?: () => void;
  small?: boolean;
  offsetIndex?: number;
}) {
  const navigation = useContext(NavigationContext);
  const isTrash = variant === 'trash';
  const isDelete = variant === 'delete';
  const isRestore = variant === 'restore';

  return (
    <Pressable
      style={[
        styles.floatingScanButton,
        { bottom: 78 + offsetIndex * 64 },
        small && styles.floatingSmallButton,
        isDelete && styles.floatingDeleteButton,
        isTrash && styles.floatingTrashButton,
        isRestore && styles.floatingRestoreButton,
      ]}
      onPress={onPress ?? (() => navigation?.navigate('scanFlowSource'))}
    >
      {isRestore ? (
        <FontAwesome5 name="undo-alt" size={small ? 18 : 22} color={mutedText} />
      ) : null}
      {isTrash || isDelete ? (
        <TrashOutlineIcon danger={isTrash} muted={isDelete} compact />
      ) : !isRestore ? (
        <AntDesign name="scan" size={30} color={navy} />
      ) : null}
    </Pressable>
  );
}

function NavIcon({ type, active }: { type: MainTab; active: boolean }) {
  const iconName: Record<MainTab, FontAwesome5Name> = {
    home: 'home',
    storage: 'archive',
    trash: 'trash-alt',
    history: 'chart-line',
    settings: 'cog',
  };

  return (
    <View style={styles.navIconFrame}>
      <FontAwesome5 name={iconName[type]} size={23} color={active ? navy : mutedText} solid />
    </View>
  );
}

function Logo({ large, medium }: { large?: boolean; medium?: boolean }) {
  return (
    <Image source={auraLogo} style={[styles.logoImage, medium && styles.logoImageMedium, large && styles.logoImageLarge]} resizeMode="contain" />
  );
}

function AuraGradientWord({ size = 27 }: { size?: number }) {
  const gradientId = useRef(`auraGradientText-${Math.random().toString(36).slice(2)}`).current;
  const width = size * 3.25;
  const height = size + 10;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <SvgLinearGradient id={gradientId} x1="0" y1="0" x2={width} y2="0">
          <Stop offset="0" stopColor="#35C878" />
          <Stop offset="0.52" stopColor="#8DECA8" />
          <Stop offset="1" stopColor="#3FBF75" />
        </SvgLinearGradient>
      </Defs>
      <SvgText
        x={width / 2}
        y={size + 1}
        fill={`url(#${gradientId})`}
        fontSize={size}
        fontWeight="900"
        textAnchor="middle"
      >
        AURA
      </SvgText>
    </Svg>
  );
}

function LogoRow() {
  return (
    <View style={styles.logoRow}>
      <Logo />
      <Text style={styles.logoText}>AURA</Text>
    </View>
  );
}

function Card({ children, tint, style }: { children: React.ReactNode; tint?: boolean; style?: object }) {
  return <View style={[styles.card, tint && styles.cardTint, style]}>{children}</View>;
}

function BottomSheetPanel({
  motion,
  outputRange,
  style,
  onClose,
  children,
  dragScope = 'panel',
}: {
  motion: Animated.Value;
  outputRange: [number, number];
  style: object;
  onClose: () => void;
  children: React.ReactNode;
  dragScope?: 'handle' | 'panel';
}) {
  const dragY = useRef(new Animated.Value(0)).current;
  const canStartDrag = (_: unknown, gesture: { dx: number; dy: number }) =>
    Math.abs(gesture.dy) > 6 &&
    Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.2 &&
    (dragScope === 'handle' || gesture.dy > 0);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => dragScope === 'handle',
      onMoveShouldSetPanResponder: canStartDrag,
      onMoveShouldSetPanResponderCapture: canStartDrag,
      onPanResponderMove: (_, gesture) => {
        dragY.setValue(Math.max(0, gesture.dy));
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 72 || (gesture.dy > 28 && gesture.vy > 0.95)) {
          onClose();
          return;
        }
        Animated.spring(dragY, {
          toValue: 0,
          speed: 18,
          bounciness: 5,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(dragY, {
          toValue: 0,
          speed: 18,
          bounciness: 5,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const baseTranslateY = motion.interpolate({
    inputRange: [0, 1],
    outputRange,
  });
  const translateY = Animated.add(baseTranslateY, dragY);
  const panelPanHandlers = dragScope === 'panel' ? panResponder.panHandlers : {};
  const handlePanHandlers = dragScope === 'handle' ? panResponder.panHandlers : {};

  return (
    <Animated.View style={[style, { transform: [{ translateY }] }]} {...panelPanHandlers}>
      <Pressable style={styles.modalHandleHitArea} onPress={onClose} {...handlePanHandlers}>
        <View style={styles.modalHandle} />
      </Pressable>
      {children}
    </Animated.View>
  );
}

function InfoRow({
  title,
  desc,
  right,
  onPress,
  hideChevron,
}: {
  title: string;
  desc?: string;
  right?: string;
  onPress?: () => void;
  hideChevron?: boolean;
}) {
  const Content = (
    <View style={styles.infoRow}>
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{title}</Text>
        {desc ? <Text style={styles.infoDesc}>{desc}</Text> : null}
      </View>
      {hideChevron ? null : right ? <Text style={styles.rowRight}>{right}</Text> : <Text style={styles.chevron}>›</Text>}
    </View>
  );

  return onPress ? <Pressable onPress={onPress}>{Content}</Pressable> : Content;
}

function ScanSourceCard({
  title,
  desc,
  checked,
  detail,
  onPress,
  onDetailPress,
}: {
  title: string;
  desc?: string;
  checked: boolean;
  detail?: string;
  onPress: () => void;
  onDetailPress?: () => void;
}) {
  return (
    <Pressable style={[styles.scanSourceCard, checked && styles.scanSourceCardSelected]} onPress={onPress}>
      <CheckBox checked={checked} onPress={onPress} compact />
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{title}</Text>
        {desc ? <Text style={styles.infoDesc}>{desc}</Text> : null}
      </View>
      {detail ? (
        <Pressable onPress={onDetailPress ?? onPress} hitSlop={10}>
          <Text style={styles.rowRight}>{detail} ›</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function FolderRow({
  title,
  desc,
  selected,
  canOpen,
  onPress,
  onOpen,
}: {
  title: string;
  desc?: string;
  selected: boolean;
  canOpen?: boolean;
  onPress: () => void;
  onOpen?: () => void;
}) {
  return (
    <Pressable style={[styles.folderRow, selected && styles.folderRowSelected]} onPress={onPress}>
      <CheckBox checked={selected} onPress={onPress} compact />
      <FolderOutlineIcon />
      <View style={styles.infoMain}>
        <View style={styles.folderTitleLine}>
          <Text style={styles.folderTitleText} numberOfLines={1}>{title}</Text>
          {desc ? <Text style={styles.folderSizeText}>{desc}</Text> : null}
        </View>
      </View>
      {canOpen ? (
        <Pressable style={styles.folderNavigateButton} onPress={onOpen ?? onPress} hitSlop={8}>
          <Text style={styles.folderNavigateText}>›</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function FolderOutlineIcon() {
  return (
    <View style={styles.fileIconFrame}>
      <FontAwesome5 name="folder" size={28} color={navy} />
    </View>
  );
}

function FileOutlineIcon({ type }: { type: string }) {
  const normalizedType = type.toUpperCase();
  const isImage = ['JPG', 'JPEG', 'PNG', 'SVG'].includes(normalizedType);
  const isArchive = ['ZIP', 'RAR', '7Z'].includes(normalizedType);
  const isPdf = normalizedType === 'PDF';
  const isWord = ['HWP', 'DOC', 'DOCX'].includes(normalizedType);
  const iconName: FontAwesome5Name = isImage
    ? 'file-image'
    : isArchive
      ? 'file-archive'
      : isPdf
        ? 'file-pdf'
        : isWord
          ? 'file-alt'
          : 'file';

  return (
    <View style={styles.fileIconFrame}>
      <FontAwesome5 name={iconName} size={26} color={navy} solid={isArchive} />
    </View>
  );
}

function TrashOutlineIcon({ danger, muted, compact }: { danger?: boolean; muted?: boolean; compact?: boolean }) {
  return (
    <View style={[styles.fileIconFrame, compact && styles.fileIconFrameCompact]}>
      <FontAwesome5 name="trash-alt" size={compact ? 21 : 24} color={danger ? '#D95050' : muted ? mutedText : navy} solid={danger} />
    </View>
  );
}

function KeywordBottomSheet({
  type,
  motion,
  input,
  setInput,
  keywords,
  recommended,
  onAddInput,
  onAddRecommended,
  onRemove,
  onClose,
}: {
  type: 'include' | 'exclude';
  motion: Animated.Value;
  input: string;
  setInput: (value: string) => void;
  keywords: string[];
  recommended: string[];
  onAddInput: () => void;
  onAddRecommended: (keyword: string) => void;
  onRemove: (keyword: string) => void;
  onClose: () => void;
}) {
  const isInclude = type === 'include';

  return (
    <Animated.View
      style={[
        styles.sheetOverlay,
        {
          opacity: motion.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0],
          }),
        },
      ]}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheetKeyboardAvoider}>
        <BottomSheetPanel motion={motion} outputRange={[0, 360]} style={styles.keywordSheet} onClose={onClose}>
          <Text style={styles.modalTitle}>{isInclude ? '포함 키워드 설정' : '제외 키워드 설정'}</Text>
          <Text style={[styles.infoDesc, styles.keywordSheetDesc]}>
            {isInclude ? '해당 키워드가 있는 메일을 정리 후보에 포함합니다' : '해당 키워드가 있는 메일은 정리 후보에서 보호합니다'}
          </Text>
          <View style={styles.inputRow}>
            <TextInput value={input} onChangeText={setInput} placeholder="키워드 입력" placeholderTextColor={mutedText} style={styles.input} />
            <Pressable style={styles.addButton} onPress={onAddInput}>
              <Text style={styles.addButtonText}>추가</Text>
            </Pressable>
          </View>
          <SectionTitle>현재 키워드</SectionTitle>
          <View style={styles.chipWrap}>
            {keywords.map((keyword) => (
              <Chip key={keyword} label={keyword} removable onRemove={() => onRemove(keyword)} />
            ))}
          </View>
          <SectionTitle>추천 키워드</SectionTitle>
          <View style={styles.chipWrap}>
            {recommended.map((keyword) => (
              <Pressable key={keyword} style={styles.recommendChip} onPress={() => onAddRecommended(keyword)}>
                <Text style={styles.recommendChipText}>+ {keyword}</Text>
              </Pressable>
            ))}
          </View>
          <PrimaryButton title={isInclude ? '포함 키워드 적용' : '제외 키워드 적용'} onPress={onClose} inline />
        </BottomSheetPanel>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

function PeriodMonthSheet({
  type,
  motion,
  months,
  onChange,
  onClose,
}: {
  type: 'opened' | 'modified';
  motion: Animated.Value;
  months: number;
  onChange: (value: number) => void;
  onClose: () => void;
}) {
  const [draftMonths, setDraftMonths] = useState(months);
  const [yearText, setYearText] = useState(`${Math.floor(months / 12)}`);
  const [monthText, setMonthText] = useState(`${months % 12}`);
  const title = type === 'opened' ? '마지막으로 연 날짜' : '마지막 수정일';
  const onlyNumber = (value: string) => value.replace(/[^0-9]/g, '');
  const clampMonths = (value: number) => Math.max(1, Math.min(120, value));
  const syncDraft = (value: number, commit = false) => {
    const nextValue = clampMonths(value);
    setDraftMonths(nextValue);
    setYearText(`${Math.floor(nextValue / 12)}`);
    setMonthText(`${nextValue % 12}`);
    if (commit) {
      onChange(nextValue);
    }
  };
  const commitTypedValue = () => {
    const years = Number.parseInt(yearText, 10) || 0;
    const restMonths = Number.parseInt(monthText, 10) || 0;
    syncDraft(years * 12 + Math.min(11, restMonths), true);
  };
  const applyValue = () => {
    const years = Number.parseInt(yearText, 10) || 0;
    const restMonths = Number.parseInt(monthText, 10) || 0;
    const nextValue = clampMonths(years * 12 + Math.min(11, restMonths));
    onChange(nextValue);
    onClose();
  };

  useEffect(() => {
    syncDraft(months);
  }, [months]);

  return (
    <Animated.View
      style={[
        styles.sheetOverlay,
        {
          opacity: motion.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0],
          }),
        },
      ]}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheetKeyboardAvoider}>
        <BottomSheetPanel motion={motion} outputRange={[0, 340]} style={styles.periodMonthSheet} onClose={onClose}>
          <Text style={styles.modalTitle}>{title}</Text>
          <View style={styles.periodMonthControl}>
            <Pressable style={styles.monthStepButton} onPress={() => syncDraft(draftMonths - 1, true)}>
              <Text style={styles.monthStepText}>-</Text>
            </Pressable>
            <View style={styles.periodMonthInputGroup}>
              <TextInput
                style={styles.periodMonthInput}
                value={yearText}
                onChangeText={(value) => setYearText(onlyNumber(value).slice(0, 2))}
                onBlur={commitTypedValue}
                keyboardType="number-pad"
                maxLength={2}
                selectTextOnFocus
              />
              <Text style={styles.periodUnit}>년</Text>
              <TextInput
                style={styles.periodMonthInput}
                value={monthText}
                onChangeText={(value) => setMonthText(onlyNumber(value).slice(0, 2))}
                onBlur={commitTypedValue}
                keyboardType="number-pad"
                maxLength={2}
                selectTextOnFocus
              />
              <Text style={styles.periodUnit}>개월</Text>
            </View>
            <Pressable style={styles.monthStepButton} onPress={() => syncDraft(draftMonths + 1, true)}>
              <Text style={styles.monthStepText}>+</Text>
            </Pressable>
          </View>
          <PrimaryButton title="기간 조건 적용" onPress={applyValue} inline />
        </BottomSheetPanel>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

function YearRangeSheet({
  type,
  motion,
  range,
  setRange,
  onClose,
}: {
  type: 'opened' | 'modified';
  motion: Animated.Value;
  range: MonthRange;
  setRange: React.Dispatch<React.SetStateAction<MonthRange>>;
  onClose: () => void;
}) {
  const isOpened = type === 'opened';
  const fromParts = getMonthParts(range.from);
  const toParts = getMonthParts(range.to);
  const [fromYearText, setFromYearText] = useState(`${fromParts.year}`);
  const [fromMonthText, setFromMonthText] = useState(`${fromParts.month}`);
  const [toYearText, setToYearText] = useState(`${toParts.year}`);
  const [toMonthText, setToMonthText] = useState(`${toParts.month}`);

  useEffect(() => {
    const nextFrom = getMonthParts(range.from);
    const nextTo = getMonthParts(range.to);
    setFromYearText(`${nextFrom.year}`);
    setFromMonthText(`${nextFrom.month}`.padStart(2, '0'));
    setToYearText(`${nextTo.year}`);
    setToMonthText(`${nextTo.month}`.padStart(2, '0'));
  }, [range.from, range.to]);

  const onlyNumber = (value: string) => value.replace(/[^0-9]/g, '');
  const commitTypedRange = () => {
    const minParts = getMonthParts(minScanMonthIndex);
    const maxParts = getMonthParts(maxScanMonthIndex);
    const fromYear = Math.max(minParts.year, Math.min(maxParts.year, Number(fromYearText) || fromParts.year));
    const fromMonth = Math.max(1, Math.min(12, Number(fromMonthText) || fromParts.month));
    const toYear = Math.max(minParts.year, Math.min(maxParts.year, Number(toYearText) || toParts.year));
    const toMonth = Math.max(1, Math.min(12, Number(toMonthText) || toParts.month));
    const fromIndex = clampScanMonth(toMonthIndex(fromYear, fromMonth));
    const toIndex = clampScanMonth(toMonthIndex(toYear, toMonth));

    setRange({
      from: Math.min(fromIndex, toIndex),
      to: Math.max(fromIndex, toIndex),
    });
  };

  return (
    <Animated.View
      style={[
        styles.sheetOverlay,
        {
          opacity: motion.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0],
          }),
        },
      ]}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <BottomSheetPanel motion={motion} outputRange={[0, 360]} style={styles.keywordSheet} onClose={onClose}>
        <Text style={styles.modalTitle}>{isOpened ? '마지막으로 연 날짜' : '마지막 수정일'}</Text>
        <Text style={styles.infoDesc}>직접 입력하거나 아래 바를 월 단위로 드래그해서 설정하세요.</Text>
        <View style={styles.yearRangeSummary}>
          <Text style={styles.yearRangeLabel}>선택 범위</Text>
          <Text style={styles.yearRangeValue}>{formatMonthLabel(range.from)}부터</Text>
          <Text style={styles.yearRangeValue}>{formatMonthLabel(range.to)}까지</Text>
        </View>
        <View style={styles.periodInputPanel}>
          <Text style={styles.yearRangeLabel}>직접 입력</Text>
          <View style={styles.periodInputLine}>
            <Text style={styles.periodInputLabel}>시작</Text>
            <TextInput
              value={fromYearText}
              onChangeText={(value) => setFromYearText(onlyNumber(value).slice(0, 4))}
              onBlur={commitTypedRange}
              keyboardType="number-pad"
              style={styles.periodSmallInput}
            />
            <Text style={styles.periodUnit}>년</Text>
            <TextInput
              value={fromMonthText}
              onChangeText={(value) => setFromMonthText(onlyNumber(value).slice(0, 2))}
              onBlur={commitTypedRange}
              keyboardType="number-pad"
              style={styles.periodTinyInput}
            />
            <Text style={styles.periodUnit}>월</Text>
          </View>
          <View style={styles.periodInputLine}>
            <Text style={styles.periodInputLabel}>끝</Text>
            <TextInput
              value={toYearText}
              onChangeText={(value) => setToYearText(onlyNumber(value).slice(0, 4))}
              onBlur={commitTypedRange}
              keyboardType="number-pad"
              style={styles.periodSmallInput}
            />
            <Text style={styles.periodUnit}>년</Text>
            <TextInput
              value={toMonthText}
              onChangeText={(value) => setToMonthText(onlyNumber(value).slice(0, 2))}
              onBlur={commitTypedRange}
              keyboardType="number-pad"
              style={styles.periodTinyInput}
            />
            <Text style={styles.periodUnit}>월</Text>
          </View>
        </View>
        <YearRangeSlider range={range} setRange={setRange} />
        <PrimaryButton
          title="기간 조건 적용"
          onPress={() => {
            commitTypedRange();
            onClose();
          }}
          inline
        />
      </BottomSheetPanel>
    </Animated.View>
  );
}

function FilterSortSheet({
  motion,
  date,
  size,
  sort,
  setDate,
  setSize,
  setSort,
  onClose,
}: {
  motion: Animated.Value;
  date: string;
  size: string;
  sort: string;
  setDate: (value: string) => void;
  setSize: (value: string) => void;
  setSort: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <Animated.View
      style={[
        styles.sheetOverlay,
        {
          opacity: motion.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0],
          }),
        },
      ]}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <BottomSheetPanel motion={motion} outputRange={[0, 420]} style={styles.filterSheet} onClose={onClose}>
        <Text style={styles.modalTitle}>필터 및 정렬</Text>
        <Text style={styles.infoDesc}>날짜와 용량 조건을 적용하고 목록 순서를 바꿀 수 있어요.</Text>
        <Text style={styles.filterSectionTitle}>날짜 필터</Text>
        <View style={styles.chipWrap}>
          {['전체 기간', '1년 이상', '3년 이상', '5년 이상'].map((item) => (
            <Chip key={item} label={item} selected={date === item} onPress={() => setDate(item)} />
          ))}
        </View>
        <Text style={styles.filterSectionTitle}>용량 필터</Text>
        <View style={styles.chipWrap}>
          {['전체 용량', '100MB 이상', '500MB 이상', '1GB 이상'].map((item) => (
            <Chip key={item} label={item} selected={size === item} onPress={() => setSize(item)} />
          ))}
        </View>
        <Text style={styles.filterSectionTitle}>정렬</Text>
        <View style={styles.chipWrap}>
          {['날짜순', '용량순', '발신자순', '이름순'].map((item) => (
            <Chip key={item} label={item} selected={sort === item} onPress={() => setSort(item)} />
          ))}
        </View>
        <PrimaryButton title="필터 적용하기" onPress={onClose} inline />
      </BottomSheetPanel>
    </Animated.View>
  );
}

function YearRangeSlider({ range, setRange }: { range: MonthRange; setRange: React.Dispatch<React.SetStateAction<MonthRange>> }) {
  const trackWidth = 226;
  const monthStep = trackWidth / (maxScanMonthIndex - minScanMonthIndex);
  const rangeRef = useRef(range);
  const startFrom = useRef(range.from);
  const startTo = useRef(range.to);
  const left = ((range.from - minScanMonthIndex) / (maxScanMonthIndex - minScanMonthIndex)) * trackWidth;
  const right = ((range.to - minScanMonthIndex) / (maxScanMonthIndex - minScanMonthIndex)) * trackWidth;

  useEffect(() => {
    rangeRef.current = range;
  }, [range]);

  const fromResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startFrom.current = rangeRef.current.from;
      },
      onPanResponderMove: (_, gesture) => {
        const next = clampScanMonth(startFrom.current + Math.round(gesture.dx / monthStep));
        setRange((items) => {
          const updated = { ...items, from: Math.min(next, items.to) };
          rangeRef.current = updated;
          return updated;
        });
      },
    })
  ).current;

  const toResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startTo.current = rangeRef.current.to;
      },
      onPanResponderMove: (_, gesture) => {
        const next = clampScanMonth(startTo.current + Math.round(gesture.dx / monthStep));
        setRange((items) => {
          const updated = { ...items, to: Math.max(next, items.from) };
          rangeRef.current = updated;
          return updated;
        });
      },
    })
  ).current;

  return (
    <View style={styles.yearSliderWrap}>
      <View style={styles.yearSliderTrack}>
        <View style={[styles.yearSliderSelected, { left, width: Math.max(0, right - left) }]} />
        <View
          style={[styles.yearHandle, { left: left - 22 }]}
          {...fromResponder.panHandlers}
        >
          <Text style={styles.yearHandleText}>{formatMonthShortLabel(range.from)}</Text>
        </View>
        <View
          style={[styles.yearHandle, { left: right - 22 }]}
          {...toResponder.panHandlers}
        >
          <Text style={styles.yearHandleText}>{formatMonthShortLabel(range.to)}</Text>
        </View>
      </View>
      <View style={styles.yearTickRow}>
        {[toMonthIndex(2018, 1), toMonthIndex(2020, 1), toMonthIndex(2022, 1), toMonthIndex(2024, 1), toMonthIndex(2026, 7)].map((month) => (
          <Text key={month} style={styles.yearTickText}>{formatMonthShortLabel(month)}</Text>
        ))}
      </View>
      <Text style={styles.helperText}>파란 원을 누른 채 좌우로 움직이면 월 단위로 날짜가 바뀌어요.</Text>
    </View>
  );
}

function MonthConditionRow({
  title,
  months,
  onPress,
}: {
  title: string;
  months: number;
  onPress: () => void;
}) {
  const periodText = `${formatMonthDuration(months)} 이상`;
  return (
    <Pressable style={styles.monthConditionRow} onPress={onPress}>
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoDesc}>{periodText}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function PermissionRow({
  title,
  desc,
  checked,
  onPress,
  onDetailPress,
}: {
  title: string;
  desc?: string;
  checked: boolean;
  onPress: () => void;
  onDetailPress?: () => void;
}) {
  return (
    <Pressable style={styles.permissionRow} onPress={onPress}>
      <CheckBox checked={checked} onPress={onPress} />
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{title}</Text>
        {desc ? <Text style={styles.infoDesc}>{desc}</Text> : null}
      </View>
      {onDetailPress ? (
        <Pressable
          style={styles.permissionDetailButton}
          onPress={(event) => {
            event.stopPropagation?.();
            onDetailPress();
          }}
        >
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function PushNotificationPermissionContent() {
  const sections = [
    {
      title: 'AURA가 보내는 알림',
      items: ['백그라운드 스캔 완료 안내', '정리 후보가 준비되었을 때의 알림'],
    },
    {
      title: '알림에서 제외되는 내용',
      items: ['메일과 파일의 원문 내용은 AI에게 전달되지 않아요.', '광고성 알림은 보내지 않아요.', '알림 설정은 언제든 변경할 수 있어요.'],
    },
  ];

  return (
    <Card style={[styles.permissionReasonCard, styles.pushPermissionReasonCard]}>
      <SectionTitle>권한을 요청하는 이유</SectionTitle>
      <Text style={styles.permissionReasonDescription}>
        AURA는 사용자가 앱을 닫아도 정리 진행 상태를{'\n'}놓치지 않도록 알림을 보냅니다.
      </Text>
      {sections.map((section) => (
        <View key={section.title} style={styles.permissionReasonSection}>
          <Text style={styles.permissionReasonTitle}>{section.title}</Text>
          {section.items.map((item) => (
            <Text key={item} style={styles.permissionReasonText}>• {item}</Text>
          ))}
        </View>
      ))}
    </Card>
  );
}

function PermissionDetail({
  screen,
  back,
  setPermissions,
  onServicePermissionChange,
  requestPushPermission,
}: {
  screen: PermissionScreen;
  back: () => void;
  setPermissions: React.Dispatch<React.SetStateAction<PermissionState>>;
  onServicePermissionChange: (nextPermissions: Partial<AuraServicePermissions>) => Promise<void>;
  requestPushPermission: () => Promise<boolean>;
}) {
  const info = {
    gmailPermission: {
      title: 'Gmail 접근',
      subtitle: '메일 분석에 사용하는 권한 범위',
      features: [
        ['메일 기본 정보 조회', '제목·보낸 사람·받은 날짜'],
        ['첨부파일 정보 확인', '첨부파일 여부와 첨부 용량'],
        ['선택 메일 휴지통 이동', '삭제 확인 후 선택 항목만 처리'],
      ],
      blockedTitle: '접근하지 않는 항목',
      blocked: ['메일 본문은 기본 분석 대상에서 제외', '메일 발송·답장 권한은 사용하지 않음'],
      reasonTitle: '권한을 요청하는 이유',
      reasonDescription: 'AURA는 불필요한 메일을 찾기 위해\n메일의 기본 정보만 확인합니다.',
      reasonSections: [
        {
          title: 'AURA가 확인하는 정보',
          items: ['메일 제목, 보낸 사람, 받은 날짜', '첨부파일 여부와 첨부 용량', '사용자가 선택한 메일의 휴지통 이동 권한'],
        },
        {
          title: '확인하지 않는 정보',
          items: ['메일 본문 원문은 AI에게 전달되지 않아요.', '메일 발송, 답장, 전달 권한은 사용하지 않아요.', '최종 승인 전에는 어떤 메일도 이동하지 않아요.'],
        },
      ],
      reasonNote: '사용자가 최종승인한 항목만 휴지통으로 이동합니다',
      guide: '설정에서 언제든 권한을 변경할 수 있어요',
      button: 'Gmail 접근 허용',
      key: 'gmail' as const,
    },
    drivePermission: {
      title: 'Google Drive 접근',
      subtitle: '파일 분석에 사용하는 권한 범위',
      features: [
        ['파일 기본 정보 조회', '이름·확장자·용량·수정일·경로'],
        ['중복 파일 해시 비교', '중복 검사 시 파일 디지털 지문 생성'],
        ['선택 파일 휴지통 이동', '삭제 확인 후 선택 항목만 처리'],
      ],
      blockedTitle: '접근하지 않는 항목',
      blocked: ['파일 내용을 수정하거나 공유하지 않음', '영구 삭제는 AURA에서 실행하지 않음'],
      reasonTitle: '권한을 요청하는 이유',
      reasonDescription: 'AURA는 오래된 파일과 중복 파일을 찾기 위해\n파일의 기본 정보만 확인합니다.',
      reasonSections: [
        {
          title: 'AURA가 확인하는 정보',
          items: ['파일 이름, 확장자, 용량, 수정일', '선택한 Drive 폴더와 파일 경로', '중복 확인을 위한 파일 해시값'],
        },
        {
          title: '확인하지 않는 정보',
          items: ['파일 원문 내용은 AI에게 전달되지 않아요.', '파일을 임의로 수정하거나 공유하지 않아요.', '최종 승인 전에는 어떤 파일도 이동하지 않아요.'],
        },
      ],
      reasonNote: '사용자가 최종승인한 항목만 휴지통으로 이동합니다',
      guide: '설정에서 언제든 권한을 변경할 수 있어요',
      button: 'Drive 접근 허용',
      key: 'drive' as const,
    },
    notificationPermission: {
      title: '푸시 알림',
      subtitle: undefined,
      features: [
        ['스캔 완료 알림', '백그라운드 분석이 끝났을 때'],
        ['스캔 권장 알림', '맞춤 정리 행동을 주 1회 제안'],
        ['권한 상태 안내', 'Google 연결이 만료되거나 해제됐을 때'],
      ],
      blockedTitle: '접근하지 않는 항목',
      blocked: ['광고성 알림은 발송하지 않음', '설정에서 언제든 항목별로 끌 수 있음'],
      reasonTitle: '권한을 요청하는 이유',
      reasonDescription: 'AURA는 사용자가 앱을 닫아도 정리 진행 상태를\n놓치지 않도록 알림을 보냅니다.',
      reasonSections: [
        {
          title: 'AURA가 보내는 알림',
          items: ['백그라운드 스캔 완료 안내', '정리 후보가 준비되었을 때의 알림'],
        },
        {
          title: '알림에서 제외되는 내용',
          items: ['메일과 파일의 원문 내용은 AI에게 전달되지 않아요.', '광고성 알림은 보내지 않아요.', '알림 설정은 언제든 변경할 수 있어요.'],
        },
      ],
      reasonNote: '',
      guide: '설정에서 언제든 권한을 변경할 수 있어요',
      button: '푸시 알림 허용',
      key: 'alarm' as const,
    },
  }[screen];

  return (
    <ScreenShell title={info.title} subtitle={info.subtitle} noNav onBack={back}>
      {screen === 'notificationPermission' ? (
        <PushNotificationPermissionContent />
      ) : (
        <Card style={styles.permissionReasonCard}>
          <SectionTitle>{info.reasonTitle}</SectionTitle>
          <Text style={styles.permissionReasonDescription}>{info.reasonDescription}</Text>
          {info.reasonSections.map((section) => (
            <View key={section.title} style={styles.permissionReasonSection}>
              <Text style={styles.permissionReasonTitle}>{section.title}</Text>
              {section.items.map((item) => (
                <Text key={item} style={styles.permissionReasonText}>• {item}</Text>
              ))}
            </View>
          ))}
          <View style={styles.permissionReasonNote}>
            <Text style={styles.permissionReasonNoteText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>{info.reasonNote}</Text>
          </View>
        </Card>
      )}
      <PrimaryButton
        title={info.button}
        onPress={() => {
          if (info.key === 'alarm') {
            void requestPushPermission().then((allowed) => {
              void onServicePermissionChange({ alarm: allowed });
              back();
            });
            return;
          }

          setPermissions((items) => ({ ...items, [info.key]: true }));
          void onServicePermissionChange({ [info.key]: true });
          back();
        }}
      />
      <Text style={styles.helperText}>{info.guide}</Text>
    </ScreenShell>
  );
}

function PermissionFeature({ title, desc }: { title: string; desc: string }) {
  return (
    <View style={styles.permissionFeatureCard}>
      <View style={styles.permissionFeatureIcon}>
        <Text style={styles.permissionFeatureCheck}>✓</Text>
      </View>
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoDesc}>{desc}</Text>
      </View>
    </View>
  );
}

function KeywordEditor({
  type,
  keywords,
  input,
  setInput,
  addKeyword,
  removeKeyword,
  back,
}: {
  type: 'include' | 'exclude';
  keywords: string[];
  input: string;
  setInput: (text: string) => void;
  addKeyword: (type: 'include' | 'exclude') => void;
  removeKeyword: (type: 'include' | 'exclude', keyword: string) => void;
  back: () => void;
}) {
  return (
    <ScreenShell title={type === 'include' ? '포함 키워드 설정' : '제외 키워드 설정'}>
      <Text style={styles.meta}>{type === 'include' ? '해당 키워드가 있는 메일을 정리 후보에 포함합니다.' : '해당 키워드가 있는 항목은 정리 후보에서 제외합니다.'}</Text>
      <View style={styles.inputRow}>
        <TextInput value={input} onChangeText={setInput} placeholder="키워드 입력" placeholderTextColor={mutedText} style={styles.input} />
        <Pressable style={styles.addButton} onPress={() => addKeyword(type)}>
          <Text style={styles.addButtonText}>추가</Text>
        </Pressable>
      </View>
      <SectionTitle>현재 키워드</SectionTitle>
      <View style={styles.chipWrap}>
        {keywords.map((keyword) => (
          <Chip key={keyword} label={keyword} removable onRemove={() => removeKeyword(type, keyword)} />
        ))}
      </View>
      <PrimaryButton title={type === 'include' ? '포함 키워드 적용' : '제외 키워드 적용'} onPress={back} />
    </ScreenShell>
  );
}

function ResultMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.resultMetricCard}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.bigNumber}>{value}</Text>
    </View>
  );
}

function ResultCategoryCard({ title, desc, warning, onPress }: { title: string; desc: string; warning?: string; onPress: () => void }) {
  return (
    <Pressable style={styles.resultCategoryCard} onPress={onPress}>
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{title}</Text>
        {warning ? <Text style={styles.resultWarningText}>{warning}</Text> : null}
      </View>
      <Text style={styles.resultCategoryMeta}>{desc}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function HighlightNumberText({ text: value }: { text: string }) {
  const parts = value.split(/(\d+(?:\.\d+)?(?:개|GB|MB)?)/g);
  return (
    <Text style={styles.infoDesc}>
      {parts.map((part, index) =>
        /^\d/.test(part) ? (
          <Text key={`${part}-${index}`} style={styles.reviewRedNumber}>
            {part}
          </Text>
        ) : (
          <Text key={`${part}-${index}`}>{part}</Text>
        ),
      )}
    </Text>
  );
}

function ReviewSummaryCard({ title, desc }: { title: string; desc: string }) {
  return (
    <View style={styles.reviewSummaryCard}>
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{title}</Text>
        <HighlightNumberText text={desc} />
      </View>
    </View>
  );
}

function ScanItemDetailScreen({
  title,
  subtitle,
  item,
  kind,
  apiAccessToken,
}: {
  title: string;
  subtitle?: string;
  item?: ScanListItem;
  kind: 'mail' | 'drive';
  apiAccessToken: string | null;
}) {
  const [apiDetail, setApiDetail] = useState<ApiCandidateDetail | null>(null);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    if (!apiAccessToken || !item?.candidateId) {
      setApiDetail(null);
      setDetailError('');
      return;
    }

    let active = true;
    setDetailError('');
    void candidateApi
      .getDetail(item.candidateId, { accessToken: apiAccessToken })
      .then((detail) => {
        if (active) setApiDetail(detail ?? null);
      })
      .catch((error) => {
        if (active) setDetailError(getErrorMessage(error, '상세 정보를 불러오지 못했어요'));
      });

    return () => {
      active = false;
    };
  }, [apiAccessToken, item?.candidateId]);

  if (!item) {
    return (
      <ScreenShell title={title} subtitle={subtitle}>
        <Card tint>
          <Text style={styles.cardTitle}>상세 정보를 불러올 항목이 없어요</Text>
          <Text style={styles.meta}>분석 결과 목록에서 항목을 다시 선택해 주세요.</Text>
        </Card>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title={title} subtitle={subtitle}>
      <Text style={styles.detailMainTitle}>{item.title}</Text>
      {item.detailSubtitle ? <Text style={styles.detailSubMeta}>{item.detailSubtitle}</Text> : null}
      <View style={styles.itemPreviewBox}>
        <Text style={styles.itemPreviewText}>{item.previewLabel ?? (kind === 'mail' ? '메일 본문 미리보기' : 'FILE PREVIEW')}</Text>
      </View>
      {kind === 'mail' ? (
        <View style={styles.detailInfoBox}>
          <Text style={styles.detailInfoTitle}>선정 이유</Text>
          <Text style={styles.detailInfoText}>{item.desc}</Text>
          <View style={styles.thinDivider} />
          <Text style={styles.detailInfoTitle}>분석 메타데이터</Text>
          <Text style={styles.detailInfoText}>용량 {formatDataSize(item.sizeMB)} · 기준 날짜 {item.dateLabel}</Text>
          {apiDetail ? (
            <Text style={styles.detailInfoText}>
              서버 후보 #{apiDetail.candidate_id ?? item.candidateId} · 선택 상태 {apiDetail.selection_status ?? item.selectionStatus ?? 'NONE'}
              {apiDetail.analysis?.category ? ` · 분류 ${apiDetail.analysis.category}` : ''}
            </Text>
          ) : null}
          {apiDetail?.analysis?.ai_confidence_score !== undefined ? (
            <Text style={styles.detailInfoText}>AI 신뢰도 {Math.round(apiDetail.analysis.ai_confidence_score * 100)}%</Text>
          ) : null}
          {detailError ? <Text style={styles.warningText}>{detailError}</Text> : null}
        </View>
      ) : (
        <View style={styles.detailInfoBox}>
          <Text style={styles.detailInfoTitle}>파일 메타데이터</Text>
          <Text style={styles.detailInfoText}>용량 {formatDataSize(item.sizeMB)} · 기준 날짜 {item.dateLabel}</Text>
          {apiDetail ? (
            <Text style={styles.detailInfoText}>
              서버 후보 #{apiDetail.candidate_id ?? item.candidateId} · 선택 상태 {apiDetail.selection_status ?? item.selectionStatus ?? 'NONE'}
              {apiDetail.analysis?.category ? ` · 분류 ${apiDetail.analysis.category}` : ''}
            </Text>
          ) : null}
          {apiDetail?.item?.folder_path ? <Text style={styles.detailInfoText}>Drive 경로 {apiDetail.item.folder_path}</Text> : null}
          {apiDetail?.analysis?.ai_confidence_score !== undefined ? (
            <Text style={styles.detailInfoText}>AI 신뢰도 {Math.round(apiDetail.analysis.ai_confidence_score * 100)}%</Text>
          ) : null}
          {detailError ? <Text style={styles.warningText}>{detailError}</Text> : null}
        </View>
      )}
    </ScreenShell>
  );
}

function DeleteStatusRow({
  service,
  title,
  desc,
  status,
  done,
}: {
  service: 'gmail' | 'drive';
  title: string;
  desc?: string;
  status: string;
  done?: boolean;
}) {
  const iconSource = service === 'gmail' ? gmailIcon : googleDriveIcon;

  return (
    <View style={styles.deleteStatusRow}>
      <Image source={iconSource} style={styles.deleteStatusServiceIcon} resizeMode="contain" />
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{title}</Text>
        {desc ? <Text style={styles.infoDesc}>{desc}</Text> : null}
      </View>
      <View style={[styles.statusLight, done ? styles.statusLightGreen : styles.statusLightYellow]} />
      <Text style={styles.deleteStatusText}>{status}</Text>
    </View>
  );
}

function CleanupMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.cleanupMetricCard}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cleanupMetricValue}>{value}</Text>
    </View>
  );
}

function CarbonBasisLine({ title, desc, value }: { title: string; desc: string; value: string }) {
  return (
    <View style={styles.carbonBasisLine}>
      <View style={styles.infoMain}>
        <Text style={styles.carbonBasisLineTitle}>{title}</Text>
        <Text style={styles.carbonBasisLineDesc}>{desc}</Text>
      </View>
      <Text style={styles.carbonBasisLineValue}>{value}</Text>
    </View>
  );
}

function CarbonHelpPopup({ onClose }: { onClose: () => void }) {
  return (
    <View style={styles.helpPopupOverlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.carbonHelpPopupCard}>
        <Text style={styles.carbonHelpTitle}>월간 예상 절감량 계산식</Text>
        <Text style={styles.carbonFormulaText}>삭제 용량 × 저장 전력 × PUE</Text>
        <Text style={styles.carbonFormulaText}>× 전력 배출계수 × 730시간</Text>
      </View>
    </View>
  );
}

function RecentResultRow({ title, desc, value }: { title: string; desc?: string; value: string }) {
  return (
    <View style={styles.recentResultRow}>
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{title}</Text>
        {desc ? <Text style={styles.infoDesc}>{desc}</Text> : null}
      </View>
      <Text style={styles.recentResultValue}>{value}</Text>
    </View>
  );
}

function CarbonStatsGraph({ sizeLabel }: { sizeLabel: string }) {
  const reveal = useRef(new Animated.Value(0)).current;
  const current = sizeLabelToMB(sizeLabel) / 1024;
  const chartWidth = Math.max(260, Dimensions.get('window').width - 96);
  const scanValues = current > 0
    ? [
        Math.max(0.2, current * 0.55),
        Math.max(0.3, current * 1.18),
        Math.max(0.2, current),
      ]
    : [0];

  useEffect(() => {
    reveal.setValue(0);
    Animated.timing(reveal, {
      toValue: 1,
      duration: 850,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [reveal, sizeLabel]);

  const revealWidth = reveal.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.statsGraphCard}>
      <View style={styles.statsChartClip}>
        <Animated.View style={[styles.statsChartReveal, { width: revealWidth }]}>
          <LineChart
            data={{
              labels: scanValues.map((_, index) => `${index + 1}회`),
              datasets: [{ data: scanValues }],
            }}
            width={chartWidth}
            height={180}
            yAxisSuffix="GB"
            chartConfig={{
              backgroundGradientFrom: '#FFFFFF',
              backgroundGradientTo: '#FFFFFF',
              color: (opacity = 1) => `rgba(82, 190, 116, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(120, 129, 134, ${opacity})`,
              decimalPlaces: 1,
              propsForBackgroundLines: {
                stroke: '#E8ECEF',
                strokeDasharray: '',
              },
              propsForDots: {
                r: '4',
                strokeWidth: '2',
                stroke: '#52BE74',
              },
            }}
            bezier
            fromZero
            segments={4}
            withOuterLines={false}
            withVerticalLines={false}
            style={styles.statsLineChart}
          />
        </Animated.View>
      </View>
    </View>
  );
}

function StorageScreen({
  mode,
  scan,
  apiAccessToken,
  permissions,
  checked,
  toggle,
  setAll,
  clearSelectionPrefix,
  showToast,
  onReconnect,
  goMail,
  goDrive,
  goTrash,
  storageDriveFolder,
  setStorageDriveFolder,
  storageTrashMovedKeys,
  storageDeletedKeys,
  storageRestoredKeys,
  storageDriveMoveTargets,
  setStorageTrashMovedKeys,
  setStorageDeletedKeys,
  setStorageRestoredKeys,
  setStorageDriveMoveTargets,
  openStorageDetail,
}: {
  mode: 'storageMail' | 'storageDrive' | 'storageTrash' | 'storageDriveTrash';
  scan: ScanRecord | null;
  apiAccessToken: string | null;
  permissions: { gmail: boolean; drive: boolean; alarm: boolean };
  checked: Record<string, boolean>;
  toggle: (key: string) => void;
  setAll: (prefix: string, keys: string[]) => void;
  clearSelectionPrefix: (prefix: string) => void;
  showToast: (message: string, target?: Screen, duration?: number) => void;
  onReconnect: () => void;
  goMail: () => void;
  goDrive: () => void;
  goTrash: () => void;
  storageDriveFolder: string;
  setStorageDriveFolder: (folder: string) => void;
  storageTrashMovedKeys: string[];
  storageDeletedKeys: string[];
  storageRestoredKeys: string[];
  storageDriveMoveTargets: StorageDriveMoveTargets;
  setStorageTrashMovedKeys: React.Dispatch<React.SetStateAction<string[]>>;
  setStorageDeletedKeys: React.Dispatch<React.SetStateAction<string[]>>;
  setStorageRestoredKeys: React.Dispatch<React.SetStateAction<string[]>>;
  setStorageDriveMoveTargets: React.Dispatch<React.SetStateAction<StorageDriveMoveTargets>>;
  openStorageDetail: (item: StorageDetailItem) => void;
}) {
  const isDrive = mode === 'storageDrive' || mode === 'storageDriveTrash';
  const isTrash = mode === 'storageTrash' || mode === 'storageDriveTrash';
  const screenTitle = isTrash ? '휴지통' : '정리함';
  const [selectionMode, setSelectionMode] = useState(false);
  const [deleteSheetMode, setDeleteSheetMode] = useState<'trash' | 'permanent' | null>(null);
  const [restoreSheetVisible, setRestoreSheetVisible] = useState(false);
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);
  const [restoreConfirmChecked, setRestoreConfirmChecked] = useState(false);
  const [storageDriveTrashFolder, setStorageDriveTrashFolder] = useState(driveRootPath);
  const [storagePage, setStoragePage] = useState(0);
  const prefix = mode === 'storageDriveTrash' ? 'storageDriveTrash' : isTrash ? 'storageTrash' : isDrive ? 'storageDrive' : 'storageMail';
  const shouldUseServerPagination = Boolean(apiAccessToken);
  const storageServerSource = isDrive ? ('DRIVE' as const) : ('GMAIL' as const);
  const storageApiPageSize = 20;
  const [serverPage, setServerPage] = useState<StorageServerPageState | null>(null);
  const [serverPageLoading, setServerPageLoading] = useState(false);
  const [serverPageError, setServerPageError] = useState('');
  const serverPageRequestId = useRef(0);
  const summary = scan?.result ?? defaultStorageSummary;
  const serverMailItems = serverPage?.items.map(apiStorageItemToMail) ?? [];
  const serverDriveItems = serverPage?.items.map(apiStorageItemToDrive) ?? [];
  const serverTrashItems = serverPage?.items.map(apiStorageItemToTrash) ?? [];
  const mailItems = shouldUseServerPagination && mode === 'storageMail' ? serverMailItems : summary.storageMailItems;
  const allStorageDriveItems = getAllStorageDriveItems();
  const hasApiStorageDriveItems =
    (shouldUseServerPagination && mode === 'storageDrive') ||
    summary.storageDriveItems.some((item) => item.externalItemId || item.id.startsWith('api-storage-drive-'));
  const applyDriveMove = (item: StorageDriveItem): StorageDriveItem => {
    const targetFolder = storageDriveMoveTargets[item.id];
    if (!targetFolder) return item;
    const fullPath = item.type === 'F' ? `${targetFolder} › ${item.title}` : targetFolder;
    const meta = item.subtitle.split(' · ').slice(0, -1).join(' · ') || item.subtitle;
    return {
      ...item,
      fullPath,
      subtitle: item.type === 'F' ? `${fullPath} · 폴더` : `${meta} · ${targetFolder}`,
    };
  };
  const storageDriveUniverse = (shouldUseServerPagination && mode === 'storageDrive'
    ? serverDriveItems
    : hasApiStorageDriveItems
      ? summary.storageDriveItems
      : allStorageDriveItems).map(applyDriveMove);
  const currentStorageDriveItems = storageDriveUniverse
    .filter((item) => {
      if (item.type === 'F') return getDriveParentPath(item.fullPath ?? '') === storageDriveFolder;
      return item.fullPath === storageDriveFolder;
    });
  const driveItems = isDrive && !isTrash ? currentStorageDriveItems : summary.storageDriveItems;
  const activeDriveFolder = mode === 'storageDriveTrash' ? storageDriveTrashFolder : storageDriveFolder;
  const storageDriveBreadcrumbs = splitDrivePath(activeDriveFolder).map((part, index, parts) => ({
    label: mode === 'storageDriveTrash' && index === 0 ? '휴지통' : part,
    path: parts.slice(0, index + 1).join(' › '),
  }));
  const movedTrashItems: StorageMailItem[] = storageTrashMovedKeys
    .map((key): StorageMailItem | null => {
      const [sourcePrefix, ...idParts] = key.split(':');
      const id = idParts.join(':');
      if (sourcePrefix === 'storageMail') {
        const item = mailItems.find((mail) => mail.id === id);
        if (!item) return null;
        return {
          id: `trash-mail-moved-${item.id}`,
          itemId: item.itemId,
          externalItemId: item.externalItemId,
          snapshotTitle: item.snapshotTitle,
          snapshotSizeBytes: item.snapshotSizeBytes,
          itemSource: item.itemSource,
          title: item.title,
          subtitle: item.subtitle,
          meta: item.meta,
          badge: '복구 가능',
        };
      }
      if (sourcePrefix === 'storageDrive') {
        const item = allStorageDriveItems.map(applyDriveMove).find((drive) => drive.id === id);
        if (!item) return null;
        return {
          id: `trash-drive-moved-${item.id}`,
          itemId: item.itemId,
          externalItemId: item.externalItemId,
          snapshotTitle: item.snapshotTitle,
          snapshotSizeBytes: item.snapshotSizeBytes,
          itemSource: item.itemSource,
          title: item.title,
          subtitle: item.title,
          meta: item.subtitle,
          badge: '복구 가능',
        };
      }
      return null;
    })
    .filter((item): item is StorageMailItem => Boolean(item));
  const combinedTrashItems = [...(shouldUseServerPagination && isTrash ? serverTrashItems : summary.storageTrashItems), ...movedTrashItems];
  const rawTrashItems = isTrash
    ? combinedTrashItems.filter((item) => mode === 'storageDriveTrash' ? item.id.startsWith('trash-drive-') : !item.id.startsWith('trash-drive-'))
    : combinedTrashItems;
  const itemStorageKey = (id: string) => `${prefix}:${id}`;
  const isHiddenFromCurrentList = (id: string) => {
    const key = itemStorageKey(id);
    return storageDeletedKeys.includes(key) || storageRestoredKeys.includes(key) || (!isTrash && storageTrashMovedKeys.includes(key));
  };
  const trashItems = rawTrashItems.filter((item) => !isHiddenFromCurrentList(item.id));
  const visibleMailItems = mailItems.filter((item) => !isHiddenFromCurrentList(item.id));
  const visibleDriveItems = driveItems.filter((item) => !isHiddenFromCurrentList(item.id));
  const serviceConnected = mode === 'storageDriveTrash' ? permissions.drive : isTrash ? permissions.gmail : isDrive ? permissions.drive : permissions.gmail;
  const mappedSummaryDriveTrashItems: StorageDriveItem[] = mode === 'storageDriveTrash'
    ? trashItems.map((item) => {
        const metaParts = splitStorageMeta(item.meta);
        const isFolder =
          item.id.startsWith('trash-drive-folder-') ||
          item.id.startsWith('trash-drive-moved-storage-folder-') ||
          metaParts.some((part) => part === '폴더' || part === '?대뜑');
        return {
          id: item.id,
          itemId: item.itemId,
          externalItemId: item.externalItemId,
          snapshotTitle: item.snapshotTitle,
          snapshotSizeBytes: item.snapshotSizeBytes,
          itemSource: item.itemSource,
          type: isFolder ? 'F' : metaParts[0] || 'DOC',
          title: item.title,
          subtitle: item.meta,
          fullPath: getTrashDriveFolderPath(item.meta),
        };
      })
    : [];
  const movedDriveTrashItems = storageDriveTrashFolder === driveRootPath ? mappedSummaryDriveTrashItems : [];
  const driveTrashUniverse = [...(shouldUseServerPagination ? [] : getAllStorageDriveTrashItems()), ...mappedSummaryDriveTrashItems]
    .filter((item) => !isHiddenFromCurrentList(item.id));
  const driveTrashItems: StorageDriveItem[] = mode === 'storageDriveTrash'
    ? [...(shouldUseServerPagination ? [] : getStorageDriveTrashItemsForFolder(storageDriveTrashFolder)), ...movedDriveTrashItems]
        .filter((item) => !isHiddenFromCurrentList(item.id))
    : [];
  const activeItems = mode === 'storageDriveTrash' ? driveTrashItems : isTrash ? trashItems : isDrive ? visibleDriveItems : visibleMailItems;
  const mailPagedSourceItems = !isDrive ? (isTrash ? trashItems : visibleMailItems) : [];
  const mailPageSize = 20;
  const serverTotalElements = serverPage?.totalElements ?? activeItems.length;
  const serverTotalPages = Math.max(1, serverPage?.totalPages ?? 1);
  const mailPageCount = shouldUseServerPagination
    ? serverTotalPages
    : Math.max(1, Math.ceil(mailPagedSourceItems.length / mailPageSize));
  const safeStoragePage = Math.min(storagePage, mailPageCount - 1);
  const mailPageStart = shouldUseServerPagination ? safeStoragePage * storageApiPageSize : safeStoragePage * mailPageSize;
  const mailPageEnd = shouldUseServerPagination
    ? Math.min(mailPageStart + activeItems.length, serverTotalElements)
    : Math.min(mailPageStart + mailPageSize, mailPagedSourceItems.length);
  const mailPagedItems = shouldUseServerPagination ? mailPagedSourceItems : mailPagedSourceItems.slice(mailPageStart, mailPageEnd);
  const pageRangeTotal = shouldUseServerPagination ? serverTotalElements : mailPagedSourceItems.length;
  const mailPageRangeStart = pageRangeTotal ? mailPageStart + 1 : 0;
  const mailPageRangeEnd = pageRangeTotal ? mailPageEnd : 0;
  const ids = activeItems.map((item) => item.id);
  const isItemChecked = (id: string) => checked[`${prefix}:${id}`] ?? false;
  const getStorageDriveSelectionIds = (item: StorageDriveItem) => {
    if (item.type !== 'F' || !item.fullPath) return [item.id];
    return storageDriveUniverse
      .filter((candidate) => candidate.id === item.id || Boolean(candidate.fullPath && (candidate.fullPath === item.fullPath || candidate.fullPath.startsWith(`${item.fullPath} ›`))))
      .map((candidate) => candidate.id);
  };
  const isStorageDriveItemChecked = (item: StorageDriveItem) => {
    const selectionIds = getStorageDriveSelectionIds(item);
    if (item.type === 'F' && item.fullPath) {
      const descendantIds = storageDriveUniverse
        .filter((candidate) => candidate.id !== item.id && Boolean(candidate.fullPath && candidate.fullPath.startsWith(`${item.fullPath} ›`)))
        .map((candidate) => candidate.id);
      if (descendantIds.length > 0 && descendantIds.every(isItemChecked)) return true;
    }
    return selectionIds.every(isItemChecked);
  };
  const getStorageDriveTrashSelectionIds = (item: StorageDriveItem) => {
    if (item.type !== 'F' || !item.fullPath) return [item.id];
    return driveTrashUniverse
      .filter((candidate) => candidate.id === item.id || Boolean(candidate.fullPath && (candidate.fullPath === item.fullPath || candidate.fullPath.startsWith(`${item.fullPath} ›`))))
      .map((candidate) => candidate.id);
  };
  const isStorageDriveTrashItemChecked = (item: StorageDriveItem) => {
    const selectionIds = getStorageDriveTrashSelectionIds(item);
    if (item.type === 'F' && item.fullPath) {
      const descendantIds = driveTrashUniverse
        .filter((candidate) => candidate.id !== item.id && Boolean(candidate.fullPath && candidate.fullPath.startsWith(`${item.fullPath} ›`)))
        .map((candidate) => candidate.id);
      if (descendantIds.length > 0 && descendantIds.every(isItemChecked)) return true;
    }
    return selectionIds.every(isItemChecked);
  };
  const activeSelectionIds = isDrive && !isTrash
    ? Array.from(new Set((activeItems as StorageDriveItem[]).flatMap(getStorageDriveSelectionIds)))
    : mode === 'storageDriveTrash'
      ? Array.from(new Set((activeItems as StorageDriveItem[]).flatMap(getStorageDriveTrashSelectionIds)))
      : mailPagedItems.map((item) => item.id);
  const allChecked = activeSelectionIds.length > 0 && activeSelectionIds.every(isItemChecked);
  const selectedItems = isDrive && !isTrash
    ? storageDriveUniverse.filter((item) => !isHiddenFromCurrentList(item.id) && isItemChecked(item.id))
    : mode === 'storageDriveTrash'
      ? driveTrashUniverse.filter((item) => !isHiddenFromCurrentList(item.id) && isItemChecked(item.id))
    : activeItems.filter((item) => isItemChecked(item.id));
  const selectedActiveItemCount = selectedItems.length;

  const loadStorageServerPage = (page: number) => {
    if (!apiAccessToken || !shouldUseServerPagination) return;

    const requestId = serverPageRequestId.current + 1;
    serverPageRequestId.current = requestId;
    setServerPageLoading(true);
    setServerPageError('');
    const request = isTrash
      ? storageApi.getTrash({ item_source: storageServerSource, page, size: storageApiPageSize }, { accessToken: apiAccessToken })
      : storageApi.getItems({ item_source: storageServerSource, page, size: storageApiPageSize }, { accessToken: apiAccessToken });

    void request
      .then((result) => {
        if (serverPageRequestId.current !== requestId) return;
        setServerPage({
          items: result.content ?? [],
          page: result.page ?? page,
          size: result.size ?? storageApiPageSize,
          totalElements: result.total_elements ?? result.content?.length ?? 0,
          totalPages: result.total_pages ?? 1,
        });
      })
      .catch((error) => {
        if (serverPageRequestId.current !== requestId) return;
        setServerPageError(getErrorMessage(error, '저장소 목록을 불러오지 못했어요'));
      })
      .finally(() => {
        if (serverPageRequestId.current !== requestId) return;
        setServerPageLoading(false);
      });
  };

  useEffect(() => {
    serverPageRequestId.current += 1;
    setServerPage(null);
    setServerPageError('');
    setServerPageLoading(false);
  }, [apiAccessToken, mode]);

  useEffect(() => {
    if (!shouldUseServerPagination || !apiAccessToken) return;
    loadStorageServerPage(storagePage);
  }, [apiAccessToken, mode, shouldUseServerPagination, storagePage]);

  useEffect(() => {
    setStoragePage(0);
  }, [mode, storageDriveFolder, storageDriveTrashFolder]);

  useEffect(() => {
    if (storagePage !== safeStoragePage) {
      setStoragePage(safeStoragePage);
    }
  }, [safeStoragePage, storagePage]);

  useEffect(() => {
    if (!selectionMode && selectedActiveItemCount > 0) {
      setSelectionMode(true);
      return;
    }
    if (selectionMode && !selectedActiveItemCount) {
      setSelectionMode(false);
    }
  }, [selectionMode, selectedActiveItemCount]);

  const openMailStorageDetail = (item: StorageMailItem) =>
    openStorageDetail({
      title: item.subtitle,
      meta: item.meta,
      source: 'mail',
      itemId: item.itemId,
      externalItemId: item.externalItemId,
      snapshotTitle: item.snapshotTitle,
      snapshotSizeBytes: item.snapshotSizeBytes,
      itemSource: item.itemSource,
    });
  const openDriveStorageDetail = (item: StorageDriveItem) =>
    openStorageDetail({
      title: item.title,
      meta: item.subtitle,
      source: 'drive',
      itemId: item.itemId,
      externalItemId: item.externalItemId,
      snapshotTitle: item.snapshotTitle,
      snapshotSizeBytes: item.snapshotSizeBytes,
      itemSource: item.itemSource,
    });
  const openDriveStorageItem = (item: StorageDriveItem) => {
    if (item.type === 'F' && item.fullPath) {
      setStorageDriveFolder(item.fullPath);
      return;
    }
    openDriveStorageDetail(item);
  };
  const openDriveTrashItem = (item: StorageDriveItem) => {
    if (item.type === 'F' && item.fullPath) {
      setStorageDriveTrashFolder(item.fullPath);
      return;
    }
    openDriveStorageDetail(item);
  };
  const enterSelectionMode = (id: string) => {
    setSelectionMode(true);
    toggle(`${prefix}:${id}`);
  };
  const toggleStorageDriveItemSelection = (item: StorageDriveItem) => {
    const selectionIds = getStorageDriveSelectionIds(item);
    setSelectionMode(true);
    setAll(prefix, selectionIds);
  };
  const toggleStorageDriveTrashItemSelection = (item: StorageDriveItem) => {
    const selectionIds = getStorageDriveTrashSelectionIds(item);
    setSelectionMode(true);
    setAll(prefix, selectionIds);
  };
  const toggleAllActiveStorageItems = () => {
    setAll(prefix, activeSelectionIds);
    if (allChecked) {
      setSelectionMode(false);
    }
  };
  const openDeleteSheet = (modeToOpen: 'trash' | 'permanent') => {
    if (!selectedItems.length) {
      showToast('삭제할 항목을 선택해주세요');
      return;
    }
    setDeleteConfirmChecked(false);
    setDeleteSheetMode(modeToOpen);
  };
  const openRestoreSheet = () => {
    if (!selectedItems.length) {
      showToast('복구할 항목을 선택해주세요');
      return;
    }
    setRestoreConfirmChecked(false);
    setRestoreSheetVisible(true);
  };
  const closeDeleteSheet = () => {
    setDeleteSheetMode(null);
    setDeleteConfirmChecked(false);
  };
  const closeRestoreSheet = () => {
    setRestoreSheetVisible(false);
    setRestoreConfirmChecked(false);
  };
  const getMovedTrashOriginalKey = (id: string) => {
    if (id.startsWith('trash-mail-moved-')) return `storageMail:${id.replace('trash-mail-moved-', '')}`;
    if (id.startsWith('trash-drive-moved-')) return `storageDrive:${id.replace('trash-drive-moved-', '')}`;
    return null;
  };
  const getApiStorageActionItems = () =>
    selectedItems
      .filter((item) => !item.id.startsWith('storage-folder-') && !item.id.startsWith('trash-drive-folder-'))
      .map((item) => {
        const externalItemId =
          item.externalItemId ??
          item.id
          .replace(/^api-storage-(?:mail|drive)-/, '')
          .replace(/^trash-(?:mail|drive)-api-/, '')
          .replace(/^trash-drive-file-/, '')
          .replace(/^trash-mail-moved-/, '')
          .replace(/^trash-drive-moved-/, '')
          .replace(/^storage-/, '');

        return {
          item_source: item.itemSource ?? (isDrive ? ('DRIVE' as const) : ('GMAIL' as const)),
          external_item_id: externalItemId,
          ...(item.itemId !== undefined ? { item_id: item.itemId } : {}),
          ...(item.snapshotTitle ? { snapshot_title: item.snapshotTitle } : {}),
          ...(item.snapshotSizeBytes !== undefined ? { snapshot_size_bytes: item.snapshotSizeBytes } : {}),
        };
      });
  const confirmStorageDelete = () => {
    if (!deleteConfirmChecked) {
      showToast('삭제 확인 체크가 필요합니다');
      return;
    }
    const permanent = deleteSheetMode === 'permanent';
    const selectedKeys = selectedItems.map((item) => itemStorageKey(item.id));
    closeDeleteSheet();
    if (permanent) {
      const apiItems = getApiStorageActionItems();
      if (apiAccessToken && apiItems.length) {
        void storageApi
          .permanentDelete(apiItems, { accessToken: apiAccessToken })
          .then(() => loadStorageServerPage(safeStoragePage))
          .catch(() => {
            showToast('백엔드 영구 삭제 요청 실패: 화면에서만 반영했어요');
          });
      }
      setStorageDeletedKeys((items) => Array.from(new Set([...items, ...selectedKeys])));
      clearSelectionPrefix(prefix);
      setSelectionMode(false);
      showToast('영구 삭제가 완료됐어요');
      return;
    }

    setStorageTrashMovedKeys((items) => Array.from(new Set([...items, ...selectedKeys])));
    clearSelectionPrefix(prefix);
    setSelectionMode(false);
    showToast(apiAccessToken ? '저장소 직접 이동 API가 없어 화면에서만 반영했어요' : '선택 항목을 휴지통으로 이동했어요');
  };
  const confirmStorageRestore = () => {
    if (!restoreConfirmChecked) {
      showToast('복구 확인 체크가 필요합니다');
      return;
    }

    const selectedKeys = selectedItems.map((item) => itemStorageKey(item.id));
    const movedSourceKeys = selectedItems
      .map((item) => getMovedTrashOriginalKey(item.id))
      .filter((key): key is string => Boolean(key));
    const apiItems = getApiStorageActionItems();

    closeRestoreSheet();
    if (apiAccessToken && apiItems.length) {
      void storageApi
        .restore(apiItems, { accessToken: apiAccessToken })
        .then(() => loadStorageServerPage(safeStoragePage))
        .catch(() => {
          showToast('백엔드 복구 요청 실패: 화면에서만 반영했어요');
        });
    }
    setStorageRestoredKeys((items) => Array.from(new Set([...items, ...selectedKeys])));
    if (movedSourceKeys.length) {
      setStorageTrashMovedKeys((items) => items.filter((key) => !movedSourceKeys.includes(key)));
    }
    clearSelectionPrefix(prefix);
    setSelectionMode(false);
    showToast('선택 항목을 정리함으로 복구했어요');
  };
  const storageFloatingActions: FloatingAction[] | undefined = selectionMode && !deleteSheetMode && !restoreSheetVisible
    ? isTrash
      ? [
          { variant: 'restore', onPress: openRestoreSheet, small: true },
          { variant: 'trash', onPress: () => openDeleteSheet('permanent') },
        ]
      : [{ variant: 'delete', onPress: () => openDeleteSheet('trash') }]
    : undefined;

  return (
    <View style={styles.modalScreenRoot}>
    <ScreenShell
      title={screenTitle}
      titleIcon={isTrash ? 'trash' : 'storage'}
      hideBack
      tightBottom
      hideFloatingScan={selectionMode || Boolean(deleteSheetMode) || restoreSheetVisible}
      floatingAction={storageFloatingActions}
    >
      <View style={styles.storagePrimaryTabs}>
        <Pressable style={[styles.storagePrimaryTab, !isDrive && styles.storagePrimaryTabActive]} onPress={goMail}>
          <Text style={[styles.storagePrimaryTabText, !isDrive && styles.storagePrimaryTabTextActive]}>메일</Text>
        </Pressable>
        <Pressable style={[styles.storagePrimaryTab, isDrive && styles.storagePrimaryTabActive]} onPress={goDrive}>
          <Text style={[styles.storagePrimaryTabText, isDrive && styles.storagePrimaryTabTextActive]}>Drive</Text>
        </Pressable>
      </View>
      {!serviceConnected ? (
        <PermissionRevokedCard onPress={onReconnect} />
      ) : (
        <View style={styles.storageLooseList}>
          {isDrive ? (
            <View style={styles.storagePathCard}>
              <View style={styles.storageBreadcrumbRow}>
                {storageDriveBreadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.path}>
                    <Pressable
                      onPress={() => {
                        if (mode === 'storageDriveTrash') {
                          setStorageDriveTrashFolder(crumb.path);
                          return;
                        }
                        setStorageDriveFolder(crumb.path);
                      }}
                      hitSlop={8}
                    >
                      <Text style={[styles.storageBreadcrumbText, index === storageDriveBreadcrumbs.length - 1 && styles.storageBreadcrumbCurrent]}>
                        {crumb.label}
                      </Text>
                    </Pressable>
                    {index < storageDriveBreadcrumbs.length - 1 ? <Text style={styles.storageBreadcrumbDivider}>›</Text> : null}
                  </React.Fragment>
                ))}
              </View>
              <Text style={styles.storagePathCountText}>{activeItems.length}개</Text>
              {shouldUseServerPagination ? (
                <View style={styles.storagePagerRow}>
                  <Text style={styles.storagePagerText}>
                    {pageRangeTotal}개 중 {mailPageRangeStart}~{mailPageRangeEnd}개
                  </Text>
                  <View style={styles.storagePagerButtons}>
                    <Pressable
                      style={[styles.storagePagerButton, safeStoragePage <= 0 && styles.storagePagerButtonDisabled]}
                      disabled={safeStoragePage <= 0}
                      onPress={() => setStoragePage((page) => Math.max(0, page - 1))}
                    >
                      <Text style={[styles.storagePagerGlyph, safeStoragePage <= 0 && styles.storagePagerGlyphDisabled]}>‹</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.storagePagerButton, safeStoragePage >= mailPageCount - 1 && styles.storagePagerButtonDisabled]}
                      disabled={safeStoragePage >= mailPageCount - 1}
                      onPress={() => setStoragePage((page) => Math.min(mailPageCount - 1, page + 1))}
                    >
                      <Text style={[styles.storagePagerGlyph, safeStoragePage >= mailPageCount - 1 && styles.storagePagerGlyphDisabled]}>›</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={[styles.storagePathCard, styles.storagePagerCard]}>
              <Text style={styles.storagePagerText}>
                메일 {pageRangeTotal}개 중 {mailPageRangeStart}~{mailPageRangeEnd}개
              </Text>
              <View style={styles.storagePagerButtons}>
                <Pressable
                  style={[styles.storagePagerButton, safeStoragePage <= 0 && styles.storagePagerButtonDisabled]}
                  disabled={safeStoragePage <= 0}
                  onPress={() => setStoragePage((page) => Math.max(0, page - 1))}
                >
                  <Text style={[styles.storagePagerGlyph, safeStoragePage <= 0 && styles.storagePagerGlyphDisabled]}>‹</Text>
                </Pressable>
                <Pressable
                  style={[styles.storagePagerButton, safeStoragePage >= mailPageCount - 1 && styles.storagePagerButtonDisabled]}
                  disabled={safeStoragePage >= mailPageCount - 1}
                  onPress={() => setStoragePage((page) => Math.min(mailPageCount - 1, page + 1))}
                >
                  <Text style={[styles.storagePagerGlyph, safeStoragePage >= mailPageCount - 1 && styles.storagePagerGlyphDisabled]}>›</Text>
                </Pressable>
              </View>
            </View>
          )}
          {serverPageLoading ? <Text style={styles.infoDesc}>서버 목록을 불러오는 중...</Text> : null}
          {serverPageError ? (
            <View style={styles.warningCard}>
              <Text style={styles.warningText}>{serverPageError}</Text>
              <View style={styles.twoButtons}>
                <OutlineButton title="재시도" onPress={() => loadStorageServerPage(safeStoragePage)} half />
                <PrimaryButton title="권한 재연결" onPress={onReconnect} half />
              </View>
            </View>
          ) : null}
          {activeItems.length > 0 && selectionMode ? (
            <Pressable style={styles.storageSelectAllRowInBox} onPress={toggleAllActiveStorageItems}>
              <CheckBox checked={allChecked} onPress={toggleAllActiveStorageItems} compact />
              <Text style={styles.selectAllText}>{allChecked ? '전체 선택 해제' : '전체 선택'}</Text>
            </Pressable>
          ) : null}
          {activeItems.length ? (
            <View style={styles.storageListContent}>
                  {mode === 'storageDriveTrash'
                    ? driveTrashItems.map((item) => (
                        <StorageDriveCard
                          key={item.id}
                          prefix={prefix}
                          item={item}
                          checked={isStorageDriveTrashItemChecked(item)}
                          toggle={toggle}
                          selectionMode={selectionMode}
                          onOpen={() => openDriveTrashItem(item)}
                          onLongSelect={() => toggleStorageDriveTrashItemSelection(item)}
                          onSelect={() => toggleStorageDriveTrashItemSelection(item)}
                          descriptionOverride={getTrashDriveFolderPath(item.subtitle)}
                          rightSizeLabel={getStorageSizeLabel(item.subtitle)}
                          rightSizeDanger={extractStorageSizeMB(item.subtitle) >= 500}
                          compact
                        />
                      ))
                    : isTrash
                    ? mailPagedItems.map((item) => (
                        <StorageMailCard
                          key={item.id}
                          prefix={prefix}
                          item={item}
                          checked={isItemChecked(item.id)}
                          toggle={toggle}
                          selectionMode={selectionMode}
                          onOpen={openMailStorageDetail}
                          onLongSelect={enterSelectionMode}
                          compact
                          trashMode="mail"
                        />
                      ))
                    : isDrive
                      ? visibleDriveItems.map((item) => (
                        <StorageDriveCard
                          key={item.id}
                          prefix={prefix}
                          item={item}
                          checked={isStorageDriveItemChecked(item)}
                          toggle={toggle}
                          selectionMode={selectionMode}
                          onOpen={() => openDriveStorageItem(item)}
                          onLongSelect={() => toggleStorageDriveItemSelection(item)}
                          onSelect={() => toggleStorageDriveItemSelection(item)}
                          compact
                        />
                      ))
                      : mailPagedItems.map((item) => (
                        <StorageMailCard
                          key={item.id}
                          prefix={prefix}
                          item={item}
                          checked={isItemChecked(item.id)}
                          toggle={toggle}
                          selectionMode={selectionMode}
                          onOpen={openMailStorageDetail}
                          onLongSelect={enterSelectionMode}
                          compact
                        />
                      ))}
            </View>
          ) : (
            <EmptyState
              title={isTrash ? '휴지통이 비어있어요' : isDrive ? '현재 폴더가 비어있어요' : '메일이 없어요'}
              desc={isDrive && !isTrash ? '이 위치 아래에 표시할 폴더나 파일이 없어요.' : '현재 표시할 항목이 없어요.'}
            />
          )}
        </View>
      )}
    </ScreenShell>
    {deleteSheetMode ? (
      <StorageDeleteSheet
        permanent={deleteSheetMode === 'permanent'}
        count={selectedItems.length}
        checked={deleteConfirmChecked}
        onToggle={() => setDeleteConfirmChecked((value) => !value)}
        onCancel={closeDeleteSheet}
        onConfirm={confirmStorageDelete}
      />
    ) : null}
    {restoreSheetVisible ? (
      <StorageRestoreSheet
        count={selectedItems.length}
        checked={restoreConfirmChecked}
        onToggle={() => setRestoreConfirmChecked((value) => !value)}
        onCancel={closeRestoreSheet}
        onConfirm={confirmStorageRestore}
      />
    ) : null}
    </View>
  );
}

function PermissionRevokedCard({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.permissionRevokedCard}>
      <View style={styles.permissionRevokedIcon}>
        <Text style={styles.permissionRevokedIconText}>G</Text>
      </View>
      <Text style={styles.permissionRevokedTitle}>메일 또는 드라이브 접근 권한을 설정해주세요</Text>
      <PrimaryButton title="권한 연결 화면으로 이동" onPress={onPress} inline />
    </View>
  );
}

function StorageDeleteSheet({
  permanent,
  count,
  checked,
  onToggle,
  onCancel,
  onConfirm,
}: {
  permanent: boolean;
  count: number;
  checked: boolean;
  onToggle: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const sheetMotion = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    sheetMotion.setValue(1);
    Animated.timing(sheetMotion, {
      toValue: 0,
      duration: 240,
      useNativeDriver: false,
    }).start();
  }, [sheetMotion]);

  return (
    <View style={styles.storageDeleteOverlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
      <BottomSheetPanel motion={sheetMotion} outputRange={[0, 360]} style={styles.storageDeleteSheet} onClose={onCancel}>
        <Text style={styles.storageDeleteTitle}>{permanent ? '영구 삭제할까요?' : '휴지통으로 이동할까요?'}</Text>
        <View style={permanent ? styles.storageDeleteWarningBox : styles.storageDeleteInfoBox}>
          <Text style={styles.storageDeleteWarningTitle}>{permanent ? '이 작업은 되돌릴 수 없습니다' : '휴지통으로 이동됩니다'}</Text>
          <Text style={styles.storageDeleteWarningText}>
            선택한 {count}개 항목이 {permanent ? '완전히 삭제됩니다' : '휴지통으로 이동됩니다'}
          </Text>
        </View>
        <CheckLine
          label={permanent ? '영구 삭제 내용을 확인했습니다' : '휴지통 이동 내용을 확인했습니다'}
          checked={checked}
          onPress={onToggle}
        />
        <View style={styles.twoButtons}>
          <OutlineButton title="취소" onPress={onCancel} half />
          <Pressable style={[styles.storageDeleteDangerButton, !checked && styles.dangerButtonDisabled, styles.halfButton]} onPress={onConfirm}>
            <Text style={styles.dangerText}>{permanent ? '영구 삭제' : '휴지통 이동'}</Text>
          </Pressable>
        </View>
      </BottomSheetPanel>
    </View>
  );
}

function StorageRestoreSheet({
  count,
  checked,
  onToggle,
  onCancel,
  onConfirm,
}: {
  count: number;
  checked: boolean;
  onToggle: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const sheetMotion = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    sheetMotion.setValue(1);
    Animated.timing(sheetMotion, {
      toValue: 0,
      duration: 240,
      useNativeDriver: false,
    }).start();
  }, [sheetMotion]);

  return (
    <View style={styles.storageDeleteOverlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
      <BottomSheetPanel motion={sheetMotion} outputRange={[0, 360]} style={styles.storageDeleteSheet} onClose={onCancel}>
        <Text style={styles.storageDeleteTitle}>정리함으로 복구할까요?</Text>
        <View style={styles.storageRestoreInfoBox}>
          <Text style={styles.storageDeleteWarningTitle}>정리함으로 다시 이동됩니다</Text>
          <Text style={styles.storageDeleteWarningText}>선택한 {count}개 항목이 정리함으로 복구됩니다</Text>
        </View>
        <CheckLine label="복구 내용을 확인했습니다" checked={checked} onPress={onToggle} />
        <View style={styles.twoButtons}>
          <OutlineButton title="취소" onPress={onCancel} half />
          <Pressable style={[styles.storageRestoreButton, !checked && styles.restoreButtonDisabled, styles.halfButton]} onPress={onConfirm}>
            <Text style={styles.restoreText}>복구하기</Text>
          </Pressable>
        </View>
      </BottomSheetPanel>
    </View>
  );
}

function StorageMoveSheet({
  item,
  folders,
  onCancel,
  onMove,
}: {
  item: StorageDriveItem;
  folders: string[];
  onCancel: () => void;
  onMove: (folder: string) => void;
}) {
  const sheetMotion = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    sheetMotion.setValue(1);
    Animated.timing(sheetMotion, {
      toValue: 0,
      duration: 240,
      useNativeDriver: false,
    }).start();
  }, [sheetMotion]);

  return (
    <View style={styles.storageDeleteOverlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
      <BottomSheetPanel motion={sheetMotion} outputRange={[0, 420]} style={styles.storageMoveSheet} onClose={onCancel}>
        <View style={styles.infoMain}>
          <Text style={styles.storageDeleteTitle}>폴더 이동</Text>
          <Text style={styles.infoDesc}>{item.title}을 이동할 위치를 선택하세요</Text>
        </View>
        <View style={styles.storageMoveCurrentBox}>
          <Text style={styles.infoTitle}>{item.title}</Text>
          <Text style={styles.infoDesc}>{item.subtitle}</Text>
        </View>
        <View style={styles.storageMoveTargetList}>
          {folders.map((folder) => (
            <Pressable key={folder} style={styles.storageMoveTargetRow} onPress={() => onMove(folder)}>
              <View style={styles.folderTypeIcon}>
                <Text style={styles.folderTypeText}>—</Text>
              </View>
              <View style={styles.infoMain}>
                <Text style={styles.infoTitle}>{getDriveFolderName(folder)}</Text>
                <Text style={styles.infoDesc}>{folder}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>
      </BottomSheetPanel>
    </View>
  );
}

function StorageMailCard({
  prefix,
  item,
  checked,
  toggle,
  selectionMode,
  onOpen,
  onLongSelect,
  compact,
  trashMode,
}: {
  prefix: string;
  item: { id: string; title: string; subtitle: string; meta: string; badge?: string };
  checked: boolean;
  toggle: (key: string) => void;
  selectionMode: boolean;
  onOpen: (item: StorageMailItem) => void;
  onLongSelect: (id: string) => void;
  compact?: boolean;
  trashMode?: 'mail' | 'drive';
}) {
  const key = `${prefix}:${item.id}`;
  const storageSizeMB = extractStorageSizeMB(item.meta);
  const rightSizeLabel = trashMode ? getStorageSizeLabel(item.meta) : '';
  const isLargeTrashDriveItem = trashMode === 'drive' && storageSizeMB >= 500;
  const compactTitle = trashMode === 'drive' ? item.title : item.subtitle;
  const compactDescription = trashMode === 'drive' ? getTrashDriveFolderPath(item.meta) : item.title;
  return (
    <Pressable
      style={[styles.storageItemCard, compact && styles.storageItemCardCompact]}
      onPress={() => {
        if (selectionMode) {
          toggle(key);
          return;
        }
        onOpen(item);
      }}
      onLongPress={() => onLongSelect(item.id)}
      delayLongPress={420}
    >
      {selectionMode ? <CheckBox checked={checked} onPress={() => toggle(key)} compact /> : null}
      <View style={styles.infoMain}>
        <View style={[styles.storageTitleRow, compact && styles.storageTitleRowCompact]}>
          <Text style={styles.infoTitle} numberOfLines={1}>{compact ? compactTitle : item.subtitle}</Text>
        </View>
        {compact ? <Text style={styles.storageCompactMeta} numberOfLines={1}>{compactDescription}</Text> : <Text style={styles.infoDesc}>{item.meta}</Text>}
      </View>
      {rightSizeLabel ? <Text style={[styles.storageRightSize, isLargeTrashDriveItem && styles.storageRightSizeDanger]}>{rightSizeLabel}</Text> : null}
      <Pressable
        style={styles.storageChevronButton}
        onPress={(event) => {
          event.stopPropagation?.();
          onOpen(item);
        }}
      >
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </Pressable>
  );
}

function StorageDriveCard({
  prefix,
  item,
  checked,
  toggle,
  selectionMode,
  onOpen,
  onLongSelect,
  onSelect,
  compact,
  descriptionOverride,
  rightSizeLabel,
  rightSizeDanger,
}: {
  prefix: string;
  item: StorageDriveItem;
  checked: boolean;
  toggle: (key: string) => void;
  selectionMode: boolean;
  onOpen: () => void;
  onLongSelect: () => void;
  onSelect?: () => void;
  compact?: boolean;
  descriptionOverride?: string;
  rightSizeLabel?: string;
  rightSizeDanger?: boolean;
}) {
  const isFolder = item.type === 'F';
  const key = `${prefix}:${item.id}`;
  const handleSelect = () => {
    if (onSelect) {
      onSelect();
      return;
    }
    toggle(key);
  };
  return (
    <Pressable
      style={[styles.storageItemCard, compact && styles.storageItemCardCompact]}
      onPress={() => {
        if (selectionMode) {
          handleSelect();
          return;
        }
        onOpen();
      }}
      onLongPress={onLongSelect}
      delayLongPress={420}
    >
      {selectionMode ? <CheckBox checked={checked} onPress={handleSelect} compact /> : null}
      <View
        style={styles.storageDriveItemPressArea}
      >
        {isFolder ? (
          <FolderOutlineIcon />
        ) : (
          <FileOutlineIcon type={item.type} />
        )}
        <View style={styles.infoMain}>
          <Text style={styles.infoTitle}>{item.title}</Text>
          {descriptionOverride ? (
            <Text style={styles.storageCompactMeta} numberOfLines={1}>{descriptionOverride}</Text>
          ) : compact ? null : (
            <Text style={styles.infoDesc}>{item.subtitle}</Text>
          )}
        </View>
      </View>
      {rightSizeLabel ? <Text style={[styles.storageRightSize, rightSizeDanger && styles.storageRightSizeDanger]}>{rightSizeLabel}</Text> : null}
      <Pressable
        style={styles.storageChevronButton}
        onPress={(event) => {
          event.stopPropagation?.();
          onOpen();
        }}
      >
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </Pressable>
  );
}

function ProtectedListScreen({ items, onOpenItem }: { items: ScanListItem[]; onOpenItem: (item: ScanListItem) => void }) {
  return (
    <ScreenShell title="보호된 항목">
      {items.length ? (
        items.map((item) => (
          <Pressable key={`${item.source}:${item.id}`} style={styles.listCard} onPress={() => onOpenItem(item)}>
            <View style={[styles.statusLight, styles.statusLightGreen]} />
            <View style={styles.infoMain}>
              <Text style={styles.infoTitle}>{item.title}</Text>
              <Text style={styles.infoDesc}>{item.source === 'mail' ? 'Gmail' : 'Drive'} · 제외 키워드 보호</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))
      ) : (
        <EmptyState title="보호된 항목이 없어요" desc="제외 키워드와 일치한 항목이 있으면 이곳에 표시돼요." />
      )}
    </ScreenShell>
  );
}

function ListScreen({
  title,
  prefix,
  items,
  checked,
  toggle,
  setAll,
  goNext,
  openFilter,
  notice,
  onOpenItem,
}: {
  title: string;
  prefix: string;
  items: ScanListItem[];
  checked: Record<string, boolean>;
  toggle: (key: string) => void;
  setAll: (prefix: string, keys: string[]) => void;
  goNext: () => void;
  openFilter: () => void;
  notice?: string;
  onOpenItem?: (item: ScanListItem) => void;
}) {
  const allChecked = items.every((item) => checked[`${prefix}:${item.id}`] ?? isDefaultCandidateSelected(prefix, item.id));
  const selectedItems = items.filter((item) => checked[`${prefix}:${item.id}`] ?? isDefaultCandidateSelected(prefix, item.id));
  const selectedCount = selectedItems.length;
  const selectedSizeLabel = formatDataSize(sumScanItemSize(selectedItems));

  const noticeParts = notice?.split('\n') ?? [];

  return (
    <ScreenShell title={title}>
      {notice ? (
        <Text style={styles.listNoticeText}>
          {noticeParts[0]}
          {noticeParts.slice(1).map((part) => (
            <Text key={part} style={styles.listNoticeDanger}>{'\n'}{part}</Text>
          ))}
        </Text>
      ) : null}
      <Pressable style={styles.selectAllRow} onPress={() => setAll(prefix, items.map((item) => item.id))}>
        <CheckBox checked={allChecked} onPress={() => setAll(prefix, items.map((item) => item.id))} />
        <Text style={styles.selectAllText}>{allChecked ? '전체 선택 해제' : '전체 선택'}</Text>
        <Pressable onPress={openFilter} hitSlop={8}>
          <Text style={styles.filterText}>필터</Text>
        </Pressable>
      </Pressable>
      {items.map((item) => (
        <Pressable key={item.id} style={styles.listCard} onPress={() => (onOpenItem ? onOpenItem(item) : toggle(`${prefix}:${item.id}`))}>
          <CheckBox checked={checked[`${prefix}:${item.id}`] ?? isDefaultCandidateSelected(prefix, item.id)} onPress={() => toggle(`${prefix}:${item.id}`)} />
          <View style={styles.infoMain}>
            <Text style={styles.infoTitle}>{item.title}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}
      <Text style={styles.resultSummary}>선택 {selectedCount}개 · 예상 확보 {selectedSizeLabel}</Text>
      <PrimaryButton title="분석 화면 돌아가기" onPress={goNext} />
    </ScreenShell>
  );
}

function CheckLine({ label, checked, onPress }: { label: string; checked?: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.checkLine} onPress={onPress}>
      <CheckBox checked={Boolean(checked)} onPress={onPress} />
      <Text style={styles.consentText}>{label}</Text>
    </Pressable>
  );
}

function CheckBox({ checked, onPress, compact }: { checked: boolean; onPress: () => void; compact?: boolean }) {
  return (
    <Pressable
      onPress={(event) => {
        event.stopPropagation?.();
        onPress();
      }}
      style={[styles.checkbox, compact && styles.checkboxCompact, checked && styles.checkboxChecked]}
    >
      {checked ? <Text style={[styles.checkMark, compact && styles.checkMarkCompact]}>✓</Text> : null}
    </Pressable>
  );
}

function ServiceLinkRow({ service, title, connected, onPress }: { service: 'gmail' | 'drive'; title: string; connected: boolean; onPress: () => void }) {
  const iconSource = service === 'gmail' ? gmailIcon : googleDriveIcon;

  return (
    <Pressable style={styles.serviceLinkRow} onPress={onPress}>
      <View style={styles.serviceIconBox}>
        <Image source={iconSource} style={styles.serviceIconImage} resizeMode="contain" />
      </View>
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{title}</Text>
        <View style={styles.connectedPill}>
          <Text style={styles.connectedPillText}>{connected ? '연결됨' : '연결안됨'}</Text>
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function ToggleRow({
  title,
  desc,
  value,
  onPress,
  plain,
  tint,
}: {
  title: string;
  desc?: string;
  value: boolean;
  onPress: () => void;
  plain?: boolean;
  tint?: boolean;
}) {
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: value ? 1 : 0,
      duration: 230,
      useNativeDriver: false,
    }).start();
  }, [value, progress]);

  const knobTranslate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });
  const trackColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['#DFF6E6', navy],
  });

  return (
    <Pressable style={[styles.toggleRow, plain && styles.toggleRowPlain, tint && styles.toggleRowTint]} onPress={onPress}>
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{title}</Text>
        {desc ? <Text style={styles.infoDesc}>{desc}</Text> : null}
      </View>
      <Animated.View style={[styles.toggle, { backgroundColor: trackColor }]}>
        <Animated.View style={[styles.toggleKnob, { transform: [{ translateX: knobTranslate }] }]} />
      </Animated.View>
    </Pressable>
  );
}

function PrimaryButton({ title, onPress, half, inline }: { title: string; onPress: () => void; half?: boolean; inline?: boolean }) {
  return (
    <Pressable style={[styles.primaryButton, !half && !inline && styles.primaryButtonLower, half && styles.halfButton]} onPress={onPress}>
      <Text style={styles.primaryText}>{title}</Text>
    </Pressable>
  );
}

function OutlineButton({ title, onPress, half, danger }: { title: string; onPress: () => void; half?: boolean; danger?: boolean }) {
  return (
    <Pressable style={[styles.outlineButton, danger && styles.outlineButtonDanger, half && styles.halfButton]} onPress={onPress}>
      <Text style={[styles.outlineText, danger && styles.outlineTextDanger]}>{title}</Text>
    </Pressable>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function Body({ children }: { children: React.ReactNode }) {
  return <Text style={styles.body}>{children}</Text>;
}

function PrivacyBody({ children }: { children: React.ReactNode }) {
  return <Text style={styles.privacyBody}>{children}</Text>;
}

function Chip({
  label,
  removable,
  selected,
  onPress,
  onRemove,
}: {
  label: string;
  removable?: boolean;
  selected?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
}) {
  if (removable) {
    return (
      <Pressable style={[styles.chip, styles.removableChip]} onPress={onRemove}>
        <Text style={styles.chipText}>{label}</Text>
        <Text style={styles.removeChipText}>×</Text>
      </Pressable>
    );
  }

  if (onPress) {
    return (
      <Pressable style={[styles.chip, selected && styles.chipSelected]} onPress={onPress}>
        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function PreviewCard({ label }: { label: string }) {
  return (
    <View style={styles.previewCard}>
      <Text style={styles.previewText}>{label}</Text>
    </View>
  );
}

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <View style={styles.emptyStateCard}>
      <View style={styles.emptyStateIcon}>
        <Text style={styles.emptyStateIconText}>—</Text>
      </View>
      <Text style={styles.emptyStateTitle}>{title}</Text>
      <Text style={styles.emptyStateDesc}>{desc}</Text>
    </View>
  );
}

function GhostScanAnimation({ onDone, skip }: { onDone: () => void; skip?: boolean }) {
  const doneCalled = useRef(false);

  useEffect(() => {
    const doneTimer = setTimeout(() => {
      if (!doneCalled.current) {
        doneCalled.current = true;
        onDone();
      }
    }, skip ? 0 : 450);

    return () => {
      clearTimeout(doneTimer);
    };
  }, [onDone, skip]);

  return (
    <View style={styles.ghostPreviewCard}>
      <Text style={styles.ghostPreviewTitle}>분석 결과 요약</Text>
      <View style={styles.resultMetricGrid}>
        <ResultMetricCard label="정리 후보" value="8개" />
        <ResultMetricCard label="예상 확보" value="2.1GB" />
      </View>
      <ResultCategoryCard title="광고·프로모션 메일" desc="2개 · 93MB" onPress={() => undefined} />
      <ResultCategoryCard title="오래된 메일" desc="0개 · 0.0MB" onPress={() => undefined} />
      <ResultCategoryCard title="오래된 파일" desc="5개 · 1.2GB" onPress={() => undefined} />
      <ResultCategoryCard title="중복 파일" desc="2개 · 2.0GB" warning="미선택 2개" onPress={() => undefined} />
      <ResultCategoryCard title="대용량 파일" desc="1개 · 760MB" onPress={() => undefined} />
    </View>
  );
}

function CarbonSaveAnimation({ onDone, skip }: { onDone: () => void; skip?: boolean }) {
  const [step, setStep] = useState(skip ? 2 : 0);
  const doneCalled = useRef(false);

  useEffect(() => {
    if (skip) {
      setStep(2);
      return;
    }

    const firstTimer = setTimeout(() => setStep(1), 600);
    const secondTimer = setTimeout(() => setStep(2), 1150);
    const doneTimer = setTimeout(() => {
      if (!doneCalled.current) {
        doneCalled.current = true;
        onDone();
      }
    }, 1850);

    return () => {
      clearTimeout(firstTimer);
      clearTimeout(secondTimer);
      clearTimeout(doneTimer);
    };
  }, [skip]);

  return (
    <View style={styles.carbonPreviewCard}>
      <View style={styles.historyTotalMiniCard}>
        <View>
          <Text style={styles.onboardingMetricLabel}>전체 누적 삭제 용량</Text>
          <Text style={styles.historyTotalMiniValue}>{step >= 1 ? '6.8GB' : '...'}</Text>
        </View>
        <View style={styles.historyMiniPill}>
          <Text style={styles.historyMiniPillText}>최근 스캔 +2.6GB</Text>
        </View>
      </View>
      <SectionTitle>스캔별 확보 용량 현황</SectionTitle>
      <CarbonStatsGraph sizeLabel="2.6GB" />
    </View>
  );
}

function StorageDetailScreen({ item, apiAccessToken }: { item: StorageDetailItem | null; apiAccessToken: string | null }) {
  const [apiDetail, setApiDetail] = useState<ApiStorageDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    if (!item || !apiAccessToken || (!item.itemId && !item.externalItemId)) {
      setApiDetail(null);
      setDetailError('');
      setDetailLoading(false);
      return;
    }

    let active = true;
    setDetailLoading(true);
    setDetailError('');

    const request = item.itemId
      ? storageApi.getItemDetail(item.itemId, { accessToken: apiAccessToken })
      : storageApi.getLiveDetail(
          {
            item_source: item.itemSource ?? (item.source === 'drive' ? 'DRIVE' : 'GMAIL'),
            external_item_id: item.externalItemId!,
          },
          { accessToken: apiAccessToken }
        );

    void request
      .then((detail) => {
        if (active) setApiDetail(detail ?? null);
      })
      .catch((error) => {
        if (active) setDetailError(getErrorMessage(error, '저장소 상세 정보를 불러오지 못했어요'));
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });

    return () => {
      active = false;
    };
  }, [apiAccessToken, item?.externalItemId, item?.itemId, item?.itemSource, item?.source]);

  if (!item) {
    return (
      <ScreenShell title="상세 보기">
        <EmptyState title="상세 정보를 불러올 항목이 없어요" desc="정리함 목록에서 항목을 다시 선택해 주세요." />
      </ScreenShell>
    );
  }

  const detailRows = [
    ['서버 item_id', apiDetail?.item_id ?? item.itemId],
    ['외부 항목 ID', apiDetail?.external_item_id ?? item.externalItemId],
    ['항목 출처', apiDetail?.item_source ?? item.itemSource],
    ['제목', apiDetail?.title ?? item.snapshotTitle],
    ['용량', formatBytes(apiDetail?.size_bytes ?? item.snapshotSizeBytes)],
    ['폴더', apiDetail?.folder_path],
    ['보낸 사람', apiDetail?.sender_email],
    ['소유자', apiDetail?.owner_email],
    ['수정일', apiDetail?.modified_time ? formatApiDate(apiDetail.modified_time) : undefined],
    ['휴지통 여부', apiDetail?.is_trashed === undefined ? undefined : apiDetail.is_trashed ? '예' : '아니오'],
  ].filter(([, value]) => value !== undefined && value !== null && value !== '');

  return (
    <ScreenShell title="상세 보기">
      <Text style={styles.detailMainTitle}>{item.title}</Text>
      <View style={styles.itemPreviewBox}>
        <Text style={styles.itemPreviewText}>{item.source === 'mail' ? 'Gmail 메타데이터' : 'Drive 메타데이터'}</Text>
      </View>
      <View style={styles.detailInfoBox}>
        <Text style={styles.detailInfoTitle}>메타데이터</Text>
        <Text style={styles.detailInfoText}>{item.meta}</Text>
      </View>
      <View style={styles.detailInfoBox}>
        <Text style={styles.detailInfoTitle}>서버 상세 정보</Text>
        {detailLoading ? <Text style={styles.detailInfoText}>상세 정보를 불러오는 중...</Text> : null}
        {detailRows.length ? (
          detailRows.map(([label, value]) => (
            <Text key={label} style={styles.detailInfoText}>
              {label}: {formatUnknownValue(value)}
            </Text>
          ))
        ) : !detailLoading ? (
          <Text style={styles.detailInfoText}>서버 상세 정보가 아직 없어요.</Text>
        ) : null}
        {detailError ? <Text style={styles.warningText}>{detailError}</Text> : null}
      </View>
    </ScreenShell>
  );
}

function CenterIcon({ label }: { label: string }) {
  return (
    <View style={styles.centerIcon}>
      <Text style={styles.centerIconText}>{label}</Text>
    </View>
  );
}

function ConnectedInfoRow({
  service,
  title,
  status,
  visible,
}: {
  service: 'gmail' | 'drive';
  title: string;
  status: '연결됨' | '연결안됨';
  visible: boolean;
}) {
  const connectedInstant = useContext(NavigationContext)?.connectedInstant ?? false;
  const iconSource = service === 'gmail' ? gmailIcon : googleDriveIcon;

  return (
    <View style={styles.infoRow}>
      <Image source={iconSource} style={styles.connectedServiceIcon} resizeMode="contain" />
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{title}</Text>
      </View>
      <View style={styles.connectedRightSlot}>
        {visible ? (
          <RevealIn duration={connectedInstant ? 0 : 460} distance={connectedInstant ? 0 : 7}>
            <View style={[styles.statusLight, status === '연결됨' ? styles.statusLightGreen : styles.statusLightRed]} />
          </RevealIn>
        ) : null}
      </View>
    </View>
  );
}

function RevealIn({
  children,
  style,
  duration = 260,
  distance = 8,
}: {
  children: React.ReactNode;
  style?: object;
  duration?: number;
  distance?: number;
}) {
  const motion = useRef(new Animated.Value(duration <= 0 ? 1 : 0)).current;

  useEffect(() => {
    if (duration <= 0) {
      motion.setValue(1);
      return;
    }

    Animated.timing(motion, {
      toValue: 1,
      duration,
      useNativeDriver: false,
    }).start();
  }, []);

  if (duration <= 0) {
    return <View style={style}>{children}</View>;
  }

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: motion,
          transform: [
            {
              translateY: motion.interpolate({
                inputRange: [0, 1],
                outputRange: [distance, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

function ConnectedSuccessIcon({ onDone, skip }: { onDone: () => void; skip?: boolean }) {
  const [progress, setProgress] = useState(skip ? 100 : 0);
  const [completed, setCompleted] = useState(Boolean(skip));
  const rotate = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(0)).current;
  const doneCalled = useRef(false);

  useEffect(() => {
    if (skip) {
      setProgress(100);
      setCompleted(true);
      return;
    }

    const spin = Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 420,
        useNativeDriver: false,
      })
    );
    spin.start();

    const startedAt = Date.now();
    const timer = setInterval(() => {
      const next = Math.min(100, Math.round(((Date.now() - startedAt) / 450) * 100));
      setProgress(next);

      if (next >= 100) {
        clearInterval(timer);
        spin.stop();
        setCompleted(true);
        Animated.sequence([
          Animated.timing(bounce, {
            toValue: -10,
            duration: 130,
            useNativeDriver: false,
          }),
          Animated.spring(bounce, {
            toValue: 0,
            friction: 4,
            tension: 90,
            useNativeDriver: false,
          }),
        ]).start(({ finished }) => {
          if (finished && !doneCalled.current) {
            doneCalled.current = true;
            onDone();
          }
        });
      }
    }, 20);

    return () => {
      clearInterval(timer);
      spin.stop();
    };
  }, [skip]);

  const spinValue = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.connectedIconWrap}>
      <Animated.View
        style={[
          styles.connectedRing,
          {
            borderTopColor: navy,
            borderRightColor: progress >= 34 ? navy : line,
            borderBottomColor: progress >= 67 ? navy : line,
            borderLeftColor: progress >= 100 ? navy : line,
            transform: [{ rotate: spinValue }],
          },
        ]}
      />
      <Animated.View style={[styles.connectedIconInner, { transform: [{ translateY: bounce }] }]}>
        <Text style={completed ? styles.connectedCheckText : styles.connectedProgressText}>
          {completed ? '✓' : `${progress}%`}
        </Text>
      </Animated.View>
    </View>
  );
}

function ProgressCircle({ progress, compact }: { progress: number; compact?: boolean }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1150,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.progressCircle, compact && styles.progressCircleCompact]}>
      <Animated.View
        style={[
          styles.progressSpinnerRing,
          compact && styles.progressSpinnerRingCompact,
          { transform: [{ rotate }] },
        ]}
      />
      <Text style={[styles.progressText, compact && styles.progressTextCompact]}>{progress}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    backgroundColor: '#FFFFFF',
  },
  phone: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
  },
  screenTransition: {
    flex: 1,
  },
  scanOverlayScreen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scanOverlayHomePreview: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 188,
    paddingTop: 28,
    paddingHorizontal: 14,
    opacity: 0.38,
    backgroundColor: '#FFFFFF',
  },
  scanSidePanel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 270,
    paddingHorizontal: 14,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderLeftColor: line,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: -8, height: 0 },
    elevation: 12,
  },
  scanPanelHeader: {
    minHeight: 92,
    borderBottomWidth: 1,
    borderBottomColor: line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 12,
  },
  scanCloseButton: {
    width: 24,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginRight: 4,
  },
  scanPanelSubtitle: {
    marginTop: 5,
    color: mutedText,
    fontSize: 12.5,
    fontWeight: '900',
    lineHeight: 17,
  },
  scanFullContent: {
    flex: 1,
    gap: 12,
    paddingBottom: 118,
  },
  scanFullPanel: {
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 13,
    paddingVertical: 24,
  },
  scanFullKicker: {
    color: text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
  },
  scanFullStatusText: {
    color: mutedText,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
  },
  scanFullStatusGrid: {
    gap: 10,
    marginBottom: 28,
  },
  scanProgressSpacer: {
    flex: 1,
    minHeight: 20,
  },
  toastOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 64,
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: 'rgba(87, 200, 121, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    zIndex: 999,
    elevation: 999,
    shadowColor: '#57C879',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  toastOverlayAboveSheet: {
    bottom: 356,
  },
  toastPressable: {
    width: '100%',
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    lineHeight: 21,
    fontWeight: '900',
    textAlign: 'center',
    flexShrink: 1,
    width: '100%',
  },
  toastHintText: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 10.5,
    fontWeight: '800',
    textAlign: 'center',
  },
  shell: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  shellTint: {
    backgroundColor: '#F2FFF7',
  },
  modalScreenRoot: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 72,
    paddingTop: 0,
    paddingHorizontal: 18,
    borderBottomWidth: 0,
    justifyContent: 'center',
  },
  headerNoBack: {
    height: 72,
    borderBottomWidth: 0,
  },
  statusOnly: {
    height: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  statusBarRow: {
    height: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusTime: {
    color: text,
    fontSize: 15,
    fontWeight: '900',
  },
  statusDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 3,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: text,
  },
  headerTitleRow: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  headerTitleRowNoBack: {
    marginLeft: 8,
  },
  headerInsetRule: {
    height: 1,
    backgroundColor: line,
    marginTop: 8,
  },
  headerTitleRowSingle: {
    alignItems: 'center',
  },
  backGlyph: {
    width: 24,
    fontSize: 31,
    color: text,
    fontWeight: '700',
    lineHeight: 31,
  },
  backButton: {
    width: 30,
    height: 34,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerTitleContent: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  headerTitleIcon: {
    width: 27,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flexShrink: 1,
    color: text,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 5,
    color: mutedText,
    fontSize: 12.5,
    fontWeight: '900',
    lineHeight: 17,
  },
  more: {
    color: text,
    fontSize: 22,
    fontWeight: '900',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 18,
    paddingBottom: 92,
    gap: 12,
    flexGrow: 1,
  },
  contentInnerCompact: {
    paddingTop: 10,
  },
  contentInnerTightBottom: {
    paddingBottom: 32,
  },
  resultBottomSpacer: {
    height: 20,
  },
  heroSpacer: {
    height: 78,
  },
  logoImage: {
    width: 56,
    height: 56,
    borderRadius: 0,
  },
  logoImageMedium: {
    width: 118,
    height: 118,
    borderRadius: 0,
    alignSelf: 'center',
    marginTop: 18,
    marginBottom: 16,
  },
  logoImageLarge: {
    width: 248,
    height: 248,
    borderRadius: 0,
    alignSelf: 'center',
  },
  logoText: {
    flex: 1,
    color: text,
    fontSize: 25,
    fontWeight: '900',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 58,
  },
  homeRule: {
    height: 1,
    backgroundColor: line,
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 22,
  },
  heroTitle: {
    marginTop: 34,
    marginBottom: 24,
    color: text,
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '900',
  },
  heroTitleBrand: {
    color: navy,
  },
  primaryButton: {
    height: 50,
    borderRadius: 18,
    backgroundColor: navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...gentleShadow,
  },
  primaryButtonLower: {
    marginTop: 'auto',
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  outlineButton: {
    height: 48,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: line,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    backgroundColor: '#FFFFFF',
  },
  outlineButtonDanger: {
    borderColor: '#D92F36',
  },
  outlineText: {
    color: text,
    fontSize: 15,
    fontWeight: '800',
  },
  outlineTextDanger: {
    color: '#D92F36',
  },
  halfButton: {
    flex: 1,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 28,
    alignSelf: 'center',
  },
  privacyAgreeRow: {
    alignSelf: 'stretch',
    marginTop: 6,
  },
  initialConsentCard: {
    minHeight: 74,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 13,
  },
  initialConsentTextBox: {
    flex: 1,
    gap: 6,
  },
  initialConsentTitle: {
    color: text,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '900',
  },
  initialConsentSub: {
    color: mutedText,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '800',
  },
  initialConsentLink: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    marginBottom: 10,
    width: 260,
    minHeight: 38,
  },
  initialActionBlock: {
    marginTop: 4,
    gap: 4,
  },
  initialConsentLinkTextBox: {
    alignItems: 'center',
    width: 260,
    alignSelf: 'center',
  },
  initialConsentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  initialConsentLinkText: {
    color: text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
  },
  initialConsentLinkLine: {
    marginTop: 9,
    width: 218,
    height: 1,
    backgroundColor: line,
  },
  consentText: {
    color: text,
    fontSize: 14,
    fontWeight: '900',
  },
  consentUnderlineRow: {
    paddingRight: 22,
    paddingBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: line,
  },
  helperText: {
    textAlign: 'center',
    color: mutedText,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: navy,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCompact: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.3,
  },
  checkboxChecked: {
    backgroundColor: navy,
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
  },
  checkMarkCompact: {
    fontSize: 14,
    lineHeight: 17,
  },
  card: {
    borderWidth: 0,
    borderColor: line,
    borderRadius: 22,
    padding: 16,
    backgroundColor: '#FFFFFF',
    gap: 8,
    ...softShadow,
  },
  cardTint: {
    backgroundColor: pale,
  },
  privacyStatusCard: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  privacyStatusText: {
    marginTop: 8,
    color: text,
    fontSize: 19,
    fontWeight: '900',
  },
  privacyCheckIcon: {
    color: text,
    fontSize: 34,
    fontWeight: '900',
  },
  privacyCombinedCard: {
    minHeight: 366,
    paddingHorizontal: 18,
    paddingVertical: 22,
    gap: 28,
  },
  privacyBlock: {
    gap: 14,
  },
  privacyInfoCard: {
    minHeight: 142,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 18,
  },
  privacyRetentionCard: {
    minHeight: 82,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 12,
  },
  capacityCard: {
    minHeight: 82,
    justifyContent: 'center',
    borderRadius: 20,
    paddingHorizontal: 15,
  },
  capacityCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  capacityUsageBox: {
    width: 116,
    gap: 8,
  },
  capacityUsageText: {
    color: navy,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '800',
  },
  capacityUsageTrack: {
    height: 9,
    borderRadius: 9,
    backgroundColor: '#EAF9EF',
    overflow: 'hidden',
  },
  capacityUsageFill: {
    height: '100%',
    borderRadius: 9,
    backgroundColor: navy,
  },
  homeActionSpacer: {
    height: 0,
  },
  homeSummaryCard: {
    minHeight: 154,
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  homeSummaryCapacityRow: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  homeSummaryValue: {
    color: text,
    fontSize: 30,
    fontWeight: '800',
  },
  homeSummaryCapacityLabel: {
    minWidth: 110,
    color: text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  homeTrashIconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: line,
    ...gentleShadow,
  },
  homeTrashIconText: {
    fontSize: 24,
    lineHeight: 30,
  },
  homeEmptySummary: {
    minHeight: 96,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
    gap: 12,
  },
  homeEmptyTitle: {
    color: mutedText,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  homeEmptyDesc: {
    color: mutedText,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },
  sectionTitle: {
    color: text,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  body: {
    color: text,
    fontSize: 15,
    lineHeight: 27,
    fontWeight: '800',
  },
  privacyBody: {
    color: text,
    fontSize: 13.5,
    lineHeight: 24,
    fontWeight: '800',
  },
  infoRow: {
    minHeight: 72,
    borderWidth: 0,
    borderColor: line,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    ...gentleShadow,
  },
  permissionRow: {
    minHeight: 72,
    borderWidth: 0,
    borderColor: line,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    ...gentleShadow,
  },
  permissionDetailButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -8,
  },
  permissionFeatureCard: {
    minHeight: 70,
    borderWidth: 0,
    borderColor: line,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    ...gentleShadow,
  },
  permissionFeatureIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: pale,
    borderWidth: 1,
    borderColor: line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionFeatureCheck: {
    color: navy,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 19,
  },
  permissionBlockedCard: {
    minHeight: 78,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  permissionBlockedText: {
    color: mutedText,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
  },
  permissionReasonCard: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 18,
    minHeight: 390,
  },
  pushPermissionReasonCard: {
    marginTop: 0,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 14,
    minHeight: 0,
  },
  permissionReasonSection: {
    gap: 9,
  },
  permissionReasonDescription: {
    color: text,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '900',
  },
  permissionReasonTitle: {
    color: text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },
  permissionReasonText: {
    color: text,
    fontSize: 13,
    lineHeight: 22,
    fontWeight: '800',
  },
  permissionReasonNote: {
    borderTopWidth: 1,
    borderTopColor: line,
    paddingTop: 14,
    marginTop: 2,
  },
  permissionReasonNoteText: {
    color: navy,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '900',
  },
  infoMain: {
    flex: 1,
    gap: 5,
  },
  infoTitle: {
    color: text,
    fontSize: 16,
    fontWeight: '900',
  },
  infoDesc: {
    color: mutedText,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  chevron: {
    color: text,
    fontSize: 28,
    fontWeight: '900',
  },
  rowRight: {
    color: navy,
    fontSize: 12,
    fontWeight: '900',
  },
  rowRightMuted: {
    color: mutedText,
  },
  flexGrow: {
    flex: 1,
    minHeight: 120,
  },
  pushPermissionButtonSpacer: {
    height: 18,
  },
  centerTitle: {
    color: text,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '900',
    marginVertical: 12,
  },
  centerTitleSpace: {
    height: 52,
  },
  connectedIconWrap: {
    width: 112,
    height: 112,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 10,
  },
  connectedRing: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 5,
    borderColor: line,
  },
  connectedIconInner: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: pale,
    borderWidth: 1,
    borderColor: line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectedProgressText: {
    color: navy,
    fontSize: 20,
    fontWeight: '900',
  },
  connectedCheckText: {
    color: navy,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '900',
  },
  connectedButtonReveal: {
    marginTop: 'auto',
  },
  connectedButtonPlaceholder: {
    marginTop: 'auto',
    height: 50,
  },
  connectedRightSlot: {
    width: 34,
    minHeight: 18,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  statusLight: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  statusLightGreen: {
    backgroundColor: navy,
  },
  statusLightRed: {
    backgroundColor: '#D94A4A',
  },
  statusLightYellow: {
    backgroundColor: '#F0C342',
  },
  centerBody: {
    color: text,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 22,
    marginVertical: 18,
  },
  centerIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: pale,
    borderWidth: 1.5,
    borderColor: line,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 40,
  },
  centerIconText: {
    color: navy,
    fontSize: 42,
    fontWeight: '900',
  },
  previewCard: {
    height: 190,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: line,
    backgroundColor: pale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: {
    color: mutedText,
    fontSize: 15,
    fontWeight: '900',
  },
  emptyStateCard: {
    minHeight: 220,
    borderRadius: 16,
    borderWidth: 0,
    borderColor: line,
    backgroundColor: pale,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 10,
    ...gentleShadow,
  },
  emptyStateIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  emptyStateIconText: {
    color: mutedText,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
  },
  emptyStateTitle: {
    color: text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyStateDesc: {
    color: mutedText,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  onboardingButtonReveal: {
    marginTop: 'auto',
  },
  onboardingButtonPlaceholder: {
    marginTop: 'auto',
    height: 50,
  },
  onboardingDescriptionRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
    alignSelf: 'stretch',
    paddingLeft: 42,
    paddingRight: 24,
    marginVertical: 12,
  },
  onboardingDescriptionIcon: {
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onboardingDescriptionText: {
    flexShrink: 1,
    marginVertical: 0,
    textAlign: 'left',
  },
  auraFeelReveal: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    marginBottom: 6,
  },
  auraFeelPlaceholder: {
    minHeight: 48,
    marginTop: 0,
    marginBottom: 6,
  },
  auraFeelText: {
    color: text,
    textAlign: 'center',
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  auraFeelTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  auraFeelBrand: {
    color: navy,
    fontSize: 24,
    textShadowColor: '#DDF8E6',
    textShadowRadius: 8,
  },
  ghostPreviewCard: {
    height: 330,
    borderRadius: 24,
    borderWidth: 0,
    borderColor: line,
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 10,
    overflow: 'hidden',
    ...softShadow,
  },
  ghostPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ghostPreviewTitle: {
    color: text,
    fontSize: 18,
    fontWeight: '900',
  },
  onboardingIntroContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  onboardingIntroTextBox: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
  },
  onboardingIntroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  onboardingIntroTitleText: {
    color: text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '900',
  },
  onboardingIntroBody: {
    color: text,
    textAlign: 'center',
    fontSize: 20,
    lineHeight: 29,
    fontWeight: '900',
  },
  ghostPreviewPercent: {
    color: navy,
    fontSize: 13,
    fontWeight: '900',
  },
  onboardingMetricGrid: {
    height: 76,
    flexDirection: 'row',
    gap: 12,
  },
  onboardingMetricCard: {
    flex: 1,
    borderWidth: 0,
    borderColor: line,
    borderRadius: 18,
    backgroundColor: pale,
    paddingHorizontal: 14,
    paddingVertical: 11,
    justifyContent: 'center',
    gap: 5,
  },
  onboardingMetricLabel: {
    color: mutedText,
    fontSize: 9.5,
    fontWeight: '900',
  },
  onboardingMetricValue: {
    color: text,
    fontSize: 20,
    fontWeight: '900',
  },
  ghostDataPanel: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 0,
    borderColor: line,
    backgroundColor: 'transparent',
    padding: 0,
    gap: 8,
    overflow: 'hidden',
  },
  ghostDataRow: {
    minHeight: 40,
    borderRadius: 16,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: pale,
  },
  ghostDataRowActive: {
    backgroundColor: '#E9FFF0',
    borderWidth: 0,
    borderColor: '#CDEFD8',
  },
  ghostDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: line,
  },
  ghostDotActive: {
    backgroundColor: navy,
  },
  ghostDataLabel: {
    color: text,
    fontSize: 12,
    fontWeight: '900',
  },
  ghostDataMeta: {
    color: mutedText,
    fontSize: 10,
    fontWeight: '800',
  },
  ghostDataStatus: {
    color: mutedText,
    fontSize: 17,
    lineHeight: 18,
    fontWeight: '900',
  },
  ghostDataStatusActive: {
    color: navy,
  },
  ghostProtectedText: {
    alignSelf: 'center',
    color: text,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
    textDecorationLine: 'underline',
  },
  ghostCandidateRow: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    borderColor: line,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ghostCandidateIcon: {
    fontSize: 23,
  },
  ghostCandidateTitle: {
    color: text,
    fontSize: 13,
    fontWeight: '900',
  },
  ghostCandidateDesc: {
    color: mutedText,
    fontSize: 10,
    fontWeight: '800',
  },
  carbonPreviewCard: {
    height: 330,
    borderRadius: 24,
    borderWidth: 0,
    borderColor: line,
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 10,
    overflow: 'hidden',
    ...softShadow,
  },
  carbonTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  carbonTopLabel: {
    color: text,
    fontSize: 18,
    fontWeight: '900',
  },
  historyTotalMiniCard: {
    minHeight: 82,
    borderWidth: 0,
    borderColor: line,
    borderRadius: 18,
    backgroundColor: pale,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  historyTotalMiniValue: {
    color: text,
    fontSize: 26,
    fontWeight: '900',
  },
  historyMiniPill: {
    minHeight: 24,
    borderRadius: 12,
    backgroundColor: '#E9FFF0',
    paddingHorizontal: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyMiniPillText: {
    color: navy,
    fontSize: 10,
    fontWeight: '900',
  },
  historyGraphMiniCard: {
    flex: 1,
    borderWidth: 0,
    borderColor: line,
    borderRadius: 18,
    backgroundColor: pale,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  historyGraphMiniTitle: {
    color: text,
    fontSize: 13,
    fontWeight: '900',
  },
  historyMiniUnit: {
    color: mutedText,
    fontSize: 9,
    fontWeight: '900',
  },
  historyMiniSvgWrap: {
    flex: 1,
    minHeight: 112,
  },
  historyMiniGraphArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
  },
  historyMiniYAxis: {
    width: 17,
    justifyContent: 'space-between',
    paddingTop: 5,
    paddingBottom: 14,
  },
  historyMiniAxisText: {
    color: mutedText,
    fontSize: 8,
    fontWeight: '900',
    textAlign: 'right',
  },
  historyMiniPlot: {
    flex: 1,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: line,
    height: 112,
  },
  historyMiniGridTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 8,
    height: 1,
    backgroundColor: line,
  },
  historyMiniGridMiddle: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 48,
    height: 1,
    backgroundColor: line,
  },
  historyMiniGridBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 88,
    height: 1,
    backgroundColor: line,
  },
  historyMiniLineLayer: {
    position: 'absolute',
    left: 10,
    top: 8,
    width: 196,
    height: 88,
  },
  historyMiniLineSegment: {
    position: 'absolute',
    height: 2.5,
    borderRadius: 3,
    backgroundColor: navy,
    transformOrigin: '0px 1.25px',
  },
  historyMiniPointWrap: {
    position: 'absolute',
    width: 42,
    alignItems: 'center',
    gap: 3,
  },
  historyMiniPointValue: {
    color: navy,
    fontSize: 8.5,
    fontWeight: '900',
  },
  historyMiniPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: navy,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  historyMiniMonthLayer: {
    position: 'absolute',
    left: 10,
    right: 0,
    bottom: 0,
    height: 14,
  },
  historyMiniMonthText: {
    position: 'absolute',
    width: 32,
    color: mutedText,
    fontSize: 8.5,
    fontWeight: '900',
    textAlign: 'center',
  },
  carbonMeterTrack: {
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EAF9EF',
    overflow: 'hidden',
  },
  carbonMeterFill: {
    height: 16,
    borderRadius: 8,
    backgroundColor: navy,
  },
  carbonResultCard: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    borderColor: line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  carbonLeaf: {
    fontSize: 32,
  },
  carbonResultNumber: {
    color: navy,
    fontSize: 20,
    fontWeight: '900',
  },
  carbonResultDesc: {
    color: mutedText,
    fontSize: 11,
    fontWeight: '800',
  },
  cardLabel: {
    color: mutedText,
    fontSize: 14,
    fontWeight: '900',
  },
  textStrong: {
    color: text,
  },
  cardTitle: {
    color: text,
    fontSize: 18,
    fontWeight: '900',
  },
  bigNumber: {
    color: text,
    fontSize: 28,
    fontWeight: '900',
  },
  meta: {
    color: mutedText,
    fontSize: 12.5,
    fontWeight: '800',
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: line,
    marginVertical: 6,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: line,
    color: text,
    fontSize: 12,
    fontWeight: '900',
  },
  homeDetailPill: {
    paddingHorizontal: 10,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: line,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeDetailAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  homeDetailText: {
    color: navy,
    fontSize: 11,
    fontWeight: '900',
  },
  homeChevron: {
    color: text,
    fontSize: 24,
    lineHeight: 24,
    fontWeight: '900',
  },
  resultText: {
    color: text,
    fontSize: 22,
    fontWeight: '900',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  chip: {
    paddingHorizontal: 15,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: line,
    backgroundColor: pale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    borderColor: navy,
    backgroundColor: navy,
  },
  removableChip: {
    flexDirection: 'row',
    gap: 7,
    paddingRight: 11,
  },
  chipText: {
    color: navy,
    fontSize: 12,
    fontWeight: '900',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  removeChipText: {
    color: navy,
    fontSize: 15,
    lineHeight: 16,
    fontWeight: '900',
  },
  attachmentOptionCard: {
    minHeight: 68,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: pale,
  },
  attachmentInlineCard: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: pale,
  },
  attachmentInlineCardLarge: {
    minHeight: 70,
    alignItems: 'center',
    gap: 12,
  },
  scanSourceCard: {
    minHeight: 78,
    borderWidth: 0,
    borderColor: line,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    ...gentleShadow,
  },
  scanSourceCardSelected: {
    backgroundColor: pale,
    borderColor: line,
  },
  scanSummaryCard: {
    minHeight: 68,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: pale,
    justifyContent: 'center',
  },
  folderSearchBox: {
    height: 48,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  searchIcon: {
    color: navy,
    fontSize: 17,
    fontWeight: '900',
  },
  searchPlaceholder: {
    color: mutedText,
    fontSize: 13,
    fontWeight: '900',
  },
  folderSearchInput: {
    flex: 1,
    color: text,
    fontSize: 13,
    fontWeight: '900',
    paddingVertical: 0,
  },
  folderSelectAllCard: {
    minHeight: 64,
    borderWidth: 0,
    borderColor: line,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    ...gentleShadow,
  },
  folderSelectAllInlineRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 10,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  folderSelectAllTitle: {
    color: text,
    fontSize: 18,
    fontWeight: '900',
  },
  folderBreadcrumbCard: {
    minHeight: 34,
    paddingHorizontal: 4,
    paddingVertical: 3,
    justifyContent: 'center',
  },
  folderBreadcrumbClickableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  folderBreadcrumbRule: {
    height: 1,
    marginHorizontal: 7,
    backgroundColor: line,
  },
  folderBreadcrumbDivider: {
    color: text,
    fontSize: 16,
    fontWeight: '900',
  },
  folderBreadcrumbTitle: {
    color: navy,
    fontSize: 16,
    fontWeight: '900',
  },
  folderBreadcrumbAncestor: {
    color: text,
  },
  folderBreadcrumbText: {
    color: mutedText,
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '800',
  },
  currentLocationCard: {
    minHeight: 62,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: pale,
    justifyContent: 'center',
  },
  folderRow: {
    minHeight: 66,
    borderWidth: 0,
    borderColor: line,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    ...gentleShadow,
  },
  folderRowSelected: {
    borderColor: navy,
    backgroundColor: pale,
  },
  folderOutlineIcon: {
    width: 30,
    height: 28,
    justifyContent: 'flex-end',
  },
  fileIconFrame: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileIconFrameCompact: {
    width: 26,
    height: 26,
  },
  folderOutlineTab: {
    position: 'absolute',
    left: 3,
    top: 2,
    width: 14,
    height: 9,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 5,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: navy,
    backgroundColor: '#FFFFFF',
  },
  folderOutlineBody: {
    width: 30,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: navy,
    backgroundColor: '#FFFFFF',
  },
  folderIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: line,
    backgroundColor: pale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderIconText: {
    color: navy,
    fontSize: 16,
    fontWeight: '900',
  },
  folderNavigateButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: line,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -2,
  },
  folderNavigateText: {
    color: navy,
    fontSize: 26,
    lineHeight: 28,
    fontWeight: '900',
    marginTop: -2,
  },
  folderTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  folderTitleText: {
    flex: 1,
    color: text,
    fontSize: 18,
    fontWeight: '900',
  },
  folderSizeText: {
    color: mutedText,
    fontSize: 13,
    fontWeight: '900',
  },
  monthConditionRow: {
    minHeight: 76,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  monthStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthStepButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  monthStepText: {
    color: navy,
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '900',
  },
  sheetKeyboardAvoider: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  periodMonthSheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 14,
    borderWidth: 0,
    borderColor: line,
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  keywordSheetDesc: {
    textAlign: 'center',
  },
  periodMonthControl: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  periodMonthInputGroup: {
    flex: 1,
    minHeight: 52,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  periodMonthInput: {
    width: 44,
    height: 36,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    color: text,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  periodHeroCard: {
    minHeight: 70,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: pale,
    justifyContent: 'center',
  },
  periodOptionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  periodOption: {
    width: '47%',
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: line,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodOptionSelected: {
    backgroundColor: navy,
    borderColor: navy,
  },
  periodOptionText: {
    color: navy,
    fontSize: 13,
    fontWeight: '900',
  },
  periodOptionTextSelected: {
    color: '#FFFFFF',
  },
  yearRangeSummary: {
    minHeight: 58,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: line,
    backgroundColor: pale,
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginTop: 14,
    marginBottom: 18,
  },
  yearRangeLabel: {
    color: mutedText,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 4,
  },
  yearRangeValue: {
    color: text,
    fontSize: 17,
    fontWeight: '900',
  },
  periodInputPanel: {
    borderWidth: 1,
    borderColor: line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    gap: 8,
    marginBottom: 16,
  },
  periodInputLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  periodInputLabel: {
    width: 34,
    color: text,
    fontSize: 12,
    fontWeight: '900',
  },
  periodSmallInput: {
    width: 62,
    height: 34,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 8,
    color: text,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    paddingVertical: 0,
  },
  periodTinyInput: {
    width: 42,
    height: 34,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 8,
    color: text,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    paddingVertical: 0,
  },
  periodUnit: {
    color: mutedText,
    fontSize: 12,
    fontWeight: '900',
  },
  yearSliderWrap: {
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 10,
  },
  yearSliderTrack: {
    width: 226,
    height: 30,
    borderRadius: 15,
    backgroundColor: line,
    alignSelf: 'center',
    marginTop: 22,
    marginBottom: 34,
    justifyContent: 'center',
  },
  yearSliderSelected: {
    position: 'absolute',
    top: 11,
    height: 8,
    borderRadius: 8,
    backgroundColor: navy,
  },
  yearHandle: {
    position: 'absolute',
    top: -7,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: navy,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: navy,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  yearHandleText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  yearTickRow: {
    width: 248,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  yearTickText: {
    color: mutedText,
    fontSize: 10,
    fontWeight: '800',
  },
  inputRow: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: line,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    height: 48,
    color: text,
    fontSize: 14,
    fontWeight: '800',
  },
  addButton: {
    width: 58,
    height: 40,
    marginRight: 5,
    borderRadius: 9,
    backgroundColor: navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  checkLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  progressCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: pale,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 42,
    position: 'relative',
  },
  progressCircleCompact: {
    width: 108,
    height: 108,
    borderRadius: 54,
    marginTop: 18,
  },
  progressSpinnerRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 8,
    borderColor: '#DDF8E6',
    borderTopColor: navy,
    borderRightColor: '#AEE8BE',
  },
  progressSpinnerRingCompact: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 7,
  },
  progressText: {
    color: navy,
    fontSize: 30,
    fontWeight: '900',
  },
  progressTextCompact: {
    fontSize: 24,
  },
  homeScanStatusCard: {
    borderColor: navy,
    backgroundColor: '#FFFFFF',
  },
  homeScanBadge: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: navy,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  homeScanBadgeMuted: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: line,
    color: mutedText,
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  miniProgressTrack: {
    height: 7,
    borderRadius: 7,
    backgroundColor: line,
    overflow: 'hidden',
    marginTop: 14,
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 7,
    backgroundColor: navy,
  },
  scanStatusActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  scanStatusButton: {
    flex: 1,
    height: 34,
    borderRadius: 9,
    backgroundColor: navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanStatusButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  scanStatusCancel: {
    width: 62,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: navy,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  scanStatusCancelText: {
    color: navy,
    fontSize: 12,
    fontWeight: '900',
  },
  scanFloatingPanel: {
    borderWidth: 1,
    borderColor: line,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  scanPercent: {
    color: navy,
    fontSize: 22,
    fontWeight: '900',
  },
  scanConditionLine: {
    color: mutedText,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
    marginTop: 3,
    maxWidth: 190,
  },
  progressTrack: {
    height: 9,
    borderRadius: 9,
    backgroundColor: line,
    overflow: 'hidden',
    marginVertical: 20,
  },
  progressFill: {
    height: '100%',
    backgroundColor: navy,
  },
  listNoticeText: {
    color: mutedText,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  listNoticeDanger: {
    color: '#D65353',
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  selectAllText: {
    flex: 1,
    color: text,
    fontSize: 14,
    fontWeight: '900',
  },
  filterText: {
    color: text,
    fontSize: 14,
    fontWeight: '900',
  },
  listCard: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  resultSummary: {
    color: text,
    fontSize: 14,
    fontWeight: '900',
  },
  resultMetricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  reviewMetricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    marginBottom: 2,
  },
  resultMetricCard: {
    flex: 1,
    minWidth: 132,
    minHeight: 76,
    borderWidth: 0,
    borderColor: line,
    borderRadius: 20,
    backgroundColor: pale,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    gap: 8,
    ...gentleShadow,
  },
  recentHeroCard: {
    minHeight: 98,
    borderWidth: 0,
    borderColor: line,
    borderRadius: 20,
    backgroundColor: pale,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    gap: 8,
    ...gentleShadow,
  },
  recentHeroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  recentHeroDate: {
    color: text,
    fontSize: 22,
    fontWeight: '900',
  },
  recentHeroSizeValue: {
    color: text,
    textAlign: 'right',
    fontSize: 30,
    fontWeight: '900',
  },
  recentResultRow: {
    minHeight: 76,
    borderWidth: 0,
    borderColor: line,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...gentleShadow,
  },
  recentResultValue: {
    minWidth: 72,
    color: navy,
    textAlign: 'right',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '900',
  },
  carbonTotalCard: {
    minHeight: 104,
    borderWidth: 0,
    borderColor: line,
    borderRadius: 20,
    backgroundColor: pale,
    paddingHorizontal: 18,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    ...softShadow,
  },
  carbonTotalValue: {
    color: text,
    fontSize: 36,
    fontWeight: '900',
    marginTop: 5,
  },
  monthCarbonPill: {
    minHeight: 32,
    borderRadius: 16,
    backgroundColor: pale,
    borderWidth: 0,
    borderColor: line,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthCarbonText: {
    color: navy,
    fontSize: 12,
    fontWeight: '900',
  },
  statsGraphCard: {
    minHeight: 204,
    borderWidth: 0,
    borderColor: line,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    ...softShadow,
  },
  statsLineChart: {
    marginLeft: -18,
    borderRadius: 16,
  },
  statsChartClip: {
    width: '100%',
    overflow: 'hidden',
  },
  statsChartReveal: {
    overflow: 'hidden',
  },
  graphArea: {
    height: 142,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 9,
  },
  graphYAxis: {
    width: 26,
    justifyContent: 'space-between',
    paddingBottom: 19,
    paddingTop: 8,
  },
  graphAxisText: {
    color: mutedText,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'right',
  },
  graphPlot: {
    flex: 1,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: line,
    height: 122,
    paddingHorizontal: 2,
  },
  graphColumn: {
    width: 42,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    zIndex: 2,
  },
  graphValue: {
    color: navy,
    fontSize: 10,
    fontWeight: '900',
  },
  graphBar: {
    width: 26,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: navy,
  },
  lineGraphLayer: {
    position: 'absolute',
    left: 4,
    top: 8,
    width: 226,
    height: 116,
  },
  lineGraphSegment: {
    position: 'absolute',
    height: 3,
    borderRadius: 3,
    backgroundColor: navy,
    transformOrigin: '0px 1.5px',
  },
  lineGraphPointWrap: {
    position: 'absolute',
    width: 36,
    alignItems: 'center',
    gap: 4,
  },
  lineGraphPoint: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: navy,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  graphMonthLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -2,
    height: 18,
  },
  graphEmptyState: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  graphMonth: {
    position: 'absolute',
    width: 32,
    color: mutedText,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  graphGridLineTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 8,
    height: 1,
    backgroundColor: line,
  },
  graphGridLineMiddle: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 56,
    height: 1,
    backgroundColor: line,
  },
  graphGridLineBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 104,
    height: 1,
    backgroundColor: line,
  },
  statsGuideText: {
    color: mutedText,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  recentCleanupCard: {
    minHeight: 88,
    borderWidth: 0,
    borderColor: line,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    ...gentleShadow,
  },
  recentCleanupTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  recentCleanupSizeValue: {
    minWidth: 116,
    marginLeft: 'auto',
    color: text,
    textAlign: 'right',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
  },
  carbonBasisHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  helpCircleButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: line,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpCircleText: {
    color: navy,
    fontSize: 15,
    fontWeight: '900',
  },
  carbonBasisStandardBox: {
    borderWidth: 1,
    borderColor: line,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  carbonBasisLine: {
    minHeight: 45,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  carbonBasisLineTitle: {
    color: text,
    fontSize: 14,
    fontWeight: '900',
  },
  carbonBasisLineDesc: {
    color: mutedText,
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: '800',
  },
  carbonBasisLineValue: {
    minWidth: 112,
    color: navy,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
    textAlign: 'right',
  },
  carbonExampleCard: {
    minHeight: 82,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 12,
    backgroundColor: pale,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  carbonExampleTitle: {
    color: text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
  },
  carbonNoticeCard: {
    marginTop: 'auto',
    borderWidth: 1,
    borderColor: '#E7D89B',
    borderRadius: 12,
    backgroundColor: '#FFF8D8',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 7,
  },
  carbonNoticeTitle: {
    color: text,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '900',
  },
  resultCategoryCard: {
    minHeight: 54,
    borderWidth: 0,
    borderColor: line,
    borderRadius: 18,
    backgroundColor: pale,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    ...gentleShadow,
  },
  resultCategoryMeta: {
    minWidth: 86,
    color: mutedText,
    textAlign: 'right',
    fontSize: 14.5,
    lineHeight: 18,
    fontWeight: '900',
  },
  reviewSummaryCard: {
    minHeight: 72,
    borderWidth: 0,
    borderColor: line,
    borderRadius: 18,
    backgroundColor: pale,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...gentleShadow,
  },
  reviewRedNumber: {
    color: '#C13A3A',
    fontWeight: '900',
  },
  resultGuideText: {
    marginTop: 6,
    color: text,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '900',
    textDecorationLine: 'underline',
  },
  resultWarningText: {
    color: '#C13A3A',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '900',
  },
  reviewWarningText: {
    marginTop: 10,
    color: '#C13A3A',
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '900',
    textAlign: 'left',
  },
  detailMainTitle: {
    color: text,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '900',
  },
  detailSubMeta: {
    marginTop: -4,
    color: mutedText,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '900',
  },
  itemPreviewBox: {
    minHeight: 190,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    backgroundColor: pale,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  itemPreviewText: {
    color: mutedText,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  detailInfoBox: {
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 9,
  },
  detailInfoTitle: {
    color: text,
    fontSize: 14,
    fontWeight: '900',
  },
  detailInfoText: {
    color: mutedText,
    fontSize: 12.5,
    lineHeight: 19,
    fontWeight: '800',
  },
  deleteStatusRow: {
    minHeight: 70,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteStatusRowDone: {
    borderColor: navy,
  },
  deleteStatusServiceIcon: {
    width: 30,
    height: 30,
  },
  deleteStatusText: {
    color: text,
    fontSize: 16,
    fontWeight: '900',
  },
  progressLabel: {
    marginTop: 8,
    color: text,
    fontSize: 13,
    fontWeight: '900',
  },
  progressRightText: {
    marginTop: -12,
    color: text,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '900',
  },
  remainingCapacityText: {
    color: text,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
    marginTop: -6,
    marginBottom: 8,
  },
  cleanupCheckCircle: {
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 2,
    borderColor: navy,
    backgroundColor: pale,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 14,
  },
  cleanupCheckText: {
    color: navy,
    fontSize: 48,
    lineHeight: 54,
    fontWeight: '900',
  },
  cleanupTitle: {
    color: text,
    textAlign: 'center',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    marginVertical: 8,
  },
  cleanupMetricCard: {
    width: '47%',
    minHeight: 84,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    backgroundColor: pale,
    paddingHorizontal: 16,
    paddingVertical: 13,
    justifyContent: 'center',
    gap: 6,
  },
  cleanupMetricValue: {
    color: text,
    fontSize: 22,
    fontWeight: '900',
  },
  cleanupCountCard: {
    minHeight: 124,
    gap: 12,
  },
  cleanupCountInnerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cleanupCountInnerCard: {
    flex: 1,
    minHeight: 58,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: line,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cleanupCountLabel: {
    color: text,
    fontSize: 14,
    fontWeight: '900',
  },
  cleanupCountValue: {
    color: text,
    fontSize: 21,
    fontWeight: '900',
  },
  cleanupCapacityCard: {
    minHeight: 152,
    gap: 13,
  },
  cleanupCapacityMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cleanupCapacityValue: {
    color: text,
    fontSize: 23,
    fontWeight: '900',
  },
  cleanupDriveBarTrack: {
    height: 18,
    borderRadius: 18,
    backgroundColor: line,
    overflow: 'hidden',
    position: 'relative',
  },
  cleanupDriveCurrentBar: {
    height: '100%',
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: navy,
  },
  cleanupDriveReclaimedBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    minWidth: 10,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    backgroundColor: navy,
  },
  cleanupDriveTotalLabel: {
    marginTop: -8,
    color: mutedText,
    textAlign: 'right',
    fontSize: 11,
    fontWeight: '900',
  },
  cleanupButtonSpacer: {
    flex: 1,
    minHeight: 44,
  },
  carbonStandardCard: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    backgroundColor: pale,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  twoButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  segment: {
    height: 42,
    borderRadius: 18,
    borderWidth: 0,
    borderColor: line,
    padding: 3,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    ...gentleShadow,
  },
  segmentItem: {
    flex: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: navy,
  },
  segmentSubActive: {
    backgroundColor: '#E9FFF0',
    borderWidth: 0,
    borderColor: '#CDEFD8',
  },
  segmentText: {
    color: text,
    fontSize: 12,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  storagePrimaryTabs: {
    height: 48,
    marginTop: -10,
    flexDirection: 'row',
    borderWidth: 0,
    borderColor: line,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    ...gentleShadow,
  },
  storagePrimaryTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: line,
  },
  storagePrimaryTabActive: {
    backgroundColor: navy,
  },
  storagePrimaryTabText: {
    color: text,
    fontSize: 14,
    fontWeight: '900',
  },
  storagePrimaryTabTextActive: {
    color: '#FFFFFF',
  },
  storageSummaryBar: {
    minHeight: 50,
    borderWidth: 0,
    borderColor: line,
    borderRadius: 18,
    backgroundColor: pale,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    ...gentleShadow,
  },
  storageSummaryText: {
    color: text,
    fontSize: 13,
    fontWeight: '900',
  },
  storageFilterText: {
    color: text,
    fontSize: 12,
    fontWeight: '900',
  },
  storagePathCard: {
    minHeight: 42,
    borderTopWidth: 1,
    borderColor: line,
    borderRadius: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 2,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  storageLooseList: {
    gap: 10,
    paddingBottom: 90,
  },
  folderListBox: {
    borderWidth: 0,
    borderColor: line,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 7,
    gap: 7,
    ...softShadow,
  },
  folderListScroll: {
    maxHeight: 268,
  },
  folderListContent: {
    gap: 8,
    paddingBottom: 2,
  },
  storagePagerCard: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storageBreadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  storageBreadcrumbText: {
    color: text,
    fontSize: 14,
    fontWeight: '900',
  },
  storageBreadcrumbCurrent: {
    color: navy,
    fontSize: 16,
  },
  storageBreadcrumbDivider: {
    color: text,
    fontSize: 18,
    fontWeight: '900',
  },
  storagePathCountText: {
    color: mutedText,
    fontSize: 12,
    fontWeight: '900',
  },
  storageItemCard: {
    minHeight: 78,
    borderWidth: 0,
    borderColor: line,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...gentleShadow,
  },
  storageItemCardCompact: {
    minHeight: 56,
    paddingVertical: 8,
  },
  storageListBox: {
    height: 302,
    borderWidth: 0,
    borderColor: line,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 7,
    gap: 7,
    ...softShadow,
  },
  storageListScroll: {
    flex: 1,
  },
  storageListContent: {
    gap: 8,
    paddingBottom: 1,
  },
  storagePagerRow: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 2,
  },
  storagePagerText: {
    color: text,
    fontSize: 14,
    fontWeight: '900',
  },
  storagePagerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  storagePagerButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storagePagerButtonDisabled: {
    opacity: 0.42,
  },
  storagePagerGlyph: {
    color: text,
    fontSize: 25,
    lineHeight: 27,
    fontWeight: '900',
  },
  storagePagerGlyphDisabled: {
    color: mutedText,
  },
  storageDriveItemPressArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  storageChevronButton: {
    width: 38,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -8,
  },
  storageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  storageTitleRowCompact: {
    marginTop: -2,
  },
  storageCompactMeta: {
    color: mutedText,
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  storageRightSize: {
    minWidth: 48,
    color: mutedText,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'right',
  },
  storageRightSizeDanger: {
    color: '#C13A3A',
  },
  storageSubtitle: {
    color: text,
    fontSize: 12.5,
    fontWeight: '900',
    marginTop: 2,
    marginBottom: 2,
  },
  storageBadge: {
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: line,
    backgroundColor: '#E9FFF0',
    paddingHorizontal: 9,
    justifyContent: 'center',
  },
  storageBadgeWarn: {
    backgroundColor: '#FFF6D9',
    borderColor: '#D8C16A',
  },
  storageBadgeText: {
    color: navy,
    fontSize: 10.5,
    fontWeight: '900',
  },
  storageSelectAllRowInBox: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
  },
  permissionRevokedCard: {
    marginTop: 26,
    minHeight: 392,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 26,
    paddingVertical: 42,
    alignItems: 'center',
    gap: 12,
  },
  permissionRevokedIcon: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1.5,
    borderColor: line,
    backgroundColor: pale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  permissionRevokedIconText: {
    color: navy,
    fontSize: 40,
    fontWeight: '900',
  },
  permissionRevokedTitle: {
    color: text,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '900',
    textAlign: 'center',
  },
  permissionRevokedDesc: {
    color: mutedText,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  storageDeleteOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 42,
    backgroundColor: 'rgba(32, 33, 36, 0.12)',
    justifyContent: 'flex-end',
  },
  storageDeleteSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: line,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    gap: 13,
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
  storageDeleteTitle: {
    color: text,
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 29,
    fontWeight: '900',
  },
  storageDeleteWarningBox: {
    borderWidth: 1,
    borderColor: '#DFA7A7',
    borderRadius: 10,
    backgroundColor: '#FBE2E0',
    paddingHorizontal: 15,
    paddingVertical: 13,
    gap: 8,
  },
  storageDeleteInfoBox: {
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    backgroundColor: pale,
    paddingHorizontal: 15,
    paddingVertical: 13,
    gap: 8,
  },
  storageDeleteWarningTitle: {
    color: text,
    fontSize: 14,
    fontWeight: '900',
  },
  storageDeleteWarningText: {
    color: mutedText,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '900',
  },
  storageDeleteSummaryBox: {
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 13,
    gap: 8,
  },
  storageDeleteDangerButton: {
    height: 50,
    borderRadius: 10,
    backgroundColor: '#E4312B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storageRestoreInfoBox: {
    minHeight: 90,
    borderRadius: 18,
    backgroundColor: pale,
    padding: 16,
    justifyContent: 'center',
    gap: 6,
  },
  storageRestoreButton: {
    height: 50,
    borderRadius: 10,
    backgroundColor: '#6FCF85',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restoreButtonDisabled: {
    opacity: 0.45,
  },
  fileOutlineIcon: {
    width: 30,
    height: 34,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: navy,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fileOutlineFold: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: navy,
    backgroundColor: pale,
    transform: [{ rotate: '45deg' }],
  },
  fileDocLineWide: {
    width: 16,
    height: 2,
    borderRadius: 2,
    backgroundColor: navy,
    marginTop: 7,
    marginBottom: 4,
  },
  fileDocLine: {
    width: 13,
    height: 2,
    borderRadius: 2,
    backgroundColor: navy,
    marginBottom: 4,
  },
  fileDocLineShort: {
    width: 9,
    height: 2,
    borderRadius: 2,
    backgroundColor: navy,
  },
  fileImageSun: {
    position: 'absolute',
    top: 10,
    right: 7,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: navy,
  },
  fileImageMountain: {
    position: 'absolute',
    left: 7,
    bottom: 8,
    width: 16,
    height: 16,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: navy,
    transform: [{ rotate: '-45deg' }],
  },
  fileZipRail: {
    width: 8,
    height: 22,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fileZipTooth: {
    width: 6,
    height: 4,
    borderRadius: 1,
    borderWidth: 1.5,
    borderColor: navy,
    backgroundColor: pale,
  },
  trashOutlineIcon: {
    width: 30,
    height: 34,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  trashOutlineIconCompact: {
    transform: [{ scale: 0.92 }],
  },
  trashLid: {
    position: 'absolute',
    top: 8,
    width: 23,
    height: 3,
    borderRadius: 3,
    backgroundColor: navy,
  },
  trashHandle: {
    position: 'absolute',
    top: 4,
    width: 10,
    height: 5,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: navy,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  trashBody: {
    width: 22,
    height: 23,
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: navy,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  trashLine: {
    width: 2,
    height: 13,
    borderRadius: 2,
    backgroundColor: navy,
  },
  trashDangerBorder: {
    borderColor: '#D65353',
  },
  trashDangerFill: {
    backgroundColor: '#D65353',
  },
  folderTypeIcon: {
    backgroundColor: '#FFF4CC',
    borderColor: '#D7B44A',
  },
  folderTypeText: {
    color: '#8A6500',
    fontSize: 16,
  },
  storageHintText: {
    color: mutedText,
    fontSize: 10.5,
    fontWeight: '800',
  },
  storageFolderOpenButton: {
    minWidth: 32,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  driveMovePanel: {
    borderWidth: 1,
    borderColor: navy,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 10,
  },
  driveMoveTargets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  driveMoveTarget: {
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: line,
    backgroundColor: pale,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  driveMoveTargetText: {
    color: navy,
    fontSize: 11,
    fontWeight: '900',
  },
  storageMoveSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '78%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
  storageMoveCurrentBox: {
    borderWidth: 1,
    borderColor: line,
    borderRadius: 14,
    backgroundColor: pale,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  storageMoveTargetList: {
    gap: 8,
  },
  storageMoveTargetRow: {
    minHeight: 64,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 12,
  },
  filterSectionTitle: {
    color: text,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 4,
  },
  settingsProfileCard: {
    minHeight: 76,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: pale,
  },
  accountHeroCard: {
    minHeight: 108,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: pale,
  },
  avatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  infoTitleLarge: {
    color: text,
    fontSize: 16,
    fontWeight: '900',
  },
  profileConnectionText: {
    color: mutedText,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '900',
  },
  smallPill: {
    minWidth: 50,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: line,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  smallPillText: {
    color: navy,
    fontSize: 11,
    fontWeight: '900',
  },
  outlineMiniPill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    height: 25,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: line,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  outlineMiniPillText: {
    color: navy,
    fontSize: 11,
    fontWeight: '900',
  },
  groupCard: {
    borderWidth: 0,
    borderColor: line,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    ...gentleShadow,
  },
  thinDivider: {
    height: 1,
    backgroundColor: line,
    marginHorizontal: 16,
  },
  settingPlainRow: {
    minHeight: 74,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  serviceLinkRow: {
    minHeight: 84,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
  },
  serviceIconBox: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceIconImage: {
    width: 34,
    height: 34,
  },
  connectedServiceIcon: {
    width: 28,
    height: 28,
  },
  connectedPill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    height: 25,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: line,
    backgroundColor: '#E9FFF0',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectedPillText: {
    color: navy,
    fontSize: 11,
    fontWeight: '900',
  },
  scopeCard: {
    minHeight: 70,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    backgroundColor: pale,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  scopeTitle: {
    color: text,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 6,
  },
  scopeDesc: {
    color: mutedText,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '900',
  },
  keywordConditionCard: {
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  keywordConditionSummary: {
    color: mutedText,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  versionText: {
    color: mutedText,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 10,
    paddingTop: 0,
  },
  settingsBottomSpacer: {
    height: 72,
  },
  privacyWithdrawButton: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D92F36',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  privacyWithdrawText: {
    color: '#D92F36',
    fontSize: 15,
    fontWeight: '900',
  },
  summaryTintCard: {
    minHeight: 76,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: pale,
  },
  withdrawModalCard: {
    borderWidth: 1,
    borderColor: line,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 14,
    backgroundColor: '#FFFFFF',
  },
  sheetOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 30,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(32, 33, 36, 0.10)',
  },
  deleteConfirmOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 40,
    backgroundColor: 'rgba(32, 33, 36, 0.12)',
    justifyContent: 'flex-end',
  },
  deleteApprovalPanel: {
    marginHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
    gap: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  deleteApprovalTitle: {
    color: text,
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '900',
  },
  deleteApprovalDesc: {
    color: mutedText,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '900',
  },
  deleteApprovalInfoBox: {
    borderWidth: 1,
    borderColor: line,
    borderRadius: 12,
    backgroundColor: pale,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 7,
  },
  deleteApprovalInfoTitle: {
    color: text,
    fontSize: 14,
    fontWeight: '900',
  },
  deleteApprovalInfoText: {
    color: mutedText,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '800',
  },
  helpPopupOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 45,
    backgroundColor: 'rgba(32, 33, 36, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  carbonHelpPopupCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: line,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 18,
  },
  carbonHelpTitle: {
    color: text,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
    textAlign: 'center',
  },
  carbonFormulaText: {
    color: navy,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '900',
    textAlign: 'center',
  },
  withdrawSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: line,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    gap: 13,
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 10,
  },
  keywordSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: line,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 9,
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 10,
  },
  keywordChoiceSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: line,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    gap: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 10,
  },
  keywordChoiceRow: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 12,
    backgroundColor: pale,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalHandle: {
    width: 52,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#DFF6E6',
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalHandleHitArea: {
    alignSelf: 'center',
    minWidth: 92,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -2,
  },
  modalTitle: {
    color: text,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '900',
  },
  modalClose: {
    color: mutedText,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 30,
  },
  warningCard: {
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    backgroundColor: '#FFF6D8',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  warningText: {
    color: text,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '900',
  },
  recommendChip: {
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: line,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  recommendChipText: {
    color: navy,
    fontSize: 12,
    fontWeight: '900',
  },
  dangerButton: {
    height: 50,
    borderRadius: 10,
    backgroundColor: '#D92F36',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonDisabled: {
    opacity: 0.45,
  },
  dangerText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  restoreText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  withdrawActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  sheetCancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: navy,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  sheetDangerButton: {
    flex: 1.35,
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D92F36',
  },
  toggleRow: {
    minHeight: 72,
    borderWidth: 0,
    borderColor: line,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    ...gentleShadow,
  },
  toggleRowPlain: {
    borderWidth: 0,
    borderRadius: 0,
    minHeight: 74,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    shadowOpacity: 0,
    elevation: 0,
  },
  toggleRowTint: {
    backgroundColor: pale,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 3,
    backgroundColor: '#DFF6E6',
  },
  toggleOn: {
    backgroundColor: navy,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  toggleKnobOn: {
    transform: [{ translateX: 20 }],
  },
  floatingScanButton: {
    position: 'absolute',
    right: 18,
    bottom: 78,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DDF8E6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 80,
    elevation: 9,
    shadowColor: '#57C879',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  floatingSmallButton: {
    right: 22,
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  floatingTrashButton: {
    borderWidth: 2,
    borderColor: '#D65353',
    backgroundColor: '#FFFFFF',
    shadowColor: '#D65353',
    shadowOpacity: 0.16,
  },
  floatingDeleteButton: {
    borderWidth: 2,
    borderColor: line,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.09,
  },
  floatingRestoreButton: {
    borderWidth: 2,
    borderColor: line,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
  },
  floatingScanLogo: {
    width: 38,
    height: 38,
    borderRadius: 11,
  },
  bottomNav: {
    height: 64,
    borderTopWidth: 1,
    borderTopColor: line,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  navIconFrame: {
    width: 24,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    color: mutedText,
    fontSize: 10,
    fontWeight: '900',
  },
  navLabelActive: {
    color: navy,
  },
  navIconActiveFill: {
    backgroundColor: navy,
  },
  navHomeImage: {
    width: 20,
    height: 20,
  },
  navHomeImageInactive: {
    opacity: 0.72,
  },
  navHomeRoofLeft: {
    position: 'absolute',
    top: 5,
    left: 3.2,
    width: 15.5,
    height: 4.6,
    borderRadius: 1,
    backgroundColor: mutedText,
    transform: [{ rotate: '-43deg' }],
  },
  navHomeRoofRight: {
    position: 'absolute',
    top: 5,
    right: 3.2,
    width: 15.5,
    height: 4.6,
    borderRadius: 1,
    backgroundColor: mutedText,
    transform: [{ rotate: '43deg' }],
  },
  navHomeLeftWall: {
    position: 'absolute',
    left: 3.5,
    bottom: 2.5,
    width: 4.8,
    height: 12.5,
    backgroundColor: mutedText,
  },
  navHomeRightWall: {
    position: 'absolute',
    right: 3.5,
    bottom: 2.5,
    width: 4.8,
    height: 12.5,
    backgroundColor: mutedText,
  },
  navHomeBase: {
    position: 'absolute',
    left: 3.5,
    right: 3.5,
    bottom: 2.5,
    height: 4.8,
    backgroundColor: mutedText,
  },
  navHomeDoorCut: {
    position: 'absolute',
    bottom: 2.5,
    width: 6.4,
    height: 9.2,
    backgroundColor: '#FFFFFF',
  },
  navLocker: {
    width: 18,
    height: 21,
    borderRadius: 4,
    borderWidth: 2.2,
    borderColor: mutedText,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  navLockerActive: {
    borderColor: navy,
    backgroundColor: '#E9FFF0',
  },
  navLockerDoor: {
    flex: 1,
    borderLeftWidth: 1.5,
    borderLeftColor: line,
    alignItems: 'center',
    paddingTop: 4,
  },
  navLockerDoorActive: {
    borderLeftColor: navy,
  },
  navLockerVent: {
    width: 8.5,
    height: 1.8,
    borderRadius: 1,
    backgroundColor: mutedText,
    marginBottom: 2,
  },
  navLockerHandle: {
    position: 'absolute',
    right: 3,
    top: 10,
    width: 2.8,
    height: 5.4,
    borderRadius: 2,
    backgroundColor: mutedText,
  },
  navHistoryWrap: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: mutedText,
    borderRadius: 5,
    paddingHorizontal: 4,
    paddingVertical: 4,
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  navHistoryWrapActive: {
    borderColor: navy,
    backgroundColor: '#E9FFF0',
  },
  navHistoryLine: {
    height: 2,
    borderRadius: 2,
    backgroundColor: mutedText,
  },
  navHistoryChart: {
    width: 23,
    height: 20,
    position: 'relative',
  },
  navHistoryAxis: {
    position: 'absolute',
    left: 2,
    right: 1,
    bottom: 3,
    height: 2.2,
    borderRadius: 2,
    backgroundColor: mutedText,
  },
  navHistorySegment: {
    position: 'absolute',
    height: 3,
    borderRadius: 3,
    backgroundColor: mutedText,
  },
  navHistorySegmentOne: {
    left: 4,
    bottom: 7,
    width: 9.5,
    transform: [{ rotate: '-28deg' }],
  },
  navHistorySegmentTwo: {
    right: 3,
    bottom: 10,
    width: 10.5,
    transform: [{ rotate: '34deg' }],
  },
  navHistoryDot: {
    position: 'absolute',
    width: 4.6,
    height: 4.6,
    borderRadius: 3,
    backgroundColor: mutedText,
  },
  navHistoryDotOne: {
    left: 2.5,
    bottom: 6,
  },
  navHistoryDotTwo: {
    left: 10,
    bottom: 10.5,
  },
  navHistoryDotThree: {
    right: 1.5,
    bottom: 15,
  },
  navHistoryActiveFill: {
    backgroundColor: navy,
  },
  navGearWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navGearRing: {
    width: 17.5,
    height: 17.5,
    borderRadius: 9,
    borderWidth: 0,
    backgroundColor: mutedText,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  navGearRingActive: {
    backgroundColor: navy,
  },
  navGearCore: {
    width: 8.2,
    height: 8.2,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
  },
  navGearCoreActive: {
    backgroundColor: '#FFFFFF',
  },
  navGearTooth: {
    position: 'absolute',
    width: 5.4,
    height: 7.2,
    borderRadius: 1.4,
    backgroundColor: mutedText,
    zIndex: 1,
  },
  navGearTop: {
    top: 0.5,
  },
  navGearTopRight: {
    top: 2.6,
    right: 2.6,
    transform: [{ rotate: '45deg' }],
  },
  navGearRight: {
    right: 0.5,
    transform: [{ rotate: '90deg' }],
  },
  navGearBottomRight: {
    right: 2.6,
    bottom: 2.6,
    transform: [{ rotate: '-45deg' }],
  },
  navGearBottom: {
    bottom: 0.5,
  },
  navGearBottomLeft: {
    bottom: 2.6,
    left: 2.6,
    transform: [{ rotate: '45deg' }],
  },
  navGearLeft: {
    left: 0.5,
    transform: [{ rotate: '90deg' }],
  },
  navGearTopLeft: {
    top: 2.6,
    left: 2.6,
    transform: [{ rotate: '-45deg' }],
  },
});
