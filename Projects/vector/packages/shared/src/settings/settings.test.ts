import { describe, expect, expectTypeOf, it } from 'vitest';
import { setting, settingValueSchema, type SettingDefinition } from './definitions';
import {
  applyDifficulty,
  detectDifficulty,
  DIFFICULTY_LEVELS,
  DIFFICULTY_PRESETS,
} from './difficulty';
import { findKeybindingConflicts } from './keybindings';
import {
  SESSION_SETTINGS,
  SETTINGS_REGISTRIES,
  USER_SETTINGS,
  type SessionSettings,
  type UserSettings,
} from './registry';
import {
  defaultSettings,
  parseSettingsPatch,
  resolveSettings,
  SettingsValidationError,
} from './resolve';

const allDefinitions = Object.entries(SETTINGS_REGISTRIES).flatMap(([scope, registry]) =>
  Object.entries(registry as Record<string, SettingDefinition>).map(
    ([key, definition]) => [`${scope}:${key}`, definition] as const,
  ),
);

describe('settings registry', () => {
  it.each(allDefinitions)('%s has a valid default', (_key, definition) => {
    expect(settingValueSchema(definition).safeParse(definition.default).success).toBe(true);
  });

  it.each(allDefinitions)('%s has a label and description', (_key, definition) => {
    expect(definition.label.length).toBeGreaterThan(0);
    expect(definition.description.length).toBeGreaterThan(0);
  });

  it('never shares a key between user and session scopes', () => {
    const userKeys = Object.keys(USER_SETTINGS);
    expect(Object.keys(SESSION_SETTINGS).filter((key) => userKeys.includes(key))).toEqual([]);
  });

  it('has no conflicting default keybindings', () => {
    expect(findKeybindingConflicts(defaultSettings('user'))).toEqual([]);
  });

  it('defaults session traffic to the Normal difficulty', () => {
    expect(detectDifficulty(defaultSettings('session'))).toBe('normal');
  });

  it('keeps precise value types', () => {
    expectTypeOf<UserSettings['display.uiAnimations']>().toEqualTypeOf<
      'full' | 'reduced' | 'off'
    >();
    expectTypeOf<UserSettings['display.rangeRingSpacingNm']>().toEqualTypeOf<5 | 10 | 20>();
    expectTypeOf<SessionSettings['sim.availableSpeeds']>().toEqualTypeOf<(1 | 2 | 4 | 8)[]>();
    expectTypeOf<SessionSettings['pilots.responseDelaySec']>().toEqualTypeOf<[number, number]>();
    expectTypeOf<UserSettings['map.basemap']>().toEqualTypeOf<boolean>();
  });

  it('rejects a select default that is not one of its options (compile time)', () => {
    setting.select({
      category: 'display',
      label: 'x',
      description: 'x',
      options: [{ value: 'a', label: 'A' }],
      // @ts-expect-error 'b' is not an option
      default: 'b',
    });
  });
});

describe('setting value validation', () => {
  const schema = (definition: SettingDefinition) => settingValueSchema(definition);

  it('enforces number ranges and steps', () => {
    const separation = schema(SESSION_SETTINGS['separation.lateralNm']);
    expect(separation.safeParse(3.5).success).toBe(true);
    expect(separation.safeParse(3.3).success).toBe(false);
    expect(separation.safeParse(1).success).toBe(false);
  });

  it('handles fractional steps without floating point errors', () => {
    const sweep = schema(SESSION_SETTINGS['radar.sweepIntervalSec']);
    expect(sweep.safeParse(4.8).success).toBe(true);
    expect(sweep.safeParse(0.1 + 0.2 + 4.5).success).toBe(true);
  });

  it('requires ranges to be ordered', () => {
    const delay = schema(SESSION_SETTINGS['pilots.responseDelaySec']);
    expect(delay.safeParse([1, 4]).success).toBe(true);
    expect(delay.safeParse([4, 1]).success).toBe(false);
  });

  it('requires multi-select values to be unique options', () => {
    const speeds = schema(SESSION_SETTINGS['sim.availableSpeeds']);
    expect(speeds.safeParse([1, 8]).success).toBe(true);
    expect(speeds.safeParse([1, 1]).success).toBe(false);
    expect(speeds.safeParse([3]).success).toBe(false);
    expect(speeds.safeParse([]).success).toBe(false);
  });

  it('validates keybindings and colors', () => {
    const key = schema(USER_SETTINGS['controls.keys.saveSession']);
    expect(key.safeParse('Shift+KeyS').success).toBe(true);
    expect(key.safeParse('').success).toBe(true);
    expect(key.safeParse('Shift+').success).toBe(false);

    const color = schema(USER_SETTINGS['display.color.targets']);
    expect(color.safeParse('#A1b2C3').success).toBe(true);
    expect(color.safeParse('green').success).toBe(false);
  });
});

