import { describe, it, expect, vi } from 'vitest';
import { generateTotp } from '../lib/totp';
import { subscribeClock } from '../lib/clock';
import { encryptVaultData, decryptVaultData } from '../lib/crypto';
import { TotpAccount } from '../types/vault';

describe('Audit Fixes & Hardening Verification', () => {
  describe('TOTP Defensive Clamping', () => {
    const secret = 'JBSWY3DPEHPK3PXP';

    it('clamps negative or zero digits to default 6', async () => {
      const code1 = await generateTotp(secret, { digits: -5 });
      expect(code1).toHaveLength(6);

      const code2 = await generateTotp(secret, { digits: 0 });
      expect(code2).toHaveLength(6);

      const code3 = await generateTotp(secret, { digits: NaN });
      expect(code3).toHaveLength(6);
    });

    it('clamps digits < 4 to 6 and digits > 10 to 6', async () => {
      const codeShort = await generateTotp(secret, { digits: 2 });
      expect(codeShort).toHaveLength(6);

      const codeLong = await generateTotp(secret, { digits: 15 });
      expect(codeLong).toHaveLength(6);

      const codeValid8 = await generateTotp(secret, { digits: 8 });
      expect(codeValid8).toHaveLength(8);
    });

    it('handles negative or zero period safely without crashing with Infinity/BigInt error', async () => {
      const codeZero = await generateTotp(secret, { period: 0 });
      expect(codeZero).toHaveLength(6);

      const codeNegative = await generateTotp(secret, { period: -30 });
      expect(codeNegative).toHaveLength(6);

      const codeNaN = await generateTotp(secret, { period: NaN });
      expect(codeNaN).toHaveLength(6);
    });
  });

  describe('Unified Clock Subscriber', () => {
    it('notifies listener immediately on subscribe', () => {
      const fn = vi.fn();
      const unsub = subscribeClock(fn);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(typeof fn.mock.calls[0][0]).toBe('number');
      unsub();
    });

    it('cleans up cleanly when unsubscribed', () => {
      const fn = vi.fn();
      const unsub = subscribeClock(fn);
      unsub();
      // Unsubscribing again does not throw
      expect(() => unsub()).not.toThrow();
    });
  });

  describe('Encrypted Backup Import & Export Lifecycle', () => {
    it('encrypts accounts and verifies that decrypting with the password recovers exact fields', async () => {
      const accounts: TotpAccount[] = [
        {
          id: 'test-1',
          label: 'alice@example.com',
          issuer: 'GitHub',
          secret: 'JBSWY3DPEHPK3PXP',
          algorithm: 'SHA-1',
          digits: 6,
          period: 30,
          favorite: true,
          tags: ['work', 'dev'],
          createdAt: 1000,
          updatedAt: 2000,
        },
      ];

      const password = 'StrongMasterPassword123!';
      const encrypted = await encryptVaultData(accounts, password);

      expect(encrypted.version).toBe(1);
      expect(encrypted.salt).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.ciphertext).toBeDefined();

      // Successfully decrypt
      const decrypted = await decryptVaultData(encrypted, password);
      expect(decrypted).toHaveLength(1);
      expect(decrypted[0].label).toBe('alice@example.com');
      expect(decrypted[0].issuer).toBe('GitHub');
      expect(decrypted[0].secret).toBe('JBSWY3DPEHPK3PXP');
      expect(decrypted[0].favorite).toBe(true);
      expect(decrypted[0].tags).toEqual(['work', 'dev']);

      // Fails on wrong password
      await expect(
        decryptVaultData(encrypted, 'WrongPassword456!')
      ).rejects.toThrow('DECRYPTION_FAILED');
    });
  });
});
