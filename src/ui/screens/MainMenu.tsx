import type { MatchRecord } from '../../api/contracts';
import type { LogTab } from '../../app/router';
import { ControlsHelp } from '../components/ControlsHelp';
import { GameButton } from '../components/GameButton';
import { Panel } from '../components/Panel';
import { ScreenLayout } from '../components/ScreenLayout';
import { useFocusOnMount } from '../components/useFocusOnMount';
import { END_REASON_LABEL } from '../format';
import styles from './MainMenu.module.css';

interface MainMenuProps {
  playerName: string;
  lastResult: MatchRecord | null;
  onPlay: () => void;
  onOptions: () => void;
  onLog: (tab: LogTab) => void;
}

/** Main menu (R46): Play, Options, control instructions, Ranking and Match History. */
export function MainMenu({ playerName, lastResult, onPlay, onOptions, onLog }: MainMenuProps) {
  const titleRef = useFocusOnMount<HTMLHeadingElement>();
  return (
    <ScreenLayout label="Main menu">
      <Panel>
        <h1 ref={titleRef} tabIndex={-1} className={styles.title}>
          <img
            src={`${import.meta.env.BASE_URL}assets/ui/menu/title_pirate_battle.png`}
            alt="Pirate Battle"
          />
        </h1>
        <p className="screen-subtitle">Set sail. Take command.</p>
        <p className={styles.captain}>
          Captain: <strong>{playerName}</strong>
        </p>

        <div className={styles.actions}>
          <GameButton onClick={onPlay}>Play</GameButton>
          <GameButton onClick={onOptions}>Options</GameButton>
        </div>

        {lastResult && (
          <p className={styles.last}>
            Last battle: {lastResult.score} points · {END_REASON_LABEL[lastResult.endReason]}
          </p>
        )}

        <ControlsHelp />

        <nav aria-label="Captain's log" className={styles.tabs}>
          <GameButton
            variant="secondary"
            size="small"
            onClick={() => {
              onLog('ranking');
            }}
          >
            Ranking
          </GameButton>
          <GameButton
            variant="secondary"
            size="small"
            onClick={() => {
              onLog('history');
            }}
          >
            Match History
          </GameButton>
        </nav>
      </Panel>
    </ScreenLayout>
  );
}
