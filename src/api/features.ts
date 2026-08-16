import { apiRequest } from './client';
import { API_ENDPOINTS } from './config';
import type { ApiRequestOptions } from './types';

export type ApiPage<T> = {
  content?: T[];
  page?: number;
  size?: number;
  total_elements?: number;
  total_pages?: number;
};

export type ApiPermissionStatus =
  | 'CONNECTED'
  | 'DENIED'
  | 'EXPIRED'
  | 'RECONNECT_REQUIRED'
  | 'DISCONNECTED';

export type ApiScanSource = 'MAIL' | 'DRIVE_ALL' | 'DRIVE_FOLDER' | 'MAIL_AND_DRIVE';
export type ApiJobStatus = 'PENDING' | 'SCANNING' | 'ANALYZING' | 'COMPLETED' | 'FAILED' | 'CANCELED' | 'PARTIAL_FAILED';
export type ApiItemSource = 'GMAIL' | 'DRIVE';
export type ApiCandidateCategory =
  | 'PROMOTION_MAIL'
  | 'OLD_MAIL'
  | 'DUPLICATE_FILE'
  | 'OLD_DRIVE_FILE'
  | 'LARGE_FILE'
  | 'LOW_VALUE_ATTACHMENT'
  | 'TEMP_OR_BACKUP'
  | 'PROTECTED';

export type ApiStorageSummary = {
  estimated_reclaim_bytes?: number;
  latest_remaining_drive_bytes?: number | null;
  total_drive_bytes?: number | null;
  total_reclaimed_bytes?: number;
  total_estimated_carbon_grams?: number;
};

export type ApiLatestScan = {
  scan_job_id?: number;
  job_status?: ApiJobStatus;
  scan_source?: ApiScanSource;
  candidate_count?: number;
  protected_count?: number;
  estimated_reclaim_bytes?: number;
  started_at?: string;
  completed_at?: string;
};

export type ApiHomeSummary = {
  storage_summary?: ApiStorageSummary;
  latest_scan?: ApiLatestScan;
  latest_cleanup?: {
    cleanup_job_id?: number;
    cleaned_item_count?: number;
    reclaimed_bytes?: number;
    estimated_carbon_grams?: number;
    completed_at?: string;
  };
  permissions?: {
    gmail_status?: ApiPermissionStatus;
    drive_status?: ApiPermissionStatus;
  };
  has_running_scan?: boolean;
};

export type ApiPermissionResponse = {
  permissions?: Array<{
    service_type?: 'GMAIL' | 'DRIVE';
    permission_status?: ApiPermissionStatus;
    granted_scopes?: string[];
    last_checked_at?: string;
  }>;
  gmail_status?: ApiPermissionStatus;
  drive_status?: ApiPermissionStatus;
  checked_at?: string;
};

export type ApiReconnectUrlRequest = {
  service_types: Array<'GMAIL' | 'DRIVE'>;
  redirect_uri: string;
};

export type ApiReconnectUrlResponse = {
  auth_url?: string;
  authorization_url?: string;
};

export type ApiNotificationSetting = {
  is_scan_complete_enabled?: boolean;
  is_scan_recommend_enabled?: boolean;
  updated_at?: string;
};

export type ApiFcmTokenRequest = {
  fcm_token: string;
  device_identifier?: string;
};

export type ApiScanSetting = {
  setting_id?: number;
  scan_source?: ApiScanSource;
  drive_folder_id?: string;
  include_subfolders?: boolean;
  last_opened_before_months?: number;
  last_modified_before_months?: number;
  created_before_months?: number;
  exclude_recent_days?: number;
  include_keywords?: string[];
  exclude_keywords?: string[];
  file_extensions?: string[];
  include_mail_attachment_size?: boolean;
  apply_recent_conditions?: boolean;
  updated_at?: string;
};

export type ApiScanSettingRequest = Omit<ApiScanSetting, 'setting_id' | 'updated_at'> & {
  scan_source: ApiScanSource;
  include_subfolders: boolean;
  exclude_recent_days: number;
  include_mail_attachment_size: boolean;
  apply_recent_conditions: boolean;
};

export type ApiDriveFolder = {
  folder_id?: string;
  name?: string;
  parent_id?: string;
  modified_time?: string;
};

export type ApiDriveFolderResponse = {
  folders?: ApiDriveFolder[];
  next_page_token?: string;
};

