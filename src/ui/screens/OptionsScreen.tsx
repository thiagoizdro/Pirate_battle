import { useEffect, useId } from 'react';

import type { GameOptions } from '../../game/config';
import { Panel } from '../components/Panel';
import { ScreenLayout } from '../components/ScreenLayout';
import { OptionsForm } from '../options/OptionsForm';

interface OptionsScreenProps {
  options: GameOptions;
  playerName: string;
  onSave: (options: GameOptions, playerName: string) => void;
  onBack: () => void;
}

export function OptionsScreen({ options, playerName, onSave, onBack }: OptionsScreenProps) {
  const titleId = useId();
  useEffect(() => {
    document.getElementById(titleId)?.focus();
  }, [titleId]);
  return (
    <ScreenLayout label="Options">
      <Panel aria-labelledby={titleId} role="region">
        <OptionsForm
          titleId={titleId}
          initialOptions={options}
          initialName={playerName}
          onSave={onSave}
          onClose={onBack}
          closeLabel="Main Menu"
        />
      </Panel>
    </ScreenLayout>
  );
}
