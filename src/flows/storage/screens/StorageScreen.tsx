import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, Text, View } from 'react-native';
import { cleanupApi, storageApi, type ApiCleanupJob, type ApiStorageActionItem } from '../../../api/features';
import { OutlineButton, PrimaryButton } from '../../../components/AppButtons';
import { CheckBox } from '../../../components/CheckBox';
import { ScreenShell } from '../../../components/layout';
import { EmptyState } from '../../../components/ui';
import type { FloatingAction, Screen } from '../../../navigation/AppNavigationContext';
import { styles } from '../../../styles/appStyles';
import { wait, getErrorMessage } from '../../../utils/runtime';
import { isTerminalCleanupJobStatus, type ScanRecord, type ScanSummary } from '../../scan';
import { StorageDriveCard, StorageMailCard } from '../components/StorageCards';
import { PermissionRevokedCard, StorageDeleteSheet, StorageRestoreSheet } from '../components/StorageSheets';
import { StorageTrashNotice } from '../components/StorageTrashNotice';
import { storageServerPageCache, clearStorageServerPageCache } from '../storageCache';
import { buildGoogleDriveWebViewLink, driveRootPath, getAllStorageDriveItems, getAllStorageDriveTrashItems, getDriveParentPath, getStorageDriveTrashItemsForFolder, splitDrivePath } from '../storageDriveUtils';
import { extractStorageSizeMB, getStorageSizeLabel, getTrashDriveFolderPath, splitStorageMeta } from '../storageFormatters';
import { apiDriveFolderToStorageItemFromApi, apiStorageItemToDriveFromApi, apiStorageItemToMail, apiStorageItemToTrash, dedupeStorageDriveItems, dedupeStorageMailItems, normalizeServerDrivePath } from '../storageTransforms';
import type { DriveFolderOption, PermissionState, StorageDetailItem, StorageDriveItem, StorageDriveMoveTargets, StorageMailItem, StorageServerPageState } from '../types';

