const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function formatDataSize(sizeMB: number) {
  if (sizeMB >= 1024 * 1024) {
    return `${Math.round(sizeMB / 1024 / 1024)}TB`;
  }
  if (sizeMB >= 1024) {
    return `${Math.round(sizeMB / 1024)}GB`;
  }
  if (sizeMB < 1) return `${sizeMB.toFixed(1)}MB`;
  return `${Math.round(sizeMB)}MB`;
}

export function bytesToMB(bytes?: number | null) {
  return Math.max(0, Number(bytes ?? 0) / 1024 / 1024);
}

export function formatBytes(bytes?: number | null) {
  return formatDataSize(bytesToMB(bytes));
}

export function formatScanDateOnly(dateLabel: string) {
  return dateLabel.split(/\s+/)[0] || dateLabel;
}

export function formatApiDate(value?: string | null) {
  const pad = (target: number) => `${target}`.padStart(2, '0');
  const toKstLabel = (date: Date) => {
    const kstDate = new Date(date.getTime() + KST_OFFSET_MS);
    return `${kstDate.getUTCFullYear()}.${pad(kstDate.getUTCMonth() + 1)}.${pad(kstDate.getUTCDate())} ${pad(kstDate.getUTCHours())}:${pad(kstDate.getUTCMinutes())}`;
  };
  const parseApiDate = (dateValue: string) => {
    const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(dateValue);
    return new Date(hasTimezone ? dateValue : `${dateValue}Z`);
  };

  if (!value) return toKstLabel(new Date());
  const date = parseApiDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return toKstLabel(date);
}

export function formatApiDateOnly(value?: string | null) {
  return formatScanDateOnly(formatApiDate(value));
}
