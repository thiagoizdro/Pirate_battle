import { useEffect, useRef } from 'react';

/**
 * Moves focus to a screen's heading when the screen opens, so screen reader users hear where
 * they are after navigating (the heading needs tabIndex={-1}).
 */
export function useFocusOnMount<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return ref;
}
