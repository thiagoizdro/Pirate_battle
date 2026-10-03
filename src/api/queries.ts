import { keepPreviousData, QueryClient, useQuery } from '@tanstack/react-query';

import { api } from './client';
import { API_PAGE_SIZE } from './contracts';
import { isRetryable, retryDelayMs } from './errors';

/**
 * Query keys include everything that changes the answer (config, player, page). Each page has
 * its own cache entry, so a late answer for page 1 can only ever land in page 1's entry and can
 * never overwrite the page 2 the player is looking at now (R80).
 */
export const queryKeys = {
  ranking: (configKey: string, page: number) => ['ranking', configKey, page] as const,
  allRanking: ['ranking'] as const,
  history: (playerId: string, page: number) => ['history', playerId, page] as const,
  allHistory: ['history'] as const,
};

/** Retry temporary failures up to 2 extra times; never retry a 4xx (R78). */
const MAX_RETRIES = 2;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => failureCount < MAX_RETRIES && isRetryable(error),
        retryDelay: retryDelayMs,
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: (failureCount, error) => failureCount < MAX_RETRIES && isRetryable(error),
        retryDelay: retryDelayMs,
      },
    },
  });
}

/**
 * One page of the ranking for a config. `placeholderData: keepPreviousData` keeps the previous
 * page on screen while the next one loads; `refetchOnMount: 'always'` refreshes the tab every
 * time it is shown again (R79). The AbortSignal cancels requests that are no longer needed.
 */
export function useRankingPage(configKey: string, page: number) {
  return useQuery({
    queryKey: queryKeys.ranking(configKey, page),
    queryFn: ({ signal }) => api.fetchRanking({ configKey, page, pageSize: API_PAGE_SIZE }, signal),
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
  });
}

export function useHistoryPage(playerId: string, page: number) {
  return useQuery({
    queryKey: queryKeys.history(playerId, page),
    queryFn: ({ signal }) => api.fetchHistory({ playerId, page, pageSize: API_PAGE_SIZE }, signal),
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
  });
}
