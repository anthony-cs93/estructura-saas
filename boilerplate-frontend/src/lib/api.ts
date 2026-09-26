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

/**
 * Sin esto, una request que se cuelga (un proxy lento, un backend en cold start
 * que no responde) deja la UI esperando indefinidamente: el spinner no termina
 * nunca. Ajustá según lo que tarde tu backend en despertar.
 */
const REQUEST_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS ?? 15000);

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, signal: callerSignal, ...rest } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onCallerAbort = (): void => controller.abort();
  callerSignal?.addEventListener('abort', onCallerAbort);

  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}${path}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      ...rest,
    });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new ApiError(0, 'La solicitud tardó demasiado. Revisá tu conexión e intentá de nuevo.');
    }
    // Un origen caído o CORS mal configurado no produce respuesta: el error real
    // ("fetch failed") no le sirve a nadie, y su `message` varía por navegador.
    throw new ApiError(0, 'No se pudo conectar con el servidor.');
  } finally {
    clearTimeout(timeout);
    callerSignal?.removeEventListener('abort', onCallerAbort);
  }

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
      // Sin cuerpo JSON. Un 502/504 de un proxy devuelve HTML, y mostrarlo crudo
      // al usuario es peor que un mensaje genérico.
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