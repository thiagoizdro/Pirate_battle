import { Component, type ReactNode } from 'react';

import { GameButton } from './GameButton';
import { Panel } from './Panel';
import { ScreenLayout } from './ScreenLayout';

interface Props {
  onBack: () => void;
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/**
 * Catches errors while loading or rendering a screen (for example, the battle code failing to
 * download on a bad connection) and shows a recoverable message instead of a blank page.
 * Error boundaries must be class components in React.
 */
export class ScreenErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: unknown): void {
    console.warn('Screen failed to load', error);
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <ScreenLayout label="Error">
        <Panel role="alert">
          <h1 className="screen-title">Something went wrong</h1>
          <p>This screen could not be loaded. Check your connection and try again.</p>
          <GameButton
            onClick={() => {
              window.location.reload();
            }}
          >
            Retry
          </GameButton>
          <GameButton variant="secondary" onClick={this.props.onBack}>
            Main Menu
          </GameButton>
        </Panel>
      </ScreenLayout>
    );
  }
}
