import { useId, useRef, useState, type SubmitEvent, type RefObject } from 'react';

import { OPTION_LIMITS, validateOptions, type GameOptions } from '../../game/config';
import { PLAYER_NAME_MAX_LENGTH, validatePlayerName } from '../../storage/player';
import { GameButton, RoundButton } from '../components/GameButton';
import { VolumeControl } from '../game/AudioControls';
import styles from './OptionsForm.module.css';

type Field = 'sessionSeconds' | 'spawnIntervalSeconds' | 'playerName';
type Errors = Partial<Record<Field, string>>;

interface OptionsFormProps {
  initialOptions: GameOptions;
  initialName: string;
  onSave: (options: GameOptions, playerName: string) => void;
  onClose: () => void;
  closeLabel: string;
  /** Heading id, so a surrounding dialog or page can be labelled by it. */
  titleId: string;
  /** h1 on the Options screen, h2 inside the pause dialog. */
  headingLevel?: 1 | 2;
}

/** Adds `delta` to a typed value, clamps it to the limits and rounds away float noise. */
function stepValue(value: string, delta: number, min: number, max: number): string {
  const current = Number(value);
  const base = Number.isFinite(current) ? current : min;
  const next = Math.min(max, Math.max(min, base + delta));
  return String(Math.round(next * 100) / 100);
}

/**
 * Options form (R47): validation on Save, accessible error messages linked with
 * aria-describedby (R103), and persistence handled by the caller. Values apply to the next
 * battle only (R54).
 */
export function OptionsForm({
  initialOptions,
  initialName,
  onSave,
  onClose,
  closeLabel,
  titleId,
  headingLevel = 1,
}: OptionsFormProps) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  const [session, setSession] = useState(String(initialOptions.sessionSeconds));
  const [spawn, setSpawn] = useState(String(initialOptions.spawnIntervalSeconds));
  const [name, setName] = useState(initialName);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState('');
  const sessionRef = useRef<HTMLInputElement>(null);
  const spawnRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const edit = (field: Field, setter: (value: string) => void) => (value: string) => {
    setter(value);
    setStatus('');
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const options: GameOptions = {
      sessionSeconds: session.trim() === '' ? Number.NaN : Number(session),
      spawnIntervalSeconds: spawn.trim() === '' ? Number.NaN : Number(spawn),
    };
    const nextErrors: Errors = { ...validateOptions(options) };
    const nameError = validatePlayerName(name);
    if (nameError) nextErrors.playerName = nameError;
    setErrors(nextErrors);

    const firstInvalid = (['sessionSeconds', 'spawnIntervalSeconds', 'playerName'] as const).find(
      (field) => nextErrors[field],
    );
    if (firstInvalid) {
      setStatus('');
      const inputs = {
        sessionSeconds: sessionRef,
        spawnIntervalSeconds: spawnRef,
        playerName: nameRef,
      };
      inputs[firstInvalid].current?.focus();
      return;
    }
    onSave(options, name.trim());
    setStatus('Options saved. They apply to your next battle.');
  };

  const { sessionSeconds: sessionLimits, spawnIntervalSeconds: spawnLimits } = OPTION_LIMITS;

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <Heading id={titleId} className="screen-title" tabIndex={-1}>
        Options
      </Heading>

      <NumberField
        label="Game session time"
        value={session}
        onChange={edit('sessionSeconds', setSession)}
        min={sessionLimits.min}
        max={sessionLimits.max}
        step={sessionLimits.step}
        hint={`${sessionLimits.min}–${sessionLimits.max} seconds`}
        error={errors.sessionSeconds}
        inputRef={sessionRef}
        integer
      />
      <NumberField
        label="Enemy spawn time"
        value={spawn}
        onChange={edit('spawnIntervalSeconds', setSpawn)}
        min={spawnLimits.min}
        max={spawnLimits.max}
        step={spawnLimits.step}
        hint={`${spawnLimits.min}–${spawnLimits.max} seconds, in steps of ${spawnLimits.step}`}
        error={errors.spawnIntervalSeconds}
        inputRef={spawnRef}
      />
      <TextField
        label="Captain name"
        value={name}
        onChange={edit('playerName', setName)}
        hint="Shown in the ranking"
        error={errors.playerName}
        inputRef={nameRef}
      />

      <div className={styles.sound}>
        <VolumeControl />
      </div>

      <p className={styles.note}>Changes apply to the next battle.</p>
      <p role="status" className={styles.status}>
        {status}
      </p>

      <div className={styles.actions}>
        <GameButton type="submit">Save</GameButton>
        <GameButton variant="secondary" onClick={onClose}>
          {closeLabel}
        </GameButton>
      </div>
    </form>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint: string;
  error: string | undefined;
  inputRef: RefObject<HTMLInputElement | null>;
}

function NumberField({
  label,
  value,
  onChange,
  hint,
  error,
  inputRef,
  min,
  max,
  step,
  integer = false,
}: FieldProps & { min: number; max: number; step: number; integer?: boolean }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.stepper}>
        <RoundButton
          icon="minus"
          label={`Decrease ${label.toLowerCase()}`}
          onClick={() => {
            onChange(stepValue(value, -step, min, max));
          }}
        />
        <span className={styles.numberWrap}>
          <input
            ref={inputRef}
            id={id}
            className={styles.number}
            type="number"
            inputMode={integer ? 'numeric' : 'decimal'}
            min={min}
            max={max}
            step={step}
            value={value}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            onChange={(event) => {
              onChange(event.target.value);
            }}
          />
          <span aria-hidden="true">s</span>
        </span>
        <RoundButton
          icon="plus"
          label={`Increase ${label.toLowerCase()}`}
          onClick={() => {
            onChange(stepValue(value, step, min, max));
          }}
        />
      </div>
      <p id={hintId} className={styles.hint}>
        {hint}
      </p>
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}

function TextField({ label, value, onChange, hint, error, inputRef }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        ref={inputRef}
        id={id}
        className={styles.text}
        type="text"
        autoComplete="nickname"
        maxLength={PLAYER_NAME_MAX_LENGTH + 10}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${hintId} ${errorId}` : hintId}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
      <p id={hintId} className={styles.hint}>
        {hint}
      </p>
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
