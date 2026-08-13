import { apiRequest } from './client';
import { API_ENDPOINTS } from './config';
import type {
  ApiRequestOptions,
  ApiResponse,
  AuraUser,
  SwaggerUserConsent,
  SwaggerUserResponse,
  UserConsent,
  UserConsentRequest,
  UserConsentSaveResponse,
} from './types';
import { normalizeConsent, normalizeUser } from './types';

export type ApiPrivacyData = {
  consents?: {
    is_privacy_agreed?: boolean;
    is_ai_analysis_agreed?: boolean;
    is_metadata_only_agreed?: boolean;
    is_user_approval_required_agreed?: boolean;
    consent_version?: string;
    consented_at?: string;
  };
  data_retention?: {
    scan_data_policy?: string;
    history_data_policy?: string;
  };
  managed_data_summary?: {
    scan_job_count?: number;
    scanned_item_count?: number;
    cleanup_history_count?: number;
  };
};

export type UserWithdrawalRequest = {
  reason?: string;
  scan_data_policy: 'DELETE' | 'ANONYMIZE' | 'KEEP';
  history_data_policy: 'DELETE' | 'ANONYMIZE' | 'KEEP';
  withdrawal_confirmed: boolean;
};

export type UserWithdrawalResponse = {
  withdrawal_id?: number;
  processed_status?: 'PENDING' | 'COMPLETED' | 'FAILED';
  google_disconnected?: boolean;
  token_deleted?: boolean;
  withdrawn_at?: string;
  processed_at?: string;
};

export const userApi = {
  async getMe(options?: ApiRequestOptions): Promise<AuraUser> {
    const response = await apiRequest<ApiResponse<SwaggerUserResponse>>(API_ENDPOINTS.user.me, {
      method: 'GET',
      accessToken: options?.accessToken,
      signal: options?.signal,
    });

    return normalizeUser(response.data) ?? {};
  },

  async getConsent(options?: ApiRequestOptions): Promise<UserConsent | undefined> {
    const response = await apiRequest<ApiResponse<SwaggerUserConsent>>(API_ENDPOINTS.user.consent, {
      method: 'GET',
      accessToken: options?.accessToken,
      signal: options?.signal,
    });

    return normalizeConsent(response.data);
  },

  async saveConsent(
    payload: UserConsentRequest,
    options?: ApiRequestOptions
  ): Promise<UserConsentSaveResponse | undefined> {
    const response = await apiRequest<ApiResponse<UserConsentSaveResponse>>(API_ENDPOINTS.user.consent, {
      method: 'PUT',
      body: payload,
      accessToken: options?.accessToken,
      signal: options?.signal,
    });

    return response.data;
  },

  async getPrivacyData(options?: ApiRequestOptions): Promise<ApiPrivacyData | undefined> {
    const response = await apiRequest<ApiResponse<ApiPrivacyData>>(API_ENDPOINTS.user.privacyData, {
      method: 'GET',
      accessToken: options?.accessToken,
      signal: options?.signal,
    });

    return response.data;
  },

  async withdraw(payload: UserWithdrawalRequest, options?: ApiRequestOptions): Promise<UserWithdrawalResponse | undefined> {
    const response = await apiRequest<ApiResponse<UserWithdrawalResponse>>(API_ENDPOINTS.user.withdrawal, {
      method: 'POST',
      body: payload,
      accessToken: options?.accessToken,
      signal: options?.signal,
    });

    return response.data;
  },
};
