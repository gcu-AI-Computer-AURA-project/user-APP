import type { ApiStorageItem } from '../../api/features';
import { formatApiDateOnly, formatBytes } from '../../utils/formatters';
import { buildGoogleDriveWebViewLink, driveRootPath, splitDrivePath } from './storageDriveUtils';
import type { DriveFolderOption, StorageDriveItem, StorageMailItem } from './types';

export function apiStorageItemToMail(item: ApiStorageItem): StorageMailItem {
  const date = formatApiDateOnly(item.trashed_at || item.modified_time || item.last_opened_time);
  return {
    id: `api-storage-mail-${item.item_id ?? item.external_item_id ?? item.title}`,
    itemId: item.item_id,
    externalItemId: item.external_item_id,
    snapshotTitle: item.title,
    snapshotSizeBytes: item.size_bytes,
    itemSource: item.item_source ?? 'GMAIL',
    snippet: item.snippet,
    title: item.title || item.external_item_id || 'Gmail 항목',
    subtitle: item.title || '메일 항목',
    meta: `받은날짜 ${date} · Gmail · ${formatBytes(item.size_bytes)}`,
    badge: item.recoverable === false ? '만료 임박' : undefined,
  };
}

export function dedupeStorageMailItems(items: StorageMailItem[]) {
  const map = new Map<string, StorageMailItem>();
  items.forEach((item) => {
    map.set(`${item.itemSource ?? 'GMAIL'}:${item.externalItemId ?? item.itemId ?? item.id}`, item);
  });
  return Array.from(map.values());
}

export function getApiMetadataString(item: ApiStorageItem, key: string) {
  const value = item.metadata?.[key];
  return typeof value === 'string' ? value : undefined;
}

export function normalizeApiDrivePath(path?: string | null) {
  const raw = path?.trim();
  if (!raw || raw === '/' || raw === driveRootPath) return driveRootPath;
  if (raw.startsWith(driveRootPath)) {
    return raw.replace(/\s*>\s*/g, ' › ').replace(/\s*›\s*/g, ' › ');
  }

  const normalized = raw
    .replace(/[\\/]+/g, ' › ')
    .replace(/\s*>\s*/g, ' › ')
    .replace(/\s*›\s*/g, ' › ')
    .replace(/^내\s*Drive\s*›\s*/i, '')
    .replace(/^Drive\s*›\s*/i, '')
    .trim();

  return normalized ? `${driveRootPath} › ${normalized}` : driveRootPath;
}

export function isApiStorageFolder(item: ApiStorageItem) {
  return item.is_folder === true || item.item_type === 'FOLDER' || item.mime_type === 'application/vnd.google-apps.folder';
}

export function getApiStorageFolderPath(item: ApiStorageItem) {
  return normalizeApiDrivePath(item.folder_path ?? getApiMetadataString(item, 'folder_path') ?? getApiMetadataString(item, 'path'));
}

export function apiDriveFolderToStorageItem(folder: DriveFolderOption): StorageDriveItem {
  const fullPath = normalizeApiDrivePath(folder.name);
  const parts = fullPath.split('›').map((part) => part.trim()).filter(Boolean);
  const title = parts[parts.length - 1] ?? folder.name ?? 'Drive';
  const parentPath = normalizeApiDrivePath(folder.parentId);

  return {
    id: `api-storage-folder-${folder.id ?? fullPath}`,
    externalItemId: folder.id,
    itemSource: 'DRIVE',
    type: 'F',
    title,
    subtitle: `${parentPath} · 폴더`,
    fullPath,
  };
}

export function dedupeStorageDriveItems(items: StorageDriveItem[]) {
  const map = new Map<string, StorageDriveItem>();
  items.forEach((item) => {
    map.set(item.externalItemId ?? item.fullPath ?? item.id, item);
  });
  return Array.from(map.values());
}

export function normalizeServerDrivePath(path?: string | null) {
  const raw = path?.trim();
  if (!raw || raw === '/' || raw === driveRootPath) return driveRootPath;

  const parts = raw
    .replace(/[\\/]+/g, '›')
    .replace(/\s*>\s*/g, '›')
    .replace(/\s*›\s*/g, '›')
    .split('›')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part, index) => !(index === 0 && /^(내\s*)?drive$/i.test(part)));

  return parts.length ? `${driveRootPath} › ${parts.join(' › ')}` : driveRootPath;
}

