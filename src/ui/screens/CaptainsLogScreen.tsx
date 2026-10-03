import { useRef, type KeyboardEvent, type ReactNode } from 'react';

import type { LogTab } from '../../app/router';
import { GameButton } from '../components/GameButton';
import { Panel } from '../components/Panel';
import { ScreenLayout } from '../components/ScreenLayout';
import { useFocusOnMount } from '../components/useFocusOnMount';
import styles from './CaptainsLogScreen.module.css';

const TABS: readonly { id: LogTab; label: string }[] = [
  { id: 'ranking', label: 'Ranking' },
  { id: 'history', label: 'Match History' },
];

interface CaptainsLogScreenProps {
  tab: LogTab;
  onTabChange: (tab: LogTab) => void;
  onBack: () => void;
  /** Content of the selected tab (filled with API data in Phase 5). */
  children: ReactNode;
}

/**
 * "Captain's Log" with the Ranking and Match History tabs (R71). Follows the WAI-ARIA tabs
 * pattern: arrow keys move between tabs, only the selected tab is in the Tab order.
 */
export function CaptainsLogScreen({ tab, onTabChange, onBack, children }: CaptainsLogScreenProps) {
  const titleRef = useFocusOnMount<HTMLHeadingElement>();
  const tabRefs = useRef<Partial<Record<LogTab, HTMLButtonElement | null>>>({});

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const index = TABS.findIndex((t) => t.id === tab);
    const next = TABS[(index + (event.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length];
    if (!next) return;
    onTabChange(next.id);
    tabRefs.current[next.id]?.focus();
  };

  return (
    <ScreenLayout label="Captain's log">
      <Panel wide>
        <h1 ref={titleRef} tabIndex={-1} className="screen-title">
          Captain&apos;s Log
        </h1>
        <div
          role="tablist"
          aria-label="Captain's log"
          className={styles.tabs}
          onKeyDown={handleKeyDown}
        >
          {TABS.map((t) => (
            <GameButton
              key={t.id}
              ref={(element) => {
                tabRefs.current[t.id] = element;
              }}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              variant="secondary"
              size="small"
              selected={tab === t.id}
              onClick={() => {
                onTabChange(t.id);
              }}
            >
              {t.label}
            </GameButton>
          ))}
        </div>
        <div
          role="tabpanel"
          id={`panel-${tab}`}
          aria-labelledby={`tab-${tab}`}
          className={styles.panel}
        >
          {children}
        </div>
        <GameButton onClick={onBack}>Main Menu</GameButton>
      </Panel>
    </ScreenLayout>
  );
}
