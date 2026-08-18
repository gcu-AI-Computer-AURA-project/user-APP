import type { StorageServerPageState } from './types';

export const storageServerPageCache: Record<string, StorageServerPageState> = {};

export const clearStorageServerPageCache = () => {
  Object.keys(storageServerPageCache).forEach((key) => delete storageServerPageCache[key]);
};
