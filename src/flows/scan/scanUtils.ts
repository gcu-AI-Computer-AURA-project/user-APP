import type { ScanListItem } from './types';

export function formatMonthDuration(months: number) {
  const years = Math.floor(months / 12);
  const restMonths = months % 12;
  if (years <= 0) return `${restMonths}개월`;
  if (restMonths <= 0) return `${years}년`;
  return `${years}년 ${restMonths}개월`;
}

export function sizeLabelToMB(label: string) {
  const value = Number.parseFloat(label.replace(/[^0-9.]/g, '')) || 0;
  const unit = label.toUpperCase();
  if (unit.includes('TB')) return value * 1024 * 1024;
  if (unit.includes('GB')) return value * 1024;
  return value;
}

export function formatFolderMeta(meta: string) {
  const match = meta.match(/(\d+(?:\.\d+)?\s*(?:GB|MB))/i);
  return match?.[1] ?? meta;
}

export function carbonLabelToGram(label: string) {
  return Number.parseFloat(label.replace(/[^0-9.]/g, '')) || 0;
}

export function parseDateValue(label: string) {
  const [year, month, day] = label.split('.').map((part) => Number.parseInt(part, 10));
  return new Date(year || 2000, (month || 1) - 1, day || 1).getTime();
}

export function isOlderThanYears(label: string, years: number) {
  const target = new Date();
  target.setFullYear(target.getFullYear() - years);
  return parseDateValue(label) <= target.getTime();
}

export function applyResultFilterSort(items: ScanListItem[], filterDate: string, filterSize: string, sortMode: string) {
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

export function sumScanItemSize(items: ScanListItem[]) {
  return items.reduce((sum, item) => sum + item.sizeMB, 0);
}

export function getDriveFolderMatch(filePath: string, selectedFolders: string[], includeSubFolders: boolean) {
  if (!selectedFolders.length) return true;
  return selectedFolders.some((folder) => filePath === folder || (includeSubFolders && filePath.startsWith(`${folder} ›`)));
}
