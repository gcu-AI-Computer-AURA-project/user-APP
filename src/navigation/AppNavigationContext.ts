import React from 'react';

export type Screen =
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

export type MainTab = 'home' | 'storage' | 'trash' | 'history' | 'settings';

export type FloatingButtonVariant = 'scan' | 'delete' | 'trash' | 'restore';
export type FloatingAction = {
  variant: Exclude<FloatingButtonVariant, 'scan'>;
  onPress: () => void;
  small?: boolean;
};

export const getMainTabForScreen = (screen: Screen): MainTab | null => {
  if (screen === 'storageMail' || screen === 'storageDrive' || screen === 'storageDetail') {
    return 'storage';
  }

  if (screen === 'storageTrash' || screen === 'storageDriveTrash') {
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

  if (screen === 'analysisHistory' || screen === 'analysisHistoryAll') {
    return 'history';
  }

  return null;
};

export const getBackFallbackForScreen = (screen: Screen): Screen => {
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

export const defaultTabScreens: Record<MainTab, Screen> = {
  home: 'home',
  storage: 'storageMail',
  trash: 'storageTrash',
  history: 'analysisHistory',
  settings: 'settings',
};

export const loginFlowScreens: Screen[] = [
  'initial',
  'privacy',
  'permissions',
  'connected',
  'onboardingIntro',
  'onboardingGhost',
  'onboardingCarbon',
];

export const mainTabOrder: MainTab[] = ['home', 'storage', 'trash', 'history', 'settings'];

export const scanFlowScreens = new Set<Screen>([
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

export const NavigationContext = React.createContext<{
  current: Screen;
  currentTab: MainTab | null;
  navigate: (screen: Screen) => void;
  navigateTab: (tab: MainTab) => void;
  back: () => void;
  scanResultPending?: boolean;
  connectedInstant?: boolean;
} | null>(null);
