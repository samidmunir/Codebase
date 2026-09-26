import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './passwords';

describe('passwords', () => {
  it('verifies the right password and rejects others', async () => {
    const hash = await hashPassword('correct horse battery');
    expect(await verifyPassword('correct horse battery', hash)).toBe(true);
    expect(await verifyPassword('correct horse batterx', hash)).toBe(false);
  });

  it('salts every hash', async () => {
    expect(await hashPassword('same password')).not.toBe(await hashPassword('same password'));
  });

  it('never stores the password itself', async () => {
    expect(await hashPassword('hunter22hunter')).not.toContain('hunter22hunter');
  });

  it('rejects malformed hashes', async () => {
    expect(await verifyPassword('anything', 'not-a-hash')).toBe(false);
  });
});
