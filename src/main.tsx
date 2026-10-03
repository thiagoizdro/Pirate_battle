import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { createQueryClient } from './api/queries';
import { RegistrationProvider } from './api/registration';
import { App } from './app/App';
import { leaveBattleOnLoad } from './app/router';
import './styles/global.css';

// Reloading during a battle ends it (R55): start from the menu instead.
leaveBattleOnLoad();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

const queryClient = createQueryClient();

async function bootstrap(root: HTMLElement): Promise<void> {
  try {
    // The mock API must be ready before the first request (and before pending matches resend).
    // Loaded as a separate chunk so the MSW runtime does not weigh on the main bundle.
    const { startMockApi } = await import('./mocks/browser');
    await startMockApi();
  } catch (error) {
    // Without service workers (e.g. an insecure origin) the game still works; only the
    // ranking/history requests fail and show their error states (R85).
    console.warn('Mock API could not start; ranking and history are unavailable.', error);
  }

  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RegistrationProvider>
          <App />
        </RegistrationProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}

void bootstrap(rootElement);
