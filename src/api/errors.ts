import { isAxiosError, isCancel } from 'axios';

import type { ApiErrorBody } from './contracts';

export type ApiFailureKind = 'timeout' | 'network' | 'client' | 'server' | 'canceled' | 'unknown';

export interface ApiFailure {
  kind: ApiFailureKind;
  status: number | null;
  message: string;
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof value.message === 'string'
  );
}

/** Turns any thrown value into a small, typed description the UI can show. */
export function describeApiError(error: unknown): ApiFailure {
  if (isCancel(error)) return { kind: 'canceled', status: null, message: 'Request canceled.' };
  if (!isAxiosError(error)) {
    return { kind: 'unknown', status: null, message: 'Something went wrong.' };
  }
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return { kind: 'timeout', status: null, message: 'The server took too long to answer.' };
  }
  const status = error.response?.status ?? null;
  if (status === null) {
    return { kind: 'network', status: null, message: 'Could not reach the server.' };
  }
  const body: unknown = error.response?.data;
  const detail = isErrorBody(body) ? body.message : `HTTP ${status}`;
  return status >= 500
    ? { kind: 'server', status, message: `Server error: ${detail}` }
    : { kind: 'client', status, message: `Request rejected: ${detail}` };
}

/**
 * Only temporary problems are worth retrying automatically: timeouts, connection failures
 * and 5xx. A 4xx means the request itself is wrong; sending it again gives the same answer.
 */
export function isRetryable(error: unknown): boolean {
  const { kind } = describeApiError(error);
  return kind === 'timeout' || kind === 'network' || kind === 'server';
}

/** Exponential backoff for automatic retries: 0.5 s, 1 s, 2 s... capped at 4 s. */
export function retryDelayMs(attempt: number): number {
  return Math.min(500 * 2 ** attempt, 4000);
}
