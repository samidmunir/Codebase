import { z } from 'zod';

// Every setting is defined once, here and in the registry. The settings UI,
// validation, persistence and the sim engine all read these definitions.

export type SettingCategory =
  | 'display'
  | 'map'
  | 'audio'
  | 'controls'
  | 'traffic'
  | 'weather'
  | 'separation'
  | 'radar'
  | 'pilots'
  | 'departures'
  | 'approaches'
  | 'sim';

interface SettingMeta {
  category: SettingCategory;
  label: string;
  description: string;
}

export interface SettingOption<V extends string | number> {
  value: V;
  label: string;
}

export interface NumberSettingDefinition extends SettingMeta {
  kind: 'number';
  min: number;
  max: number;
  step: number;
  unit?: string;
  default: number;
}

export interface BooleanSettingDefinition extends SettingMeta {
  kind: 'boolean';
  default: boolean;
}

export interface SelectSettingDefinition<
  V extends string | number = string | number,
> extends SettingMeta {
  kind: 'select';
  options: readonly SettingOption<V>[];
  default: V;
}

export interface MultiSelectSettingDefinition<
  V extends string | number = string | number,
> extends SettingMeta {
  kind: 'multiSelect';
  options: readonly SettingOption<V>[];
  default: readonly V[];
}

/** A [low, high] pair, e.g. a pilot response delay of 2–6 seconds. */
export interface RangeSettingDefinition extends SettingMeta {
  kind: 'range';
  min: number;
  max: number;
  step: number;
  unit?: string;
  default: readonly [number, number];
}

export interface ColorSettingDefinition extends SettingMeta {
  kind: 'color';
  default: string;
}

/**
 * A keyboard shortcut for a game, menu or display control, as a
 * KeyboardEvent.code with optional modifiers (e.g. 'Space', 'Shift+KeyS').
 * An empty string means unbound. Never used for aircraft instructions.
 */
export interface KeybindingSettingDefinition extends SettingMeta {
  kind: 'keybinding';
  default: string;
}

export type SettingDefinition =
  | NumberSettingDefinition
  | BooleanSettingDefinition
  | SelectSettingDefinition
  | MultiSelectSettingDefinition
  | RangeSettingDefinition
  | ColorSettingDefinition
  | KeybindingSettingDefinition;

export type SettingsRegistry = Record<string, SettingDefinition>;

export type SettingValue<D extends SettingDefinition> = D extends NumberSettingDefinition
  ? number
  : D extends BooleanSettingDefinition
    ? boolean
    : D extends SelectSettingDefinition<infer V>
      ? V
      : D extends MultiSelectSettingDefinition<infer V>
        ? V[]
        : D extends RangeSettingDefinition
          ? [number, number]
          : string;

export type SettingsValues<R extends SettingsRegistry> = {
  -readonly [K in keyof R]: SettingValue<R[K]>;
};

type WithoutKind<D> = Omit<D, 'kind'>;

/** Builders that keep literal option types, and check defaults against options. */
export const setting = {
  number: (definition: WithoutKind<NumberSettingDefinition>): NumberSettingDefinition => ({
    kind: 'number',
    ...definition,
  }),
  boolean: (definition: WithoutKind<BooleanSettingDefinition>): BooleanSettingDefinition => ({
    kind: 'boolean',
    ...definition,
  }),
  select: <const V extends string | number>(
    definition: SettingMeta & { options: readonly SettingOption<V>[]; default: NoInfer<V> },
  ): SelectSettingDefinition<V> => ({ kind: 'select', ...definition }),
  multiSelect: <const V extends string | number>(
    definition: SettingMeta & {
      options: readonly SettingOption<V>[];
      default: readonly NoInfer<V>[];
    },
  ): MultiSelectSettingDefinition<V> => ({ kind: 'multiSelect', ...definition }),
  range: (definition: WithoutKind<RangeSettingDefinition>): RangeSettingDefinition => ({
    kind: 'range',
    ...definition,
  }),
  color: (definition: WithoutKind<ColorSettingDefinition>): ColorSettingDefinition => ({
    kind: 'color',
    ...definition,
  }),
  keybinding: (
    definition: WithoutKind<KeybindingSettingDefinition>,
  ): KeybindingSettingDefinition => ({
    kind: 'keybinding',
    ...definition,
  }),
};

const KEYBINDING_PATTERN = /^$|^(?:(?:Ctrl|Alt|Shift|Meta)\+)*[A-Za-z0-9]+$/;
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function isOnStep(value: number, min: number, step: number): boolean {
  const steps = (value - min) / step;
  return Math.abs(steps - Math.round(steps)) < 1e-6;
}

function steppedNumber(min: number, max: number, step: number) {
  return z
    .number()
    .min(min)
    .max(max)
    .refine((value) => isOnStep(value, min, step), `Must be in steps of ${step}`);
}

function optionValue(options: readonly SettingOption<string | number>[]) {
  const values = options.map((option) => option.value);
  return z
    .union([z.string(), z.number()])
    .refine((value) => values.includes(value), `Must be one of: ${values.join(', ')}`);
}

/** The validation schema for one setting's value. */
export function settingValueSchema(definition: SettingDefinition): z.ZodType {
  switch (definition.kind) {
    case 'number':
      return steppedNumber(definition.min, definition.max, definition.step);
    case 'boolean':
      return z.boolean();
    case 'select':
      return optionValue(definition.options);
    case 'multiSelect':
      return z
        .array(optionValue(definition.options))
        .min(1)
        .refine((values) => new Set(values).size === values.length, 'Values must be unique');
    case 'range': {
      const bound = steppedNumber(definition.min, definition.max, definition.step);
      return z
        .tuple([bound, bound])
        .refine(([low, high]) => low <= high, 'Low must not exceed high');
    }
    case 'color':
      return z.string().regex(COLOR_PATTERN, 'Must be a #rrggbb color');
    case 'keybinding':
      return z.string().regex(KEYBINDING_PATTERN, 'Must be a key code like "KeyS" or "Shift+KeyS"');
  }
}