export type ApiScanCreateRequest = {
  use_saved_settings: boolean;
  settings_override?: Partial<ApiScanSettingRequest>;
};

export type ApiScanJob = ApiLatestScan & {
  condition_snapshot?: Record<string, unknown>;
  progress_percent?: number;
  mail_scanned_count?: number;
  drive_scanned_count?: number;
  estimated_remaining_seconds?: number;
  error_message?: string;
  created_at?: string;
};

export type ApiAnalysisSummary = {
  scan_job_id?: number;
  total_candidate_count?: number;
  total_estimated_reclaim_bytes?: number;
  protected_count?: number;
  categories?: Array<{
    category?: ApiCandidateCategory;
    display_name?: string;
    item_count?: number;
    estimated_reclaim_bytes?: number;
    selected_count?: number;
  }>;
};

export type ApiCandidate = {
  candidate_id?: number;
  item_id?: number;
  item_source?: ApiItemSource;
  external_item_id?: string;
  title?: string;
  sender_domain?: string;
  label_text?: string;
  snippet?: string;
  body_text?: string;
  mime_type?: string;
  file_extension?: string;
  size_bytes?: number;
  attachment_size_bytes?: number;
  received_at?: string;
  created_time?: string;
  modified_time?: string;
  last_opened_time?: string;
  folder_path?: string;
  web_view_link?: string;
  has_attachment?: boolean;
  is_starred?: boolean;
  is_important?: boolean;
  is_shared?: boolean;
  owner_email?: string;
  md5_checksum?: string;
  category?: ApiCandidateCategory;
  risk_level?: 'LOW' | 'MEDIUM' | 'HIGH';
  priority_score?: number;
  ghost_score?: number;
  is_protected?: boolean;
  selection_status?: 'NONE' | 'SELECTED' | 'DESELECTED';
  selection_version?: number;
  estimated_reclaim_bytes?: number;
  semantic_tags?: string[];
};

export type ApiCandidateSelectionStatus = 'NONE' | 'SELECTED' | 'DESELECTED';

export type ApiCandidateSelectionRequest = {
  selection_status: ApiCandidateSelectionStatus;
  selection_version: number;
};

export type ApiBulkCandidateSelectionRequest = {
  category?: ApiCandidateCategory;
  item_source?: ApiItemSource;
  candidate_ids?: number[];
  selection_status: ApiCandidateSelectionStatus;
  exclude_protected: boolean;
};

export type ApiCandidateSelectionResponse = {
  candidate_id?: number;
  selection_status?: ApiCandidateSelectionStatus;
  selection_version?: number;
  updated_at?: string;
};

export type ApiCandidateBulkSelectionResponse = {
  updated_count?: number;
  selected_count?: number;
  selected_estimated_reclaim_bytes?: number;
};

export type ApiCandidateDetail = {
  candidate_id?: number;
  scan_job_id?: number;
  item?: ApiCandidate;
  analysis?: {
    category?: ApiCandidateCategory;
    risk_level?: 'LOW' | 'MEDIUM' | 'HIGH';
    priority_score?: number;
    ghost_score?: number;
    is_protected?: boolean;
    estimated_reclaim_bytes?: number;
    ai_provider?: string;
    ai_model_name?: string;
    ai_confidence_score?: number;
    semantic_tags?: string[];
    matched_conditions?: Record<string, unknown>;
    analyzed_at?: string;
  };
  selection_status?: ApiCandidateSelectionStatus;
  selection_version?: number;
};

export type ApiSelectedCandidates = {
  scan_job_id?: number;
  selected_summary?: {
    mail_count?: number;
    drive_count?: number;
    total_count?: number;
    mail_estimated_reclaim_bytes?: number;
    drive_estimated_reclaim_bytes?: number;
    total_estimated_reclaim_bytes?: number;
  };
  protected_summary?: {
    protected_count?: number;
    protected_conditions?: string[];
  };
  items?: ApiCandidate[];
};

export type ApiStorageItem = {
  item_id?: number;
  item_source?: ApiItemSource;
  external_item_id?: string;
  title?: string;
  size_bytes?: number;
  mime_type?: string;
  file_extension?: string;
  sender_email?: string;
  owner_email?: string;
  folder_path?: string;
  parent_folder_id?: string;
  web_view_link?: string;
  snippet?: string;
  body_text?: string;
  created_time?: string;
  modified_time?: string;
  last_opened_time?: string;
  is_folder?: boolean;
  item_type?: 'FILE' | 'FOLDER' | string;
  is_shared?: boolean;
  is_trashed?: boolean;
  trashed_at?: string;
  recoverable?: boolean;
  metadata?: Record<string, unknown>;
};

