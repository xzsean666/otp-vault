import { describe, it, expect } from 'vitest';
import {
  isGoogleMigrationUri,
  parseGoogleMigrationUri,
  buildGoogleMigrationPayloads,
} from '../lib/googleMigration';
import { generateQrCodeDataUrl } from '../lib/qrcode';
import { base32ToUint8Array } from '../lib/base32';
import { uint8ArrayToBase64 } from '../lib/crypto';
import { TotpAccount } from '../types/vault';

function makeAccount(
  idx: number,
  overrides: Partial<TotpAccount> = {}
): TotpAccount {
  return {
    id: `id-${idx}`,
    label: `user${idx}@example.com`,
    issuer: `Service${idx}`,
    secret: 'JBSWY3DPEHPK3PXP',
    algorithm: 'SHA-1',
    digits: 6,
    period: 30,
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

/**
 * Helper to construct raw protobuf bytes for testing decoder edge cases
 * (e.g., negative batch_id, HOTP entries, MD5 entries, unknown fields)
 */
function buildRawMigrationUri(bytes: number[]): string {
  const b64 = uint8ArrayToBase64(new Uint8Array(bytes));
  return `otpauth-migration://offline?data=${encodeURIComponent(b64)}`;
}

describe('Google Authenticator Migration Codec', () => {
  it('detects otpauth-migration URIs accurately', () => {
    expect(isGoogleMigrationUri('otpauth-migration://offline?data=abc')).toBe(true);
    expect(isGoogleMigrationUri('  OTPAUTH-MIGRATION://offline?data=abc  ')).toBe(true);
    expect(isGoogleMigrationUri('otpauth://totp/Test:user?secret=JBSWY3DPEHPK3PXP')).toBe(false);
    expect(isGoogleMigrationUri('https://example.com')).toBe(false);
  });

  it('roundtrips single and multi-account payloads preserving all TOTP fields', () => {
    const accounts: TotpAccount[] = [
      makeAccount(1, {
        issuer: 'GitHub',
        label: 'alice@github.com',
        secret: 'JBSWY3DPEHPK3PXP',
        algorithm: 'SHA-1',
        digits: 6,
      }),
      makeAccount(2, {
        issuer: 'AWS',
        label: 'root-admin',
        secret: 'HXDMVJECJJWSRB3H',
        algorithm: 'SHA-256',
        digits: 8,
      }),
      makeAccount(3, {
        issuer: undefined,
        label: '自建服务 (中文标签)',
        secret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',
        algorithm: 'SHA-512',
        digits: 6,
      }),
    ];

    const chunks = buildGoogleMigrationPayloads(accounts, { batchId: 424242 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].batchSize).toBe(1);
    expect(chunks[0].batchIndex).toBe(0);
    expect(chunks[0].batchId).toBe(424242);
    expect(chunks[0].uri.startsWith('otpauth-migration://offline?data=')).toBe(true);

    const parsed = parseGoogleMigrationUri(chunks[0].uri);
    expect(parsed.skipped).toHaveLength(0);
    expect(parsed.batchSize).toBe(1);
    expect(parsed.batchIndex).toBe(0);
    expect(parsed.batchId).toBe(424242);
    expect(parsed.accounts).toEqual([
      {
        label: 'alice@github.com',
        issuer: 'GitHub',
        secret: 'JBSWY3DPEHPK3PXP',
        algorithm: 'SHA-1',
        digits: 6,
        period: 30,
      },
      {
        label: 'root-admin',
        issuer: 'AWS',
        secret: 'HXDMVJECJJWSRB3H',
        algorithm: 'SHA-256',
        digits: 8,
        period: 30,
      },
      {
        label: '自建服务 (中文标签)',
        issuer: undefined,
        secret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',
        algorithm: 'SHA-512',
        digits: 6,
        period: 30,
      },
    ]);
  });

  it('splits large account lists into multiple QR-friendly chunks with consistent batch metadata', () => {
    const accounts = Array.from({ length: 23 }, (_, i) => makeAccount(i + 1));
    const chunks = buildGoogleMigrationPayloads(accounts, { maxAccountsPerBatch: 10 });

    expect(chunks).toHaveLength(3);
    expect(chunks.map((c) => c.accounts.length)).toEqual([10, 10, 3]);

    const sharedBatchId = chunks[0].batchId;
    expect(sharedBatchId).toBeGreaterThan(0);

    const recovered: Array<{ label: string; issuer?: string; secret: string }> = [];
    chunks.forEach((chunk, index) => {
      expect(chunk.batchSize).toBe(3);
      expect(chunk.batchIndex).toBe(index);
      expect(chunk.batchId).toBe(sharedBatchId);

      const decoded = parseGoogleMigrationUri(chunk.uri);
      expect(decoded.batchSize).toBe(3);
      expect(decoded.batchIndex).toBe(index);
      expect(decoded.batchId).toBe(sharedBatchId);
      recovered.push(...decoded.accounts);
    });

    expect(recovered).toHaveLength(23);
    expect(recovered.map((r) => r.label)).toEqual(accounts.map((a) => a.label));
  });

  it('splits chunks when accounts exceed maxUriLength even below maxAccountsPerBatch', () => {
    const accounts = Array.from({ length: 6 }, (_, i) =>
      makeAccount(i + 1, {
        issuer: `VeryLongEnterpriseProviderNameNumber${i}`,
        label: `very.long.account.identifier.email.address.${i}@corp.example.com`,
        secret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',
      })
    );

    const chunks = buildGoogleMigrationPayloads(accounts, {
      maxAccountsPerBatch: 10,
      maxUriLength: 500,
    });

    expect(chunks.length).toBeGreaterThan(1);
    const totalRecovered = chunks.flatMap((c) => parseGoogleMigrationUri(c.uri).accounts);
    expect(totalRecovered).toHaveLength(6);
  });

  it('generates valid QR code PNG Data URLs for chunked Google migration payloads', async () => {
    const accounts = Array.from({ length: 12 }, (_, i) => makeAccount(i + 1));
    const chunks = buildGoogleMigrationPayloads(accounts);

    expect(chunks).toHaveLength(2);
    for (const chunk of chunks) {
      const dataUrl = await generateQrCodeDataUrl(chunk.uri, {
        width: 300,
        errorCorrectionLevel: 'M',
      });
      expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    }
  });

  it('deduplicates Issuer:Label prefix in Google Authenticator name field and handles space/+ in data param', () => {
    // Construct OtpParameters:
    // secret = "Hello!" (bytes of JBSWY3DP), name = "GitHub:alice", issuer = "GitHub", type = TOTP (2)
    const secret = base32ToUint8Array('JBSWY3DPEHPK3PXP'); // 10 bytes
    const nameBytes = Array.from(new TextEncoder().encode('GitHub:alice'));
    const issuerBytes = Array.from(new TextEncoder().encode('GitHub'));

    const otpParam = [
      0x0a, secret.length, ...secret,
      0x12, nameBytes.length, ...nameBytes,
      0x1a, issuerBytes.length, ...issuerBytes,
      0x20, 0x01, // algorithm = SHA1 (1)
      0x28, 0x01, // digits = SIX (1)
      0x30, 0x02, // type = TOTP (2)
    ];

    // Negative batch_id (-1) encoded as 10-byte 64-bit two's complement varint + version=1 + batch_size=1
    const payload = [
      0x0a, otpParam.length, ...otpParam,
      0x10, 0x01, // version = 1
      0x18, 0x01, // batch_size = 1
      0x28, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x01, // batch_id = -1
    ];

    const rawUri = buildRawMigrationUri(payload);
    // Simulate unescaped '+' converted to space or URL-safe base64
    const uriWithSpace = rawUri.replace(/%2B/g, ' ').replace(/%2F/g, '_').replace(/%3D/g, '');
    const parsed = parseGoogleMigrationUri(uriWithSpace);

    expect(parsed.batchId).toBe(-1);
    expect(parsed.accounts).toEqual([
      {
        issuer: 'GitHub',
        label: 'alice',
        secret: 'JBSWY3DPEHPK3PXP',
        algorithm: 'SHA-1',
        digits: 6,
        period: 30,
      },
    ]);
  });

  it('skips unsupported HOTP and MD5 entries while importing valid TOTP entries', () => {
    const secret = base32ToUint8Array('JBSWY3DPEHPK3PXP');
    const hotpName = Array.from(new TextEncoder().encode('hotp-user'));
    const md5Name = Array.from(new TextEncoder().encode('md5-user'));
    const totpName = Array.from(new TextEncoder().encode('valid-user'));

    const hotpParam = [
      0x0a, secret.length, ...secret,
      0x12, hotpName.length, ...hotpName,
      0x30, 0x01, // type = HOTP
      0x38, 0x05, // counter = 5
    ];

    const md5Param = [
      0x0a, secret.length, ...secret,
      0x12, md5Name.length, ...md5Name,
      0x20, 0x04, // algorithm = MD5
      0x30, 0x02, // type = TOTP
    ];

    const totpParam = [
      0x0a, secret.length, ...secret,
      0x12, totpName.length, ...totpName,
      0x30, 0x02, // type = TOTP
    ];

    const payload = [
      0x0a, hotpParam.length, ...hotpParam,
      0x0a, md5Param.length, ...md5Param,
      0x0a, totpParam.length, ...totpParam,
    ];

    const parsed = parseGoogleMigrationUri(buildRawMigrationUri(payload));
    expect(parsed.accounts).toHaveLength(1);
    expect(parsed.accounts[0].label).toBe('valid-user');
    expect(parsed.skipped).toHaveLength(2);
    expect(parsed.skipped[0].name).toBe('hotp-user');
    expect(parsed.skipped[1].name).toBe('md5-user');
  });

  it('throws clear errors on invalid or malformed migration URIs', () => {
    expect(() => parseGoogleMigrationUri('otpauth://totp/a?secret=JBSWY3DPEHPK3PXP')).toThrow();
    expect(() => parseGoogleMigrationUri('otpauth-migration://offline')).toThrow(/missing the "data"/i);
    expect(() => parseGoogleMigrationUri('otpauth-migration://offline?data=!!!invalid!!!')).toThrow();
    // Truncated length-delimited field
    expect(() => parseGoogleMigrationUri(buildRawMigrationUri([0x0a, 0x50, 0x01, 0x02]))).toThrow();
  });
});
