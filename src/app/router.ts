import { useCallback, useSyncExternalStore } from 'react';

export type LogTab = 'ranking' | 'history';

export type Route =
  | { name: 'menu' }
  | { name: 'options' }
  | { name: 'log'; tab: LogTab }
  | { name: 'battle' }
  | { name: 'result' };

/**
 * A tiny hash router (#/options, #/result...). Hash URLs work on any static host without server
 * rewrites, keep the browser Back button working, and let the result screen survive a refresh.
 */
export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '');
  switch (path) {
    case 'options':
      return { name: 'options' };
    case 'log/ranking':
      return { name: 'log', tab: 'ranking' };
    case 'log/history':
      return { name: 'log', tab: 'history' };
    case 'battle':
      return { name: 'battle' };
    case 'result':
      return { name: 'result' };
    default:
      return { name: 'menu' };
  }
}

export function routeToHash(route: Route): string {
  if (route.name === 'log') return `#/log/${route.tab}`;
  return `#/${route.name}`;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => {
    window.removeEventListener('hashchange', onChange);
  };
}

function getHash(): string {
  return window.location.hash;
}

/**
 * A battle cannot be resumed after a reload (R55): if the page opens on #/battle, the URL is
 * replaced with the menu before the app renders.
 */
export function leaveBattleOnLoad(): void {
  if (parseHash(window.location.hash).name === 'battle') {
    window.history.replaceState(null, '', routeToHash({ name: 'menu' }));
  }
}

export function useRoute(): { route: Route; navigate: (route: Route) => void } {
  const hash = useSyncExternalStore(subscribe, getHash);
  const navigate = useCallback((route: Route) => {
    window.location.hash = routeToHash(route);
  }, []);
  return { route: parseHash(hash), navigate };
}
