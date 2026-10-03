import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, type ReactNode } from 'react';

import { api } from './client';
import type { MatchRecord } from './contracts';
import { describeApiError } from './errors';
import { pendingQueue } from './pendingQueue';
import { queryKeys } from './queries';
import { RegistrationContext, SCENARIO_CHANGE_EVENT } from './registrationContext';

/** Failed records are retried in the background at this interval while any remain. */
const BACKGROUND_RETRY_MS = 15_000;

/** Internal: a send finished while another one was requested (e.g. the scenario recovered). */
const RESEND_EVENT = 'pirate-battle:registration-resend';

/**
 * Registers completed matches through a TanStack Query mutation and keeps the pending queue in
 * sync. Guarantees:
 * - one request per match at a time (tryStartSending), so double clicks never duplicate;
 * - the server upsert is idempotent, so a resend after a timeout returns the existing record;
 * - on success both tabs are invalidated, so Ranking and History show the new match (R79);
 * - queued records are retried on start, when the browser goes online, when the mock scenario
 *   changes, and every 15 s while some failed. A retry requested while a send is still in
 *   flight runs right after that send finishes.
 */
export function RegistrationProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    mutationKey: ['registerMatch'],
    mutationFn: (record: MatchRecord) => api.registerMatch(record),
    onSuccess: async (_response, record) => {
      // 201 (created) and 200 (already existed) both mean "the server has it".
      pendingQueue.remove(record.matchId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.allRanking }),
        queryClient.invalidateQueries({ queryKey: queryKeys.allHistory }),
      ]);
    },
    onError: (error, record) => {
      pendingQueue.markFailed(record.matchId, describeApiError(error).message);
    },
    onSettled: (_data, _error, record) => {
      if (pendingQueue.finishSending(record.matchId)) {
        window.dispatchEvent(new Event(RESEND_EVENT));
      }
    },
  });

  const flush = useCallback(() => {
    for (const entry of pendingQueue.getSnapshot().entries) {
      if (pendingQueue.tryStartSending(entry.record.matchId)) mutate(entry.record);
    }
  }, [mutate]);

  const submit = useCallback(
    (record: MatchRecord) => {
      pendingQueue.enqueue(record);
      flush();
    },
    [flush],
  );

  useEffect(() => {
    flush();
    window.addEventListener('online', flush);
    window.addEventListener(SCENARIO_CHANGE_EVENT, flush);
    window.addEventListener(RESEND_EVENT, flush);
    const timer = window.setInterval(() => {
      if (pendingQueue.getSnapshot().entries.some((e) => e.status === 'failed')) flush();
    }, BACKGROUND_RETRY_MS);
    return () => {
      window.removeEventListener('online', flush);
      window.removeEventListener(SCENARIO_CHANGE_EVENT, flush);
      window.removeEventListener(RESEND_EVENT, flush);
      window.clearInterval(timer);
    };
  }, [flush]);

  const value = useMemo(() => ({ submit, flush }), [submit, flush]);
  return <RegistrationContext.Provider value={value}>{children}</RegistrationContext.Provider>;
}
