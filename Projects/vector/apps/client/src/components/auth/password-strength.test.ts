import { describe, expect, it } from 'vitest';
import { passwordStrength } from './password-strength';

describe('passwordStrength', () => {
  it('counts down to the minimum length', () => {
    expect(passwordStrength('')).toEqual({ score: 0, label: '' });
    expect(passwordStrength('abc')).toEqual({ score: 0, label: '5 more characters' });
  });

  it('calls out passwords everyone tries', () => {
    expect(passwordStrength('Password123').score).toBe(1);
  });

  it('rewards length and mixing kinds of character', () => {
    expect(passwordStrength('abcdefgh').label).toBe('Weak');
    expect(passwordStrength('abcdefg1').label).toBe('Weak');
    expect(passwordStrength('abcdefG1').label).toBe('Fair');
    expect(passwordStrength('correct horse battery').label).toBe('Good');
    expect(passwordStrength('Correct horse battery 9').label).toBe('Strong');
  });
});
