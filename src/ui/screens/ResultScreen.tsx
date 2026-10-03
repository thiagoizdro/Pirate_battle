import type { ReactNode } from 'react';

import type { MatchRecord } from '../../api/contracts';
import { GameButton } from '../components/GameButton';
import { Panel } from '../components/Panel';
import { ScreenLayout } from '../components/ScreenLayout';
import { useFocusOnMount } from '../components/useFocusOnMount';
import { END_REASON_LABEL, formatClock } from '../format';
import styles from './ResultScreen.module.css';

interface ResultScreenProps {
  /** The last completed match, read from local storage so it survives a refresh (R56). */
  record: MatchRecord | null;
  onPlayAgain: () => void;
  onMenu: () => void;
  /** Registration status of the record (filled in Phase 5). */
  registration?: ReactNode;
}

/** Result (R49): score, time played, end reason, registration status, Play Again, Main Menu. */
export function ResultScreen({ record, onPlayAgain, onMenu, registration }: ResultScreenProps) {
  const titleRef = useFocusOnMount<HTMLHeadingElement>();

  if (!record) {
    return (
      <ScreenLayout label="Battle result">
        <Panel>
          <h1 ref={titleRef} tabIndex={-1} className="screen-title">
            No battle yet
          </h1>
          <p>Play a battle to see your result here.</p>
          <GameButton onClick={onPlayAgain}>Play</GameButton>
          <GameButton variant="secondary" onClick={onMenu}>
            Main Menu
          </GameButton>
        </Panel>
      </ScreenLayout>
    );
  }

  const title = record.endReason === 'time_up' ? 'Battle complete' : 'Ship sunk';
  return (
    <ScreenLayout label="Battle result">
      <Panel>
        <h1 ref={titleRef} tabIndex={-1} className="screen-title">
          {title}
        </h1>
        <p className={styles.score} data-testid="result-score">
          {record.score}
          <span className="visually-hidden"> points</span>
        </p>
        <p className={styles.facts}>
          <span aria-hidden="true">Points · </span>
          <span className="visually-hidden">Time played: </span>
          <span data-testid="result-duration">{formatClock(record.durationMs / 1000)}</span>
          <span aria-hidden="true"> · </span>
          <span className="visually-hidden">. End reason: </span>
          <span data-testid="result-reason">{END_REASON_LABEL[record.endReason]}</span>
        </p>
        {registration}
        <div className={styles.actions}>
          <GameButton onClick={onPlayAgain}>Play Again</GameButton>
          <GameButton onClick={onMenu}>Main Menu</GameButton>
        </div>
      </Panel>
    </ScreenLayout>
  );
}
