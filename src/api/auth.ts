import { apiRequest } from './client';
import { API_ENDPOINTS } from './config';
import type {
  ApiRequestOptions,
  ApiResponse,
  AuthSession,
  GoogleLoginRequest,
  SwaggerGoogleLoginResponse,
  SwaggerTokenRefreshResponse,
} from './types';
import { normalizeAuthSession, normalizeRefreshedSession } from './types';

export const authApi = {
  async loginWithGoogle(payload: GoogleLoginRequest): Promise<AuthSession> {
    const response = await apiRequest<ApiResponse<SwaggerGoogleLoginResponse>>(
      API_ENDPOINTS.auth.googleLogin,
      {
        method: 'POST',
        body: payload,
      }
    );

    return normalizeAuthSession(response.data);
  },

  async refresh(refreshToken: string): Promise<AuthSession> {
    const response = await apiRequest<ApiResponse<SwaggerTokenRefreshResponse>>(
      API_ENDPOINTS.auth.refresh,
      {
        method: 'POST',
        body: { refresh_token: refreshToken },
      }
    );

    return normalizeRefreshedSession(response.data);
  },

  logout(options?: ApiRequestOptions) {
    return apiRequest<void>(API_ENDPOINTS.auth.logout, {
      method: 'POST',
      accessToken: options?.accessToken,
      signal: options?.signal,
    });
  },
};
