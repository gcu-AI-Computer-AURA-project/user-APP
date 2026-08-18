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
