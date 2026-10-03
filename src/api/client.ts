import axios, { type AxiosInstance } from 'axios';

import type {
  HistoryQuery,
  MatchRecord,
  Page,
  RankingEntry,
  RankingQuery,
  RegisterMatchResponse,
} from './contracts';

/** Requests slower than this fail with a timeout (configurable with VITE_API_TIMEOUT_MS). */
export const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 4000);

export function createHttpClient(baseURL: string, timeoutMs: number): AxiosInstance {
  return axios.create({
    baseURL,
    timeout: timeoutMs,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Adds the AbortSignal to the request options only when there is one. */
function abortable(signal: AbortSignal | undefined): { signal?: AbortSignal } {
  return signal ? { signal } : {};
}

/**
 * Typed functions for the three REST endpoints. Every GET accepts an AbortSignal, which
 * TanStack Query uses to cancel requests that are no longer needed.
 */
export function createApi(http: AxiosInstance) {
  return {
    async fetchRanking(query: RankingQuery, signal?: AbortSignal): Promise<Page<RankingEntry>> {
      const response = await http.get<Page<RankingEntry>>('/ranking', {
        params: query,
        ...abortable(signal),
      });
      return response.data;
    },

    async fetchHistory(query: HistoryQuery, signal?: AbortSignal): Promise<Page<MatchRecord>> {
      const { playerId, ...params } = query;
      const response = await http.get<Page<MatchRecord>>(
        `/players/${encodeURIComponent(playerId)}/matches`,
        { params, ...abortable(signal) },
      );
      return response.data;
    },

    /** Idempotent: sending the same matchId again returns the stored record (R82). */
    async registerMatch(record: MatchRecord, signal?: AbortSignal): Promise<RegisterMatchResponse> {
      const response = await http.put<RegisterMatchResponse>(
        `/matches/${encodeURIComponent(record.matchId)}`,
        record,
        abortable(signal),
      );
      return response.data;
    },
  };
}

export type Api = ReturnType<typeof createApi>;

/** The app's API, talking to /api on the same origin (served by MSW). */
export const api = createApi(createHttpClient(`${import.meta.env.BASE_URL}api`, API_TIMEOUT_MS));
