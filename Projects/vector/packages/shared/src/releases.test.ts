import { describe, expect, it } from 'vitest';
import { compareVersionsDesc, currentAndNext, type Release } from './releases';

const release = (version: string, status: Release['status']): Release => ({
  id: `00000000-0000-4000-8000-${version.replace(/\D/g, '').padStart(12, '0')}`,
  version,
  name: '',
  summary: '',
  status,
  releasedOn: status === 'released' ? '2026-10-05' : null,
  features: [],
  updatedAt: new Date().toISOString(),
});

describe('versions', () => {
  it('sorts numerically, newest first', () => {
    expect(['0.9', '0.10', '0.2', '1.0', '0.10.1'].sort(compareVersionsDesc)).toEqual([
      '1.0',
      '0.10.1',
      '0.10',
      '0.9',
      '0.2',
    ]);
  });

  it('finds what’s out now and the soonest next version', () => {
    const { current, next } = currentAndNext([
      release('0.1', 'released'),
      release('0.4', 'next'),
      release('0.2', 'released'),
      release('0.3', 'next'),
      release('1.0', 'planned'),
    ]);
    expect(current?.version).toBe('0.2');
    expect(next?.version).toBe('0.3');
  });
});
