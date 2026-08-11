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

  getPrivacyData(options?: ApiRequestOptions) {
    return apiRequest<unknown>(API_ENDPOINTS.user.privacyData, {
      method: 'GET',
      accessToken: options?.accessToken,
      signal: options?.signal,
    });
  },

  withdraw(options?: ApiRequestOptions) {
    return apiRequest<unknown>(API_ENDPOINTS.user.withdrawal, {
      method: 'POST',
      accessToken: options?.accessToken,
      signal: options?.signal,
    });
  },
};
