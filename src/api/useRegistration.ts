import { useContext, useSyncExternalStore } from 'react';

import { pendingQueue, registrationStatus, type RegistrationStatus } from './pendingQueue';
import { RegistrationContext, type Registration } from './registrationContext';

export function useRegistration(): Registration {
  const value = useContext(RegistrationContext);
  if (!value) throw new Error('useRegistration must be used inside RegistrationProvider');
  return value;
}

export function usePendingQueue() {
  return useSyncExternalStore(pendingQueue.subscribe, pendingQueue.getSnapshot);
}

/** Registration status of one match plus its last error, for the result screen. */
export function useRegistrationStatus(matchId: string): {
  status: RegistrationStatus;
  error: string | null;
} {
  const snapshot = usePendingQueue();
  const entry = snapshot.entries.find((e) => e.record.matchId === matchId);
  return { status: registrationStatus(snapshot, matchId), error: entry?.lastError ?? null };
}
