import { useState } from 'react';

import { useRankingPage } from '../../api/queries';
import { configKey, type GameOptions } from '../../game/config';
import { formatPlayedAt } from '../format';
import styles from './LogTables.module.css';
import { Pagination } from './Pagination';
import { QueryState } from './QueryState';

interface RankingTabProps {
  options: GameOptions;
  playerId: string;
}

/**
 * Ranking for the player's current setup only (R75): rank, captain, points and date (R50).
 * The player's own rows are highlighted with a "You" badge.
 */
export function RankingTab({ options, playerId }: RankingTabProps) {
  const [page, setPage] = useState(1);
  const key = configKey(options);
  const query = useRankingPage(key, page);

  // If the list shrank (e.g. after "Reset mock data"), go back to the last existing page.
  const totalPages = query.data?.totalPages ?? 1;
  if (query.data && !query.isPlaceholderData && page > totalPages) setPage(totalPages);

  return (
    <section aria-labelledby="ranking-heading" className={styles.section}>
      <h2 id="ranking-heading" className="screen-subtitle">
        {options.sessionSeconds} second battles · {options.spawnIntervalSeconds} second spawn
        interval
      </h2>
      <QueryState
        query={query}
        noun="ranking"
        emptyMessage="No battles recorded with this setup yet. Be the first!"
      >
        {(data) => (
          <>
            <table className={styles.table} data-testid="ranking-table">
              <caption className="visually-hidden">
                Ranking, page {data.page} of {data.totalPages}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Captain</th>
                  <th scope="col">Points</th>
                  <th scope="col">Played</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((entry) => {
                  const mine = entry.playerId === playerId;
                  const played = formatPlayedAt(entry.playedAt);
                  return (
                    <tr key={entry.matchId} className={mine ? styles.mine : undefined}>
                      <td className={styles.rank}>{String(entry.rank).padStart(2, '0')}</td>
                      <td className={styles.captain}>
                        {entry.playerName}
                        {mine && <span className={styles.you}>You</span>}
                      </td>
                      <td className={styles.points}>{entry.score}</td>
                      <td className={styles.date}>
                        {played.date} · {played.time}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination
              page={data.page}
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