describe('defaultSettings', () => {
  it('returns independent copies', () => {
    const first = defaultSettings('session');
    first['sim.availableSpeeds'].push(8);
    expect(defaultSettings('session')['sim.availableSpeeds']).toEqual([1, 2, 4]);
  });
});

describe('resolveSettings', () => {
  it('fills in settings added after the stored copy was saved', () => {
    const { values, issues } = resolveSettings('user', { 'audio.masterVolume': 40 });
    expect(values['audio.masterVolume']).toBe(40);
    expect(values['display.brightness']).toBe(100);
    expect(issues).toEqual([]);
  });

  it('drops settings that no longer exist', () => {
    const { values, issues } = resolveSettings('user', { 'display.oldSetting': true });
    expect(values).not.toHaveProperty('display.oldSetting');
    expect(issues).toEqual([
      expect.objectContaining({ key: 'display.oldSetting', problem: 'unknown' }),
    ]);
  });

  it('resets invalid values to their default', () => {
    const { values, issues } = resolveSettings('session', { 'separation.lateralNm': 'far' });
    expect(values['separation.lateralNm']).toBe(3);
    expect(issues).toEqual([
      expect.objectContaining({ key: 'separation.lateralNm', problem: 'invalid' }),
    ]);
  });

  it('falls back to defaults for non-object input', () => {
    expect(resolveSettings('session', null).values).toEqual(defaultSettings('session'));
    expect(resolveSettings('session', [1, 2]).values).toEqual(defaultSettings('session'));
  });
});

describe('parseSettingsPatch', () => {
  it('accepts a valid partial update', () => {
    expect(parseSettingsPatch('user', { 'map.basemap': true, 'map.basemapOpacity': 50 })).toEqual({
      'map.basemap': true,
      'map.basemapOpacity': 50,
    });
  });

  it('rejects unknown keys and invalid values', () => {
    expect(() => parseSettingsPatch('user', { 'map.nope': true })).toThrow(SettingsValidationError);
    expect(() => parseSettingsPatch('user', { 'map.basemapOpacity': 3 })).toThrow(
      /map.basemapOpacity/,
    );
    expect(() => parseSettingsPatch('user', 'nope')).toThrow(SettingsValidationError);
  });

  it('rejects user settings sent to the session scope', () => {
    expect(() => parseSettingsPatch('session', { 'audio.masterVolume': 50 })).toThrow(
      /audio.masterVolume/,
    );
  });
});

describe('difficulty', () => {
  it.each(DIFFICULTY_LEVELS)('%s preset values are valid settings', (level) => {
    expect(() => parseSettingsPatch('session', DIFFICULTY_PRESETS[level])).not.toThrow();
  });

  it('gets harder at every level', () => {
    const rates = DIFFICULTY_LEVELS.map(
      (level) => DIFFICULTY_PRESETS[level]['traffic.arrivalRatePerHour'],
    );
    expect(rates).toEqual([...rates].sort((a, b) => a - b));
    expect(
      DIFFICULTY_LEVELS.map((level) => DIFFICULTY_PRESETS[level]['traffic.maxDepartureQueue']),
    ).toEqual([3, 5, 8, 12]);
  });

  it('applies and detects presets, and reports custom after an adjustment', () => {
    const hard = applyDifficulty(defaultSettings('session'), 'hard');
    expect(detectDifficulty(hard)).toBe('hard');
    expect(detectDifficulty({ ...hard, 'traffic.maxDepartureQueue': 9 })).toBe('custom');
  });

  it('does not touch non-traffic settings', () => {
    const settings = { ...defaultSettings('session'), 'separation.lateralNm': 5 };
    expect(applyDifficulty(settings, 'expert')['separation.lateralNm']).toBe(5);
  });
});

describe('findKeybindingConflicts', () => {
  it('reports keys bound to the same shortcut', () => {
    const settings = { ...defaultSettings('user'), 'controls.keys.zoomIn': 'KeyC' };
    expect(findKeybindingConflicts(settings)).toEqual([
      { binding: 'KeyC', settings: ['controls.keys.zoomIn', 'controls.keys.centerScope'] },
    ]);
  });

  it('ignores unbound keys', () => {
    const settings = {
      ...defaultSettings('user'),
      'controls.keys.zoomIn': '',
      'controls.keys.zoomOut': '',
    };
    expect(findKeybindingConflicts(settings)).toEqual([]);
  });
});
