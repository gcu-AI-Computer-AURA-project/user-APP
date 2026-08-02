import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

type Screen =
  | 'initial'
  | 'privacy'
  | 'login'
  | 'permissions'
  | 'gmailPermission'
  | 'drivePermission'
  | 'notificationPermission'
  | 'connected'
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
  | 'mailDetail'
  | 'fileDetail'
  | 'selectedReview'
  | 'deleteConfirm'
  | 'deleteProcessing'
  | 'cleanupComplete'
  | 'carbonBasis'
  | 'storageMail'
  | 'storageDrive'
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

type MainTab = 'home' | 'storage' | 'settings';
type MonthRange = { from: number; to: number };
type ScanListItem = {
  id: string;
  title: string;
  desc: string;
  sizeMB: number;
  dateLabel: string;
  sortText: string;
  source: 'mail' | 'drive';
  previewLabel?: string;
  detailTitle?: string;
  detailSubtitle?: string;
};
type StorageMailItem = { id: string; title: string; subtitle: string; meta: string; badge?: string };
type StorageDriveItem = { id: string; type: string; title: string; subtitle: string; fullPath?: string };
type StorageDriveMoveTargets = Record<string, string>;
type ScanSummary = {
  mailItems: ScanListItem[];
  driveItems: ScanListItem[];
  largeItems: ScanListItem[];
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

const navy = '#0B3566';
const line = '#9FB8CA';
const pale = '#EAF7F2';
const text = '#0B2A4A';
const auraLogo = require('./assets/wireframes/AURA-logo-concept.png');
const navHomeIcon = require('./assets/nav/home-house-navy.png');
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

const getMainTabForScreen = (screen: Screen): MainTab | null => {
  if (
    screen === 'storageMail' ||
    screen === 'storageDrive' ||
    screen === 'storageTrash' ||
    screen === 'storageDriveTrash'
  ) {
    return 'storage';
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
    screen === 'mailDetail' ||
    screen === 'fileDetail' ||
    screen === 'selectedReview' ||
    screen === 'deleteConfirm' ||
    screen === 'deleteProcessing' ||
    screen === 'cleanupComplete' ||
    screen === 'carbonBasis' ||
    screen === 'analysisHistory' ||
    screen === 'analysisHistoryAll'
  ) {
    return 'home';
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
  settings: 'settings',
};

const NavigationContext = React.createContext<{
  current: Screen;
  currentTab: MainTab | null;
  navigate: (screen: Screen) => void;
  navigateTab: (tab: MainTab) => void;
  back: () => void;
  connectedInstant?: boolean;
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

const auraDriveFiles: AuraDriveFile[] = [
  { id: 'drive-plan-pdf', folderPath: '내 Drive › 학술제 자료', type: 'PDF', title: 'AURA_기획서.pdf', sizeMB: 184, modifiedAt: '2025.11.12', reason: '대용량 PDF' },
  { id: 'drive-slide-v1', folderPath: '내 Drive › 학술제 자료 › 발표자료', type: 'PDF', title: '발표자료_v1.pdf', sizeMB: 320, modifiedAt: '2026.07.01', reason: '발표자료 백업' },
  { id: 'drive-slide-old', folderPath: '내 Drive › 학술제 자료 › 발표자료', type: 'PDF', title: '발표자료_구버전.pdf', sizeMB: 410, modifiedAt: '2024.03.08', reason: '오래된 발표자료' },
  { id: 'drive-mockup-old', folderPath: '내 Drive › 디자인 백업 › Old Mockups', type: 'JPG', title: 'old_mockup.png', sizeMB: 96, modifiedAt: '2023.02.20', reason: '오래된 이미지' },
  { id: 'drive-figma-export', folderPath: '내 Drive › 디자인 백업 › Figma Export', type: 'ZIP', title: 'figma_export_backup.zip', sizeMB: 760, modifiedAt: '2022.12.16', reason: '대용량 디자인 백업' },
  { id: 'drive-report-copy', folderPath: '내 Drive › 문서 보관함 › 과제 백업', type: 'PDF', title: 'final_report_copy.pdf', sizeMB: 820, modifiedAt: '2021.09.18', reason: '중복 해시 일치' },
  { id: 'drive-photo-zip', folderPath: '내 Drive › 사진 백업 › 2020 여행', type: 'ZIP', title: 'photo_backup.zip', sizeMB: 1220, modifiedAt: '2020.04.03', reason: '중복 백업 파일' },
  { id: 'drive-contract', folderPath: '내 Drive › 문서 보관함 › 계약서', type: 'DOCX', title: '계약서_보관.docx', sizeMB: 2, modifiedAt: '2023.10.12', reason: '제외 키워드 보호' },
];

const driveFolderOptions = [
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
const getDriveFolderName = (path: string) => splitDrivePath(path).at(-1) ?? path;
const getDirectDriveFolders = (parentPath: string) => {
  const parentParts = splitDrivePath(parentPath);
  return driveFolderOptions.filter((folder) => {
    const parts = splitDrivePath(folder.name);
    return parts.length === parentParts.length + 1 && parentParts.every((part, index) => parts[index] === part);
  });
};
const getVisibleDriveFolders = (currentPath: string, search: string) => {
  const query = search.trim().toLowerCase();
  if (query) {
    return driveFolderOptions.filter((folder) => folder.name.toLowerCase().includes(query));
  }

  return getDirectDriveFolders(currentPath);
};
const hasDriveFolderChildren = (path: string) => getDirectDriveFolders(path).length > 0;
const getDriveDescendantFolders = (path: string) => driveFolderOptions.filter((folder) => folder.name.startsWith(`${path} ›`));
const getDriveFolderSelectionGroup = (path: string) => [path, ...getDriveDescendantFolders(path).map((folder) => folder.name)];
const getDirectDriveFiles = (folderPath: string) => auraDriveFiles.filter((file) => file.folderPath === folderPath);
const getDriveFileSelectionGroup = (folderPath: string) =>
  auraDriveFiles.filter((file) => file.folderPath === folderPath || file.folderPath.startsWith(`${folderPath} ›`));
const hasDriveFolderContents = (path: string) => hasDriveFolderChildren(path) || getDirectDriveFiles(path).length > 0;
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

const sampleTrashItems: StorageMailItem[] = [
  { id: 'trash-coupon', title: '프로모션 쿠폰 메일', subtitle: '이동 2026.07.08 · 원래 유형 Gmail', meta: '크기 68MB · 받은편지함에서 이동', badge: '복구 가능' },
  { id: 'trash-event', title: '이벤트 안내 메일', subtitle: '이동 2026.07.06 · 원래 유형 Gmail', meta: '크기 52MB · 광고함에서 이동', badge: '복구 가능' },
];

const emptyScanSummary: ScanSummary = {
  mailItems: [],
  driveItems: [],
  largeItems: [],
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

  const selectedDriveFiles = scanSources.drive
    ? auraDriveFiles.filter((file) => {
        const typeAllowed = selectedFileTypes[file.type] ?? true;
        const inFolder = scanSources.folder ? selectedDriveFileIds.includes(file.id) : true;
        const driveHaystack = `${file.title} ${file.folderPath} ${file.reason} ${file.type}`.toLowerCase();
        const protectedFile = loweredExclude.some((keyword) => driveHaystack.includes(keyword));
        return typeAllowed && inFolder && !protectedFile;
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
    storageMailItems: mailCandidates.map((mail) => ({
      id: `storage-${mail.id}`,
      title: mail.from,
      subtitle: mail.title,
      meta: `받은날짜 ${mail.receivedAt} · ${mail.folder} · ${formatDataSize(mail.sizeMB)}`,
    })),
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
    storageTrashItems: totalSize > 0
      ? [
          ...sampleTrashItems,
          ...selectedDriveFiles.slice(0, 3).map((file) => ({
            id: `trash-drive-${file.id}`,
            title: file.title,
            subtitle: `이동 ${formatMonthLabel(maxScanMonthIndex).replace('년 ', '.').replace('월', '.23')} · 원래 유형 Drive`,
            meta: `${formatDataSize(file.sizeMB)} · ${file.folderPath}`,
          })),
        ]
      : [],
    mailSizeLabel: formatDataSize(mailSize),
    driveSizeLabel: formatDataSize(driveSize),
    largeSizeLabel: formatDataSize(largeSize),
    totalSizeLabel: formatDataSize(totalSize),
    carbonLabel: `약 ${carbon.toFixed(1)}g CO₂`,
    candidateCount: mailItems.length + driveItems.length,
    folderLabel,
  };
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('initial');
  const [history, setHistory] = useState<Screen[]>([]);
  const [lastTabScreens, setLastTabScreens] = useState<Record<MainTab, Screen>>({
    home: 'home',
    storage: 'storageMail',
    settings: 'settings',
  });
  const [tabHistories, setTabHistories] = useState<Record<MainTab, Screen[]>>({
    home: [],
    storage: [],
    settings: [],
  });
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [privacyDetailChecked, setPrivacyDetailChecked] = useState(false);
  const [permissions, setPermissions] = useState({ gmail: false, drive: false, alarm: false });
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
  const [storageDriveFolder, setStorageDriveFolder] = useState(driveRootPath);
  const [storageTrashMovedKeys, setStorageTrashMovedKeys] = useState<string[]>([]);
  const [storageDeletedKeys, setStorageDeletedKeys] = useState<string[]>([]);
  const [storageDriveMoveTargets, setStorageDriveMoveTargets] = useState<StorageDriveMoveTargets>({});
  const [selectedDriveFolders, setSelectedDriveFolders] = useState<string[]>([]);
  const [selectedDriveFiles, setSelectedDriveFiles] = useState<string[]>([]);
  const [includeSubFolders, setIncludeSubFolders] = useState(true);
  const [periodRange, setPeriodRange] = useState('3년 이상');
  const [openedYearRange, setOpenedYearRange] = useState<MonthRange>({ from: toMonthIndex(2023, 1), to: maxScanMonthIndex });
  const [modifiedYearRange, setModifiedYearRange] = useState<MonthRange>({ from: toMonthIndex(2022, 1), to: maxScanMonthIndex });
  const [yearSheetType, setYearSheetType] = useState<'opened' | 'modified' | null>(null);
  const [periodEditOnly, setPeriodEditOnly] = useState(false);
  const [scanSourceEditOnly, setScanSourceEditOnly] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [scanProgress, setScanProgress] = useState(0);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [deleteJobStatus, setDeleteJobStatus] = useState<'idle' | 'running' | 'completed'>('idle');
  const [homeScanNotice, setHomeScanNotice] = useState<'none' | 'running' | 'cancelled' | 'completed'>('none');
  const [lastScan, setLastScan] = useState<ScanRecord | null>(null);
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
  const filterSheetMotion = useRef(new Animated.Value(1)).current;
  const deleteConfirmMotion = useRef(new Animated.Value(1)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const screenRef = useRef<Screen>('initial');
  const scanSourceLabelRef = useRef('Gmail + Drive');
  const scanResultRef = useRef<ScanSummary>(emptyScanSummary);
  const [withdrawSheetVisible, setWithdrawSheetVisible] = useState(false);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [carbonHelpVisible, setCarbonHelpVisible] = useState(false);
  const [filterDate, setFilterDate] = useState('전체 기간');
  const [filterSize, setFilterSize] = useState('전체 용량');
  const [sortMode, setSortMode] = useState('날짜순');
  const [selectedScanItem, setSelectedScanItem] = useState<ScanListItem | null>(null);
  const [mailListMode, setMailListMode] = useState<'promo' | 'old'>('promo');
  const [carbonRecordIncluded, setCarbonRecordIncluded] = useState(true);
  const [keywordChoiceVisible, setKeywordChoiceVisible] = useState(false);
  const [keywordSheetType, setKeywordSheetType] = useState<'include' | 'exclude' | null>(null);
  const [settingsToggles, setSettingsToggles] = useState({
    scanComplete: true,
    aiNudge: true,
    marketing: false,
    autoScan: true,
  });

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
    if (target === 'privacy' || target === 'login') return 'initial';
    if (target === 'permissions') return 'login';
    if (target === 'gmailPermission' || target === 'drivePermission' || target === 'notificationPermission') return 'permissions';
    if (target === 'connected') return 'permissions';
    if (target === 'onboardingGhost') return 'connected';
    if (target === 'onboardingCarbon') return 'onboardingGhost';

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

  const formatYearRange = (range: MonthRange) => `${formatMonthLabel(range.from)}부터 ${formatMonthLabel(range.to)}까지`;
  const getPeriodLabel = () => `열람 ${formatYearRange(openedYearRange)} · 수정 ${formatYearRange(modifiedYearRange)}`;
  const getDefaultPeriodLabel = () => `수정 ${formatYearRange(modifiedYearRange)}`;

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
    setLastTabScreens({ home: 'home', storage: 'storageMail', settings: 'settings' });
    setTabHistories({ home: [], storage: [], settings: [] });
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
    setStorageDriveFolder(driveRootPath);
    setStorageTrashMovedKeys([]);
    setStorageDeletedKeys([]);
    setStorageDriveMoveTargets({});
    setSelectedDriveFolders([]);
    setSelectedDriveFiles([]);
    setIncludeSubFolders(true);
    setOpenedYearRange({ from: toMonthIndex(2023, 1), to: maxScanMonthIndex });
    setModifiedYearRange({ from: toMonthIndex(2022, 1), to: maxScanMonthIndex });
    setPeriodEditOnly(false);
    setScanSourceEditOnly(false);
    setChecked({});
    setScanProgress(0);
    setDeleteProgress(0);
    setDeleteJobStatus('idle');
    setHomeScanNotice('none');
    setLastScan(null);
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

  const showPermissionToast = () => {
    showToast('Gmail 또는 Google Drive의 접근 권한을 허용해주세요');
  };

  const openCompletedScanResult = () => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    setPermissionToast('');
    setToastTarget(null);
    replace('candidateSummary');
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
        body: '정리 후보와 예상 탄소 절감량이 준비됐어요.',
      }) as { onclick?: () => void };
      notification.onclick = openCompletedScanResult;
      return;
    }

    if (maybeNotification.permission === 'default' && maybeNotification.requestPermission) {
      maybeNotification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          const notification = new maybeNotification('AURA 스캔 완료', {
            body: '정리 후보와 예상 탄소 절감량이 준비됐어요.',
          }) as { onclick?: () => void };
          notification.onclick = openCompletedScanResult;
        }
      });
    }
  };

  const startScan = () => {
    if (!scanSources.gmail && !scanSources.drive && !scanSources.folder) {
      showPermissionToast();
      return;
    }
    if (scanSources.folder && !selectedDriveFolders.length && !selectedDriveFiles.length) {
      showToast('분석할 Drive 폴더나 문서를 선택해주세요');
      go('scanFlowFolder');
      return;
    }
    scanSourceLabelRef.current = getSimpleScanSourceLabel();
    scanResultRef.current = getLiveScanResult();
    setScanProgress(0);
    setHomeScanNotice('running');
    go('scanProgress');
  };

  const cancelScan = () => {
    setHomeScanNotice('cancelled');
    setScanProgress(0);
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
    const visibleFolders = getVisibleDriveFolders(driveCurrentFolder, driveFolderSearch);
    const visibleFiles = driveFolderSearch.trim() ? [] : getDirectDriveFiles(driveCurrentFolder);

    if (!visibleFolders.length && !visibleFiles.length) {
      showToast('선택할 Drive 항목이 없어요');
      return;
    }

    const visibleFolderGroups = visibleFolders.flatMap((folder) => getDriveFolderSelectionGroup(folder.name));
    const visibleFileIds = Array.from(new Set([
      ...visibleFolders.flatMap((folder) => getDriveFileSelectionGroup(folder.name).map((file) => file.id)),
      ...visibleFiles.map((file) => file.id),
    ]));
    const allSelected =
      visibleFolderGroups.every((folder) => selectedDriveFolders.includes(folder)) &&
      visibleFileIds.every((fileId) => selectedDriveFiles.includes(fileId));
    if (allSelected) {
      setSelectedDriveFolders((items) => {
        const next = items.filter((item) => !visibleFolderGroups.includes(item));
        const nextFiles = selectedDriveFiles.filter((item) => !visibleFileIds.includes(item));
        setSelectedDriveFiles(nextFiles);
        setScanSources((sources) => ({ ...sources, folder: Boolean(next.length || nextFiles.length), drive: next.length || nextFiles.length ? true : sources.drive }));
        return next;
      });
      return;
    }

    setSelectedDriveFolders((items) => Array.from(new Set([...items, ...visibleFolderGroups])));
    setSelectedDriveFiles((items) => Array.from(new Set([...items, ...visibleFileIds])));
    setScanSources((items) => ({ ...items, drive: true, folder: true }));
  };

  const back = () => {
    if (screen === 'privacy') {
      setPrivacyChecked(privacyDetailChecked);
    }

    if (screen === 'onboardingGhost') {
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
    setDeleteProgress(0);
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

  const completePrivacyAndBack = () => {
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
      setConnectedDone(false);
      setConnectedStep(0);
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
    if (screen !== 'connected' || !connectedDone) return;
    if (skipConnectedAnimation) {
      setConnectedStep(3);
      return;
    }

    const gmailTimer = setTimeout(() => setConnectedStep(1), 430);
    const driveTimer = setTimeout(() => setConnectedStep(2), 900);
    const buttonTimer = setTimeout(() => setConnectedStep(3), 1400);

    return () => {
      clearTimeout(gmailTimer);
      clearTimeout(driveTimer);
      clearTimeout(buttonTimer);
    };
  }, [screen, connectedDone, skipConnectedAnimation]);

  useEffect(() => {
    if (homeScanNotice !== 'running') return;

    const timer = setInterval(() => {
      setScanProgress((value) => {
        const next = Math.min(100, value + 4);
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(() => {
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

    const timer = setInterval(() => {
      setDeleteProgress((value) => {
        const next = Math.min(100, value + 4);
        if (next >= 100) {
          clearInterval(timer);
          setDeleteJobStatus('completed');
          setTimeout(() => {
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
    const defaultSelected = /^(mail|drive|large|storageMail|storageDrive|storageTrash|storageDriveTrash):/.test(key);
    setChecked((items) => ({ ...items, [key]: !(items[key] ?? defaultSelected) }));
  };

  const setAll = (prefix: string, keys: string[]) => {
    const defaultSelected = /^(mail|drive|large|storageMail|storageDrive|storageTrash|storageDriveTrash)$/.test(prefix);
    const allChecked = keys.every((key) => checked[`${prefix}:${key}`] ?? defaultSelected);
    setChecked((items) => {
      const next = { ...items };
      keys.forEach((key) => {
        next[`${prefix}:${key}`] = !allChecked;
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
    setSelectedDriveFolders((items) => {
      const folderGroup = getDriveFolderSelectionGroup(folder);
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

  const toggleDriveFile = (fileId: string) => {
    setSelectedDriveFiles((items) => {
      const next = items.includes(fileId) ? items.filter((item) => item !== fileId) : [...items, fileId];
      setScanSources((sources) => ({ ...sources, drive: next.length || selectedDriveFolders.length ? true : sources.drive, folder: Boolean(next.length || selectedDriveFolders.length) }));
      return next;
    });
  };

  const render = () => {
    const visibleDriveFolders = getVisibleDriveFolders(driveCurrentFolder, driveFolderSearch);
    const visibleDriveFolderGroups = visibleDriveFolders.flatMap((folder) => getDriveFolderSelectionGroup(folder.name));
    const visibleDriveFilePreviews = driveFolderSearch.trim() ? [] : getDirectDriveFiles(driveCurrentFolder);
    const visibleDriveFileIds = Array.from(new Set([
      ...visibleDriveFolders.flatMap((folder) => getDriveFileSelectionGroup(folder.name).map((file) => file.id)),
      ...visibleDriveFilePreviews.map((file) => file.id),
    ]));
    const allDriveFoldersSelected =
      (visibleDriveFolderGroups.length > 0 || visibleDriveFileIds.length > 0) &&
      visibleDriveFolderGroups.every((folder) => selectedDriveFolders.includes(folder)) &&
      visibleDriveFileIds.every((fileId) => selectedDriveFiles.includes(fileId));
    const driveParentFolder = getDriveParentPath(driveCurrentFolder);
    const isDriveSearching = Boolean(driveFolderSearch.trim());
    const activeScanResult = lastScan?.result ?? scanResultRef.current;
    const promoMailItems = activeScanResult.mailItems.filter((item) => item.desc.includes('광고') || item.desc.includes('프로모션'));
    const oldMailItems = activeScanResult.mailItems.filter((item) => !promoMailItems.some((mail) => mail.id === item.id));
    const largeDriveIds = new Set(activeScanResult.largeItems.map((item) => item.id));
    const driveRegularItems = activeScanResult.driveItems.filter((item) => !largeDriveIds.has(item.id));
    const filteredPromoMailItems = applyResultFilterSort(promoMailItems, filterDate, filterSize, sortMode);
    const filteredOldMailItems = applyResultFilterSort(oldMailItems, filterDate, filterSize, sortMode);
    const filteredDriveItems = applyResultFilterSort(driveRegularItems, filterDate, filterSize, sortMode);
    const filteredLargeItems = applyResultFilterSort(activeScanResult.largeItems, filterDate, filterSize, sortMode);
    const activeMailListItems = mailListMode === 'promo' ? filteredPromoMailItems : filteredOldMailItems;
    const activeMailListTitle = mailListMode === 'promo' ? '광고·프로모션 메일' : '오래된 메일';
    const promoMailCount = promoMailItems.length;
    const oldMailCount = oldMailItems.length;
    const driveCandidateCount = driveRegularItems.length || activeScanResult.driveItems.length;
    const selectedMailItems = activeScanResult.mailItems.filter((item) => checked[`mail:${item.id}`] ?? true);
    const selectedDriveItems = activeScanResult.driveItems.filter((item) => checked[`drive:${item.id}`] ?? true);
    const selectedPromoMailCount = promoMailItems.filter((item) => checked[`mail:${item.id}`] ?? true).length;
    const selectedOldMailCount = oldMailItems.filter((item) => checked[`mail:${item.id}`] ?? true).length;
    const selectedLargeDriveCount = activeScanResult.largeItems.filter((item) => checked[`drive:${item.id}`] ?? true).length;
    const selectedRegularDriveCount = driveRegularItems.filter((item) => checked[`drive:${item.id}`] ?? true).length;
    const selectedMailCleanupCount = selectedMailItems.length;
    const selectedDriveCleanupCount = selectedDriveItems.length;
    const selectedCandidateCount = selectedMailItems.length + selectedDriveItems.length;
    const selectedTotalSizeMB = sumScanItemSize(selectedMailItems) + sumScanItemSize(selectedDriveItems);
    const selectedTotalSizeLabel = formatDataSize(selectedTotalSizeMB);
    const remainingAfterCleanup = activeScanResult.totalSizeLabel === '0MB' ? '2.6GB' : '4.7GB';
    const excludedCandidateCount = Math.max(0, activeScanResult.candidateCount - selectedCandidateCount);
    const checkedCleanupSizeLabel = selectedTotalSizeLabel;
    const checkedCarbonValue = Math.max(0, (selectedTotalSizeMB / 1024) * 0.19);
    const checkedCarbonLabel = `${checkedCarbonValue.toFixed(checkedCarbonValue >= 1 ? 1 : 1)}g CO₂`;
    const includedCarbonLabel = carbonRecordIncluded ? checkedCarbonLabel : '0.0g CO₂';
    const includedCarbonDisplay = includedCarbonLabel.replace('CO₂', 'CO₂e');

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
            <Text style={styles.heroTitle}>메일과 파일을 가볍게{'\n'}탄소까지 줄이는 AURA</Text>
            <PrimaryButton
              title="구글 계정으로 계속"
              onPress={() => {
                if (!privacyChecked) {
                  showToast('개인정보 수집 및 분석 동의가 필요합니다');
                  return;
                }
                go('login');
              }}
              inline
            />
            <Pressable style={styles.initialConsentLink} onPress={() => go('privacy')}>
              <View style={styles.initialConsentLinkTextBox}>
                <View style={styles.initialConsentTitleRow}>
                  <CheckBox checked={privacyChecked} onPress={() => go('privacy')} compact />
                  <Text style={styles.initialConsentLinkText}>개인정보 수집 및 분석 동의 보기</Text>
                </View>
                <View style={styles.initialConsentLinkLine} />
              </View>
            </Pressable>
            <Text style={styles.helperText}>동의 내용을 확인한 뒤 로그인할 수 있어요.</Text>
          </ScreenShell>
        );

      case 'privacy':
        return (
          <ScreenShell title="개인정보 수집·이용 동의" subtitle="현재 동의 내용과 이용 범위를 확인합니다" noNav>
            <Card style={styles.privacyCombinedCard}>
              <View style={styles.privacyBlock}>
                <SectionTitle>수집 및 이용 항목</SectionTitle>
                <PrivacyBody>· Google 계정 식별 정보{'\n'}· Gmail 제목·날짜·첨부 용량{'\n'}· Drive 파일명·용량·수정일·해시{'\n'}· 정리 및 분석 기록</PrivacyBody>
              </View>
              <View style={styles.privacyBlock}>
                <SectionTitle>이용 목적</SectionTitle>
                <PrivacyBody>· 맞춤형 유령 데이터 탐지{'\n'}· 중복 파일 비교와 정리 추천{'\n'}· 탄소 절감량 계산 및 통계</PrivacyBody>
              </View>
              <View style={styles.privacyBlock}>
                <SectionTitle>보유 기간</SectionTitle>
                <PrivacyBody>서비스 탈퇴 또는 Google 연결 해제 시까지</PrivacyBody>
              </View>
            </Card>
            <Pressable style={[styles.consentRow, styles.privacyAgreeRow]} onPress={togglePrivacyConsent}>
              <CheckBox checked={privacyDetailChecked} onPress={togglePrivacyConsent} />
              <Text style={styles.consentText}>필수 수집 및 분석에 동의합니다</Text>
            </Pressable>
            <PrimaryButton
              title="동의하고 초기화면으로"
              onPress={completePrivacyAndBack}
            />
          </ScreenShell>
        );

      case 'login':
        return (
          <ScreenShell title="Google 로그인" subtitle="AURA에 사용할 계정을 선택하세요" noNav>
            <Logo medium />
            <InfoRow title="user@gmail.com" desc="Gmail · Drive 연결 사용" />
            <InfoRow title="다른 계정 사용" desc="새 Google 계정으로 로그인" />
            <PrimaryButton title="선택한 계정으로 계속" onPress={() => go('permissions')} />
          </ScreenShell>
        );

      case 'permissions':
        return (
          <ScreenShell title="서비스 권한 연결" subtitle="분석에 필요한 범위를 선택하세요" noNav>
            <PermissionRow
              title="Gmail 접근"
              desc="제목 · 날짜 · 첨부 용량"
              checked={permissions.gmail}
              onPress={() => go('gmailPermission')}
            />
            <PermissionRow
              title="Google Drive 접근"
              desc="파일명 · 크기 · 수정일 · 해시"
              checked={permissions.drive}
              onPress={() => go('drivePermission')}
            />
            <PermissionRow
              title="알림 권한"
              desc="스캔 완료 및 스캔 권장"
              checked={permissions.alarm}
              onPress={() => go('notificationPermission')}
            />
            <View style={styles.flexGrow} />
            <PrimaryButton
              title="선택 권한 연결하기"
              onPress={() => {
                if (!permissions.gmail && !permissions.drive) {
                  showPermissionToast();
                  return;
                }
                if (!permissions.alarm) {
                  setSettingsToggles((s) => ({ ...s, scanComplete: false, aiNudge: false }));
                }
                setScanSources({ gmail: permissions.gmail, drive: permissions.drive, folder: false });
                go('connected');
              }}
            />
            <Text style={styles.helperText}>메일과 파일의 원문 내용은 AI에게 전달되지 않아요.</Text>
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
            setSettingsToggles={setSettingsToggles}
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
              <RevealIn duration={skipConnectedAnimation ? 0 : 420} distance={skipConnectedAnimation ? 0 : 6}>
                <Text style={styles.centerTitle}>모든 서비스가 연결됐어요</Text>
              </RevealIn>
            ) : (
              <View style={styles.centerTitleSpace} />
            )}
            <ConnectedInfoRow title="Gmail" desc="읽기 범위 연결" status={permissions.gmail ? '연결됨' : '연결안됨'} visible={connectedStep >= 1} />
            <ConnectedInfoRow title="Drive" desc="파일 스캔 범위 연결" status={permissions.drive ? '연결됨' : '연결안됨'} visible={connectedStep >= 2} />
            {connectedStep >= 3 ? (
              <RevealIn style={styles.connectedButtonReveal} duration={skipConnectedAnimation ? 0 : 560} distance={skipConnectedAnimation ? 0 : 12}>
                <PrimaryButton title="AURA 둘러보기" onPress={() => go('onboardingGhost')} inline />
              </RevealIn>
            ) : (
              <View style={styles.connectedButtonPlaceholder} />
            )}
          </ScreenShell>
        );

      case 'onboardingGhost':
        return (
          <ScreenShell title="온보딩 · 유령 데이터" noNav>
            <GhostScanAnimation skip={onboardingGhostDone} onDone={() => setOnboardingGhostDone(true)} />
            <Text style={styles.centerBody}>오래된 메일과 방치된 파일을 찾아{'\n'}정리 후보로 제안해요.</Text>
            {onboardingGhostDone ? (
              <RevealIn style={styles.onboardingButtonReveal} duration={560} distance={12}>
                <PrimaryButton title="다음" onPress={() => go('onboardingCarbon')} inline />
              </RevealIn>
            ) : (
              <View style={styles.onboardingButtonPlaceholder} />
            )}
          </ScreenShell>
        );

      case 'onboardingCarbon':
        return (
          <ScreenShell title="온보딩 · 탄소 절감" noNav>
            <CarbonSaveAnimation skip={onboardingCarbonDone} onDone={() => setOnboardingCarbonDone(true)} />
            <Text style={styles.centerBody}>정리한 용량을 CO₂ 절감량으로 바꿔 보여줘요.</Text>
            {onboardingCarbonDone ? (
              <RevealIn style={styles.auraFeelReveal} duration={620} distance={14}>
                <Text style={styles.auraFeelText}>이제 AURA를 느껴볼까요!</Text>
              </RevealIn>
            ) : (
              <View style={styles.auraFeelPlaceholder} />
            )}
            {onboardingCarbonDone ? (
              <RevealIn style={styles.onboardingButtonReveal} duration={560} distance={12}>
                <PrimaryButton title="홈으로 시작" onPress={() => replace('home')} inline />
              </RevealIn>
            ) : (
              <View style={styles.onboardingButtonPlaceholder} />
            )}
          </ScreenShell>
        );

      case 'home':
        return (
          <ScreenShell compactTop>
            <LogoRow />
            <View style={styles.homeRule} />
            <Card tint style={styles.capacityCard}>
              <Text style={styles.cardLabel}>남은 용량</Text>
              <Text style={styles.bigNumber}>2.6GB</Text>
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
                <Text style={styles.meta}>
                  {lastScan ? `마지막 스캔 ${lastScan.dateLabel} · ${lastScan.sourceLabel}` : '마지막 스캔 없음'}
                </Text>
                <View style={styles.divider} />
                {lastScan ? (
                  <>
                    <View style={styles.rowBetween}>
                      <Text style={styles.cardLabel}>예상 탄소 절감량</Text>
                      <Text style={styles.resultText}>약 {checkedCarbonLabel}</Text>
                    </View>
                    <Text style={styles.meta}>후보 {selectedCandidateCount}개 · 예상 확보 {selectedTotalSizeLabel}</Text>
                  </>
                ) : (
                  <View style={styles.homeEmptySummary}>
                    <Text style={styles.homeEmptyTitle}>아직 분석 기록이 없어요</Text>
                    <Text style={styles.homeEmptyDesc}>스캔하면 정리 후보와 예상 탄소 절감량이 표시돼요.</Text>
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
                      <Text style={styles.scanStatusButtonText}>결과 보기</Text>
                    </Pressable>
                  </View>
                ) : null}
              </Card>
            ) : null}
            <View style={styles.homeActionSpacer} />
            <OutlineButton title="키워드·파일 조건 설정하기" onPress={() => go('keywordFile')} />
            <Text style={styles.helperText}>조건 없어도 AI가 자동으로 분석해요.</Text>
            <PrimaryButton
              title={homeScanNotice === 'completed' ? '결과 보기' : homeScanNotice === 'running' ? '스캔중' : '스캔하기'}
              onPress={handleHomeScanPress}
              inline
            />
          </ScreenShell>
        );

      case 'recentDetail':
        return lastScan ? (
          <ScreenShell title="최근 분석 상세" subtitle="마지막으로 완료된 스캔 결과입니다">
            <View style={styles.recentHeroCard}>
              <Text style={styles.infoTitle}>최근 분석 요약</Text>
              <Text style={styles.recentHeroDate}>{lastScan.dateLabel}</Text>
              <Text style={styles.infoDesc}>{lastScan.sourceLabel} · {lastScan.conditionLabel}</Text>
              <View style={styles.thinDivider} />
              <View style={styles.rowBetween}>
                <Text style={styles.cardLabel}>정리 후보</Text>
                <Text style={styles.rowRight}>{selectedCandidateCount}개</Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.cardLabel}>예상 확보</Text>
                <Text style={styles.rowRight}>{selectedTotalSizeLabel}</Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.cardLabel}>예상 탄소 절감</Text>
                <Text style={styles.rowRight}>약 {checkedCarbonLabel}</Text>
              </View>
            </View>
            <SectionTitle>분류별 결과</SectionTitle>
            <RecentResultRow
              title="광고·프로모션 메일"
              desc="광고 키워드가 포함된 메일"
              value={`${promoMailCount}개\n${formatDataSize(sumScanItemSize(promoMailItems))}`}
            />
            <RecentResultRow
              title="오래된 메일"
              desc="오랫동안 열지 않은 메일"
              value={`${oldMailCount}개\n${formatDataSize(sumScanItemSize(oldMailItems))}`}
            />
            <RecentResultRow
              title="중복 및 오래된 Drive 파일"
              desc="대용량 항목과 겹치지 않는 Drive 후보"
              value={`${driveCandidateCount}개\n${formatDataSize(sumScanItemSize(driveRegularItems))}`}
            />
            <RecentResultRow
              title="대용량 파일"
              desc="600MB 이상 또는 중복 백업 파일"
              value={`${activeScanResult.largeItems.length}개\n${activeScanResult.largeSizeLabel}`}
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
          <ScreenShell title="메일 키워드" subtitle="메일 키워드와 Drive 파일 유형을 설정합니다">
            <InfoRow title="메일 포함 키워드" desc={includeKeywords.join(', ')} onPress={() => openKeywordSheet('include')} />
            <InfoRow title="메일 제외 키워드" desc={excludeKeywords.join(', ')} onPress={() => openKeywordSheet('exclude')} />
            <Pressable style={styles.attachmentOptionCard} onPress={() => setIncludeMailAttachments((value) => !value)}>
              <View style={styles.infoMain}>
                <Text style={styles.infoTitle}>메일 첨부파일 포함</Text>
                <Text style={styles.infoDesc}>메일에 포함된 대용량 첨부파일도 함께 분석</Text>
              </View>
              <CheckBox checked={includeMailAttachments} onPress={() => setIncludeMailAttachments((value) => !value)} compact />
            </Pressable>
            <SectionTitle>Drive 파일 유형</SectionTitle>
            <View style={styles.chipWrap}>
              {['PDF', 'DOCX', 'ZIP', 'JPG'].map((item) => (
                <Chip key={item} label={item} selected={Boolean(selectedFileTypes[item])} onPress={() => toggleFileType(item)} />
              ))}
            </View>
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
          <ScreenShell title="스캔 소스 선택" subtitle="분석할 저장소를 선택하세요">
            <ScanSourceCard
              title="Gmail"
              desc="메일과 첨부파일만 분석"
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
              desc="파일과 중복 해시만 분석"
              checked={scanSources.folder}
              detail="폴더 선택"
              onPress={() => {
                if (!permissions.drive) {
                  showToast('연결이 허용되지 않았어요');
                  return;
                }
                if (scanSources.folder) {
                  setScanSources((items) => ({ ...items, drive: false, folder: false }));
                  setSelectedDriveFolders([]);
                  return;
                }
                setScanSources((items) => ({ ...items, drive: true, folder: true }));
              }}
              onDetailPress={() => {
                if (!permissions.drive) {
                  showToast('연결이 허용되지 않았어요');
                  return;
                }
                setScanSources((items) => ({ ...items, drive: true, folder: true }));
                go('scanFlowFolder');
              }}
            />
            <Text style={styles.helperText}>선택한 필터는 설정 › 기본 스캔 조건에서 변경할 수 있어요.</Text>
            <PrimaryButton
              title={scanSourceEditOnly ? '조건 적용하기' : '다음'}
              onPress={() => {
                if (scanSourceEditOnly) {
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
          <ScreenShell title="Drive 폴더 선택" subtitle="선택한 폴더만 빠르게 분석">
            <View style={styles.folderSearchBox}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                value={driveFolderSearch}
                onChangeText={setDriveFolderSearch}
                placeholder="폴더 이름 검색"
                placeholderTextColor="#6B8194"
                style={styles.folderSearchInput}
              />
            </View>
            <Pressable style={styles.folderSelectAllCard} onPress={toggleAllDriveFolders}>
              <CheckBox checked={allDriveFoldersSelected} onPress={toggleAllDriveFolders} compact />
              <View style={styles.infoMain}>
                <Text style={styles.infoTitle}>{allDriveFoldersSelected ? '전체 선택 해제' : '전체 선택'}</Text>
                <Text style={styles.infoDesc}>
                  {visibleDriveFolderGroups.length || visibleDriveFileIds.length
                    ? `${visibleDriveFolderGroups.filter((folder) => selectedDriveFolders.includes(folder)).length + visibleDriveFileIds.filter((fileId) => selectedDriveFiles.includes(fileId)).length}/${visibleDriveFolderGroups.length + visibleDriveFileIds.length}개 항목 선택됨`
                    : '선택할 항목이 없어요'}
                </Text>
              </View>
            </Pressable>
            {!isDriveSearching && driveCurrentFolder !== driveRootPath ? (
              <Pressable
                style={styles.folderBreadcrumbCard}
                onPress={() => setDriveCurrentFolder(driveParentFolder ?? driveRootPath)}
              >
                <Text style={styles.folderBreadcrumbTitle}>‹ 상위 폴더로</Text>
                <Text style={styles.folderBreadcrumbText}>{driveCurrentFolder}</Text>
              </Pressable>
            ) : null}
            {visibleDriveFolders.length ? (
              visibleDriveFolders.map((folder) => (
                <FolderRow
                  key={folder.name}
                  title={isDriveSearching ? folder.name : getDriveFolderName(folder.name)}
                  desc={isDriveSearching ? folder.meta : `${folder.meta} · ${folder.name}`}
                  selected={selectedDriveFolders.includes(folder.name)}
                  canOpen={hasDriveFolderContents(folder.name)}
                  onPress={() => toggleDriveFolder(folder.name)}
                  onOpen={() => {
                    setDriveFolderSearch('');
                    setDriveCurrentFolder(folder.name);
                  }}
                />
              ))
            ) : null}
            {visibleDriveFilePreviews.map((file) => (
              <DriveFolderFileRow
                key={file.id}
                file={file}
                selected={selectedDriveFiles.includes(file.id)}
                onPress={() => toggleDriveFile(file.id)}
              />
            ))}
            {!visibleDriveFolders.length && !visibleDriveFilePreviews.length ? (
              <EmptyState
                title={driveFolderSearch.trim() ? '폴더 없음' : '비어있는 폴더'}
                desc={driveFolderSearch.trim() ? '검색 결과에 해당하는 폴더가 없어요.' : '현재 폴더 안에 하위 폴더나 문서가 없어요.'}
              />
            ) : null}
            <PrimaryButton title="폴더 분석하기" onPress={() => (scanSourceEditOnly ? replace('scanFlowSource') : back())} />
          </ScreenShell>
        );

      case 'scanFlowPeriod':
        return (
          <ScreenShell title="기간 조건" subtitle="마지막 사용 시점을 설정하세요">
            <View style={styles.periodHeroCard}>
              <Text style={styles.infoTitle}>기간 범위</Text>
              <Text style={styles.infoDesc}>마지막으로 연 날짜와 마지막 수정일을 따로 설정할 수 있어요.</Text>
            </View>
            <SectionTitle>기간 조건</SectionTitle>
            <InfoRow title="마지막으로 연 날짜" desc={formatYearRange(openedYearRange)} right="설정  ›" onPress={() => openYearSheet('opened')} />
            <InfoRow title="마지막 수정일" desc={formatYearRange(modifiedYearRange)} right="설정  ›" onPress={() => openYearSheet('modified')} />
            <CheckLine label="최근 30일 내 사용 데이터는 보관" checked={checked['period:recent']} onPress={() => toggleCheck('period:recent')} />
            <PrimaryButton
              title={periodEditOnly ? '기간 조건 저장' : '기간 조건 저장 후 스캔하기'}
              onPress={
                periodEditOnly
                  ? () => {
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
          <ScreenShell title="스캔 소스 선택" subtitle="분석할 데이터를 선택하세요">
            <InfoRow title="Gmail" desc="메일함 메타데이터 분석" />
            <InfoRow title="Drive" desc="파일명·크기·수정일 분석" />
            <InfoRow title="특정 Drive 폴더" desc="선택 폴더만 빠르게 분석" onPress={() => go('driveFolder')} />
            <PrimaryButton title="다음" onPress={() => go('period')} />
          </ScreenShell>
        );

      case 'driveFolder':
        return (
          <ScreenShell title="Drive 폴더 선택">
            {['AURA 작업물', '개인 자료', '학교 과제', '디자인 자료'].map((item) => (
              <InfoRow key={item} title={item} desc="Google Drive 폴더" />
            ))}
            <PrimaryButton title="선택한 폴더 분석하기" onPress={() => go('period')} />
          </ScreenShell>
        );

      case 'period':
        return (
          <ScreenShell title="기간 조건">
            <InfoRow title="마지막으로 연 날짜" desc="3년 이상" />
            <InfoRow title="수정일" desc="2년 이상" />
            <CheckLine label="최근 사용한 항목 제외" checked={checked['period:recent']} onPress={() => toggleCheck('period:recent')} />
            <PrimaryButton title="기간 조건 적용 & 스캔하기" onPress={startScan} />
          </ScreenShell>
        );

      case 'scanProgress':
        return (
          <View style={styles.scanOverlayScreen}>
            <View style={styles.scanOverlayHomePreview}>
              <LogoRow />
              <View style={styles.homeRule} />
              <Card tint style={styles.capacityCard}>
                <Text style={styles.cardLabel}>남은 용량</Text>
                <Text style={styles.bigNumber}>2.6GB</Text>
              </Card>
              <Card tint style={styles.homeSummaryCard}>
                <Text style={styles.cardTitle}>최근 분석 요약</Text>
                <Text style={styles.meta}>{lastScan ? `마지막 스캔 ${lastScan.dateLabel}` : '마지막 스캔 없음'}</Text>
              </Card>
            </View>
            <View style={styles.scanSidePanel}>
              <DeviceStatusBar compact />
              <View style={styles.scanPanelHeader}>
                <Pressable style={styles.scanCloseButton} onPress={() => replace('home')}>
                  <Text style={styles.modalClose}>×</Text>
                </Pressable>
                <View style={styles.infoMain}>
                  <Text style={styles.title}>스캔 진행 중</Text>
                  <Text style={styles.scanPanelSubtitle}>홈으로 돌아가도 분석은 계속됩니다</Text>
                </View>
              </View>
              <View style={styles.scanFloatingPanel}>
                <View style={styles.rowBetween}>
                  <View style={styles.infoMain}>
                    <Text style={styles.infoTitleLarge}>AURA가 분석 중이에요</Text>
                    <Text style={styles.infoDesc}>분석 범위: {scanSourceLabelRef.current}</Text>
                    <Text style={styles.scanConditionLine}>조건: {getPeriodLabel()}</Text>
                  </View>
                  <Text style={styles.scanPercent}>{scanProgress}%</Text>
                </View>
                <ProgressCircle progress={scanProgress} compact />
                <Text style={styles.centerBody}>메일과 파일의 기본 정보만 확인하며 정리 후보를 찾고 있어요.</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${scanProgress}%` }]} />
              </View>
              <OutlineButton
                title="취소하기"
                onPress={cancelScan}
              />
            </View>
          </View>
        );

      case 'candidateSummary':
        return (
          <ScreenShell title="분석 결과 요약" subtitle="기본적으로 모든 후보가 선택돼 있어요">
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
              title="중복 및 오래된 Drive 파일"
              desc={`${driveCandidateCount}개 · ${formatDataSize(sumScanItemSize(driveRegularItems))}`}
              onPress={() => go('driveList')}
            />
            <ResultCategoryCard
              title="대용량 파일"
              desc={`${activeScanResult.largeItems.length}개 · ${activeScanResult.largeSizeLabel}`}
              onPress={() => go('largeList')}
            />
            <Text style={styles.resultGuideText}>삭제하지 않을 항목이 있는지 확인하세요.</Text>
            <PrimaryButton title="다음" onPress={() => go('selectedReview')} />
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
            title="Drive 결과 목록"
            prefix="drive"
            items={filteredDriveItems}
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

      case 'mailDetail':
        return (
          <ScanItemDetailScreen
            title="메일 상세"
            subtitle="선정 이유와 메타데이터"
            item={selectedScanItem ?? activeScanResult.mailItems[0]}
            kind="mail"
          />
        );

      case 'fileDetail':
        return (
          <ScanItemDetailScreen
            title="파일 상세"
            subtitle="미리보기 · 메타데이터 · 선정 이유"
            item={selectedScanItem ?? activeScanResult.driveItems[0] ?? activeScanResult.largeItems[0]}
            kind="drive"
          />
        );

      case 'selectedReview':
        return (
          <ScreenShell title="선택 항목 검토" subtitle="삭제 제외 항목은 체크를 해제하세요">
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
            {excludedCandidateCount ? (
              <Text style={styles.reviewWarningText}>체크 해제한 {excludedCandidateCount}개 항목은 휴지통 이동 대상에서 제외됩니다.</Text>
            ) : (
              <Text style={styles.reviewWarningText}>보호할 항목이 있다면 이전 목록에서 체크를 해제하세요.</Text>
            )}
            <PrimaryButton title="휴지통으로 이동" onPress={() => go('deleteConfirm')} />
          </ScreenShell>
        );

      case 'deleteConfirm':
        return (
          <View style={styles.modalScreenRoot}>
            <ScreenShell title="선택 항목 검토" subtitle="삭제 제외 항목은 체크를 해제하세요">
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
              <Text style={styles.reviewWarningText}>최종 승인 전까지 어떤 항목도 이동하지 않아요.</Text>
              <PrimaryButton title="휴지통으로 이동" onPress={() => {}} />
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
              <BottomSheetPanel motion={deleteConfirmMotion} outputRange={[0, 360]} style={styles.deleteApprovalPanel} onClose={back}>
                <Text style={styles.deleteApprovalTitle}>휴지통 이동을 승인하시겠어요?</Text>
                <Text style={styles.deleteApprovalDesc}>선택한 {selectedCandidateCount}개 항목 · {checkedCleanupSizeLabel}를 휴지통으로 이동합니다.</Text>
                <View style={styles.deleteApprovalInfoBox}>
                  <Text style={styles.deleteApprovalInfoTitle}>최종 승인 안내</Text>
                  <Text style={styles.deleteApprovalInfoText}>사용자가 최종 승인한 항목만 휴지통으로 이동합니다.</Text>
                  <Text style={styles.deleteApprovalInfoText}>휴지통 이동 후에도 실수한 항목은 복구할 수 있어요.</Text>
                </View>
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
          <ScreenShell title="삭제 진행" subtitle="앱을 닫아도 작업은 계속됩니다">
            <ProgressCircle progress={deleteProgress} />
            <DeleteStatusRow
              title="Gmail"
              desc={`${deleteProgress >= 45 ? activeScanResult.mailItems.length : Math.floor(activeScanResult.mailItems.length * deleteProgress / 45)} / ${activeScanResult.mailItems.length}개 완료`}
              status={deleteProgress >= 45 ? '완료' : '진행'}
            />
            <DeleteStatusRow
              title="Google Drive"
              desc={`${Math.min(activeScanResult.driveItems.length, Math.floor(activeScanResult.driveItems.length * Math.max(0, deleteProgress - 35) / 65))} / ${activeScanResult.driveItems.length}개 처리 중`}
              status={deleteProgress >= 100 ? '완료' : '진행'}
            />
            <Text style={styles.progressLabel}>전체 삭제 진행</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${deleteProgress}%` }]} />
            </View>
            <Text style={styles.progressRightText}>{deleteProgress}%</Text>
            <Text style={styles.centerBody}>현재 남은 용량 {remainingAfterCleanup}</Text>
          </ScreenShell>
        );

      case 'cleanupComplete':
        return (
          <ScreenShell title="정리 완료" subtitle="삭제 항목은 휴지통에서 복원할 수 있어요" hideBack>
            <View style={styles.cleanupCheckCircle}>
              <Text style={styles.cleanupCheckText}>✓</Text>
            </View>
            <Text style={styles.cleanupTitle}>정리가 완료됐어요!</Text>
            <View style={styles.resultMetricGrid}>
              <CleanupMetricCard label="정리 항목" value={`${selectedCandidateCount}개`} />
              <CleanupMetricCard label="확보 용량" value={checkedCleanupSizeLabel} />
              <CleanupMetricCard label="남은 용량" value={remainingAfterCleanup} />
              <CleanupMetricCard label="탄소 절감" value={checkedCarbonLabel.replace('CO₂', '')} />
            </View>
            <Pressable style={styles.carbonStandardCard} onPress={() => go('carbonBasis')}>
              <View style={styles.infoMain}>
                <Text style={styles.infoTitle}>탄소 환산 기준</Text>
                <Text style={styles.infoDesc}>5GB 정리 → 약 1.2g CO₂/월 절감</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
            <PrimaryButton title="탄소 절감 결과 보기" onPress={() => go('analysisHistory')} />
            <OutlineButton title="홈 화면 돌아가기" onPress={() => replace('home')} />
          </ScreenShell>
        );

      case 'carbonBasis':
        return (
          <ScreenShell title="탄소 환산 기준" subtitle="정리한 데이터의 예상 환경 효과를 계산합니다">
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
            scan={lastScan}
            permissions={permissions}
            checked={checked}
            toggle={toggleCheck}
            setAll={setAll}
            openFilter={openFilterSheet}
            showToast={showToast}
            onReconnect={openAccountFromPermissionRevoked}
            goMail={() => replace('storageMail')}
            goDrive={() => replace('storageDrive')}
            goTrash={() => replace(screen === 'storageDrive' || screen === 'storageDriveTrash' ? 'storageDriveTrash' : 'storageTrash')}
            storageDriveFolder={storageDriveFolder}
            setStorageDriveFolder={setStorageDriveFolder}
            storageTrashMovedKeys={storageTrashMovedKeys}
            storageDeletedKeys={storageDeletedKeys}
            storageDriveMoveTargets={storageDriveMoveTargets}
            setStorageTrashMovedKeys={setStorageTrashMovedKeys}
            setStorageDeletedKeys={setStorageDeletedKeys}
            setStorageDriveMoveTargets={setStorageDriveMoveTargets}
          />
        );

      case 'settings':
        return (
          <ScreenShell title="프로필 및 설정" subtitle="계정 · 알림 · 스캔 · 개인정보" hideBack tightBottom>
            <Pressable style={styles.settingsProfileCard} onPress={() => go('account')}>
              <View style={styles.infoMain}>
                <Text style={styles.infoTitleLarge}>user@gmail.com</Text>
                <Text style={styles.profileConnectionText}>
                  Gmail {permissions.gmail ? '연결됨' : '연결안됨'} / Drive {permissions.drive ? '연결됨' : '연결안됨'}
                </Text>
              </View>
              <View style={styles.smallPill}>
                <Text style={styles.smallPillText}>계정</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>

            <SectionTitle>알림</SectionTitle>
            <View style={styles.groupCard}>
              <ToggleRow
                title="스캔 완료 알림"
                desc="백그라운드 분석이 끝나면 알려드려요"
                value={settingsToggles.scanComplete}
                onPress={() => {
                  setSettingsToggles((s) => ({ ...s, scanComplete: !s.scanComplete }));
                }}
                plain
              />
              <View style={styles.thinDivider} />
              <ToggleRow
                title="스캔 권장 알림"
                desc="주 1회 스캔을 잊지 않게 알려드려요"
                value={settingsToggles.aiNudge}
                onPress={() => {
                  setSettingsToggles((s) => ({ ...s, aiNudge: !s.aiNudge }));
                }}
                plain
              />
            </View>

            <SectionTitle>스캔 설정</SectionTitle>
            <InfoRow title="기본 스캔 조건" desc="최근 사용한 기간·키워드 조건 적용" onPress={() => go('defaultScan')} />

            <SectionTitle>공지사항</SectionTitle>
            <InfoRow title="공지사항" desc="최신 공지를 확인해보세요" onPress={() => go('notice')} />

            <SectionTitle>개인정보 및 앱</SectionTitle>
            <InfoRow title="개인정보 및 데이터" desc="동의 내용 · 분석 기록 · 연결 해제" onPress={() => go('privacyData')} />
            <Text style={styles.versionText}>AURA 버전 1.0.0</Text>
          </ScreenShell>
        );

      case 'account':
        return (
          <ScreenShell title="계정 및 연결" subtitle="Google 계정과 서비스 권한을 관리합니다">
            <View style={styles.accountHeroCard}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>U</Text>
              </View>
              <View style={styles.infoMain}>
                <Text style={styles.infoTitleLarge}>user@gmail.com</Text>
                <Text style={styles.infoDesc}>Google 계정으로 로그인됨</Text>
                <View style={styles.outlineMiniPill}>
                  <Text style={styles.outlineMiniPillText}>계정 확인</Text>
                </View>
              </View>
            </View>

            <SectionTitle>연결된 서비스</SectionTitle>
            <View style={styles.groupCard}>
              <ServiceLinkRow letter="M" title="Gmail" connected={permissions.gmail} onPress={() => go('gmailPermission')} />
              <View style={styles.thinDivider} />
              <ServiceLinkRow letter="D" title="Google Drive" connected={permissions.drive} onPress={() => go('drivePermission')} />
            </View>

            <View style={styles.scopeCard}>
              <Text style={styles.scopeTitle}>현재 허용된 범위</Text>
              <Text style={styles.scopeDesc}>읽기 · 메타데이터 조회 · 선택 항목 삭제</Text>
            </View>

            <OutlineButton title="Google 권한 다시 확인" onPress={() => showToast('아직 준비 중인 기능입니다')} />
            <OutlineButton title="이 계정 연결 해제" onPress={() => showToast('계정 연결 해제는 발표용 화면에서는 실행하지 않아요')} />
            <Text style={styles.helperText}>연결 해제 시 스캔과 삭제 기능이 중단됩니다</Text>
          </ScreenShell>
        );

      case 'defaultScan':
        return (
          <ScreenShell title="기본 스캔 조건" subtitle="새 스캔을 시작할 때 적용할 기본값">
            <ToggleRow
              title="최근 사용 조건 자동 적용"
              desc="마지막 스캔 조건을 다음 스캔에 사용"
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

            <Pressable style={styles.keywordConditionCard} onPress={openKeywordChoiceSheet}>
              <View style={styles.rowBetween}>
                <Text style={styles.infoTitle}>메일 포함·제외 키워드</Text>
                <Text style={styles.chevron}>›</Text>
              </View>
              <Text style={styles.infoDesc}>포함 키워드와 제외 키워드를 다시 설정할 수 있어요</Text>
              <Text style={styles.infoTitle}>Drive 파일 유형</Text>
              <View style={styles.chipWrap}>
                {['PDF', 'DOCX', 'ZIP', 'JPG'].map((kind) => (
                  <Chip key={kind} label={kind} selected={Boolean(selectedFileTypes[kind])} onPress={() => toggleFileType(kind)} />
                ))}
              </View>
              <Pressable style={[styles.attachmentInlineCard, styles.attachmentInlineCardLarge]} onPress={() => setIncludeMailAttachments((value) => !value)}>
                <View style={styles.infoMain}>
                  <Text style={styles.infoTitle}>메일 첨부파일 포함</Text>
                  <Text style={styles.infoDesc}>메일에 포함된 대용량 첨부파일도 함께 분석</Text>
                </View>
                <CheckBox checked={includeMailAttachments} onPress={() => setIncludeMailAttachments((value) => !value)} compact />
              </Pressable>
            </Pressable>

            <ToggleRow
              title="중복 파일 검사"
              desc="SHA-256이 같은 파일을 함께 탐지"
              value={settingsToggles.marketing}
              onPress={() => setSettingsToggles((s) => ({ ...s, marketing: !s.marketing }))}
              tint
            />
            <PrimaryButton title="기본 조건 저장" onPress={back} />
          </ScreenShell>
        );

      case 'privacyData':
        return (
          <ScreenShell title="개인정보 및 데이터" subtitle="동의 내용과 AURA 내부 데이터를 관리합니다">
            <SectionTitle>동의 및 보관</SectionTitle>
            <View style={styles.groupCard}>
              <View style={styles.settingPlainRow}>
                <View style={styles.infoMain}>
                  <Text style={styles.infoTitle}>개인정보 수집·이용 동의</Text>
                  <Text style={styles.infoDesc}>수집 항목과 이용 목적 확인</Text>
                </View>
                <View style={styles.smallPill}>
                  <Text style={styles.smallPillText}>{privacyChecked ? '동의 완료' : '확인 필요'}</Text>
                </View>
              </View>
              <View style={styles.thinDivider} />
              <View style={styles.settingPlainRow}>
                <View style={styles.infoMain}>
                  <Text style={styles.infoTitle}>데이터 보관 기간</Text>
                  <Text style={styles.infoDesc}>서비스 탈퇴 또는 Google 연결 해제 시까지</Text>
                </View>
              </View>
            </View>

            <SectionTitle>분석 데이터</SectionTitle>
            <View style={styles.groupCard}>
              <Pressable style={styles.settingPlainRow} onPress={() => go('analysisHistory')}>
                <View style={styles.infoMain}>
                  <Text style={styles.infoTitle}>분석 기록 관리</Text>
                  <Text style={styles.infoDesc}>{lastScan ? '최근 분석 1건 · 마지막 ' + lastScan.dateLabel : '최근 분석 없음'}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
              <View style={styles.thinDivider} />
              <ToggleRow
                title="맞춤 추천 데이터 사용"
                desc="정리 패턴을 스캔 권장 알림에 활용"
                value={settingsToggles.marketing}
                onPress={() => setSettingsToggles((s) => ({ ...s, marketing: !s.marketing }))}
                plain
              />
            </View>

            <View style={styles.settingsBottomSpacer} />
            <OutlineButton title="AURA 서비스 탈퇴" onPress={openWithdrawSheet} />
            <Text style={styles.helperText}>탈퇴 시 분석 기록과 추천 데이터가 삭제됩니다</Text>
          </ScreenShell>
        );

      case 'analysisHistory':
        return (
          <ScreenShell title="탄소 절감 기록" subtitle="정리 활동으로 만든 예상 환경 효과">
            {lastScan ? (
              <>
                <View style={styles.carbonTotalCard}>
                  <View>
                    <Text style={styles.infoDesc}>전체 누적 예상 절감량</Text>
                    <Text style={styles.carbonTotalValue}>{includedCarbonDisplay}</Text>
                  </View>
                  <View style={styles.monthCarbonPill}>
                    <Text style={styles.monthCarbonText}>이번 달 +{includedCarbonLabel.replace(' CO₂', '')}</Text>
                  </View>
                </View>
                <SectionTitle>월별 누적 변화</SectionTitle>
                <CarbonStatsGraph carbonLabel={includedCarbonLabel} />
                <Text style={styles.statsGuideText}>각 월까지 누적된 예상 절감량을 표시합니다.</Text>
                <View style={styles.rowBetween}>
                  <SectionTitle>최근 정리 기록</SectionTitle>
                  <Pressable onPress={() => go('analysisHistoryAll')} hitSlop={8}>
                    <Text style={styles.rowRight}>전체 보기</Text>
                  </Pressable>
                </View>
                {selectedCandidateCount ? (
                  <Pressable style={styles.recentCleanupCard} onPress={() => setCarbonRecordIncluded((value) => !value)}>
                    <View style={styles.recentCleanupTopRow}>
                      <CheckBox checked={carbonRecordIncluded} onPress={() => setCarbonRecordIncluded((value) => !value)} compact />
                      <View style={styles.infoMain}>
                        <View style={styles.rowBetween}>
                          <Text style={styles.infoTitle}>{lastScan.dateLabel}</Text>
                          <Text style={styles.rowRight}>{checkedCarbonLabel}</Text>
                        </View>
                        <Text style={styles.infoDesc}>{lastScan.sourceLabel} · 체크된 항목 {selectedCandidateCount}개</Text>
                      </View>
                    </View>
                    <Text style={styles.infoDesc}>Gmail {selectedMailCleanupCount}개 · Drive {selectedDriveCleanupCount}개 · {checkedCleanupSizeLabel} 정리</Text>
                  </Pressable>
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
          <ScreenShell title="정리 기록 전체보기" subtitle="탄소 절감 기록에 포함할 항목 선택">
            {lastScan ? (
              <>
                <Text style={styles.infoDesc}>탄소 절감 기록에 포함할 정리 기록을 선택하세요.</Text>
                <Pressable style={styles.recentCleanupCard} onPress={() => setCarbonRecordIncluded((value) => !value)}>
                  <View style={styles.recentCleanupTopRow}>
                    <CheckBox checked={carbonRecordIncluded} onPress={() => setCarbonRecordIncluded((value) => !value)} compact />
                    <View style={styles.infoMain}>
                      <View style={styles.rowBetween}>
                        <Text style={styles.infoTitle}>{lastScan.dateLabel}</Text>
                        <Text style={styles.rowRight}>{checkedCarbonLabel}</Text>
                      </View>
                      <Text style={styles.infoDesc}>{lastScan.sourceLabel} · {selectedCandidateCount}개 · {checkedCleanupSizeLabel} 정리</Text>
                    </View>
                  </View>
                </Pressable>
              </>
            ) : (
              <EmptyState title="아직 정리 기록이 없어요" desc="정리를 완료하면 전체 기록을 볼 수 있어요." />
            )}
          </ScreenShell>
        );

      case 'serviceWithdraw':
        return (
          <ScreenShell title="AURA 서비스 탈퇴" subtitle="탈퇴 전 삭제되는 데이터를 확인합니다">
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
                    if (!checked.withdrawConfirm) {
                      showToast('탈퇴 확인 체크가 필요합니다');
                      return;
                    }
                    resetToFreshStart();
                  }}
                >
                  <Text style={styles.dangerText}>서비스 탈퇴</Text>
                </Pressable>
              </View>
            </View>
          </ScreenShell>
        );

      case 'notice':
        return (
          <ScreenShell title="공지사항" subtitle="AURA 최신 공지를 확인해보세요">
            <InfoRow title="AURA 1.0.0 안내" desc="학술제 발표용 프로토타입 화면이 업데이트됐어요." hideChevron />
            <InfoRow title="Google 권한 안내" desc="원문 내용은 AI에게 전달되지 않도록 설계했어요." hideChevron />
          </ScreenShell>
        );
    }
  };

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
        }}
      >
        <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
          <View style={styles.phone}>
          <Animated.View
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
                <Text style={styles.modalTitle}>메일 키워드 설정</Text>
                <Text style={styles.infoDesc}>설정할 키워드 조건을 선택하세요.</Text>
                <Pressable style={styles.keywordChoiceRow} onPress={() => closeKeywordChoiceSheet('include')}>
                  <View style={styles.infoMain}>
                    <Text style={styles.infoTitle}>포함 키워드 설정</Text>
                    <Text style={styles.infoDesc}>해당 단어가 들어간 메일을 정리 후보로 찾기</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
                <Pressable style={styles.keywordChoiceRow} onPress={() => closeKeywordChoiceSheet('exclude')}>
                  <View style={styles.infoMain}>
                    <Text style={styles.infoTitle}>제외 키워드 설정</Text>
                    <Text style={styles.infoDesc}>중요한 메일은 정리 후보에서 제외하기</Text>
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
                      if (!checked.withdrawConfirm) {
                        showToast('탈퇴 확인 체크가 필요합니다');
                        return;
                      }
                      closeWithdrawSheet();
                      resetToFreshStart();
                    }}
                  >
                    <Text style={styles.dangerText}>서비스 탈퇴하기</Text>
                  </Pressable>
                </View>
              </BottomSheetPanel>
            </Animated.View>
          ) : null}
          {permissionToast ? (
            <Animated.View
              style={[
                styles.toastOverlay,
                (keywordChoiceVisible || keywordSheetType || yearSheetType || filterSheetVisible || withdrawSheetVisible) && styles.toastOverlayAboveSheet,
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
                  if (toastTarget === 'candidateSummary') {
                    setHomeScanNotice('none');
                  }
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
}) {
  const navigation = useContext(NavigationContext);
  const handleBack = hideBack ? undefined : onBack ?? navigation?.back;

  return (
    <View style={styles.shell}>
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
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
          </View>
          {hideBack ? <View style={styles.headerInsetRule} /> : null}
        </View>
      ) : (
        <DeviceStatusBar />
      )}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentInner, compactTop && styles.contentInnerCompact, tightBottom && styles.contentInnerTightBottom]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
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
  type: 'home' | 'storage' | 'settings';
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

function NavIcon({ type, active }: { type: 'home' | 'storage' | 'settings'; active: boolean }) {
  if (type === 'home') {
    return (
      <View style={styles.navIconFrame}>
        <Image source={navHomeIcon} style={[styles.navHomeImage, !active && styles.navHomeImageInactive]} resizeMode="contain" />
      </View>
    );
  }

  if (type === 'storage') {
    return (
      <View style={styles.navIconFrame}>
        <View style={[styles.navLocker, active && styles.navLockerActive]}>
          <View style={[styles.navLockerDoor, active && styles.navLockerDoorActive]}>
            <View style={styles.navLockerVent} />
            <View style={styles.navLockerVent} />
            <View style={styles.navLockerHandle} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.navIconFrame}>
      <View style={styles.navGearWrap}>
        <View style={[styles.navGearTooth, styles.navGearTop, active && styles.navIconActiveFill]} />
        <View style={[styles.navGearTooth, styles.navGearTopRight, active && styles.navIconActiveFill]} />
        <View style={[styles.navGearTooth, styles.navGearRight, active && styles.navIconActiveFill]} />
        <View style={[styles.navGearTooth, styles.navGearBottomRight, active && styles.navIconActiveFill]} />
        <View style={[styles.navGearTooth, styles.navGearBottom, active && styles.navIconActiveFill]} />
        <View style={[styles.navGearTooth, styles.navGearBottomLeft, active && styles.navIconActiveFill]} />
        <View style={[styles.navGearTooth, styles.navGearLeft, active && styles.navIconActiveFill]} />
        <View style={[styles.navGearTooth, styles.navGearTopLeft, active && styles.navIconActiveFill]} />
        <View style={[styles.navGearRing, active && styles.navGearRingActive]}>
          <View style={[styles.navGearCore, active && styles.navGearCoreActive]} />
        </View>
      </View>
    </View>
  );
}

function Logo({ large, medium }: { large?: boolean; medium?: boolean }) {
  return (
    <Image source={auraLogo} style={[styles.logoImage, medium && styles.logoImageMedium, large && styles.logoImageLarge]} resizeMode="contain" />
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
}: {
  motion: Animated.Value;
  outputRange: [number, number];
  style: object;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const dragY = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 3,
      onPanResponderMove: (_, gesture) => {
        dragY.setValue(Math.max(0, gesture.dy));
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 58 || gesture.vy > 0.85) {
          onClose();
          return;
        }
        Animated.spring(dragY, {
          toValue: 0,
          speed: 18,
          bounciness: 5,
          useNativeDriver: false,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(dragY, {
          toValue: 0,
          speed: 18,
          bounciness: 5,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  const baseTranslateY = motion.interpolate({
    inputRange: [0, 1],
    outputRange,
  });
  const translateY = Animated.add(baseTranslateY, dragY);

  return (
    <Animated.View style={[style, { transform: [{ translateY }] }]}>
      <Pressable style={styles.modalHandleHitArea} onPress={onClose} {...panResponder.panHandlers}>
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
  desc: string;
  right?: string;
  onPress?: () => void;
  hideChevron?: boolean;
}) {
  const Content = (
    <View style={styles.infoRow}>
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoDesc}>{desc}</Text>
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
  desc: string;
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
        <Text style={styles.infoDesc}>{desc}</Text>
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
  desc: string;
  selected: boolean;
  canOpen?: boolean;
  onPress: () => void;
  onOpen?: () => void;
}) {
  return (
    <Pressable style={[styles.folderRow, selected && styles.folderRowSelected]} onPress={onPress}>
      <View style={styles.folderIcon}>
        <Text style={styles.folderIconText}>D</Text>
      </View>
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoDesc}>{desc}</Text>
      </View>
      {canOpen ? (
        <Pressable style={styles.folderNavigateButton} onPress={onOpen ?? onPress} hitSlop={8}>
          <Text style={styles.folderNavigateText}>›</Text>
        </Pressable>
      ) : null}
      <CheckBox checked={selected} onPress={onPress} compact />
    </Pressable>
  );
}

function DriveFolderFileRow({ file, selected, onPress }: { file: AuraDriveFile; selected: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.folderFileRow, selected && styles.folderRowSelected]} onPress={onPress}>
      <CheckBox checked={selected} onPress={onPress} compact />
      <View style={styles.fileTypeIcon}>
        <Text style={styles.fileTypeText}>{file.type}</Text>
      </View>
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{file.title}</Text>
        <Text style={styles.infoDesc}>{file.type} · {formatDataSize(file.sizeMB)} · 수정 {file.modifiedAt}</Text>
      </View>
    </Pressable>
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
      <BottomSheetPanel motion={motion} outputRange={[0, 360]} style={styles.keywordSheet} onClose={onClose}>
        <View style={styles.rowBetween}>
          <Text style={styles.modalTitle}>{isInclude ? '포함 키워드 설정' : '제외 키워드 설정'}</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.modalClose}>×</Text>
          </Pressable>
        </View>
        <Text style={styles.infoDesc}>
          {isInclude ? '해당 키워드가 있는 메일을 정리 후보에 포함합니다' : '해당 키워드가 있는 메일은 정리 후보에서 보호합니다'}
        </Text>
        <View style={styles.inputRow}>
          <TextInput value={input} onChangeText={setInput} placeholder="키워드 입력" placeholderTextColor="#6B8194" style={styles.input} />
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
        <View style={styles.rowBetween}>
          <Text style={styles.modalTitle}>{isOpened ? '마지막으로 연 날짜' : '마지막 수정일'}</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.modalClose}>×</Text>
          </Pressable>
        </View>
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
        <View style={styles.rowBetween}>
          <Text style={styles.modalTitle}>필터 및 정렬</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.modalClose}>×</Text>
          </Pressable>
        </View>
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

function PermissionRow({
  title,
  desc,
  checked,
  onPress,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.permissionRow} onPress={onPress}>
      <CheckBox checked={checked} onPress={onPress} />
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoDesc}>{desc}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function PermissionDetail({
  screen,
  back,
  setPermissions,
  setSettingsToggles,
}: {
  screen: 'gmailPermission' | 'drivePermission' | 'notificationPermission';
  back: () => void;
  setPermissions: React.Dispatch<React.SetStateAction<{ gmail: boolean; drive: boolean; alarm: boolean }>>;
  setSettingsToggles: React.Dispatch<
    React.SetStateAction<{ scanComplete: boolean; aiNudge: boolean; marketing: boolean; autoScan: boolean }>
  >;
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
      title: '알림 권한',
      subtitle: '필요한 순간에만 알림을 보냅니다',
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
      reasonNote: '알림 없이도 앱에서 분석 결과를 확인할 수 있어요.',
      guide: '설정에서 언제든 권한을 변경할 수 있어요',
      button: '알림 허용',
      key: 'alarm' as const,
    },
  }[screen];

  return (
    <ScreenShell title={info.title} subtitle={info.subtitle} noNav onBack={back}>
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
      <PrimaryButton
        title={info.button}
        onPress={() => {
          setPermissions((items) => ({ ...items, [info.key]: true }));
          if (info.key === 'alarm') {
            setSettingsToggles((items) => ({ ...items, scanComplete: true, aiNudge: true }));
          }
          back();
        }}
      />
      <OutlineButton
        title="지금은 허용하지 않기"
        onPress={() => {
          setPermissions((items) => ({ ...items, [info.key]: false }));
          if (info.key === 'alarm') {
            setSettingsToggles((items) => ({ ...items, scanComplete: false, aiNudge: false }));
          }
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
        <TextInput value={input} onChangeText={setInput} placeholder="키워드 입력" placeholderTextColor="#6B8194" style={styles.input} />
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

function ResultCategoryCard({ title, desc, onPress }: { title: string; desc: string; onPress: () => void }) {
  return (
    <Pressable style={styles.resultCategoryCard} onPress={onPress}>
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoDesc}>{desc}</Text>
      </View>
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
}: {
  title: string;
  subtitle: string;
  item?: ScanListItem;
  kind: 'mail' | 'drive';
}) {
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
      <View style={styles.detailInfoBox}>
        <Text style={styles.detailInfoTitle}>선정 이유</Text>
        <Text style={styles.detailInfoText}>{item.desc}</Text>
        <View style={styles.thinDivider} />
        <Text style={styles.detailInfoTitle}>분석 메타데이터</Text>
        <Text style={styles.detailInfoText}>용량 {formatDataSize(item.sizeMB)} · 기준 날짜 {item.dateLabel}</Text>
      </View>
    </ScreenShell>
  );
}

function DeleteStatusRow({ title, desc, status }: { title: string; desc: string; status: string }) {
  return (
    <View style={styles.deleteStatusRow}>
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoDesc}>{desc}</Text>
      </View>
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

function RecentResultRow({ title, desc, value }: { title: string; desc: string; value: string }) {
  return (
    <View style={styles.recentResultRow}>
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoDesc}>{desc}</Text>
      </View>
      <Text style={styles.recentResultValue}>{value}</Text>
    </View>
  );
}

function CarbonStatsGraph({ carbonLabel }: { carbonLabel: string }) {
  const current = carbonLabelToGram(carbonLabel);
  const max = Math.max(3, current);
  const currentMonth = `${nowForScanRange.getMonth() + 1}월`;
  const rawPoints = current > 0 ? [{ month: currentMonth, value: current }] : [];
  const chartWidth = 226;
  const chartHeight = 116;
  const points = rawPoints.map((point, index) => ({
    ...point,
    label: `${point.value.toFixed(1)}g`,
    x: rawPoints.length === 1 ? chartWidth / 2 : index * (chartWidth / (rawPoints.length - 1)),
    y: chartHeight - (point.value / max) * 96 - 10,
  }));
  const baseSegments =
    points.length === 1
      ? [{ month: '기준', value: 0, label: '0.0g', x: 14, y: chartHeight - 10 }, points[0]]
      : points;
  const segments = baseSegments.slice(0, -1).map((point, index) => {
    const next = baseSegments[index + 1];
    const dx = next.x - point.x;
    const dy = next.y - point.y;
    return {
      key: `${point.month}-${next.month}`,
      left: point.x,
      top: point.y,
      width: Math.sqrt(dx * dx + dy * dy),
      angle: `${Math.atan2(dy, dx)}rad`,
    };
  });

  return (
    <View style={styles.statsGraphCard}>
      <View style={styles.rowBetween}>
        <Text style={styles.infoTitle}>월별 누적 변화</Text>
        <Text style={styles.infoDesc}>CO₂e</Text>
      </View>
      <View style={styles.graphArea}>
        <View style={styles.graphYAxis}>
          {['3g', '2g', '1g', '0'].map((tick) => (
            <Text key={tick} style={styles.graphAxisText}>{tick}</Text>
          ))}
        </View>
        <View style={styles.graphPlot}>
          <View style={styles.graphGridLineTop} />
          <View style={styles.graphGridLineMiddle} />
          <View style={styles.graphGridLineBottom} />
          {points.length ? (
            <>
              <View style={styles.lineGraphLayer}>
                {segments.map((segment) => (
                  <View
                    key={segment.key}
                    style={[
                      styles.lineGraphSegment,
                      {
                        left: segment.left,
                        top: segment.top,
                        width: segment.width,
                        transform: [{ rotate: segment.angle }],
                      },
                    ]}
                  />
                ))}
                {points.map((point) => (
                  <View key={point.month} style={[styles.lineGraphPointWrap, { left: point.x - 18, top: point.y - 28 }]}>
                    <Text style={styles.graphValue}>{point.label}</Text>
                    <View style={styles.lineGraphPoint} />
                  </View>
                ))}
              </View>
          <View style={styles.graphMonthLayer}>
            {points.map((point) => (
              <Text key={point.month} style={[styles.graphMonth, { left: point.x - 16 }]}>{point.month}</Text>
            ))}
          </View>
            </>
          ) : (
            <View style={styles.graphEmptyState}>
              <Text style={styles.infoDesc}>포함된 정리 기록이 없어요</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function StorageScreen({
  mode,
  scan,
  permissions,
  checked,
  toggle,
  setAll,
  openFilter,
  showToast,
  onReconnect,
  goMail,
  goDrive,
  goTrash,
  storageDriveFolder,
  setStorageDriveFolder,
  storageTrashMovedKeys,
  storageDeletedKeys,
  storageDriveMoveTargets,
  setStorageTrashMovedKeys,
  setStorageDeletedKeys,
  setStorageDriveMoveTargets,
}: {
  mode: 'storageMail' | 'storageDrive' | 'storageTrash' | 'storageDriveTrash';
  scan: ScanRecord | null;
  permissions: { gmail: boolean; drive: boolean; alarm: boolean };
  checked: Record<string, boolean>;
  toggle: (key: string) => void;
  setAll: (prefix: string, keys: string[]) => void;
  openFilter: () => void;
  showToast: (message: string, target?: Screen, duration?: number) => void;
  onReconnect: () => void;
  goMail: () => void;
  goDrive: () => void;
  goTrash: () => void;
  storageDriveFolder: string;
  setStorageDriveFolder: (folder: string) => void;
  storageTrashMovedKeys: string[];
  storageDeletedKeys: string[];
  storageDriveMoveTargets: StorageDriveMoveTargets;
  setStorageTrashMovedKeys: React.Dispatch<React.SetStateAction<string[]>>;
  setStorageDeletedKeys: React.Dispatch<React.SetStateAction<string[]>>;
  setStorageDriveMoveTargets: React.Dispatch<React.SetStateAction<StorageDriveMoveTargets>>;
}) {
  const isDrive = mode === 'storageDrive' || mode === 'storageDriveTrash';
  const isTrash = mode === 'storageTrash' || mode === 'storageDriveTrash';
  const [moveSheetVisible, setMoveSheetVisible] = useState(false);
  const [deleteSheetMode, setDeleteSheetMode] = useState<'trash' | 'permanent' | null>(null);
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);
  const prefix = mode === 'storageDriveTrash' ? 'storageDriveTrash' : isTrash ? 'storageTrash' : isDrive ? 'storageDrive' : 'storageMail';
  const summary = scan?.result ?? emptyScanSummary;
  const mailItems = summary.storageMailItems;
  const allStorageDriveItems = getAllStorageDriveItems();
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
  const currentStorageDriveItems = allStorageDriveItems
    .map(applyDriveMove)
    .filter((item) => {
      if (item.type === 'F') return getDriveParentPath(item.fullPath ?? '') === storageDriveFolder;
      return item.fullPath === storageDriveFolder;
    });
  const driveItems = isDrive && !isTrash ? currentStorageDriveItems : summary.storageDriveItems;
  const storageDriveBreadcrumbs = splitDrivePath(storageDriveFolder).map((part, index, parts) => ({
    label: part,
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
          title: item.title,
          subtitle: '이동됨 · 원래 유형 Gmail',
          meta: item.meta,
          badge: '복구 가능',
        };
      }
      if (sourcePrefix === 'storageDrive') {
        const item = allStorageDriveItems.map(applyDriveMove).find((drive) => drive.id === id);
        if (!item) return null;
        return {
          id: `trash-drive-moved-${item.id}`,
          title: item.title,
          subtitle: '이동됨 · 원래 유형 Drive',
          meta: item.subtitle,
          badge: '복구 가능',
        };
      }
      return null;
    })
    .filter((item): item is StorageMailItem => Boolean(item));
  const combinedTrashItems = [...summary.storageTrashItems, ...movedTrashItems];
  const rawTrashItems = isTrash
    ? combinedTrashItems.filter((item) => mode === 'storageDriveTrash' ? item.id.startsWith('trash-drive-') : !item.id.startsWith('trash-drive-'))
    : combinedTrashItems;
  const itemStorageKey = (id: string) => `${prefix}:${id}`;
  const isHiddenFromCurrentList = (id: string) => {
    const key = itemStorageKey(id);
    return storageDeletedKeys.includes(key) || (!isTrash && storageTrashMovedKeys.includes(key));
  };
  const trashItems = rawTrashItems.filter((item) => !isHiddenFromCurrentList(item.id));
  const visibleMailItems = mailItems.filter((item) => !isHiddenFromCurrentList(item.id));
  const visibleDriveItems = driveItems.filter((item) => !isHiddenFromCurrentList(item.id));
  const serviceConnected = mode === 'storageDriveTrash' ? permissions.drive : isTrash ? permissions.gmail : isDrive ? permissions.drive : permissions.gmail;
  const activeItems = isTrash ? trashItems : isDrive ? visibleDriveItems : visibleMailItems;
  const ids = activeItems.map((item) => item.id);
  const allChecked = ids.every((id) => checked[`${prefix}:${id}`] ?? true);
  const selectedItems = activeItems.filter((item) => checked[`${prefix}:${item.id}`] ?? true);
  const selectedStorageSize = selectedItems.reduce((sum, item) => {
    const sizeText = 'meta' in item ? `${item.subtitle} ${item.meta}` : item.subtitle;
    return sum + extractStorageSizeMB(sizeText);
  }, 0);
  const selectedStorageSizeLabel = formatDataSize(selectedStorageSize);
  const selectedDriveMoveItems = isDrive && !isTrash ? selectedItems.filter((item): item is StorageDriveItem => 'type' in item) : [];
  const openMoveSheet = () => {
    if (!selectedDriveMoveItems.length) {
      showToast('이동할 Drive 항목을 체크해주세요');
      return;
    }
    setMoveSheetVisible(true);
  };
  const closeMoveSheet = () => setMoveSheetVisible(false);
  const moveSelectedDriveItems = (targetFolder: string) => {
    setStorageDriveMoveTargets((items) => {
      const next = { ...items };
      selectedDriveMoveItems.forEach((item) => {
        next[item.id] = targetFolder;
      });
      return next;
    });
    setMoveSheetVisible(false);
    showToast(`선택 항목을 ${getDriveFolderName(targetFolder)} 폴더로 이동했어요`);
  };
  const openDeleteSheet = (modeToOpen: 'trash' | 'permanent') => {
    if (!selectedItems.length) {
      showToast('삭제할 항목을 선택해주세요');
      return;
    }
    setDeleteConfirmChecked(false);
    setDeleteSheetMode(modeToOpen);
  };
  const closeDeleteSheet = () => {
    setDeleteSheetMode(null);
    setDeleteConfirmChecked(false);
  };
  const confirmStorageDelete = () => {
    if (!deleteConfirmChecked) {
      showToast('삭제 확인 체크가 필요합니다');
      return;
    }
    const permanent = deleteSheetMode === 'permanent';
    const selectedKeys = selectedItems.map((item) => itemStorageKey(item.id));
    closeDeleteSheet();
    if (permanent) {
      setStorageDeletedKeys((items) => Array.from(new Set([...items, ...selectedKeys])));
      showToast('영구 삭제가 완료됐어요');
      return;
    }

    setStorageTrashMovedKeys((items) => Array.from(new Set([...items, ...selectedKeys])));
    showToast('선택 항목을 휴지통으로 이동했어요');
    goTrash();
  };

  return (
    <View style={styles.modalScreenRoot}>
    <ScreenShell title="정리함" subtitle="저장 데이터를 확인하고 관리합니다" hideBack>
      <View style={styles.segment}>
        <Pressable style={[styles.segmentItem, !isDrive && styles.segmentActive]} onPress={goMail}>
          <Text style={[styles.segmentText, !isDrive && styles.segmentTextActive]}>메일</Text>
        </Pressable>
        <Pressable style={[styles.segmentItem, isDrive && styles.segmentActive]} onPress={goDrive}>
          <Text style={[styles.segmentText, isDrive && styles.segmentTextActive]}>Drive</Text>
        </Pressable>
      </View>
      <View style={styles.segment}>
        <Pressable style={[styles.segmentItem, !isTrash && styles.segmentSubActive]} onPress={isDrive ? goDrive : goMail}>
          <Text style={styles.segmentText}>저장된 데이터</Text>
        </Pressable>
        <Pressable style={[styles.segmentItem, isTrash && styles.segmentSubActive]} onPress={goTrash}>
          <Text style={styles.segmentText}>휴지통</Text>
        </Pressable>
      </View>
      {!serviceConnected ? (
        <PermissionRevokedCard onPress={onReconnect} />
      ) : scan ? (
        <>
          <View style={styles.storageSummaryBar}>
            <Text style={styles.storageSummaryText}>
              {isTrash ? `휴지통 ${trashItems.length}개` : isDrive ? `Drive ${visibleDriveItems.length}개` : `메일 ${visibleMailItems.length}개`}
            </Text>
            <Pressable onPress={openFilter} hitSlop={8}>
              <Text style={styles.storageFilterText}>필터/정렬</Text>
            </Pressable>
          </View>
          {isDrive && !isTrash ? (
            <View style={styles.storagePathCard}>
              <View style={styles.storageBreadcrumbRow}>
                {storageDriveBreadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.path}>
                    <Pressable onPress={() => setStorageDriveFolder(crumb.path)} hitSlop={8}>
                      <Text style={[styles.storageBreadcrumbText, index === storageDriveBreadcrumbs.length - 1 && styles.storageBreadcrumbCurrent]}>
                        {crumb.label}
                      </Text>
                    </Pressable>
                    {index < storageDriveBreadcrumbs.length - 1 ? <Text style={styles.storageBreadcrumbDivider}>›</Text> : null}
                  </React.Fragment>
                ))}
              </View>
            </View>
          ) : null}
          {!activeItems.length ? (
            <EmptyState
              title={isTrash ? '휴지통이 비어있어요' : isDrive ? '현재 폴더가 비어있어요' : '메일이 없어요'}
              desc={isDrive && !isTrash ? '이 위치 아래에 표시할 폴더나 파일이 없어요.' : '현재 표시할 항목이 없어요.'}
            />
          ) : !isDrive && !isTrash ? (
            <GmailStoragePanel
              items={visibleMailItems}
              checked={checked}
              prefix={prefix}
              toggle={toggle}
            />
          ) : isTrash
            ? trashItems.map((item) => (
                <StorageMailCard
                  key={item.id}
                  prefix={prefix}
                  item={item}
                  checked={checked[`${prefix}:${item.id}`] ?? true}
                  toggle={toggle}
                />
              ))
            : isDrive
              ? visibleDriveItems.map((item) => (
                  <StorageDriveCard
                    key={item.id}
                    prefix={prefix}
                    item={item}
                    checked={checked[`${prefix}:${item.id}`] ?? true}
                    toggle={toggle}
                    onOpenFolder={item.type === 'F' && item.fullPath ? () => setStorageDriveFolder(item.fullPath as string) : undefined}
                  />
              ))
              : visibleMailItems.map((item) => (
                  <StorageMailCard
                    key={item.id}
                    prefix={prefix}
                    item={item}
                    checked={checked[`${prefix}:${item.id}`] ?? true}
                    toggle={toggle}
                  />
                ))}
          {isDrive && !isTrash && moveSheetVisible ? (
            <View style={styles.driveMovePanel}>
              <Text style={styles.infoTitle}>폴더 이동</Text>
              <Text style={styles.infoDesc}>체크한 {selectedDriveMoveItems.length}개 항목을 이동할 폴더를 선택하세요.</Text>
              <View style={styles.driveMoveTargets}>
                {driveFolderOptions.map((folder) => (
                  <Pressable key={folder.name} style={styles.driveMoveTarget} onPress={() => moveSelectedDriveItems(folder.name)}>
                    <Text style={styles.driveMoveTargetText}>{folder.name}</Text>
                  </Pressable>
                ))}
              </View>
              <OutlineButton title="이동 취소" onPress={closeMoveSheet} />
            </View>
          ) : null}
          {activeItems.length ? (
            <>
              <Pressable style={styles.storageSelectAllRow} onPress={() => setAll(prefix, ids)}>
                <CheckBox checked={allChecked} onPress={() => setAll(prefix, ids)} compact />
                <Text style={styles.selectAllText}>{allChecked ? '전체 선택 해제' : '전체 선택하기'}</Text>
              </Pressable>
              <View style={styles.twoButtons}>
                <OutlineButton title={isTrash ? '복구하기' : '삭제하기'} onPress={() => (isTrash ? showToast('복구 기능은 발표용 화면에서는 실행하지 않아요') : openDeleteSheet('trash'))} half />
                <PrimaryButton title={isDrive && !isTrash ? '폴더 이동' : isTrash ? '삭제하기' : '메일 읽기'} onPress={() => (isTrash ? openDeleteSheet('permanent') : isDrive ? openMoveSheet() : showToast('메일 읽기는 발표용 화면에서는 실행하지 않아요'))} half />
              </View>
            </>
          ) : null}
        </>
      ) : (
        <EmptyState
          title="저장된 정리 데이터가 없어요"
          desc="아직 스캔한 기록이 없어 정리함에 표시할 메일이나 파일이 없어요."
        />
      )}
    </ScreenShell>
    {deleteSheetMode ? (
      <StorageDeleteSheet
        permanent={deleteSheetMode === 'permanent'}
        count={selectedItems.length}
        sizeLabel={selectedStorageSizeLabel}
        checked={deleteConfirmChecked}
        onToggle={() => setDeleteConfirmChecked((value) => !value)}
        onCancel={closeDeleteSheet}
        onConfirm={confirmStorageDelete}
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
      <Text style={styles.permissionRevokedTitle}>Google 권한이 해제됐어요</Text>
      <Text style={styles.permissionRevokedDesc}>메일과 Drive 목록 조회를 중단했습니다</Text>
      <Text style={styles.permissionRevokedDesc}>다시 연결하면 저장소 화면을 계속 사용할 수 있어요</Text>
      <PrimaryButton title="권한 연결 화면으로 이동" onPress={onPress} inline />
    </View>
  );
}

function StorageDeleteSheet({
  permanent,
  count,
  sizeLabel,
  checked,
  onToggle,
  onCancel,
  onConfirm,
}: {
  permanent: boolean;
  count: number;
  sizeLabel: string;
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
        <View style={styles.rowBetween}>
          <Text style={styles.storageDeleteTitle}>{permanent ? '영구 삭제할까요?' : '휴지통으로 이동할까요?'}</Text>
          <Pressable onPress={onCancel} hitSlop={10}>
            <Text style={styles.modalClose}>×</Text>
          </Pressable>
        </View>
        <View style={permanent ? styles.storageDeleteWarningBox : styles.storageDeleteInfoBox}>
          <Text style={styles.storageDeleteWarningTitle}>{permanent ? '이 작업은 되돌릴 수 없습니다' : '휴지통으로 이동됩니다'}</Text>
          <Text style={styles.storageDeleteWarningText}>
            선택한 {count}개 · 총 {sizeLabel}가 {permanent ? '완전히 삭제됩니다' : '휴지통으로 이동됩니다'}
          </Text>
        </View>
        <View style={styles.storageDeleteSummaryBox}>
          <Text style={styles.infoTitle}>삭제 대상 요약</Text>
          <Text style={styles.infoDesc}>이동 일자 · 원래 유형 · 크기 · 복구 가능 여부 확인</Text>
          <Text style={styles.infoDesc}>{permanent ? '성공/실패 결과는 삭제 이력에 분리 저장됩니다' : '휴지통에서는 복구하거나 영구 삭제할 수 있어요'}</Text>
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

function GmailStoragePanel({
  items,
  checked,
  prefix,
  toggle,
}: {
  items: StorageMailItem[];
  checked: Record<string, boolean>;
  prefix: string;
  toggle: (key: string) => void;
}) {
  return (
    <View style={styles.gmailPanel}>
      <View style={styles.gmailTopBar}>
        <Text style={styles.gmailLogoMark}>M</Text>
        <View style={styles.gmailSearchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <Text style={styles.gmailSearchText}>메일 검색</Text>
        </View>
      </View>
      <View style={styles.gmailMailboxRow}>
        <View style={styles.gmailComposeButton}>
          <Text style={styles.gmailComposeText}>✎ 편지쓰기</Text>
        </View>
        <View style={styles.gmailInboxPill}>
          <Text style={styles.gmailInboxText}>받은편지함</Text>
          <Text style={styles.gmailInboxCount}>{items.length}</Text>
        </View>
      </View>
      <View style={styles.gmailActionBar}>
        <CheckBox checked={items.every((item) => checked[`${prefix}:${item.id}`] ?? true)} onPress={() => {}} compact />
        <Text style={styles.gmailActionText}>새로고침</Text>
        <Text style={styles.gmailActionText}>더보기</Text>
      </View>
      <View style={styles.gmailList}>
        {items.map((item) => (
          <Pressable key={item.id} style={styles.gmailRow} onPress={() => toggle(`${prefix}:${item.id}`)}>
            <CheckBox checked={checked[`${prefix}:${item.id}`] ?? true} onPress={() => toggle(`${prefix}:${item.id}`)} compact />
            <Text style={styles.gmailStar}>☆</Text>
            <View style={styles.gmailSenderWrap}>
              <Text style={styles.gmailSender} numberOfLines={1}>{item.title}</Text>
            </View>
            <View style={styles.gmailSubjectWrap}>
              <Text style={styles.gmailSubject} numberOfLines={1}>{item.subtitle}</Text>
              <Text style={styles.gmailMeta} numberOfLines={1}>{item.meta}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function StorageMailCard({
  prefix,
  item,
  checked,
  toggle,
}: {
  prefix: string;
  item: { id: string; title: string; subtitle: string; meta: string; badge?: string };
  checked: boolean;
  toggle: (key: string) => void;
}) {
  return (
    <Pressable style={styles.storageItemCard} onPress={() => toggle(`${prefix}:${item.id}`)}>
      <CheckBox checked={checked} onPress={() => toggle(`${prefix}:${item.id}`)} compact />
      <View style={styles.infoMain}>
        <View style={styles.storageTitleRow}>
          <Text style={styles.infoTitle}>{item.title}</Text>
        </View>
        <Text style={styles.storageSubtitle}>{item.subtitle}</Text>
        <Text style={styles.infoDesc}>{item.meta}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function StorageDriveCard({
  prefix,
  item,
  checked,
  toggle,
  onOpenFolder,
}: {
  prefix: string;
  item: StorageDriveItem;
  checked: boolean;
  toggle: (key: string) => void;
  onOpenFolder?: () => void;
}) {
  const isFolder = item.type === 'F';
  const icon = isFolder ? '▰' : item.type === 'PDF' ? 'PDF' : item.type === 'ZIP' ? 'ZIP' : item.type === 'JPG' ? 'IMG' : 'DOC';
  return (
    <View style={styles.storageItemCard}>
      <CheckBox checked={checked} onPress={() => toggle(`${prefix}:${item.id}`)} compact />
      <Pressable
        style={styles.storageDriveItemPressArea}
        onPress={() => toggle(`${prefix}:${item.id}`)}
      >
        <View style={[styles.fileTypeIcon, isFolder && styles.folderTypeIcon]}>
          <Text style={[styles.fileTypeText, isFolder && styles.folderTypeText]}>{icon}</Text>
        </View>
        <View style={styles.infoMain}>
          <Text style={styles.infoTitle}>{item.title}</Text>
          <Text style={styles.infoDesc}>{item.subtitle}</Text>
        </View>
      </Pressable>
      {isFolder && onOpenFolder ? (
        <Pressable style={styles.storageFolderOpenButton} onPress={onOpenFolder} hitSlop={10}>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ) : (
        <Text style={styles.chevron}>›</Text>
      )}
    </View>
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
  onOpenItem?: (item: ScanListItem) => void;
}) {
  const allChecked = items.every((item) => checked[`${prefix}:${item.id}`] ?? true);
  const selectedItems = items.filter((item) => checked[`${prefix}:${item.id}`] ?? true);
  const selectedCount = selectedItems.length;
  const selectedSizeLabel = formatDataSize(sumScanItemSize(selectedItems));

  return (
    <ScreenShell title={title} subtitle="삭제하지 않을 항목만 체크 해제">
      <Pressable style={styles.selectAllRow} onPress={() => setAll(prefix, items.map((item) => item.id))}>
        <CheckBox checked={allChecked} onPress={() => setAll(prefix, items.map((item) => item.id))} />
        <Text style={styles.selectAllText}>전체 선택됨</Text>
        <Pressable onPress={openFilter} hitSlop={8}>
          <Text style={styles.filterText}>필터</Text>
        </Pressable>
      </Pressable>
      {items.map((item) => (
        <Pressable key={item.id} style={styles.listCard} onPress={() => (onOpenItem ? onOpenItem(item) : toggle(`${prefix}:${item.id}`))}>
          <CheckBox checked={checked[`${prefix}:${item.id}`] ?? true} onPress={() => toggle(`${prefix}:${item.id}`)} />
          <View style={styles.infoMain}>
            <Text style={styles.infoTitle}>{item.title}</Text>
            <Text style={styles.infoDesc}>{item.desc}</Text>
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

function ServiceLinkRow({ letter, title, connected, onPress }: { letter: string; title: string; connected: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.serviceLinkRow} onPress={onPress}>
      <View style={styles.serviceIconBox}>
        <Text style={styles.serviceIconText}>{letter}</Text>
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
  desc: string;
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
    outputRange: ['#C8D5DD', navy],
  });

  return (
    <Pressable style={[styles.toggleRow, plain && styles.toggleRowPlain, tint && styles.toggleRowTint]} onPress={onPress}>
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoDesc}>{desc}</Text>
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

function OutlineButton({ title, onPress, half }: { title: string; onPress: () => void; half?: boolean }) {
  return (
    <Pressable style={[styles.outlineButton, half && styles.halfButton]} onPress={onPress}>
      <Text style={styles.outlineText}>{title}</Text>
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
  const scan = useRef(new Animated.Value(skip ? 1 : 0)).current;
  const [foundStep, setFoundStep] = useState(skip ? 2 : 0);
  const doneCalled = useRef(false);

  useEffect(() => {
    if (skip) {
      scan.setValue(1);
      setFoundStep(2);
      return;
    }

    const firstTimer = setTimeout(() => setFoundStep(1), 620);
    const secondTimer = setTimeout(() => setFoundStep(2), 1120);
    const doneTimer = setTimeout(() => {
      if (!doneCalled.current) {
        doneCalled.current = true;
        onDone();
      }
    }, 1850);

    Animated.timing(scan, {
      toValue: 1,
      duration: 1650,
      useNativeDriver: false,
    }).start();

    return () => {
      clearTimeout(firstTimer);
      clearTimeout(secondTimer);
      clearTimeout(doneTimer);
    };
  }, [skip]);

  return (
    <View style={styles.ghostPreviewCard}>
      <View style={styles.ghostPreviewHeader}>
        <Text style={styles.ghostPreviewTitle}>AURA Scan</Text>
        <Text style={styles.ghostPreviewPercent}>{foundStep >= 2 ? '후보 24개' : '분석 중'}</Text>
      </View>
      <View style={styles.ghostDataPanel}>
        <Animated.View
          style={[
            styles.ghostScanBeam,
            {
              transform: [
                {
                  translateY: scan.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 122],
                  }),
                },
              ],
            },
          ]}
        />
        <GhostDataRow label="프로모션 메일" meta="4년 전 · 18MB" active={foundStep >= 1} />
        <GhostDataRow label="중복 이미지" meta="Drive · 320MB" active={foundStep >= 2} />
        <GhostDataRow label="오래된 첨부파일" meta="3년 전 · 84MB" active={foundStep >= 1} />
      </View>
      <View style={styles.ghostCandidateRow}>
        <Text style={styles.ghostCandidateIcon}>👻</Text>
        <View style={styles.infoMain}>
          <Text style={styles.ghostCandidateTitle}>정리 후보 발견</Text>
          <Text style={styles.ghostCandidateDesc}>메일·파일 메타데이터를 기준으로 선별</Text>
        </View>
      </View>
    </View>
  );
}

function GhostDataRow({ label, meta, active }: { label: string; meta: string; active: boolean }) {
  return (
    <View style={[styles.ghostDataRow, active && styles.ghostDataRowActive]}>
      <View style={[styles.ghostDot, active && styles.ghostDotActive]} />
      <View style={styles.infoMain}>
        <Text style={styles.ghostDataLabel}>{label}</Text>
        <Text style={styles.ghostDataMeta}>{meta}</Text>
      </View>
      <Text style={[styles.ghostDataStatus, active && styles.ghostDataStatusActive]}>{active ? '후보' : '대기'}</Text>
    </View>
  );
}

function CarbonSaveAnimation({ onDone, skip }: { onDone: () => void; skip?: boolean }) {
  const fill = useRef(new Animated.Value(skip ? 1 : 0)).current;
  const leaf = useRef(new Animated.Value(0)).current;
  const [step, setStep] = useState(skip ? 2 : 0);
  const doneCalled = useRef(false);

  useEffect(() => {
    if (skip) {
      fill.setValue(1);
      leaf.setValue(0);
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

    Animated.timing(fill, {
      toValue: 1,
      duration: 1600,
      useNativeDriver: false,
    }).start();

    const leafLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(leaf, {
          toValue: 1,
          duration: 760,
          useNativeDriver: false,
        }),
        Animated.timing(leaf, {
          toValue: 0,
          duration: 760,
          useNativeDriver: false,
        }),
      ])
    );
    leafLoop.start();

    return () => {
      clearTimeout(firstTimer);
      clearTimeout(secondTimer);
      clearTimeout(doneTimer);
      leafLoop.stop();
    };
  }, [skip]);

  return (
    <View style={styles.carbonPreviewCard}>
      <View style={styles.carbonTopRow}>
        <Text style={styles.carbonTopLabel}>삭제 용량</Text>
        <Text style={styles.carbonTopValue}>{step >= 1 ? '2.1GB' : '계산 중'}</Text>
      </View>
      <View style={styles.carbonMeterTrack}>
        <Animated.View
          style={[
            styles.carbonMeterFill,
            {
              width: fill.interpolate({
                inputRange: [0, 1],
                outputRange: ['8%', '78%'],
              }),
            },
          ]}
        />
      </View>
      <View style={styles.carbonResultCard}>
        <Animated.Text
          style={[
            styles.carbonLeaf,
            {
              transform: [
                {
                  translateY: leaf.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -5],
                  }),
                },
              ],
            },
          ]}
        >
          🌱
        </Animated.Text>
        <Text style={styles.carbonResultNumber}>{step >= 2 ? '약 0.4g CO₂' : 'CO₂ 환산 중'}</Text>
        <Text style={styles.carbonResultDesc}>정리 용량을 탄소 절감 지표로 변환</Text>
      </View>
    </View>
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
  title,
  desc,
  status,
  visible,
}: {
  title: string;
  desc: string;
  status: '연결됨' | '연결안됨';
  visible: boolean;
}) {
  const connectedInstant = useContext(NavigationContext)?.connectedInstant ?? false;

  return (
    <View style={styles.infoRow}>
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoDesc}>{desc}</Text>
      </View>
      <View style={styles.connectedRightSlot}>
        {visible ? (
          <RevealIn duration={connectedInstant ? 0 : 460} distance={connectedInstant ? 0 : 7}>
            <Text style={[styles.rowRight, status === '연결안됨' && styles.rowRightMuted]}>{status}</Text>
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
        duration: 760,
        useNativeDriver: false,
      })
    );
    spin.start();

    const startedAt = Date.now();
    const timer = setInterval(() => {
      const next = Math.min(100, Math.round(((Date.now() - startedAt) / 1350) * 100));
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
    }, 35);

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
  return (
    <View style={[styles.progressCircle, compact && styles.progressCircleCompact]}>
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
    shadowColor: '#09233F',
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
    color: '#49677C',
    fontSize: 12.5,
    fontWeight: '900',
    lineHeight: 17,
  },
  toastOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 64,
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: 'rgba(11, 53, 102, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    zIndex: 999,
    elevation: 999,
    shadowColor: '#0B2A4A',
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
  modalScreenRoot: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 76,
    paddingTop: 2,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: line,
    justifyContent: 'flex-start',
  },
  headerNoBack: {
    height: 82,
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
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 18,
  },
  headerTitleRowNoBack: {
    marginLeft: 8,
    marginTop: 8,
  },
  headerInsetRule: {
    height: 1,
    backgroundColor: line,
    marginTop: 15,
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
  },
  title: {
    color: text,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 5,
    color: '#49677C',
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
    paddingBottom: 18,
  },
  heroSpacer: {
    height: 78,
  },
  logoImage: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  logoImageMedium: {
    width: 104,
    height: 104,
    borderRadius: 22,
    alignSelf: 'center',
    marginTop: 18,
    marginBottom: 16,
  },
  logoImageLarge: {
    width: 128,
    height: 128,
    borderRadius: 24,
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
    marginVertical: 42,
    color: text,
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '900',
  },
  primaryButton: {
    height: 50,
    borderRadius: 8,
    backgroundColor: navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryButtonLower: {
    marginTop: 'auto',
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  outlineButton: {
    height: 48,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    backgroundColor: '#FFFFFF',
  },
  outlineText: {
    color: navy,
    fontSize: 15,
    fontWeight: '900',
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
    color: '#49677C',
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '800',
  },
  initialConsentLink: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 35,
    marginBottom: 24,
    width: 260,
    minHeight: 38,
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
    backgroundColor: '#6E8495',
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
    color: '#46677A',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1.5,
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
    borderWidth: 1,
    borderColor: line,
    borderRadius: 14,
    padding: 16,
    backgroundColor: '#FFFFFF',
    gap: 8,
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
    borderRadius: 14,
    paddingHorizontal: 15,
  },
  homeActionSpacer: {
    height: 0,
  },
  homeSummaryCard: {
    minHeight: 178,
    justifyContent: 'space-between',
    paddingVertical: 15,
  },
  homeEmptySummary: {
    minHeight: 78,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: '#C9DBE5',
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
    gap: 6,
  },
  homeEmptyTitle: {
    color: text,
    fontSize: 14,
    fontWeight: '900',
  },
  homeEmptyDesc: {
    color: '#49677C',
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
    color: '#49677C',
    fontSize: 13.5,
    lineHeight: 24,
    fontWeight: '800',
  },
  infoRow: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  permissionRow: {
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
  permissionFeatureCard: {
    minHeight: 70,
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
    color: '#49677C',
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
  permissionReasonSection: {
    gap: 9,
  },
  permissionReasonDescription: {
    color: '#244B64',
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
    color: '#49677C',
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
    color: '#49677C',
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
    color: '#6C8392',
  },
  flexGrow: {
    flex: 1,
    minHeight: 120,
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
    width: 64,
    minHeight: 18,
    alignItems: 'flex-end',
    justifyContent: 'center',
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
    color: '#6A91A8',
    fontSize: 15,
    fontWeight: '900',
  },
  emptyStateCard: {
    minHeight: 220,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: line,
    backgroundColor: pale,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 10,
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
    color: '#6C8392',
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
    color: '#49677C',
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
  auraFeelReveal: {
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  auraFeelPlaceholder: {
    minHeight: 58,
    marginTop: 4,
    marginBottom: 8,
  },
  auraFeelText: {
    color: navy,
    textAlign: 'center',
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  ghostPreviewCard: {
    height: 228,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: line,
    backgroundColor: '#F4FBF8',
    padding: 15,
    gap: 10,
    overflow: 'hidden',
  },
  ghostPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ghostPreviewTitle: {
    color: text,
    fontSize: 15,
    fontWeight: '900',
  },
  ghostPreviewPercent: {
    color: navy,
    fontSize: 12,
    fontWeight: '900',
  },
  ghostDataPanel: {
    height: 136,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C9DBE5',
    backgroundColor: '#FFFFFF',
    padding: 10,
    gap: 8,
    overflow: 'hidden',
  },
  ghostScanBeam: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 8,
    height: 28,
    backgroundColor: 'rgba(38, 177, 145, 0.16)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(38, 177, 145, 0.34)',
  },
  ghostDataRow: {
    minHeight: 34,
    borderRadius: 9,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F7FAFC',
  },
  ghostDataRowActive: {
    backgroundColor: '#EAF7F2',
    borderWidth: 1,
    borderColor: '#B6DCCE',
  },
  ghostDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#B4C7D4',
  },
  ghostDotActive: {
    backgroundColor: '#26B191',
  },
  ghostDataLabel: {
    color: text,
    fontSize: 12,
    fontWeight: '900',
  },
  ghostDataMeta: {
    color: '#5D7588',
    fontSize: 10,
    fontWeight: '800',
  },
  ghostDataStatus: {
    color: '#7C93A3',
    fontSize: 10,
    fontWeight: '900',
  },
  ghostDataStatusActive: {
    color: navy,
  },
  ghostCandidateRow: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C9DBE5',
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
    color: '#5D7588',
    fontSize: 10,
    fontWeight: '800',
  },
  carbonPreviewCard: {
    height: 228,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: line,
    backgroundColor: '#F4FBF8',
    padding: 18,
    gap: 16,
    overflow: 'hidden',
  },
  carbonTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  carbonTopLabel: {
    color: text,
    fontSize: 15,
    fontWeight: '900',
  },
  carbonTopValue: {
    color: navy,
    fontSize: 16,
    fontWeight: '900',
  },
  carbonMeterTrack: {
    height: 16,
    borderRadius: 8,
    backgroundColor: '#DCE9EF',
    overflow: 'hidden',
  },
  carbonMeterFill: {
    height: 16,
    borderRadius: 8,
    backgroundColor: '#26B191',
  },
  carbonResultCard: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C9DBE5',
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
    color: '#5D7588',
    fontSize: 11,
    fontWeight: '800',
  },
  cardLabel: {
    color: '#315A73',
    fontSize: 14,
    fontWeight: '900',
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
    color: '#4B6A7E',
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
    borderColor: '#8EC8DA',
    backgroundColor: '#DDF4F9',
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
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  scanSourceCardSelected: {
    backgroundColor: pale,
    borderColor: navy,
  },
  scanSummaryCard: {
    minHeight: 68,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: '#DDF4FB',
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
    color: '#6B8194',
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
    minHeight: 58,
    borderWidth: 1,
    borderColor: navy,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F7FBFF',
  },
  folderBreadcrumbCard: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F7FBFF',
    justifyContent: 'center',
  },
  folderBreadcrumbTitle: {
    color: navy,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 3,
  },
  folderBreadcrumbText: {
    color: '#49677C',
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
  folderRowSelected: {
    borderColor: navy,
    backgroundColor: pale,
  },
  folderFileRow: {
    minHeight: 74,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  folderIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: line,
    backgroundColor: '#E3F5FC',
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
    backgroundColor: '#F7FBFF',
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
    color: '#6B8194',
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
    color: '#6B8194',
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
    backgroundColor: '#D8E5EC',
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
    color: '#6B8194',
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
    borderWidth: 8,
    borderColor: '#8EC8DA',
    backgroundColor: pale,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 80,
  },
  progressCircleCompact: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 7,
    marginTop: 18,
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
    backgroundColor: '#F7FBFF',
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
    backgroundColor: '#D8E5EC',
    color: '#6B8194',
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  miniProgressTrack: {
    height: 7,
    borderRadius: 7,
    backgroundColor: '#D8E5EC',
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
    backgroundColor: '#F7FBFF',
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  scanPercent: {
    color: navy,
    fontSize: 22,
    fontWeight: '900',
  },
  scanConditionLine: {
    color: '#6B8194',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
    marginTop: 3,
    maxWidth: 190,
  },
  progressTrack: {
    height: 9,
    borderRadius: 9,
    backgroundColor: '#D8E5EC',
    overflow: 'hidden',
    marginVertical: 20,
  },
  progressFill: {
    height: '100%',
    backgroundColor: navy,
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
    gap: 18,
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
    minHeight: 84,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    backgroundColor: pale,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    gap: 8,
  },
  recentHeroCard: {
    minHeight: 98,
    borderWidth: 1.5,
    borderColor: '#21C7C7',
    borderRadius: 12,
    backgroundColor: pale,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    gap: 8,
  },
  recentHeroDate: {
    color: text,
    fontSize: 22,
    fontWeight: '900',
  },
  recentResultRow: {
    minHeight: 76,
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
    borderWidth: 1,
    borderColor: line,
    borderRadius: 12,
    backgroundColor: pale,
    paddingHorizontal: 18,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  carbonTotalValue: {
    color: text,
    fontSize: 25,
    fontWeight: '900',
    marginTop: 5,
  },
  monthCarbonPill: {
    minHeight: 32,
    borderRadius: 16,
    backgroundColor: '#DDF4F9',
    borderWidth: 1,
    borderColor: '#8EC8DA',
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
    minHeight: 230,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  graphArea: {
    height: 166,
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
    color: '#6B8194',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'right',
  },
  graphPlot: {
    flex: 1,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#C9DBE5',
    height: 146,
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
    backgroundColor: '#7FBED0',
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
    color: '#49677C',
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
    backgroundColor: '#E3ECF1',
  },
  graphGridLineMiddle: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 56,
    height: 1,
    backgroundColor: '#E3ECF1',
  },
  graphGridLineBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 104,
    height: 1,
    backgroundColor: '#E3ECF1',
  },
  statsGuideText: {
    color: '#49677C',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  recentCleanupCard: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 7,
  },
  recentCleanupTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
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
    color: '#49677C',
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
    minHeight: 72,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    backgroundColor: pale,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewSummaryCard: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    backgroundColor: pale,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewRedNumber: {
    color: '#C13A3A',
    fontWeight: '900',
  },
  resultGuideText: {
    marginTop: 18,
    color: text,
    textAlign: 'center',
    fontSize: 13,
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
    color: '#49677C',
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
    color: '#49677C',
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
    color: '#49677C',
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
    borderRadius: 21,
    borderWidth: 1,
    borderColor: line,
    padding: 3,
    flexDirection: 'row',
    backgroundColor: '#F5FAFC',
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
    backgroundColor: '#DDF4F9',
    borderWidth: 1,
    borderColor: '#9AC6CF',
  },
  segmentText: {
    color: text,
    fontSize: 12,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  storageSummaryBar: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    backgroundColor: '#DDF4F9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
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
    minHeight: 52,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    backgroundColor: pale,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  storageBreadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  storageBreadcrumbText: {
    color: '#49677C',
    fontSize: 14,
    fontWeight: '900',
  },
  storageBreadcrumbCurrent: {
    color: text,
    fontSize: 16,
  },
  storageBreadcrumbDivider: {
    color: text,
    fontSize: 18,
    fontWeight: '900',
  },
  storageItemCard: {
    minHeight: 78,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  storageDriveItemPressArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  storageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
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
    borderColor: '#8EC8DA',
    backgroundColor: '#EAF7F2',
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
  storageSelectAllRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 28,
    marginTop: 22,
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
    backgroundColor: '#DDF4F9',
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
    color: '#49677C',
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
    backgroundColor: 'rgba(11, 42, 74, 0.20)',
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
    shadowColor: '#0B2A4A',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
  storageDeleteTitle: {
    color: text,
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
    color: '#49677C',
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
  gmailPanel: {
    borderWidth: 1,
    borderColor: line,
    borderRadius: 14,
    backgroundColor: '#F6F8FC',
    overflow: 'hidden',
  },
  gmailTopBar: {
    minHeight: 56,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gmailLogoMark: {
    color: '#D93025',
    fontSize: 23,
    fontWeight: '900',
  },
  gmailSearchBox: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EAF1FB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  gmailSearchText: {
    color: '#5F6B7A',
    fontSize: 13,
    fontWeight: '800',
  },
  gmailMailboxRow: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gmailComposeButton: {
    height: 40,
    borderRadius: 13,
    backgroundColor: '#C2E7FF',
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  gmailComposeText: {
    color: text,
    fontSize: 12,
    fontWeight: '900',
  },
  gmailInboxPill: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D3E3FD',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gmailInboxText: {
    color: text,
    fontSize: 12,
    fontWeight: '900',
  },
  gmailInboxCount: {
    color: text,
    fontSize: 11,
    fontWeight: '900',
  },
  gmailActionBar: {
    height: 38,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E1E7EF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  gmailActionText: {
    color: '#4D5C68',
    fontSize: 11,
    fontWeight: '900',
  },
  gmailList: {
    backgroundColor: '#FFFFFF',
  },
  gmailRow: {
    minHeight: 43,
    borderBottomWidth: 1,
    borderBottomColor: '#E7EBF0',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gmailStar: {
    color: '#AAB3BC',
    fontSize: 18,
    fontWeight: '900',
  },
  gmailSenderWrap: {
    width: 70,
  },
  gmailSender: {
    color: text,
    fontSize: 12.5,
    fontWeight: '900',
  },
  gmailSubjectWrap: {
    flex: 1,
  },
  gmailSubject: {
    color: text,
    fontSize: 12.5,
    fontWeight: '900',
  },
  gmailMeta: {
    color: '#647281',
    fontSize: 10.5,
    fontWeight: '800',
    marginTop: 1,
  },
  fileTypeIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#8EC8DA',
    backgroundColor: '#DDF4F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileTypeText: {
    color: navy,
    fontSize: 15,
    fontWeight: '900',
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
    color: '#7B8FA0',
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
    backgroundColor: '#F7FBFF',
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
    borderColor: '#8EC8DA',
    backgroundColor: '#DDF4F9',
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  driveMoveTargetText: {
    color: navy,
    fontSize: 11,
    fontWeight: '900',
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
    color: '#315A73',
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
    backgroundColor: '#F7FCFE',
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
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  thinDivider: {
    height: 1,
    backgroundColor: '#D8E5EC',
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
    width: 42,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: line,
    backgroundColor: '#E3F5FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceIconText: {
    color: navy,
    fontSize: 18,
    fontWeight: '900',
  },
  connectedPill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    height: 25,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#9AC6CF',
    backgroundColor: '#EAF7F2',
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
    backgroundColor: '#DDF4FB',
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
    color: '#315A73',
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
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  versionText: {
    color: '#46677D',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 10,
    paddingTop: 0,
  },
  settingsBottomSpacer: {
    height: 72,
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
    backgroundColor: 'rgba(11, 42, 74, 0.18)',
  },
  deleteConfirmOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 40,
    backgroundColor: 'rgba(11, 42, 74, 0.20)',
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
    shadowColor: '#0B2A4A',
    shadowOpacity: 0.18,
    shadowRadius: 16,
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
    color: '#49677C',
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
    color: '#49677C',
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
    backgroundColor: 'rgba(11, 42, 74, 0.18)',
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
    shadowColor: '#0B2A4A',
    shadowOpacity: 0.16,
    shadowRadius: 14,
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
    shadowColor: '#0B2A4A',
    shadowOpacity: 0.16,
    shadowRadius: 16,
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
    shadowColor: '#0B2A4A',
    shadowOpacity: 0.16,
    shadowRadius: 16,
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
    shadowColor: '#0B2A4A',
    shadowOpacity: 0.16,
    shadowRadius: 16,
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
    backgroundColor: '#C8D5DD',
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
    fontSize: 20,
    fontWeight: '900',
  },
  modalClose: {
    color: '#46677D',
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
  toggleRowPlain: {
    borderWidth: 0,
    borderRadius: 0,
    minHeight: 74,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  toggleRowTint: {
    backgroundColor: pale,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 3,
    backgroundColor: '#C8D5DD',
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
  bottomNav: {
    height: 72,
    borderTopWidth: 1,
    borderTopColor: line,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  navIconFrame: {
    width: 26,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    color: '#315A73',
    fontSize: 11,
    fontWeight: '900',
  },
  navLabelActive: {
    color: navy,
  },
  navIconActiveFill: {
    backgroundColor: navy,
  },
  navHomeImage: {
    width: 22,
    height: 22,
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
    backgroundColor: '#2F6686',
    transform: [{ rotate: '-43deg' }],
  },
  navHomeRoofRight: {
    position: 'absolute',
    top: 5,
    right: 3.2,
    width: 15.5,
    height: 4.6,
    borderRadius: 1,
    backgroundColor: '#2F6686',
    transform: [{ rotate: '43deg' }],
  },
  navHomeLeftWall: {
    position: 'absolute',
    left: 3.5,
    bottom: 2.5,
    width: 4.8,
    height: 12.5,
    backgroundColor: '#2F6686',
  },
  navHomeRightWall: {
    position: 'absolute',
    right: 3.5,
    bottom: 2.5,
    width: 4.8,
    height: 12.5,
    backgroundColor: '#2F6686',
  },
  navHomeBase: {
    position: 'absolute',
    left: 3.5,
    right: 3.5,
    bottom: 2.5,
    height: 4.8,
    backgroundColor: '#2F6686',
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
    borderColor: '#2F6686',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  navLockerActive: {
    borderColor: navy,
    backgroundColor: '#EAF7F2',
  },
  navLockerDoor: {
    flex: 1,
    borderLeftWidth: 1.5,
    borderLeftColor: '#B8D3DE',
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
    backgroundColor: '#2F6686',
    marginBottom: 2,
  },
  navLockerHandle: {
    position: 'absolute',
    right: 3,
    top: 10,
    width: 2.8,
    height: 5.4,
    borderRadius: 2,
    backgroundColor: '#2F6686',
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
    backgroundColor: '#2F6686',
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
    backgroundColor: '#2F6686',
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
