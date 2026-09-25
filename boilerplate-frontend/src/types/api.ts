export interface ApiErrorPayload {
  error: string;
  code?: string;
  retryAfter?: number;
}