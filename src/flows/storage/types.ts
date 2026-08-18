import type { ApiStorageItem } from '../../api/features';

export type PermissionState = { gmail: boolean; drive: boolean; alarm: boolean };

export type DriveFolderOption = { id?: string; name: string; meta?: string; parentId?: string };

export type StorageApiFields = {
  itemId?: number;
  externalItemId?: string;
  snapshotTitle?: string;
  snapshotSizeBytes?: number;
  itemSource?: 'GMAIL' | 'DRIVE';
  snippet?: string;
  webViewLink?: string;
};

export type StorageMailItem = StorageApiFields & {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  badge?: string;
};

export type StorageDriveItem = StorageApiFields & {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  fullPath?: string;
};

export type StorageDetailItem = StorageApiFields & {
  title: string;
  meta: string;
  source: 'mail' | 'drive';
};

export type StorageServerPageState = {
  items: ApiStorageItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type StorageDriveMoveTargets = Record<string, string>;
