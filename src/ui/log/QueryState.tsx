import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import type { Page } from '../../api/contracts';
import { describeApiError } from '../../api/errors';
import { GameButton } from '../components/GameButton';
import styles from './LogTables.module.css';

interface QueryStateProps<T> {
  query: UseQueryResult<Page<T>>;
  /** What is loading, e.g. "ranking". */
  noun: string;
  emptyMessage: string;
  children: (page: Page<T>) => ReactNode;
}

/**
 * Shared loading / error / empty / data states for a paginated list (R78).
 * - First load: a status message.
 * - Error with nothing to show: the reason and a Retry button.
 * - Error during a background refresh: keep the old rows and show a small warning with Retry.
 * - Empty: a friendly message.
 */
export function QueryState<T>({ query, noun, emptyMessage, children }: QueryStateProps<T>) {
  const retry = () => {
    void query.refetch();
  };

  if (query.isPending) {
    return (
      <p role="status" className={styles.message}>
        Loading {noun}…
      </p>
    );
  }

  if (query.isError && query.data === undefined) {
    return (
      <div role="alert" className={styles.message}>
        <p>
          Could not load the {noun}. {describeApiError(query.error).message}
        </p>
        <GameButton size="small" onClick={retry}>
          Retry
        </GameButton>
      </div>
    );
  }

  // Past the two checks above, TanStack Query's types guarantee that data is present.
  const page = query.data;

  return (
    <>
      {query.isError && (
        <div role="alert" className={styles.warning}>
          <p>Could not refresh the {noun}; showing the last data received.</p>
          <GameButton size="small" variant="secondary" onClick={retry}>
            Retry
          </GameButton>
        </div>
      )}
      {page.items.length === 0 ? <p className={styles.message}>{emptyMessage}</p> : children(page)}
    </>
  );
}
