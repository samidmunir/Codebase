import { settingValueSchema, type SettingDefinition } from './definitions';
import { SETTINGS_REGISTRIES, type SettingsFor, type SettingsScope } from './registry';

export interface SettingsIssue {
  key: string;
  problem: 'unknown' | 'invalid';
  message: string;
}

export interface ResolvedSettings<S extends SettingsScope> {
  values: SettingsFor<S>;
  /** Stored values that were dropped or reset to their default. */
  issues: SettingsIssue[];
}

export class SettingsValidationError extends Error {
  constructor(readonly issues: SettingsIssue[]) {
    super(
      `Invalid settings: ${issues.map((issue) => `${issue.key} (${issue.message})`).join('; ')}`,
    );
    this.name = 'SettingsValidationError';
  }
}

function registryEntries(scope: SettingsScope): [string, SettingDefinition][] {
  return Object.entries(SETTINGS_REGISTRIES[scope]);
}

function copyValue<T>(value: T): T {
  return (Array.isArray(value) ? [...value] : value) as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function defaultSettings<S extends SettingsScope>(scope: S): SettingsFor<S> {
  return Object.fromEntries(
    registryEntries(scope).map(([key, definition]) => [key, copyValue(definition.default)]),
  ) as SettingsFor<S>;
}

/**
 * Leniently resolves stored settings (from any earlier version) into a complete,
 * valid set: missing keys get defaults, invalid values are reset to their
 * default, and unknown keys are dropped. Never throws.
 */
export function resolveSettings<S extends SettingsScope>(
  scope: S,
  stored: unknown,
): ResolvedSettings<S> {
  const values: Record<string, unknown> = defaultSettings(scope);
  const issues: SettingsIssue[] = [];
  if (!isPlainObject(stored)) return { values: values as SettingsFor<S>, issues };

  const registry: Record<string, SettingDefinition> = SETTINGS_REGISTRIES[scope];
  for (const [key, value] of Object.entries(stored)) {
    const definition = registry[key];
    if (!definition) {
      issues.push({ key, problem: 'unknown', message: 'No such setting' });
      continue;
    }
    const result = settingValueSchema(definition).safeParse(value);
    if (result.success) {
      values[key] = copyValue(result.data);
    } else {
      issues.push({
        key,
        problem: 'invalid',
        message: result.error.issues[0]?.message ?? 'Invalid value',
      });
    }
  }
  return { values: values as SettingsFor<S>, issues };
}

/**
 * Strictly validates a partial update (e.g. from the settings API).
 * Throws SettingsValidationError if any key is unknown or any value is invalid.
 */
export function parseSettingsPatch<S extends SettingsScope>(
  scope: S,
  patch: unknown,
): Partial<SettingsFor<S>> {
  if (!isPlainObject(patch)) {
    throw new SettingsValidationError([
      { key: '*', problem: 'invalid', message: 'Expected an object' },
    ]);
  }
  const { issues } = resolveSettings(scope, patch);
  if (issues.length > 0) throw new SettingsValidationError(issues);
  return Object.fromEntries(
    Object.entries(patch).map(([key, value]) => [key, copyValue(value)]),
  ) as Partial<SettingsFor<S>>;
}
