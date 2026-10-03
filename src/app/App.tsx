import { lazy, Suspense, useCallback, useEffect, useState } from 'react';

import type { MatchRecord } from '../api/contracts';
import { useRegistration } from '../api/useRegistration';
import { audioEngine } from '../game/audio/AudioEngine';
import type { MatchResult } from '../game/bridge';
import type { GameOptions } from '../game/config';
import { loadLastResult, saveLastResult } from '../storage/lastResult';
import { loadOptions, saveOptions } from '../storage/options';
import { loadPlayer, savePlayerName, type PlayerProfile } from '../storage/player';
import { CaptainsLogScreen } from '../ui/screens/CaptainsLogScreen';
import { ScreenErrorBoundary } from '../ui/components/ScreenErrorBoundary';
import { NetworkPanel } from '../ui/dev/NetworkPanel';
import { HistoryTab } from '../ui/log/HistoryTab';
import { RankingTab } from '../ui/log/RankingTab';
import { PendingBanner, RegistrationStatusView } from '../ui/log/RegistrationStatus';
import { MainMenu } from '../ui/screens/MainMenu';
import { OptionsScreen } from '../ui/screens/OptionsScreen';
import { ResultScreen } from '../ui/screens/ResultScreen';
import { createMatchRecord } from './matchRecord';
import { useRoute } from './router';

/**
 * The battle screen (and PixiJS with it) is downloaded only when the player presses Play,
 * so the menu opens faster.
 */
const GameScreen = lazy(() =>
  import('../ui/screens/GameScreen').then((module) => ({ default: module.GameScreen })),
);

/**
 * Top-level screen switch. Persistent data (options, player, last result) is loaded once here
 * and saved through the storage modules; screens only receive props and callbacks.
 */
export function App() {
  const { route, navigate } = useRoute();
  const [options, setOptions] = useState<GameOptions>(loadOptions);
  const [player, setPlayer] = useState<PlayerProfile>(loadPlayer);
  const [lastResult, setLastResult] = useState<MatchRecord | null>(loadLastResult);
  // A new key for every battle, so "Play Again" always mounts a brand-new GameScreen.
  const [battleKey, setBattleKey] = useState(0);
  const registration = useRegistration();

  // Browsers allow audio only after a user gesture: unlock on the first one, then load sounds.
  useEffect(() => {
    const unlock = () => {
      audioEngine.unlock();
      void audioEngine.load();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const play = useCallback(() => {
    audioEngine.unlock();
    setBattleKey((key) => key + 1);
    navigate({ name: 'battle' });
  }, [navigate]);

  const goToMenu = useCallback(() => {
    navigate({ name: 'menu' });
  }, [navigate]);

  const handleSaveOptions = useCallback((next: GameOptions, playerName: string) => {
    saveOptions(next);
    setOptions(next);
    setPlayer((current) => savePlayerName(current, playerName));
  }, []);

  const handleMatchEnded = useCallback(
    (result: MatchResult) => {
      const record = createMatchRecord(result, player, new Date());
      saveLastResult(record);
      setLastResult(record);
      // Queued (persisted) before sending; it never blocks the next battle (R84, R85).
      registration.submit(record);
    },
    [player, registration],
  );

  const showResult = useCallback(() => {
    navigate({ name: 'result' });
  }, [navigate]);

  const screen = renderScreen();
  return (
    <>
      {screen}
      {/* The network demo panel stays out of the way during battles. */}
      {route.name !== 'battle' && <NetworkPanel />}
    </>
  );

  function renderScreen() {
    switch (route.name) {
      case 'battle':
        return (
          <ScreenErrorBoundary key={battleKey} onBack={goToMenu}>
            <Suspense fallback={<p className="screen-subtitle">Loading the battle…</p>}>
              <GameScreen
                options={options}
                playerName={player.name}
                onMatchEnded={handleMatchEnded}
                onShowResult={showResult}
                onExit={goToMenu}
                onSaveOptions={handleSaveOptions}
              />
            </Suspense>
          </ScreenErrorBoundary>
        );
      case 'options':
        return (
          <OptionsScreen
            options={options}
            playerName={player.name}
            onSave={handleSaveOptions}
            onBack={goToMenu}
          />
        );
      case 'log':
        return (
          <CaptainsLogScreen
            tab={route.tab}
            onTabChange={(tab) => {
              navigate({ name: 'log', tab });
            }}
            onBack={goToMenu}
          >
            <PendingBanner />
            {route.tab === 'ranking' ? (
              <RankingTab options={options} playerId={player.id} />
            ) : (
              <HistoryTab playerId={player.id} playerName={player.name} />
            )}
          </CaptainsLogScreen>
        );
      case 'result':
        return (
          <ResultScreen
            record={lastResult}
            onPlayAgain={play}
            onMenu={goToMenu}
            registration={
              lastResult ? <RegistrationStatusView matchId={lastResult.matchId} /> : undefined
            }
          />
        );
      case 'menu':
        return (
          <MainMenu
            playerName={player.name}
            lastResult={lastResult}
            onPlay={play}
            onOptions={() => {
              navigate({ name: 'options' });
            }}
            onLog={(tab) => {
              navigate({ name: 'log', tab });
            }}
          />
        );
    }
  }
}