export type ApiStorageDetail = ApiStorageItem & {
  sender_email?: string;
  owner_email?: string;
  folder_path?: string;
  web_view_link?: string;
  snippet?: string;
  metadata?: Record<string, unknown>;
};

export type ApiScanHistoryItem = {
  scan_job_id?: number;
  job_status?: ApiJobStatus;
  scan_source?: ApiScanSource;
  candidate_count?: number;
  estimated_reclaim_bytes?: number;
  cleanup_done?: boolean;
  reclaimed_bytes?: number;
  estimated_carbon_grams?: number;
  created_at?: string;
};

export type ApiStatisticsSummary = {
  total_scan_count?: number;
  total_cleanup_count?: number;
  total_trashed_item_count?: number;
  total_permanently_deleted_item_count?: number;
  total_reclaimed_bytes?: number;
  total_estimated_carbon_grams?: number;
  latest_cleanup_at?: string;
};

export type ApiMonthlyStatistic = {
  stat_year_month?: string;
  scan_count?: number;
  cleanup_count?: number;
  trashed_item_count?: number;
  permanently_deleted_item_count?: number;
  reclaimed_bytes?: number;
  estimated_carbon_grams?: number;
};

export type ApiCleanupHistoryItem = {
  history_id?: number;
  cleanup_job_id?: number;
  scan_job_id?: number | null;
  action_type?: string;
  cleaned_item_count?: number;
  reclaimed_bytes?: number;
  estimated_carbon_grams?: number;
  completed_at?: string;
};

export type ApiCleanupJobCreateRequest = {
  scan_job_id: number;
  action_type: 'MOVE_TO_TRASH' | 'RESTORE_FROM_TRASH' | 'PERMANENT_DELETE' | 'EMPTY_TRASH';
  candidates: Array<{ candidate_id: number; selection_version: number }>;
  approval_confirmed: boolean;
};

export type ApiCleanupJob = {
  cleanup_job_id?: number;
  scan_job_id?: number | null;
  job_status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIAL_FAILED' | 'CANCELED';
  progress_percent?: number;
  action_type?: string;
  selected_mail_count?: number;
  selected_drive_count?: number;
  total_selected_bytes?: number;
  success_item_count?: number;
  failed_item_count?: number;
  error_message?: string;
  approved_at?: string;
  cleaned_item_count?: number;
  reclaimed_bytes?: number;
  remaining_drive_bytes?: number;
  estimated_carbon_grams?: number;
  completed_at?: string;
};

export type ApiCleanupJobItem = {
  cleanup_item_id?: number;
  item_source?: ApiItemSource;
  external_item_id?: string;
  snapshot_item_key?: string;
  snapshot_title?: string;
  snapshot_size_bytes?: number;
  process_status?: 'PENDING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
  failure_reason?: string;
  processed_at?: string;
};

export type ApiCleanupJobItemList = {
  items?: ApiCleanupJobItem[];
};

export type ApiStorageActionItem = {
  item_source: ApiItemSource;
  external_item_id: string;
  item_id?: number;
  snapshot_title?: string;
  snapshot_size_bytes?: number;
};

export type ApiAnnouncement = {
  announcement_id?: string | number;
  title?: string;
  category?: 'POLICY' | 'SERVICE' | 'FEATURE' | string;
  content?: string;
  summary?: string;
  published_at?: string;
  read_at?: string;
  is_pinned?: boolean;
  is_read?: boolean;
};

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
};

const unwrap = <T>(response: ApiEnvelope<T>) => response.data as T;

