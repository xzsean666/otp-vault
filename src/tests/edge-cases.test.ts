import { describe, it, expect } from 'vitest';
import {
  normalizeBase32,
  isValidBase32,
  base32ToUint8Array,
  uint8ArrayToBase32,
} from '../lib/base32';
import { generateTotp, getTotpTimeRemaining, normalizeAlgorithm } from '../lib/totp';
import { parseOtpauthUri, buildOtpauthUri } from '../lib/otpauth';
import {
  encryptVaultData,
  decryptVaultData,
  generateRandomBytes,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from '../lib/crypto';
import { TotpAccount } from '../types/vault';

describe('Comprehensive Edge Cases & Stress Tests', () => {
  describe('Base32 Edge Cases', () => {
    it('handles various invalid base32 inputs gracefully', () => {
      expect(isValidBase32('')).toBe(false);
      expect(isValidBase32('   ')).toBe(false);
      expect(isValidBase32('===')).toBe(false);
      expect(isValidBase32('1890')).toBe(false);
      expect(isValidBase32('ABC8')).toBe(false);
      expect(isValidBase32('ABC9')).toBe(false);
      expect(isValidBase32('ABC 1')).toBe(false);

      expect(() => base32ToUint8Array('')).toThrow();
      expect(() => base32ToUint8Array('1890')).toThrow();
      expect(() => base32ToUint8Array('INVALID!CHAR')).toThrow();
    });

    it('handles padding and normalization variants', () => {
      const normal = 'MZXW6YTBOI======';
      expect(normalizeBase32(normal)).toBe('MZXW6YTBOI');
      expect(isValidBase32(normal)).toBe(true);
      const decoded1 = base32ToUint8Array(normal);
      const decoded2 = base32ToUint8Array('mzxw-6ytb_oi');
      expect(decoded1).toEqual(decoded2);
      expect(new TextDecoder().decode(decoded1)).toBe('foobar');
    });

    it('handles single-byte through 10-byte arbitrary inputs', () => {
      for (let len = 1; len <= 10; len++) {
        const bytes = generateRandomBytes(len);
        const encoded = uint8ArrayToBase32(bytes);
        expect(isValidBase32(encoded)).toBe(true);
        const decoded = base32ToUint8Array(encoded);
        expect(decoded).toEqual(bytes);
      }
    });
  });

  describe('TOTP Edge Cases', () => {
    it('normalizes algorithm variations properly', () => {
      expect(normalizeAlgorithm('sha1')).toBe('SHA-1');
      expect(normalizeAlgorithm('SHA-1')).toBe('SHA-1');
      expect(normalizeAlgorithm('SHA1')).toBe('SHA-1');
      expect(normalizeAlgorithm('sha256')).toBe('SHA-256');
      expect(normalizeAlgorithm('sha-256')).toBe('SHA-256');
      expect(normalizeAlgorithm('SHA_256')).toBe('SHA-256');
      expect(normalizeAlgorithm('SHA512')).toBe('SHA-512');
      expect(normalizeAlgorithm('sha-512')).toBe('SHA-512');
      expect(normalizeAlgorithm('unknown')).toBe('SHA-1');
      expect(normalizeAlgorithm(undefined)).toBe('SHA-1');
    });

    it('generates correct zero-padded digits', async () => {
      // Test secret that generates leading zero
      const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
      // Test at time 0
      const codeAtZero = await generateTotp(secret, { timestamp: 0, digits: 6 });
      expect(codeAtZero).toHaveLength(6);
      expect(/^\d{6}$/.test(codeAtZero)).toBe(true);

      const code8AtZero = await generateTotp(secret, { timestamp: 0, digits: 8 });
      expect(code8AtZero).toHaveLength(8);
      expect(/^\d{8}$/.test(code8AtZero)).toBe(true);
    });

    it('handles non-standard periods', async () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const code15 = await generateTotp(secret, { period: 15, timestamp: 100 });
      const code60 = await generateTotp(secret, { period: 60, timestamp: 100 });
      expect(code15).toHaveLength(6);
      expect(code60).toHaveLength(6);
      // Different periods should produce different OTPs for same timestamp
      expect(code15).not.toBe(code60);
    });

    it('handles getTotpTimeRemaining boundary seconds', () => {
      // Exact start of window (remaining should be period)
      const r0 = getTotpTimeRemaining(30, 30000); // 30 sec -> 30 % 30 = 0 -> remaining = 30
      expect(r0.remaining).toBe(30);
      expect(r0.progress).toBe(1);

      // Last second of window (remaining should be 1)
      const r29 = getTotpTimeRemaining(30, 29000); // 29 sec -> 29 % 30 = 29 -> remaining = 1
      expect(r29.remaining).toBe(1);
      expect(r29.progress).toBeCloseTo(1 / 30, 2);
    });
  });

  describe('OTPAuth URI Edge Cases', () => {
    it('handles URI with complex characters in issuer and label', () => {
      const uri = 'otpauth://totp/Acme%20%26%20Co%3A%20user%2Btag%40domain.com?secret=JBSWY3DPEHPK3PXP&issuer=Acme%20%26%20Co';
      const parsed = parseOtpauthUri(uri);
      expect(parsed.issuer).toBe('Acme & Co');
      expect(parsed.label).toBe('user+tag@domain.com');
      expect(parsed.secret).toBe('JBSWY3DPEHPK3PXP');
    });

    it('handles URI with spaces around query params or secret', () => {
      const uri = 'otpauth://totp/GitHub:alice?secret=JBSWY3DPEHPK3PXP%20%20&period=45&digits=8';
      const parsed = parseOtpauthUri(uri);
      expect(parsed.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(parsed.period).toBe(45);
      expect(parsed.digits).toBe(8);
    });

    it('handles URI with no issuer at all', () => {
      const uri = 'otpauth://totp/my-account?secret=JBSWY3DPEHPK3PXP';
      const parsed = parseOtpauthUri(uri);
      expect(parsed.issuer).toBeUndefined();
      expect(parsed.label).toBe('my-account');
    });

    it('handles URI with lowercase otpauth scheme', () => {
      const uri = 'otpauth://totp/Test:user?secret=JBSWY3DPEHPK3PXP';
      const parsed = parseOtpauthUri(uri);
      expect(parsed.issuer).toBe('Test');
      expect(parsed.label).toBe('user');
    });

    it('handles URI with invalid or extreme digits by defaulting safely', () => {
      const uriNeg = 'otpauth://totp/Test:user?secret=JBSWY3DPEHPK3PXP&digits=-5';
      expect(parseOtpauthUri(uriNeg).digits).toBe(6);

      const uriHuge = 'otpauth://totp/Test:user?secret=JBSWY3DPEHPK3PXP&digits=999';
      expect(parseOtpauthUri(uriHuge).digits).toBe(6);

      const uriAlpha = 'otpauth://totp/Test:user?secret=JBSWY3DPEHPK3PXP&digits=abc';
      expect(parseOtpauthUri(uriAlpha).digits).toBe(6);
    });

    it('rejects unsupported hotp protocol', () => {
      expect(() => parseOtpauthUri('otpauth://hotp/Test:user?secret=JBSWY3DPEHPK3PXP&counter=1')).toThrow(
        /Only TOTP is supported/i
      );
    });

    it('handles roundtrip with special characters in account info', () => {
      const account: TotpAccount = {
        id: '123',
        label: 'test/user+special:name@company.com',
        issuer: 'Google Cloud (Dev)',
        secret: 'JBSWY3DPEHPK3PXP',
        algorithm: 'SHA-512',
        digits: 8,
        period: 60,
        createdAt: 0,
        updatedAt: 0,
      };

      const uri = buildOtpauthUri(account);
      const parsed = parseOtpauthUri(uri);

      expect(parsed.label).toBe(account.label);
      expect(parsed.issuer).toBe(account.issuer);
      expect(parsed.secret).toBe(account.secret);
      expect(parsed.algorithm).toBe('SHA-512');
      expect(parsed.digits).toBe(8);
      expect(parsed.period).toBe(60);
    });
  });

  describe('Web Crypto Integrity & Tamper Testing', () => {
    const sample: TotpAccount[] = [
      {
        id: 'test-1',
        label: 'user@test.com',
        secret: 'JBSWY3DPEHPK3PXP',
        algorithm: 'SHA-1',
        digits: 6,
        period: 30,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ];

    it('throws error when password is empty or whitespace', async () => {
      await expect(encryptVaultData(sample, '')).rejects.toThrow(/empty/i);
      await expect(encryptVaultData(sample, '   ')).rejects.toThrow(/empty/i);
    });

    it('detects tampering in ciphertext', async () => {
      const password = 'secure-password-123';
      const encrypted = await encryptVaultData(sample, password);

      // Tamper with ciphertext by altering characters
      const rawCt = base64ToUint8Array(encrypted.ciphertext);
      rawCt[0] ^= 0x01; // flip 1 bit
      const tamperedCt = uint8ArrayToBase64(rawCt);

      const tamperedPayload = {
        ...encrypted,
        ciphertext: tamperedCt,
      };

      await expect(decryptVaultData(tamperedPayload, password)).rejects.toThrow(
        /DECRYPTION_FAILED/i
      );
    });

    it('detects tampering in IV', async () => {
      const password = 'secure-password-123';
      const encrypted = await encryptVaultData(sample, password);

      const rawIv = base64ToUint8Array(encrypted.iv);
      rawIv[0] ^= 0x01;
      const tamperedIv = uint8ArrayToBase64(rawIv);

      const tamperedPayload = {
        ...encrypted,
        iv: tamperedIv,
      };

      await expect(decryptVaultData(tamperedPayload, password)).rejects.toThrow(
        /DECRYPTION_FAILED/i
      );
    });

    it('detects tampering in salt', async () => {
      const password = 'secure-password-123';
      const encrypted = await encryptVaultData(sample, password);

      const rawSalt = base64ToUint8Array(encrypted.salt);
      rawSalt[0] ^= 0x01;
      const tamperedSalt = uint8ArrayToBase64(rawSalt);

      const tamperedPayload = {
        ...encrypted,
        salt: tamperedSalt,
      };

      await expect(decryptVaultData(tamperedPayload, password)).rejects.toThrow(
        /DECRYPTION_FAILED/i
      );
    });

    it('handles empty account list encryption/decryption cleanly', async () => {
      const password = 'my-password';
      const encrypted = await encryptVaultData([], password);
      const decrypted = await decryptVaultData(encrypted, password);
      expect(decrypted).toEqual([]);
    });

    it('rejects corrupted non-base64 salt/iv/ciphertext gracefully', async () => {
      const password = 'secure-password-123';
      const malformedPayload = {
        version: 1,
        salt: '!!!NOT-BASE64!!!',
        iv: '!!!NOT-BASE64!!!',
        ciphertext: '!!!NOT-BASE64!!!',
        iterations: 1000,
        updatedAt: Date.now(),
      };

      await expect(decryptVaultData(malformedPayload, password)).rejects.toThrow(
        /DECRYPTION_FAILED/i
      );
    });

    it('handles unicode in label and issuer', async () => {
      const unicodeAccounts: TotpAccount[] = [
        {
          id: 'u-1',
          label: '张三 🚀 <test> & "quotes"',
          issuer: '阿里云 · 运营后台 (杭州)',
          secret: 'JBSWY3DPEHPK3PXP',
          algorithm: 'SHA-256',
          digits: 6,
          period: 30,
          tags: ['生产环境', '核心系统', '🔥'],
          favorite: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      const password = '密码-P@ssw0rd!#中文';
      const encrypted = await encryptVaultData(unicodeAccounts, password);
      const decrypted = await decryptVaultData(encrypted, password);

      expect(decrypted).toEqual(unicodeAccounts);
    });
  });
});
