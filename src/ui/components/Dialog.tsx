import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';

import { Panel } from './Panel';
import styles from './Dialog.module.css';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DialogProps {
  /** id of the element that names the dialog (usually its heading). */
  labelledBy: string;
  /** Called on Escape. The event is marked as handled so the game does not also react to it. */
  onEscape?: () => void;
  children: ReactNode;
}

/**
 * Modal dialog with focus management (R103):
 * - focus moves into the dialog when it opens;
 * - Tab and Shift+Tab cycle inside it (focus trap);
 * - focus returns to the element that was focused before, when it closes.
 */
export function Dialog({ labelledBy, onEscape, children }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && onEscape) {
      event.preventDefault();
      onEscape();
      return;
    }
    if (event.key !== 'Tab' || !panelRef.current) return;
    const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className={styles.backdrop}>
      <Panel
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onKeyDown={handleKeyDown}
      >
        {children}
      </Panel>
    </div>
  );
}
