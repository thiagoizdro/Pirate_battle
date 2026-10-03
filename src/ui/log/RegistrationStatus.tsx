import { useRegistration, usePendingQueue, useRegistrationStatus } from '../../api/useRegistration';
import { GameButton } from '../components/GameButton';
import styles from './RegistrationStatus.module.css';

const TEXT = {
  pending: 'Registration pending: waiting to send this battle to the ranking.',
  sending: 'Registering this battle in the ranking…',
  failed: 'Registration failed. It will be retried automatically.',
  saved: 'Registered in the ranking and match history.',
} as const;

/** Result screen: registration status of the last match, with Retry when it failed (R49). */
export function RegistrationStatusView({ matchId }: { matchId: string }) {
  const { status, error } = useRegistrationStatus(matchId);
  const { flush } = useRegistration();
  return (
    <div className={styles.box} data-status={status} data-testid="registration-status">
      <p role="status">
        {TEXT[status]}
        {status === 'failed' && error && <span className={styles.detail}> ({error})</span>}
      </p>
      {status === 'failed' && (
        <GameButton size="small" variant="secondary" onClick={flush}>
          Retry
        </GameButton>
      )}
    </div>
  );
}

/** Captain's Log: how many matches are still waiting, with a Retry button. */
export function PendingBanner() {
  const { entries, sending } = usePendingQueue();
  const { flush } = useRegistration();
  if (entries.length === 0) return null;
  const busy = entries.every((e) => sending.has(e.record.matchId));
  const label =
    entries.length === 1 ? '1 battle is waiting' : `${entries.length} battles are waiting`;
  return (
    <div className={styles.box} data-status="pending" data-testid="pending-banner">
      <p role="status">{label} to be registered. The lists update once it is saved.</p>
      <GameButton size="small" variant="secondary" disabled={busy} onClick={flush}>
        {busy ? 'Sending…' : 'Retry now'}
      </GameButton>
    </div>
  );
}
