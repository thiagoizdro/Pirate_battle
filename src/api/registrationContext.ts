import { createContext } from 'react';

import type { MatchRecord } from './contracts';

/** Fired by the mock network panel when the scenario changes (the "network recovered"). */
export const SCENARIO_CHANGE_EVENT = 'pirate-battle:scenario-change';

export interface Registration {
  /** Saves the record in the pending queue first, then sends it (R83). */
  submit: (record: MatchRecord) => void;
  /** Sends every queued record that is not already in flight. */
  flush: () => void;
}

export const RegistrationContext = createContext<Registration | null>(null);
