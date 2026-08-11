import { apiRequest } from './client';
import { API_ENDPOINTS } from './config';
import type { ApiRequestOptions, AuthSession, GoogleLoginRequest } from './types';

export const authApi = {
  loginWithGoogle(payload: GoogleLoginRequest) {
    return apiRequest<AuthSession>(API_ENDPOINTS.auth.googleLogin, {
      method: 'POST',
      body: payload,
    });
  },

  getStatus(options?: ApiRequestOptions) {
    return apiRequest<AuthSession>(API_ENDPOINTS.auth.status, {
      method: 'GET',
      accessToken: options?.accessToken,
      signal: options?.signal,
    });
  },

  refresh(refreshToken: string) {
    return apiRequest<AuthSession>(API_ENDPOINTS.auth.refresh, {
      method: 'POST',
      body: { refreshToken },
    });
  },

  logout(options?: ApiRequestOptions) {
    return apiRequest<void>(API_ENDPOINTS.auth.logout, {
      method: 'POST',
      accessToken: options?.accessToken,
      signal: options?.signal,
    });
  },
};

