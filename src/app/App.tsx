import { useState } from 'react';

import { audioEngine } from '../game/audio/AudioEngine';
import { GameScreen } from '../ui/screens/GameScreen';

type Screen = 'menu' | 'game';

/** Temporary shell for Phase 1. The real menu and screens arrive in Phase 4. */
export function App() {
  const [screen, setScreen] = useState<Screen>('menu');

  if (screen === 'game') {
    return (
      <GameScreen
        onExit={() => {
          setScreen('menu');
        }}
      />
    );
  }

  return (
    <main className="placeholder-menu">
      <h1>Pirate Battle</h1>
      <button
        type="button"
        onClick={() => {
          // Browsers only allow audio after a user gesture: unlock it inside this click.
          audioEngine.unlock();
          setScreen('game');
        }}
      >
        Play
      </button>
    </main>
  );
}
