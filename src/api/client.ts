import { API_BASE_URL } from './config';
import type { ApiRequestOptions } from './types';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

type RequestConfig = ApiRequestOptions & {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
};

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const buildHeaders = (accessToken?: string | null) => {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
};

const parseResponse = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

export async function apiRequest<T>(path: string, config: RequestConfig = {}): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`);

  Object.entries(config.query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    method: config.method ?? 'GET',
    headers: buildHeaders(config.accessToken),
    body: config.body === undefined ? undefined : JSON.stringify(config.body),
    signal: config.signal,
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    const message =
      typeof data === 'object' && data && 'message' in data
        ? String((data as { message?: unknown }).message)
        : `API request failed: ${response.status}`;

    throw new ApiError(message, response.status, data);
  }

  return data as T;
}
