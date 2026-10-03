import { useEffect, useState } from 'react';

import type { GameSession } from '../../game/GameSession';
import { describeHudChange } from './announcements';

/**
 * Polite live region for screen readers (R104). It listens to the HUD store and only speaks
 * when describeHudChange finds something meaningful, never once per frame.
 */
export function GameAnnouncer({ session }: { session: GameSession | null }) {
  const [message, setMessage] = useState({ text: '', id: 0 });

  useEffect(() => {
    if (!session) return;
    let previous = session.hud.getSnapshot();
    return session.hud.subscribe(() => {
      const next = session.hud.getSnapshot();
      const text = describeHudChange(previous, next);
      previous = next;
      if (text) setMessage((current) => ({ text, id: current.id + 1 }));
    });
  }, [session]);

  return (
    <div role="status" aria-live="polite" className="visually-hidden" data-testid="announcer">
      {message.text}
      {/* Screen readers skip a repeated identical text; a toggling invisible space avoids that. */}
      {message.id % 2 === 1 ? ' ' : ''}
    </div>
  );
}