export function StorageScreen({
  mode,
  scan,
  emptyScanSummary,
  defaultStorageSummary,
  apiAccessToken,
  apiBootstrapLoading,
  googlePermissionChecking,
  driveFolders,
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
  onLoadDriveFolders,
  onServerStorageChanged,
  storageSheetBackHandlerRef,
}: {
  mode: 'storageMail' | 'storageDrive' | 'storageTrash' | 'storageDriveTrash';
  scan: ScanRecord | null;
  emptyScanSummary: ScanSummary;
  defaultStorageSummary: ScanSummary;
  apiAccessToken: string | null;
  apiBootstrapLoading: boolean;
  googlePermissionChecking: boolean;
  driveFolders: DriveFolderOption[];
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
  onLoadDriveFolders: (parentPath?: string) => Promise<void>;
  onServerStorageChanged?: () => void;
  storageSheetBackHandlerRef?: React.MutableRefObject<(() => boolean) | null>;
}) {
  const isDrive = mode === 'storageDrive' || mode === 'storageDriveTrash';
  const isTrash = mode === 'storageTrash' || mode === 'storageDriveTrash';
  const screenTitle = isTrash ? '휴지통' : '정리함';
  const [selectionMode, setSelectionMode] = useState(false);
  const [deleteSheetMode, setDeleteSheetMode] = useState<'trash' | 'permanent' | null>(null);
  const [restoreSheetVisible, setRestoreSheetVisible] = useState(false);
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);
  const [restoreConfirmChecked, setRestoreConfirmChecked] = useState(false);
  const deleteSheetMotion = useRef(new Animated.Value(1)).current;
  const restoreSheetMotion = useRef(new Animated.Value(1)).current;
  const [storageDriveTrashFolder, setStorageDriveTrashFolder] = useState(driveRootPath);
  const [storagePage, setStoragePage] = useState(0);
  const prefix = mode === 'storageDriveTrash' ? 'storageDriveTrash' : isTrash ? 'storageTrash' : isDrive ? 'storageDrive' : 'storageMail';
  const shouldUseServerPagination = Boolean(apiAccessToken);
  const storageServerSource = isDrive ? ('DRIVE' as const) : ('GMAIL' as const);
  const storageApiPageSize = 20;
  const [serverPage, setServerPage] = useState<StorageServerPageState | null>(null);
  const [serverPageLoading, setServerPageLoading] = useState(false);
  const [storageActionRefreshing, setStorageActionRefreshing] = useState(false);
  const [serverPageError, setServerPageError] = useState('');
  const serverPageRequestId = useRef(0);
  const serverPageCacheRef = useRef<Record<string, StorageServerPageState>>(storageServerPageCache);
  const summary = scan?.result ?? (apiAccessToken ? emptyScanSummary : defaultStorageSummary);
  const serverMailItems = serverPage?.items.map(apiStorageItemToMail) ?? [];
  const serverDriveItems = serverPage?.items.map((item) => apiStorageItemToDriveFromApi(item, driveFolders)) ?? [];
  const serverTrashItems = serverPage?.items.map(apiStorageItemToTrash) ?? [];
  const cachedServerItems = shouldUseServerPagination && apiAccessToken
    ? Object.entries(serverPageCacheRef.current)
        .filter(([key]) => key.startsWith(`${apiAccessToken}:${mode}:${storageServerSource}:`))
        .flatMap(([, page]) => page.items)
    : [];
  const cachedServerDriveItems = mode === 'storageDrive' && shouldUseServerPagination
    ? cachedServerItems.map((item) => apiStorageItemToDriveFromApi(item, driveFolders))
    : [];
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
  const normalizedStorageDriveFolder = normalizeServerDrivePath(storageDriveFolder);
  const apiStorageFolderItems =
    shouldUseServerPagination && mode === 'storageDrive'
      ? driveFolders
          .filter((folder) => normalizeServerDrivePath(folder.parentId) === normalizedStorageDriveFolder)
          .map(apiDriveFolderToStorageItemFromApi)
      : [];
  const storageDriveUniverse = (shouldUseServerPagination && mode === 'storageDrive'
    ? dedupeStorageDriveItems([...apiStorageFolderItems, ...cachedServerDriveItems, ...serverDriveItems])
    : hasApiStorageDriveItems
      ? summary.storageDriveItems
      : allStorageDriveItems).map(applyDriveMove);
  const currentStorageDriveItems = storageDriveUniverse
    .filter((item) => {
      const itemPath = item.fullPath ?? '';
      if (item.type === 'F') return getDriveParentPath(itemPath) === normalizedStorageDriveFolder;
      return normalizeServerDrivePath(itemPath) === normalizedStorageDriveFolder;
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
          webViewLink: item.webViewLink,
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
  const toDriveTrashItem = (item: StorageMailItem): StorageDriveItem => {
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
      webViewLink: item.webViewLink ?? buildGoogleDriveWebViewLink(item.externalItemId),
    };
  };
  const mappedSummaryDriveTrashItems: StorageDriveItem[] = mode === 'storageDriveTrash'
    ? trashItems.map(toDriveTrashItem)
    : [];
  const cachedDriveTrashItems: StorageDriveItem[] = mode === 'storageDriveTrash' && shouldUseServerPagination
    ? cachedServerItems
        .map(apiStorageItemToTrash)
        .filter((item) => item.id.startsWith('trash-drive-'))
        .map(toDriveTrashItem)
    : [];
  const movedDriveTrashItems = storageDriveTrashFolder === driveRootPath ? mappedSummaryDriveTrashItems : [];
  const driveTrashUniverse = dedupeStorageDriveItems([
    ...(shouldUseServerPagination ? [] : getAllStorageDriveTrashItems()),
    ...cachedDriveTrashItems,
    ...mappedSummaryDriveTrashItems,
  ])
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
  const cachedMailSelectionItems = !isDrive && shouldUseServerPagination
    ? cachedServerItems.map((item) => isTrash ? apiStorageItemToTrash(item) : apiStorageItemToMail(item))
    : [];
  const mailSelectionUniverse = !isDrive
    ? dedupeStorageMailItems([...cachedMailSelectionItems, ...mailPagedSourceItems])
        .filter((item) => !isHiddenFromCurrentList(item.id))
    : [];
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
    : mailSelectionUniverse.filter((item) => isItemChecked(item.id));
  const selectedActiveItemCount = selectedItems.length;
  const isStorageLoading = googlePermissionChecking || apiBootstrapLoading || serverPageLoading || storageActionRefreshing;
  const shouldShowStorageLoading = shouldUseServerPagination && isStorageLoading;
  const storageDriveParentId =
    storageServerSource === 'DRIVE' && !isTrash && normalizedStorageDriveFolder !== driveRootPath
      ? driveFolders.find((folder) => normalizeServerDrivePath(folder.name) === normalizedStorageDriveFolder)?.id
      : undefined;

  const loadStorageServerPage = (page: number, force = false): Promise<void> => {
    if (!apiAccessToken || !shouldUseServerPagination) return Promise.resolve();
    if (storageServerSource === 'DRIVE' && !isTrash && normalizedStorageDriveFolder !== driveRootPath && !storageDriveParentId) {
      return Promise.resolve();
    }

    const cacheKey = `${apiAccessToken}:${mode}:${storageServerSource}:${page}:${storageDriveParentId ?? 'root'}`;
    const cachedPage = serverPageCacheRef.current[cacheKey];
    if (cachedPage && !force) {
      setServerPage(cachedPage);
      setServerPageError('');
      setServerPageLoading(false);
      return Promise.resolve();
    }

    const requestId = serverPageRequestId.current + 1;
    serverPageRequestId.current = requestId;
    setServerPageLoading(true);
    setServerPageError('');
    const request = isTrash
      ? storageApi.getTrash({ item_source: storageServerSource, page, size: storageApiPageSize }, { accessToken: apiAccessToken })
      : storageApi.getItems(
          { item_source: storageServerSource, page, size: storageApiPageSize, parent_id: storageDriveParentId },
          { accessToken: apiAccessToken }
        );

    return request
      .then((result) => {
        if (serverPageRequestId.current !== requestId) return;
        const nextPage = {
          items: result.content ?? [],
          page: result.page ?? page,
          size: result.size ?? storageApiPageSize,
          totalElements: result.total_elements ?? result.content?.length ?? 0,
          totalPages: result.total_pages ?? 1,
        };
        serverPageCacheRef.current[cacheKey] = nextPage;
        storageServerPageCache[cacheKey] = nextPage;
        setServerPage(nextPage);
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
    serverPageCacheRef.current = storageServerPageCache;
    setServerPage(null);
    setServerPageError('');
    setServerPageLoading(false);
  }, [apiAccessToken, mode, storageDriveFolder]);

  useEffect(() => {
    if (!shouldUseServerPagination || !apiAccessToken) return;
    void loadStorageServerPage(storagePage);
  }, [apiAccessToken, mode, shouldUseServerPagination, storagePage, storageDriveFolder, storageDriveParentId]);

  useEffect(() => {
    if (!apiAccessToken || mode !== 'storageDrive' || !permissions.drive) return;
    void onLoadDriveFolders(storageDriveFolder);
  }, [apiAccessToken, mode, permissions.drive, storageDriveFolder]);

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
      snippet: item.snippet,
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
      webViewLink: item.webViewLink ?? buildGoogleDriveWebViewLink(item.externalItemId),
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
    deleteSheetMotion.setValue(1);
    Animated.timing(deleteSheetMotion, {
      toValue: 0,
      duration: 240,
      useNativeDriver: true,
    }).start();
  };
  const openRestoreSheet = () => {
    if (!selectedItems.length) {
      showToast('복구할 항목을 선택해주세요');
      return;
    }
    setRestoreConfirmChecked(false);
    setRestoreSheetVisible(true);
    restoreSheetMotion.setValue(1);
    Animated.timing(restoreSheetMotion, {
      toValue: 0,
      duration: 240,
      useNativeDriver: true,
    }).start();
  };
  const closeDeleteSheet = () => {
    Animated.timing(deleteSheetMotion, {
      toValue: 1,
      duration: 210,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setDeleteSheetMode(null);
        setDeleteConfirmChecked(false);
      }
    });
  };
  const closeRestoreSheet = () => {
    Animated.timing(restoreSheetMotion, {
      toValue: 1,
      duration: 210,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setRestoreSheetVisible(false);
        setRestoreConfirmChecked(false);
      }
    });
  };
  useEffect(() => {
    if (!storageSheetBackHandlerRef) return undefined;

    if (!deleteSheetMode && !restoreSheetVisible) {
      storageSheetBackHandlerRef.current = null;
      return undefined;
    }

    storageSheetBackHandlerRef.current = () => {
      if (restoreSheetVisible) {
        closeRestoreSheet();
        return true;
      }
      if (deleteSheetMode) {
        closeDeleteSheet();
        return true;
      }
      return false;
    };

    return () => {
      storageSheetBackHandlerRef.current = null;
    };
  }, [deleteSheetMode, restoreSheetVisible, storageSheetBackHandlerRef]);
  const getMovedTrashOriginalKey = (id: string) => {
    if (id.startsWith('trash-mail-moved-')) return `storageMail:${id.replace('trash-mail-moved-', '')}`;
    if (id.startsWith('trash-drive-moved-')) return `storageDrive:${id.replace('trash-drive-moved-', '')}`;
    return null;
  };
  const normalizeActionExternalItemId = (value?: string) => {
    const trimmed = value?.trim();
    if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return '';
    return trimmed;
  };
  const getFallbackActionExternalItemId = (id: string) =>
    normalizeActionExternalItemId(
      id
        .replace(/^api-storage-(?:mail|drive)-/, '')
        .replace(/^trash-(?:mail|drive)-api-/, '')
        .replace(/^trash-drive-file-/, '')
        .replace(/^trash-mail-moved-/, '')
        .replace(/^trash-drive-moved-/, '')
        .replace(/^storage-/, '')
    );
  const getApiStorageActionItems = (): ApiStorageActionItem[] =>
    selectedItems
      .map((item) => {
        const externalItemId = normalizeActionExternalItemId(item.externalItemId) || getFallbackActionExternalItemId(item.id);
        const snapshotTitle = item.snapshotTitle || item.title;
        if (!externalItemId) return null;

        return {
          item_source: item.itemSource ?? (isDrive ? ('DRIVE' as const) : ('GMAIL' as const)),
          external_item_id: externalItemId,
          ...(item.itemId !== undefined ? { item_id: item.itemId } : {}),
          ...(snapshotTitle ? { snapshot_title: snapshotTitle } : {}),
          ...(item.snapshotSizeBytes !== undefined ? { snapshot_size_bytes: item.snapshotSizeBytes } : {}),
        };
      })
      .filter((item): item is ApiStorageActionItem => Boolean(item));
  const waitForStorageCleanupJob = async (job?: ApiCleanupJob) => {
    if (!apiAccessToken || !job?.cleanup_job_id || isTerminalCleanupJobStatus(job.job_status)) return job;

    let latestJob = job;
    for (let attempt = 0; attempt < 15; attempt += 1) {
      await wait(1200);
      latestJob = await cleanupApi.getDetail(job.cleanup_job_id, { accessToken: apiAccessToken });
      if (isTerminalCleanupJobStatus(latestJob.job_status)) return latestJob;
    }
    return latestJob;
  };
  const getStorageCleanupFailureMessage = async (job: ApiCleanupJob | undefined, fallback: string) => {
    if (!apiAccessToken || !job?.cleanup_job_id) return job?.error_message || fallback;

    try {
      const itemList = await cleanupApi.getItems(job.cleanup_job_id, { accessToken: apiAccessToken });
      const failedItem = itemList.items?.find((item) => item.process_status === 'FAILED');
      return failedItem?.failure_reason || job.error_message || fallback;
    } catch {
      return job.error_message || fallback;
    }
  };
  const refreshStorageServerAfterAction = () => {
    clearStorageServerPageCache();
    serverPageCacheRef.current = storageServerPageCache;
    setServerPage(null);
    onServerStorageChanged?.();
    return loadStorageServerPage(safeStoragePage, true);
  };
  const clearCompletedStorageActionKeys = (selectedKeys: string[], action: 'move' | 'permanent' | 'restore') => {
    if (action === 'move') {
      setStorageTrashMovedKeys((items) => items.filter((key) => !selectedKeys.includes(key)));
      return;
    }
    if (action === 'permanent') {
      setStorageDeletedKeys((items) => items.filter((key) => !selectedKeys.includes(key)));
      return;
    }
    setStorageRestoredKeys((items) => items.filter((key) => !selectedKeys.includes(key)));
  };
  const refreshStorageServerAfterCleanupJob = (job: ApiCleanupJob | undefined, selectedKeys: string[], action: 'move' | 'permanent' | 'restore') => {
    setStorageActionRefreshing(true);
    void waitForStorageCleanupJob(job)
      .then(async (finishedJob) => {
        await refreshStorageServerAfterAction();
        if (!finishedJob?.cleanup_job_id || isTerminalCleanupJobStatus(finishedJob.job_status)) {
          clearCompletedStorageActionKeys(selectedKeys, action);
        }
        if (finishedJob?.job_status === 'PARTIAL_FAILED') {
          const message = await getStorageCleanupFailureMessage(finishedJob, '일부 항목 처리에 실패했어요. 목록을 다시 확인해주세요');
          showToast(message, undefined, 3600);
        }
        if (finishedJob?.job_status === 'FAILED' || finishedJob?.job_status === 'CANCELED') {
          const message = await getStorageCleanupFailureMessage(finishedJob, '항목 처리 작업이 완료되지 못했어요');
          showToast(message, undefined, 3600);
        }
      })
      .catch(async () => {
        await refreshStorageServerAfterAction();
        showToast('작업 완료 상태 확인에 실패했어요. 목록을 다시 불러왔습니다', undefined, 3000);
      })
      .finally(() => {
        setStorageActionRefreshing(false);
      });
  };

  const confirmStorageDelete = async () => {
    if (!deleteConfirmChecked) {
      showToast('삭제 확인 체크가 필요합니다');
      return;
    }

    const permanent = deleteSheetMode === 'permanent';
    const selectedKeys = selectedItems.map((item) => itemStorageKey(item.id));
    const apiItems = getApiStorageActionItems();

    if (apiAccessToken && !apiItems.length) {
      showToast('서버에 전달할 항목 정보가 없어요');
      return;
    }

    try {
      let cleanupJob: ApiCleanupJob | undefined;
      if (apiAccessToken) {
        if (permanent) {
          cleanupJob = await storageApi.permanentDelete(apiItems, { accessToken: apiAccessToken });
        } else {
          cleanupJob = await storageApi.moveToTrash(apiItems, { accessToken: apiAccessToken });
        }
      }

      closeDeleteSheet();

      if (!permanent) {
        setStorageTrashMovedKeys((items) => Array.from(new Set([...items, ...selectedKeys])));
        showToast(apiAccessToken ? '휴지통 이동 요청을 처리 중이에요' : '선택 항목을 휴지통으로 이동했어요');
      } else {
        setStorageDeletedKeys((items) => Array.from(new Set([...items, ...selectedKeys])));
        showToast(apiAccessToken ? '영구 삭제 요청을 처리 중이에요' : '영구 삭제가 완료됐어요');
      }

      clearSelectionPrefix(prefix);
      setSelectionMode(false);
      if (apiAccessToken) {
        refreshStorageServerAfterCleanupJob(cleanupJob, selectedKeys, permanent ? 'permanent' : 'move');
      }
    } catch (error) {
      showToast(getErrorMessage(error, permanent ? '영구 삭제 요청에 실패했어요' : '휴지통 이동 요청에 실패했어요'), undefined, 3000);
    }
  };
  const confirmStorageRestore = async () => {
    if (!restoreConfirmChecked) {
      showToast('복구 확인 체크가 필요합니다');
      return;
    }

    const selectedKeys = selectedItems.map((item) => itemStorageKey(item.id));
    const movedSourceKeys = selectedItems
      .map((item) => getMovedTrashOriginalKey(item.id))
      .filter((key): key is string => Boolean(key));
    const apiItems = getApiStorageActionItems();

    if (apiAccessToken && !apiItems.length) {
      showToast('서버에 전달할 항목 정보가 없어요');
      return;
    }

    try {
      let cleanupJob: ApiCleanupJob | undefined;
      if (apiAccessToken) {
        cleanupJob = await storageApi.restore(apiItems, { accessToken: apiAccessToken });
      }

      closeRestoreSheet();
      setStorageRestoredKeys((items) => Array.from(new Set([...items, ...selectedKeys])));
      if (movedSourceKeys.length) {
        setStorageTrashMovedKeys((items) => items.filter((key) => !movedSourceKeys.includes(key)));
      }
      clearSelectionPrefix(prefix);
      setSelectionMode(false);
      showToast(apiAccessToken ? '복구 요청을 처리 중이에요' : '선택 항목을 정리함으로 복구했어요');
      if (apiAccessToken) {
        refreshStorageServerAfterCleanupJob(cleanupJob, selectedKeys, 'restore');
      }
    } catch (error) {
      showToast(getErrorMessage(error, '복구 요청에 실패했어요'), undefined, 3000);
    }
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
      {isTrash ? (
        <View style={styles.storageTrashNoticeBlock}>
          <Text style={styles.storageTrashNoticeText}>휴지통에 있는 항목들은 30일 이후 자동으로 삭제됩니다.</Text>
        </View>
      ) : null}
      {!googlePermissionChecking && !serviceConnected ? (
        <PermissionRevokedCard onPress={onReconnect} />
      ) : (
        <View style={styles.storageLooseList}>
          {isDrive ? (
            <View style={[styles.storagePathCard, isTrash && styles.storagePathCardAfterTrashNotice]}>
              <View style={styles.storageBreadcrumbRow}>
                {storageDriveBreadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.path}>
                    <Pressable
                      style={styles.storageBreadcrumbPressable}
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

            </View>
          ) : (
            <View style={[styles.storagePathCard, isTrash && styles.storagePathCardAfterTrashNotice, styles.storagePagerCard]}>
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
          {serverPageError && !shouldShowStorageLoading ? (
            <View style={styles.warningCard}>
              <Text style={styles.warningText}>{serverPageError}</Text>
              <View style={styles.twoButtons}>
                <OutlineButton title="재시도" onPress={() => void loadStorageServerPage(safeStoragePage, true)} half />
                <PrimaryButton title="권한 재연결" onPress={onReconnect} half />
              </View>
            </View>
          ) : null}
          {activeItems.length > 0 && selectionMode && !shouldShowStorageLoading ? (
            <Pressable style={styles.storageSelectAllRowInBox} onPress={toggleAllActiveStorageItems}>
              <CheckBox checked={allChecked} onPress={toggleAllActiveStorageItems} compact />
              <Text style={styles.selectAllText}>{allChecked ? '전체 선택 해제' : '전체 선택'}</Text>
            </Pressable>
          ) : null}
          {shouldShowStorageLoading ? (
            <View style={styles.storageLoadingCard}>
              <ActivityIndicator color="#74C987" />
              <Text style={styles.infoDesc}>서버 데이터를 불러오는 중이에요</Text>
            </View>
          ) : activeItems.length ? (
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
        motion={deleteSheetMotion}
        onToggle={() => setDeleteConfirmChecked((value) => !value)}
        onCancel={closeDeleteSheet}
        onConfirm={confirmStorageDelete}
      />
    ) : null}
    {restoreSheetVisible ? (
      <StorageRestoreSheet
        count={selectedItems.length}
        checked={restoreConfirmChecked}
        motion={restoreSheetMotion}
        onToggle={() => setRestoreConfirmChecked((value) => !value)}
        onCancel={closeRestoreSheet}
        onConfirm={confirmStorageRestore}
      />
    ) : null}
    </View>
  );
}
