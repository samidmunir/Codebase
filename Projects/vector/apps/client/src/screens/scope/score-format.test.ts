import { describe, expect, it } from 'vitest';
import { formatRp } from './score-format';

describe('formatRp', () => {
  it('formats totals and signed changes', () => {
    expect(formatRp(1240)).toBe('1,240 RP');
    expect(formatRp(100, true)).toBe('+100 RP');
    expect(formatRp(-225, true)).toBe('−225 RP');
    expect(formatRp(-50)).toBe('−50 RP');
    expect(formatRp(0, true)).toBe('0 RP');
  });
});
