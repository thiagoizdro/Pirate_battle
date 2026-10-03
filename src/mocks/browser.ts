import { setupWorker } from 'msw/browser';

import { createHandlers } from './handlers';
import { mockDb, mockNetwork } from './runtime';

/**
 * Starts the mock API service worker. Runs in development AND in the published build (R96),
 * before React renders, so the very first request is already mocked.
 */
export async function startMockApi(): Promise<void> {
  const worker = setupWorker(...createHandlers(mockDb, mockNetwork));
  await worker.start({
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    // Assets, sounds and the app itself are real files: let them through without warnings.
    onUnhandledFrame: 'bypass',
    quiet: true,
  });
}
