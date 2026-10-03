import type { HudSnapshot } from '../../game/bridge';
import { RoundButton } from '../components/GameButton';
import { formatClock } from '../format';
import styles from './Hud.module.css';

const HUD = `${import.meta.env.BASE_URL}assets/ui/hud`;

/** fill_rect of health_frame in the UI atlas (logical units): the fill area inside the 256 px art. */
const FILL_X = 30;
const FILL_WIDTH = 196;
const ART_WIDTH = 256;

function fillImage(ratio: number): string {
  if (ratio >= 0.5) return 'health_fill_green';
  if (ratio >= 0.25) return 'health_fill_amber';
  return 'health_fill_red';
}

interface HudProps {
  hud: HudSnapshot;
  onPause: () => void;
}

/**
 * The on-screen HUD (R36), built from the atlas art. It is real, labelled HTML text, so the
 * values are also readable by assistive technology (R104). It is NOT a live region: the timer
 * changes every second and would be too noisy; announcements happen in GameAnnouncer.
 */
export function Hud({ hud, onPause }: HudProps) {
  const ratio = hud.maxHealth > 0 ? Math.max(0, Math.min(1, hud.health / hud.maxHealth)) : 0;
  // Crop the fill from the left, like the atlas clip_axis "x" / clip_origin "left".
  const visibleWidth = `${((FILL_X + FILL_WIDTH * ratio) / ART_WIDTH) * 100}%`;

  return (
    <section className={styles.hud} aria-label="Match status">
      <div className={styles.health}>
        <img className={styles.heart} src={`${HUD}/icon_heart.png`} alt="" />
        <div className={styles.bar}>
          <div
            className={styles.fill}
            style={{
              width: visibleWidth,
              backgroundImage: `url(${HUD}/${fillImage(ratio)}.png)`,
            }}
            aria-hidden="true"
          />
          <p className={styles.barText}>
            <span className="visually-hidden">Health </span>
            <span data-testid="hud-health">
              {hud.health} / {hud.maxHealth}
            </span>
          </p>
        </div>
      </div>

      <div className={styles.right}>
        <p className={styles.counter}>
          <img src={`${HUD}/icon_score.png`} alt="" />
          <span className="visually-hidden">Score </span>
          <span data-testid="hud-score">{hud.score}</span>
        </p>
        <p className={styles.counter}>
          <img src={`${HUD}/icon_time.png`} alt="" />
          <span className="visually-hidden">Time left </span>
          <span data-testid="hud-time">{formatClock(hud.secondsLeft)}</span>
        </p>
        <RoundButton
          icon="pause"
          label="Pause"
          onClick={onPause}
          disabled={hud.status !== 'running'}
        />
      </div>
    </section>
  );
}
