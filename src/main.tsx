import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/App';
import { leaveBattleOnLoad } from './app/router';
import './styles/global.css';

// Reloading during a battle ends it (R55): start from the menu instead.
leaveBattleOnLoad();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
