import { apiRequest } from './client';
import { API_ENDPOINTS } from './config';
import type {
  ApiRequestOptions,
  AuraUser,
  ConsentRequest,
  PermissionUpdateRequest,
} from './types';

export const userApi = {
  getMe(options?: ApiRequestOptions) {
    return apiRequest<AuraUser>(API_ENDPOINTS.user.me, {
      method: 'GET',
      accessToken: options?.accessToken,
      signal: options?.signal,
    });
  },

  updateConsent(payload: ConsentRequest, options?: ApiRequestOptions) {
    return apiRequest<AuraUser>(API_ENDPOINTS.user.consent, {
      method: 'PATCH',
      body: payload,
      accessToken: options?.accessToken,
      signal: options?.signal,
    });
  },

  updatePermissions(payload: PermissionUpdateRequest, options?: ApiRequestOptions) {
    return apiRequest<AuraUser>(API_ENDPOINTS.user.permissions, {
      method: 'PATCH',
      body: payload,
      accessToken: options?.accessToken,
      signal: options?.signal,
    });
  },
};

