function formatStorageDataSize(sizeMB: number) {
  if (sizeMB >= 1024 * 1024) {
    return `${Math.round(sizeMB / 1024 / 1024)}TB`;
  }
  if (sizeMB >= 1024) {
    return `${Math.round(sizeMB / 1024)}GB`;
  }
  if (sizeMB < 1) return `${sizeMB.toFixed(1)}MB`;
  return `${Math.round(sizeMB)}MB`;
}

export function extractStorageSizeMB(textValue: string) {
  const match = textValue.match(/(\d+(?:\.\d+)?)\s*(TB|GB|MB)/i);
  if (!match) return 0;
  const value = Number.parseFloat(match[1]) || 0;
  const unit = match[2].toUpperCase();
  if (unit === 'TB') return value * 1024 * 1024;
  if (unit === 'GB') return value * 1024;
  return value;
}

export function getStorageSizeLabel(textValue: string) {
  const sizeMB = extractStorageSizeMB(textValue);
  return sizeMB > 0 ? formatStorageDataSize(sizeMB) : '';
}

export function splitStorageMeta(textValue: string) {
  return textValue.split(/\s*(?:·|쨌|›|>)\s*/).map((part) => part.trim()).filter(Boolean);
}

export function getTrashDriveFolderPath(meta: string) {
  const parts = splitStorageMeta(meta);
  const path = parts.find((part) => part.includes('Drive'));
  if (path) return path;
  const folderOnly = meta.replace(/\s*(?:·|쨌|›|>)\s*(?:폴더|파일)?\s*$/, '').trim();
  return folderOnly || '내 Drive';
}
