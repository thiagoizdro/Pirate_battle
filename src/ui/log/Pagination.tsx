import { RoundButton } from '../components/GameButton';
import styles from './LogTables.module.css';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  /** True while the next page is loading (the previous one stays visible). */
  busy: boolean;
}

/** "Page 1 of 3" with previous/next buttons, as in the reference screenshots (R50, R51). */
export function Pagination({ page, totalPages, onChange, busy }: PaginationProps) {
  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <RoundButton
        icon="turn_left"
        label="Previous page"
        disabled={page <= 1}
        onClick={() => {
          onChange(page - 1);
        }}
      />
      <p aria-live="polite" className={styles.pageLabel}>
        Page {page} of {totalPages}
        {busy && <span className={styles.updating}> · Updating…</span>}
      </p>
      <RoundButton
        icon="turn_right"
        label="Next page"
        disabled={page >= totalPages}
        onClick={() => {
          onChange(page + 1);
        }}
      />
    </nav>
  );
}