export const homeApi = {
  async getSummary(options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiHomeSummary>>(API_ENDPOINTS.home.summary, {
        method: 'GET',
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
};

export const googleApi = {
  async getPermissions(options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiPermissionResponse>>(API_ENDPOINTS.google.permissions, {
        method: 'GET',
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async recheckPermissions(options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiPermissionResponse>>(API_ENDPOINTS.google.recheck, {
        method: 'POST',
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async createReconnectUrl(payload: ApiReconnectUrlRequest, options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiReconnectUrlResponse>>(API_ENDPOINTS.google.reconnectUrl, {
        method: 'POST',
        body: payload,
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async disconnect(options?: ApiRequestOptions) {
    return apiRequest<unknown>(API_ENDPOINTS.google.disconnect, {
      method: 'DELETE',
      accessToken: options?.accessToken,
      signal: options?.signal,
    });
  },
};

export const candidateApi = {
  async getDetail(candidateId: string | number, options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiCandidateDetail>>(API_ENDPOINTS.candidates.detail(candidateId), {
        method: 'GET',
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async updateSelection(candidateId: string | number, payload: ApiCandidateSelectionRequest, options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiCandidateSelectionResponse>>(API_ENDPOINTS.candidates.selection(candidateId), {
        method: 'PATCH',
        body: payload,
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
};

export const notificationApi = {
  async getSettings(options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiNotificationSetting>>(API_ENDPOINTS.notifications.settings, {
        method: 'GET',
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async saveSettings(payload: Required<Pick<ApiNotificationSetting, 'is_scan_complete_enabled' | 'is_scan_recommend_enabled'>>, options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiNotificationSetting>>(API_ENDPOINTS.notifications.settings, {
        method: 'PUT',
        body: payload,
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async registerFcmToken(payload: ApiFcmTokenRequest, options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<{ fcm_token_id?: number; is_active?: boolean; updated_at?: string }>>(API_ENDPOINTS.notifications.fcmToken, {
        method: 'POST',
        body: payload,
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
};

export const scanApi = {
  async getSettings(options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiScanSetting>>(API_ENDPOINTS.scan.settings, {
        method: 'GET',
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async saveSettings(payload: ApiScanSettingRequest, options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiScanSetting>>(API_ENDPOINTS.scan.settings, {
        method: 'PUT',
        body: payload,
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async getDriveFolders(query?: { parent_id?: string; page_token?: string; size?: number }, options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiDriveFolderResponse>>(API_ENDPOINTS.scan.driveFolders, {
        method: 'GET',
        query,
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async create(payload: ApiScanCreateRequest, options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiScanJob>>(API_ENDPOINTS.scan.create, {
        method: 'POST',
        body: payload,
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async getRunning(options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<{ scan_job?: ApiScanJob }>>(API_ENDPOINTS.scan.running, {
        method: 'GET',
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async getHistory(query?: { page?: number; size?: number; status?: string }, options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiPage<ApiScanHistoryItem>>>(API_ENDPOINTS.scan.history, {
        method: 'GET',
        query,
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async getDetail(scanJobId: string | number, options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiScanJob>>(API_ENDPOINTS.scan.detail(scanJobId), {
        method: 'GET',
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async cancel(scanJobId: string | number, options?: ApiRequestOptions) {
    return apiRequest<unknown>(API_ENDPOINTS.scan.cancel(scanJobId), {
      method: 'POST',
      accessToken: options?.accessToken,
      signal: options?.signal,
    });
  },
  async getAnalysisSummary(scanJobId: string | number, options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiAnalysisSummary>>(API_ENDPOINTS.scan.analysisSummary(scanJobId), {
        method: 'GET',
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async getCandidates(
    scanJobId: string | number,
    query?: {
      category?: ApiCandidateCategory;
      item_source?: ApiItemSource;
      selection_status?: 'NONE' | 'SELECTED' | 'DESELECTED';
      include_protected?: boolean;
      page?: number;
      size?: number;
      sort?: string;
    },
    options?: ApiRequestOptions
  ) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiPage<ApiCandidate>>>(API_ENDPOINTS.scan.candidates(scanJobId), {
        method: 'GET',
        query,
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async getSelectedCandidates(scanJobId: string | number, options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiSelectedCandidates>>(API_ENDPOINTS.scan.selectedCandidates(scanJobId), {
        method: 'GET',
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async updateCandidateSelections(scanJobId: string | number, payload: ApiBulkCandidateSelectionRequest, options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiCandidateBulkSelectionResponse>>(API_ENDPOINTS.scan.bulkSelection(scanJobId), {
        method: 'PATCH',
        body: payload,
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
};

export const cleanupApi = {
  async create(payload: ApiCleanupJobCreateRequest, options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiCleanupJob>>(API_ENDPOINTS.cleanup.create, {
        method: 'POST',
        body: payload,
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async start(cleanupJobId: string | number, options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiCleanupJob>>(API_ENDPOINTS.cleanup.start(cleanupJobId), {
        method: 'POST',
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async getRunning(options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<{ cleanup_job?: ApiCleanupJob | null }>>(API_ENDPOINTS.cleanup.running, {
        method: 'GET',
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async getDetail(cleanupJobId: string | number, options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiCleanupJob>>(API_ENDPOINTS.cleanup.detail(cleanupJobId), {
        method: 'GET',
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async cancel(cleanupJobId: string | number, options?: ApiRequestOptions) {
    return apiRequest<unknown>(API_ENDPOINTS.cleanup.cancel(cleanupJobId), {
      method: 'POST',
      accessToken: options?.accessToken,
      signal: options?.signal,
    });
  },
  async getResult(cleanupJobId: string | number, options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiCleanupJob>>(API_ENDPOINTS.cleanup.result(cleanupJobId), {
        method: 'GET',
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async getItems(cleanupJobId: string | number, options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiCleanupJobItemList>>(API_ENDPOINTS.cleanup.items(cleanupJobId), {
        method: 'GET',
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async retryFailed(cleanupJobId: string | number, options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiCleanupJob>>(API_ENDPOINTS.cleanup.retryFailed(cleanupJobId), {
        method: 'POST',
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
};

export const storageApi = {
  async getItems(
    query: { item_source: ApiItemSource; trashed?: boolean; sort?: string; page?: number; size?: number; parent_id?: string },
    options?: ApiRequestOptions
  ) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiPage<ApiStorageItem>>>(API_ENDPOINTS.storage.items, {
        method: 'GET',
        query,
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async getTrash(query?: { item_source?: ApiItemSource; page?: number; size?: number }, options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiPage<ApiStorageItem>>>(API_ENDPOINTS.storage.trash, {
        method: 'GET',
        query,
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async getItemDetail(itemId: string | number, options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiStorageDetail>>(API_ENDPOINTS.storage.itemDetail(itemId), {
        method: 'GET',
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async getLiveDetail(query: { item_source: ApiItemSource; external_item_id: string }, options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiStorageDetail>>(API_ENDPOINTS.storage.liveDetail, {
        method: 'GET',
        query,
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async restore(items: ApiStorageActionItem[], options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiCleanupJob>>(API_ENDPOINTS.storage.restore, {
        method: 'POST',
        body: { items, approval_confirmed: true },
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async moveToTrash(items: ApiStorageActionItem[], options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiCleanupJob>>(API_ENDPOINTS.storage.moveToTrash, {
        method: 'POST',
        body: { items, approval_confirmed: true },
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async permanentDelete(items: ApiStorageActionItem[], options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiCleanupJob>>(API_ENDPOINTS.storage.permanentDelete, {
        method: 'POST',
        body: { items, approval_confirmed: true, confirmation_text: '영구삭제' },
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
};

export const announcementApi = {
  async getList(query?: { category?: 'POLICY' | 'SERVICE' | 'FEATURE'; page?: number; size?: number }, options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiPage<ApiAnnouncement>>>(API_ENDPOINTS.announcements.list, {
        method: 'GET',
        query,
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async getDetail(announcementId: string | number, options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiAnnouncement>>(API_ENDPOINTS.announcements.detail(announcementId), {
        method: 'GET',
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async markRead(announcementId: string | number, options?: ApiRequestOptions) {
    return apiRequest<unknown>(API_ENDPOINTS.announcements.read(announcementId), {
      method: 'POST',
      accessToken: options?.accessToken,
      signal: options?.signal,
    });
  },
};

export const statisticsApi = {
  async getSummary(options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiStatisticsSummary>>(API_ENDPOINTS.statistics.summary, {
        method: 'GET',
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async getMonthly(query?: { from?: string; to?: string }, options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<{ months?: ApiMonthlyStatistic[] }>>(API_ENDPOINTS.statistics.monthly, {
        method: 'GET',
        query,
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async getCleanupHistories(query?: { page?: number; size?: number }, options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<ApiPage<ApiCleanupHistoryItem>>>(API_ENDPOINTS.statistics.cleanupHistories, {
        method: 'GET',
        query,
        accessToken: options?.accessToken,
        signal: options?.signal,
      })
    );
  },
  async getCarbonFormula(options?: ApiRequestOptions) {
    return unwrap(
      await apiRequest<ApiEnvelope<{ formula_version?: string; description?: string; unit?: string; last_updated_at?: string }>>(
        API_ENDPOINTS.statistics.carbonFormula,
        {
          method: 'GET',
          accessToken: options?.accessToken,
          signal: options?.signal,
        }
      )
    );
  },
};
