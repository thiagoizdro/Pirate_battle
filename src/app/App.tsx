import { lazy, Suspense, useCallback, useEffect, useState } from 'react';

import type { MatchRecord } from '../api/contracts';
import { audioEngine } from '../game/audio/AudioEngine';
import type { MatchResult } from '../game/bridge';
import type { GameOptions } from '../game/config';
import { loadLastResult, saveLastResult } from '../storage/lastResult';
import { loadOptions, saveOptions } from '../storage/options';
import { loadPlayer, savePlayerName, type PlayerProfile } from '../storage/player';
import { CaptainsLogScreen } from '../ui/screens/CaptainsLogScreen';
import { ScreenErrorBoundary } from '../ui/components/ScreenErrorBoundary';
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
    },
    [player],
  );

  const showResult = useCallback(() => {
    navigate({ name: 'result' });
  }, [navigate]);

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
          <p className="screen-subtitle">
            {route.tab === 'ranking' ? 'Ranking' : 'Match history'} arrives with the API (Phase 5).
          </p>
        </CaptainsLogScreen>
      );
    case 'result':
      return <ResultScreen record={lastResult} onPlayAgain={play} onMenu={goToMenu} />;
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
