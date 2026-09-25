import { env } from '../config/env';
import type { ApiErrorPayload } from '../types/api';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(cb: () => void): void {
  onUnauthorized = cb;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;
  const response = await fetch(`${env.apiUrl}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    ...rest,
  });

  if (!response.ok) {
    if (response.status === 401 && !path.includes('/auth/login') && !path.includes('/auth/register')) {
      onUnauthorized?.();
    }
    let message = `Error ${response.status}`;
    let code: string | undefined;
    let retryAfter: number | undefined;
    try {
      const payload = (await response.json()) as Partial<ApiErrorPayload>;
      if (payload.error) message = payload.error;
      code = payload.code;
      retryAfter = payload.retryAfter;
    } catch {
      // sin cuerpo JSON: usar mensaje por defecto
    }
    if (retryAfter === undefined) {
      const headerVal = response.headers.get('Retry-After');
      if (headerVal) retryAfter = parseInt(headerVal, 10);
    }
    throw new ApiError(response.status, message, code, retryAfter);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', body }),
};