export function apiDriveFolderToStorageItemFromApi(folder: DriveFolderOption): StorageDriveItem {
  const fullPath = normalizeServerDrivePath(folder.name);
  const parts = splitDrivePath(fullPath);
  const title = parts[parts.length - 1] ?? folder.name ?? 'Drive';
  const parentPath = normalizeServerDrivePath(folder.parentId);

  return {
    id: `api-storage-folder-${folder.id ?? fullPath}`,
    externalItemId: folder.id,
    itemSource: 'DRIVE',
    type: 'F',
    title,
    subtitle: `${parentPath} · 폴더`,
    fullPath,
  };
}

export function apiStorageItemToDriveFromApi(item: ApiStorageItem, folders: DriveFolderOption[] = []): StorageDriveItem {
  const isFolder = isApiStorageFolder(item);
  const extension = isFolder ? 'F' : (item.file_extension || item.mime_type || 'FILE').replace(/^\./, '').toUpperCase();
  const metadataPath = item.folder_path ?? getApiMetadataString(item, 'folder_path') ?? getApiMetadataString(item, 'path');
  const parentFolder = item.parent_folder_id ? folders.find((folder) => folder.id === item.parent_folder_id) : undefined;
  const parentPath = normalizeServerDrivePath(metadataPath ?? parentFolder?.name ?? driveRootPath);
  const title = item.title || item.external_item_id || (isFolder ? 'Drive 폴더' : 'Drive 파일');

  return {
    id: `api-storage-drive-${item.item_id ?? item.external_item_id ?? title}`,
    itemId: item.item_id,
    externalItemId: item.external_item_id,
    snapshotTitle: title,
    snapshotSizeBytes: item.size_bytes,
    itemSource: item.item_source ?? 'DRIVE',
    type: extension || 'FILE',
    title,
    subtitle: isFolder ? `${parentPath} · 폴더` : `${extension || 'FILE'} · ${formatBytes(item.size_bytes)} · Drive`,
    fullPath: isFolder ? normalizeServerDrivePath(`${parentPath} › ${title}`) : parentPath,
    webViewLink: item.web_view_link ?? buildGoogleDriveWebViewLink(item.external_item_id),
  };
}

export function apiStorageItemToDrive(item: ApiStorageItem): StorageDriveItem {
  const isFolder = isApiStorageFolder(item);
  const extension = isFolder ? 'F' : (item.file_extension || item.mime_type || 'FILE').replace(/^\./, '').toUpperCase();
  const parentPath = getApiStorageFolderPath(item);
  const title = item.title || item.external_item_id || (isFolder ? 'Drive 폴더' : 'Drive 파일');
  return {
    id: `api-storage-drive-${item.item_id ?? item.external_item_id ?? item.title}`,
    itemId: item.item_id,
    externalItemId: item.external_item_id,
    snapshotTitle: item.title,
    snapshotSizeBytes: item.size_bytes,
    itemSource: item.item_source ?? 'DRIVE',
    type: extension || 'FILE',
    title: item.title || item.external_item_id || 'Drive 파일',
    subtitle: `${extension || 'FILE'} · ${formatBytes(item.size_bytes)} · Drive`,
    fullPath: isFolder ? normalizeApiDrivePath(`${parentPath} › ${title}`) : parentPath,
    webViewLink: item.web_view_link ?? buildGoogleDriveWebViewLink(item.external_item_id),
  };
}

export function apiStorageItemToTrash(item: ApiStorageItem): StorageMailItem {
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
    snippet: item.snippet,
    webViewLink: source === 'DRIVE' ? item.web_view_link ?? buildGoogleDriveWebViewLink(item.external_item_id) : undefined,
    title: item.title || item.external_item_id || (source === 'DRIVE' ? 'Drive 파일' : 'Gmail 항목'),
    subtitle: item.title || (source === 'DRIVE' ? 'Drive 파일' : '메일 항목'),
    meta:
      source === 'DRIVE'
        ? `${extension || 'FILE'} · ${formatBytes(item.size_bytes)} · 휴지통 ${date} · 내 Drive`
        : `받은날짜 ${date} · Gmail · ${formatBytes(item.size_bytes)}`,
    badge: item.recoverable === false ? '복구 불가' : undefined,
  };
}
