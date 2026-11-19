import { describe, it, expect } from 'vitest';
import { generateTotp, getTotpTimeRemaining } from '../lib/totp';

describe('TOTP Engine (RFC 6238 Verification)', () => {
  // Official test keys from RFC 6238 Section 4 & Appendix A:
  const encoder = new TextEncoder();
  const keySha1 = encoder.encode('12345678901234567890'); // 20 bytes
  const keySha256 = encoder.encode('12345678901234567890123456789012'); // 32 bytes
  const keySha512 = encoder.encode(
    '1234567890123456789012345678901234567890123456789012345678901234'
  ); // 64 bytes

  // Official Table from RFC 6238 Appendix B:
  const testVectors = [
    {
      time: 59,
      sha1: '94287082',
      sha256: '46119246',
      sha512: '90693936',
    },
    {
      time: 1111111109,
      sha1: '07081804',
      sha256: '68084774',
      sha512: '25091201',
    },
    {
      time: 1111111111,
      sha1: '14050471',
      sha256: '67062674',
      sha512: '99943326',
    },
    {
      time: 1234567890,
      sha1: '89005924',
      sha256: '91819424',
      sha512: '93441116',
    },
    {
      time: 2000000000,
      sha1: '69279037',
      sha256: '90698825',
      sha512: '38618901',
    },
    {
      time: 20000000000,
      sha1: '65353130',
      sha256: '77737706',
      sha512: '47863826',
    },
  ];

  it('should match RFC 6238 SHA-1 official 8-digit test vectors', async () => {
    for (const vector of testVectors) {
      const code = await generateTotp(keySha1, {
        algorithm: 'SHA-1',
        digits: 8,
        period: 30,
        timestamp: vector.time,
      });
      expect(code).toBe(vector.sha1);
    }
  });

  it('should match RFC 6238 SHA-256 official 8-digit test vectors', async () => {
    for (const vector of testVectors) {
      const code = await generateTotp(keySha256, {
        algorithm: 'SHA-256',
        digits: 8,
        period: 30,
        timestamp: vector.time,
      });
      expect(code).toBe(vector.sha256);
    }
  });

  it('should match RFC 6238 SHA-512 official 8-digit test vectors', async () => {
    for (const vector of testVectors) {
      const code = await generateTotp(keySha512, {
        algorithm: 'SHA-512',
        digits: 8,
        period: 30,
        timestamp: vector.time,
      });
      expect(code).toBe(vector.sha512);
    }
  });

  it('should generate standard 6-digit TOTP with Base32 secret', async () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const code = await generateTotp(secret, {
      digits: 6,
      period: 30,
      timestamp: 1234567890,
    });
    expect(code).toHaveLength(6);
    expect(/^\d{6}$/.test(code)).toBe(true);
  });

  it('should compute remaining seconds and progress accurately', () => {
    const result = getTotpTimeRemaining(30, 1000 * 1000);
    expect(result.remaining).toBe(20);
    expect(result.progress).toBeCloseTo(20 / 30, 2);
  });
});
