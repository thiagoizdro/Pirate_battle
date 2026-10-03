import { useQueryClient } from '@tanstack/react-query';
import { useId, useState, useSyncExternalStore } from 'react';

import { SCENARIO_CHANGE_EVENT } from '../../api/registrationContext';
import { mockNetwork, resetMockData, selectScenario } from '../../mocks/runtime';
import { isScenarioId, SCENARIO_IDS, SCENARIOS } from '../../mocks/scenarios';
import styles from './NetworkPanel.module.css';

const subscribe = (listener: () => void) => mockNetwork.subscribe(listener);
const getScenario = () => mockNetwork.scenario;

/**
 * Demo panel for the mock API (R94): pick a network scenario and reset the mock data.
 * Available in the published build too, so reviewers can reproduce every failure.
 * The same choice can be made with ?scenario=<id>&seed=<n> in the URL.
 */
export function NetworkPanel() {
  const queryClient = useQueryClient();
  const scenario = useSyncExternalStore(subscribe, getScenario);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const panelId = useId();
  const selectId = useId();

  const refreshEverything = () => {
    // Requests (and retries) started under the old scenario are canceled first. Without this,
    // a list with no data would just continue its old retry cycle instead of fetching again.
    void queryClient.cancelQueries().then(() => queryClient.invalidateQueries());
    // Pending registrations are retried right away.
    window.dispatchEvent(new Event(SCENARIO_CHANGE_EVENT));
  };

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((value) => !value);
        }}
      >
        Network: {SCENARIOS[scenario].label}
      </button>
      {open && (
        <section id={panelId} className={styles.panel} aria-label="Mock network settings">
          <label htmlFor={selectId}>Scenario</label>
          <select
            id={selectId}
            value={scenario}
            onChange={(event) => {
              const next = event.target.value;
              if (!isScenarioId(next)) return;
              selectScenario(next);
              setNotice(`Scenario set to ${SCENARIOS[next].label}.`);
              refreshEverything();
            }}
          >
            {SCENARIO_IDS.map((id) => (
              <option key={id} value={id}>
                {SCENARIOS[id].label}
              </option>
            ))}
          </select>
          <p className={styles.description}>{SCENARIOS[scenario].description}</p>
          <button
            type="button"
            onClick={() => {
              resetMockData();
              setNotice('Mock data reset to the fixtures.');
              refreshEverything();
            }}
          >
            Reset mock data
          </button>
          <p role="status" className={styles.notice}>
            {notice}
          </p>
        </section>
      )}
    </div>
  );
}
