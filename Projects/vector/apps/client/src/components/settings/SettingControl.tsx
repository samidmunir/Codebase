import { useEffect, useState } from 'react';
import type { SettingDefinition } from '@vector/shared';
import { bindingFromEvent } from '../../controls/keybindings';
import { bindingKeys, isModifierCode } from '../../settings/key-labels';
import './settings-controls.css';

interface SettingControlProps {
  settingKey: string;
  definition: SettingDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  /** Other settings bound to the same key (keybindings only). */
  conflicts?: string[];
  disabled?: boolean;
}

const withUnit = (value: number, unit?: string) =>
  unit ? `${value}${unit.startsWith('%') || unit === '×' ? '' : ' '}${unit}` : String(value);

/** A settings row: label, description and the control for the setting's kind. */
export function SettingRow(props: SettingControlProps & { onReset?: () => void }) {
  const { definition, settingKey, conflicts, onReset } = props;
  const id = `setting-${settingKey.replaceAll('.', '-')}`;
  return (
    <div className="setting-row" data-kind={definition.kind}>
      <div className="setting-row__text">
        <label className="setting-row__label" htmlFor={id} id={`${id}-label`}>
          {definition.label}
        </label>
        <p className="setting-row__description">{definition.description}</p>
        {conflicts && conflicts.length > 0 && (
          <p className="setting-row__conflict" role="alert">
            Also used by {conflicts.join(', ')}
          </p>
        )}
      </div>
      <div className="setting-row__control">
        <SettingControl {...props} />
        {onReset && (
          <button
            type="button"
            className="setting-row__reset"
            onClick={onReset}
            title="Reset to default"
            aria-label={`Reset ${definition.label} to default`}
          >
            ↺
          </button>
        )}
      </div>
    </div>
  );
}

export function SettingControl({
  settingKey,
  definition,
  value,
  onChange,
  disabled,
}: SettingControlProps) {
  const id = `setting-${settingKey.replaceAll('.', '-')}`;
  switch (definition.kind) {
    case 'number':
      return (
        <div className="setting-slider">
          <input
            id={id}
            type="range"
            min={definition.min}
            max={definition.max}
            step={definition.step}
            value={value as number}
            disabled={disabled}
            onChange={(event) => onChange(Number(event.target.value))}
          />
          <output htmlFor={id}>{withUnit(value as number, definition.unit)}</output>
        </div>
      );
    case 'boolean':
      return (
        <span className="setting-switch">
          <input
            id={id}
            type="checkbox"
            role="switch"
            checked={value as boolean}
            disabled={disabled}
            onChange={(event) => onChange(event.target.checked)}
          />
          <span className="setting-switch__track" aria-hidden="true" />
        </span>
      );
    case 'select':
      if (definition.options.length > 4) {
        return (
          <select
            id={id}
            className="setting-select"
            value={String(value)}
            disabled={disabled}
            onChange={(event) => {
              const option = definition.options.find((o) => String(o.value) === event.target.value);
              if (option) onChange(option.value);
            }}
          >
            {definition.options.map((option) => (
              <option key={String(option.value)} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </select>
        );
      }
      return (
        <div
          id={id}
          className="setting-segmented"
          role="radiogroup"
          aria-labelledby={`${id}-label`}
        >
          {definition.options.map((option) => (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={value === option.value}
              disabled={disabled}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      );
    case 'multiSelect': {
      const selected = value as (string | number)[];
      return (
        <div id={id} className="setting-chips" role="group" aria-labelledby={`${id}-label`}>
          {definition.options.map((option) => {
            const on = selected.includes(option.value);
            return (
              <button
                key={String(option.value)}
                type="button"
                aria-pressed={on}
                // At least one option must stay selected.
                disabled={disabled || (on && selected.length === 1)}
                onClick={() =>
                  onChange(
                    on
                      ? selected.filter((v) => v !== option.value)
                      : definition.options
                          .map((o) => o.value)
                          .filter((v) => v === option.value || selected.includes(v)),
                  )
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>
      );
    }
    case 'range': {
      const [low, high] = value as [number, number];
      return (
        <div className="setting-range">
          <input
            id={id}
            type="range"
            aria-label={`${definition.label} (minimum)`}
            min={definition.min}
            max={definition.max}
            step={definition.step}
            value={low}
            disabled={disabled}
            onChange={(event) => {
              const next = Number(event.target.value);
              onChange([next, Math.max(next, high)]);
            }}
          />
          <input
            type="range"
            aria-label={`${definition.label} (maximum)`}
            min={definition.min}
            max={definition.max}
            step={definition.step}
            value={high}
            disabled={disabled}
            onChange={(event) => {
              const next = Number(event.target.value);
              onChange([Math.min(low, next), next]);
            }}
          />
          <output htmlFor={id}>
            {low === high
              ? withUnit(low, definition.unit)
              : `${low}–${withUnit(high, definition.unit)}`}
          </output>
        </div>
      );
    }
    case 'color':
      return (
        <label className="setting-color">
          <input
            id={id}
            type="color"
            value={value as string}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
          />
          <code>{(value as string).toUpperCase()}</code>
        </label>
      );
    case 'keybinding':
      return (
        <KeybindingControl
          id={id}
          binding={value as string}
          disabled={disabled}
          onChange={onChange}
        />
      );
  }
}

/**
 * Click, then press the new key. Esc cancels; Backspace or Delete unbinds.
 * While capturing, the key never reaches the game controls.
 */
function KeybindingControl({
  id,
  binding,
  disabled,
  onChange,
}: {
  id: string;
  binding: string;
  disabled: boolean | undefined;
  onChange: (value: string) => void;
}) {
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (!capturing) return;
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (isModifierCode(event.code)) return;
      const plain = !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
      if (plain && event.code === 'Escape') setCapturing(false);
      else if (plain && (event.code === 'Backspace' || event.code === 'Delete')) {
        onChange('');
        setCapturing(false);
      } else {
        onChange(bindingFromEvent(event));
        setCapturing(false);
      }
    };
    const cancel = () => setCapturing(false);
    // Capture phase on window: runs before the game controls' listener.
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('blur', cancel);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('blur', cancel);
    };
  }, [capturing, onChange]);

  const keys = bindingKeys(binding);
  return (
    <button
      id={id}
      type="button"
      className="setting-key"
      data-capturing={capturing || undefined}
      disabled={disabled}
      onClick={() => setCapturing((on) => !on)}
      onBlur={() => setCapturing(false)}
    >
      {capturing ? (
        <span className="setting-key__prompt">Press a key…</span>
      ) : keys.length === 0 ? (
        <span className="setting-key__unbound">Not set</span>
      ) : (
        keys.map((key, index) => <kbd key={index}>{key}</kbd>)
      )}
    </button>
  );
}
