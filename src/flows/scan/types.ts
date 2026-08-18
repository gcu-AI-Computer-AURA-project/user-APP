import type { ApiCandidateCategory, ApiCandidateSelectionStatus } from '../../api/features';
import type { StorageDriveItem, StorageMailItem } from '../storage';

export type ScanListItem = {
  id: string;
  candidateId?: number;
  selectionVersion?: number;
  selectionStatus?: ApiCandidateSelectionStatus;
  title: string;
  desc?: string;
  sizeMB: number;
  dateLabel: string;
  sortText: string;
  source: 'mail' | 'drive';
  previewLabel?: string;
  bodyPreview?: string;
  webViewLink?: string;
  detailTitle?: string;
  detailSubtitle?: string;
};

export type ScanSummary = {
  mailItems: ScanListItem[];
  driveItems: ScanListItem[];
  largeItems: ScanListItem[];
  protectedItems: ScanListItem[];
  categorySummaries: Array<{
    category?: ApiCandidateCategory;
    itemCount: number;
    estimatedBytes: number;
    selectedCount?: number;
  }>;
  storageMailItems: StorageMailItem[];
  storageDriveItems: StorageDriveItem[];
  storageTrashItems: StorageMailItem[];
  mailSizeLabel: string;
  driveSizeLabel: string;
  largeSizeLabel: string;
  totalSizeLabel: string;
  carbonLabel: string;
  candidateCount: number;
  folderLabel: string;
};

export type ScanRecord = {
  dateLabel: string;
  sourceLabel: string;
  conditionLabel: string;
  result: ScanSummary;
};
