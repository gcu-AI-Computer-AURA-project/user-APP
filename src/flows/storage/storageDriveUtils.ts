import type { DriveFolderOption, StorageDriveItem } from './types';

export const driveRootPath = '내 Drive';

export const buildGoogleDriveWebViewLink = (externalItemId?: string | null) => {
  const fileId = externalItemId?.trim();
  if (!fileId) return undefined;
  return `https://drive.google.com/open?id=${encodeURIComponent(fileId)}`;
};

export const splitDrivePath = (path: string) => path.split(/\s*›\s*/).map((part) => part.trim()).filter(Boolean);

export const getDriveParentPath = (path: string) => {
  const parts = splitDrivePath(path);
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join(' › ');
};

export const getDriveAncestorFolders = (path: string) => {
  const parts = splitDrivePath(path);
  if (parts.length <= 1) return [];
  return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join(' › '));
};

export const getDriveFolderName = (path: string) => splitDrivePath(path).at(-1) ?? path;

export const getDirectDriveFolders = (parentPath: string, options: DriveFolderOption[] = []) => {
  const parentParts = splitDrivePath(parentPath);
  return options.filter((folder) => {
    const parts = splitDrivePath(folder.name);
    return parts.length === parentParts.length + 1 && parentParts.every((part, index) => parts[index] === part);
  });
};

export const getVisibleDriveFolders = (currentPath: string, search: string, options: DriveFolderOption[] = []) => {
  const query = search.trim().toLowerCase();
  if (query) {
    return options.filter((folder) => folder.name.toLowerCase().includes(query));
  }

  return getDirectDriveFolders(currentPath, options);
};

export const hasDriveFolderChildren = (path: string, options: DriveFolderOption[] = []) => getDirectDriveFolders(path, options).length > 0;

export const getDriveDescendantFolders = (path: string, options: DriveFolderOption[] = []) =>
  options.filter((folder) => folder.name.startsWith(`${path} ›`));

export const getDriveFolderSelectionGroup = (path: string, options: DriveFolderOption[] = []) => [
  path,
  ...getDriveDescendantFolders(path, options).map((folder) => folder.name),
];

export const getDriveFileSelectionGroup = (_folderPath: string): Array<{ id: string }> => [];

export const getDriveFolderSelected = (path: string, selectedFolders: string[], selectedFiles: string[], options: DriveFolderOption[] = []) => {
  const folderGroup = getDriveFolderSelectionGroup(path, options);
  const hasSelectableChildren = folderGroup.length > 0 || selectedFiles.length > 0;

  return hasSelectableChildren && folderGroup.every((folder) => selectedFolders.includes(folder));
};

export const getStorageDriveItemsForFolder = (folderPath: string): StorageDriveItem[] =>
  getDirectDriveFolders(folderPath).map((folder) => ({
    id: `storage-folder-${folder.name}`,
    type: 'F',
    title: getDriveFolderName(folder.name),
    subtitle: `${folder.name} · 폴더`,
    fullPath: folder.name,
  }));

export const getAllStorageDriveItems = (): StorageDriveItem[] => [];

export const getStorageDriveTrashItemsForFolder = (_folderPath?: string): StorageDriveItem[] => [];

export const getAllStorageDriveTrashItems = (): StorageDriveItem[] => [];
