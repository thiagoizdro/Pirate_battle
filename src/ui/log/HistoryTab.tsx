import { useState } from 'react';

import { useHistoryPage } from '../../api/queries';
import { END_REASON_LABEL, formatClock, formatPlayedAt } from '../format';
import styles from './LogTables.module.css';
import { Pagination } from './Pagination';
import { QueryState } from './QueryState';

interface HistoryTabProps {
  playerId: string;
  playerName: string;
}

/** The player's own matches, newest first: date, points, duration and end reason (R51). */
export function HistoryTab({ playerId, playerName }: HistoryTabProps) {
  const [page, setPage] = useState(1);
  const query = useHistoryPage(playerId, page);

  const totalPages = query.data?.totalPages ?? 1;
  if (query.data && !query.isPlaceholderData && page > totalPages) setPage(totalPages);

  return (
    <section aria-labelledby="history-heading" className={styles.section}>
      <h2 id="history-heading" className="screen-subtitle">
        {playerName} · your recent battles
      </h2>
      <QueryState
        query={query}
        noun="match history"
        emptyMessage="No battles registered yet. Finish a battle to see it here."
      >
        {(data) => (
          <>
            <table className={styles.table} data-testid="history-table">
              <caption className="visually-hidden">
                Match history, page {data.page} of {data.totalPages}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Points</th>
                  <th scope="col">Duration</th>
                  <th scope="col">Result</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((match) => {
                  const played = formatPlayedAt(match.playedAt);
                  return (
                    <tr key={match.matchId}>
                      <td className={styles.date}>
                        {played.date} · {played.time}
                      </td>
                      <td className={styles.points}>{match.score}</td>
                      <td>{formatClock(match.durationMs / 1000)}</td>
                      <td
                        className={match.endReason === 'defeated' ? styles.defeated : styles.timeUp}
                      >
                        {END_REASON_LABEL[match.endReason]}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination
              page={page}
              totalPages={data.totalPages}
              onChange={setPage}
              busy={query.isPlaceholderData}
            />
          </>
        )}
      </QueryState>
    </section>
  );
}
